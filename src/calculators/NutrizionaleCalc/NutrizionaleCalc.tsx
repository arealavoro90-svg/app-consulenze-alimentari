import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useArchive } from '../../hooks/useArchive';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ValidationError } from '../../components/ValidationError';
import { generateEtichettaPDF } from '../../utils/pdfGenerator';
import {
    validatePositiveNumber,
    validatePercentage,
    validateFinishedWeight,
    validateIngredientQuantity,
    validatePieces,
} from '../../utils/validation';
// import DB_RAW from '../../data/ingredientsDB.json'; // Removed static import for Part 5d


// ─── DB Types ─────────────────────────────────────────────────────────────────
interface DBIngredient {
    nome: string; etichetta: string;
    kcal: number; kj: number; acqua?: number;
    grassi: number; saturi: number; monoins?: number; polins?: number;
    trans?: number; colesterolo?: number;
    carboidrati: number; zuccheri: number; zuccheri_agg?: number;
    polioli?: number; amido?: number; fibre?: number;
    proteine: number; sodio_mg: number;
    potassio?: number; calcio?: number; fosforo?: number;
    magnesio?: number; ferro?: number; zinco?: number;
    vitA_eq?: number; vitD?: number; vitE?: number; vitC?: number;
    vitB1?: number; vitB2?: number; vitB3?: number;
    vitB6?: number; vitB9?: number; vitB12?: number;
    alcol?: number; eur_kg?: number;
    categoria?: string;
    all_glutine?: string; all_grano?: string; all_crostacei?: string;
    all_uova?: string; all_pesci?: string; all_arachidi?: string;
    all_soia?: string; all_latte?: string; all_frutta_guscio?: string;
    all_anacardi?: string; all_sedano?: string; all_senape?: string; all_sesamo?: string;
    all_solfiti?: string; all_lupini?: string; all_molluschi?: string;
    cross_glutine?: string; cross_grano?: string; cross_crostacei?: string;
    cross_uova?: string; cross_pesci?: string; cross_arachidi?: string;
    cross_soia?: string; cross_latte?: string; cross_frutta_guscio?: string;
    cross_anacardi?: string; cross_sedano?: string; cross_senape?: string; cross_sesamo?: string;
    cross_solfiti?: string; cross_lupini?: string; cross_molluschi?: string;
}
// const DB = DB_RAW as unknown as DBIngredient[]; // Replaced with fetch state


// ─── Allergen config ──────────────────────────────────────────────────────────
const ALLERGEN_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'all_glutine', label: 'GLUTINE' }, { key: 'all_grano', label: 'GRANO' },
    { key: 'all_crostacei', label: 'CROSTACEI' }, { key: 'all_uova', label: 'UOVA' },
    { key: 'all_pesci', label: 'PESCE' }, { key: 'all_arachidi', label: 'ARACHIDI' },
    { key: 'all_soia', label: 'SOIA' }, { key: 'all_latte', label: 'LATTE' },
    { key: 'all_frutta_guscio', label: 'FRUTTA A GUSCIO' },
    { key: 'all_anacardi', label: 'ANACARDI' },
    { key: 'all_solfiti', label: 'SOLFITI (>10 ppm)' }, { key: 'all_lupini', label: 'LUPINI' },
    { key: 'all_molluschi', label: 'MOLLUSCHI' },
];
const CROSS_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'cross_glutine', label: 'GLUTINE' }, { key: 'cross_grano', label: 'GRANO' },
    { key: 'cross_crostacei', label: 'CROSTACEI' }, { key: 'cross_uova', label: 'UOVA' },
    { key: 'cross_pesci', label: 'PESCE' }, { key: 'cross_arachidi', label: 'ARACHIDI' },
    { key: 'cross_soia', label: 'SOIA' }, { key: 'cross_latte', label: 'LATTE' },
    { key: 'cross_frutta_guscio', label: 'FRUTTA A GUSCIO' },
    { key: 'cross_anacardi', label: 'ANACARDI' },
    { key: 'cross_sedano', label: 'SEDANO' }, { key: 'cross_senape', label: 'SENAPE' },
    { key: 'cross_sesamo', label: 'SESAMO' }, { key: 'cross_solfiti', label: 'SOLFITI' },
    { key: 'cross_lupini', label: 'LUPINI' }, { key: 'cross_molluschi', label: 'MOLLUSCHI' },
];

// ─── DV / AR References ───────────────────────────────────────────────────────
const AR_UE = {
    energyKj: 8400, energyKcal: 2000, grassi: 70, saturi: 20, carboidrati: 260,
    zuccheri: 90, fibre: 25, proteine: 50, sale: 6, potassio: 2000, calcio: 800,
    fosforo: 700, magnesio: 375, ferro: 14, zinco: 10, vitC: 80, vitB1: 1.1,
    vitB2: 1.4, vitB3: 16, vitB6: 1.4, vitB9: 200, vitB12: 2.4, vitA_eq: 800, vitD: 5, vitE: 12,
};
const DV_USA = {
    energyKcal: 2000, grassi: 78, saturi: 20, carboidratiTot: 275, fibre: 28,
    zuccheri_agg: 50, proteine: 50, sodio_mg: 2300, colesterolo: 300,
    potassio: 4700, calcio: 1300, ferro: 18, vitD: 20,
};
const DV_CA = {
    energyKcal: 2000, grassi: 78, satTrans: 20, carboidratiTot: 275, fibre: 25,
    zuccheri: 100, proteine: 50, sodio_mg: 2300, potassio: 4700, calcio: 1300, ferro: 18,
};
const DV_AU = {
    energyKj: 8700, energyKcal: 2049, grassi: 70, saturi: 24, carboidrati: 310,
    zuccheri: 90, fibre: 30, proteine: 50, sodio_mg: 2300,
};
const AR_ARABI = {
    energyKj: 8400, energyKcal: 2000, grassi: 70, saturi: 20, carboidrati: 260,
    fibre: 28, proteine: 50, sodio_mg: 2400, potassio: 2000, calcio: 1000,
    fosforo: 700, magnesio: 310, ferro: 22, zinco: 14, vitC: 100, vitB1: 1.2,
    vitB2: 1.2, vitB3: 15, vitB6: 1.3, vitB9: 400, vitB12: 2.4, vitA_eq: 800,
};

// ─── Calc result ──────────────────────────────────────────────────────────────
interface CalcResult {
    energyKcal: number; energyKj: number; grassi: number; saturi: number;
    monoins: number; polins: number; trans: number; colesterolo: number;
    carboidrati: number; carboidratiTot: number; zuccheri: number;
    zuccheri_agg: number; polioli: number; amido: number; fibre: number;
    proteine: number; sodio_mg: number; sale: number; potassio: number;
    calcio: number; fosforo: number; magnesio: number; ferro: number;
    zinco: number; vitA_eq: number; vitD: number; vitE: number; vitC: number;
    vitB1: number; vitB2: number; vitB3: number; vitB6: number; vitB9: number; vitB12: number;
}
const ZERO_CALC: CalcResult = {
    energyKcal: 0, energyKj: 0, grassi: 0, saturi: 0, monoins: 0, polins: 0,
    trans: 0, colesterolo: 0, carboidrati: 0, carboidratiTot: 0, zuccheri: 0,
    zuccheri_agg: 0, polioli: 0, amido: 0, fibre: 0, proteine: 0, sodio_mg: 0,
    sale: 0, potassio: 0, calcio: 0, fosforo: 0, magnesio: 0, ferro: 0, zinco: 0,
    vitA_eq: 0, vitD: 0, vitE: 0, vitC: 0, vitB1: 0, vitB2: 0, vitB3: 0, vitB6: 0,
    vitB9: 0, vitB12: 0,
};

// ─── State types ──────────────────────────────────────────────────────────────
interface RecipeRow { id: string; ing: DBIngredient; grams: number; eurKg: number; resa: number; }
interface Component {
    id: string; name: string; rows: RecipeRow[]; pzUV: number;
}
interface ServingSizesNation {
    cup?: number; cucchiaio?: number; serving?: number; confezione?: number; pezzo?: number;
}
interface UEServing { porzione?: number; confezione?: number; pezzo?: number; }
interface ArchiveData {
    nome_prodotto: string;
    componenti: { nome: string; pz_uv: number; ingredienti: { nome: string; grammi: number }[] }[];
    additivi: string[];
    peso_finito_pz: number;
    serving_sizes: {
        UE: UEServing;
        USA: ServingSizesNation;
        Canada: ServingSizesNation;
        Australia: ServingSizesNation;
        Arabi: ServingSizesNation;
    };
}

type NationTab = 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';
type SubTab = 'verticale' | 'orizzontale' | 'lineare';

// ─── Rounding helpers ─────────────────────────────────────────────────────────
// UE
const fUE = (v: string | number) => v.toString().replace('.', ',');
function rUE_energy(v: number): string { return Math.round(v).toString(); }
function rUE_macro(v: number): string {
    // EU Reg. 1169/2011, Allegato XV: < 0.5g → "0"; < 10g → 1 decimal; ≥ 10g → whole number
    // Applied to: grassi, carboidrati, zuccheri, proteine, fibre, polioli
    if (v < 0.5) return '0';
    if (v < 10) return fUE(v.toFixed(1));
    return Math.round(v).toString();
}
// Special rule for carbs mentioned in prompt: "se >= 5g e < 10g -> senza decimali; se tra 0,5g e 5g -> 1 decimale". 
// Wait, the prompt verify section says EXACTLY "Carboidrati: 5,3 g", which contradicts the text above it. I will use the standard macro rule to get 5.3g.
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// USA
function rUSA_energy(v: number): number {
    if (v < 5) return 0;
    if (v <= 50) return Math.round(v / 5) * 5;
    return Math.round(v / 10) * 10;
}
function rUSA_g(v: number): string { return v < 0.5 ? '0' : Math.round(v).toString(); }
function rUSA_mg5(v: number): string { return v < 5 ? '0' : (Math.round(v / 5) * 5).toString(); }
function rUSA_pct(v: number, dv: number): string { return Math.round(v / dv * 100).toString(); }

// Canada
function rCA_energy(v: number): string { return v < 5 ? '0' : Math.round(v).toString(); }
function rCA_fat(v: number): string {
    if (v < 0.5) return '0';
    if (v <= 5) return v.toFixed(1);
    return Math.round(v).toString();
}
function rCA_carb(v: number): string { return v < 0.5 ? '0' : Math.round(v).toString(); }
function rCA_chol(v: number): string { return v < 2 ? '0' : Math.round(v).toString(); }
function rCA_na(v: number): string { return v < 5 ? '0' : Math.round(v).toString(); }
function rCA_iron(v: number): string { return v < 0.05 ? '0' : v.toFixed(1); }
function rCA_pct(v: number, dv: number): string { return Math.round(v / dv * 100).toString(); }

// Australia
function rAU_kj(v: number): string { return v < 40 ? 'less than 40' : Math.round(v).toString(); }
function rAU_kcal(v: number): string { return v < 9.5 ? 'less than 9.5' : Math.round(v).toString(); }
function rAU_g1(v: number): string { return v < 1 ? 'less than 1' : v.toFixed(1); }
function rAU_mg(v: number): string { return v < 5 ? 'less than 5' : Math.round(v).toString(); }

// Arabi
function rArabi_energy(v: number): string { return Math.round(v).toString(); }
function rArabi_g(v: number): string { return v < 0.1 ? '0' : v.toFixed(1); }
function rArabi_mg(v: number): string { return Math.round(v).toString(); }

// ─── Calculation engine ───────────────────────────────────────────────────────
function n(v: unknown): number { const num = Number(v); return isNaN(num) ? 0 : num; }

function calcNutrients(components: Component[], pesoFinitoVal: number): CalcResult {
    let peso_totale_pz = 0;
    const g_per_pz_list: { ing: DBIngredient; g: number }[] = [];

    for (const c of components) {
        const pzUV = c.pzUV || 1;
        for (const r of c.rows) {
            const g = r.grams / pzUV;
            peso_totale_pz += g;
            g_per_pz_list.push({ ing: r.ing, g });
        }
    }

    const pf_pz = pesoFinitoVal > 0 ? pesoFinitoVal : peso_totale_pz;
    if (pf_pz === 0) return { ...ZERO_CALC };

    const sum = { ...ZERO_CALC };
    for (const item of g_per_pz_list) {
        const f = item.g / 100;
        sum.energyKcal += n(item.ing.kcal) * f;
        sum.energyKj += n(item.ing.kj) * f;
        sum.grassi += n(item.ing.grassi) * f;
        sum.saturi += n(item.ing.saturi) * f;
        sum.monoins += n(item.ing.monoins) * f;
        sum.polins += n(item.ing.polins) * f;
        sum.trans += n(item.ing.trans) * f;
        sum.colesterolo += n(item.ing.colesterolo) * f;
        sum.carboidrati += n(item.ing.carboidrati) * f;
        sum.zuccheri += n(item.ing.zuccheri) * f;
        sum.zuccheri_agg += n(item.ing.zuccheri_agg) * f;
        sum.polioli += n(item.ing.polioli) * f;
        sum.amido += n(item.ing.amido) * f;
        sum.fibre += n(item.ing.fibre) * f;
        sum.proteine += n(item.ing.proteine) * f;
        sum.sodio_mg += n(item.ing.sodio_mg) * f;
        sum.potassio += n(item.ing.potassio) * f;
        sum.calcio += n(item.ing.calcio) * f;
        sum.fosforo += n(item.ing.fosforo) * f;
        sum.magnesio += n(item.ing.magnesio) * f;
        sum.ferro += n(item.ing.ferro) * f;
        sum.zinco += n(item.ing.zinco) * f;
        sum.vitA_eq += n(item.ing.vitA_eq) * f;
        sum.vitD += n(item.ing.vitD) * f;
        sum.vitE += n(item.ing.vitE) * f;
        sum.vitC += n(item.ing.vitC) * f;
        sum.vitB1 += n(item.ing.vitB1) * f;
        sum.vitB2 += n(item.ing.vitB2) * f;
        sum.vitB3 += n(item.ing.vitB3) * f;
        sum.vitB6 += n(item.ing.vitB6) * f;
        sum.vitB9 += n(item.ing.vitB9) * f;
        sum.vitB12 += n(item.ing.vitB12) * f;
    }

    const factor = 100 / pf_pz;
    const r: CalcResult = { ...ZERO_CALC };
    for (const k of Object.keys(sum) as (keyof CalcResult)[]) {
        (r as unknown as Record<string, number>)[k] = (sum as unknown as Record<string, number>)[k] * factor;
    }
    r.sale = r.sodio_mg / 1000 * 2.5;
    r.carboidratiTot = r.carboidrati + r.fibre;
    return r;
}

function scaleResult(r: CalcResult, grams: number): CalcResult {
    const f = grams / 100;
    const s: CalcResult = { ...ZERO_CALC };
    for (const k of Object.keys(r) as (keyof CalcResult)[]) {
        (s as unknown as Record<string, number>)[k] = (r as unknown as Record<string, number>)[k] * f;
    }
    return s;
}

// ─── Search ───────────────────────────────────────────────────────────────────
function searchDB(q: string, db: DBIngredient[]): DBIngredient[] {
    if (!q || q.trim().length < 2) return [];
    const query = q.toLowerCase().trim();
    return db
        .filter(ing => {
            const nome = (ing.nome || '').trim().toLowerCase();
            const etichetta = (ing.etichetta || '').toLowerCase();
            return nome.includes(query) || etichetta.includes(query);
        })
        .sort((a, b) => {
            const nomeA = (a.nome || '').trim().toLowerCase();
            const nomeB = (b.nome || '').trim().toLowerCase();
            if (nomeA === query && nomeB !== query) return -1;
            if (nomeB === query && nomeA !== query) return 1;
            if (nomeA.startsWith(query) && !nomeB.startsWith(query)) return -1;
            if (nomeB.startsWith(query) && !nomeA.startsWith(query)) return 1;
            return nomeA.localeCompare(nomeB, 'it');
        })
        .slice(0, 20);
}

function searchAdditiviDB(q: string, db: DBIngredient[]): DBIngredient[] {
    if (!q || q.trim().length < 1) return [];
    const query = q.toLowerCase().trim();
    return db
        .filter(ing => ing.categoria === 'additivo' && ((ing.nome || '').toLowerCase().includes(query) || (ing.etichetta || '').toLowerCase().includes(query)))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it'))
        .slice(0, 15);
}

// ─── Tooltip component ────────────────────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
    const [visible, setVisible] = useState(false);
    return (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}>
            <button
                type="button"
                title={text}
                onClick={() => setVisible(v => !v)}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: 13, color: 'var(--color-orange)', lineHeight: 1,
                    display: 'inline-flex', alignItems: 'center',
                }}
            >ℹ</button>
            {visible && (
                <span style={{
                    position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1a1a2e', color: '#fff', fontSize: 11.5, lineHeight: 1.5,
                    padding: '7px 11px', borderRadius: 7, whiteSpace: 'normal',
                    width: 230, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                }}>
                    {text}
                </span>
            )}
        </span>
    );
}

// ─── IngSearch sub-component ──────────────────────────────────────────────────
function IngSearch({ onAdd, db, loading, error }: { onAdd: (ing: DBIngredient) => void; db: DBIngredient[]; loading: boolean; error: string | null }) {
    const [q, setQ] = useState('');
    const [res, setRes] = useState<DBIngredient[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const found = searchDB(q, db);
        setRes(found); setOpen(found.length > 0 && q.trim().length >= 2);
    }, [q, db]);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    return (
        <div ref={ref} style={{ position: 'relative', marginBottom: 12 }}>
            <div className="form-field" style={{ marginBottom: 0 }}>
                {error ? (
                    <div style={{ padding: '10px 14px', background: '#fff3f3', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid #e53935' }}>
                        <span style={{ fontSize: 13, color: '#c62828' }}>{error}</span>
                    </div>
                ) : loading ? (
                    <div style={{ padding: '10px 14px', background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid var(--color-border)' }}>
                        <div className="spinner" style={{ width: 14, height: 14, border: '2px solid #ccc', borderTopColor: 'var(--color-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Caricamento database ingredienti...</span>
                    </div>
                ) : (
                    <input type="text" value={q} onChange={e => setQ(e.target.value)}
                        placeholder="🔍 Cerca ingrediente (es. olio extravergine, farina 00...)"
                        style={{ width: '100%' }} />
                )}
            </div>
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
                    background: 'var(--color-bg-card)', border: '1.5px solid var(--color-orange)',
                    borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    zIndex: 500, maxHeight: 320, overflowY: 'auto',
                }}>
                    <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--color-text-dim)', borderBottom: '1px solid var(--color-border)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {res.length} risultati
                    </div>
                    {res.map((ing, i) => (
                        <button key={i} type="button"
                            onClick={() => { onAdd(ing); setQ(''); setOpen(false); }}
                            style={{
                                display: 'block', width: '100%', background: 'transparent',
                                border: 'none', borderBottom: '1px solid var(--color-border)',
                                padding: '9px 14px', textAlign: 'left', cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {(ing.nome || '').trim()}
                                {ing.categoria === '_custom' && (
                                    <span style={{ fontSize: 10, background: 'var(--color-orange)', color: 'white', borderRadius: 4, padding: '1px 6px', fontWeight: 700, flexShrink: 0 }}>Personale</span>
                                )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                {Math.round(n(ing.kcal))} kcal · {Math.round(n(ing.grassi) * 10) / 10}g grassi · {Math.round(n(ing.carboidrati) * 10) / 10}g carbo{ing.categoria && ing.categoria !== '_custom' ? ` · ${ing.categoria}` : ''}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── AdditiveSearch sub-component ─────────────────────────────────────────────
function AdditiveSearch({ chips, onAdd, onRemove, db }: {
    chips: DBIngredient[]; onAdd: (ing: DBIngredient) => void;
    onRemove: (i: number) => void; db: DBIngredient[];
}) {
    const [q, setQ] = useState('');
    const [res, setRes] = useState<DBIngredient[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const found = searchAdditiviDB(q, db);
        setRes(found); setOpen(found.length > 0 && q.trim().length >= 1);
    }, [q, db]);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: chips.length > 0 ? 8 : 0 }}>
                {chips.map((c, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,126,46,0.1)', border: '1px solid var(--color-orange)', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                        {(c.nome || '').trim()}
                        <button type="button" onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                ))}
            </div>
            <div ref={ref} style={{ position: 'relative' }}>
                <input type="text" value={q} onChange={e => setQ(e.target.value)}
                    placeholder="🔍 Cerca additivo dal database (es. acido citrico, pectina...)"
                    className="form-input" style={{ width: '100%' }} />
                {open && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--color-bg-card)', border: '1.5px solid var(--color-orange)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 500, maxHeight: 260, overflowY: 'auto' }}>
                        {res.map((ing, i) => (
                            <button key={i} type="button"
                                onClick={() => { onAdd(ing); setQ(''); setOpen(false); }}
                                style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border)', padding: '8px 14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-bg)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{(ing.nome || '').trim()}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{ing.etichetta || ''}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── CustomIngredientModal ─────────────────────────────────────────────────────
const CI_ALLERGEN_KEYS = [
    'all_glutine','all_crostacei','all_uova','all_pesci','all_arachidi','all_soia',
    'all_latte','all_frutta_guscio','all_anacardi','all_sedano','all_senape',
    'all_sesamo','all_solfiti','all_lupini','all_molluschi',
] as const;
const CI_ALLERGEN_LABELS: Record<string, string> = {
    all_glutine:'GLUTINE', all_crostacei:'CROSTACEI', all_uova:'UOVA', all_pesci:'PESCE',
    all_arachidi:'ARACHIDI', all_soia:'SOIA', all_latte:'LATTE',
    all_frutta_guscio:'FRUTTA A GUSCIO', all_anacardi:'ANACARDI',
    all_sedano:'SEDANO', all_senape:'SENAPE', all_sesamo:'SESAMO',
    all_solfiti:'SOLFITI (>10 ppm)', all_lupini:'LUPINI', all_molluschi:'MOLLUSCHI',
};
const CI_CROSS_KEYS = [
    'cross_glutine','cross_crostacei','cross_uova','cross_pesci','cross_arachidi','cross_soia',
    'cross_latte','cross_frutta_guscio','cross_anacardi','cross_sedano','cross_senape',
    'cross_sesamo','cross_solfiti','cross_lupini','cross_molluschi',
] as const;
const CI_CROSS_LABELS: Record<string, string> = {
    cross_glutine:'GLUTINE', cross_crostacei:'CROSTACEI', cross_uova:'UOVA', cross_pesci:'PESCE',
    cross_arachidi:'ARACHIDI', cross_soia:'SOIA', cross_latte:'LATTE',
    cross_frutta_guscio:'FRUTTA A GUSCIO', cross_anacardi:'ANACARDI',
    cross_sedano:'SEDANO', cross_senape:'SENAPE', cross_sesamo:'SESAMO',
    cross_solfiti:'SOLFITI (>10 ppm)', cross_lupini:'LUPINI', cross_molluschi:'MOLLUSCHI',
};

function CustomIngredientModal({ onClose, onSave }: { onClose: () => void; onSave: (ing: DBIngredient) => void }) {
    // Info base
    const [nome, setNome] = useState('');
    const [etichetta, setEtichetta] = useState('');
    const [categoria, setCategoria] = useState('ingrediente');
    const [eurKg, setEurKg] = useState('');
    // Obbligatori
    const [grassi, setGrassi] = useState('');
    const [saturi, setSaturi] = useState('');
    const [carboidrati, setCarboidrati] = useState('');
    const [zuccheri, setZuccheri] = useState('');
    const [proteine, setProteine] = useState('');
    const [sale, setSale] = useState('');
    // Facoltativi
    const [monoins, setMonoins] = useState('');
    const [polins, setPolins] = useState('');
    const [trans, setTrans] = useState('');
    const [colesterolo, setColesterolo] = useState('');
    const [fibre, setFibre] = useState('');
    const [polioliS, setPolioli] = useState('');
    const [amido, setAmido] = useState('');
    // Obbligatori in certi casi
    const [alcolS, setAlcol] = useState('');
    const [potassio, setPotassio] = useState('');
    const [calcio, setCalcio] = useState('');
    const [fosforo, setFosforo] = useState('');
    const [magnesio, setMagnesio] = useState('');
    const [ferro, setFerro] = useState('');
    const [zinco, setZinco] = useState('');
    const [vitA, setVitA] = useState('');
    const [vitD, setVitD] = useState('');
    const [vitE, setVitE] = useState('');
    const [vitC, setVitC] = useState('');
    const [vitB1, setVitB1] = useState('');
    const [vitB2, setVitB2] = useState('');
    const [vitB3, setVitB3] = useState('');
    const [vitB6, setVitB6] = useState('');
    const [vitB9, setVitB9] = useState('');
    const [vitB12, setVitB12] = useState('');
    // Allergeni
    const [allergens, setAllergens] = useState<Record<string, boolean>>({});
    const [crossAllergens, setCrossAllergens] = useState<Record<string, boolean>>({});
    // Validazione
    const [errors, setErrors] = useState<string[]>([]);

    // Valori calcolati automaticamente (EU Reg 1169/2011)
    const grassiN    = parseFloat(grassi)      || 0;
    const satN       = parseFloat(saturi)       || 0;
    const carbN      = parseFloat(carboidrati)  || 0;
    const protN      = parseFloat(proteine)     || 0;
    const saleN      = parseFloat(sale)         || 0;
    const fibreN     = parseFloat(fibre)        || 0;
    const polioliN   = parseFloat(polioliS)     || 0;
    const alcolN     = parseFloat(alcolS)       || 0;

    const kcalCalc = Math.round((grassiN*9 + protN*4 + carbN*4 + fibreN*2 + polioliN*2.4 + alcolN*7) * 10) / 10;
    const kjCalc   = Math.round((grassiN*37 + protN*17 + carbN*17 + fibreN*8 + polioliN*10 + alcolN*29) * 10) / 10;
    const sodioCalc = Math.round(saleN * 400 * 10) / 10;
    const residuoSecco = Math.round((grassiN + carbN + fibreN + protN + saleN + polioliN + alcolN) * 100) / 100;
    const acquaCalc    = Math.round((100 - residuoSecco) * 100) / 100;
    const waterError   = residuoSecco > 100 || acquaCalc < 0;

    const clearErrors = () => setErrors([]);

    const handleSave = () => {
        const errs: string[] = [];
        if (!nome.trim())    errs.push('Nome ingrediente obbligatorio');
        if (!grassi)         errs.push('Grassi totali *');
        if (!saturi)         errs.push('Acidi grassi saturi *');
        if (!carboidrati)    errs.push('Carboidrati totali *');
        if (!zuccheri)       errs.push('Zuccheri *');
        if (!proteine)       errs.push('Proteine *');
        if (!sale)           errs.push('Sale *');
        if (waterError)      errs.push(`Residuo secco (${residuoSecco}g) supera 100g o acqua negativa (${acquaCalc}g): rivedere i valori`);
        if (errs.length)     { setErrors(errs); return; }

        const ing: DBIngredient = {
            nome: nome.trim(),
            etichetta: etichetta.trim() || nome.trim(),
            categoria: '_custom',
            kcal: kcalCalc,
            kj: kjCalc,
            acqua: acquaCalc >= 0 ? acquaCalc : 0,
            grassi: grassiN, saturi: satN,
            monoins:    monoins    ? parseFloat(monoins)    : undefined,
            polins:     polins     ? parseFloat(polins)     : undefined,
            trans:      trans      ? parseFloat(trans)      : undefined,
            colesterolo:colesterolo? parseFloat(colesterolo): undefined,
            carboidrati: carbN,
            zuccheri: parseFloat(zuccheri) || 0,
            fibre:      fibre      ? fibreN   : undefined,
            polioli:    polioliS   ? polioliN : undefined,
            amido:      amido      ? parseFloat(amido)      : undefined,
            proteine: protN,
            sodio_mg: sodioCalc,
            alcol:      alcolS     ? alcolN   : undefined,
            eur_kg:     eurKg      ? parseFloat(eurKg)      : undefined,
            potassio:   potassio   ? parseFloat(potassio)   : undefined,
            calcio:     calcio     ? parseFloat(calcio)     : undefined,
            fosforo:    fosforo    ? parseFloat(fosforo)    : undefined,
            magnesio:   magnesio   ? parseFloat(magnesio)   : undefined,
            ferro:      ferro      ? parseFloat(ferro)      : undefined,
            zinco:      zinco      ? parseFloat(zinco)      : undefined,
            vitA_eq:    vitA       ? parseFloat(vitA)       : undefined,
            vitD:       vitD       ? parseFloat(vitD)       : undefined,
            vitE:       vitE       ? parseFloat(vitE)       : undefined,
            vitC:       vitC       ? parseFloat(vitC)       : undefined,
            vitB1:      vitB1      ? parseFloat(vitB1)      : undefined,
            vitB2:      vitB2      ? parseFloat(vitB2)      : undefined,
            vitB3:      vitB3      ? parseFloat(vitB3)      : undefined,
            vitB6:      vitB6      ? parseFloat(vitB6)      : undefined,
            vitB9:      vitB9      ? parseFloat(vitB9)      : undefined,
            vitB12:     vitB12     ? parseFloat(vitB12)     : undefined,
            ...Object.fromEntries(CI_ALLERGEN_KEYS.filter(k => allergens[k]).map(k => [k, '1'])),
            ...Object.fromEntries(CI_CROSS_KEYS.filter(k => crossAllergens[k]).map(k => [k, '1'])),
        };
        try {
            const ex = JSON.parse(localStorage.getItem('custom_ingredients') || '[]');
            localStorage.setItem('custom_ingredients', JSON.stringify([...ex, ing]));
        } catch {}
        onSave(ing);
        onClose();
    };

    // Stili riutilizzabili
    const iS: React.CSSProperties = { width: '100%', padding: '5px 8px', border: '1px solid var(--color-border)', borderRadius: 5, fontSize: 13, boxSizing: 'border-box' };
    const iSRo: React.CSSProperties = { ...iS, background: 'var(--color-bg-secondary,#f0f4ff)', color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'default' };
    const iSErr: React.CSSProperties = { ...iS, border: '1.5px solid #e53e3e' };
    const lS: React.CSSProperties = { fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3, color: 'var(--color-text-muted)' };
    const secS: React.CSSProperties = { marginBottom: 14, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--color-border)' };
    const secT = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color, marginBottom: 10 });
    const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 };
    const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };

    const NF = ({ label, value, onChange, unit = 'g/100g', ro = false, err = false }: {
        label: string; value: string; onChange?: (v: string) => void;
        unit?: string; ro?: boolean; err?: boolean;
    }) => (
        <div>
            <label style={lS}>{label} <span style={{ fontWeight: 400 }}>{unit}</span></label>
            <input type="number" min={0} step={0.01}
                style={ro ? iSRo : err ? iSErr : iS}
                value={value}
                onChange={e => { onChange?.(e.target.value); clearErrors(); }}
                readOnly={ro}
            />
        </div>
    );

    const AllergenRow = ({ keys, labels, state, setState }: {
        keys: readonly string[]; labels: Record<string, string>;
        state: Record<string, boolean>; setState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    }) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {keys.map(k => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!state[k]} onChange={e => setState(prev => ({ ...prev, [k]: e.target.checked }))} />
                    {labels[k]}
                </label>
            ))}
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="card" style={{ width: '100%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0 }}>➕ Aggiungi ingrediente nel Data Base</h3>
                    <button className="btn btn-outline" onClick={onClose}>✕</button>
                </div>

                {/* Legenda */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14, fontSize: 11, padding: '8px 12px', background: 'var(--color-bg-secondary,#f8f9fb)', borderRadius: 6 }}>
                    <span><strong style={{ color: '#c53030' }}>*</strong> Obbligatorio</span>
                    <span><strong style={{ color: '#2b6cb0' }}>◎</strong> Calcolato automaticamente</span>
                    <span><strong style={{ color: '#718096' }}>○</strong> Facoltativo</span>
                    <span><strong style={{ color: '#b7791f' }}>△</strong> Obbligatorio in certi casi</span>
                </div>

                {/* Errori */}
                {errors.length > 0 && (
                    <div style={{ background: '#fff5f5', border: '1px solid #fc8181', borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#c53030', marginBottom: 4 }}>Campi mancanti o errori:</div>
                        {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#c53030' }}>⚠ {e}</div>)}
                    </div>
                )}

                {/* Info base */}
                <div style={secS}>
                    <div style={secT('#333')}>Informazioni base</div>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ ...lS, color: '#333' }}>Nome ingrediente <span style={{ color: '#c53030' }}>*</span></label>
                        <input style={!nome.trim() && errors.length > 0 ? iSErr : iS} value={nome}
                            onChange={e => { setNome(e.target.value); clearErrors(); }}
                            placeholder="es. salsa di soia artigianale" />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ ...lS, color: '#333' }}>Dichiarazione etichetta <span style={{ fontWeight: 400 }}>(allergeni in MAIUSCOLO)</span></label>
                        <textarea style={{ ...iS, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                            value={etichetta} onChange={e => setEtichetta(e.target.value)}
                            placeholder="es. salsa di SOIA (acqua, SOIA, sale)" />
                    </div>
                    <div style={grid2}>
                        <div>
                            <label style={lS}>Categoria</label>
                            <select style={iS} value={categoria} onChange={e => setCategoria(e.target.value)}>
                                {['ingrediente','semilavorato','prodotto','additivo','aroma'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <NF label="○ Costo" value={eurKg} onChange={setEurKg} unit="€/kg" />
                    </div>
                </div>

                {/* Energia calcolata */}
                <div style={{ ...secS, background: 'var(--color-bg-secondary,#ebf8ff)', borderColor: '#bee3f8' }}>
                    <div style={secT('#2b6cb0')}>◎ Energia — calcolata automaticamente (EU Reg 1169/2011)</div>
                    <div style={grid2}>
                        <NF label="◎ Energia" value={String(kcalCalc)} unit="kcal/100g" ro />
                        <NF label="◎ Energia" value={String(kjCalc)} unit="kJ/100g" ro />
                    </div>
                </div>

                {/* Obbligatori */}
                <div style={secS}>
                    <div style={secT('#c53030')}>* Valori nutrizionali obbligatori</div>
                    <div style={grid3}>
                        <NF label="* Grassi totali" value={grassi} onChange={setGrassi} err={!grassi && errors.length > 0} />
                        <NF label="* Acidi grassi saturi" value={saturi} onChange={setSaturi} err={!saturi && errors.length > 0} />
                        <NF label="* Carboidrati totali" value={carboidrati} onChange={setCarboidrati} err={!carboidrati && errors.length > 0} />
                        <NF label="* Zuccheri" value={zuccheri} onChange={setZuccheri} err={!zuccheri && errors.length > 0} />
                        <NF label="* Proteine" value={proteine} onChange={setProteine} err={!proteine && errors.length > 0} />
                        <NF label="* Sale" value={sale} onChange={setSale} err={!sale && errors.length > 0} />
                    </div>
                </div>

                {/* Valori calcolati */}
                <div style={{ ...secS, background: 'var(--color-bg-secondary,#ebf8ff)', borderColor: waterError ? '#fc8181' : '#bee3f8' }}>
                    <div style={secT('#2b6cb0')}>◎ Valori calcolati</div>
                    {waterError && (
                        <div style={{ background: '#fff5f5', border: '1px solid #fc8181', borderRadius: 6, padding: '8px 10px', marginBottom: 10, fontSize: 12, color: '#c53030' }}>
                            ⚠ Residuo secco ({residuoSecco} g/100g) supera 100 g oppure acqua risulta negativa ({acquaCalc} g/100g). Rivedere i valori inseriti.
                        </div>
                    )}
                    <div style={grid3}>
                        <NF label="◎ Acqua" value={String(acquaCalc)} unit="g/100g" ro err={waterError} />
                        <NF label="◎ Residuo secco" value={String(residuoSecco)} unit="g/100g" ro err={waterError} />
                        <NF label="◎ Sodio" value={String(sodioCalc)} unit="mg/100g" ro />
                    </div>
                </div>

                {/* Facoltativi */}
                <div style={secS}>
                    <div style={secT('#718096')}>○ Valori facoltativi</div>
                    <div style={grid3}>
                        <NF label="○ Ac. grassi monoinsaturi" value={monoins} onChange={setMonoins} />
                        <NF label="○ Ac. grassi polinsaturi" value={polins} onChange={setPolins} />
                        <NF label="○ Ac. grassi trans" value={trans} onChange={setTrans} />
                        <NF label="○ Colesterolo" value={colesterolo} onChange={setColesterolo} unit="mg/100g" />
                        <NF label="○ Fibre alimentari" value={fibre} onChange={v => { setFibre(v); clearErrors(); }} />
                        <NF label="○ Polioli" value={polioliS} onChange={v => { setPolioli(v); clearErrors(); }} />
                        <NF label="○ Amido" value={amido} onChange={setAmido} />
                    </div>
                </div>

                {/* Obbligatori in certi casi */}
                <div style={secS}>
                    <div style={secT('#b7791f')}>△ Obbligatori in certi casi</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>
                        Alcol: obbligatorio per bevande alcoliche. Minerali e vitamine: obbligatori se dichiarati o rivendicati in etichetta.
                    </div>
                    <div style={grid3}>
                        <NF label="△ Alcol" value={alcolS} onChange={v => { setAlcol(v); clearErrors(); }} />
                        <NF label="△ Potassio" value={potassio} onChange={setPotassio} unit="mg/100g" />
                        <NF label="△ Calcio" value={calcio} onChange={setCalcio} unit="mg/100g" />
                        <NF label="△ Fosforo" value={fosforo} onChange={setFosforo} unit="mg/100g" />
                        <NF label="△ Magnesio" value={magnesio} onChange={setMagnesio} unit="mg/100g" />
                        <NF label="△ Ferro" value={ferro} onChange={setFerro} unit="mg/100g" />
                        <NF label="△ Zinco" value={zinco} onChange={setZinco} unit="mg/100g" />
                        <NF label="△ Vitamina A" value={vitA} onChange={setVitA} unit="μg/100g" />
                        <NF label="△ Vitamina D" value={vitD} onChange={setVitD} unit="μg/100g" />
                        <NF label="△ Vitamina E" value={vitE} onChange={setVitE} unit="mg/100g" />
                        <NF label="△ Vitamina C" value={vitC} onChange={setVitC} unit="mg/100g" />
                        <NF label="△ Vitamina B1 (Tiamina)" value={vitB1} onChange={setVitB1} unit="mg/100g" />
                        <NF label="△ Vitamina B2 (Riboflavina)" value={vitB2} onChange={setVitB2} unit="mg/100g" />
                        <NF label="△ Vitamina B3 (Niacina)" value={vitB3} onChange={setVitB3} unit="mg/100g" />
                        <NF label="△ Vitamina B6" value={vitB6} onChange={setVitB6} unit="mg/100g" />
                        <NF label="△ Vitamina B9 (Folati)" value={vitB9} onChange={setVitB9} unit="μg/100g" />
                        <NF label="△ Vitamina B12" value={vitB12} onChange={setVitB12} unit="μg/100g" />
                    </div>
                </div>

                {/* Allergeni presenti */}
                <div style={secS}>
                    <div style={secT('#333')}>Allergeni presenti</div>
                    <AllergenRow keys={CI_ALLERGEN_KEYS} labels={CI_ALLERGEN_LABELS} state={allergens} setState={setAllergens} />
                </div>

                {/* Cross-contamination */}
                <div style={secS}>
                    <div style={secT('#333')}>Sostanze allergeniche probabilmente presenti</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>Per cross contamination presso il sito del fornitore</div>
                    <AllergenRow keys={CI_CROSS_KEYS} labels={CI_CROSS_LABELS} state={crossAllergens} setState={setCrossAllergens} />
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <button className="btn btn-primary" onClick={handleSave}>💾 Salva nel database personale</button>
                    <button className="btn btn-outline" onClick={onClose}>Annulla</button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const makeComp = (): Component => ({ id: String(Date.now() + Math.random()), name: '', rows: [], pzUV: 1 });

export function NutrizionaleCalc() {

    const [productName, setProductName] = useState('');
    const [components, setComponents] = useState<Component[]>([makeComp()]);
    const [additives, setAdditives] = useState<string[]>(['']);
    const [additiveChips, setAdditiveChips] = useState<DBIngredient[]>([]);
    const [finishedWeight, setFinishedWeight] = useState('');
    const [specificGravity, setSpecificGravity] = useState('');
    const [fwWarning, setFwWarning] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}); // Track validation errors
    // const [fwErrorMsg, setFwErrorMsg] = useState('');
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);
    // const [toolTab, setToolTab] = useState<'tabelle' | 'lista'>('tabelle');
    const [servingOpen, setServingOpen] = useState<Record<string, boolean>>({
        '🇪🇺 UE': false, '🇺🇸 USA (CUP=240ml)': false, '🇨🇦 Canada (CUP=250ml)': false, '🇦🇺 Australia': false, '🌍 Paesi Arabi (CUP=240ml)': false
    });
    const [activeTab, setActiveTab] = useState<NationTab>('UE');
    const [subTab, setSubTab] = useState<SubTab>('verticale');
    const [auShowDI, setAuShowDI] = useState(true);
    const [showOptionals, setShowOptionals] = useState(false);

    // Quick-guide state — using useLocalStorage hook for persistence
    const [guideOpen, setGuideOpen] = useLocalStorage<boolean>('nutri_guide_open', true);
    const toggleGuide = () => setGuideOpen(prev => !prev);

    // Database state — fetched + merged with personal custom ingredients
    const [db, setDb] = useState<DBIngredient[]>([]);
    const [loadingDB, setLoadingDB] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/data/ingredientsDB.json')
            .then(r => r.json())
            .then(data => {
                let base = data as DBIngredient[];
                try {
                    const custom = JSON.parse(localStorage.getItem('custom_ingredients') || '[]') as DBIngredient[];
                    if (custom.length) base = [...base, ...custom];
                } catch {}
                setDb(base);
                setLoadingDB(false);
            })
            .catch(err => { console.error('Error loading DB:', err); setLoadingDB(false); setDbError('Impossibile caricare il database ingredienti. Ricarica la pagina.'); });
    }, []);

    const addCustomIngredient = (ing: DBIngredient) => setDb(prev => [...prev, ing]);

    const [usa, setUSA] = useState<ServingSizesNation>({});
    const [ca, setCA] = useState<ServingSizesNation>({});
    const [au, setAU] = useState<ServingSizesNation>({});
    const [arabi, setArabi] = useState<ServingSizesNation>({});
    const [ue, setUE] = useState<UEServing>({});
    const tableRef = useRef<HTMLDivElement>(null);

    const { items: archiveItems, saveItem, deleteItem } = useArchive<ArchiveData>('nutrizionale-v3');
    const [currentId, setCurrentId] = useState<string | undefined>(undefined);
    const [, setCurrentName] = useState('');

    // Weight totals
    const totalGramsRaw = components.reduce((s, c) => s + c.rows.reduce((rs, r) => rs + r.grams, 0), 0);
    const fw = parseFloat(finishedWeight) || 0;
    const pesoTotale = fw > 0 ? fw : totalGramsRaw;

    // All rows combined for rendering
    const allRows = useMemo(() => components.flatMap(c => c.rows.map(r => ({ ing: r.ing, grams: r.grams, eurKg: r.eurKg, resa: r.resa }))), [components]);

    // Calculation
    const per100g = useMemo(() => calcNutrients(components, fw), [components, fw]);

    // Allergens
    const presentAllergens = useMemo(() => {
        const set = new Set<string>();
        allRows.forEach(({ ing }) => ALLERGEN_FIELDS.forEach(({ key, label }) => { if (ing[key]) set.add(label); }));
        return [...set];
    }, [allRows]);
    const crossAllergens = useMemo(() => {
        const set = new Set<string>();
        allRows.forEach(({ ing }) => CROSS_FIELDS.forEach(({ key, label }) => {
            if (ing[key] && !presentAllergens.includes(label)) set.add(label);
        }));
        return [...set];
    }, [allRows, presentAllergens]);


    // Component modifiers
    const addComp = () => { if (components.length < 4) setComponents(prev => [...prev, makeComp()]); };
    const removeComp = (id: string) => setComponents(prev => prev.filter(c => c.id !== id));
    const updateCompName = (id: string, name: string) => setComponents(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    const updateCompPzUV = (id: string, pzUV: number) => {
        const errorKey = `${id}-pzuv`;
        const validation = validatePieces(pzUV, 'Pezzi per UV');
        if (!validation.isValid) {
            setFieldErrors(prev => ({...prev, [errorKey]: validation.error!}));
            return;
        }
        setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        setComponents(prev => prev.map(c => c.id === id ? { ...c, pzUV } : c));
    };
    const addRowToComp = useCallback((compId: string, ing: DBIngredient) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: [...c.rows, { id: String(Date.now() + Math.random()), ing, grams: 100, eurKg: 0, resa: 100 }]
        }));
    }, []);
    const updateGrams = (compId: string, rowId: string, g: number) => {
        const errorKey = `${compId}-${rowId}-grams`;
        const validation = validateIngredientQuantity(g);
        if (!validation.isValid) {
            setFieldErrors(prev => ({...prev, [errorKey]: validation.error!}));
            return;
        }
        // Clear error and update
        setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: c.rows.map(r => r.id === rowId ? { ...r, grams: g } : r)
        }));
    };
    const updateEurKg = (compId: string, rowId: string, v: number) => {
        const errorKey = `${compId}-${rowId}-eurkgs`;
        // Allow zero, but validate if non-zero
        if (v !== 0) {
            const validation = validatePositiveNumber(v, 'Costo €/kg', { min: 0.01, max: 1000 });
            if (!validation.isValid) {
                setFieldErrors(prev => ({...prev, [errorKey]: validation.error!}));
                return;
            }
        }
        setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: c.rows.map(r => r.id === rowId ? { ...r, eurKg: v } : r)
        }));
    };
    const updateResa = (compId: string, rowId: string, v: number) => {
        const errorKey = `${compId}-${rowId}-resa`;
        const validation = validatePercentage(v, 'Resa');
        if (!validation.isValid) {
            setFieldErrors(prev => ({...prev, [errorKey]: validation.error!}));
            return;
        }
        setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: c.rows.map(r => r.id === rowId ? { ...r, resa: v } : r)
        }));
    };
    const removeRow = (compId: string, rowId: string) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : { ...c, rows: c.rows.filter(r => r.id !== rowId) }));
    };

    // Finished weight validation with input validation
    const handleFW = (val: string) => {
        const errorKey = 'finished-weight';
        const parsed = parseFloat(val) || 0;

        // Validate input
        if (val !== '' && val !== '0') {
            const validation = validateFinishedWeight(parsed);
            if (!validation.isValid) {
                setFieldErrors(prev => ({...prev, [errorKey]: validation.error!}));
                return;
            }
        }

        const firstPzUV = components.length > 0 ? (components[0].pzUV || 1) : 1;
        const pesoCrudoPerPz = totalGramsRaw / firstPzUV;
        if (parsed > 0 && pesoCrudoPerPz > 0 && parsed > pesoCrudoPerPz) {
            setFwWarning(true);
        } else {
            setFwWarning(false);
        }
        setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        setFinishedWeight(val);
    };

    // Archive save/load
    const handleSave = () => {
        const name = productName || prompt('Nome ricetta:') || 'Ricetta';
        saveItem(name, {
            nome_prodotto: productName,
            componenti: components.map(c => ({
                nome: c.name,
                pz_uv: c.pzUV,
                ingredienti: c.rows.map(r => ({ nome: r.ing.nome, grammi: r.grams }))
            })),
            additivi: additiveChips.map(a => a.nome),
            peso_finito_pz: fw,
            serving_sizes: { UE: ue, USA: usa, Canada: ca, Australia: au, Arabi: arabi }
        });
        alert('Ricetta salvata in archivio!');
    };

    const handleLoad = (item: typeof archiveItems[0]) => {
        const d = item.data as any; // Allow legacy fallback
        setProductName(d.nome_prodotto || d.productName || '');
        setFinishedWeight(d.peso_finito_pz ? String(d.peso_finito_pz) : (d.finishedWeight || ''));
        setSpecificGravity(d.specificGravity || '');
        setAdditives(d.additivi?.length ? d.additivi : (d.additives?.length ? d.additives : ['']));

        const serv = d.serving_sizes || {};
        setUE(serv.UE || d.ue || {});
        setUSA(serv.USA || d.usa || {});
        setCA(serv.Canada || d.ca || {});
        setAU(serv.Australia || d.au || {});
        setArabi(serv.Arabi || d.arabi || {});

        const rawComps = d.componenti || d.components || [];
        const loadedComps: Component[] = rawComps.map((sc: any) => {
            const rowData = sc.ingredienti || sc.rows || [];
            return {
                id: String(Date.now() + Math.random()),
                name: sc.nome || sc.name || '',
                pzUV: sc.pz_uv || sc.pzUV || 1,
                rows: rowData.flatMap((sr: any) => {
                    const ingName = sr.nome || sr.name;
                    const grams = typeof sr.grammi === 'number' ? sr.grammi : (sr.grams || 0);
                    const found = db.find(dbi => dbi.nome === ingName);
                    return found ? [{ id: String(Date.now() + Math.random()), ing: found, grams, eurKg: 0, resa: 100 }] : [];
                }),
            };
        });
        setComponents(loadedComps.length ? loadedComps : [makeComp()]);
        setCurrentId(item.id);
        setCurrentName(item.name);
        setArchiveOpen(false);
    };

    const handleNew = () => {
        if (allRows.length > 0 && !window.confirm('Vuoi davvero creare una nuova ricetta? Perderai i dati non salvati.')) return;
        setProductName('');
        setComponents([makeComp()]);
        setAdditives(['']);
        setAdditiveChips([]);
        setFinishedWeight('');
        setSpecificGravity('');
        setFwWarning(false); // setFwErrorMsg('');
        setUE({}); setUSA({}); setCA({}); setAU({}); setArabi({});
        setCurrentId(undefined);
        setCurrentName('');
    };

    const handleDownloadPNG = async () => {
        if (!tableRef.current) { alert('Errore: tabella non trovata.'); return; }
        try {
            const target = (tableRef.current.querySelector('[data-table-export]') as HTMLElement) ?? tableRef.current;
            const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.download = `${productName || 'tabella'}_nutrizionale.png`;
            a.href = url;
            a.click();
        } catch (e) {
            console.error('PNG Export error:', e);
            alert('Errore durante l\'esportazione della tabella in PNG.');
        }
    };

    const handleDownloadEtichettaPDF = async () => {
        try {
            // Find the TabUE container in the DOM
            const etichettaElement = document.querySelector('[data-testid="tab-ue"]') as HTMLElement ||
                                   document.querySelector('div[style*="maxWidth: 480"]') as HTMLElement;

            if (!etichettaElement) {
                alert('Errore: tabella etichetta non trovata. Assicurati di essere sulla tab UE.');
                return;
            }

            const fileName = `${productName || 'etichetta'}_${new Date().toLocaleDateString('it-IT').replace(/\//g, '-')}.pdf`;
            await generateEtichettaPDF(etichettaElement, fileName);
        } catch (error) {
            console.error('Etichetta PDF export error:', error);
            alert('Errore durante l\'esportazione della scheda etichetta in PDF.');
        }
    };

    const handlePDF = async () => {
        if (allRows.length === 0 || !productName) { alert('Inserisci almeno il nome del prodotto e un ingrediente prima di scaricare.'); return; }
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const W = 210;
            const M = 15;
            const CW = W - M * 2;
            let y = 0;

            // ── Header navy ──
            doc.setFillColor(12, 19, 38);
            doc.rect(0, 0, W, 20, 'F');
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            doc.text('AEA Consulenze Alimentari — Scheda Nutrizionale', M, 13);
            y = 28;

            // ── Nome prodotto ──
            doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
            doc.text(productName, M, y); y += 7;
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
            doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}   |   Regione: ${activeTab}   |   Peso finito: ${finishedWeight || '—'} g`, M, y); y += 6;
            doc.setDrawColor(220, 220, 220); doc.line(M, y, W - M, y); y += 6;

            // ── Tabella visiva (html2canvas) ──
            if (tableRef.current) {
                const exportTarget = (tableRef.current.querySelector('[data-table-export]') as HTMLElement) ?? tableRef.current;
                const canvas = await html2canvas(exportTarget, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                const imgH = (canvas.height / canvas.width) * CW;
                const clampH = Math.min(imgH, 257 - y);
                if (y + clampH > 277) { doc.addPage(); y = 15; }
                doc.addImage(imgData, 'PNG', M, y, CW, clampH);
                y += clampH + 8;
            }

            // ── Lista ingredienti (raggruppata per componente) ──
            if (y > 255) { doc.addPage(); y = 15; }
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
            doc.text('Lista Ingredienti', M, y); y += 5;
            doc.setDrawColor(220, 220, 220); doc.line(M, y, W - M, y); y += 5;
            const totGrams = components.reduce((s, c) => s + c.rows.reduce((rs, r) => rs + r.grams, 0), 0);
            const multiComp = components.length > 1;
            components.forEach(comp => {
                if (multiComp) {
                    if (y > 272) { doc.addPage(); y = 15; }
                    const compLabel = comp.name ? `Componente: ${comp.name}  (${comp.pzUV} pz/UV)` : `Componente senza nome  (${comp.pzUV} pz/UV)`;
                    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
                    doc.text(compLabel, M + 2, y); y += 5;
                }
                comp.rows.forEach(({ ing, grams, eurKg: ek, resa }) => {
                    if (y > 272) { doc.addPage(); y = 15; }
                    const pctStr = totGrams > 0 ? ` (${((grams / totGrams) * 100).toFixed(1)}%)` : '';
                    const costStr = ek > 0 ? `  €${ek.toFixed(2)}/kg` : '';
                    const label = ing.etichetta || ing.nome;
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
                    doc.text(`• ${label}   ${grams} g${pctStr}   resa ${resa}%${costStr}`, M + (multiComp ? 6 : 2), y); y += 5;
                });
            });
            y += 3;

            // ── Valori nutrizionali dettagliati ──
            if (y > 245) { doc.addPage(); y = 15; }
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
            doc.text('Valori Nutrizionali per 100g (tutti i dati calcolati)', M, y); y += 5;
            doc.setDrawColor(220, 220, 220); doc.line(M, y, W - M, y); y += 5;
            const p = per100g;
            const rows: [string, string][] = [
                ['Energia', `${p.energyKj.toFixed(0)} kJ / ${p.energyKcal.toFixed(0)} kcal`],
                ['Grassi totali', `${p.grassi.toFixed(1)} g`],
                ['  di cui acidi grassi saturi', `${p.saturi.toFixed(1)} g`],
                ['  di cui monoinsaturi', p.monoins > 0 ? `${p.monoins.toFixed(1)} g` : '—'],
                ['  di cui polinsaturi', p.polins > 0 ? `${p.polins.toFixed(1)} g` : '—'],
                ['  di cui trans', p.trans > 0 ? `${p.trans.toFixed(1)} g` : '—'],
                ['Colesterolo', p.colesterolo > 0 ? `${p.colesterolo.toFixed(0)} mg` : '—'],
                ['Carboidrati totali', `${p.carboidrati.toFixed(1)} g`],
                ['  di cui zuccheri', `${p.zuccheri.toFixed(1)} g`],
                ['  di cui zuccheri aggiunti', p.zuccheri_agg > 0 ? `${p.zuccheri_agg.toFixed(1)} g` : '—'],
                ['  di cui polioli', p.polioli > 0 ? `${p.polioli.toFixed(1)} g` : '—'],
                ['  di cui amido', p.amido > 0 ? `${p.amido.toFixed(1)} g` : '—'],
                ['Fibre alimentari', p.fibre > 0 ? `${p.fibre.toFixed(1)} g` : '—'],
                ['Proteine', `${p.proteine.toFixed(1)} g`],
                ['Sale', `${p.sale.toFixed(2)} g`],
                ['Sodio', `${p.sodio_mg.toFixed(0)} mg`],
                ['Potassio', p.potassio > 0 ? `${p.potassio.toFixed(0)} mg` : '—'],
                ['Calcio', p.calcio > 0 ? `${p.calcio.toFixed(0)} mg` : '—'],
                ['Fosforo', p.fosforo > 0 ? `${p.fosforo.toFixed(0)} mg` : '—'],
                ['Magnesio', p.magnesio > 0 ? `${p.magnesio.toFixed(0)} mg` : '—'],
                ['Ferro', p.ferro > 0 ? `${p.ferro.toFixed(1)} mg` : '—'],
                ['Zinco', p.zinco > 0 ? `${p.zinco.toFixed(1)} mg` : '—'],
                ['Vitamina C', p.vitC > 0 ? `${p.vitC.toFixed(1)} mg` : '—'],
                ['Vitamina B1', p.vitB1 > 0 ? `${p.vitB1.toFixed(2)} mg` : '—'],
                ['Vitamina B2', p.vitB2 > 0 ? `${p.vitB2.toFixed(2)} mg` : '—'],
                ['Vitamina B3 (Niacina)', p.vitB3 > 0 ? `${p.vitB3.toFixed(1)} mg` : '—'],
                ['Vitamina B6', p.vitB6 > 0 ? `${p.vitB6.toFixed(2)} mg` : '—'],
                ['Vitamina B9 (Folati)', p.vitB9 > 0 ? `${p.vitB9.toFixed(0)} μg` : '—'],
                ['Vitamina B12', p.vitB12 > 0 ? `${p.vitB12.toFixed(1)} μg` : '—'],
                ['Vitamina A', p.vitA_eq > 0 ? `${p.vitA_eq.toFixed(0)} μg` : '—'],
                ['Vitamina D', p.vitD > 0 ? `${p.vitD.toFixed(1)} μg` : '—'],
                ['Vitamina E', p.vitE > 0 ? `${p.vitE.toFixed(1)} mg` : '—'],
            ];
            rows.forEach(([label, val]) => {
                if (y > 272) { doc.addPage(); y = 15; }
                const isSub = label.startsWith('  ');
                doc.setFontSize(8);
                doc.setFont('helvetica', isSub ? 'normal' : 'bold');
                doc.setTextColor(isSub ? 80 : 30, isSub ? 80 : 30, isSub ? 80 : 30);
                doc.text(label, M + (isSub ? 4 : 0), y);
                doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
                doc.text(val, M + 100, y);
                y += 5;
            });
            y += 3;

            // ── Allergeni ──
            if (presentAllergens.length > 0 || crossAllergens.length > 0) {
                if (y > 255) { doc.addPage(); y = 15; }
                doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
                doc.text('Allergeni', M, y); y += 5;
                doc.setDrawColor(220, 220, 220); doc.line(M, y, W - M, y); y += 5;
                if (presentAllergens.length > 0) {
                    if (y > 272) { doc.addPage(); y = 15; }
                    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(197, 48, 48);
                    doc.text('Contiene:', M + 2, y);
                    doc.setFont('helvetica', 'normal');
                    const lines = doc.splitTextToSize(presentAllergens.join(', '), CW - 24);
                    doc.text(lines, M + 22, y); y += lines.length * 5;
                }
                if (crossAllergens.length > 0) {
                    if (y > 272) { doc.addPage(); y = 15; }
                    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(183, 121, 31);
                    doc.text('Può contenere:', M + 2, y);
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 60, 0);
                    const lines = doc.splitTextToSize(crossAllergens.join(', '), CW - 30);
                    doc.text(lines, M + 30, y); y += lines.length * 5;
                }
            }

            // ── Footer ──
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 160);
                doc.text(`AEA Consulenze Alimentari — pag. ${i}/${pageCount}`, M, 292);
            }

            doc.save(`${productName || 'ricetta'}_scheda_${activeTab}.pdf`);
        } catch (e) {
            console.error('PDF export error:', e);
            alert('Errore durante la generazione del PDF.');
        }
    };

    return (
        <div style={{ fontSize: 15 }}>
            {/* Custom ingredient modal */}
            {showCustomModal && (
                <CustomIngredientModal
                    onClose={() => setShowCustomModal(false)}
                    onSave={(ing) => { addCustomIngredient(ing); }}
                />
            )}
            {/* Archive modal */}
            {archiveOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '90%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0 }}>📁 Archivio Ricette</h3>
                            <button className="btn btn-outline" onClick={() => setArchiveOpen(false)}>✕</button>
                        </div>
                        {archiveItems.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>Nessuna ricetta salvata. Compila una ricetta e clicca 'Salva in archivio'.</p>}
                        {archiveItems.map(item => {
                            const d = item.data as any;
                            const title = d.nome_prodotto || d.productName || item.name || 'Ricetta Senza Nome';
                            const ingCount = (d.componenti || d.components || []).reduce((s: number, c: any) => s + (c.ingredienti || c.rows || []).length, 0);
                            return (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{title}</div>
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(item.date).toLocaleDateString('it-IT')} · {ingCount} ingredienti</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handleLoad(item)}>Carica</button>
                                        <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px', color: '#e53e3e' }} onClick={() => { if (window.confirm(`Eliminare "${title}"?`)) deleteItem(item.id); }}>🗑 Elimina</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Header — mod 1 */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1>🥗 Creazione tabelle valori nutrizionali</h1>
                    <p>Etichettatura internazionale (UE, USA, Canada, Australia, Arabi) &amp; Costi Ingredienti</p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" onClick={() => setShowCustomModal(true)}>➕ Aggiungi ingrediente nel Data Base</button>
                    <button className="btn btn-outline" onClick={handleNew}>✨ Nuovo</button>
                    <button className="btn btn-outline" onClick={() => setArchiveOpen(true)}>📂 Archivio ({archiveItems.length})</button>
                    <button className="btn btn-accent" onClick={handleSave}>💾 {currentId ? 'Aggiorna in Archivio' : 'Salva in Archivio'}</button>
                </div>
            </div>

            {/* Quick Guide — mod 1 (Step 3 text updated) */}
            <div style={{ marginBottom: 20, border: '1.5px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--color-bg-secondary, #f8f9fb)', borderBottom: guideOpen ? '1px solid var(--color-border)' : 'none' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>📖 Come usare il Calcolatore — guida rapida</span>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={toggleGuide}>{guideOpen ? 'Nascondi guida' : 'Mostra guida'}</button>
                </div>
                <div style={{ maxHeight: guideOpen ? '900px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                    <div style={{ padding: '18px 18px 6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
                            {[
                                { step: 'STEP 1', icon: '🔍', title: 'Cerca Ingredienti', desc: "Digita nel campo ricerca e seleziona l'ingrediente dal database AEA." },
                                { step: 'STEP 2', icon: '⚖️', title: 'Inserisci Pesi', desc: 'Specifica i grammi per ogni ingrediente. I calcoli si aggiornano in tempo reale.' },
                                { step: 'STEP 3', icon: '🔥', title: 'Calo Peso', desc: 'Peso del prodotto finito (dopo eventuale calo peso dovuto ad evaporazione di acqua).' },
                                { step: 'STEP 4', icon: '💶', title: 'Analisi Costi', desc: 'Aggiungi €/kg e Resa% per vedere il costo del piatto e il breakdown economico.' },
                                { step: 'STEP 5', icon: '🌍', title: 'Export Labelling', desc: 'Scegli il paese di destinazione e scarica le tabelle PDF conformi ai regolamenti.' },
                            ].map(({ step, icon, title, desc }) => (
                                <div key={step} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{step}</div>
                                    <div style={{ fontSize: 20 }}>{icon}</div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* INSERIMENTO RICETTA section header — mod 1 */}
            <div style={{ background: 'var(--color-navy, #1a1a2e)', color: 'white', borderRadius: '10px 10px 0 0', padding: '10px 20px', marginBottom: 0, fontWeight: 800, fontSize: 15, letterSpacing: '0.08em' }}>
                📋 INSERIMENTO RICETTA
            </div>
            <div style={{ border: '2px solid var(--color-navy, #1a1a2e)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '20px 20px 4px', marginBottom: 20 }}>

            {/* Product name — mod 2: PRODOTTO label prominent */}
            <div className="card" style={{ marginBottom: 16, background: 'rgba(255,126,46,0.04)', border: '2px solid var(--color-orange)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-orange)' }}>
                        PRODOTTO
                    </label>
                    <InfoTooltip text="Il nome del prodotto come comparirà nella scheda etichetta" />
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                    <input type="text" placeholder="Nome prodotto (es. Torta di mele, Salsa al pomodoro...)" value={productName}
                        onChange={e => setProductName(e.target.value)} className="form-input" style={{ fontSize: 15, fontWeight: 600 }} />
                </div>
            </div>

            {/* Components — mod 3, 4, 5, 6: PZ/UV decimals, tooltips, €/kg zero fix, wider fields */}
            {components.map((comp, ci) => (
                <div key={comp.id} className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ margin: 0 }}>🧾 Componente {ci + 1}{comp.name ? ` — ${comp.name}` : ''}</h3>
                        {components.length > 1 && (
                            <button onClick={() => removeComp(comp.id)} style={{ background: 'transparent', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: 18 }}>✕</button>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 12 }}>
                        <div className="form-field" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                <label className="form-label" style={{ marginBottom: 0 }}>Nome componente</label>
                                <InfoTooltip text="Inserisci il nome del componente (es: pasta, farcitura, ricopertura). Un prodotto può avere fino a 4 componenti." />
                            </div>
                            <input type="text" placeholder="Nome componente opzionale (es. impasto, crema)" value={comp.name}
                                onChange={e => updateCompName(comp.id, e.target.value)} className="form-input" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                    <label className="form-label" style={{ whiteSpace: 'nowrap', marginBottom: 0, fontSize: 13 }}>Fabbisogno per PZ/U.V.</label>
                                    <InfoTooltip text="Inserisci il numero di pezzi (o unità di vendita) che si ottengono dalla ricetta inserita. Esempio: se la ricetta produce 15,944 vasetti da 100g, inserire 15.944" />
                                </div>
                                <div style={{ width: 100 }}>
                                    <input type="number" min={0.001} step={0.001} value={comp.pzUV}
                                        onChange={e => updateCompPzUV(comp.id, parseFloat(e.target.value) || 1)}
                                        className="form-input" />
                                </div>
                                <ValidationError message={fieldErrors[`${comp.id}-pzuv`]} visible={!!fieldErrors[`${comp.id}-pzuv`]} />
                            </div>
                        </div>
                    </div>
                    <IngSearch onAdd={(ing) => addRowToComp(comp.id, ing)} db={db} loading={loadingDB} error={dbError} />
                    {comp.rows.map(row => {
                        const gramsPerPiece = comp.pzUV > 1 ? row.grams / comp.pzUV : null;
                        const fabbReale = row.grams / ((row.resa || 100) / 100);
                        const costoIng = (row.eurKg / 1000) * fabbReale;
                        return (
                            <div key={row.id} style={{ paddingBottom: 8, marginBottom: 6, borderBottom: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 100 }}>{row.ing.nome}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <InfoTooltip text="Grammi dell'ingrediente nella ricetta totale, per tutti i pezzi" />
                                        </div>
                                        <div style={{ width: 80 }}>
                                            <input type="number" min={0} value={row.grams}
                                                onChange={e => updateGrams(comp.id, row.id, parseFloat(e.target.value) || 0)}
                                                className="form-input" />
                                        </div>
                                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>g</span>
                                        <ValidationError message={fieldErrors[`${comp.id}-${row.id}-grams`]} visible={!!fieldErrors[`${comp.id}-${row.id}-grams`]} />
                                    </div>
                                    {gramsPerPiece !== null && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>({gramsPerPiece.toFixed(1)}g/pz)</span>}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>€/kg</span>
                                        <InfoTooltip text="Costo dell'ingrediente per kg, IVA esclusa. Inserire 0 se non si vuole calcolare il costo." />
                                        {/* mod 5: allow zero; mod 6: 150px width for better readability */}
                                        <input type="number" min={0} step={0.01}
                                            value={row.eurKg === 0 || row.eurKg ? row.eurKg : ''}
                                            onChange={e => updateEurKg(comp.id, row.id, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                            className="form-input" style={{ width: 150 }} />
                                        <ValidationError message={fieldErrors[`${comp.id}-${row.id}-eurkgs`]} visible={!!fieldErrors[`${comp.id}-${row.id}-eurkgs`]} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Resa%</span>
                                        <InfoTooltip text="Percentuale di prodotto effettivamente utilizzabile dopo pulizia o lavorazione. Es: 70 per verdure con scarti (foglie, bucce). Default: 100" />
                                        {/* mod 6: 150px width for better readability */}
                                        <input type="number" min={1} max={100} step={1} value={row.resa || 100}
                                            onChange={e => updateResa(comp.id, row.id, parseFloat(e.target.value) || 100)}
                                            className="form-input" style={{ width: 150 }} />
                                        <ValidationError message={fieldErrors[`${comp.id}-${row.id}-resa`]} visible={!!fieldErrors[`${comp.id}-${row.id}-resa`]} />
                                    </div>
                                    <button onClick={() => removeRow(comp.id, row.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#e53e3e', fontSize: 16 }}>✕</button>
                                </div>
                                {(row.eurKg > 0) && (
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3, marginLeft: 4 }}>
                                        Fabb. reale: {fabbReale.toFixed(1)}g — Costo: <strong style={{ color: 'var(--color-orange)' }}>{costoIng.toFixed(4)} €</strong>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {comp.rows.length > 0 && (
                        <div style={{ marginTop: 8, padding: '6px 0', borderTop: '2px solid var(--color-border)', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, fontWeight: 600 }}>
                            <span>Totale: {comp.rows.reduce((s, r) => s + r.grams, 0).toFixed(0)} g</span>
                            {comp.pzUV > 1 && <span>Per pezzo: {(comp.rows.reduce((s, r) => s + r.grams, 0) / comp.pzUV).toFixed(1)} g</span>}
                        </div>
                    )}
                </div>
            ))}

            {components.length < 4 && (
                <button className="btn btn-outline" style={{ marginBottom: 16 }} onClick={addComp}>+ Aggiungi componente</button>
            )}

            {/* Additives — mod 8: chip-based from DB ONLY (no free text) */}
            <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>⚗️ Additivi <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-muted)' }}>(solo etichetta, non influenzano i calcoli)</span></h3>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10 }}>Seleziona gli additivi dal database:</div>
                <AdditiveSearch
                    chips={additiveChips}
                    onAdd={ing => setAdditiveChips(prev => [...prev, ing])}
                    onRemove={i => setAdditiveChips(prev => prev.filter((_, j) => j !== i))}
                    db={db}
                />
            </div>

            </div>{/* end INSERIMENTO RICETTA wrapper */}

            {/* Weight + serving inputs */}
            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginTop: 0 }}>⚖️ Pesi e dati serving</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                            <label className="form-label" style={{ marginBottom: 0 }}>Peso prodotto finito (g)</label>
                            <InfoTooltip text="Peso del prodotto dopo cottura, disidratazione o evaporazione di acqua. Deve essere inferiore o uguale al peso crudo. Questo valore viene utilizzato per calcolare i nutrienti per 100g del prodotto finito." />
                        </div>
                        <input type="number" min={0} placeholder={`max ${totalGramsRaw.toFixed(0)}g`} value={finishedWeight}
                            onChange={e => handleFW(e.target.value)}
                            className="form-input" style={fwWarning ? { borderColor: '#e53e3e' } : {}} />
                        <ValidationError message={fieldErrors['finished-weight']} visible={!!fieldErrors['finished-weight']} />
                        {fwWarning && <div style={{ fontSize: 11, color: '#e53e3e', marginTop: 3 }}>⚠️ Il peso del prodotto finito non può essere superiore al peso del prodotto crudo ({totalGramsRaw.toFixed(0)}g). Inserire un valore uguale o inferiore.</div>}
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                            <label className="form-label" style={{ marginBottom: 0 }}>Peso specifico (g/ml)</label>
                            <InfoTooltip text="Inserisci il peso specifico SOLO per alimenti liquidi (bevande, vino, birra, succhi, latte, ecc.). Quando compilato, i valori nutrizionali verranno espressi su 100 ml anziché 100 g, e apparirà: 'Valori nutrizionali medi in 100 ml di prodotto'." />
                        </div>
                        <input type="number" min={0} step={0.01} placeholder="opzionale" value={specificGravity}
                            onChange={e => setSpecificGravity(e.target.value)}
                            className="form-input" />
                    </div>
                </div>

                {/* Serving grids per nation */}
                {([
                    { label: '🇪🇺 UE', fields: [['porzione', 'Porzione (g/ml)'], ['confezione', 'Confezione (g/ml)'], ['pezzo', 'Pezzo (g/ml)']], state: ue, setState: setUE },
                    { label: '🇺🇸 USA (CUP=240ml)', fields: [['cup', 'CUP 240ml (g)'], ['cucchiaio', 'Cucchiaio 15ml (g)'], ['serving', 'Serving Size (g/ml)'], ['confezione', 'Confezione/UV (g/ml)'], ['pezzo', 'Pezzo (g/ml)']], state: usa, setState: setUSA },
                    { label: '🇨🇦 Canada (CUP=250ml)', fields: [['cup', 'CUP 250ml (g)'], ['cucchiaio', 'Cucchiaio 15ml (g)'], ['serving', 'Serving Size (g/ml)'], ['confezione', 'Confezione/UV (g/ml)'], ['pezzo', 'Pezzo (g/ml)']], state: ca, setState: setCA },
                    { label: '🇦🇺 Australia', fields: [['serving', 'Serving Size (g/ml)'], ['confezione', 'Confezione/UV (g/ml)'], ['pezzo', 'Pezzo (g/ml)']], state: au, setState: setAU },
                    { label: '🌍 Paesi Arabi (CUP=240ml)', fields: [['cup', 'CUP 240ml (g)'], ['cucchiaio', 'Cucchiaio 15ml (g)'], ['serving', 'Serving Size (g/ml)'], ['confezione', 'Confezione/UV (g/ml)'], ['pezzo', 'Pezzo (g/ml)']], state: arabi, setState: setArabi },
                ] as const).map(({ label, fields, state, setState }) => {
                    const isOpen = servingOpen[label];
                    return (
                        <div key={label} style={{ marginBottom: 14 }}>
                            <div
                                onClick={() => setServingOpen(prev => ({ ...prev, [label]: !prev[label] }))}
                                style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: isOpen ? 8 : 0, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', userSelect: 'none' }}
                            >
                                {label} <span style={{ fontSize: 12, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                            </div>
                            {isOpen && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                                    {(fields as readonly (readonly [string, string])[]).map(([k, lbl]) => (
                                        <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                            <label className="form-label">{lbl}</label>
                                            <input type="number" min={0} placeholder="—" value={(state as Record<string, number | undefined>)[k] || ''}
                                                onChange={e => setState((prev: ServingSizesNation | UEServing) => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                className="form-input" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Allergens */}
            <div style={{ marginBottom: 20 }}>
                <AllergenSection present={presentAllergens} cross={crossAllergens} />
            </div>

            {/* Cost summary card */}
            {allRows.length > 0 && (() => {
                let costoTotale = 0;
                let fabbRealeTotale = 0;
                for (const c of components) {
                    for (const r of c.rows) {
                        const fabb = r.grams / ((r.resa || 100) / 100);
                        costoTotale += (r.eurKg / 1000) * fabb;
                        fabbRealeTotale += fabb;
                    }
                }
                const costPerKg = pesoTotale > 0 ? (costoTotale / pesoTotale) * 1000 : 0;
                if (costoTotale === 0) return null;
                return (
                    <div style={{ marginBottom: 20, background: 'linear-gradient(135deg,rgba(255,126,46,0.06),rgba(12,19,38,0.02))', border: '1.5px solid var(--color-orange)', borderRadius: 12, padding: '14px 20px' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>💰 Riepilogo Costi Ingredienti</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                            <div style={{ background: 'white', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Costo ingredienti per pezzo</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-orange)', marginTop: 4 }}>{costoTotale.toFixed(3)} €</div>
                            </div>
                            <div style={{ background: 'white', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Costo ingredienti per kg</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-navy)', marginTop: 4 }}>{costPerKg.toFixed(3)} €</div>
                            </div>
                            <div style={{ background: 'white', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Fabbisogno reale totale</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: '#555', marginTop: 4 }}>{fabbRealeTotale.toFixed(1)} g</div>
                            </div>
                        </div>
                    </div>
                );
            })()}


            {allRows.length > 0 && (
                <div style={{ marginTop: 0 }}>
                    {/* Tabs */}
                    <div className="nation-tab-bar" style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
                        {(['UE', 'USA', 'Canada', 'Australia', 'Arabi'] as NationTab[]).map(t => {
                            const labels: Record<NationTab, string> = { UE: '🇪🇺 UE', USA: '🇺🇸 USA', Canada: '🇨🇦 Canada', Australia: '🇦🇺 Australia', Arabi: '🌍 Arabi' };
                            return (
                                <button key={t}
                                    className={`btn ${activeTab === t ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ fontSize: 14, fontWeight: 600, padding: '8px 16px' }}
                                    onClick={() => setActiveTab(t)}>
                                    {labels[t]}
                                </button>
                            );
                        })}
                        {/* UI-12: Toggle for optional nutrients (only on UE tab) */}
                        {activeTab === 'UE' && (
                            <button
                                className={`btn ${showOptionals ? 'btn-primary' : 'btn-outline'}`}
                                style={{ fontSize: 13, fontWeight: 600, padding: '8px 14px', marginLeft: 'auto' }}
                                onClick={() => setShowOptionals(!showOptionals)}>
                                {showOptionals ? '👁️ Nascondi facoltativi' : '👀 Mostra facoltativi'}
                            </button>
                        )}
                    </div>

                    <div ref={tableRef} style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: 20 }}>
                        {activeTab === 'UE' && <TabUE p={per100g} ue={ue} specificGravity={parseFloat(specificGravity) || 0} full={showOptionals} />}
                        {activeTab === 'USA' && <TabUSA p={per100g} usa={usa} subTab={subTab} setSubTab={setSubTab} full={false} />}
                        {activeTab === 'Canada' && <TabCanada p={per100g} ca={ca} subTab={subTab} setSubTab={setSubTab} full={false} />}
                        {activeTab === 'Australia' && <TabAustralia p={per100g} au={au} showDI={auShowDI} setShowDI={setAuShowDI} full={false} />}
                        {activeTab === 'Arabi' && <TabArabi p={per100g} arabi={arabi} full={false} />}
                    </div>
                </div>
            )}

            {allRows.length > 0 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" onClick={handleDownloadPNG}>🖼️ Scarica tabella PNG</button>
                    <button className="btn btn-primary" onClick={handleDownloadEtichettaPDF}>📋 Scarica Scheda Etichetta PDF</button>
                    <button className="btn btn-primary" onClick={handlePDF}>📄 Scarica PDF completo</button>
                    <button className="btn btn-primary" onClick={handleSave} style={{ background: 'var(--color-navy)' }}>💾 Salva in archivio</button>
                </div>
            )}
        </div>
    );
}

// ─── Allergen & Ingredient sections ──────────────────────────────────────────
function AllergenSection({ present, cross }: { present: string[]; cross: string[] }) {
    if (present.length === 0 && cross.length === 0) return <div />;
    return (
        <div className="card">
            <h3 style={{ marginTop: 0 }}>⚠️ Allergeni</h3>
            {present.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#c53030', marginBottom: 4 }}>CONTIENE:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {present.map(a => <span key={a} style={{ background: 'rgba(229,62,62,0.1)', color: '#c53030', fontWeight: 700, padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{a}</span>)}
                    </div>
                </div>
            )}
            {cross.length > 0 && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#dd6b20', marginBottom: 4 }}>PUÒ CONTENERE TRACCE DI:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {cross.map(a => <span key={a} style={{ background: 'rgba(221,107,32,0.1)', color: '#dd6b20', fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{a}</span>)}
                    </div>
                </div>
            )}
        </div>
    );
}
// ─── Shared table styling ───────────────────────────────────────────────────
const TS = {
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

// ─── TabUE ──────────────────────────────────────────────────────────────────
function TabUE({ p, ue, specificGravity, full }: { p: CalcResult; ue: UEServing; specificGravity?: number; full?: boolean }) {
    const por = ue.porzione ? scaleResult(p, ue.porzione) : null;
    const conf = ue.confezione ? scaleResult(p, ue.confezione) : null;
    const pez = ue.pezzo ? scaleResult(p, ue.pezzo) : null;
    const hasExtra = (por || conf || pez) && full;

    interface UERow { label: string; indent?: boolean; bold?: boolean; per100: string; portion?: string; conf?: string; pezzo?: string; arPct?: string | null; isOptional?: boolean; }
    // Tabella a schermo: SOLO VALORI OBBLIGATORI, PDF o full=true: tutto
    const rows: UERow[] = [
        { label: 'Energia', bold: true, per100: `${rUE_energy(p.energyKj)} kJ / ${rUE_energy(p.energyKcal)} kcal`, portion: por ? `${rUE_energy(por.energyKj)} kJ / ${rUE_energy(por.energyKcal)} kcal` : undefined, conf: conf ? `${rUE_energy(conf.energyKj)} kJ / ${rUE_energy(conf.energyKcal)} kcal` : undefined, pezzo: pez ? `${rUE_energy(pez.energyKj)} kJ / ${rUE_energy(pez.energyKcal)} kcal` : undefined, arPct: `${Math.round(p.energyKcal / AR_UE.energyKcal * 100)}%` },
        { label: 'Grassi', bold: true, per100: `${rUE_macro(p.grassi)} g`, portion: por ? `${rUE_macro(por.grassi)} g` : undefined, conf: conf ? `${rUE_macro(conf.grassi)} g` : undefined, pezzo: pez ? `${rUE_macro(pez.grassi)} g` : undefined, arPct: `${Math.round(p.grassi / AR_UE.grassi * 100)}%` },
        { label: 'di cui acidi grassi saturi', indent: true, per100: `${rUE_sat(p.saturi)} g`, portion: por ? `${rUE_sat(por.saturi)} g` : undefined, conf: conf ? `${rUE_sat(conf.saturi)} g` : undefined, pezzo: pez ? `${rUE_sat(pez.saturi)} g` : undefined, arPct: `${Math.round(p.saturi / AR_UE.saturi * 100)}%` },
        { label: 'di cui acidi grassi monoinsaturi', indent: true, per100: `${rUE_sat(p.monoins)} g`, portion: por ? `${rUE_sat(por.monoins)} g` : undefined, conf: conf ? `${rUE_sat(conf.monoins)} g` : undefined, pezzo: pez ? `${rUE_sat(pez.monoins)} g` : undefined, arPct: '—', isOptional: true },
        { label: 'di cui acidi grassi polinsaturi', indent: true, per100: `${rUE_sat(p.polins)} g`, portion: por ? `${rUE_sat(por.polins)} g` : undefined, conf: conf ? `${rUE_sat(conf.polins)} g` : undefined, pezzo: pez ? `${rUE_sat(pez.polins)} g` : undefined, arPct: '—', isOptional: true },
        { label: 'Carboidrati', bold: true, per100: `${rUE_macro(p.carboidrati)} g`, portion: por ? `${rUE_macro(por.carboidrati)} g` : undefined, conf: conf ? `${rUE_macro(conf.carboidrati)} g` : undefined, pezzo: pez ? `${rUE_macro(pez.carboidrati)} g` : undefined, arPct: `${Math.round(p.carboidrati / AR_UE.carboidrati * 100)}%` },
        { label: 'di cui zuccheri', indent: true, per100: `${rUE_macro(p.zuccheri)} g`, portion: por ? `${rUE_macro(por.zuccheri)} g` : undefined, conf: conf ? `${rUE_macro(conf.zuccheri)} g` : undefined, pezzo: pez ? `${rUE_macro(pez.zuccheri)} g` : undefined, arPct: `${Math.round(p.zuccheri / AR_UE.zuccheri * 100)}%` },
        { label: 'di cui polioli', indent: true, per100: `${rUE_macro(p.polioli)} g`, portion: por ? `${rUE_macro(por.polioli)} g` : undefined, conf: conf ? `${rUE_macro(conf.polioli)} g` : undefined, pezzo: pez ? `${rUE_macro(pez.polioli)} g` : undefined, arPct: '—', isOptional: true },
        { label: 'di cui amido', indent: true, per100: `${rUE_macro(p.amido)} g`, portion: por ? `${rUE_macro(por.amido)} g` : undefined, conf: conf ? `${rUE_macro(conf.amido)} g` : undefined, pezzo: pez ? `${rUE_macro(pez.amido)} g` : undefined, arPct: '—', isOptional: true },
        { label: 'Fibre', bold: true, per100: `${rUE_macro(p.fibre)} g`, portion: por ? `${rUE_macro(por.fibre)} g` : undefined, conf: conf ? `${rUE_macro(conf.fibre)} g` : undefined, pezzo: pez ? `${rUE_macro(pez.fibre)} g` : undefined, arPct: `${Math.round(p.fibre / AR_UE.fibre * 100)}%`, isOptional: p.fibre === 0 },
        { label: 'Proteine', bold: true, per100: `${rUE_macro(p.proteine)} g`, portion: por ? `${rUE_macro(por.proteine)} g` : undefined, conf: conf ? `${rUE_macro(conf.proteine)} g` : undefined, pezzo: pez ? `${rUE_macro(pez.proteine)} g` : undefined, arPct: `${Math.round(p.proteine / AR_UE.proteine * 100)}%` },
        { label: 'Sale', bold: true, per100: `${rUE_sale(p.sale)} g`, portion: por ? `${rUE_sale(por.sale)} g` : undefined, conf: conf ? `${rUE_sale(conf.sale)} g` : undefined, pezzo: pez ? `${rUE_sale(pez.sale)} g` : undefined, arPct: `${Math.round(p.sale / AR_UE.sale * 100)}%` },
    ].filter(r => full || !r.isOptional);

    const micros = [
        { label: 'Vitamina A', val: p.vitA_eq, ref: AR_UE.vitA_eq, unit: 'µg', fmt: rUE_micro3sig },
        { label: 'Vitamina D', val: p.vitD, ref: AR_UE.vitD, unit: 'µg', fmt: rUE_micro3sig },
        { label: 'Vitamina E', val: p.vitE, ref: AR_UE.vitE, unit: 'mg', fmt: rUE_micro3sig },
        { label: 'Vitamina C', val: p.vitC, ref: AR_UE.vitC, unit: 'mg', fmt: rUE_micro3sig },
        { label: 'Vitamina B1 (Tiamina)', val: p.vitB1, ref: AR_UE.vitB1, unit: 'mg', fmt: rUE_micro3sig },
        { label: 'Vitamina B2 (Riboflavina)', val: p.vitB2, ref: AR_UE.vitB2, unit: 'mg', fmt: rUE_micro3sig },
        { label: 'Vitamina B3 (Niacina)', val: p.vitB3, ref: AR_UE.vitB3, unit: 'mg', fmt: rUE_micro3sig },
        { label: 'Vitamina B6', val: p.vitB6, ref: AR_UE.vitB6, unit: 'mg', fmt: rUE_micro3sig },
        { label: 'Vitamina B9 (Folati)', val: p.vitB9, ref: AR_UE.vitB9, unit: 'µg', fmt: rUE_micro3sig },
        { label: 'Vitamina B12', val: p.vitB12, ref: AR_UE.vitB12, unit: 'µg', fmt: rUE_micro3sig },
        { label: 'Potassio', val: p.potassio, ref: AR_UE.potassio, unit: 'mg', fmt: rUE_micro3sig },
        { label: 'Calcio', val: p.calcio, ref: AR_UE.calcio, unit: 'mg', fmt: rUE_micro3sig },
        { label: 'Fosforo', val: p.fosforo, ref: AR_UE.fosforo, unit: 'mg', fmt: rUE_micro3sig },
        { label: 'Magnesio', val: p.magnesio, ref: AR_UE.magnesio, unit: 'mg', fmt: rUE_micro3sig },
        { label: 'Ferro', val: p.ferro, ref: AR_UE.ferro, unit: 'mg', fmt: rUE_micro2sig },
        { label: 'Zinco', val: p.zinco, ref: AR_UE.zinco, unit: 'mg', fmt: rUE_micro2sig },
    ].filter(m => full || (m.val / m.ref * 100 >= 15));
    return (
        <div data-table-export style={{ background: 'white', padding: full ? 20 : 0, borderRadius: 8 }}>
            <div style={{ maxWidth: 500 }}>
                {/* EU official header - 2 column layout */}
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
                                Valori nutrizionali medi per 100 {specificGravity && specificGravity > 0 ? 'ml' : 'g'} di prodotto
                            </td>
                            <td style={{ background: '#f5f5f5', border: '1px solid #999', padding: '5px 10px' }}></td>
                        </tr>
                    </thead>
                </table>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ ...TS.table, border: '2px solid #999', borderTop: '1px solid #999', width: '100%' }}>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #ccc' }}>
                                    <td style={{
                                        padding: '6px 10px',
                                        fontSize: r.bold ? 13 : 12,
                                        fontWeight: r.bold ? 700 : r.indent ? 400 : 400,
                                        paddingLeft: r.indent ? 24 : 10,
                                        color: r.label === 'fibre' ? '#0066cc' : 'inherit',
                                        borderRight: '1px solid #999',
                                        width: 'auto'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <span>{r.label}</span>
                                            <span style={{ marginLeft: 20, fontWeight: 600 }}>{r.per100}</span>
                                        </div>
                                    </td>
                                    <td style={{
                                        padding: '6px 10px',
                                        fontSize: 12,
                                        fontWeight: r.bold ? 700 : 400,
                                        textAlign: 'center',
                                        width: '100px'
                                    }}>
                                        {r.arPct}
                                    </td>
                                </tr>
                            ))}
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

// ─── TabUSA ─────────────────────────────────────────────────────────────────
function TabUSA({ p, usa, subTab, setSubTab, full }: { p: CalcResult; usa: ServingSizesNation; subTab: SubTab; setSubTab: (t: SubTab) => void; full?: boolean }) {
    const svG = usa.serving || 0;
    // Always scale to serving size when available (FDA compliance: label shows per-serving values)
    const sv = svG > 0 ? scaleResult(p, svG) : null;
    const d = sv || p; // data source: serving if available, else per-100g
    const row = (label: string, val: number, dv: number, unit: string, sub?: boolean, bold?: boolean, isOptional?: boolean) => ({ label, val, dv, unit, sub, bold, isOptional });
    const usaRows = [
        row('Total Fat', d.grassi, DV_USA.grassi, 'g', false, true),
        row('Saturated Fat', d.saturi, DV_USA.saturi, 'g', true),
        row('Trans Fat', d.trans, 0, 'g', true),
        row('Polyunsaturated Fat', d.polins, 0, 'g', true, false, true),
        row('Monounsaturated Fat', d.monoins, 0, 'g', true, false, true),
        row('Cholesterol', d.colesterolo, DV_USA.colesterolo, 'mg', false, true),
        row('Sodium', d.sodio_mg, DV_USA.sodio_mg, 'mg', false, true),
        row('Total Carbohydrate', d.carboidratiTot, DV_USA.carboidratiTot, 'g', false, true),
        row('Dietary Fiber', d.fibre, DV_USA.fibre, 'g', true),
        row('Total Sugars', d.zuccheri, 0, 'g', true),
        row('Includes Added Sugars', d.zuccheri_agg, DV_USA.zuccheri_agg, 'g', true),
        row('Protein', d.proteine, DV_USA.proteine, 'g', false, true),
    ].filter(r => full || !r.isOptional);

    const vitamins = full ? [
        { label: 'Vitamin D', val: d.vitD, dv: DV_USA.vitD, unit: 'mcg' },
        { label: 'Calcium', val: d.calcio, dv: DV_USA.calcio, unit: 'mg' },
        { label: 'Iron', val: d.ferro, dv: DV_USA.ferro, unit: 'mg' },
        { label: 'Potassium', val: d.potassio, dv: DV_USA.potassio, unit: 'mg' },
    ] : [];

    return (
        <div data-table-export style={{ background: 'white', padding: full ? 20 : 0, borderRadius: 8 }}>
            {!full && (
                <>
                    <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>Etichetta Nutrizionale (USA)</h3>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        {(['verticale', 'orizzontale', 'lineare'] as SubTab[]).map(t => (
                            <button key={t} onClick={() => setSubTab(t)} className={`btn ${subTab === t ? 'btn-accent' : 'btn-outline'}`} style={{ fontSize: 11, padding: '5px 10px' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                        ))}
                    </div>
                </>
            )}

            {/* Vertical layout (default) */}
            {subTab === 'verticale' && (
                <div style={{ maxWidth: 400, border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, borderBottom: '1px solid #000', paddingBottom: 4 }}>Nutrition Facts</div>
                    {svG > 0 && <div style={{ fontSize: 13 }}>{Math.round(100 / svG)} servings per container</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '10px solid #000', paddingBottom: 4 }}>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>Serving size</div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{svG > 0 ? `${svG} g` : '(—)'}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 2 }}>Amount per serving</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '5px solid #000' }}>
                        <div style={{ fontSize: 28, fontWeight: 900 }}>Calories</div>
                        <div style={{ fontSize: 36, fontWeight: 900 }}>{rUSA_energy(d.energyKcal)}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 10, borderBottom: '1px solid #000', paddingBottom: 2 }}>% Daily Value*</div>
                    {usaRows.map((r, i) => {
                        const pct = r.dv > 0 ? rUSA_pct(r.val, r.dv) : null;
                        const fmtd = r.unit === 'mg' ? `${rUSA_mg5(r.val)} mg` : `${rUSA_g(r.val)} g`;
                        return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingLeft: r.sub ? 16 : 0, fontSize: r.bold ? 13 : 12, fontWeight: r.bold ? 700 : 400 }}>
                                <span>{r.label} {!r.bold || r.sub ? fmtd : ''}</span>
                                <span>{pct !== null ? `${pct}%` : ''}</span>
                            </div>
                        );
                    })}
                    {vitamins.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', fontSize: 12 }}>
                            <span>{m.label} {m.val.toFixed(1)} {m.unit}</span>
                            <span>{rUSA_pct(m.val, m.dv)}%</span>
                        </div>
                    ))}
                    <div style={{ fontSize: 9, borderTop: '3px solid #000', paddingTop: 4, marginTop: 4 }}>
                        * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
                    </div>
                </div>
            )}

            {/* Horizontal layout */}
            {subTab === 'orizzontale' && (
                <div style={{ border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, borderBottom: '3px solid #000', paddingBottom: 4, marginBottom: 8 }}>Nutrition Facts</div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ flex: '0 0 auto' }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Serving size: {svG > 0 ? `${svG} g` : '—'}</div>
                            <div style={{ fontSize: 28, fontWeight: 900 }}>Calories {rUSA_energy(d.energyKcal)}</div>
                        </div>
                        <div style={{ flex: 1, borderLeft: '1px solid #000', paddingLeft: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                                {usaRows.filter(r => r.dv > 0).map((r, i) => (
                                    <div key={i} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700 }}>{r.dv > 0 ? `${rUSA_pct(r.val, r.dv)}%` : ''}</div>
                                        <div style={{ fontSize: 10 }}>{r.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Linear layout */}
            {subTab === 'lineare' && (
                <div style={{ border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif', fontSize: 11 }}>
                    <span style={{ fontWeight: 900, fontSize: 14 }}>Nutrition Facts </span>
                    {svG > 0 && <span>Serving size {svG} g | </span>}
                    <span>Calories {rUSA_energy(d.energyKcal)} | </span>
                    {usaRows.filter(r => r.unit !== undefined).map((r, i) => (
                        <span key={i}><span style={{ fontWeight: 700 }}>{r.label}</span> {r.unit === 'mg' ? `${rUSA_mg5(r.val)} mg` : `${rUSA_g(r.val)} g`}{r.dv > 0 ? ` (${rUSA_pct(r.val, r.dv)}% DV)` : ''} | </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── TabCanada ──────────────────────────────────────────────────────────────
function TabCanada({ p, ca, subTab, setSubTab, full }: { p: CalcResult; ca: ServingSizesNation; subTab: SubTab; setSubTab: (t: SubTab) => void; full?: boolean }) {
    const svG = ca.serving || 0;
    const sv = svG > 0 ? scaleResult(p, svG) : null;
    const d = sv || p;
    const satTrans = d.saturi + d.trans;

    return (
        <div data-table-export style={{ background: 'white', padding: full ? 20 : 0, borderRadius: 8 }}>
            {!full && (
                <>
                    <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>Etichetta Nutrizionale (Canada)</h3>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        {(['verticale', 'orizzontale', 'lineare'] as SubTab[]).map(t => (
                            <button key={t} onClick={() => setSubTab(t)} className={`btn ${subTab === t ? 'btn-accent' : 'btn-outline'}`} style={{ fontSize: 11, padding: '5px 10px' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                        ))}
                    </div>
                </>
            )}

            {subTab === 'verticale' && (
                <div style={{ maxWidth: 420, border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* English */}
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 900 }}>Nutrition Facts</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '6px solid #000' }}>
                                <div><span style={{ fontWeight: 700 }}>Serving Size</span> {svG > 0 ? `${svG} g` : '—'}</div>
                            </div>
                            <div style={{ borderBottom: '4px solid #000' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900 }}>
                                    <span>Calories</span><span>{rCA_energy(d.energyKcal)}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 10 }}>% Daily Value*</div>
                            {[
                                { label: 'Fat', val: d.grassi, dv: DV_CA.grassi, fmt: rCA_fat, unit: 'g', bold: true },
                                { label: 'Saturated + Trans', val: satTrans, dv: DV_CA.satTrans, fmt: rCA_fat, unit: 'g', sub: true },
                                { label: 'Carbohydrate', val: d.carboidratiTot, dv: DV_CA.carboidratiTot, fmt: rCA_carb, unit: 'g', bold: true },
                                { label: 'Fibre', val: d.fibre, dv: DV_CA.fibre, fmt: rCA_carb, unit: 'g', sub: true },
                                { label: 'Sugars', val: d.zuccheri, dv: DV_CA.zuccheri, fmt: rCA_carb, unit: 'g', sub: true },
                                { label: 'Cholesterol', val: d.colesterolo, dv: 300, fmt: rCA_chol, unit: 'mg', bold: true },
                                { label: 'Sodium', val: d.sodio_mg, dv: DV_CA.sodio_mg, fmt: rCA_na, unit: 'mg', bold: true },
                                { label: 'Potassium', val: d.potassio, dv: DV_CA.potassio, fmt: rCA_na, unit: 'mg', bold: true, isOptional: true },
                                { label: 'Calcium', val: d.calcio, dv: DV_CA.calcio, fmt: rCA_na, unit: 'mg', bold: true, isOptional: true },
                                { label: 'Iron', val: d.ferro, dv: DV_CA.ferro, fmt: rCA_iron, unit: 'mg', bold: true, isOptional: true },
                            ].filter(r => full || !r.isOptional).map((r, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #999', paddingLeft: r.sub ? 12 : 0, fontSize: r.bold ? 13 : 11, fontWeight: r.bold ? 700 : 400 }}>
                                    <span>{r.label} {r.fmt(r.val)} {r.unit}</span>
                                    <span>{rCA_pct(r.val, r.dv)}%</span>
                                </div>
                            ))}
                        </div>
                        {/* French */}
                        <div style={{ borderLeft: '1px solid #000', paddingLeft: 8 }}>
                            <div style={{ fontSize: 24, fontWeight: 900 }}>Valeur nutritive</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '6px solid #000' }}>
                                <div><span style={{ fontWeight: 700 }}>Portion</span> {svG > 0 ? `${svG} g` : '—'}</div>
                            </div>
                            <div style={{ borderBottom: '4px solid #000' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900 }}>
                                    <span>Calories</span><span>{rCA_energy(d.energyKcal)}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 10 }}>% valeur quotidienne*</div>
                            {[
                                { label: 'Lipides', val: d.grassi, dv: DV_CA.grassi, fmt: rCA_fat, unit: 'g', bold: true },
                                { label: 'Saturés + Trans', val: satTrans, dv: DV_CA.satTrans, fmt: rCA_fat, unit: 'g', sub: true },
                                { label: 'Glucides', val: d.carboidratiTot, dv: DV_CA.carboidratiTot, fmt: rCA_carb, unit: 'g', bold: true },
                                { label: 'Fibres', val: d.fibre, dv: DV_CA.fibre, fmt: rCA_carb, unit: 'g', sub: true },
                                { label: 'Sucres', val: d.zuccheri, dv: DV_CA.zuccheri, fmt: rCA_carb, unit: 'g', sub: true },
                                { label: 'Cholestérol', val: d.colesterolo, dv: 300, fmt: rCA_chol, unit: 'mg', bold: true },
                                { label: 'Sodium', val: d.sodio_mg, dv: DV_CA.sodio_mg, fmt: rCA_na, unit: 'mg', bold: true },
                                { label: 'Potassium', val: d.potassio, dv: DV_CA.potassio, fmt: rCA_na, unit: 'mg', bold: true, isOptional: true },
                                { label: 'Calcium', val: d.calcio, dv: DV_CA.calcio, fmt: rCA_na, unit: 'mg', bold: true, isOptional: true },
                                { label: 'Fer', val: d.ferro, dv: DV_CA.ferro, fmt: rCA_iron, unit: 'mg', bold: true, isOptional: true },
                            ].filter(r => full || !r.isOptional).map((r, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #999', paddingLeft: r.sub ? 12 : 0, fontSize: r.bold ? 13 : 11, fontWeight: r.bold ? 700 : 400 }}>
                                    <span>{r.label} {r.fmt(r.val)} {r.unit}</span>
                                    <span>{rCA_pct(r.val, r.dv)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ fontSize: 9, borderTop: '1px solid #000', marginTop: 6, paddingTop: 4 }}>
                        * 5% or less is a little, 15% or more is a lot / 5% ou moins c'est peu, 15% ou plus c'est beaucoup
                    </div>
                </div>
            )}

            {subTab === 'orizzontale' && (
                <div style={{ border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ display: 'flex', gap: 16, borderBottom: '3px solid #000', paddingBottom: 8, marginBottom: 8 }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 900 }}>Nutrition Facts / Valeur nutritive</div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Serving / Portion: {svG > 0 ? `${svG} g` : '—'}</div>
                            <div style={{ fontSize: 22, fontWeight: 900 }}>Calories {rCA_energy(d.energyKcal)}</div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, fontSize: 12 }}>
                        {[
                            { en: 'Fat', fr: 'Lipides', val: d.grassi, dv: DV_CA.grassi, fmt: rCA_fat, unit: 'g' },
                            { en: 'Carbs', fr: 'Glucides', val: d.carboidratiTot, dv: DV_CA.carboidratiTot, fmt: rCA_carb, unit: 'g' },
                            { en: 'Sodium', fr: 'Sodium', val: d.sodio_mg, dv: DV_CA.sodio_mg, fmt: rCA_na, unit: 'mg' },
                            { en: 'Calcium', fr: 'Calcium', val: d.calcio, dv: DV_CA.calcio, fmt: rCA_na, unit: 'mg' },
                            { en: 'Iron', fr: 'Fer', val: d.ferro, dv: DV_CA.ferro, fmt: rCA_iron, unit: 'mg' },
                        ].map((m, i) => (
                            <div key={i} style={{ textAlign: 'center', borderLeft: '1px solid #ccc', paddingLeft: 8 }}>
                                <div style={{ fontSize: 18, fontWeight: 900 }}>{rCA_pct(m.val, m.dv)}%</div>
                                <div style={{ fontSize: 11 }}>{m.en} / {m.fr}</div>
                                <div style={{ fontSize: 11 }}>{m.fmt(m.val)} {m.unit}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {subTab === 'lineare' && (
                <div style={{ border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif', fontSize: 11 }}>
                    <span style={{ fontWeight: 900, fontSize: 14 }}>Nutrition Facts / Valeur nutritive | </span>
                    {svG > 0 && <span>Serving / Portion {svG} g | </span>}
                    <span>Calories {rCA_energy(d.energyKcal)} | </span>
                    <span><b>Fat / Lipides</b> {rCA_fat(d.grassi)} g ({rCA_pct(d.grassi, DV_CA.grassi)}% DV) | </span>
                    <span><b>Carbs / Glucides</b> {rCA_carb(d.carboidratiTot)} g ({rCA_pct(d.carboidratiTot, DV_CA.carboidratiTot)}% DV) | </span>
                    <span><b>Sodium</b> {rCA_na(d.sodio_mg)} mg ({rCA_pct(d.sodio_mg, DV_CA.sodio_mg)}% DV)</span>
                </div>
            )}
        </div>
    );
}

// ─── TabAustralia ─────────────────────────────────────────────────────────────
function TabAustralia({ p, au, showDI, setShowDI, full }: { p: CalcResult; au: ServingSizesNation; showDI: boolean; setShowDI: (v: boolean) => void; full?: boolean }) {
    const svG = au.serving || 0;
    const sv = (svG > 0 && (full || true)) ? scaleResult(p, svG) : null; // Australia always shows per serving if possible
    const auRows: { label: string; per100kj?: string; per100kcal?: string; svKj?: string; svKcal?: string; di?: string; g100?: string; gSv?: string; isCal?: boolean; isOptional?: boolean }[] = [];

    if (sv) {
        const diPct = (val: number, ref: number) => `${Math.round(val / ref * 100)}%`;
        auRows.push({ label: 'Energy', svKj: rAU_kj(sv.energyKj), svKcal: rAU_kcal(sv.energyKcal), di: diPct(sv.energyKj, DV_AU.energyKj), g100: `${rAU_kj(p.energyKj)} kJ`, isCal: true });
        [
            { label: 'Protein', svVal: sv.proteine, p100: p.proteine, ref: DV_AU.proteine },
            { label: 'Fat — total', svVal: sv.grassi, p100: p.grassi, ref: DV_AU.grassi },
            { label: '— saturated', svVal: sv.saturi, p100: p.saturi, ref: DV_AU.saturi },
            { label: 'Protein', svVal: sv.proteine, p100: p.proteine, ref: DV_AU.proteine, isOptional: false },
            { label: 'Fat — total', svVal: sv.grassi, p100: p.grassi, ref: DV_AU.grassi, isOptional: false },
            { label: '— saturated', svVal: sv.saturi, p100: p.saturi, ref: DV_AU.saturi, isOptional: false },
            { label: 'Carbohydrate — total', svVal: sv.carboidrati, p100: p.carboidrati, ref: DV_AU.carboidrati, isOptional: false },
            { label: '— sugars', svVal: sv.zuccheri, p100: p.zuccheri, ref: DV_AU.zuccheri, isOptional: false },
            { label: 'Dietary Fibre', svVal: sv.fibre, p100: p.fibre, ref: DV_AU.fibre },
            { label: 'Sodium', svVal: sv.sodio_mg, p100: p.sodio_mg, ref: DV_AU.sodio_mg },
        ].forEach(r => {
            const unit = r.label.includes('Sodium') ? 'mg' : 'g';
            const fmtSv = unit === 'mg' ? rAU_mg(r.svVal) : rAU_g1(r.svVal);
            const fmt100 = unit === 'mg' ? rAU_mg(r.p100) : rAU_g1(r.p100);
            auRows.push({ label: r.label, gSv: `${fmtSv} ${unit}`, g100: `${fmt100} ${unit}`, di: diPct(r.svVal, r.ref) });
        });
    }

    return (
        <div data-table-export style={{ background: 'white', padding: full ? 20 : 0, borderRadius: 8 }}>
            {!full && (
                <>
                    <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>Etichetta Nutrizionale (Australia)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input type="checkbox" checked={showDI} onChange={e => setShowDI(e.target.checked)} />
                            Show % Daily Intake
                        </label>
                    </div>
                </>
            )}
            <h3 style={{ marginTop: 0 }}>Nutrition Information</h3>
            <div style={{ overflowX: 'auto' }}>
                <table style={TS.table}>
                    <thead>
                        <tr>
                            <th style={TS.th}>Nutrient</th>
                            <th style={TS.thR}>Servings per package: —</th>
                            <th style={TS.thR}>Average Quantity per Serving {svG > 0 ? `(${svG}g)` : ''}</th>
                            {showDI && <th style={TS.thR}>% Daily Intake per Serving†</th>}
                            <th style={TS.thR}>Average Quantity per 100 g</th>
                        </tr>
                    </thead>
                    <tbody>
                        {svG > 0 && sv ? auRows.map((r, i) => (
                            <tr key={i} style={i % 2 === 0 ? { background: '#f8f9fa' } : {}}>
                                <td style={r.label.startsWith('—') ? TS.tdSub : TS.tdB}>{r.label}</td>
                                <td style={TS.tdR}></td>
                                <td style={TS.tdR}>{r.isCal ? `${r.svKj} kJ (${r.svKcal} Cal)` : r.gSv}</td>
                                {showDI && <td style={TS.tdR}>{r.di}</td>}
                                <td style={TS.tdR}>{r.g100}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} style={{ ...TS.td, color: '#888' }}>Inserire il valore serving size sopra per calcolare le quantità per porzione.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {showDI && <p style={{ fontSize: 10, color: '#666', marginTop: 6 }}>† % Daily Intake based on an average adult diet of 8700 kJ. Your daily intake may be higher or lower depending on your energy needs.</p>}
        </div>
    );
}

// ─── TabArabi ────────────────────────────────────────────────────────────────
function TabArabi({ p, arabi, full }: { p: CalcResult; arabi: ServingSizesNation; full?: boolean }) {
    const svG = arabi.serving || 0;
    const sv = svG > 0 ? scaleResult(p, svG) : null;
    const hasExtra = full && sv;

    interface ARow { label: string; p100: string; pSv?: string; dv: string; indent?: boolean; bold?: boolean; }

    const arRows: ARow[] = [
        { label: 'Calories / السعرات الحرارية', bold: true, p100: rArabi_energy(p.energyKcal), pSv: sv ? rArabi_energy(sv.energyKcal) : undefined, dv: `${Math.round(p.energyKcal / AR_ARABI.energyKcal * 100)}%` },
        { label: 'Total Fat / إجمالي الدهون', bold: true, p100: `${rArabi_g(p.grassi)} g`, pSv: sv ? `${rArabi_g(sv.grassi)} g` : undefined, dv: `${Math.round(p.grassi / AR_ARABI.grassi * 100)}%` },
        { label: 'Saturated Fat / الدهون المشبعة', indent: true, p100: `${rArabi_g(p.saturi)} g`, pSv: sv ? `${rArabi_g(sv.saturi)} g` : undefined, dv: `${Math.round(p.saturi / AR_ARABI.saturi * 100)}%` },
        { label: 'Trans Fat / الدهون المتحولة', indent: true, p100: `${rArabi_g(p.trans)} g`, pSv: sv ? `${rArabi_g(sv.trans)} g` : undefined, dv: '—' },
        { label: 'Cholesterol / الكوليسترول', bold: true, p100: `${rArabi_mg(p.colesterolo)} mg`, pSv: sv ? `${rArabi_mg(sv.colesterolo)} mg` : undefined, dv: `${Math.round(p.colesterolo / 300 * 100)}%` },
        { label: 'Sodium / الصوديوم', bold: true, p100: `${rArabi_mg(p.sodio_mg)} mg`, pSv: sv ? `${rArabi_mg(sv.sodio_mg)} mg` : undefined, dv: `${Math.round(p.sodio_mg / AR_ARABI.sodio_mg * 100)}%` },
        { label: 'Total Carbohydrate / إجمالي الكربوهيدرات', bold: true, p100: `${rArabi_g(p.carboidratiTot)} g`, pSv: sv ? `${rArabi_g(sv.carboidratiTot)} g` : undefined, dv: `${Math.round(p.carboidratiTot / AR_ARABI.carboidrati * 100)}%` },
        { label: 'Dietary Fiber / الألياف الغذائية', indent: true, p100: `${rArabi_g(p.fibre)} g`, pSv: sv ? `${rArabi_g(sv.fibre)} g` : undefined, dv: `${Math.round(p.fibre / AR_ARABI.fibre * 100)}%` },
        { label: 'Total Sugars / إجمالي السكريات', indent: true, p100: `${rArabi_g(p.zuccheri)} g`, pSv: sv ? `${rArabi_g(sv.zuccheri)} g` : undefined, dv: '—' },
        { label: 'Includes Added Sugars / سكريات مضافة', indent: true, p100: `${rArabi_g(p.zuccheri_agg)} g`, pSv: sv ? `${rArabi_g(sv.zuccheri_agg)} g` : undefined, dv: `${Math.round(p.zuccheri_agg / 50 * 100)}%` },
        { label: 'Protein / البروتين', bold: true, p100: `${rArabi_g(p.proteine)} g`, pSv: sv ? `${rArabi_g(sv.proteine)} g` : undefined, dv: '—' },
    ];

    return (
        <div data-table-export style={{ background: 'white', padding: full ? 20 : 0, borderRadius: 8 }}>
            {!full && <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>Etichetta Nutrizionale (Gulf/Arabi)</h3>}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ ...TS.table, border: full ? '1px solid #000' : 'none' }}>
                    <thead>
                        <tr style={{ background: 'var(--color-navy)', color: 'white' }}>
                            <th style={{ ...TS.th, background: 'inherit' }}>Nutrients / العناصر الغذائية</th>
                            <th style={{ ...TS.thR, background: 'inherit' }}>per 100 g</th>
                            {hasExtra && sv && <th style={{ ...TS.thR, background: 'inherit' }}>Serving ({svG}g)</th>}
                            <th style={{ ...TS.thR, background: 'inherit' }}>%DV*</th>
                        </tr>
                    </thead>
                    <tbody>
                        {arRows.map((r, i) => (
                            <tr key={i} style={i % 2 === 0 ? { background: '#f8f9fa' } : {}}>
                                <td style={r.indent ? TS.tdSub : r.bold ? TS.tdB : TS.td}>{r.label}</td>
                                <td style={r.bold ? TS.tdBR : TS.tdR}>{r.p100}</td>
                                {hasExtra && sv && <td style={TS.tdR}>{r.pSv || '—'}</td>}
                                <td style={TS.tdR}>{r.dv}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p style={{ fontSize: 10, color: '#666', marginTop: 6 }}>* % DV based on a 2,000 calorie diet.</p>
        </div>
    );
}
