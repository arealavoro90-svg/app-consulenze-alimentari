// Unit test per la business logic di EtichetteCalc non coperti da EtichetteCalc.compliance.test.ts.
// Testano solo funzioni pure esportate (no React, no DOM).
import { describe, it, expect } from 'vitest';
import { calcClaims, ZERO_CALC, type CalcResult, type DBIngredient } from '../../engines/nutrizionaleCalcEngine';
import { ALLERGEN_FIELDS, CROSS_FIELDS, collectAllergenLabels } from '../NutrizionaleCalc/shared/constants';

// ─── calcClaims — casi edge non coperti da compliance ─────────────────────────

describe('calcClaims — ricetta vuota', () => {
    it('restituisce array vuoto quando tutti i valori sono zero (nessun ingrediente)', () => {
        // Guard noClaimInput: evita claim spurii su prodotto inesistente.
        expect(calcClaims(ZERO_CALC)).toEqual([]);
        expect(calcClaims(ZERO_CALC, true)).toEqual([]);
    });

    it('il guard non sopprime claim legittimi su un prodotto reale con almeno un nutriente', () => {
        // Anche un solo valore non-zero rimuove il guard.
        const r: CalcResult = { ...ZERO_CALC, sodio_mg: 4, calcio: 7 };
        // Non deve restituire [] — qualunque claim sia o non sia presente.
        const claims = calcClaims(r);
        // sodio_mg 4 ≤ 5 → "SENZA SALE"
        expect(claims).toContain('SENZA SALE');
    });
});

describe('calcClaims — calorie (solidi vs liquidi)', () => {
    it('A BASSO CONTENUTO DI CALORIE scatta su solido ≤40kcal', () => {
        const r: CalcResult = { ...ZERO_CALC, sodio_mg: 1, energyKcal: 38 };
        expect(calcClaims(r, false)).toContain('A BASSO CONTENUTO DI CALORIE');
    });

    it('A BASSO CONTENUTO DI CALORIE NON scatta su solido con >40kcal', () => {
        const r: CalcResult = { ...ZERO_CALC, sodio_mg: 1, energyKcal: 41 };
        expect(calcClaims(r, false)).not.toContain('A BASSO CONTENUTO DI CALORIE');
    });

    it('su liquido la soglia è 20kcal — sopra 20 non scatta', () => {
        const r: CalcResult = { ...ZERO_CALC, sodio_mg: 1, energyKcal: 21 };
        expect(calcClaims(r, true)).not.toContain('A BASSO CONTENUTO DI CALORIE');
    });

    it('SENZA CALORIE scatta solo su liquido ≤4kcal', () => {
        const r: CalcResult = { ...ZERO_CALC, sodio_mg: 1, energyKcal: 3 };
        expect(calcClaims(r, true)).toContain('SENZA CALORIE');
        expect(calcClaims(r, false)).not.toContain('SENZA CALORIE');
    });
});

describe('calcClaims — grassi e zuccheri soglie liquido', () => {
    it('A BASSO CONTENUTO DI ZUCCHERI: soglia liquido 2.5g, solido 5g', () => {
        // 3g di zuccheri: sotto soglia solido (≤5), sopra soglia liquido (>2.5)
        const r: CalcResult = { ...ZERO_CALC, sodio_mg: 1, zuccheri: 3 };
        expect(calcClaims(r, false)).toContain('A BASSO CONTENUTO DI ZUCCHERI');
        expect(calcClaims(r, true)).not.toContain('A BASSO CONTENUTO DI ZUCCHERI');
    });

    it('A BASSO CONTENUTO DI GRASSI: soglia liquido 1.5g, solido 3g', () => {
        // 2g di grassi: sotto soglia solido (≤3), sopra soglia liquido (>1.5)
        const r: CalcResult = { ...ZERO_CALC, sodio_mg: 1, grassi: 2 };
        expect(calcClaims(r, false)).toContain('A BASSO CONTENUTO DI GRASSI');
        expect(calcClaims(r, true)).not.toContain('A BASSO CONTENUTO DI GRASSI');
    });

    it('SENZA GRASSI scatta a ≤0.5g sia su solidi che su liquidi', () => {
        const r: CalcResult = { ...ZERO_CALC, sodio_mg: 1, grassi: 0.5 };
        expect(calcClaims(r, false)).toContain('SENZA GRASSI');
        expect(calcClaims(r, true)).toContain('SENZA GRASSI');
    });
});

// ─── collectAllergenLabels — casi edge ────────────────────────────────────────

describe('collectAllergenLabels — lista vuota', () => {
    it('restituisce array vuoto per lista ingredienti vuota', () => {
        expect(collectAllergenLabels([], ALLERGEN_FIELDS)).toEqual([]);
    });

    it('restituisce array vuoto se nessun ingrediente ha allergeni valorizzati', () => {
        const ing = { nome: 'acqua', sodio_mg: 4 } as unknown as DBIngredient;
        expect(collectAllergenLabels([ing], ALLERGEN_FIELDS)).toEqual([]);
    });
});

describe('collectAllergenLabels — exclude totale', () => {
    it('exclude che copre tutti i label produce array vuoto', () => {
        const ing = { nome: 'latte intero', all_latte: 'SI' } as unknown as DBIngredient;
        // Escludo LATTE → nessun allergene rimasto
        expect(collectAllergenLabels([ing], ALLERGEN_FIELDS, ['LATTE'])).toEqual([]);
    });

    it('exclude parziale filtra solo le voci indicate', () => {
        const ing = { nome: 'pane di grano', all_glutine: 'SI', all_uova: 'SI' } as unknown as DBIngredient;
        const labels = collectAllergenLabels([ing], ALLERGEN_FIELDS, ['GLUTINE']);
        expect(labels).not.toContain('GLUTINE');
        expect(labels).toContain('UOVA');
    });
});

describe('collectAllergenLabels — ordine e deduplicazione', () => {
    it('lo stesso allergene dichiarato da più ingredienti appare una sola volta', () => {
        const ing1 = { nome: 'latte', all_latte: 'SI' } as unknown as DBIngredient;
        const ing2 = { nome: 'burro', all_latte: 'SI' } as unknown as DBIngredient;
        const labels = collectAllergenLabels([ing1, ing2], ALLERGEN_FIELDS);
        expect(labels.filter(l => l === 'LATTE')).toHaveLength(1);
    });

    it('CROSS_FIELDS funziona con la stessa logica di ALLERGEN_FIELDS', () => {
        const ing = { nome: 'forno condiviso', cross_soia: 'SI' } as unknown as DBIngredient;
        const labels = collectAllergenLabels([ing], CROSS_FIELDS);
        expect(labels).toContain('SOIA');
    });
});
