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
import { useToast } from '../../components/ui/Toast';
import {
    type DBIngredient,
    type CalcResult,
    type RecipeRow,
    type AdditiveRow,
    type Component,
    ZERO_CALC,
    calcNutrients,
    scaleResult,
} from '../../engines/nutrizionaleCalcEngine';
import {
    ALLERGEN_FIELDS,
    CROSS_FIELDS,
} from './shared/constants';

// ponytail: scaleResult imported for use in sub-tabs (TabellaTab etc.)
export type { DBIngredient, CalcResult, RecipeRow, AdditiveRow, Component };
export { ZERO_CALC, calcNutrients, scaleResult, ALLERGEN_FIELDS, CROSS_FIELDS };

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

// ─── normalizeCalcResult — migrazione archivio legacy ────────────────────────
// ponytail: old archive entries (nut_mobile_v2) miss vitK/vitB5/rame/manganese/selenio/iodio;
// spread over ZERO_CALC fills gaps with 0. Drop when archive is fully migrated.
export function normalizeCalcResult(r: Partial<CalcResult>): CalcResult {
    return { ...ZERO_CALC, ...r };
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
    const toast = useToast();

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
                            grams: (ar as { grams?: number }).grams ?? 0,
                            eurKg: (ar as { eurKg?: number }).eurKg ?? 0,
                            resa: (ar as { resa?: number }).resa ?? 100,
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
            // ponytail: grams/eurKg/resa required by engine AdditiveRow; mobile additivi non pesati → 0/100
            additiveRows: [...c.additiveRows, { id: String(Date.now() + Math.random()), categoria: '', nomeSpecifico: '', grams: 0, eurKg: 0, resa: 100 }],
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
            toast.error('Errore durante l\'esportazione.');
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
            <div key={activeTab} className="m-tab-content m-tab-enter">
                {renderTab()}
            </div>

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
