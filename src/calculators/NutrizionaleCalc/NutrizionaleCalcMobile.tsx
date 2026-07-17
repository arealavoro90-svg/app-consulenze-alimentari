import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../../api/client';
import { useNavigate } from 'react-router-dom';
import { Salad, ClipboardList, Globe, Archive } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useArchive } from '../../hooks/useArchive';
import { useAutosave } from '../../hooks/useAutosave';
import { CalcoloTab } from './mobile/CalcoloTab';
import { TabellaTab } from './mobile/TabellaTab';
import { RiepilogoTab } from './mobile/RiepilogoTab';
import { ArchivioTab } from './mobile/ArchivioTab';
import { readBridge } from './sessionBridge';
import { isValidDBIngredient } from '../../utils/validation';
import { SmartImportModal } from './SmartImportModal';
import type { SmartImportResult } from './SmartImportModal';
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
    const { user, hasTool } = useAuth();
    const hasExcelImport = hasTool('excel-import');
    const navigate = useNavigate();
    const archive = useArchive<MobileArchiveEntry>('nut_mobile_v2');
    const toast = useToast();

    const [activeTab, setActiveTab] = useState<MobileTab>('ricetta');

    const TAB_ORDER: MobileTab[] = ['ricetta', 'riepilogo', 'mercati', 'archivio'];

    const goToSection = useCallback((tab: MobileTab) => {
        setActiveTab(tab);
    }, []);

    const [form, setForm] = useState<MobileNutForm>(EMPTY_FORM);
    const [components, setComponents] = useState<MobileComponent[]>([makeComponent()]);
    const [showSmartImport, setShowSmartImport] = useState(false);
    const [currentRegion, setCurrentRegion] = useState<MobileArchiveEntry['region'] | null>(null);

    const AUTOSAVE_KEY = 'nut_mobile_autosave_v1';
    const { loadDraft } = useAutosave(AUTOSAVE_KEY, { form, components }, true, 2000);

    // Database ingredienti
    const [db, setDb] = useState<DBIngredient[]>([]);
    const [loadingDB, setLoadingDB] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);

    useEffect(() => {
        // S0: carica da endpoint Django autenticato; in dev senza backend → fallback statico
        const fromAPI = () => apiFetch<DBIngredient[]>('/api/ingredients/');
        const fromStatic = () => fetch('/data/ingredientsDB.json').then(r => r.json() as Promise<DBIngredient[]>);
        fromAPI()
            .catch(() => fromStatic())
            .then((data: DBIngredient[]) => {
                let base = data;
                try {
                    const raw = JSON.parse(
                        localStorage.getItem('custom_ingredients') || '[]'
                    ) as unknown;
                    const custom = Array.isArray(raw) ? raw.filter(isValidDBIngredient) as DBIngredient[] : [];
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
                    if (mobileComps.some((c: MobileComponent) => c.rows.length > 0)) {
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
                } else {
                    // Nessun bridge desktop → ripristina autosave mobile (se presente)
                    const saved = loadDraft();
                    if (saved?.components?.some((c: MobileComponent) => c.rows.length > 0)) {
                        setForm(saved.form);
                        setComponents(saved.components);
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

    const handleSmartImportMobile = useCallback((result: SmartImportResult) => {
        if (!result.components.length) return;
        const firstId = components[0]?.id;
        setComponents((prev: MobileComponent[]) => {
            let updated = prev;
            result.components.forEach((comp, ci) => {
                const newRows: RecipeRow[] = comp.rows.map(r => ({
                    id: String(Date.now() + Math.random()),
                    ing: r.ing,
                    grams: r.grams,
                    eurKg: r.ing.eur_kg ?? 0,
                    resa: 100,
                }));
                if (ci === 0 && firstId) {
                    const name = result.productName || comp.name;
                    updated = updated.map((c: MobileComponent) => c.id !== firstId ? c : { ...c, rows: [...c.rows, ...newRows], name: c.name || name });
                } else {
                    updated = [...updated, { ...makeComponent(), name: comp.name, rows: newRows }];
                }
            });
            return updated;
        });
    }, [components]);

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
        setCurrentRegion(entry.region);
        goToSection('ricetta');
    };

    const pesoFinito = parseFloat(form.pesoFinito_g) || 0;
    const calcResult = useMemo(() => calcNutrients(components, pesoFinito), [components, pesoFinito]);

    // Allergenici calcolati dagli ingredienti
    const allIngredients = useMemo(() => components.flatMap(c => c.rows.map(r => r.ing)), [components]);
    const presentAllergens = useMemo<string[]>(() => {
        const set = new Set<string>();
        allIngredients.forEach(ing => ALLERGEN_FIELDS.forEach(({ key, label }) => { if (ing[key]) set.add(label); }));
        return [...set];
    }, [allIngredients]);
    const crossAllergens = useMemo<string[]>(() => {
        const set = new Set<string>();
        allIngredients.forEach(ing => CROSS_FIELDS.forEach(({ key, label }) => {
            if (ing[key] && !presentAllergens.includes(label)) set.add(label);
        }));
        return [...set];
    }, [allIngredients, presentAllergens]);

    const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
        { id: 'ricetta',   label: 'Ricetta',   icon: <Salad size={21} /> },
        { id: 'riepilogo', label: 'Riepilogo', icon: <ClipboardList size={21} /> },
        { id: 'mercati',   label: 'Mercati',   icon: <Globe size={21} /> },
        { id: 'archivio',  label: 'Archivio',  icon: <Archive size={21} /> },
    ];

    const handleExportPDF = (_region: string) => {
        window.print();
    };

    const hasIngredients = components.some(c => c.rows.length > 0);

    // Redirect se non autenticato
    if (!user) { navigate('/login'); return null; }

    const tabIndex = TAB_ORDER.indexOf(activeTab);

    return (
        <div className="m-slide-wrapper">
            {/* ── Slide container ── */}
            <div className="m-slide-container">
                <div
                    className="m-slide-track"
                    style={{ transform: `translateX(-${tabIndex * 25}%)` }}
                >
                    {/* Panel 0: Ricetta */}
                    <div className="m-slide-panel">
                        <CalcoloTab
                            form={form}
                            onChange={updateForm}
                            onGoToTabella={() => goToSection('mercati')}
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
                            onOpenSmartImport={() => setShowSmartImport(true)}
                            onOpenArchive={() => goToSection('archivio')}
                            hasExcelImport={hasExcelImport}
                            calcResult={calcResult}
                        />
                    </div>

                    {/* Panel 1: Riepilogo */}
                    <div className="m-slide-panel">
                        <RiepilogoTab
                            components={components}
                            pesoFinito={parseFloat(form.pesoFinito_g) || 0}
                            presentAllergens={presentAllergens}
                            crossAllergens={crossAllergens}
                        />
                    </div>

                    {/* Panel 2: Mercati */}
                    <div className="m-slide-panel">
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
                            initialRegion={currentRegion ?? undefined}
                        />
                    </div>

                    {/* Panel 3: Archivio */}
                    <div className="m-slide-panel">
                        <ArchivioTab
                            items={archive.items}
                            onLoad={(entry) => loadFromArchive(entry)}
                            onDelete={(id) => archive.deleteItem(id)}
                        />
                    </div>
                </div>
            </div>

            {/* ── Section tab bar (icone in basso) ── */}
            <nav className="m-section-tabbar" role="tablist" aria-label="Sezioni">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            className={`m-section-tabbar__item${isActive ? ' m-section-tabbar__item--active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="m-section-tabbar__icon">{tab.icon}</span>
                            <span className="m-section-tabbar__label">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* ── SmartImport modal ── */}
            {showSmartImport && (
                <SmartImportModal
                    db={db}
                    onClose={() => setShowSmartImport(false)}
                    onImport={handleSmartImportMobile}
                />
            )}
        </div>
    );
}
