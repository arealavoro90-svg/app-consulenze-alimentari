import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Salad, ClipboardList, Globe, Archive } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useArchive } from '../../hooks/useArchive';
import { CalcoloTab } from './mobile/CalcoloTab';
import { TabellaTab } from './mobile/TabellaTab';
import { RiepilogoTab } from './mobile/RiepilogoTab';
import { ArchivioTab } from './mobile/ArchivioTab';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { readBridge } from './sessionBridge';

// ─── DB type ──────────────────────────────────────────────────────────────────
export interface DBIngredient {
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
    categoria?: string;
    // Allergeni presenti
    all_glutine?: boolean; all_grano?: boolean; all_crostacei?: boolean;
    all_uova?: boolean; all_pesci?: boolean; all_arachidi?: boolean;
    all_soia?: boolean; all_latte?: boolean; all_frutta_guscio?: boolean;
    all_anacardi?: boolean; all_solfiti?: boolean; all_lupini?: boolean;
    all_molluschi?: boolean;
    // Allergeni tracce (cross-contaminazione)
    cross_glutine?: boolean; cross_grano?: boolean; cross_crostacei?: boolean;
    cross_uova?: boolean; cross_pesci?: boolean; cross_arachidi?: boolean;
    cross_soia?: boolean; cross_latte?: boolean; cross_frutta_guscio?: boolean;
    cross_anacardi?: boolean; cross_sedano?: boolean; cross_senape?: boolean;
    cross_sesamo?: boolean; cross_solfiti?: boolean; cross_lupini?: boolean;
    cross_molluschi?: boolean;
}

// ─── Allergen fields ──────────────────────────────────────────────────────────
export const ALLERGEN_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'all_glutine', label: 'GLUTINE' }, { key: 'all_grano', label: 'GRANO' },
    { key: 'all_crostacei', label: 'CROSTACEI' }, { key: 'all_uova', label: 'UOVA' },
    { key: 'all_pesci', label: 'PESCE' }, { key: 'all_arachidi', label: 'ARACHIDI' },
    { key: 'all_soia', label: 'SOIA' }, { key: 'all_latte', label: 'LATTE' },
    { key: 'all_frutta_guscio', label: 'FRUTTA A GUSCIO' }, { key: 'all_anacardi', label: 'ANACARDI' },
    { key: 'all_solfiti', label: 'SOLFITI (>10 ppm)' }, { key: 'all_lupini', label: 'LUPINI' },
    { key: 'all_molluschi', label: 'MOLLUSCHI' },
];
export const CROSS_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'cross_glutine', label: 'GLUTINE' }, { key: 'cross_grano', label: 'GRANO' },
    { key: 'cross_crostacei', label: 'CROSTACEI' }, { key: 'cross_uova', label: 'UOVA' },
    { key: 'cross_pesci', label: 'PESCE' }, { key: 'cross_arachidi', label: 'ARACHIDI' },
    { key: 'cross_soia', label: 'SOIA' }, { key: 'cross_latte', label: 'LATTE' },
    { key: 'cross_frutta_guscio', label: 'FRUTTA A GUSCIO' }, { key: 'cross_anacardi', label: 'ANACARDI' },
    { key: 'cross_sedano', label: 'SEDANO' }, { key: 'cross_senape', label: 'SENAPE' },
    { key: 'cross_sesamo', label: 'SESAMO' }, { key: 'cross_solfiti', label: 'SOLFITI' },
    { key: 'cross_lupini', label: 'LUPINI' }, { key: 'cross_molluschi', label: 'MOLLUSCHI' },
];

// ─── Recipe / additive rows ───────────────────────────────────────────────────
export interface RecipeRow {
    id: string;
    ing: DBIngredient;
    grams: number;
    resa: number;    // resa % (default 100)
    eurKg: number;   // costo €/kg (default 0)
}

export interface AdditiveRow {
    id: string;
    categoria: string;       // es. "conservante", "colorante"…
    nomeSpecifico: string;   // es. "E330 acido citrico"
}

// ─── Component (multi-componente) ────────────────────────────────────────────
export interface MobileComponent {
    id: string;
    name: string;
    pzUV: number;           // pezzi per unità di vendita (default 1)
    rows: RecipeRow[];
    additiveRows: AdditiveRow[];
}

export function makeComponent(): MobileComponent {
    return {
        id: String(Date.now() + Math.random()),
        name: '',
        pzUV: 1,
        rows: [],
        additiveRows: [],
    };
}

// ─── Shared types ─────────────────────────────────────────────────────────────
export interface CalcResult {
    energyKcal: number; energyKj: number;
    grassi: number; saturi: number; monoins: number; polins: number;
    trans: number; colesterolo: number;
    carboidrati: number; carboidratiTot: number; zuccheri: number;
    zuccheri_agg: number; polioli: number; amido: number; fibre: number;
    proteine: number; sodio_mg: number; sale: number;
    potassio: number; calcio: number; fosforo: number; magnesio: number;
    ferro: number; zinco: number;
    vitA_eq: number; vitD: number; vitE: number; vitC: number;
    vitB1: number; vitB2: number; vitB3: number; vitB6: number;
    vitB9: number; vitB12: number;
}

export const ZERO_CALC: CalcResult = {
    energyKcal: 0, energyKj: 0, grassi: 0, saturi: 0, monoins: 0, polins: 0,
    trans: 0, colesterolo: 0, carboidrati: 0, carboidratiTot: 0, zuccheri: 0,
    zuccheri_agg: 0, polioli: 0, amido: 0, fibre: 0, proteine: 0, sodio_mg: 0,
    sale: 0, potassio: 0, calcio: 0, fosforo: 0, magnesio: 0, ferro: 0, zinco: 0,
    vitA_eq: 0, vitD: 0, vitE: 0, vitC: 0, vitB1: 0, vitB2: 0, vitB3: 0,
    vitB6: 0, vitB9: 0, vitB12: 0,
};

// ─── Form fields (prodotto + serving sizes per tutte le regioni) ──────────────
export interface MobileNutForm {
    denominazione: string;
    porzione_g: string;
    pesoFinito_g: string;   // peso finito prodotto dopo cottura/lavorazione
    // UE
    ue_porzione: string;
    ue_confezione: string;
    ue_pezzo: string;
    // USA
    usa_serving: string;
    usa_confezione: string;
    usa_cup: string;
    usa_cucchiaio: string;
    usa_pezzo: string;
    // Canada
    ca_serving: string;
    ca_confezione: string;
    ca_cup: string;
    ca_cucchiaio: string;
    ca_pezzo: string;
    // Australia
    au_serving: string;
    au_confezione: string;
    au_pezzo: string;
    // Arabi
    arabi_serving: string;
    arabi_confezione: string;
    arabi_cup: string;
    arabi_cucchiaio: string;
    arabi_pezzo: string;
    // Peso specifico (liquidi)
    specificGravity: string;
}

export const EMPTY_FORM: MobileNutForm = {
    denominazione: '', porzione_g: '100', pesoFinito_g: '',
    ue_porzione: '', ue_confezione: '', ue_pezzo: '',
    usa_serving: '', usa_confezione: '', usa_cup: '', usa_cucchiaio: '', usa_pezzo: '',
    ca_serving: '', ca_confezione: '', ca_cup: '', ca_cucchiaio: '', ca_pezzo: '',
    au_serving: '', au_confezione: '', au_pezzo: '',
    arabi_serving: '', arabi_confezione: '', arabi_cup: '', arabi_cucchiaio: '', arabi_pezzo: '',
    specificGravity: '',
};

// ─── Calculation engine (desktop-equivalent: multi-component + pesoFinito) ────
function n(v: unknown): number { const num = Number(v); return isNaN(num) ? 0 : num; }

export function calcNutrients(components: MobileComponent[], pesoFinitoVal: number): CalcResult {
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
        sum.energyKcal  += n(item.ing.kcal) * f;
        sum.energyKj    += n(item.ing.kj)   * f;
        sum.grassi      += n(item.ing.grassi)   * f;
        sum.saturi      += n(item.ing.saturi)   * f;
        sum.monoins     += n(item.ing.monoins)  * f;
        sum.polins      += n(item.ing.polins)   * f;
        sum.trans       += n(item.ing.trans)    * f;
        sum.colesterolo += n(item.ing.colesterolo) * f;
        sum.carboidrati += n(item.ing.carboidrati) * f;
        sum.zuccheri    += n(item.ing.zuccheri)   * f;
        sum.zuccheri_agg += n(item.ing.zuccheri_agg) * f;
        sum.polioli     += n(item.ing.polioli)  * f;
        sum.amido       += n(item.ing.amido)    * f;
        sum.fibre       += n(item.ing.fibre)    * f;
        sum.proteine    += n(item.ing.proteine) * f;
        sum.sodio_mg    += n(item.ing.sodio_mg) * f;
        sum.potassio    += n(item.ing.potassio) * f;
        sum.calcio      += n(item.ing.calcio)   * f;
        sum.fosforo     += n(item.ing.fosforo)  * f;
        sum.magnesio    += n(item.ing.magnesio) * f;
        sum.ferro       += n(item.ing.ferro)    * f;
        sum.zinco       += n(item.ing.zinco)    * f;
        sum.vitA_eq     += n(item.ing.vitA_eq)  * f;
        sum.vitD        += n(item.ing.vitD)     * f;
        sum.vitE        += n(item.ing.vitE)     * f;
        sum.vitC        += n(item.ing.vitC)     * f;
        sum.vitB1       += n(item.ing.vitB1)    * f;
        sum.vitB2       += n(item.ing.vitB2)    * f;
        sum.vitB3       += n(item.ing.vitB3)    * f;
        sum.vitB6       += n(item.ing.vitB6)    * f;
        sum.vitB9       += n(item.ing.vitB9)    * f;
        sum.vitB12      += n(item.ing.vitB12)   * f;
    }

    const factor = 100 / pf_pz;
    const r: CalcResult = { ...ZERO_CALC };
    for (const k of Object.keys(sum) as (keyof CalcResult)[]) {
        (r as unknown as Record<string, number>)[k] =
            (sum as unknown as Record<string, number>)[k] * factor;
    }
    r.sale = r.sodio_mg / 1000 * 2.5;
    r.carboidratiTot = r.carboidrati + r.fibre;
    return r;
}

// ─── Archive entry ────────────────────────────────────────────────────────────
export interface MobileArchiveEntry {
    denominazione: string;
    porzione_g: number;
    region: 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';
    calcResult: CalcResult;
    form: MobileNutForm;
    components: MobileComponent[];
}

export type MobileTab = 'ricetta' | 'riepilogo' | 'mercati' | 'archivio';

// ─── Component ────────────────────────────────────────────────────────────────
export function NutrizionaleCalcMobile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const archive = useArchive<MobileArchiveEntry>('nut_mobile_v2');

    const [activeTab, setActiveTab] = useState<MobileTab>('ricetta');
    const [form, setForm] = useState<MobileNutForm>(EMPTY_FORM);
    const [components, setComponents] = useState<MobileComponent[]>([makeComponent()]);

    // Database ingredienti
    const [db, setDb] = useState<DBIngredient[]>([]);
    const [loadingDB, setLoadingDB] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/data/ingredientsDB.json')
            .then(r => r.json())
            .then((data: DBIngredient[]) => {
                let base = data;
                try {
                    const custom = JSON.parse(
                        localStorage.getItem('custom_ingredients') || '[]'
                    ) as DBIngredient[];
                    if (custom.length) base = [...base, ...custom];
                } catch {}
                setDb(base);
                setLoadingDB(false);

                // Ripristina stato dal bridge desktop→mobile (window resize scenario)
                const draft = readBridge();
                if (draft && draft.source === 'desktop') {
                    const mobileComps: MobileComponent[] = draft.components.map(comp => ({
                        id: String(Date.now() + Math.random()),
                        name: comp.name,
                        pzUV: comp.pzUV,
                        rows: comp.rows.flatMap(r => {
                            const found = base.find(dbi => dbi.nome === r.ingNome);
                            return found ? [{
                                id: String(Date.now() + Math.random()),
                                ing: found,
                                grams: r.grams,
                                resa: r.resa,
                                eurKg: r.eurKg,
                            }] : [];
                        }),
                        additiveRows: comp.additiveRows.map(ar => ({
                            id: String(Date.now() + Math.random()),
                            categoria: ar.categoria,
                            nomeSpecifico: ar.nomeSpecifico,
                        })),
                    }));
                    if (mobileComps.some(c => c.rows.length > 0)) {
                        setComponents(mobileComps);
                        setForm({
                            denominazione:    draft.denominazione,
                            porzione_g:       draft.ue_porzione || '100',
                            pesoFinito_g:     draft.pesoFinito_g,
                            ue_porzione:      draft.ue_porzione,
                            ue_confezione:    draft.ue_confezione,
                            ue_pezzo:         draft.ue_pezzo,
                            usa_serving:      draft.usa_serving,
                            usa_confezione:   draft.usa_confezione,
                            usa_cup:          draft.usa_cup,
                            usa_cucchiaio:    draft.usa_cucchiaio,
                            usa_pezzo:        draft.usa_pezzo,
                            ca_serving:       draft.ca_serving,
                            ca_confezione:    draft.ca_confezione,
                            ca_cup:           draft.ca_cup,
                            ca_cucchiaio:     draft.ca_cucchiaio,
                            ca_pezzo:         draft.ca_pezzo,
                            au_serving:       draft.au_serving,
                            au_confezione:    draft.au_confezione,
                            au_pezzo:         draft.au_pezzo,
                            arabi_serving:    draft.arabi_serving,
                            arabi_confezione: draft.arabi_confezione,
                            arabi_cup:        draft.arabi_cup,
                            arabi_cucchiaio:  draft.arabi_cucchiaio,
                            arabi_pezzo:      draft.arabi_pezzo,
                            specificGravity:  draft.specificGravity,
                        });
                    }
                }
            })
            .catch(err => {
                console.error('Error loading DB:', err);
                setLoadingDB(false);
                setDbError('Impossibile caricare il database. Ricarica la pagina.');
            });
    }, []);

    const updateForm = (patch: Partial<MobileNutForm>) =>
        setForm(prev => ({ ...prev, ...patch }));

    // ── Component handlers ────────────────────────────────────────────────────
    const addComponent = () =>
        setComponents(prev => [...prev, makeComponent()]);

    const removeComponent = (id: string) =>
        setComponents(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);

    const updateComponentName = (id: string, name: string) =>
        setComponents(prev => prev.map(c => c.id === id ? { ...c, name } : c));

    const updateComponentPzUV = (id: string, pzUV: number) =>
        setComponents(prev => prev.map(c => c.id === id ? { ...c, pzUV: pzUV > 0 ? pzUV : 1 } : c));

    // ── Row handlers ──────────────────────────────────────────────────────────
    const addRow = (compId: string, ing: DBIngredient) =>
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c,
            rows: [...c.rows, { id: String(Date.now() + Math.random()), ing, grams: 100, resa: 100, eurKg: 0 }],
        }));

    const removeRow = (compId: string, rowId: string) =>
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: c.rows.filter(r => r.id !== rowId),
        }));

    const updateRow = (compId: string, rowId: string, patch: Partial<RecipeRow>) =>
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: c.rows.map(r => r.id !== rowId ? r : { ...r, ...patch }),
        }));

    // ── Additive handlers ─────────────────────────────────────────────────────
    const addAdditiveRow = (compId: string) =>
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c,
            additiveRows: [...c.additiveRows, { id: String(Date.now() + Math.random()), categoria: '', nomeSpecifico: '' }],
        }));

    const removeAdditiveRow = (compId: string, rowId: string) =>
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, additiveRows: c.additiveRows.filter(r => r.id !== rowId),
        }));

    const updateAdditiveRow = (compId: string, rowId: string, patch: Partial<AdditiveRow>) =>
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, additiveRows: c.additiveRows.map(r => r.id !== rowId ? r : { ...r, ...patch }),
        }));

    const loadFromArchive = (entry: MobileArchiveEntry) => {
        setForm(entry.form ?? EMPTY_FORM);
        setComponents(entry.components?.length ? entry.components : [makeComponent()]);
        setActiveTab('ricetta');
    };

    const pesoFinito = parseFloat(form.pesoFinito_g) || 0;
    const calcResult = calcNutrients(components, pesoFinito);

    // Allergenici calcolati dagli ingredienti
    const allIngredients = components.flatMap(c => c.rows.map(r => r.ing));
    const presentAllergens: string[] = (() => {
        const set = new Set<string>();
        allIngredients.forEach(ing => ALLERGEN_FIELDS.forEach(({ key, label }) => { if (ing[key]) set.add(label); }));
        return [...set];
    })();
    const crossAllergens: string[] = (() => {
        const set = new Set<string>();
        allIngredients.forEach(ing => CROSS_FIELDS.forEach(({ key, label }) => {
            if (ing[key] && !presentAllergens.includes(label)) set.add(label);
        }));
        return [...set];
    })();

    const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
        { id: 'ricetta',   label: 'Ricetta',   icon: <Salad size={18} /> },
        { id: 'riepilogo', label: 'Riepilogo', icon: <ClipboardList size={18} /> },
        { id: 'mercati',   label: 'Mercati',   icon: <Globe size={18} /> },
        { id: 'archivio',  label: 'Archivio',  icon: <Archive size={18} /> },
    ];

    const handleExportPDF = async (_region: string) => {
        const previewEl = document.querySelector('.m-table-preview') as HTMLElement | null;
        if (!previewEl) return;
        try {
            const canvas = await html2canvas(previewEl, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const w = pdf.internal.pageSize.getWidth();
            const ratio = canvas.height / canvas.width;
            pdf.addImage(imgData, 'PNG', 10, 10, w - 20, (w - 20) * ratio);
            pdf.save(`${form.denominazione || 'tabella'}_${_region}.pdf`);
        } catch (e) {
            console.error('PDF export failed', e);
        }
    };

    const hasIngredients = components.some(c => c.rows.length > 0);

    const renderTab = () => {
        switch (activeTab) {
            case 'ricetta':
                return (
                    <CalcoloTab
                        form={form}
                        onChange={updateForm}
                        onGoToTabella={() => setActiveTab('mercati')}
                        db={db}
                        loadingDB={loadingDB}
                        dbError={dbError}
                        components={components}
                        onAddComponent={addComponent}
                        onRemoveComponent={removeComponent}
                        onUpdateComponentName={updateComponentName}
                        onUpdateComponentPzUV={updateComponentPzUV}
                        onAddRow={addRow}
                        onRemoveRow={removeRow}
                        onUpdateRow={updateRow}
                        onAddAdditiveRow={addAdditiveRow}
                        onRemoveAdditiveRow={removeAdditiveRow}
                        onUpdateAdditiveRow={updateAdditiveRow}
                    />
                );
            case 'riepilogo':
                return (
                    <RiepilogoTab
                        components={components}
                        pesoFinito={parseFloat(form.pesoFinito_g) || 0}
                        presentAllergens={presentAllergens}
                        crossAllergens={crossAllergens}
                    />
                );
            case 'mercati':
                return (
                    <TabellaTab
                        calcResult={calcResult}
                        form={form}
                        onChange={updateForm}
                        onSave={(region) => {
                            archive.saveItem(
                                form.denominazione || 'Senza nome',
                                {
                                    denominazione: form.denominazione,
                                    porzione_g: parseFloat(form.porzione_g) || 100,
                                    region,
                                    calcResult,
                                    form,
                                    components,
                                }
                            );
                        }}
                        onExportPDF={handleExportPDF}
                        hasIngredients={hasIngredients}
                        presentAllergens={presentAllergens}
                        crossAllergens={crossAllergens}
                    />
                );
            case 'archivio':
                return (
                    <ArchivioTab
                        items={archive.items}
                        onLoad={(entry) => loadFromArchive(entry)}
                        onDelete={(id) => archive.deleteItem(id)}
                    />
                );
        }
    };

    // Redirect se non autenticato
    if (!user) { navigate('/login'); return null; }

    return (
        <div style={{ minHeight: '100%', background: 'var(--m-bg)' }}>
            {renderTab()}

            {/* Bottom Tab Bar */}
            <nav className="m-tabbar" aria-label="Navigazione principale">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className="m-tabbar__item"
                        onClick={() => setActiveTab(tab.id)}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                        <span className={`m-tabbar__icon${activeTab === tab.id ? ' m-tabbar__icon--active' : ''}`}>
                            {tab.icon}
                        </span>
                        <span className={`m-tabbar__label${activeTab === tab.id ? ' m-tabbar__label--active' : ''}`}>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
