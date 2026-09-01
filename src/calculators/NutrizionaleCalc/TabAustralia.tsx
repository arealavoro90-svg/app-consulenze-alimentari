import React from 'react';
import { rAU_kj, rAU_kcal, rAU_g1, rAU_mg } from '../../utils/nutritionalRounding';

// ─── Shared types ─────────────────────────────────────────────────────────────
export interface CalcResult {
    energyKcal: number; energyKj: number; grassi: number; saturi: number;
    monoins: number; polins: number; trans: number; colesterolo: number;
    carboidrati: number; carboidratiTot: number; zuccheri: number;
    zuccheri_agg: number; polioli: number; amido: number; fibre: number;
    proteine: number; sodio_mg: number; sale: number; potassio: number;
    calcio: number; fosforo: number; magnesio: number; ferro: number;
    zinco: number; vitA_eq: number; vitD: number; vitE: number; vitC: number;
    vitB1: number; vitB2: number; vitB3: number; vitB6: number; vitB9: number; vitB12: number;
}
export interface ServingSizesNation {
    cup?: number; cucchiaio?: number; serving?: number; confezione?: number; pezzo?: number;
}

// ─── DV Australia (FSANZ) ─────────────────────────────────────────────────────
const DV_AU = {
    energyKj: 8700, energyKcal: 2049, grassi: 70, saturi: 24, carboidrati: 310,
    zuccheri: 90, fibre: 30, proteine: 50, sodio_mg: 2300,
};

// ─── Scale helper ─────────────────────────────────────────────────────────────
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
        (s as unknown as Record<string, number>)[k] = (r as unknown as Record<string, number>)[k] * f;
    }
    return s;
}

// ─── Component — markup UNIFICATO (sorgente: versione desktop, TAB-UNIFY 2026-07-17) ──
export function TabAustralia({ p, au }: { p: CalcResult; au: ServingSizesNation }) {
    const svG = au.serving || 0;
    const sv = svG > 0 ? scaleResult(p, svG) : null;
    const pkgG = au.confezione || 0;
    const servingsPerPkg = (svG > 0 && pkgG > 0) ? pkgG / svG : null;

    const diPct = (val: number, ref: number) => `${Math.round(val / ref * 100)} %`;

    interface AURow { label: string; svVal: string; di: string; p100: string; isSub?: boolean; }
    const rows: AURow[] = [];

    if (sv) {
        rows.push({
            label: 'Energy',
            svVal: `${rAU_kj(sv.energyKj)} kJ (${rAU_kcal(sv.energyKcal)} Cal)`,
            di: diPct(sv.energyKj, DV_AU.energyKj),
            p100: `${rAU_kj(p.energyKj)} kJ (${rAU_kcal(p.energyKcal)} Cal)`,
        });
        ([
            { label: 'Protein',       svVal: sv.proteine,    p100: p.proteine,    ref: DV_AU.proteine,    unit: 'g' },
            { label: 'Fat, total',    svVal: sv.grassi,      p100: p.grassi,      ref: DV_AU.grassi,      unit: 'g' },
            { label: '- saturated',   svVal: sv.saturi,      p100: p.saturi,      ref: DV_AU.saturi,      unit: 'g', isSub: true },
            { label: 'Carbohydrate',  svVal: sv.carboidrati, p100: p.carboidrati, ref: DV_AU.carboidrati, unit: 'g' },
            { label: '- sugars',      svVal: sv.zuccheri,    p100: p.zuccheri,    ref: DV_AU.zuccheri,    unit: 'g', isSub: true },
            { label: 'Dietary fibre', svVal: sv.fibre,       p100: p.fibre,       ref: DV_AU.fibre,       unit: 'g' },
            { label: 'Sodium',        svVal: sv.sodio_mg,    p100: p.sodio_mg,    ref: DV_AU.sodio_mg,    unit: 'mg' },
        ] as { label: string; svVal: number; p100: number; ref: number; unit: string; isSub?: boolean }[]).forEach(r => {
            const fmt = (v: number) => r.unit === 'mg' ? `${rAU_mg(v)} mg` : `${rAU_g1(v)} g`;
            rows.push({ label: r.label, svVal: fmt(r.svVal), di: diPct(r.svVal, r.ref), p100: fmt(r.p100), isSub: r.isSub });
        });
    }

    const bOut = '2px solid #000';
    const bHdr = '1px solid #000';
    const thStyle: React.CSSProperties = { padding: '5px 10px', fontWeight: 700, fontSize: 12, borderBottom: bHdr, verticalAlign: 'bottom' };
    const tdStyle: React.CSSProperties = { padding: '2px 10px', fontSize: 12, fontWeight: 700, color: '#000' };

    return (
        <div style={{ background: 'white' }}>
            <div data-table-export style={{ background: 'white', padding: 12, borderRadius: 0, display: 'inline-block', minWidth: 560, boxSizing: 'border-box' }}>
                <div style={{ border: bOut, fontFamily: 'Arial, sans-serif', fontSize: 12 }}>
                    {/* Titolo */}
                    <div style={{ textAlign: 'center', padding: '8px 12px 6px', borderBottom: bHdr }}>
                        <span style={{ fontSize: 24, fontWeight: 900 }}>NUTRITION INFORMATION</span>
                    </div>
                    {/* Serving info */}
                    <div style={{ padding: '10px 12px', borderBottom: bHdr, lineHeight: 1.8, fontWeight: 700 }}>
                        {servingsPerPkg !== null && (
                            <div style={{ fontSize: 12, fontWeight: 700 }}>
                                Servings per Package: {servingsPerPkg.toFixed(1).replace('.', ',')}
                            </div>
                        )}
                        <div style={{ fontSize: 12, fontWeight: 700 }}>
                            Serving Size:&nbsp;&nbsp;{svG > 0 ? `${svG} g` : '—'}
                        </div>
                    </div>
                    {/* Tabella: nessuna linea verticale, solo bordo sotto intestazione */}
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ ...thStyle, textAlign: 'left', width: '23%' }}></th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Average Quantity<br />per Serving</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>% Daily Intake*<br />(per Serving)</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Average Quantity<br />per 100&nbsp;g</th>
                            </tr>
                        </thead>
                        <tbody>
                            {svG > 0 && sv ? rows.map((r, i) => (
                                <tr key={i}>
                                    <td style={{ ...tdStyle, paddingTop: i === 0 ? 8 : 2, paddingLeft: r.isSub ? 22 : 10 }}>{r.label}</td>
                                    <td style={{ ...tdStyle, paddingTop: i === 0 ? 8 : 2, ...(i === 0 ? { whiteSpace: 'nowrap' } : {}) }}>{r.svVal}</td>
                                    <td style={{ ...tdStyle, paddingTop: i === 0 ? 8 : 2 }}>{r.di}</td>
                                    <td style={{ ...tdStyle, paddingTop: i === 0 ? 8 : 2, ...(i === 0 ? { whiteSpace: 'nowrap' } : {}) }}>{r.p100}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} style={{ ...tdStyle, color: '#888' }}>Inserire il valore serving size sopra per calcolare le quantità per porzione.</td></tr>
                            )}
                        </tbody>
                    </table>
                    {/* Footer */}
                    <div style={{ padding: '6px 10px 8px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700 }}>* Percentage daily intakes are based on an average adult diet of 8700 kJ</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
