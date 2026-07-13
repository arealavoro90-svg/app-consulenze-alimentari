import { rCA_energy, rCA_fat, rCA_carb, rCA_chol, rCA_na, rCA_iron, rCA_pct } from '../../utils/nutritionalRounding';

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
export type SubTab = 'verticale' | 'orizzontale' | 'lineare';

// ─── DV Canada ────────────────────────────────────────────────────────────────
const DV_CA = {
    energyKcal: 2000, grassi: 78, satTrans: 20, carboidratiTot: 275, fibre: 25,
    zuccheri: 100, proteine: 50, sodio_mg: 2300, potassio: 4700, calcio: 1300, ferro: 18,
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

// ─── Props ────────────────────────────────────────────────────────────────────
interface TabCanadaProps {
    p: CalcResult;
    ca: ServingSizesNation;
    servingRef: USAServingRef;
    measure: USAMeasure;
    subTab: SubTab;
    setSubTab: (t: SubTab) => void;
    full?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TabCanada({ p, ca, servingRef, measure, subTab, setSubTab, full }: TabCanadaProps) {
    const refGrams = servingRef === 'confezione' ? (ca.confezione ?? 0) : (ca.serving ?? 0);
    const svG = refGrams;
    const sv = svG > 0 ? scaleResult(p, svG) : null;
    const d = sv || p;
    const satTrans = d.saturi + d.trans;

    const caUnitSize = measure === 'tazze' ? (ca.cup ?? 250) : measure === 'cucchiai' ? (ca.cucchiaio ?? 15) : (ca.pezzo ?? (svG || 1));
    const caQty = svG > 0 ? (svG / caUnitSize).toFixed(1).replace('.', ',') : '0';
    const caEnUnit = measure === 'tazze' ? 'cup' : measure === 'cucchiai' ? 'tablespoon' : 'pieces';
    const caFrUnit = measure === 'tazze' ? 'tasses' : measure === 'cucchiai' ? 'cuillerée' : 'morceaux';
    const caServN = (ca.serving && ca.serving > 0 && svG > 0) ? Math.round(svG / ca.serving) : 0;

    let caEnLeft: string, caEnRight: string, caFrLeft: string, caFrRight: string;
    if (measure === 'g') {
        if (servingRef === 'confezione' && caServN > 0) {
            caEnLeft = `Per ${caServN} serving`; caEnRight = `(1 container ${svG} g)`;
            caFrLeft = `pour ${caServN} partie`; caFrRight = `(1 emballage ${svG} g)`;
        } else {
            caEnLeft = `Per ${svG}g`; caEnRight = '';
            caFrLeft = `pour ${svG}g`; caFrRight = '';
        }
    } else {
        caEnLeft = `Per ${caQty} ${caEnUnit}`;
        caEnRight = `(${servingRef === 'serving' ? '1 serving' : '1 container'} ${svG} g)`;
        caFrLeft = `pour ${caQty} ${caFrUnit}`;
        caFrRight = `(${servingRef === 'serving' ? '1 partie' : '1 emballage'} ${svG} g)`;
    }

    const caLinearServing = (() => {
        if (!svG) return '';
        if (measure === 'g') {
            if (servingRef === 'confezione' && caServN > 0) return `Per ${caServN} serving  (1 container ${svG} g)`;
            return `Per ${svG}g`;
        }
        const ref = servingRef === 'serving' ? `1 serving ${svG} g` : `1 container ${svG} g`;
        return `Per ${caQty} ${caEnUnit}  (${ref})`;
    })();

    return (
        <div style={{ background: 'white' }}>
            {!full && (
                <>
                    <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>Etichetta Nutrizionale (Canada)</h3>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        {(['verticale', 'orizzontale', 'lineare'] as SubTab[]).map(t => (
                            <button key={t} onClick={() => setSubTab(t)}
                                style={{
                                    fontSize: 11, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                                    background: subTab === t ? 'var(--color-orange, #ff7e2e)' : 'transparent',
                                    color: subTab === t ? 'white' : 'inherit',
                                    border: '1px solid var(--color-orange, #ff7e2e)',
                                }}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                </>
            )}
            <div data-table-export style={{ background: 'white', padding: 12, borderRadius: 0, display: 'inline-block' }}>
                {subTab === 'verticale' && (() => {
                    const F = 'Arial, Helvetica, sans-serif';           // normal width
                    const Fc = '"Arial Narrow", Arial, sans-serif';     // condensed — footnote only
                    const R = (
                        label: string, val: string, pct: string | null,
                        indent: boolean, bold: boolean,
                        thick?: boolean, noBorder?: boolean
                    ) => (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            borderBottom: noBorder ? 'none' : thick ? '3px solid #000' : '1px solid #bbb',
                            paddingLeft: indent ? 14 : 0,
                            paddingTop: 1, paddingBottom: 1,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, flex: 1 }}>
                                <span style={{ fontFamily: F, fontSize: 11, fontWeight: bold ? 700 : 400 }}>{label}</span>
                                <span style={{ fontFamily: F, fontSize: 11, fontWeight: 400 }}>{val}</span>
                            </div>
                            {pct !== null
                                ? <span style={{ fontFamily: F, fontSize: 11, fontWeight: 400, minWidth: 22, textAlign: 'right' }}>{pct}%</span>
                                : null}
                        </div>
                    );
                    return (
                        <div style={{ width: 280, border: '2px solid #000', padding: '4px 8px 6px 8px', fontFamily: F, backgroundColor: '#fff', color: '#000', boxSizing: 'border-box' as const }}>
                            {/* TITLE — 13pt bold */}
                            <div style={{ lineHeight: 1.1 }}>
                                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F }}>Nutrition Facts</div>
                                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F }}>Valeur nutritive</div>
                            </div>
                            {/* SERVING — 9pt normal */}
                            <div style={{ fontSize: 12, fontFamily: F, fontWeight: 400, borderBottom: '5px solid #000', paddingTop: 2, paddingBottom: 2 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{caEnLeft}</span>
                                    {caEnRight ? <span>{caEnRight}</span> : null}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{caFrLeft}</span>
                                    {caFrRight ? <span>{caFrRight}</span> : null}
                                </div>
                            </div>
                            {/* CALORIES — 10pt bold, thick rule partial */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: F, lineHeight: 1, borderBottom: '3px solid #000', paddingBottom: 3 }}>
                                    Calories {rCA_energy(d.energyKcal)}
                                </span>
                                {/* % Daily Value subtitle — 6pt bold */}
                                <div style={{ textAlign: 'right', fontSize: 8, fontWeight: 700, fontFamily: F, lineHeight: 1.4 }}>
                                    % Daily Value*<br />% valeur quotidienne*
                                </div>
                            </div>
                            {/* NUTRIENTS — 8pt bold/normal */}
                            {R('Fat / Lipides', `${rCA_fat(d.grassi)} g`, rCA_pct(d.grassi, DV_CA.grassi), false, true, false, true)}
                            {R('Saturated / saturés', `${rCA_fat(d.saturi)} g`, null, true, false, false, true)}
                            {R('+ Trans / trans', `${rCA_fat(d.trans)} g`, rCA_pct(satTrans, DV_CA.satTrans), true, false)}
                            {R('Carbohydrate / Glucides', `${rCA_carb(d.carboidratiTot)} g`, null, false, true, false, true)}
                            {R('Fibre / Fibres', `${rCA_carb(d.fibre)} g`, rCA_pct(d.fibre, DV_CA.fibre), true, false, false, true)}
                            {R('Sugars / Sucres', `${rCA_carb(d.zuccheri)} g`, rCA_pct(d.zuccheri, DV_CA.zuccheri), true, false)}
                            {R('Protein / Protéines', `${rCA_carb(d.proteine)} g`, null, false, true)}
                            {R('Cholesterol / Cholestérol', `${rCA_chol(d.colesterolo)} mg`, null, false, true)}
                            {R('Sodium', `${rCA_na(d.sodio_mg)} mg`, rCA_pct(d.sodio_mg, DV_CA.sodio_mg), false, true, true)}
                            {R('Potassium', `${rCA_na(d.potassio)} mg`, rCA_pct(d.potassio, DV_CA.potassio), false, false)}
                            {R('Calcium', `${rCA_na(d.calcio)} mg`, rCA_pct(d.calcio, DV_CA.calcio), false, false)}
                            {R('Iron / Fer', `${rCA_iron(d.ferro)} mg`, rCA_pct(d.ferro, DV_CA.ferro), false, false, true)}
                            {/* FOOTNOTE — 6.5pt condensed */}
                            <div style={{ paddingTop: 2 }}>
                                <div style={{ fontSize: 9, fontFamily: Fc, lineHeight: 1.2 }}>* 5% or less is a <b>little</b>, 15% or more is a <b>lot</b></div>
                                <div style={{ fontSize: 9, fontFamily: Fc, lineHeight: 1.2 }}>* 5% ou moins c'est <b>peu</b>, 15% ou plus c'est <b>beaucoup</b></div>
                            </div>
                        </div>
                    );
                })()}

                {subTab === 'orizzontale' && (() => {
                    const FB = '"Helvetica Neue Condensed Bold", "HelveticaNeue-CondensedBold", "Helvetica Neue", Helvetica, Arial, sans-serif';
                    const FR = '"Helvetica Neue Condensed", "HelveticaNeue-Condensed", "Arial Narrow", Helvetica, Arial, sans-serif';
                    const C2 = (label: string, val: string, pct: string | null, sub: boolean, bold: boolean, rule?: 'thin' | 'thick') => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            borderBottom: rule === 'thick' ? '2pt solid #000' : rule === 'thin' ? '1px solid #888' : 'none',
                            paddingLeft: sub ? 8 : 0,
                            lineHeight: '11pt' }}>
                            <span style={{ fontFamily: bold ? FB : FR, fontSize: 10, fontWeight: bold ? 700 : 400, color: '#000' }}>{label} {val}</span>
                            {pct !== null ? <span style={{ fontFamily: FR, fontSize: 10, fontWeight: 400, color: '#000' }}>{pct} %</span> : null}
                        </div>
                    );
                    const C3 = (label: string, val: string, pct: string | null, bold: boolean, rule?: 'thin' | 'thick') => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            borderBottom: rule === 'thick' ? '2pt solid #000' : rule === 'thin' ? '1px solid #888' : 'none',
                            lineHeight: '11pt' }}>
                            <span style={{ fontFamily: bold ? FB : FR, fontSize: 10, fontWeight: bold ? 700 : 400, color: '#000' }}>{label} {val}</span>
                            {pct !== null ? <span style={{ fontFamily: FR, fontSize: 10, fontWeight: 400, color: '#000' }}>{pct} %</span> : null}
                        </div>
                    );
                    const col1W = 155;
                    const col2W = 175;
                    const col3W = 160;
                    return (
                        <div style={{ border: '1px solid #000', padding: '3pt 3pt 0 3pt', boxSizing: 'content-box', display: 'flex', width: col1W + col2W + col3W + 2, backgroundColor: '#fff', color: '#000' }}>
                            {/* Col 1 — centered group, bounded top=header line, bottom=footnote level */}
                            <div style={{ width: col1W, flexShrink: 0, padding: '1px 6px 3pt 3pt', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FB, lineHeight: 0.9, color: '#000' }}>Nutrition Facts<br />Valeur nutritive</div>
                                <div style={{ marginTop: '5pt', fontSize: '8.5pt', fontFamily: FR, fontWeight: 400, color: '#000', lineHeight: '11pt' }}>
                                    <div style={{ color: '#000', whiteSpace: 'nowrap', overflow: 'hidden' }}>{caEnLeft}{caEnRight ? <span style={{ marginLeft: 4 }}>{caEnRight}</span> : null}</div>
                                    <div style={{ color: '#000', whiteSpace: 'nowrap', overflow: 'hidden' }}>{caFrLeft}{caFrRight ? <span style={{ marginLeft: 4 }}>{caFrRight}</span> : null}</div>
                                </div>
                                <div style={{ marginTop: '3pt', fontSize: '10.5pt', fontWeight: 700, fontFamily: FB, color: '#000', lineHeight: '13pt' }}>Calories {rCA_energy(d.energyKcal)}</div>
                                <div style={{ marginTop: 'auto', fontFamily: FR, fontWeight: 400, color: '#000' }}>
                                    <div style={{ fontSize: '6pt', lineHeight: '7pt' }}>* DV = Daily Value</div>
                                    <div style={{ fontSize: '6pt', lineHeight: '7pt' }}>* VQ = valeur quotidienne</div>
                                </div>
                            </div>
                            {/* Col 2+3 wrapper */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {/* Header: borderBottom su inner div → gap naturale (5+5+4=14px) tra le due linee; col3 right pad 5px → non tocca cornice */}
                                <div style={{ display: 'flex' }}>
                                    <div style={{ width: col2W, flexShrink: 0, padding: '1px 5px 0 5px' }}>
                                        <div style={{ borderBottom: '1px solid #000', paddingBottom: 1, textAlign: 'right', fontSize: 8, fontWeight: 700, fontFamily: FB, color: '#000' }}>% DV* / % VQ*</div>
                                    </div>
                                    <div style={{ width: col3W, flexShrink: 0, padding: '1px 5px 0 5px' }}>
                                        <div style={{ borderBottom: '1px solid #000', paddingBottom: 1, textAlign: 'right', fontSize: 8, fontWeight: 700, fontFamily: FB, color: '#000' }}>% DV* / % VQ*</div>
                                    </div>
                                </div>
                                {/* Content row — col2 and col3 both space-between → bottom thick lines align */}
                                <div style={{ display: 'flex', flex: 1 }}>
                                    <div style={{ width: col2W, flexShrink: 0, padding: '1px 5px 0 5px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        {C2('Fat / Lipides', `${rCA_fat(d.grassi)} g`, rCA_pct(d.grassi, DV_CA.grassi), false, true)}
                                        {/* Sat+Trans: borderBottom su outer wrapper → full col2 width, allineato con header thin e Sugars thick */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #888', paddingBottom: 1 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ paddingLeft: 8, fontSize: 10, fontFamily: FR, fontWeight: 400, color: '#000', lineHeight: '11pt' }}>Saturated / saturés {rCA_fat(d.saturi)} g</div>
                                                <div style={{ paddingLeft: 8, fontSize: 10, fontFamily: FR, fontWeight: 400, color: '#000', lineHeight: '11pt' }}>+ Trans / trans {rCA_fat(d.trans)} g</div>
                                            </div>
                                            <div style={{ fontSize: 10, fontFamily: FR, fontWeight: 400, color: '#000', paddingLeft: 4, flexShrink: 0 }}>{rCA_pct(satTrans, DV_CA.satTrans)} %</div>
                                        </div>
                                        {C2('Carbohydrate / Glucides', `${rCA_carb(d.carboidratiTot)} g`, null, false, true)}
                                        {C2('Fibre / Fibres', `${rCA_carb(d.fibre)} g`, rCA_pct(d.fibre, DV_CA.fibre), true, false)}
                                        {C2('Sugars / Sucres', `${rCA_carb(d.zuccheri)} g`, rCA_pct(d.zuccheri, DV_CA.zuccheri), true, false, 'thick')}
                                    </div>
                                    <div style={{ width: col3W, flexShrink: 0, padding: '1px 5px 0 5px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        {C3('Protein / Protéines', `${rCA_carb(d.proteine)} g`, null, true, 'thin')}
                                        {C3('Cholesterol / Cholestérol', `${rCA_chol(d.colesterolo)} mg`, null, true, 'thin')}
                                        {C3('Sodium', `${rCA_na(d.sodio_mg)} mg`, rCA_pct(d.sodio_mg, DV_CA.sodio_mg), true, 'thick')}
                                        {C3('Potassium', `${rCA_na(d.potassio)} mg`, rCA_pct(d.potassio, DV_CA.potassio), false)}
                                        {C3('Calcium', `${rCA_na(d.calcio)} mg`, rCA_pct(d.calcio, DV_CA.calcio), false)}
                                        {C3('Iron / Fer', `${rCA_iron(d.ferro)} mg`, rCA_pct(d.ferro, DV_CA.ferro), false, 'thick')}
                                    </div>
                                </div>
                                {/* Footnote — 6pt regular, 12pt leading; "a little" "a lot" "peu" "beaucoup" bold; spans col2 left to col3 right (aligns with thick rules) */}
                                <div style={{ padding: '1px 5px 0 5px', fontSize: '6pt', lineHeight: '12pt', fontFamily: FR, fontWeight: 400, color: '#000', textAlign: 'justify', textAlignLast: 'justify' }}>
                                    * 5% or less is <span style={{ fontFamily: FB, fontWeight: 700 }}>a little</span>, 15% or more is <span style={{ fontFamily: FB, fontWeight: 700 }}>a lot</span> / * 5% ou moins c'est <span style={{ fontFamily: FB, fontWeight: 700 }}>peu</span>, 15% ou plus c'est <span style={{ fontFamily: FB, fontWeight: 700 }}>beaucoup</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {subTab === 'lineare' && (() => {
                    const F = 'Arial, Helvetica, sans-serif';
                    const pctCA = (v: number, dv: number) => `(${Math.round(v / dv * 100)} %)`;
                    const B = (text: string) => <span style={{ fontWeight: 700 }}>{text}</span>;
                    return (
                        <div style={{ border: '0.5pt solid #000', padding: '4px', fontFamily: F, fontSize: '7pt', display: 'inline-block', backgroundColor: '#fff', color: '#000', boxSizing: 'content-box' as const }}>
                            {/* Line 1: Heading · Serving · Calories */}
                            <div style={{ whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: '10pt', fontWeight: 700 }}>Nutrition Facts</span>
                                {caLinearServing ? <span style={{ fontSize: '7.5pt', fontWeight: 400 }}>{' '}{caLinearServing}</span> : null}
                                {' :'}
                                <span style={{ fontSize: '8pt', fontWeight: 700 }}>{' '}Calories{' '}{rCA_energy(d.energyKcal)}</span>
                            </div>
                            {/* Line 2: Fat → Cholesterol */}
                            <div style={{ whiteSpace: 'nowrap' }}>
                                {B('Fat')}{' '}{rCA_fat(d.grassi)} g{' '}{pctCA(d.grassi, DV_CA.grassi)},{' '}
                                {B('Saturated Fat')}{' '}{rCA_fat(d.saturi)} g + {B('Trans')}{' '}{rCA_fat(d.trans)} g{' '}{pctCA(satTrans, DV_CA.satTrans)},{' '}
                                {B('Cholesterol')}{' '}{rCA_chol(d.colesterolo)} mg
                            </div>
                            {/* Line 3: Carbohydrate → Sodium */}
                            <div style={{ whiteSpace: 'nowrap' }}>
                                {B('Carbohydrate')}{' '}{rCA_carb(d.carboidratiTot)} g,{' '}
                                {B('Fibre')}{' '}{rCA_carb(d.fibre)} g{' '}{pctCA(d.fibre, DV_CA.fibre)},{' '}
                                {B('Sugars')}{' '}{rCA_carb(d.zuccheri)} g{' '}{pctCA(d.zuccheri, DV_CA.zuccheri)},{' '}
                                {B('Protein')}{' '}{rCA_carb(d.proteine)} g,{' '}
                                {B('Sodium')}{' '}{rCA_na(d.sodio_mg)} mg{' '}{pctCA(d.sodio_mg, DV_CA.sodio_mg)}
                            </div>
                            {/* Line 4: Potassium → Iron */}
                            <div style={{ whiteSpace: 'nowrap' }}>
                                {B('Potassium')}{' '}{rCA_na(d.potassio)} mg{' '}{pctCA(d.potassio, DV_CA.potassio)},{' '}
                                {B('Calcium')}{' '}{rCA_na(d.calcio)} mg{' '}{pctCA(d.calcio, DV_CA.calcio)},{' '}
                                {B('Iron')}{' '}{rCA_iron(d.ferro)} mg{' '}{pctCA(d.ferro, DV_CA.ferro)}
                            </div>
                            {/* Line 5: Legend (left) · Footnote (right) */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 2, whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: '6pt', fontWeight: 400 }}>
                                    % = % Daily Value<span style={{ fontSize: '9pt', position: 'relative', top: '2pt' }}>*</span>
                                </span>
                                <span style={{ fontSize: '6pt', fontWeight: 400 }}>
                                    <span style={{ fontSize: '9pt', position: 'relative', top: '2pt' }}>*</span>5% or less is <span style={{ fontWeight: 700 }}>a little</span>, 15% or more is <span style={{ fontWeight: 700 }}>a lot</span>
                                </span>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
