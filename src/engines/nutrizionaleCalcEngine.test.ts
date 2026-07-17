import { describe, it, expect } from 'vitest';
import { calcNutrients, scaleResult, energyFromMacros, ZERO_CALC, type DBIngredient, type Component } from './nutrizionaleCalcEngine';
import { parseDecimalIT } from '../utils/validation';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeIng(overrides: Partial<DBIngredient>): DBIngredient {
    return {
        nome: 'Test', etichetta: 'test',
        kcal: 0, kj: 0,
        grassi: 0, saturi: 0, carboidrati: 0, zuccheri: 0,
        proteine: 0, sodio_mg: 0,
        ...overrides,
    };
}

function makeComp(rows: Component['rows'], additiveRows: Component['additiveRows'] = []): Component {
    return { id: '1', name: 'C1', rows, additiveRows, pzUV: 1 };
}

// ─── calcNutrients ─────────────────────────────────────────────────────────────

describe('calcNutrients', () => {
    it('returns ZERO_CALC for empty components', () => {
        const r = calcNutrients([], 0);
        expect(r.energyKcal).toBe(0);
        expect(r.grassi).toBe(0);
    });

    it('returns ZERO_CALC when pesoFinito=0 and no rows', () => {
        const r = calcNutrients([makeComp([])], 0);
        expect(r).toEqual({ ...ZERO_CALC });
    });

    it('golden test — 100g olio (kcal=900, grassi=100): per 100g finito = 900kcal, 100g grassi', () => {
        const olio = makeIng({ kcal: 900, kj: 3700, grassi: 100, saturi: 14 });
        const row = { id: 'r1', ing: olio, grams: 100, eurKg: 0, resa: 100 };
        const r = calcNutrients([makeComp([row])], 100);
        expect(r.energyKcal).toBeCloseTo(900, 2);
        expect(r.grassi).toBeCloseTo(100, 2);
        expect(r.saturi).toBeCloseTo(14, 2);
    });

    it('golden test — concentrazione per cottura: 200g farina → 100g pane (2×)', () => {
        const farina = makeIng({ kcal: 350, kj: 1460, grassi: 1, saturi: 0.2, carboidrati: 72, zuccheri: 1, proteine: 10, sodio_mg: 2 });
        const row = { id: 'r1', ing: farina, grams: 200, eurKg: 0, resa: 100 };
        const r = calcNutrients([makeComp([row])], 100); // peso finito 100g su 200g crudo
        expect(r.energyKcal).toBeCloseTo(700, 1);   // 350 × 2
        expect(r.carboidrati).toBeCloseTo(144, 1);   // 72 × 2
        expect(r.proteine).toBeCloseTo(20, 1);       // 10 × 2
    });

    it('sale derivato correttamente: sodio_mg=400 → sale=1g', () => {
        // sale = sodio(g) × 2.5 → 400mg = 0.4g → × 2.5 = 1g
        const ing = makeIng({ sodio_mg: 400 });
        const row = { id: 'r1', ing, grams: 100, eurKg: 0, resa: 100 };
        const r = calcNutrients([makeComp([row])], 100);
        expect(r.sale).toBeCloseTo(1.0, 4);
    });

    it('carboidratiTot = carboidrati + fibre', () => {
        const ing = makeIng({ carboidrati: 30, fibre: 5 } as Partial<DBIngredient>);
        const row = { id: 'r1', ing, grams: 100, eurKg: 0, resa: 100 };
        const r = calcNutrients([makeComp([row])], 100);
        expect(r.carboidratiTot).toBeCloseTo(35, 4);
    });

    it('additivi contribuiscono al peso ma non ai nutrienti', () => {
        const ing = makeIng({ kcal: 400, carboidrati: 80, proteine: 10 });
        const row = { id: 'r1', ing, grams: 100, eurKg: 0, resa: 100 };
        const addRow = { id: 'a1', categoria: 'E', nomeSpecifico: 'E330', grams: 100, eurKg: 0, resa: 100 };
        // 100g ing + 100g additivo = 200g crudo → finito 200g
        const r = calcNutrients([makeComp([row], [addRow])], 200);
        // nutrienti da 100g ing su 200g finito → dimezzati
        expect(r.energyKcal).toBeCloseTo(200, 1);
        expect(r.carboidrati).toBeCloseTo(40, 1);
    });

    it('pzUV divide i grammi per porzione', () => {
        const ing = makeIng({ kcal: 400, carboidrati: 80 });
        // 200g ingredient / pzUV=2 → 100g per pz
        const row = { id: 'r1', ing, grams: 200, eurKg: 0, resa: 100 };
        const comp: Component = { id: '1', name: 'C1', rows: [row], additiveRows: [], pzUV: 2 };
        const r = calcNutrients([comp], 100);
        expect(r.energyKcal).toBeCloseTo(400, 1);
        expect(r.carboidrati).toBeCloseTo(80, 1);
    });

    it('evaporazione alcol: calo peso = perdita kcal alcol (7 kcal/g)', () => {
        // 100g ingrediente con 10g alcol/100g → 10g alcol assoluti
        // peso finito 90g → calo 10g → tutto l'alcol evapora
        // kcal alcol contributo = 10 × 7 = 70kcal → devono essere sottratte
        const ing = makeIng({ kcal: 70, kj: 297, alcol: 10 } as Partial<DBIngredient>);
        const row = { id: 'r1', ing, grams: 100, eurKg: 0, resa: 100 };
        const r = calcNutrients([makeComp([row])], 90);
        // energyKcal raw = 70; sottratti 70 (10g×7); poi normalizzati su 90g → 0/90×100=0
        expect(r.energyKcal).toBeCloseTo(0, 2);
    });

    it('alcol postCottura non evapora', () => {
        const ing = makeIng({ kcal: 70, kj: 297, alcol: 10 } as Partial<DBIngredient>);
        const row = { id: 'r1', ing, grams: 100, eurKg: 0, resa: 100, postCottura: true };
        const r = calcNutrients([makeComp([row])], 90);
        // nessuna sottrazione → 70kcal/90g × 100 ≈ 77.8
        expect(r.energyKcal).toBeGreaterThan(70);
    });

    it('resa 80%: nutrienti concentrati correttamente per 100g prodotto cotto', () => {
        // 125g crudi, resa 80% → peso cotto = 125 × 0.8 = 100g (denominatore)
        // nutrienti calcolati su 125g crudi: kcal = 125 × 800/100 = 1000
        // factor = 100 / 100 = 1 → risultato = 1000 kcal/100g cotto
        const ing = makeIng({ kcal: 800, kj: 3350 });
        const row = { id: 'r1', ing, grams: 125, eurKg: 0, resa: 80 };
        const r = calcNutrients([makeComp([row])], 0); // pesoFinitoVal=0 → usa peso_totale_pz calcolato
        expect(r.energyKcal).toBeCloseTo(1000, 1);
    });
});

// ─── scaleResult ──────────────────────────────────────────────────────────────

describe('scaleResult', () => {
    it('scala per 50g = metà dei valori per 100g', () => {
        const ing = makeIng({ kcal: 400, grassi: 20, carboidrati: 60, proteine: 10, sodio_mg: 200 });
        const row = { id: 'r1', ing, grams: 100, eurKg: 0, resa: 100 };
        const base = calcNutrients([makeComp([row])], 100);
        const half = scaleResult(base, 50);
        expect(half.energyKcal).toBeCloseTo(base.energyKcal / 2, 4);
        expect(half.grassi).toBeCloseTo(base.grassi / 2, 4);
        expect(half.sale).toBeCloseTo(base.sale / 2, 4);
    });

    it('scala per 0g = tutto zero', () => {
        const ing = makeIng({ kcal: 400 });
        const row = { id: 'r1', ing, grams: 100, eurKg: 0, resa: 100 };
        const base = calcNutrients([makeComp([row])], 100);
        const zero = scaleResult(base, 0);
        expect(zero.energyKcal).toBe(0);
    });
});

// ─── parseDecimalIT ────────────────────────────────────────────────────────────

describe('parseDecimalIT', () => {
    it('parses dot decimal', () => expect(parseDecimalIT('3.14')).toBeCloseTo(3.14, 5));
    it('parses comma decimal (IT locale)', () => expect(parseDecimalIT('3,14')).toBeCloseTo(3.14, 5));
    it('parses integer string', () => expect(parseDecimalIT('42')).toBe(42));
    it('returns NaN for non-numeric', () => expect(parseDecimalIT('abc')).toBeNaN());
    it('edge: empty string → NaN', () => expect(parseDecimalIT('')).toBeNaN());
});

// ─── energyFromMacros ──────────────────────────────────────────────────────────

describe('energyFromMacros', () => {
    it('applica i fattori EU 1169/2011 (9/4/2.4/2/3/4/7 kcal)', () => {
        const { kcal, kj } = energyFromMacros({
            grassi: 10, carboidrati: 20, polioli: 5, fibre: 3,
            acidiOrganici: 1, proteine: 8, alcolG: 2,
        });
        // carbo netti = 20-5 = 15
        expect(kcal).toBe(10*9 + 15*4 + 5*2.4 + 3*2 + 1*3 + 8*4 + 2*7); // 217
        expect(kj).toBe(10*37 + 15*17 + 5*10 + 3*8 + 1*13 + 8*17 + 2*29); // 892
    });

    it('eritritolo puro = 0 kcal/kJ (All. XIV)', () => {
        const { kcal, kj } = energyFromMacros({ grassi: 0, carboidrati: 100, eritritolo: 100, proteine: 0 });
        expect(kcal).toBe(0);
        expect(kj).toBe(0);
    });

    it('campi opzionali omessi trattati come 0', () => {
        const { kcal } = energyFromMacros({ grassi: 0, carboidrati: 10, proteine: 5 });
        expect(kcal).toBe(10*4 + 5*4);
    });
});
