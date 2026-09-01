// Test di conformità normativa (skill normativa-alimentare) — esegue il codice reale
// del tool Etichette (e, dove serve, l'engine Nutrizionale protetto) contro casi noti
// e verifica l'OUTPUT prodotto, non solo la presenza del codice. Non modifica
// nutrizionaleCalcEngine.ts né i Tab*.tsx — solo lettura/chiamata delle loro funzioni
// pubbliche.
import { describe, it, expect } from 'vitest';
import {
    matchWord, highlightAllergens, readComponenti, readRows,
    buildEULinear, buildAULinear, buildArabiLinear, HEALTH_CLAIMS_432_2012,
    calcAdditionalClaims, relabelClaim, shouldFlagNutritionOverflow,
    visualFontScale, CSS_PX_PER_MM, barcodeMetrics, EAN13_MODULE_MM,
    EAN13_BAR_MODULES, EAN13_QUIET_MODULES, EAN13_HEIGHT_MM, EAN13_TRUNCATED_MIN_HEIGHT_MM,
    shouldShareBarcodeRow, BARCODE_SHARED_ROW_THRESHOLD,
    shouldUseTwoColumnLayout, HORIZONTAL_TWO_COLUMN_ASPECT_THRESHOLD,
} from './EtichetteCalc';
import { ALLERGEN_FIELDS, CROSS_FIELDS } from '../NutrizionaleCalc/shared/constants';
import { calcClaims, ZERO_CALC, type CalcResult } from '../../engines/nutrizionaleCalcEngine';
import { PACKAGING_MATERIALS } from './packagingMaterials';
import type { ArchiveData } from '../NutrizionaleCalc/NutrizionaleCalc';

describe('Reg. (UE) 1169/2011 Art. 21 + All. II — 14 allergeni obbligatori', () => {
    it('ALLERGEN_FIELDS contiene tutti e 14 gli allergeni (sedano/senape/sesamo inclusi, fix 2026-08-24)', () => {
        const keys = ALLERGEN_FIELDS.map(f => f.key);
        const obbligatori = [
            'all_glutine', 'all_crostacei', 'all_uova', 'all_pesci', 'all_arachidi',
            'all_soia', 'all_latte', 'all_frutta_guscio', 'all_sedano', 'all_senape',
            'all_sesamo', 'all_solfiti', 'all_lupini', 'all_molluschi',
        ];
        for (const k of obbligatori) expect(keys, `manca ${k}`).toContain(k);
    });

    it('highlightAllergens evidenzia sedano/senape/sesamo in MAIUSCOLO (Art. 21: distinguibili dal resto)', () => {
        const testo = 'farina, sedano, semi di senape, olio di sesamo, sale';
        const out = highlightAllergens(testo);
        expect(out).toContain('SEDANO');
        expect(out).toContain('SENAPE');
        expect(out).toContain('SESAMO');
    });

    it('B-e: matchWord isola la parola da una label con qualifica tra parentesi — regex solfiti ora matcha', () => {
        expect(matchWord('SOLFITI (>10 ppm)')).toBe('SOLFITI');
        const out = highlightAllergens('aceto di vino (contiene solfiti)');
        expect(out).toContain('SOLFITI');
        // canary: se qualcuno rimette la label cruda nella regex, questo torna a fallire
        const bugRegex = /\bsolfiti \(>10 ppm\)\b/i;
        expect(bugRegex.test('aceto di vino (contiene solfiti)')).toBe(false);
    });

    it('CROSS_FIELDS (può contenere tracce) copre gli stessi 3 allergeni aggiunti a ALLERGEN_FIELDS', () => {
        const crossKeys = CROSS_FIELDS.map(f => f.key);
        expect(crossKeys).toEqual(expect.arrayContaining(['cross_sedano', 'cross_senape', 'cross_sesamo']));
    });
});

describe('Reg. (UE) 1169/2011 Art. 34(2) + All. XV — formato lineare UE', () => {
    const sample: CalcResult = {
        ...ZERO_CALC,
        energyKj: 1046, energyKcal: 250,
        grassi: 12.3, saturi: 2.1, carboidrati: 30, zuccheri: 5,
        fibre: 3.2, proteine: 6.7, sale: 1.1,
    };

    it('contiene tutti gli 8 campi obbligatori della dichiarazione UE, nell\'ordine All. XV', () => {
        const line = buildEULinear(sample);
        const campi = ['Energia:', 'Grassi:', 'di cui acidi grassi saturi:', 'Carboidrati:', 'di cui zuccheri:', 'Fibre:', 'Proteine:', 'Sale:'];
        let lastIndex = -1;
        for (const campo of campi) {
            const idx = line.indexOf(campo);
            expect(idx, `campo mancante: ${campo}`).toBeGreaterThan(-1);
            expect(idx, `ordine All. XV violato su: ${campo}`).toBeGreaterThan(lastIndex);
            lastIndex = idx;
        }
    });

    it('arrotondamento UE: valore <0,5g → "0" (stessa funzione rUE_macro usata dalla tabella protetta)', () => {
        const line = buildEULinear({ ...sample, grassi: 0.3 });
        expect(line).toMatch(/Grassi: 0 g/);
    });
});

describe('FSANZ Standard 1.2.8 — formato lineare Australia (packaging <100cm²)', () => {
    it('contiene gli 8 nutrienti obbligatori del NIP australiano', () => {
        const sample: CalcResult = { ...ZERO_CALC, energyKj: 1046, energyKcal: 250, proteine: 6.7, grassi: 12.3, saturi: 2.1, carboidrati: 30, zuccheri: 5, fibre: 3.2, sodio_mg: 400 };
        const line = buildAULinear(sample);
        for (const campo of ['Energy:', 'Protein:', 'Fat, total:', '- saturated:', 'Carbohydrate:', '- sugars:', 'Dietary fibre:', 'Sodium:']) {
            expect(line, `campo mancante: ${campo}`).toContain(campo);
        }
    });
});

describe('GSO 2233/2012 → Codex CAC/GL 2 — formato lineare Golfo (confidenza bassa, vedi skill)', () => {
    it('contiene i 10 campi del pannello stile FDA usato da TabArabi.tsx', () => {
        const sample: CalcResult = { ...ZERO_CALC, energyKcal: 250, grassi: 12.3, saturi: 2.1, trans: 0, colesterolo: 10, sodio_mg: 400, carboidratiTot: 30, fibre: 3.2, zuccheri: 5, proteine: 6.7 };
        const line = buildArabiLinear(sample);
        for (const campo of ['Calories:', 'Total Fat:', 'Saturated Fat:', 'Trans Fat:', 'Cholesterol:', 'Sodium:', 'Total Carbohydrate:', 'Dietary Fiber:', 'Total Sugars:', 'Protein:']) {
            expect(line, `campo mancante: ${campo}`).toContain(campo);
        }
    });
});

describe('Reg. (CE) 1924/2006 — claim nutrizionali (engine protetto, sola lettura)', () => {
    it('8 claim implementati producono le stringhe attese per valori soglia noti', () => {
        const r: CalcResult = { ...ZERO_CALC, fibre: 6, energyKcal: 100, proteine: 5, calcio: 240, ferro: 4.2, potassio: 600, sodio_mg: 120, zuccheri: 5, grassi: 3 };
        const claims = calcClaims(r, false);
        expect(claims).toEqual(expect.arrayContaining([
            'RICCO DI FIBRE', 'AD ALTO CONTENUTO DI PROTEINE', 'RICCO DI CALCIO',
            'RICCO DI FERRO', 'RICCO DI POTASSIO', 'A BASSO CONTENUTO DI SODIO',
            'A BASSO CONTENUTO DI ZUCCHERI', 'A BASSO CONTENUTO DI GRASSI',
        ]));
    });

    it('AUDIT.md B1: l\'engine protetto restituisce ancora "SODIO" (non lo tocchiamo) — corretto in "SALE" solo a livello display da relabelClaim, vedi test dedicato sopra', () => {
        const r: CalcResult = { ...ZERO_CALC, sodio_mg: 100 };
        const claims = calcClaims(r, false);
        expect(claims).toContain('A BASSO CONTENUTO DI SODIO');
        expect(claims).not.toContain('A BASSO CONTENUTO DI SALE');
    });
});

describe('Reg. (UE) 432/2012 — health claim ammessi (testo verbatim dall\'allegato ufficiale)', () => {
    it('nessuna coppia FIBRE/SODIO: l\'allegato non ha un\'indicazione generica per questi due', () => {
        const claims = HEALTH_CLAIMS_432_2012.map(h => h.claim);
        expect(claims.some(c => c.includes('FIBRE'))).toBe(false);
        expect(claims.some(c => c.includes('SODIO'))).toBe(false);
    });

    it('CALCIO ha le 8 indicazioni verbatim, inclusa quella su ossa', () => {
        const calcio = HEALTH_CLAIMS_432_2012.find(h => h.claim === 'RICCO DI CALCIO');
        expect(calcio?.texts).toHaveLength(8);
        expect(calcio?.texts).toContain('Il calcio è necessario per il mantenimento di ossa normali');
    });

    it('FERRO ha le 7 indicazioni verbatim', () => {
        const ferro = HEALTH_CLAIMS_432_2012.find(h => h.claim === 'RICCO DI FERRO');
        expect(ferro?.texts).toHaveLength(7);
        expect(ferro?.texts).toContain('Il ferro contribuisce alla normale formazione dei globuli rossi e dell’emoglobina');
    });

    it('POTASSIO ha la sola indicazione verbatim sulla pressione', () => {
        const potassio = HEALTH_CLAIMS_432_2012.find(h => h.claim === 'RICCO DI POTASSIO');
        expect(potassio?.texts).toEqual(['Il potassio contribuisce al mantenimento di una normale pressione sanguigna']);
    });

    it('PROTEINE ha le 3 indicazioni verbatim', () => {
        const proteine = HEALTH_CLAIMS_432_2012.find(h => h.claim === 'AD ALTO CONTENUTO DI PROTEINE');
        expect(proteine?.texts).toHaveLength(3);
    });

    it('FONTE DI X riusa lo stesso testo di RICCO DI X per ognuno dei 4 nutrienti coperti', () => {
        for (const n of ['CALCIO', 'FERRO', 'POTASSIO', 'PROTEINE']) {
            const ricco = HEALTH_CLAIMS_432_2012.find(h => h.claim.endsWith(n));
            const fonte = HEALTH_CLAIMS_432_2012.find(h => h.claim === `FONTE DI ${n}`);
            expect(fonte?.texts, n).toEqual(ricco?.texts);
        }
    });
});

describe('Reg. (CE) 1924/2006 — claim aggiuntivi (modulo separato, engine non toccato)', () => {
    it('SENZA GRASSI/SATURI/ZUCCHERI scattano alle soglie corrette', () => {
        const claims = calcAdditionalClaims({ ...ZERO_CALC, grassi: 0.4, saturi: 0.05, zuccheri: 0.3 }, false);
        expect(claims).toEqual(expect.arrayContaining(['SENZA GRASSI', 'SENZA GRASSI SATURI', 'SENZA ZUCCHERI']));
    });

    it('A BASSO CONTENUTO DI GRASSI SATURI usa soglia liquido dimezzata', () => {
        expect(calcAdditionalClaims({ ...ZERO_CALC, saturi: 1.0 }, false)).toContain('A BASSO CONTENUTO DI GRASSI SATURI');
        expect(calcAdditionalClaims({ ...ZERO_CALC, saturi: 1.0 }, true)).not.toContain('A BASSO CONTENUTO DI GRASSI SATURI');
    });

    it('7 minerali FONTE/RICCO su soglie 15%/30% AR (Reg. 1169/2011 All. XIII)', () => {
        // 20% AR ciascuno: dentro la fascia FONTE (15-29%), sotto la soglia RICCO (30%)
        const claims = calcAdditionalClaims({ ...ZERO_CALC, fosforo: 140, magnesio: 75, zinco: 2, rame: 0.2, manganese: 0.4, selenio: 11, iodio: 30 }, false);
        for (const label of ['FOSFORO', 'MAGNESIO', 'ZINCO', 'RAME', 'MANGANESE', 'SELENIO', 'IODIO']) {
            expect(claims, label).toContain(`FONTE DI ${label}`);
        }
    });

    it('relabelClaim corregge SODIO→SALE (B1), non tocca gli altri claim', () => {
        expect(relabelClaim('A BASSO CONTENUTO DI SODIO')).toBe('A BASSO CONTENUTO DI SALE');
        expect(relabelClaim('RICCO DI FIBRE')).toBe('RICCO DI FIBRE');
    });
});

describe('Decisione Commissione 97/129/CE — dizionario materiali imballo', () => {
    it('ogni voce ha codice, materiale e raccolta; nessun codice duplicato', () => {
        const codici = PACKAGING_MATERIALS.map(m => m.codice);
        expect(new Set(codici).size).toBe(codici.length);
        for (const m of PACKAGING_MATERIALS) {
            expect(m.codice.length, m.codice).toBeGreaterThan(0);
            expect(m.materiale.length, m.codice).toBeGreaterThan(0);
            expect(m.raccolta.length, m.codice).toBeGreaterThan(0);
        }
    });
});

describe('Tolleranza schema legacy ricette (fix crash 2026-08-24)', () => {
    it('legge sia "componenti" (schema attuale) che "components" (schema legacy)', () => {
        const nuovo = { componenti: [{ nome: 'a', ingredienti: [] }] } as unknown as ArchiveData;
        const legacy = { components: [{ name: 'a', rows: [] }] } as unknown as ArchiveData;
        const rotto = { componenti: 'non-un-array' } as unknown as ArchiveData;
        expect(readComponenti(nuovo)).toHaveLength(1);
        expect(readComponenti(legacy)).toHaveLength(1);
        expect(readComponenti(rotto)).toHaveLength(0); // non deve lanciare, non deve fingere un array
    });

    it('readRows tollera "ingredienti" e "rows", rifiuta valori non-array', () => {
        expect(readRows({ ingredienti: [{ nome: 'x' }] })).toHaveLength(1);
        expect(readRows({ rows: [{ name: 'x' }] })).toHaveLength(1);
        expect(readRows({ ingredienti: 'boom' as unknown as [] })).toHaveLength(0);
    });
});

describe('Overflow tabella nutrizionale al formato più compatto (bug USA trovato 2026-08-25)', () => {
    it('non segnala overflow se non siamo ancora al formato massimo (c\'è ancora margine di step)', () => {
        expect(shouldFlagNutritionOverflow(0, 2, true, false)).toBe(false);
        expect(shouldFlagNutritionOverflow(1, 2, false, true)).toBe(false);
    });

    it('non segnala overflow al formato massimo se il contenuto rientra', () => {
        expect(shouldFlagNutritionOverflow(2, 2, false, false)).toBe(false);
    });

    it('segnala overflow al formato massimo se sfora in altezza o larghezza', () => {
        expect(shouldFlagNutritionOverflow(2, 2, true, false)).toBe(true);
        expect(shouldFlagNutritionOverflow(2, 2, false, true)).toBe(true);
    });

    it('mercati senza step (maxStep 0, es. futuro) segnalano overflow al primo sforamento', () => {
        expect(shouldFlagNutritionOverflow(0, 0, true, false)).toBe(true);
    });
});

describe('Scala font ancorata ai px renderizzati, non ai mm dichiarati (bug scaling trovato 2026-08-25)', () => {
    it('fallback a baseDim/100 quando il ResizeObserver non ha ancora misurato nulla (renderedPx a 0)', () => {
        expect(visualFontScale(0, 0, 200)).toBe(2);
        expect(visualFontScale(500, 0, 100)).toBe(1); // altezza non ancora misurata: fallback comunque
    });

    it('sotto la soglia di clamping del pannello, equivale algebricamente alla vecchia formula baseDim/100 (no regressioni)', () => {
        // Box 100x100mm renderizzato senza clamping: renderedPx = 100mm in px reali.
        const renderedPx = 100 * CSS_PX_PER_MM;
        expect(visualFontScale(renderedPx, renderedPx, 100)).toBeCloseTo(1, 6);
        // Box 60x40mm (baseDim 40mm → vecchia formula darebbe 0.4): stesso risultato via px.
        const w = 60 * CSS_PX_PER_MM, h = 40 * CSS_PX_PER_MM;
        expect(visualFontScale(w, h, 40)).toBeCloseTo(0.4, 6);
    });

    it('sopra la soglia di clamping, la scala segue il box VISIBILE (renderizzato), non i mm dichiarati', () => {
        // Etichetta dichiarata 200x200mm, ma il pannello clampa il box a 500px reali.
        const clampedPx = 500;
        const scale = visualFontScale(clampedPx, clampedPx, 200);
        // La vecchia formula (200/100 = 2) avrebbe fatto sforare il testo dal riquadro da 500px:
        // qui la scala resta ancorata al box reale, non raddoppia rispetto al box piccolo.
        expect(scale).toBeCloseTo(clampedPx / (100 * CSS_PX_PER_MM), 6);
        expect(scale).toBeLessThan(200 / 100);
    });

    it('usa la dimensione renderizzata minore (coerente con min(width,height) della vecchia formula)', () => {
        expect(visualFontScale(1000, 200, 100)).toBeCloseTo(visualFontScale(200, 200, 100), 6);
    });
});

describe('Scaling barcode ancorato ai mm reali con floor GS1 (bug EAN tagliato trovato 2026-08-25)', () => {
    it('a magnificazione 100% e pxPerMm reale, la larghezza simbolo rispetta la formula GS1 nominale (37,29mm)', () => {
        const m = barcodeMetrics(100, CSS_PX_PER_MM); // 1mm reale = 1 CSS mm
        const expectedWidthMm = (EAN13_BAR_MODULES + EAN13_QUIET_MODULES) * EAN13_MODULE_MM;
        expect(expectedWidthMm).toBeCloseTo(37.29, 2);
        expect(m.symbolWidthPx / CSS_PX_PER_MM).toBeCloseTo(expectedWidthMm, 2);
        expect(m.clampedToMin).toBe(false);
    });

    it('altezza barre sempre al minimo troncato GS1 (18,29mm), indipendente dalla magnificazione (richiesta 2026-08-25)', () => {
        const bassa = barcodeMetrics(80, CSS_PX_PER_MM);
        const alta = barcodeMetrics(200, CSS_PX_PER_MM);
        expect(bassa.barHeightPx / CSS_PX_PER_MM).toBeCloseTo(EAN13_TRUNCATED_MIN_HEIGHT_MM, 2);
        expect(alta.barHeightPx / CSS_PX_PER_MM).toBeCloseTo(EAN13_TRUNCATED_MIN_HEIGHT_MM, 2);
        expect(alta.barHeightPx).toBeCloseTo(bassa.barHeightPx, 6); // stessa altezza, magnificazioni diverse
        expect(EAN13_TRUNCATED_MIN_HEIGHT_MM).toBeLessThan(EAN13_HEIGHT_MM); // più corta del nominale 22,85mm
    });

    it('non scende mai sotto l\'80% di magnificazione GS1, anche se lo slider utente chiede meno', () => {
        const m = barcodeMetrics(30, CSS_PX_PER_MM); // utente chiede 30%, sotto il floor
        expect(m.magnification).toBe(0.80);
        expect(m.clampedToMin).toBe(true);
    });

    it('non supera il 200% di magnificazione GS1', () => {
        const m = barcodeMetrics(500, CSS_PX_PER_MM);
        expect(m.magnification).toBe(2.00);
    });

    it('la scala segue i px reali del box (pxPerMm), non uno slider scollegato dal contenitore', () => {
        const boxPiccolo = barcodeMetrics(100, CSS_PX_PER_MM * 0.5); // box renderizzato a metà risoluzione fisica
        const boxNormale = barcodeMetrics(100, CSS_PX_PER_MM);
        expect(boxPiccolo.symbolWidthPx).toBeCloseTo(boxNormale.symbolWidthPx / 2, 1);
    });
});

describe('Framework impaginazione responsive quadrata/verticale/orizzontale (richiesta 2026-08-25)', () => {
    it('Opzione A — il barcode condivide la riga col legale solo se supera la soglia (55%) della larghezza etichetta', () => {
        expect(shouldShareBarcodeRow(50, 100)).toBe(false); // 50%, sotto soglia
        expect(shouldShareBarcodeRow(56, 100)).toBe(true); // 56%, sopra soglia
        expect(shouldShareBarcodeRow(55, 100)).toBe(false); // esattamente in soglia, non sopra
    });

    it('Opzione A — nessuna larghezza disponibile misurata (box non ancora renderizzato) non condivide mai riga', () => {
        expect(shouldShareBarcodeRow(9999, 0)).toBe(false);
    });

    it('Opzione A — su un\'etichetta stretta reale (60mm) l\'EAN-13 a magnificazione minima supera comunque la soglia', () => {
        const m = barcodeMetrics(100, CSS_PX_PER_MM); // 1mm reale = 1 CSS mm
        const labelWidthPx = 60 * CSS_PX_PER_MM; // etichetta 60mm
        expect(shouldShareBarcodeRow(m.symbolWidthPx, labelWidthPx)).toBe(true);
    });

    it('Opzione B — formati orizzontali larghi (aspect ratio > soglia) passano a due colonne, quadrata/verticale restano impilate', () => {
        expect(shouldUseTwoColumnLayout(100, 100)).toBe(false); // quadrata, aspect ratio 1
        expect(shouldUseTwoColumnLayout(60, 100)).toBe(false); // verticale, aspect ratio 0,6
        expect(shouldUseTwoColumnLayout(150, 60)).toBe(true); // orizzontale, aspect ratio 2,5 > 1,25
        expect(shouldUseTwoColumnLayout(125, 100)).toBe(false); // esattamente in soglia (1,25), non sopra
    });

    it('Opzione B — altezza zero (dato non valido) non attiva mai le due colonne', () => {
        expect(shouldUseTwoColumnLayout(100, 0)).toBe(false);
    });

    it('le soglie sono costanti esportate, non magic number sparsi nel JSX', () => {
        expect(BARCODE_SHARED_ROW_THRESHOLD).toBe(0.55);
        expect(HORIZONTAL_TWO_COLUMN_ASPECT_THRESHOLD).toBe(1.25);
    });
});
