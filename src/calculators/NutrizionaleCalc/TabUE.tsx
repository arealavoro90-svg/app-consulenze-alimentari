import React from 'react';

// ─── Exported types ───────────────────────────────────────────────────────────
export type EUSubTab = '100g' | 'uv' | 'porzione' | 'pezzo';

export interface SelectedOptionals {
  monoins: boolean; polins: boolean; polioli: boolean; amido: boolean;
  potassio: boolean; calcio: boolean; fosforo: boolean; magnesio: boolean;
  ferro: boolean; zinco: boolean; rame: boolean; manganese: boolean;
  selenio: boolean; iodio: boolean;
  vitA: boolean; vitD: boolean; vitE: boolean; vitK: boolean; vitC: boolean;
  vitB1: boolean; vitB2: boolean; vitB3: boolean; vitB6: boolean;
  vitB9: boolean; vitB12: boolean; vitB5: boolean;
}

export const DEFAULT_OPTIONALS: SelectedOptionals = {
  monoins: false, polins: false, polioli: false, amido: false,
  potassio: false, calcio: false, fosforo: false, magnesio: false,
  ferro: false, zinco: false, rame: false, manganese: false,
  selenio: false, iodio: false,
  vitA: false, vitD: false, vitE: false, vitK: false, vitC: false,
  vitB1: false, vitB2: false, vitB3: false, vitB6: false,
  vitB9: false, vitB12: false, vitB5: false,
};

// ─── DV / AR References ───────────────────────────────────────────────────────
export const AR_UE = {
    energyKj: 8400, energyKcal: 2000, grassi: 70, saturi: 20, carboidrati: 260,
    zuccheri: 90, fibre: 25, proteine: 50, sale: 6, potassio: 2000, calcio: 800,
    fosforo: 700, magnesio: 375, ferro: 14, zinco: 10, vitC: 80, vitB1: 1.1,
    vitB2: 1.4, vitB3: 16, vitB6: 1.4, vitB9: 200, vitB12: 2.4, vitA_eq: 800, vitD: 5, vitE: 12,
    // Additional EU Reg 1169/2011 Annex XIII values
    vitK: 75, vitB5: 6, rame: 1, manganese: 2, selenio: 55, iodio: 150,
};

// ─── Shared table styling ─────────────────────────────────────────────────────
export const TS = {
    table: { borderCollapse: 'collapse' as const, width: '100%', fontSize: 12 },
    th: { background: '#000', color: 'white', padding: '5px 8px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600 as const },
    thR: { background: '#000', color: 'white', padding: '5px 8px', textAlign: 'right' as const, fontSize: 11, fontWeight: 600 as const },
    td: { padding: '4px 8px', borderBottom: '1px solid #ddd', fontSize: 12 },
    tdR: { padding: '4px 8px', borderBottom: '1px solid #ddd', textAlign: 'right' as const, fontSize: 12 },
    tdB: { padding: '4px 8px', borderBottom: '1px solid #ddd', fontSize: 12, fontWeight: 700 as const },
    tdBR: { padding: '4px 8px', borderBottom: '1px solid #ddd', textAlign: 'right' as const, fontSize: 12, fontWeight: 700 as const },
    tdSub: { padding: '4px 8px 4px 20px', borderBottom: '1px solid #ddd', fontSize: 12, color: '#666' },
    tdSubR: { padding: '4px 8px 4px 20px', borderBottom: '1px solid #ddd', textAlign: 'right' as const, fontSize: 12, color: '#666' },
};

// ─── Rounding helpers (EU Reg. 1169/2011) ────────────────────────────────────
const fUE = (v: string | number) => v.toString().replace('.', ',');
function rUE_energy(v: number): string { return Math.round(v).toString(); }
function rUE_macro(v: number): string {
    // EU Reg. 1169/2011, Allegato XV: < 0.5g → "0"; < 10g → 1 decimal; ≥ 10g → whole number
    if (v < 0.5) return '0';
    if (v < 10) return fUE(v.toFixed(1));
    return Math.round(v).toString();
}
function rUE_sat(v: number): string {
    if (v <= 0.1) return '0';
    if (v < 10) return fUE(v.toFixed(1));
    return Math.round(v).toString();
}
function rUE_sale(v: number): string {
    if (v <= 0.0125) return '0';
    if (v < 1) return fUE(v.toFixed(2));
    return fUE(v.toFixed(1));
}
function rUE_micro3sig(v: number): string {
    if (v === 0) return '0';
    const mag = Math.floor(Math.log10(Math.abs(v)));
    const factor = Math.pow(10, 2 - mag);
    return fUE(Math.round(v * factor) / factor);
}
function rUE_micro2sig(v: number): string {
    if (v === 0) return '0';
    const mag = Math.floor(Math.log10(Math.abs(v)));
    const factor = Math.pow(10, 1 - mag);
    return fUE(Math.round(v * factor) / factor);
}
function rUE_pct(v: number, ref: number): number | null {
    const p = v / ref * 100;
    return p >= 15 ? Math.round(p) : null;
}

// ─── Local interfaces ─────────────────────────────────────────────────────────
interface CalcResult {
    energyKcal: number; energyKj: number; grassi: number; saturi: number;
    monoins: number; polins: number; trans: number; colesterolo: number;
    carboidrati: number; carboidratiTot: number; zuccheri: number;
    zuccheri_agg: number; polioli: number; amido: number; fibre: number;
    proteine: number; sodio_mg: number; sale: number; potassio: number;
    calcio: number; fosforo: number; magnesio: number; ferro: number;
    zinco: number; vitA_eq: number; vitD: number; vitE: number; vitC: number;
    vitB1: number; vitB2: number; vitB3: number; vitB6: number; vitB9: number; vitB12: number;
    // Optional extended micronutrients
    vitK?: number; vitB5?: number; rame?: number; manganese?: number;
    selenio?: number; iodio?: number;
}

interface UEServing { porzione?: number; confezione?: number; pezzo?: number; }

// ─── scaleResult ─────────────────────────────────────────────────────────────
const ZERO_CALC: CalcResult = {
    energyKcal: 0, energyKj: 0, grassi: 0, saturi: 0, monoins: 0, polins: 0,
    trans: 0, colesterolo: 0, carboidrati: 0, carboidratiTot: 0, zuccheri: 0,
    zuccheri_agg: 0, polioli: 0, amido: 0, fibre: 0, proteine: 0, sodio_mg: 0,
    sale: 0, potassio: 0, calcio: 0, fosforo: 0, magnesio: 0, ferro: 0, zinco: 0,
    vitA_eq: 0, vitD: 0, vitE: 0, vitC: 0, vitB1: 0, vitB2: 0, vitB3: 0, vitB6: 0,
    vitB9: 0, vitB12: 0,
};

function scaleResult(r: CalcResult, grams: number): CalcResult {
    const f = grams / 100;
    const s: CalcResult = { ...ZERO_CALC };
    for (const k of Object.keys(r) as (keyof CalcResult)[]) {
        const val = r[k];
        if (typeof val === 'number') {
            (s as unknown as Record<string, number>)[k] = val * f;
        }
    }
    return s;
}

// ─── TabUE component ──────────────────────────────────────────────────────────
interface TabUEProps {
  p: CalcResult;
  ue: UEServing;
  specificGravity?: number;
  selectedOptionals: SelectedOptionals;
  showOptionals: boolean;
  activeSubTab: EUSubTab;
}

export function TabUE({ p, ue, specificGravity, selectedOptionals, showOptionals, activeSubTab }: TabUEProps) {
    const scaled: CalcResult = (() => {
        if (activeSubTab === 'uv' && ue.confezione) return scaleResult(p, ue.confezione);
        if (activeSubTab === 'porzione' && ue.porzione) return scaleResult(p, ue.porzione);
        if (activeSubTab === 'pezzo' && ue.pezzo) return scaleResult(p, ue.pezzo);
        return p;
    })();

    const unitLabel = (() => {
        const unit = specificGravity && specificGravity > 0 ? 'ml' : 'g';
        if (activeSubTab === 'uv' && ue.confezione) return `${ue.confezione} ${unit}`;
        if (activeSubTab === 'porzione' && ue.porzione) return `${ue.porzione} ${unit}`;
        if (activeSubTab === 'pezzo' && ue.pezzo) return `${ue.pezzo} ${unit}`;
        return `100 ${unit}`;
    })();

    interface UERow {
        label: string; indent?: boolean; bold?: boolean;
        value: string; arPct: string;
        isOptional?: boolean; optionalKey?: keyof SelectedOptionals;
    }

    const rows: UERow[] = [
        { label: 'Energia', bold: true, value: `${rUE_energy(scaled.energyKj)} kJ / ${rUE_energy(scaled.energyKcal)} kcal`, arPct: `${Math.round(p.energyKcal / AR_UE.energyKcal * 100)}%` },
        { label: 'Grassi', bold: true, value: `${rUE_macro(scaled.grassi)} g`, arPct: `${Math.round(p.grassi / AR_UE.grassi * 100)}%` },
        { label: 'di cui acidi grassi saturi', indent: true, value: `${rUE_sat(scaled.saturi)} g`, arPct: `${Math.round(p.saturi / AR_UE.saturi * 100)}%` },
        { label: 'di cui acidi grassi monoinsaturi', indent: true, value: `${rUE_sat(scaled.monoins)} g`, arPct: '—', isOptional: true, optionalKey: 'monoins' },
        { label: 'di cui acidi grassi polinsaturi', indent: true, value: `${rUE_sat(scaled.polins)} g`, arPct: '—', isOptional: true, optionalKey: 'polins' },
        { label: 'Carboidrati', bold: true, value: `${rUE_macro(scaled.carboidrati)} g`, arPct: `${Math.round(p.carboidrati / AR_UE.carboidrati * 100)}%` },
        { label: 'di cui zuccheri', indent: true, value: `${rUE_macro(scaled.zuccheri)} g`, arPct: `${Math.round(p.zuccheri / AR_UE.zuccheri * 100)}%` },
        { label: 'di cui polioli', indent: true, value: `${rUE_macro(scaled.polioli)} g`, arPct: '—', isOptional: true, optionalKey: 'polioli' },
        { label: 'di cui amido', indent: true, value: `${rUE_macro(scaled.amido)} g`, arPct: '—', isOptional: true, optionalKey: 'amido' },
        // BUG FIX: fibre non ha % AR normativa EU → '—'
        { label: 'Fibre', bold: true, value: `${rUE_macro(scaled.fibre)} g`, arPct: '—' },
        { label: 'Proteine', bold: true, value: `${rUE_macro(scaled.proteine)} g`, arPct: `${Math.round(p.proteine / AR_UE.proteine * 100)}%` },
        { label: 'Sale', bold: true, value: `${rUE_sale(scaled.sale)} g`, arPct: `${Math.round(p.sale / AR_UE.sale * 100)}%` },
    ].filter(r => {
        if (!r.isOptional) return true;
        return showOptionals && r.optionalKey ? selectedOptionals[r.optionalKey] : false;
    });

    interface MicroRow {
        label: string; val: number; ref: number;
        unit: string; fmt: (v: number) => string; key: keyof SelectedOptionals;
    }

    const microRows: MicroRow[] = [
        { label: 'Vitamina A', val: scaled.vitA_eq, ref: AR_UE.vitA_eq, unit: 'µg', fmt: rUE_micro3sig, key: 'vitA' },
        { label: 'Vitamina D', val: scaled.vitD, ref: AR_UE.vitD, unit: 'µg', fmt: rUE_micro3sig, key: 'vitD' },
        { label: 'Vitamina E', val: scaled.vitE, ref: AR_UE.vitE, unit: 'mg', fmt: rUE_micro3sig, key: 'vitE' },
        { label: 'Vitamina K', val: scaled.vitK ?? 0, ref: AR_UE.vitK, unit: 'µg', fmt: rUE_micro3sig, key: 'vitK' },
        { label: 'Vitamina C', val: scaled.vitC, ref: AR_UE.vitC, unit: 'mg', fmt: rUE_micro3sig, key: 'vitC' },
        { label: 'Vitamina B1 (Tiamina)', val: scaled.vitB1, ref: AR_UE.vitB1, unit: 'mg', fmt: rUE_micro3sig, key: 'vitB1' },
        { label: 'Vitamina B2 (Riboflavina)', val: scaled.vitB2, ref: AR_UE.vitB2, unit: 'mg', fmt: rUE_micro3sig, key: 'vitB2' },
        { label: 'Vitamina B3 (Niacina/PP)', val: scaled.vitB3, ref: AR_UE.vitB3, unit: 'mg', fmt: rUE_micro3sig, key: 'vitB3' },
        { label: 'Vitamina B6', val: scaled.vitB6, ref: AR_UE.vitB6, unit: 'mg', fmt: rUE_micro3sig, key: 'vitB6' },
        { label: 'Acido folico (B9)', val: scaled.vitB9, ref: AR_UE.vitB9, unit: 'µg', fmt: rUE_micro3sig, key: 'vitB9' },
        { label: 'Vitamina B12', val: scaled.vitB12, ref: AR_UE.vitB12, unit: 'µg', fmt: rUE_micro3sig, key: 'vitB12' },
        { label: 'Acido pantotenico (B5)', val: scaled.vitB5 ?? 0, ref: AR_UE.vitB5, unit: 'mg', fmt: rUE_micro3sig, key: 'vitB5' },
        { label: 'Potassio', val: scaled.potassio, ref: AR_UE.potassio, unit: 'mg', fmt: rUE_micro3sig, key: 'potassio' },
        { label: 'Calcio', val: scaled.calcio, ref: AR_UE.calcio, unit: 'mg', fmt: rUE_micro3sig, key: 'calcio' },
        { label: 'Fosforo', val: scaled.fosforo, ref: AR_UE.fosforo, unit: 'mg', fmt: rUE_micro3sig, key: 'fosforo' },
        { label: 'Magnesio', val: scaled.magnesio, ref: AR_UE.magnesio, unit: 'mg', fmt: rUE_micro3sig, key: 'magnesio' },
        { label: 'Ferro', val: scaled.ferro, ref: AR_UE.ferro, unit: 'mg', fmt: rUE_micro2sig, key: 'ferro' },
        { label: 'Zinco', val: scaled.zinco, ref: AR_UE.zinco, unit: 'mg', fmt: rUE_micro2sig, key: 'zinco' },
        { label: 'Rame', val: scaled.rame ?? 0, ref: AR_UE.rame, unit: 'mg', fmt: rUE_micro3sig, key: 'rame' },
        { label: 'Manganese', val: scaled.manganese ?? 0, ref: AR_UE.manganese, unit: 'mg', fmt: rUE_micro3sig, key: 'manganese' },
        { label: 'Selenio', val: scaled.selenio ?? 0, ref: AR_UE.selenio, unit: 'µg', fmt: rUE_micro3sig, key: 'selenio' },
        { label: 'Iodio', val: scaled.iodio ?? 0, ref: AR_UE.iodio, unit: 'µg', fmt: rUE_micro3sig, key: 'iodio' },
    ].filter(m => showOptionals && selectedOptionals[m.key]);

    return (
        <div data-table-export style={{ background: 'white', padding: 12, borderRadius: 0 }}>
            <div style={{ maxWidth: 'min(500px, 100%)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #999' }}>
                    <thead>
                        <tr>
                            <th style={{ background: '#f5f5f5', border: '1px solid #999', padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 14 }}>
                                DICHIARAZIONE NUTRIZIONALE
                            </th>
                            <th style={{ background: '#f5f5f5', border: '1px solid #999', padding: '8px 10px', textAlign: 'center', fontWeight: 700, fontSize: 13, width: '100px' }}>
                                % AR *
                            </th>
                        </tr>
                        <tr>
                            <td style={{ background: '#f5f5f5', border: '1px solid #999', padding: '5px 10px', fontSize: 11, fontWeight: 600 }}>
                                Valori nutrizionali medi per {unitLabel} di prodotto
                            </td>
                            <td style={{ background: '#f5f5f5', border: '1px solid #999', padding: '5px 10px' }} />
                        </tr>
                    </thead>
                </table>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ ...TS.table, border: '2px solid #999', borderTop: '1px solid #999', width: '100%' }}>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #999' }}>
                                    <td style={{
                                        padding: '10px 12px',
                                        fontSize: r.bold ? 13 : 12,
                                        fontWeight: r.bold ? 700 : 400,
                                        paddingLeft: r.indent ? 28 : 12,
                                        borderRight: '1px solid #999',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <span>{r.label}</span>
                                            <span style={{ marginLeft: 20, fontWeight: 600 }}>{r.value}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: r.bold ? 700 : 400, textAlign: 'center', width: '100px' }}>
                                        {r.arPct}
                                    </td>
                                </tr>
                            ))}
                            {microRows.map((m, i) => {
                                const pct = rUE_pct(m.val, m.ref);
                                return (
                                    <tr key={`micro-${i}`} style={{ borderBottom: '1px solid #999' }}>
                                        <td style={{ padding: '10px 12px', fontSize: 12, borderRight: '1px solid #999' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <span>{m.label}</span>
                                                <span style={{ marginLeft: 20, fontWeight: 600 }}>{m.fmt(m.val)} {m.unit}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'center', width: '100px' }}>
                                            {pct !== null ? `${pct}%` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <p style={{ fontSize: 10, color: '#666', marginTop: 8, lineHeight: 1.4, fontWeight: 500 }}>
                    *Assunzioni di riferimento di un adulto medio (8400 kJ / 2000 kcal).
                </p>
            </div>
        </div>
    );
}
