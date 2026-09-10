/**
 * Test di regressione per i fix Wave 1.
 * Verifica le modifiche a calcClaims (NORM-08) e calcNutrients resa=0 (COD-10).
 */
import { describe, it, expect } from 'vitest';
import { calcClaims, calcNutrients, ZERO_CALC } from './nutrizionaleCalcEngine';
import type { CalcResult, Component } from './nutrizionaleCalcEngine';

// Helper: CalcResult con solo i campi necessari
function result(overrides: Partial<CalcResult>): CalcResult {
  return { ...ZERO_CALC, ...overrides };
}

// ---------- NORM-08: fibre per 100kcal ----------

describe('NORM-08 — criteri fibre per 100kcal', () => {
  it('RICCO DI FIBRE via g/100g (≥6g) — criterio originale invariato', () => {
    const r = result({ fibre: 6, energyKcal: 200 });
    expect(calcClaims(r)).toContain('RICCO DI FIBRE');
  });

  it('FONTE DI FIBRE via g/100g (≥3g) — criterio originale invariato', () => {
    const r = result({ fibre: 3, energyKcal: 200 });
    expect(calcClaims(r)).toContain('FONTE DI FIBRE');
  });

  it('RICCO DI FIBRE via g/100kcal (≥3g/100kcal) — nuovo criterio', () => {
    // 2g fibre / 50kcal = 4g/100kcal → RICCO
    const r = result({ fibre: 2, energyKcal: 50 });
    expect(calcClaims(r)).toContain('RICCO DI FIBRE');
  });

  it('FONTE DI FIBRE via g/100kcal (≥1.5g/100kcal) — nuovo criterio', () => {
    // 2g fibre / 100kcal = 2g/100kcal → FONTE (non RICCO)
    const r = result({ fibre: 2, energyKcal: 100 });
    expect(calcClaims(r)).toContain('FONTE DI FIBRE');
    expect(calcClaims(r)).not.toContain('RICCO DI FIBRE');
  });

  it('nessun claim fibre sotto soglia per 100kcal', () => {
    // 1g fibre / 100kcal = 1g/100kcal < 1.5 → nessun claim
    const r = result({ fibre: 1, energyKcal: 100 });
    expect(calcClaims(r)).not.toContain('FONTE DI FIBRE');
    expect(calcClaims(r)).not.toContain('RICCO DI FIBRE');
  });

  it('energyKcal=0 non genera divisione per zero né claim falsi', () => {
    const r = result({ fibre: 10, energyKcal: 0 });
    // Con energyKcal=0 il criterio per kcal è disabilitato (guard energyKcal > 0)
    // fibre=10 ≥ 6 → RICCO via g/100g
    expect(calcClaims(r)).toContain('RICCO DI FIBRE');
  });
});

// ---------- COD-10: resa=0 trattata come non inserita ----------

describe('COD-10 — resa=0 fallback a 100', () => {
  const baseIngredient = {
    id: 'test', name: 'Test',
    kcal: 100, kj: 418, grassi: 5, saturi: 2, monoins: 0, polins: 0,
    carboidrati: 10, zuccheri: 5, fibre: 3, proteine: 8,
    sodio_mg: 50, trans: 0, polioli: 0, amido: 0,
    zuccheri_agg: 0, eritritolo: 0, acidi_organici: 0, alcol: 0,
  };

  const row0 = { id: 't', ing: baseIngredient as unknown as Parameters<typeof calcNutrients>[0][0]['rows'][0]['ing'], grams: 100, eurKg: 0, resa: 0 };
  const row100 = { id: 't', ing: baseIngredient as unknown as Parameters<typeof calcNutrients>[0][0]['rows'][0]['ing'], grams: 100, eurKg: 0, resa: 100 };
  const row50 = { id: 't', ing: baseIngredient as unknown as Parameters<typeof calcNutrients>[0][0]['rows'][0]['ing'], grams: 100, eurKg: 0, resa: 50 };
  const mkComp = (row: typeof row0): Component[] => [{ id: 'c', name: 'c', rows: [row], additiveRows: [], pzUV: 1 }];

  it('resa=0 produce stesso risultato di resa=100', () => {
    const r0 = calcNutrients(mkComp(row0), 100);
    const r100 = calcNutrients(mkComp(row100), 100);

    expect(r0.energyKcal).toBeCloseTo(r100.energyKcal, 2);
    expect(r0.grassi).toBeCloseTo(r100.grassi, 2);
    expect(r0.proteine).toBeCloseTo(r100.proteine, 2);
  });

  it('resa=50 con pesoFinitoVal=0 usa peso cotto come denominatore', () => {
    // pesoFinitoVal=0 → usa peso_totale_pz (= g_raw * resa/100)
    // resa=50: peso_totale_pz = 100 * 50/100 = 50g → nutrienti /50 * 100 = doppio
    // resa=100: peso_totale_pz = 100g → nutrienti /100 * 100 = normale
    const r50 = calcNutrients(mkComp(row50), 0);
    const r100 = calcNutrients(mkComp(row100), 0);
    expect(r50.grassi).toBeGreaterThan(r100.grassi);
  });
});
