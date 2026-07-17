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
export type USAServingRef = 'serving' | 'confezione';
export type USAMeasure = 'g' | 'tazze' | 'cucchiai' | 'pezzi';

// ─── DV Gulf ──────────────────────────────────────────────────────────────────
const DV_GULF = {
    energyKcal: 2000, grassi: 70, saturi: 20, colesterolo: 300,
    sodio_mg: 2400, carboidratiTot: 260, fibre: 28, zuccheri_agg: 50,
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

// ─── Rounding helpers (Gulf) — sorgente: versione desktop (TAB-UNIFY 2026-07-17) ──
function arRndE(v: number): number { return Math.round(v); }
function arRndG(v: number): number { return v < 10 ? Math.round(v * 10) / 10 : Math.round(v); }
function arFmtG(v: number): string { const r = arRndG(v); return r < 10 ? r.toFixed(1) : r.toString(); }
function arRndMg(v: number): number { return v < 1000 ? Math.round(v / 10) * 10 : Math.round(v / 100) * 100; }
function arPct(v: number, dv: number): number { return Math.round(v / dv * 100); }
function arDec1(n: number): string { return n.toFixed(1).replace('.', ','); }
function arCupFmt(qty: number): string {
    const fracs: [number, string][] = [[0.25,'1/4'],[1/3,'1/3'],[0.5,'1/2'],[2/3,'2/3'],[0.75,'3/4']];
    const whole = Math.floor(qty);
    const frac = qty - whole;
    for (const [v, s] of fracs) { if (Math.abs(frac - v) < 0.07) return whole > 0 ? `${whole} ${s}` : s; }
    return arDec1(qty);
}

function buildArabiSI(arabi: ServingSizesNation, servingRef: USAServingRef, measure: USAMeasure, unit: string) {
    const pkgG = arabi.confezione ?? 0;
    const svG  = arabi.serving ?? 0;
    const refGrams = servingRef === 'confezione' ? pkgG : svG;
    const servingsPerContainer = (pkgG > 0 && svG > 0) ? arDec1(pkgG / svG) : '1';
    const sizeLabel   = servingRef === 'confezione' ? 'container' : 'Serving size';
    const amountLabel = servingRef === 'confezione' ? 'Amount per container' : 'Amount per serving';

    let sizeValue: string;
    if (servingRef === 'confezione') {
        switch (measure) {
            case 'tazze':    { const c = arabi.cup ?? 240;      sizeValue = `${arCupFmt(pkgG / c)} cup (${pkgG}${unit})`; break; }
            case 'cucchiai': { const t = arabi.cucchiaio ?? 15; sizeValue = `${arDec1(pkgG / t)} tablespoon (${pkgG}${unit})`; break; }
            case 'pezzi':    { const p = arabi.pezzo ?? (svG || pkgG); sizeValue = `${arDec1(pkgG / p)} pieces (${pkgG}${unit})`; break; }
            default: sizeValue = svG > 0 ? `${Math.round(pkgG / svG)} serving (${pkgG}${unit})` : `${pkgG}${unit}`;
        }
    } else {
        switch (measure) {
            case 'tazze':    { const c = arabi.cup ?? 240;      sizeValue = `${arCupFmt(svG / c)} cup (${svG}${unit})`; break; }
            case 'cucchiai': { const t = arabi.cucchiaio ?? 15; sizeValue = `${arDec1(svG / t)} tablespoon (${svG}${unit})`; break; }
            case 'pezzi':    { const p = arabi.pezzo ?? svG;    sizeValue = `${arDec1(svG / p)} pieces (${svG}${unit})`; break; }
            default: sizeValue = `${svG}${unit}`;
        }
    }
    return { refGrams, servingsPerContainer, sizeLabel, sizeValue, amountLabel };
}

// ─── Component — markup UNIFICATO (sorgente: versione desktop, TAB-UNIFY 2026-07-17) ──
export function TabArabi({ p, arabi, servingRef, measure, specificGravity }: {
    p: CalcResult; arabi: ServingSizesNation;
    servingRef: USAServingRef; measure: USAMeasure;
    specificGravity?: number;
}) {
    const unit = (specificGravity ?? 0) > 0 ? 'ml' : 'g';
    const si = buildArabiSI(arabi, servingRef, measure, unit);
    const d  = si.refGrams > 0 ? scaleResult(p, si.refGrams) : p;
    const F  = 'Arial, Helvetica, sans-serif';

    const addedSugarsStr = arFmtG(d.zuccheri_agg);

    const nutriRows = [
        { label: 'Total Fat',          val: d.grassi,        dvRef: DV_GULF.grassi,        unit: 'g',  bold: true,  indent: 0, italic: false },
        { label: 'Saturated Fat',      val: d.saturi,        dvRef: DV_GULF.saturi,        unit: 'g',  bold: false, indent: 1, italic: false },
        { label: 'Trans Fat',          val: d.trans,         dvRef: 0,                     unit: 'g',  bold: false, indent: 1, italic: true  },
        { label: 'Cholesterol',        val: d.colesterolo,   dvRef: DV_GULF.colesterolo,   unit: 'mg', bold: true,  indent: 0, italic: false },
        { label: 'Sodium',             val: d.sodio_mg,      dvRef: DV_GULF.sodio_mg,      unit: 'mg', bold: true,  indent: 0, italic: false },
        { label: 'Total Carbohydrate', val: d.carboidratiTot,dvRef: DV_GULF.carboidratiTot,unit: 'g',  bold: true,  indent: 0, italic: false },
        { label: 'Dietary Fiber',      val: d.fibre,         dvRef: DV_GULF.fibre,         unit: 'g',  bold: false, indent: 1, italic: false },
        { label: 'Total Sugars',       val: d.zuccheri,      dvRef: 0,                     unit: 'g',  bold: false, indent: 1, italic: false },
        { label: `Includes ${addedSugarsStr}g Added Sugars`, val: d.zuccheri_agg, dvRef: DV_GULF.zuccheri_agg, unit: 'g', bold: false, indent: 2, italic: false },
        { label: 'Protein',            val: d.proteine,      dvRef: 0,                     unit: 'g',  bold: true,  indent: 0, italic: false },
    ];

    return (
        <div style={{ background: 'white' }}>
            <div data-table-export style={{ background: 'white', padding: 12, display: 'inline-block' }}>
                <div style={{ width: 310, border: '2.5px solid #000', padding: '8px 8px 6px 8px', fontFamily: F, color: '#000', boxSizing: 'border-box' as const }}>

                    {/* Title */}
                    <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, whiteSpace: 'nowrap', WebkitTextStroke: '0.6px #000', borderBottom: '1px solid #000', paddingBottom: 3, marginBottom: 2 }}>Nutrition Facts</div>

                    {/* Servings per container */}
                    <div style={{ fontSize: 18, fontWeight: 400 }}>
                        {si.servingsPerContainer} servings per container
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 16, fontWeight: 900, WebkitTextStroke: '0.4px #000' }}>Serving size</span>
                        <span style={{ fontSize: 16, fontWeight: 900, WebkitTextStroke: '0.4px #000' }}>{si.sizeValue}</span>
                    </div>

                    {/* Thick bar + Amount + Calories */}
                    <div style={{ borderTop: '14px solid #000', marginTop: 3, paddingTop: 2 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, WebkitTextStroke: '0.4px #000', lineHeight: 1, marginBottom: 0 }}>{si.amountLabel}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '8px solid #000', paddingBottom: 2, marginTop: -10 }}>
                            <span style={{ fontSize: 32, fontWeight: 900, WebkitTextStroke: '0.8px #000' }}>Calories</span>
                            <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, WebkitTextStroke: '0.8px #000' }}>{arRndE(d.energyKcal)}</span>
                        </div>
                    </div>

                    {/* % DV header */}
                    <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 900, WebkitTextStroke: '0.4px #000', paddingTop: 2, paddingBottom: 1, borderBottom: '1px solid #000' }}>
                        % Daily Value*
                    </div>

                    {/* Nutrient rows */}
                    {nutriRows.map((r, i) => {
                        const fmtV = r.unit === 'mg' ? `${arRndMg(r.val)} mg` : `${arFmtG(r.val)} g`;
                        const pct  = r.dvRef > 0 ? arPct(r.unit === 'mg' ? arRndMg(r.val) : arRndG(r.val), r.dvRef) : null;
                        const isLast = i === nutriRows.length - 1;
                        // 0.5pt thicker on: Cholesterol(3), Sodium(4), TotalCarb(5), Includes(8), Protein/last
                        const needsThickBorder = !isLast && ((r.bold && i > 0) || r.indent >= 2);
                        const borderBottom = isLast ? '8px solid #000' : needsThickBorder ? '1.5px solid #000' : '1px solid #000';
                        // label name bold, value regular for main nutrients
                        const labelNode = r.italic
                            ? <><em>Trans</em>{' Fat '}<span style={{ fontWeight: 400 }}>{fmtV}</span></>
                            : r.indent >= 2
                            ? <>{r.label}</>
                            : r.bold
                            ? <><span style={{ fontWeight: 900, WebkitTextStroke: '0.4px #000' }}>{r.label}</span>{' '}<span style={{ fontWeight: 400 }}>{fmtV}</span></>
                            : <>{r.label} {fmtV}</>;
                        return (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                                borderBottom,
                                paddingLeft: r.indent * 18,
                                paddingTop: 2, paddingBottom: 2,
                            }}>
                                <span style={{ fontSize: r.bold ? 15 : 13, fontWeight: r.bold ? 900 : 400 }}>{labelNode}</span>
                                {pct !== null ? <span style={{ fontSize: 13, fontWeight: 900, WebkitTextStroke: '0.4px #000' }}>{pct}%</span> : <span />}
                            </div>
                        );
                    })}

                    {/* Footnote */}
                    <div style={{ fontSize: 11, paddingTop: 4, lineHeight: 1.3 }}>
                        *The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
                    </div>
                </div>
            </div>
        </div>
    );
}
