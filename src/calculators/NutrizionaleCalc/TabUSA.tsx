import React from 'react';

// ─── Exported types ─────────────────────────────────────────────────────────
export type USAServingRef = 'serving' | 'confezione';
export type USAMeasure = 'g' | 'tazze' | 'cucchiai' | 'pezzi';

// ─── Local interfaces ────────────────────────────────────────────────────────
interface CalcResult {
    energyKcal: number; energyKj: number; grassi: number; saturi: number;
    monoins: number; polins: number; trans: number; colesterolo: number;
    carboidrati: number; carboidratiTot: number; zuccheri: number;
    zuccheri_agg: number; polioli: number; amido: number; fibre: number;
    proteine: number; sodio_mg: number; sale: number; potassio: number;
    calcio: number; fosforo: number; magnesio: number; ferro: number;
    zinco: number; vitA_eq: number; vitD: number; vitE: number; vitC: number;
    vitB1: number; vitB2: number; vitB3: number; vitB6: number; vitB9: number; vitB12: number;
    vitK?: number; vitB5?: number; rame?: number; manganese?: number;
    selenio?: number; iodio?: number;
}

interface ServingSizesNation {
    cup?: number;
    cucchiaio?: number;
    serving?: number;
    confezione?: number;
    pezzo?: number;
}

// ─── FDA Daily Values (2020–2025) ────────────────────────────────────────────
const DV_USA = {
    energyKcal: 2000, grassi: 78, saturi: 20, carboidratiTot: 275, fibre: 28,
    zuccheri_agg: 50, proteine: 50, sodio_mg: 2300, colesterolo: 300,
    potassio: 4700, calcio: 1300, ferro: 18, vitD: 20,
};

// ─── Scale helper ────────────────────────────────────────────────────────────
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

// ─── FDA 21 CFR 101.9 rounding ───────────────────────────────────────────────
function rEnergy(v: number): number {
    if (v < 5) return 0;
    if (v <= 50) return Math.round(v / 5) * 5;
    return Math.round(v / 10) * 10;
}
// A-1 fix: 3 ranges per 21 CFR 101.9(c)(2) — <0.5g→0, 0.5–5g→nearest 0.1g, >5g→nearest 1g
function rG(v: number): number {
    if (v < 0.5) return 0;
    if (v <= 5) return Math.round(v * 10) / 10;
    return Math.round(v);
}
function rMg(v: number): number { return v < 5 ? 0 : Math.round(v / 5) * 5; }
// C-1 fix: Sodium — 3 ranges per 21 CFR 101.9(c)(7): <5→0, 5–140→nearest 5, >140→nearest 10
function rSodium(v: number): number {
    if (v < 5) return 0;
    if (v <= 140) return Math.round(v / 5) * 5;
    return Math.round(v / 10) * 10;
}
function rPct(v: number, dv: number): number { return Math.round(v / dv * 100); }
// Vitamin D: 21 CFR 101.9(c)(9) — <0.1mcg→0, 0.1–<10mcg→nearest 0.1mcg, ≥10mcg→nearest 0.5mcg
function rVitD(v: number): number {
    if (v < 0.1) return 0;
    if (v < 10) return Math.round(v * 10) / 10;
    return Math.round(v * 2) / 2;
}
// Calcium: 21 CFR 101.9(c)(9) — <2mg→0, else→nearest 5mg
function rCalcium(v: number): number { return v < 2 ? 0 : Math.round(v / 5) * 5; }
// Iron: 21 CFR 101.9(c)(9) — <0.1mg→0, else→nearest 0.1mg
function rIron(v: number): number { return v < 0.1 ? 0 : Math.round(v * 10) / 10; }
// Potassium: 21 CFR 101.9(c)(9) — <5mg→0, else→nearest 5mg (same as rMg)

// C-2 fix: USA uses period as decimal separator (not comma)
function dec1(n: number): string { return n.toFixed(1); }

// ─── Props ───────────────────────────────────────────────────────────────────
interface TabUSAProps {
    p: CalcResult;
    usa: ServingSizesNation;
    specificGravity: number;
    servingRef: USAServingRef;
    measure: USAMeasure;
    subTab: 'verticale' | 'orizzontale' | 'lineare';
}

// ─── Build serving info ──────────────────────────────────────────────────────
interface ServingInfo {
    refGrams: number;
    servingsPerContainer: string;
    sizeLabel: string;    // "Serving size" or "container"
    sizeValue: string;    // e.g. "0,50 cup (120g)"
    amountLabel: string;  // "Amount per serving" or "Amount per container"
}

function buildServingInfo(
    usa: ServingSizesNation,
    servingRef: USAServingRef,
    measure: USAMeasure,
    unit: string,
): ServingInfo {
    const refGrams = servingRef === 'confezione' ? (usa.confezione ?? 0) : (usa.serving ?? 0);

    // Servings per container
    let servingsPerContainer = '1';
    if (usa.confezione && usa.serving && usa.serving > 0) {
        servingsPerContainer = dec1(usa.confezione / usa.serving);
    }

    const sizeLabel = servingRef === 'confezione' ? 'container' : 'Serving size';
    const amountLabel = servingRef === 'confezione' ? 'Amount per container' : 'Amount per serving';

    let sizeValue: string;
    switch (measure) {
        case 'tazze': {
            const cupMl = usa.cup ?? 240;
            sizeValue = `${dec1(refGrams / cupMl)} cup (${refGrams}${unit})`;
            break;
        }
        case 'cucchiai': {
            const tbspMl = usa.cucchiaio ?? 15;
            sizeValue = `${dec1(refGrams / tbspMl)} tablespoon (${refGrams}${unit})`;
            break;
        }
        case 'pezzi': {
            const pieceG = usa.pezzo ?? refGrams;
            sizeValue = `${dec1(refGrams / pieceG)} pieces (${refGrams}${unit})`;
            break;
        }
        default:
            sizeValue = `${refGrams} ${unit}`;
    }

    return { refGrams, servingsPerContainer, sizeLabel, sizeValue, amountLabel };
}

// ─── Nutrient row type ────────────────────────────────────────────────────────
interface NRow {
    label: string;
    val: number;
    dvRef: number;   // 0 = no %DV shown
    unit: 'g' | 'mg';
    bold: boolean;
    indent: 0 | 1 | 2;
    italic?: boolean;
}

function buildRows(d: CalcResult): NRow[] {
    return [
        { label: 'Total Fat', val: d.grassi, dvRef: DV_USA.grassi, unit: 'g', bold: true, indent: 0 },
        { label: 'Saturated Fat', val: d.saturi, dvRef: DV_USA.saturi, unit: 'g', bold: false, indent: 1 },
        { label: 'Trans Fat', val: d.trans, dvRef: 0, unit: 'g', bold: false, indent: 2, italic: true },
        { label: 'Cholesterol', val: d.colesterolo, dvRef: DV_USA.colesterolo, unit: 'mg', bold: true, indent: 0 },
        { label: 'Sodium', val: d.sodio_mg, dvRef: DV_USA.sodio_mg, unit: 'mg', bold: true, indent: 0 },
        { label: 'Total Carbohydrate', val: d.carboidratiTot, dvRef: DV_USA.carboidratiTot, unit: 'g', bold: true, indent: 0 },
        { label: 'Dietary Fiber', val: d.fibre, dvRef: DV_USA.fibre, unit: 'g', bold: false, indent: 1 },
        { label: 'Total Sugars', val: d.zuccheri, dvRef: 0, unit: 'g', bold: false, indent: 2 },
        // Protein is rendered separately after Added Sugars (FDA order)
    ];
}

// Helper: returns the correctly-rounded declared value for a nutrient row
function roundedVal(r: NRow): number {
    if (r.unit === 'mg') return r.label === 'Sodium' ? rSodium(r.val) : rMg(r.val);
    return rG(r.val);
}

// 21 CFR 101.9(c)(8)(i): Cholesterol display — <2mg→"0mg", 2–5mg→"less than 5mg", >5mg→nearest 5mg
function fmtCholesterol(v: number): string {
    if (v < 2) return '0mg';
    if (v < 5) return 'less than 5mg';
    return `${Math.round(v / 5) * 5}mg`;
}

function fmtVal(r: NRow): string {
    if (r.label === 'Cholesterol') return fmtCholesterol(r.val);
    const n = roundedVal(r);
    if (r.unit === 'mg') return `${n}mg`;
    // show 1 decimal for values in 0.5–5g range
    return n % 1 !== 0 ? `${n.toFixed(1)}g` : `${n}g`;
}

interface VitRow { label: string; shortLabel: string; val: number; dv: number; unit: string; rFn: (v: number) => number; }

function buildVitamins(d: CalcResult): VitRow[] {
    return [
        { label: 'Vitamin D', shortLabel: 'Vit.D', val: d.vitD, dv: DV_USA.vitD, unit: 'mcg', rFn: rVitD },
        { label: 'Calcium', shortLabel: 'Calcium', val: d.calcio, dv: DV_USA.calcio, unit: 'mg', rFn: rCalcium },
        { label: 'Iron', shortLabel: 'Iron', val: d.ferro, dv: DV_USA.ferro, unit: 'mg', rFn: rIron },
        { label: 'Potassium', shortLabel: 'Potas.', val: d.potassio, dv: DV_USA.potassio, unit: 'mg', rFn: rMg },
    ];
}

const FOOTNOTE = '*The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.';

// ════════════════════════════════════════════════════════════════════════════════
// VERTICALE
// ════════════════════════════════════════════════════════════════════════════════
function VertLayout({ d, si, addedSugarsG, addedSugarsPct, rows, vitamins }:
    { d: CalcResult; si: ServingInfo; addedSugarsG: number; addedSugarsPct: number; rows: NRow[]; vitamins: VitRow[] }) {
    const F = 'Arial, Helvetica, sans-serif';
    return (
        <div style={{ width: 300, border: '3px solid #000', padding: '8px 8px 6px 8px', fontFamily: F }}>
            {/* Title */}
            <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.5px', whiteSpace: 'nowrap', borderBottom: '1px solid #000', WebkitTextStroke: '0.5px black' }}>Nutrition Facts</div>

            {/* Servings per container */}
            <div style={{ fontSize: 14, fontWeight: 400, paddingBottom: 2, wordSpacing: '5px' }}>
                {si.servingsPerContainer} servings per container
            </div>

            {/* Serving size — justify distribuisce parole su tutta larghezza */}
            <div style={{ fontSize: 14, fontWeight: 900, WebkitTextStroke: '0.5px black', paddingTop: 2, paddingBottom: 2, textAlign: 'justify', textAlignLast: 'justify' as any, letterSpacing: '0px' }}>
                {si.sizeLabel} {si.sizeValue}
            </div>

            {/* Amount + Calories */}
            <div style={{ borderTop: '8px solid #000', paddingTop: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700 }}>{si.amountLabel}</div>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    borderBottom: '4px solid #000', paddingBottom: 0,
                }}>
                    <span style={{ fontSize: 28, fontWeight: 900, WebkitTextStroke: '0.5px black' }}>Calories</span>
                    <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, WebkitTextStroke: '0.5px black' }}>{rEnergy(d.energyKcal)}</span>
                </div>
            </div>

            {/* % DV header */}
            <div style={{ textAlign: 'right', fontSize: 10, fontStyle: 'italic', fontWeight: 700, borderBottom: '2px solid #000', paddingBottom: 1, marginBottom: 1 }}>
                % Daily Value*
            </div>

            {/* Nutrient rows (Total Fat → Total Sugars) */}
            {rows.map((r, i) => {
                const pct = r.dvRef > 0 ? rPct(roundedVal(r), r.dvRef) : null;
                // Bold rows: name fw800 + value fw400. Non-bold and italic: fw400, same size 14px.
                const labelNode = r.italic
                    ? <span style={{ fontSize: 14, fontWeight: 400 }}><em>Trans</em>{' Fat '}{fmtVal(r)}</span>
                    : r.bold
                        ? <span style={{ fontSize: 14 }}><b style={{ fontWeight: 900, WebkitTextStroke: '0.5px black' }}>{r.label}</b>{' '}<span style={{ fontWeight: 400 }}>{fmtVal(r)}</span></span>
                        : <span style={{ fontSize: 14, fontWeight: 400 }}>{r.label} {fmtVal(r)}</span>;
                const thickBorder = ['Saturated Fat', 'Sodium', 'Dietary Fiber'].includes(r.label);
                const noBottomBorder = r.label === 'Total Sugars';
                return (
                    <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between',
                        borderBottom: noBottomBorder ? 'none' : thickBorder ? '2px solid #000' : '1px solid #000',
                        paddingLeft: [0, 16, 24][r.indent],
                        paddingTop: 1, paddingBottom: 1,
                    }}>
                        {labelNode}
                        {pct !== null
                            ? <span style={{ fontSize: 14, fontWeight: 900, WebkitTextStroke: '0.5px black' }}>{pct}%</span>
                            : <span />}
                    </div>
                );
            })}

            {/* Separatore parziale tra Total Sugars e Includes — parte dalla I di Includes */}
            <div style={{ borderTop: '1px solid #000', marginLeft: 32 }} />

            {/* Added Sugars — indented under Total Sugars */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                borderBottom: '1px solid #000', paddingLeft: 32, fontSize: 14, fontWeight: 400, paddingTop: 1, paddingBottom: 1,
            }}>
                <span>Includes{'\u00A0\u00A0'}{addedSugarsG}g{'\u00A0\u00A0'}Added Sugars</span>
                <span style={{ fontSize: 14, fontWeight: 900, WebkitTextStroke: '0.5px black' }}>{addedSugarsPct}%</span>
            </div>

            {/* Protein — after Added Sugars (FDA order), no bottom border */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                paddingTop: 1, paddingBottom: 1,
            }}>
                <span style={{ fontSize: 14 }}><b style={{ fontWeight: 900, WebkitTextStroke: '0.5px black' }}>Protein</b>{' '}<span style={{ fontWeight: 400 }}>{rG(d.proteine)}g</span></span>
                <span />
            </div>

            {/* Vitamins — separate rows, thick top bar */}
            <div style={{ borderTop: '8px solid #000' }}>
                {vitamins.map((v, i) => (
                    <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between',
                        borderBottom: i < vitamins.length - 1 ? '1px solid #000' : 'none',
                        paddingTop: 1, paddingBottom: 1, fontSize: 14, fontWeight: 400,
                    }}>
                        <span>{v.label}{'\u00A0\u00A0'}{v.rFn(v.val)}{v.unit}</span>
                        <span style={{ fontWeight: 400 }}>{rPct(v.rFn(v.val), v.dv)}%</span>
                    </div>
                ))}
            </div>

            {/* Footnote */}
            <div style={{ fontSize: 11, fontWeight: 400, paddingTop: 4, borderTop: '4px solid #000', lineHeight: 1.3 }}>{FOOTNOTE}</div>
        </div>
    );
}

// ─── NutrRow (used by HorizLayout) ──────────────────────────────────────────
function NutrRow({ r, noBorder }: { r: NRow; noBorder?: boolean }) {
    const pct = r.dvRef > 0 ? rPct(roundedVal(r), r.dvRef) : null;
    const labelNode = r.italic
        ? <><em>Trans</em>{' fat '}{fmtVal(r)}</>
        : r.bold
            ? <><b style={{ fontWeight: 900, WebkitTextStroke: '0.3px black' }}>{r.label}</b>{' '}<span style={{ fontWeight: 400 }}>{fmtVal(r)}</span></>
            : <>{r.label} {fmtVal(r)}</>;
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between',
            paddingLeft: [0, 16, 24][r.indent],
            paddingTop: 1, paddingBottom: 1,
            borderBottom: noBorder ? 'none' : '1px solid #000',
            fontSize: r.bold ? 12 : 11,
            fontWeight: r.bold ? 900 : 400,
        }}>
            <span>{labelNode}</span>
            {pct !== null ? <span style={{ fontWeight: 900, WebkitTextStroke: '0.3px black' }}>{pct}%</span> : <span />}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// ORIZZONTALE
// ════════════════════════════════════════════════════════════════════════════════
function HorizLayout({ d, si, addedSugarsG, addedSugarsPct, rows, vitamins, measure: _measure, servingRef }:
    { d: CalcResult; si: ServingInfo; addedSugarsG: number; addedSugarsPct: number; rows: NRow[]; vitamins: VitRow[]; measure: USAMeasure; servingRef: USAServingRef }) {
    const F = 'Arial, Helvetica, sans-serif';
    const perLabel = servingRef === 'confezione' ? 'per container' : 'per serving';

    const leftRows = rows.filter(r =>
        ['Total Fat', 'Saturated Fat', 'Trans Fat', 'Cholesterol', 'Sodium'].includes(r.label)
    );
    const rightRows = rows.filter(r =>
        ['Total Carbohydrate', 'Dietary Fiber', 'Total Sugars'].includes(r.label)
    );
    // Header presente in cima a ogni colonna nutrienti
    const DVHeader = (
        <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 11, fontWeight: 400,
            borderBottom: '4px solid #000',
            paddingBottom: 2, marginBottom: 0,
        }}>
            <span>Amount/serving</span>
            <span>% Daily Value*</span>
        </div>
    );

    // Divide sizeValue in misura (sinistra) e peso (destra) per layout space-between
    const parenIdx = si.sizeValue.indexOf(' (');
    const sizeLeft = parenIdx >= 0 ? si.sizeValue.slice(0, parenIdx) : si.sizeValue;
    const sizeRight = parenIdx >= 0 ? si.sizeValue.slice(parenIdx + 1) : '';

    return (
        <div style={{ border: '2px solid #000', fontFamily: F, width: 740, display: 'flex', paddingTop: 6, paddingBottom: 3 }}>

            {/* ── Col 1: Nutrition Facts + serving size + Calories ── */}
            <div style={{
                padding: '2px 8px',
                width: 160, flexShrink: 0,
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
            }}>
                {/* Sezione superiore: Nutrition Facts + info porzione */}
                <div>
                    <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.0 }}>Nutrition</div>
                    {/* Linea sottile separatrice dopo "Facts" */}
                    <div style={{
                        fontSize: 22, fontWeight: 900, lineHeight: 1.0,
                        borderBottom: '1px solid #000', paddingBottom: 1, marginBottom: 1,
                    }}>Facts</div>
                    <div style={{ fontSize: 11, marginBottom: 1, wordSpacing: '4px' }}>
                        {si.servingsPerContainer} servings per container
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 900, WebkitTextStroke: '0.3px black' }}>{si.sizeLabel}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 900, WebkitTextStroke: '0.3px black' }}>
                        <span>{sizeLeft}</span>
                        {sizeRight && <span>{sizeRight}</span>}
                    </div>
                </div>
                {/* Sezione inferiore: Calories */}
                <div style={{
                    borderTop: '1px solid #000',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: 2, paddingBottom: 2, marginTop: 4,
                }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.1 }}>Calories</div>
                        <div style={{ fontSize: 11, lineHeight: 1.1 }}>{perLabel}</div>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>{rEnergy(d.energyKcal)}</div>
                </div>
            </div>

            {/* ── Sezione centrale: nutrienti + Col 4 ── */}
            <div style={{ display: 'flex', flex: 1 }}>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                    {/* Riga nutrienti: Col 2 + Col 3 */}
                    <div style={{ display: 'flex' }}>

                        {/* Col 2: grassi, colesterolo, sodio */}
                        <div style={{ flex: 1, padding: '2px 8px 2px 8px', display: 'flex', flexDirection: 'column' }}>
                            {DVHeader}
                            {leftRows.map((r, i) => (
                                <NutrRow key={i} r={r} noBorder={i === leftRows.length - 1} />
                            ))}
                        </div>

                        {/* Col 3: carboidrati, fibre, zuccheri, proteine */}
                        <div style={{ flex: 1, padding: '2px 8px 2px 8px', display: 'flex', flexDirection: 'column' }}>
                            {DVHeader}
                            {rightRows.map((r, i) => (
                                <NutrRow key={i} r={r} noBorder={i === rightRows.length - 1} />
                            ))}
                            {/* Separatore parziale — parte dalla I di Includes */}
                            <div style={{ borderTop: '1px solid #000', marginLeft: 24 }} />
                            {/* Includes Added Sugars */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                padding: '1px 0 1px 24px', fontSize: 11,
                                borderBottom: '1px solid #000',
                            }}>
                                <span>Includes{'\u00A0\u00A0\u00A0'}{addedSugarsG}g{'\u00A0\u00A0\u00A0'}Added Sugars</span>
                                <span style={{ fontWeight: 900, WebkitTextStroke: '0.3px black' }}>{addedSugarsPct}%</span>
                            </div>
                            {/* Protein */}
                            <div style={{ fontSize: 12, paddingTop: 1, paddingBottom: 1 }}>
                                <b style={{ fontWeight: 900, WebkitTextStroke: '0.3px black' }}>Protein</b>{' '}
                                <span style={{ fontWeight: 400 }}>{fmtVal({ label: 'Protein', val: d.proteine, dvRef: 0, unit: 'g', bold: true, indent: 0 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Vitamine — due linee separate (come DVHeader) + testo unico */}
                    <div style={{ display: 'flex', marginTop: 0 }}>
                        <div style={{ flex: 1, borderTop: '4px solid #000', margin: '0 8px' }} />
                        <div style={{ flex: 1, borderTop: '4px solid #000', margin: '0 8px' }} />
                    </div>
                    <div style={{ padding: '2px 8px', fontSize: 11 }}>
                        {vitamins.map((v, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <span>{' \u2022 '}</span>}
                                <span>{v.label} {v.rFn(v.val)}{v.unit} {rPct(v.rFn(v.val), v.dv)}%</span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Col 4: Note a piè (piena altezza) */}
                <div style={{
                    width: 110, flexShrink: 0,
                    padding: '4px 4px', fontSize: 11, fontWeight: 400, lineHeight: 1.0,
                    letterSpacing: '0px', wordSpacing: '2px', textAlign: 'left',
                }}>
                    {FOOTNOTE}
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════════
// LINEARE
// ════════════════════════════════════════════════════════════════════════════════
function LinearLayout({ d, si, addedSugarsG, addedSugarsPct, vitamins }:
    { d: CalcResult; si: ServingInfo; addedSugarsG: number; addedSugarsPct: number; vitamins: VitRow[] }) {
    const F = 'Arial, Helvetica, sans-serif';
    const kcal = rEnergy(d.energyKcal);

    // Split "0,5 cup (120g)" → left: "0,5 cup", right: "(120g)"
    const parenIdx = si.sizeValue.indexOf(' (');
    const sizeLeft = parenIdx >= 0 ? si.sizeValue.slice(0, parenIdx) : si.sizeValue;
    const sizeRight = parenIdx >= 0 ? si.sizeValue.slice(parenIdx + 1) : '';

    // %DV with space after opening paren: "( 11% DV)"
    function pdv(val: number, dvRef: number): string {
        return `( ${rPct(val, dvRef)}% DV)`;
    }

    return (
        <div style={{
            border: '2px solid #000', padding: '5px 8px',
            fontFamily: F, fontSize: 12,
            display: 'inline-block',
            lineHeight: 1.25,
            letterSpacing: '0.3px', wordSpacing: '3px',
            boxSizing: 'border-box' as const,
        }}>
            {/* Line 1: Nutrition Facts … Serv.size … (120g) — stesso fontSize, occupa tutta la larghezza */}
            <div style={{ fontSize: 15, wordSpacing: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>
                    <b style={{ fontSize: 17, fontWeight: 900, WebkitTextStroke: '0.3px black' }}>Nutrition Facts</b>
                    {' '}Servings: {si.servingsPerContainer},{' '}
                    <b style={{ fontWeight: 900, WebkitTextStroke: '0.3px black' }}>{si.sizeLabel === 'container' ? 'container' : 'Serv.size'} {sizeLeft}</b>
                </span>
                {sizeRight && <b style={{ fontWeight: 900, WebkitTextStroke: '0.3px black', marginRight: 12 }}>{sizeRight},</b>}
            </div>
            {/* Line 2: Amount per Serving + Calories (moderately larger) + Total Fat + Sat.Fat */}
            <div>
                {'\u2002'}Amount per Serving:{' '}
                <b style={{ fontSize: 17, fontWeight: 900, WebkitTextStroke: '0.3px black' }}>Calories</b>{' '}
                <b style={{ fontSize: 17, fontWeight: 900, WebkitTextStroke: '0.3px black' }}>{kcal},</b>{'  '}
                <b style={{ fontWeight: 900, WebkitTextStroke: '0.3px black' }}>Total Fat</b>{'  '}{rG(d.grassi)}g{' '}{pdv(rG(d.grassi), DV_USA.grassi)},{'  '}
                Sat.Fat{'  '}{rG(d.saturi)}g{' '}{pdv(rG(d.saturi), DV_USA.saturi)},
            </div>
            {/* Line 3: Trans Fat + Cholest. + Sodium + Total Carb. */}
            <div>
                <em>Trans</em> Fat{'  '}{rG(d.trans)}g,{'  '}
                <b style={{ fontWeight: 900, WebkitTextStroke: '0.3px black' }}>Cholest.</b>{' '}{rMg(d.colesterolo)}mg{' '}{pdv(rMg(d.colesterolo), DV_USA.colesterolo)},{' '}
                <b style={{ fontWeight: 900, WebkitTextStroke: '0.3px black' }}>Sodium</b>{' '}{rMg(d.sodio_mg)}mg{' '}{pdv(rMg(d.sodio_mg), DV_USA.sodio_mg)},{' '}
                <b style={{ fontWeight: 900, WebkitTextStroke: '0.3px black' }}>Total Carb.</b>{' '}{rG(d.carboidratiTot)}g{' '}{pdv(rG(d.carboidratiTot), DV_USA.carboidratiTot)},
            </div>
            {/* Line 4: Fiber + Total Sugars + Protein */}
            <div>
                {'  '}Fiber{'  '}{rG(d.fibre)}g{'  '}{pdv(rG(d.fibre), DV_USA.fibre)},{'  '}
                Total Sugars{'  '}{rG(d.zuccheri)}g{'  '}
                (Incl.{'  '}{addedSugarsG}g{'  '}Added Sugars,{'  '}{addedSugarsPct}% DV),{'  '}
                <b style={{ fontWeight: 900, WebkitTextStroke: '0.3px black' }}>Protein</b>{'  '}{rG(d.proteine)}g,
            </div>
            {/* Line 5: vitamins — indented, separated by comma */}
            <div style={{ paddingLeft: 52 }}>
                {vitamins.map((v, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <span>{'    '}</span>}
                        <span>{v.shortLabel}{'  '}( {rPct(v.rFn(v.val), v.dv)}% DV)</span>
                        {i < vitamins.length - 1 ? <span>,</span> : <span>.</span>}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export function TabUSA({ p, usa, specificGravity, servingRef, measure, subTab }: TabUSAProps) {
    const unit = specificGravity > 0 ? 'ml' : 'g';
    const si: ServingInfo & { servingRef: USAServingRef } = {
        ...buildServingInfo(usa, servingRef, measure, unit),
        servingRef,
    };

    const d = si.refGrams > 0 ? scaleResult(p, si.refGrams) : p;
    const rows = buildRows(d);
    const vitamins = buildVitamins(d);
    const addedSugarsG = rG(d.zuccheri_agg);
    const addedSugarsPct = rPct(addedSugarsG, DV_USA.zuccheri_agg);

    const common = { d, si, addedSugarsG, addedSugarsPct, rows, vitamins };

    return (
        <div data-table-export style={{ background: 'white', padding: 12, display: 'inline-block' }}>
            {subTab === 'verticale' && <VertLayout {...common} />}
            {subTab === 'orizzontale' && <HorizLayout {...common} measure={measure} servingRef={servingRef} />}
            {subTab === 'lineare' && <LinearLayout {...{ d, si, addedSugarsG, addedSugarsPct, vitamins }} />}
        </div>
    );
}
