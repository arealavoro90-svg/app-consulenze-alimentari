import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api/client';
import { createPortal } from 'react-dom';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import {
    Save, FolderOpen, Plus, PlusCircle, Search, Database, Archive,
    ClipboardList, Scale, Layers, FlaskConical, Table2, Euro,
    AlertTriangle, Compass, SlidersHorizontal, ChevronRight, ChevronLeft,
    Trash2, X, BookOpen, CheckCircle, ChevronDown,
    Salad, Flame, Globe, Package, ImageDown, Download, Sparkles, FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { SmartImportModal } from './SmartImportModal';
import type { SmartImportResult } from './SmartImportModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useArchive } from '../../hooks/useArchive';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAutosave } from '../../hooks/useAutosave';
import { ValidationError } from '../../components/ValidationError';
import { generateEtichettaPDF } from '../../utils/pdfGenerator';
import {
    validatePositiveNumber,
    validatePercentage,
    validateFinishedWeight,
    validateIngredientQuantity,
    validatePieces,
    isValidDBIngredient,
} from '../../utils/validation';
// import DB_RAW from '../../data/ingredientsDB.json'; // Removed static import for Part 5d
import { TabUE, DEFAULT_OPTIONALS } from './TabUE';
import { NutrientSelectModal } from './NutrientSelectModal';
import type { EUSubTab, SelectedOptionals } from './TabUE';
import { TabUSA } from './TabUSA';
import type { USAServingRef, USAMeasure } from './TabUSA';
import { SplitShell } from './SplitShell';
import { BrowseIngredientsModal } from './BrowseIngredientsModal';
import { DownloadTableModal } from './DownloadTableModal';
import type { DownloadFormatState, DownloadPreviewHandlers } from './DownloadTableModal';
import {
    type DBIngredient, type CalcResult, type RecipeRow, type AdditiveRow, type Component,
    ZERO_CALC, calcNutrients, scaleResult, calcClaims,
} from '../../engines/nutrizionaleCalcEngine';
import { ALLERGEN_FIELDS, CROSS_FIELDS, ADDITIVI_CATEGORIE, ADDITIVI_SPECIFICI } from './shared/constants';
import { writeBridge, readBridge, buildDesktopDraft } from './sessionBridge';
import {
    rCA_energy, rCA_fat, rCA_carb, rCA_chol, rCA_na, rCA_iron, rCA_pct,
    rAU_kj, rAU_kcal, rAU_g1, rAU_mg,
    rArabi_energy, rArabi_g, rArabi_mg,
} from '../../utils/nutritionalRounding';

// const DB = DB_RAW as unknown as DBIngredient[]; // Replaced with fetch state

// ─── DV / AR References ───────────────────────────────────────────────────────
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

// ─── State types ──────────────────────────────────────────────────────────────
export interface ServingSizesNation {
    cup?: number; cucchiaio?: number; serving?: number; confezione?: number; pezzo?: number;
}
export interface UEServing { porzione?: number; confezione?: number; pezzo?: number; }
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

export type NationTab = 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';
export type SubTab = 'verticale' | 'orizzontale' | 'lineare';


// ─── Local display helper (n() used by rCA_*/rAU_* formatters below) ─────────
function n(v: unknown): number { const num = Number(v); return isNaN(num) ? 0 : num; }


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
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    const handleClick = () => {
        if (!visible && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
        }
        setVisible(v => !v);
    };

    useEffect(() => {
        if (!visible) return;
        const close = () => setVisible(false);
        window.addEventListener('scroll', close, true);
        return () => window.removeEventListener('scroll', close, true);
    }, [visible]);

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}>
            <button
                ref={btnRef}
                type="button"
                title={text}
                onClick={handleClick}
                style={{
                    background: 'none', border: '2px solid var(--color-orange)', cursor: 'pointer', padding: 0,
                    width: 18, height: 18, borderRadius: '50%',
                    fontSize: 11, fontWeight: 700, color: 'var(--color-orange)', lineHeight: 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}
            >i</button>
            {visible && pos && (
                <span style={{
                    position: 'fixed', top: pos.top, left: pos.left,
                    transform: 'translate(-50%, -100%)',
                    background: '#1a1a2e', color: '#fff', fontSize: 11.5, lineHeight: 1.5,
                    padding: '7px 11px', borderRadius: 7, whiteSpace: 'normal',
                    width: 230, zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                }}>
                    {text}
                </span>
            )}
        </span>
    );
}

// ─── IngSearch sub-component ──────────────────────────────────────────────────
const ING_RECENTI_KEY = 'ing_recenti';
const MAX_RECENTI = 10;

function getRecenti(db: DBIngredient[]): DBIngredient[] {
    try {
        const names: string[] = JSON.parse(localStorage.getItem(ING_RECENTI_KEY) ?? '[]');
        return names.flatMap(name => { const found = db.find(d => d.nome === name); return found ? [found] : []; });
    } catch { return []; }
}

function saveRecente(ing: DBIngredient): void {
    try {
        const names: string[] = JSON.parse(localStorage.getItem(ING_RECENTI_KEY) ?? '[]');
        const updated = [ing.nome, ...names.filter(n => n !== ing.nome)].slice(0, MAX_RECENTI);
        localStorage.setItem(ING_RECENTI_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
}

function IngSearch({ onAdd, db, loading, error, onRetry }: { onAdd: (ing: DBIngredient) => void; db: DBIngredient[]; loading: boolean; error: string | null; onRetry: () => void }) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [q, setQ] = useState('');
    const [res, setRes] = useState<DBIngredient[]>([]);
    const [dropOpen, setDropOpen] = useState(false);
    const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const [selectedIdx, setSelectedIdx] = useState(-1);
    const ref = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const closeSearch = () => { setSearchOpen(false); setQ(''); setDropOpen(false); setSelectedIdx(-1); };

    const handleAdd = (ing: DBIngredient) => { saveRecente(ing); onAdd(ing); closeSearch(); };

    useEffect(() => {
        if (searchOpen) inputRef.current?.focus();
    }, [searchOpen]);

    useEffect(() => {
        const found = searchDB(q, db);
        setRes(found);
        setSelectedIdx(-1);
        const shouldOpen = found.length > 0 && q.trim().length >= 2;
        if (shouldOpen && wrapRef.current) {
            const rect = wrapRef.current.getBoundingClientRect();
            setDropPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
        }
        setDropOpen(shouldOpen);
    }, [q, db]);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setDropOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => {
        if (!dropOpen) return;
        const updatePos = () => {
            if (wrapRef.current) {
                const rect = wrapRef.current.getBoundingClientRect();
                setDropPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
            }
        };
        window.addEventListener('scroll', updatePos, true);
        return () => window.removeEventListener('scroll', updatePos, true);
    }, [dropOpen]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIdx < 0 || !listRef.current) return;
        const item = listRef.current.querySelectorAll('[data-ing-item]')[selectedIdx] as HTMLElement | undefined;
        item?.scrollIntoView({ block: 'nearest' });
    }, [selectedIdx]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!dropOpen) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, res.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); const target = selectedIdx >= 0 ? res[selectedIdx] : res[0]; if (target) handleAdd(target); }
        else if (e.key === 'Escape') { closeSearch(); }
    };

    const recenti = searchOpen && q.trim().length < 2 ? getRecenti(db).slice(0, 5) : [];

    return (
        <div ref={ref} style={{ marginBottom: 12 }}>
            {/* Pulsante toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" className="btn btn-outline" style={{ fontSize: 12, padding: '5px 14px' }}
                    onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}
                    disabled={!!error || loading}
                >
                    <Plus size={13} /> Aggiungi ingrediente
                </button>
                {loading && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Caricamento DB...</span>}
                {error && <span style={{ fontSize: 11, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 6 }}>{error} <button type="button" onClick={onRetry} style={{ fontSize: 11, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 0 }}>Riprova</button></span>}
            </div>

            {/* Barra di ricerca */}
            {searchOpen && !error && !loading && (
                <div style={{ position: 'relative', marginTop: 8 }}>
                    <div ref={wrapRef} className="ing-search-wrap" style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="ing-search-icon"><Search size={14} /></span>
                        <input ref={inputRef} type="text" value={q} onChange={e => setQ(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Cerca ingrediente (↑↓ per navigare, Invio per aggiungere)"
                            className="ing-search-input"
                            style={{ width: '100%' }} />
                        <button type="button" onClick={closeSearch}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                            <X size={14} />
                        </button>
                    </div>

                    {/* Recenti — mostrati quando la query è vuota */}
                    {recenti.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Recenti:</span>
                            {recenti.map((ing, i) => (
                                <button key={i} type="button" onClick={() => handleAdd(ing)}
                                    style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', color: 'var(--color-text)', fontFamily: 'inherit' }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-orange)')}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                                >
                                    {(ing.nome || '').trim()}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Dropdown risultati */}
                    {dropOpen && dropPos && (
                        <div ref={listRef} style={{
                            position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width,
                            background: 'var(--color-bg-card)', border: '1.5px solid var(--color-orange)',
                            borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                            zIndex: 9999, maxHeight: 320, overflowY: 'auto',
                        }}>
                            <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--color-text-dim)', borderBottom: '1px solid var(--color-border)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {res.length} risultati
                            </div>
                            {res.map((ing, i) => (
                                <button key={i} type="button" data-ing-item
                                    onClick={() => handleAdd(ing)}
                                    style={{
                                        display: 'block', width: '100%',
                                        background: i === selectedIdx ? 'var(--color-accent-bg)' : 'transparent',
                                        border: 'none', borderBottom: '1px solid var(--color-border)',
                                        padding: '9px 14px', textAlign: 'left', cursor: 'pointer',
                                        fontFamily: 'inherit',
                                    }}
                                    onMouseEnter={e => { setSelectedIdx(i); (e.currentTarget.style.background = 'var(--color-accent-bg)'); }}
                                    onMouseLeave={e => { if (selectedIdx !== i) e.currentTarget.style.background = 'transparent'; }}
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

// Stili e componente NF a livello di modulo (evita ricreazione ad ogni render)
const _iS: React.CSSProperties = { width: '100%', padding: '5px 8px', border: '1px solid var(--color-border)', borderRadius: 5, fontSize: 13, boxSizing: 'border-box' };
const _iSRo: React.CSSProperties = { ..._iS, background: 'var(--color-bg-secondary,#f0f4ff)', color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'default' };
const _iSErr: React.CSSProperties = { ..._iS, border: '1.5px solid #e53e3e' };
const _lS: React.CSSProperties = { fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3, color: 'var(--color-text-muted)' };
const _ClearErrorsCtx = React.createContext<() => void>(() => {});

const NF = React.memo(function NF({ label, value, onChange, unit = 'g/100g', ro = false, err = false, tooltip }: {
    label: string; value: string; onChange?: (v: string) => void;
    unit?: string; ro?: boolean; err?: boolean; tooltip?: string;
}) {
    const clearErrors = React.useContext(_ClearErrorsCtx);
    return (
        <div>
            <label style={{ ..._lS, display: 'flex', alignItems: 'center', gap: 2 }}>
                <span>{label} <span style={{ fontWeight: 400 }}>{unit}</span></span>
                {tooltip && <InfoTooltip text={tooltip} />}
            </label>
            <input
                type="text"
                inputMode="decimal"
                style={ro ? _iSRo : err ? _iSErr : _iS}
                value={value}
                onChange={e => {
                    if (ro) return;
                    const v = e.target.value;
                    if (v === '' || v === '-' || /^-?\d*[.,]?\d*$/.test(v)) {
                        onChange?.(v.replace(',', '.'));
                        clearErrors();
                    }
                }}
                onFocus={e => { if (!ro) e.target.select(); }}
                readOnly={ro}
            />
        </div>
    );
});

const DB_ACCREDITATI: { nome: string; url: string }[] = [
    { nome: 'CREA (Italia)', url: 'https://www.alimentinutrizione.it/tabelle-nutrizionali' },
    { nome: 'ANSES / Ciqual (Francia)', url: 'https://ciqual.anses.fr/' },
    { nome: 'USDA FoodData Central (USA)', url: 'https://fdc.nal.usda.gov/' },
    { nome: 'EFSA Comprehensive Database', url: 'https://www.efsa.europa.eu/en/data/data-on-food-composition' },
    { nome: 'BLS – Bundeslebensmittelschlüssel (Germania)', url: 'https://blsdb.de/' },
    { nome: 'McCance & Widdowson\'s (UK)', url: 'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid' },
    { nome: 'INSA / PortFIR (Portogallo)', url: 'https://portfir.insa.pt/' },
    { nome: 'Rivm NEVO (Paesi Bassi)', url: 'https://nevo-online.rivm.nl/' },
];

function CustomIngredientModal({ onClose, onSave, initialIngredient, originalNome }: {
    onClose: () => void;
    onSave: (ing: DBIngredient) => void;
    initialIngredient?: DBIngredient;
    originalNome?: string; // nome dell'ingrediente originale da rimuovere in caso di modifica
}) {
    const s = (v: number | undefined) => (v != null && v !== 0) ? String(v) : '';
    // Info base
    const [nome, setNome] = useState(initialIngredient?.nome ?? '');
    const [categoria, setCategoria] = useState('ingrediente');
    const [eurKg, setEurKg] = useState(s(initialIngredient?.eur_kg) || '0');
    const [fonteTipo, setFonteTipo] = useState<'database' | 'schede' | ''>(() => {
        if (!initialIngredient?.fonte_dati) return '';
        return initialIngredient.fonte_link ? 'database' : 'schede';
    });
    const [fonteDb, setFonteDb] = useState(initialIngredient?.fonte_dati ?? '');
    // Obbligatori
    const [grassi, setGrassi] = useState(s(initialIngredient?.grassi));
    const [saturi, setSaturi] = useState(s(initialIngredient?.saturi));
    const [carboidrati, setCarboidrati] = useState(s(initialIngredient?.carboidrati));
    const [zuccheri, setZuccheri] = useState(s(initialIngredient?.zuccheri));
    const [proteine, setProteine] = useState(s(initialIngredient?.proteine));
    const [sale, setSale] = useState(() => {
        if (!initialIngredient) return '';
        const saleG = Math.round((initialIngredient.sodio_mg / 400) * 10000) / 10000;
        return saleG > 0 ? String(saleG) : '';
    });
    // Facoltativi
    const [monoins, setMonoins] = useState(s(initialIngredient?.monoins));
    const [polins, setPolins] = useState(s(initialIngredient?.polins));
    const [eritritoloS, setEritritolo] = useState(s(initialIngredient?.eritritolo));
    const [acidoOrganico, setAcidoOrganico] = useState(s(initialIngredient?.acidi_organici));
    // Obbligatori in taluni casi — macronutrienti
    const [trans, setTrans] = useState(s(initialIngredient?.trans));
    const [zuccheriAgg, setZuccheriAgg] = useState(s(initialIngredient?.zuccheri_agg));
    const [polioliS, setPolioli] = useState(s(initialIngredient?.polioli));
    const [glicerolo, setGlicerolo] = useState(s(initialIngredient?.glicerolo));
    const [alcolS, setAlcol] = useState(() => {
        if (!initialIngredient?.alcol) return '';
        return String(Math.round((initialIngredient.alcol / 0.79) * 1000) / 1000);
    });
    const [fibre, setFibre] = useState(s(initialIngredient?.fibre));
    // Micronutrienti obbligatori in taluni casi
    const [colesterolo, setColesterolo] = useState(s(initialIngredient?.colesterolo));
    const [potassio, setPotassio] = useState(s(initialIngredient?.potassio));
    const [calcio, setCalcio] = useState(s(initialIngredient?.calcio));
    const [ferro, setFerro] = useState(s(initialIngredient?.ferro));
    // Micronutrienti facoltativi — sali minerali
    const [fosforo, setFosforo] = useState(s(initialIngredient?.fosforo));
    const [magnesio, setMagnesio] = useState(s(initialIngredient?.magnesio));
    const [iodio, setIodio] = useState(s(initialIngredient?.iodio));
    const [zinco, setZinco] = useState(s(initialIngredient?.zinco));
    const [rame, setRame] = useState(s(initialIngredient?.rame));
    const [manganese, setManganese] = useState(s(initialIngredient?.manganese));
    const [selenio, setSelenio] = useState(s(initialIngredient?.selenio));
    // Vitamine liposolubili
    const [betaCarotene, setBetaCarotene] = useState(s(initialIngredient?.betaCarotene));
    const [retinolo, setRetinolo] = useState(s(initialIngredient?.retinolo));
    const [vitD, setVitD] = useState(s(initialIngredient?.vitD));
    const [vitE, setVitE] = useState(s(initialIngredient?.vitE));
    const [vitK, setVitK] = useState(s(initialIngredient?.vitK));
    // Vitamine idrosolubili
    const [vitC, setVitC] = useState(s(initialIngredient?.vitC));
    const [vitB1, setVitB1] = useState(s(initialIngredient?.vitB1));
    const [vitB2, setVitB2] = useState(s(initialIngredient?.vitB2));
    const [vitB3, setVitB3] = useState(s(initialIngredient?.vitB3));
    const [vitB5, setVitB5] = useState(s(initialIngredient?.vitB5));
    const [vitB6, setVitB6] = useState(s(initialIngredient?.vitB6));
    const [vitB9, setVitB9] = useState(s(initialIngredient?.vitB9));
    const [vitB12, setVitB12] = useState(s(initialIngredient?.vitB12));
    // Validazione
    const [errors, setErrors] = useState<string[]>([]);
    // Allergenici presenti e tracce
    const [allergens, setAllergens] = useState<Record<string, boolean>>(() => {
        if (!initialIngredient) return {};
        return Object.fromEntries(CI_ALLERGEN_KEYS.map(k => [k, !!initialIngredient[k as keyof DBIngredient]]));
    });
    const [crossAllergens, setCrossAllergens] = useState<Record<string, boolean>>(() => {
        if (!initialIngredient) return {};
        return Object.fromEntries(CI_CROSS_KEYS.map(k => [k, !!initialIngredient[k as keyof DBIngredient]]));
    });

    // Valori calcolati automaticamente (EU Reg 1169/2011)
    const grassiN      = parseFloat(grassi)        || 0;
    const satN         = parseFloat(saturi)         || 0;
    const carbN        = parseFloat(carboidrati)    || 0;   // carboidrati ESCLUSO fibre (input utente)
    const protN        = parseFloat(proteine)       || 0;
    const saleN        = parseFloat(sale)           || 0;
    const fibreN       = parseFloat(fibre)          || 0;
    const polioliN     = parseFloat(polioliS)       || 0;   // polioli escluso eritritolo e glicerolo
    const alcolMl      = parseFloat(alcolS)         || 0;   // input utente in ml/100g
    const gliceroloN   = parseFloat(glicerolo)      || 0;
    const acidoOrgN    = parseFloat(acidoOrganico)  || 0;
    const eritritoloN  = parseFloat(eritritoloS)    || 0;   // 0 kcal/g
    const zuccheriN    = parseFloat(zuccheri)       || 0;
    const colestN      = parseFloat(colesterolo)    || 0;   // mg/100g
    const potassioN    = parseFloat(potassio)       || 0;   // mg/100g
    const calcioN      = parseFloat(calcio)         || 0;   // mg/100g
    const fosforoN     = parseFloat(fosforo)        || 0;   // mg/100g
    const magnesioN    = parseFloat(magnesio)       || 0;   // mg/100g
    const ferroN       = parseFloat(ferro)          || 0;   // mg/100g
    const zincoN       = parseFloat(zinco)          || 0;   // mg/100g
    const iodioN       = parseFloat(iodio)          || 0;   // μg/100g
    const rameN        = parseFloat(rame)           || 0;   // mg/100g
    const manganeseN   = parseFloat(manganese)      || 0;   // mg/100g
    const selenioN     = parseFloat(selenio)        || 0;   // μg/100g
    const zuccheriAggN = parseFloat(zuccheriAgg)    || 0;

    // Alcol: converti ml/100g → g/100g (densità etanolo 0,79)
    const alcolG = Math.round(alcolMl * 0.79 * 1000) / 1000;

    // Carboidrati totali compreso fibre
    const carboConFibre = Math.round((carbN + fibreN) * 1000) / 1000;

    // Amido, glicogeno e destrine = carbo (excl. fibre) – (zuccheri + polioli + eritritolo)
    const amidoCalc = Math.max(0, Math.round((carbN - zuccheriN - polioliN - eritritoloN) * 1000) / 1000);

    // Sodio (mg/100g)
    const sodioCalc = Math.round(saleN * 400 * 10) / 10;

    // Acqua = 100 − (grassi + carboConFibre + acidi_org + proteine + sale + alcolG + minerali_g)
    // Minerali in mg/100g → /1000 = g; iodio e selenio in μg/100g → /1000000 = g
    const minerali_g = (potassioN + calcioN + fosforoN + magnesioN + ferroN + zincoN + rameN + manganeseN + colestN) / 1000
                     + (iodioN + selenioN) / 1000000;
    const acquaCalc = Math.round((100 - (grassiN + carboConFibre + acidoOrgN + protN + saleN + alcolG + minerali_g)) * 1000) / 1000;

    // Residuo secco = 100 − (alcol_g + acqua)
    const residuoSecco = Math.round((100 - (alcolG + acquaCalc)) * 1000) / 1000;

    // Energia (EU Reg 1169/2011): (carboConFibre − fibre − polioli) × 4 + polioli × 2,4 + fibre × 2
    // = (carbN − polioliN) × 4 + polioliN × 2,4 + fibreN × 2
    const carboNettiKcal = carbN - polioliN; // carbo disponibili (excl. fibre e polioli)
    const kcalCalc = Math.round((grassiN*9 + carboNettiKcal*4 + polioliN*2.4 + fibreN*2 + acidoOrgN*3 + protN*4 + alcolG*7) * 10) / 10;
    const kjCalc   = Math.round((grassiN*37 + carboNettiKcal*17 + polioliN*10 + fibreN*8 + acidoOrgN*13 + protN*17 + alcolG*29) * 10) / 10;

    const waterError = acquaCalc < 0 || residuoSecco < 0;

    // Vitamina A calcolata
    const betaCaroteneN = parseFloat(betaCarotene) || 0;  // μg/100g
    const retinolN      = parseFloat(retinolo)     || 0;  // μg/100g
    const vitA_eq       = Math.round((betaCaroteneN / 6 + retinolN) * 1000) / 1000;  // μg RE/100g
    const vitA_iu       = Math.round(vitA_eq * 3.333333333 * 10) / 10;           // UI/100g

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

        const fonteDbEntry = DB_ACCREDITATI.find(d => d.nome === fonteDb);
        const ing: DBIngredient = {
            nome: nome.trim(),
            etichetta: nome.trim(),
            categoria: '_custom',
            fonte_dati: fonteTipo === 'database' ? fonteDb : fonteTipo === 'schede' ? 'Schede tecniche / Analisi di laboratorio / Web' : undefined,
            fonte_link: fonteTipo === 'database' && fonteDbEntry ? fonteDbEntry.url : undefined,
            kcal: kcalCalc,
            kj: kjCalc,
            acqua: acquaCalc >= 0 ? acquaCalc : 0,
            grassi: grassiN, saturi: satN,
            monoins:    monoins    ? parseFloat(monoins)    : undefined,
            polins:     polins     ? parseFloat(polins)     : undefined,
            trans:          trans          ? parseFloat(trans)          : undefined,
            carboidrati: carbN,
            zuccheri: parseFloat(zuccheri) || 0,
            zuccheri_agg:   zuccheriAgg    ? parseFloat(zuccheriAgg)    : undefined,
            fibre:          fibre          ? fibreN                     : undefined,
            polioli:        polioliS       ? polioliN                   : undefined,
            eritritolo:     eritritoloS    ? parseFloat(eritritoloS)    : undefined,
            glicerolo:      glicerolo      ? gliceroloN                 : undefined,
            acidi_organici: acidoOrganico  ? acidoOrgN                  : undefined,
            proteine: protN,
            sodio_mg: sodioCalc,
            alcol:          alcolS         ? alcolG                     : undefined,
            eur_kg:     eurKg      ? parseFloat(eurKg)      : undefined,
            colesterolo: colesterolo ? parseFloat(colesterolo) : undefined,
            potassio:    potassio   ? parseFloat(potassio)   : undefined,
            calcio:      calcio     ? parseFloat(calcio)     : undefined,
            ferro:       ferro      ? parseFloat(ferro)      : undefined,
            fosforo:     fosforo    ? parseFloat(fosforo)    : undefined,
            magnesio:    magnesio   ? parseFloat(magnesio)   : undefined,
            iodio:       iodio      ? parseFloat(iodio)      : undefined,
            zinco:       zinco      ? parseFloat(zinco)      : undefined,
            rame:        rame       ? parseFloat(rame)       : undefined,
            manganese:   manganese  ? parseFloat(manganese)  : undefined,
            selenio:     selenio    ? parseFloat(selenio)    : undefined,
            betaCarotene: betaCarotene ? betaCaroteneN : undefined,
            retinolo:     retinolo    ? retinolN      : undefined,
            vitA_eq:      vitA_eq > 0 ? vitA_eq       : undefined,
            vitA_iu:      vitA_iu > 0 ? vitA_iu       : undefined,
            vitD:         vitD        ? parseFloat(vitD)  : undefined,
            vitE:         vitE        ? parseFloat(vitE)  : undefined,
            vitK:         vitK        ? parseFloat(vitK)  : undefined,
            vitC:         vitC        ? parseFloat(vitC)  : undefined,
            vitB1:        vitB1       ? parseFloat(vitB1) : undefined,
            vitB2:        vitB2       ? parseFloat(vitB2) : undefined,
            vitB3:        vitB3       ? parseFloat(vitB3) : undefined,
            vitB5:        vitB5       ? parseFloat(vitB5) : undefined,
            vitB6:        vitB6       ? parseFloat(vitB6) : undefined,
            vitB9:        vitB9       ? parseFloat(vitB9) : undefined,
            vitB12:       vitB12      ? parseFloat(vitB12): undefined,
        };
        // Allergenici presenti
        CI_ALLERGEN_KEYS.forEach(k => { if (allergens[k]) (ing as unknown as Record<string, unknown>)[k] = 'SI'; });
        // Tracce (contaminazione crociata)
        CI_CROSS_KEYS.forEach(k => { if (crossAllergens[k]) (ing as unknown as Record<string, unknown>)[k] = 'SI'; });
        try {
            const rawEx = JSON.parse(localStorage.getItem('custom_ingredients') || '[]');
            let ex = (Array.isArray(rawEx) ? (rawEx as unknown[]).filter(isValidDBIngredient) : []) as DBIngredient[];
            // Se stiamo modificando un ingrediente esistente, rimuoviamo il vecchio
            if (originalNome) {
                ex = ex.filter(i => i.nome !== originalNome);
            }
            localStorage.setItem('custom_ingredients', JSON.stringify([...ex, ing]));
        } catch {}
        onSave(ing);
        onClose();
    };

    // Stili locali (non ricreano NF — NF è fuori dal componente)
    const iS: React.CSSProperties = { width: '100%', padding: '5px 8px', border: '1px solid var(--color-border)', borderRadius: 5, fontSize: 13, boxSizing: 'border-box' };
    const lS: React.CSSProperties = { fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3, color: 'var(--color-text-muted)' };
    const secS: React.CSSProperties = { marginBottom: 14, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--color-border)' };
    const secT = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color, marginBottom: 10 });
    const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 };
    const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 };

    // Accordion state per sezioni collassabili
    const [openSec, setOpenSec] = useState({ facoltativi: false, condizionali: false, micro: false, allergenici: false });
    const toggleSec = (k: keyof typeof openSec) => setOpenSec(prev => ({ ...prev, [k]: !prev[k] }));
    const AccHead = ({ label, sKey, color = '#718096' }: { label: string; sKey: keyof typeof openSec; color?: string }) => (
        <button type="button" onClick={() => toggleSec(sKey)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <span style={{ fontSize: 12, color, lineHeight: 1 }}>{openSec[sKey] ? '▼' : '▶'}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color }}>{label}</span>
        </button>
    );

    const clearErrors = React.useCallback(() => setErrors([]), []);

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
        <_ClearErrorsCtx.Provider value={clearErrors}>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="card" style={{ width: '100%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0 }}>{initialIngredient ? '✏️ Modifica ingrediente' : '➕ Aggiungi ingrediente nel Data Base'}</h3>
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
                        <input style={!nome.trim() && errors.length > 0 ? _iSErr : _iS} value={nome}
                            onChange={e => { setNome(e.target.value); clearErrors(); }}
                            placeholder="es. salsa di soia artigianale" />
                    </div>
                    <div style={grid2}>
                        <div>
                            <label style={lS}>Categoria</label>
                            <select style={iS} value={categoria} onChange={e => setCategoria(e.target.value)}>
                                {['ingrediente','semilavorato','prodotto','additivo','aroma'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <NF label="○ Costo" value={eurKg} onChange={setEurKg} unit="€/kg" tooltip="Inserire il costo dell'ingrediente per kg. Di default è riportato 0." />
                    </div>
                    {/* Fonte dei dati */}
                    <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--color-bg-secondary,#f8f9fb)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                        <label style={{ ...lS, color: '#333', marginBottom: 8 }}>Fonte dei dati</label>
                        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: fonteTipo ? 10 : 0 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                <input type="radio" name="fonte-tipo" value="database" checked={fonteTipo === 'database'}
                                    onChange={() => { setFonteTipo('database'); setFonteDb(''); }} />
                                Database accreditati
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                <input type="radio" name="fonte-tipo" value="schede" checked={fonteTipo === 'schede'}
                                    onChange={() => { setFonteTipo('schede'); setFonteDb(''); }} />
                                Schede tecniche / Analisi di laboratorio / Web
                            </label>
                        </div>
                        {fonteTipo === 'database' && (
                            <div>
                                <select style={{ ...iS, marginBottom: 6 }} value={fonteDb} onChange={e => setFonteDb(e.target.value)}>
                                    <option value="">— Seleziona database —</option>
                                    {DB_ACCREDITATI.map(d => <option key={d.nome} value={d.nome}>{d.nome}</option>)}
                                </select>
                                {fonteDb && (() => {
                                    const entry = DB_ACCREDITATI.find(d => d.nome === fonteDb);
                                    return entry ? (
                                        <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Link:</span>
                                            <a href={entry.url} target="_blank" rel="noopener noreferrer"
                                                style={{ color: 'var(--color-orange)', fontWeight: 600, wordBreak: 'break-all' }}>
                                                {entry.url}
                                            </a>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* 1 — Valori di macronutrienti obbligatori */}
                <div style={secS}>
                    <div style={secT('#c53030')}>* Valori di macronutrienti obbligatori</div>
                    <div style={grid3}>
                        <NF label="* Grassi totali" value={grassi} onChange={setGrassi} err={!grassi && errors.length > 0} />
                        <NF label="* Acidi grassi saturi" value={saturi} onChange={setSaturi} err={!saturi && errors.length > 0} />
                        <NF label="* Carboidrati totali" value={carboidrati} onChange={setCarboidrati} err={!carboidrati && errors.length > 0} />
                        <NF label="* Zuccheri" value={zuccheri} onChange={setZuccheri} err={!zuccheri && errors.length > 0} />
                        <NF
                            label="* Fibre alimentari (altamente consigliato, anche se non obbligatorio in base al Reg. UE 1169/2011)"
                            value={fibre} onChange={v => { setFibre(v); clearErrors(); }}
                        />
                        <NF label="* Proteine" value={proteine} onChange={setProteine} err={!proteine && errors.length > 0} />
                        <NF label="* Sale" value={sale} onChange={setSale} err={!sale && errors.length > 0} />
                    </div>
                </div>

                {/* 2 — Valori di macronutrienti facoltativi (collassabile) */}
                <div style={secS}>
                    <AccHead label="○ Valori di macronutrienti facoltativi" sKey="facoltativi" />
                    {openSec.facoltativi && (
                        <div style={{ marginTop: 10, ...grid3 }}>
                            <NF label="○ Acidi grassi monoinsaturi" value={monoins} onChange={setMonoins} />
                            <NF label="○ Acidi grassi polinsaturi" value={polins} onChange={setPolins} />
                            <NF label="○ Eritritolo" value={eritritoloS} onChange={setEritritolo}
                                tooltip="Poliolo con fattore energetico 0 kcal/g (EU Reg 1169/2011). Non contribuisce al calcolo dell'energia." />
                            <NF label="○ Acidi organici" value={acidoOrganico} onChange={setAcidoOrganico}
                                tooltip="Es. acido acetico (aceto), acido lattico (yogurt). Fattore energetico: 3 kcal/g — 13 kJ/g (EU Reg 1169/2011)." />
                        </div>
                    )}
                </div>

                {/* 3 — Valori di macronutrienti obbligatori in taluni casi (collassabile) */}
                <div style={secS}>
                    <AccHead label="△ Valori obbligatori in taluni casi (USA/CA/AU/Arabi)" sKey="condizionali" color="#b7791f" />
                    {openSec.condizionali && (
                        <div style={{ marginTop: 10, ...grid3 }}>
                            <NF label="△ Acidi grassi trans" value={trans} onChange={setTrans}
                                tooltip="Obbligatorio per tabelle nutrizionali USA, Canada e Paesi Arabi." />
                            <NF label="△ Zuccheri aggiunti" value={zuccheriAgg} onChange={setZuccheriAgg}
                                tooltip="Obbligatorio per tabelle nutrizionali USA e Paesi Arabi." />
                            <NF label="△ Polioli (escluso eritritolo e glicerolo)" value={polioliS} onChange={v => { setPolioli(v); clearErrors(); }}
                                tooltip="Obbligatorio per tabella Australia se aggiunti in ricetta. Fattore energetico: 2,4 kcal/g — 10 kJ/g." />
                            <NF label="△ Glicerolo" value={glicerolo} onChange={v => { setGlicerolo(v); clearErrors(); }}
                                tooltip="Obbligatorio per tabella Australia se aggiunto in ricetta. Fattore energetico: 4,1 kcal/g — 17 kJ/g (EU Reg 1169/2011)." />
                            <NF label="△ Alcol etilico" value={alcolS} onChange={v => { setAlcol(v); clearErrors(); }}
                                unit="ml/100g"
                                tooltip="Obbligatorio se l'ingrediente contiene alcol (es. vino, birra, rum, liquori). Inserire ml/100g: il sistema calcola automaticamente i g/100g (× 0,79). Fattore energetico: 7 kcal/g — 29 kJ/g." />
                        </div>
                    )}
                </div>

                {/* 5 — Valori di micronutrienti (collassabile) */}
                <div style={secS}>
                    <AccHead label="Micronutrienti (nessuno obbligatorio in assoluto)" sKey="micro" color="#333" />
                    {openSec.micro && (<>

                    {/* 5a — Micronutrienti obbligatori in taluni casi */}
                    <div style={{ marginBottom: 14, marginTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#b7791f', marginBottom: 8 }}>△ Obbligatori in taluni casi</div>
                        <div style={grid3}>
                            <NF label="△ Colesterolo" value={colesterolo} onChange={setColesterolo} unit="mg/100g"
                                tooltip="Obbligatorio per tabelle nutrizionali USA, Canada e Paesi Arabi." />
                            <NF label="△ Potassio" value={potassio} onChange={setPotassio} unit="mg/100g"
                                tooltip="Obbligatorio per tabelle nutrizionali USA e Canada." />
                            <NF label="△ Calcio" value={calcio} onChange={setCalcio} unit="mg/100g"
                                tooltip="Obbligatorio per tabelle nutrizionali USA e Canada." />
                            <NF label="△ Ferro" value={ferro} onChange={setFerro} unit="mg/100g"
                                tooltip="Obbligatorio per tabelle nutrizionali USA e Canada." />
                            <NF label="△ Vitamina D (D2 + D3)" value={vitD} onChange={setVitD} unit="μg/100g"
                                tooltip="Obbligatorio per tabelle nutrizionali USA." />
                        </div>
                    </div>

                    {/* 5b — Micronutrienti facoltativi — altri sali minerali */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#718096', marginBottom: 8 }}>○ Altri sali minerali (facoltativi)</div>
                        <div style={grid3}>
                            <NF label="○ Fosforo" value={fosforo} onChange={setFosforo} unit="mg/100g" />
                            <NF label="○ Magnesio" value={magnesio} onChange={setMagnesio} unit="mg/100g" />
                            <NF label="○ Iodio" value={iodio} onChange={setIodio} unit="μg/100g" />
                            <NF label="○ Zinco" value={zinco} onChange={setZinco} unit="mg/100g" />
                            <NF label="○ Rame" value={rame} onChange={setRame} unit="mg/100g" />
                            <NF label="○ Manganese" value={manganese} onChange={setManganese} unit="mg/100g" />
                            <NF label="○ Selenio" value={selenio} onChange={setSelenio} unit="μg/100g" />
                        </div>
                    </div>

                    {/* 5c — Vitamine liposolubili */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#718096', marginBottom: 8 }}>○ Vitamine liposolubili (facoltative)</div>
                        <div style={grid3}>
                            <NF label="○ β-Carotene" value={betaCarotene} onChange={setBetaCarotene} unit="μg/100g"
                                tooltip="Precursore della vitamina A. Usato per calcolare Vitamina A (RE) = β-carotene/6 + retinolo." />
                            <NF label="○ Retinolo" value={retinolo} onChange={setRetinolo} unit="μg/100g"
                                tooltip="Forma preformata della vitamina A. Usato per calcolare Vitamina A (RE) = β-carotene/6 + retinolo." />
                            <NF label="○ Vitamina E (tocoferoli)" value={vitE} onChange={setVitE} unit="mg/100g" />
                            <NF label="○ Vitamina K (fillochinone)" value={vitK} onChange={setVitK} unit="μg/100g" />
                        </div>
                    </div>

                    {/* 5d — Vitamine idrosolubili */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#718096', marginBottom: 8 }}>○ Vitamine idrosolubili (facoltative)</div>
                        <div style={grid3}>
                            <NF label="○ Vitamina C" value={vitC} onChange={setVitC} unit="mg/100g" />
                            <NF label="○ Vitamina B1 (Tiamina)" value={vitB1} onChange={setVitB1} unit="mg/100g" />
                            <NF label="○ Vitamina B2 (Riboflavina)" value={vitB2} onChange={setVitB2} unit="mg/100g" />
                            <NF label="○ Vitamina B3 (Niacina)" value={vitB3} onChange={setVitB3} unit="mg/100g" />
                            <NF label="○ Vitamina B5 (Acido pantotenico)" value={vitB5} onChange={setVitB5} unit="mg/100g" />
                            <NF label="○ Vitamina B6" value={vitB6} onChange={setVitB6} unit="mg/100g" />
                            <NF label="○ Vitamina B9 (Folati)" value={vitB9} onChange={setVitB9} unit="μg/100g" />
                            <NF label="○ Vitamina B12" value={vitB12} onChange={setVitB12} unit="μg/100g" />
                        </div>
                    </div>

                    {/* 5e — Micronutrienti calcolati */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, background: 'var(--color-bg-secondary,#ebf8ff)', borderRadius: 6, padding: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#2b6cb0', marginBottom: 8 }}>◎ Micronutrienti calcolati automaticamente</div>
                        <div style={grid3}>
                            <NF label="◎ Vitamina A (RE)" value={String(vitA_eq)} unit="μg/100g" ro
                                tooltip="Vitamina A (retinolo equivalente) = β-carotene/6 + retinolo" />
                            <NF label="◎ Vitamina A (U.I.)" value={String(vitA_iu)} unit="UI/100g" ro
                                tooltip="Vitamina A (Unità Internazionali) = RE × 3,333333333" />
                        </div>
                    </div>
                    </>)}
                </div>

                {/* 4 — Valori calcolati automaticamente */}
                <div style={{ ...secS, background: 'var(--color-bg-secondary,#ebf8ff)', borderColor: waterError ? '#fc8181' : '#bee3f8' }}>
                    <div style={secT('#2b6cb0')}>◎ Valori calcolati automaticamente (EU Reg 1169/2011)</div>
                    {waterError && (
                        <div style={{ background: '#fff5f5', border: '1px solid #fc8181', borderRadius: 6, padding: '8px 10px', marginBottom: 10, fontSize: 12, color: '#c53030' }}>
                            ⚠ Acqua ({acquaCalc} g/100g) o residuo secco ({residuoSecco} g/100g) risulta negativo: rivedere i valori inseriti.
                        </div>
                    )}
                    <div style={grid3}>
                        <NF label="◎ Carboidrati totali (compreso fibre)" value={String(carboConFibre)} unit="g/100g" ro
                            tooltip="Carboidrati totali + fibre" />
                        <NF label="◎ Amido, glicogeno e destrine" value={String(amidoCalc)} unit="g/100g" ro
                            tooltip="Carboidrati (excl. fibre) − (zuccheri + polioli + eritritolo)" />
                        <NF label="◎ Sodio" value={String(sodioCalc)} unit="mg/100g" ro
                            tooltip="Sale × 400" />
                        <NF label="◎ Alcol etilico" value={String(alcolG)} unit="g/100g" ro
                            tooltip="Alcol etilico (ml/100g) × 0,79 (densità etanolo)" />
                        <NF label="◎ Acqua" value={String(acquaCalc)} unit="g/100g" ro err={waterError}
                            tooltip="100 − (grassi + carboConFibre + acidi organici + proteine + sale + alcol g/100g + minerali g/100g)" />
                        <NF label="◎ Residuo secco" value={String(residuoSecco)} unit="g/100g" ro err={waterError}
                            tooltip="100 − (alcol g/100g + acqua)" />
                        <NF label="◎ Energia" value={String(kcalCalc)} unit="kcal/100g" ro
                            tooltip="(grassi×9) + (carbo disponibili×4) + (polioli×2,4) + (fibre×2) + (acidi org×3) + (proteine×4) + (alcol g×7)" />
                        <NF label="◎ Energia" value={String(kjCalc)} unit="kJ/100g" ro
                            tooltip="(grassi×37) + (carbo disponibili×17) + (polioli×10) + (fibre×8) + (acidi org×13) + (proteine×17) + (alcol g×29)" />
                    </div>
                </div>

                {/* 5 — Allergeni (Reg. UE 1169/2011) */}
                <div style={secS}>
                    <AccHead label="Allergeni (Reg. UE 1169/2011)" sKey="allergenici" color="#c53030" />
                    {openSec.allergenici && (<>
                        <div style={{ marginTop: 10, marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#c53030', marginBottom: 6 }}>Contiene:</div>
                            <AllergenRow keys={CI_ALLERGEN_KEYS} labels={CI_ALLERGEN_LABELS} state={allergens} setState={setAllergens} />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#e65100', marginBottom: 6 }}>Può contenere tracce di (contaminazione crociata):</div>
                            <AllergenRow keys={CI_CROSS_KEYS} labels={CI_CROSS_LABELS} state={crossAllergens} setState={setCrossAllergens} />
                        </div>
                    </>)}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Save size={14} /> Salva nel database personale</button>
                    <button className="btn btn-outline" onClick={onClose}>Annulla</button>
                </div>
            </div>
        </div>
        </_ClearErrorsCtx.Provider>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const makeComp = (): Component => ({ id: String(Date.now() + Math.random()), name: '', rows: [], additiveRows: [], pzUV: 1 });

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
    const [showBrowseModal, setShowBrowseModal] = useState(false);
    const [showSmartImport, setShowSmartImport] = useState(false);
    const { hasTool } = useAuth();
    const hasExcelImport = hasTool('excel-import');
    const [editIngredient, setEditIngredient] = useState<{ ing: DBIngredient; isCustom: boolean } | null>(null);
    // const [toolTab, setToolTab] = useState<'tabelle' | 'lista'>('tabelle');
    const [servingOpen, setServingOpen] = useState<Record<string, boolean>>({
        '🇪🇺 UE': false, '🇺🇸 USA (CUP=240ml)': false, '🇨🇦 Canada (CUP=250ml)': false, '🇦🇺 Australia': false, '🌍 Paesi Arabi (CUP=240ml)': false
    });
    const [activeTab, setActiveTab] = useState<NationTab>('UE');
    const [subTab, setSubTab] = useState<SubTab>('verticale');
    const [auShowDI, setAuShowDI] = useState(true);
    const [showOptionals, setShowOptionals] = useState(false);
    const [isLiquid, setIsLiquid] = useState(false);
    // ponytail: euSubTab rimosso — UI formato vive in DownloadTableModal
    const [selectedOptionals, setSelectedOptionals] = useState<SelectedOptionals>({ ...DEFAULT_OPTIONALS });
    const [nutrModalOpen, setNutrModalOpen] = useState(false);
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);
    // ponytail: usaServingRef/usaMeasure rimossi — UI formato vive in DownloadTableModal
    useState(true); // pesoCardOpen — dead state, hook order preserved
    const [compOpen, setCompOpen] = useState<Record<string, boolean>>({});
    const [pzUVRaw, setPzUVRaw] = useState<Record<string, string>>({});
    const [gramsRaw, setGramsRaw] = useState<Record<string, string>>({});
    const [eurKgRaw, setEurKgRaw] = useState<Record<string, string>>({});
    const [resaRaw, setResaRaw] = useState<Record<string, string>>({});
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const toggleExpandRow = (rowId: string) => setExpandedRows(prev => {
        const next = new Set(prev);
        if (next.has(rowId)) next.delete(rowId); else next.add(rowId);
        return next;
    });
    useState(true); // additiveOpen — dead state, hook order preserved
    useState(true); // riepilogoOpen — dead state, hook order preserved
    const [riepilogoTab, setRiepilogoTab] = useState<'q' | 'c'>('q');
    useLocalStorage<boolean>('nutri_ricetta_open', true); // ricettaOpen — dead

    // Quick-guide state — dead, hook order preserved
    useLocalStorage<boolean>('nutri_guide_open', true);

    const [expertTab, setExpertTab] = useState<'ricetta' | 'riepilogo'>('ricetta');

    // Toast + ConfirmDialog state (replaces native alert/confirm)
    const toast = useToast();
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        message: string;
        variant: 'danger' | 'warning' | 'info';
        confirmLabel: string;
        onConfirm: () => void;
    }>({ open: false, title: '', message: '', variant: 'warning', confirmLabel: 'Conferma', onConfirm: () => {} });
    const openConfirm = (opts: Omit<typeof confirmState, 'open'>) => setConfirmState({ ...opts, open: true });
    const closeConfirm = () => setConfirmState(prev => ({ ...prev, open: false }));

    // Database state — fetched + merged with personal custom ingredients
    const [db, setDb] = useState<DBIngredient[]>([]);
    const [loadingDB, setLoadingDB] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);

    const loadDB = React.useCallback(() => {
        setLoadingDB(true);
        setDbError(null);
        // S0: carica da endpoint Django autenticato; in dev senza backend → fallback statico
        const fromAPI = () => apiFetch<DBIngredient[]>('/api/ingredients/');
        const fromStatic = () => fetch('/data/ingredientsDB.json').then(r => r.json() as Promise<DBIngredient[]>);
        fromAPI()
            .catch(() => fromStatic())
            .then(data => {
                let base = data;
                try {
                    const raw = JSON.parse(localStorage.getItem('custom_ingredients') || '[]') as unknown[];
                    const custom = Array.isArray(raw) ? raw.filter(isValidDBIngredient) as DBIngredient[] : [];
                    if (custom.length) base = [...base, ...custom];
                } catch {}
                setDb(base);
                setLoadingDB(false);
            })
            .catch(err => { console.error('Error loading DB:', err); setLoadingDB(false); setDbError('Impossibile caricare il database ingredienti.'); });
    }, []);

    useEffect(() => { loadDB(); }, [loadDB]);

    // Ripristina sessione bridge quando il DB è pronto (es. dopo resize desktop↔mobile)
    useEffect(() => {
        if (loadingDB || db.length === 0) return;
        const draft = readBridge();
        if (!draft || draft.source !== 'desktop' || Date.now() - draft.timestamp > 300_000) return;
        setProductName(draft.denominazione);
        setFinishedWeight(draft.pesoFinito_g);
        setSpecificGravity(draft.specificGravity);
        const n = (s: string) => Number(s) || undefined;
        setUE({ porzione: n(draft.ue_porzione), confezione: n(draft.ue_confezione), pezzo: n(draft.ue_pezzo) });
        setUSA({ serving: n(draft.usa_serving), confezione: n(draft.usa_confezione), cup: n(draft.usa_cup), cucchiaio: n(draft.usa_cucchiaio), pezzo: n(draft.usa_pezzo) });
        setCA({ serving: n(draft.ca_serving), confezione: n(draft.ca_confezione), cup: n(draft.ca_cup), cucchiaio: n(draft.ca_cucchiaio), pezzo: n(draft.ca_pezzo) });
        setAU({ serving: n(draft.au_serving), confezione: n(draft.au_confezione), pezzo: n(draft.au_pezzo) });
        setArabi({ serving: n(draft.arabi_serving), confezione: n(draft.arabi_confezione), cup: n(draft.arabi_cup), cucchiaio: n(draft.arabi_cucchiaio), pezzo: n(draft.arabi_pezzo) });
        const restoredComps: Component[] = draft.components.map(c => ({
            id: String(Date.now() + Math.random()),
            name: c.name,
            pzUV: c.pzUV,
            rows: c.rows.flatMap(r => {
                const found = db.find(dbi => dbi.nome === r.ingNome);
                return found ? [{ id: String(Date.now() + Math.random()), ing: found, grams: r.grams, eurKg: r.eurKg, resa: r.resa }] : [];
            }),
            additiveRows: c.additiveRows.map(ar => ({
                id: String(Date.now() + Math.random()),
                categoria: ar.categoria, nomeSpecifico: ar.nomeSpecifico,
                grams: 0, eurKg: 0, resa: 100,
            })),
        }));
        const compsToSet = restoredComps.length ? restoredComps : [makeComp()];
        setComponents(compsToSet);
        const pzRaw: Record<string, string> = {};
        compsToSet.forEach(c => { pzRaw[c.id] = String(c.pzUV); });
        setPzUVRaw(pzRaw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingDB]);

    const addCustomIngredient = (ing: DBIngredient) => setDb(prev => [...prev, ing]);


    const [usa, setUSA] = useState<ServingSizesNation>({});
    const [ca, setCA] = useState<ServingSizesNation>({});
    // ponytail: caServingRef/caMeasure rimossi — UI formato vive in DownloadTableModal
    const [au, setAU] = useState<ServingSizesNation>({});
    const [arabi, setArabi] = useState<ServingSizesNation>({});
    // ponytail: arabiServingRef/arabiMeasure rimossi — UI formato vive in DownloadTableModal
    const [ue, setUE] = useState<UEServing>({});
    // ponytail: fallback euSubTab rimosso — vista fissa 100g, scelte formato in DownloadTableModal
    const tableRef = useRef<HTMLDivElement>(null);

    // ─── Griglia porzioni collassabile (D1): auto-chiusa se la regione attiva ha già valori ───
    // ponytail: servingsGridOpen rimosso — porzioni ora sempre visibili in colonna fissa
    // ponytail: servingValsRef / auto-open effect rimossi — porzioni sempre visibili

    const { items: archiveItems, saveItem, deleteItem } = useArchive<ArchiveData>('nutrizionale-v3');
    const [, setCurrentId] = useState<string | undefined>(undefined);
    const [, setCurrentName] = useState('');
    const [isFlashing, setIsFlashing] = useState(false);
    const [lastAddedRowId, setLastAddedRowId] = useState('');

    // ── Auto-save draft ──────────────────────────────────────────────────────
    const [isDirty, setIsDirty] = useState(false);
    const DRAFT_KEY = 'nut_draft';
    const draftData = useMemo(() => ({
        components, productName, finishedWeight, specificGravity,
    }), [components, productName, finishedWeight, specificGravity]);
    const draftEnabled = components.some(c => c.rows.length > 0) || !!productName;
    const { hasDraft, loadDraft, clearDraft } = useAutosave(DRAFT_KEY, draftData, draftEnabled);

    // Mark dirty when recipe content changes
    const lastSavedRef = useRef<string>('');
    useEffect(() => {
        const snap = JSON.stringify(draftData);
        if (lastSavedRef.current && snap !== lastSavedRef.current) setIsDirty(true);
    }, [draftData]);

    // Offer draft restore once DB is loaded (only when recipe is empty)
    const draftOfferDoneRef = useRef(false);
    useEffect(() => {
        if (loadingDB || draftOfferDoneRef.current || !hasDraft) return;
        if (components.some(c => c.rows.length > 0) || !!productName) return; // recipe already populated
        draftOfferDoneRef.current = true;
        openConfirm({
            title: 'Bozza non salvata',
            message: 'Hai una bozza non salvata. Vuoi ripristinarla?',
            variant: 'info',
            confirmLabel: 'Ripristina',
            onConfirm: () => {
                const draft = loadDraft();
                if (!draft) return;
                setProductName(draft.productName);
                setFinishedWeight(draft.finishedWeight);
                setSpecificGravity(draft.specificGravity);
                // Restore components: re-resolve ingredient references from DB
                const restoredComps: Component[] = draft.components.map(c => ({
                    ...c,
                    id: String(Date.now() + Math.random()),
                    rows: c.rows.flatMap(r => {
                        const found = db.find(d => d.nome === r.ing.nome);
                        return found ? [{ ...r, id: String(Date.now() + Math.random()), ing: found }] : [];
                    }),
                }));
                const compsToSet = restoredComps.length ? restoredComps : [makeComp()];
                setComponents(compsToSet);
                const restoredPzUVRaw: Record<string, string> = {};
                compsToSet.forEach(c => { restoredPzUVRaw[c.id] = String(c.pzUV); });
                setPzUVRaw(restoredPzUVRaw);
                clearDraft();
                closeConfirm();
            },
        });
    // ponytail: one-shot effect, intentionally omitting openConfirm/closeConfirm (stable refs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingDB, hasDraft]);
    const flashInitRef = useRef(false);

    // Weight totals (ingredienti + additivi)
    const totalGramsRaw = components.reduce((s, c) =>
        s + c.rows.reduce((rs, r) => rs + r.grams, 0)
          + c.additiveRows.reduce((rs, r) => rs + (r.grams || 0), 0), 0);
    const fw = parseFloat(finishedWeight) || 0;
    const pesoTotale = fw > 0 ? fw : totalGramsRaw;

    // All rows combined for rendering
    const allRows = useMemo(() => components.flatMap(c => c.rows.map(r => ({ ing: r.ing, grams: r.grams, eurKg: r.eurKg, resa: r.resa }))), [components]);

    // Ingredienti aggregati per nome (deduplicati tra componenti)
    const mergedIngredients = useMemo(() => {
        const map = new Map<string, { ing: DBIngredient; grammiTotali: number; grammiXpzuv: number; eurKg: number; resa: number; }>();
        for (const comp of components) {
            const pzUV = comp.pzUV || 1;
            for (const row of comp.rows) {
                const key = row.ing.nome;
                const ex = map.get(key);
                if (ex) {
                    ex.grammiTotali += row.grams;
                    ex.grammiXpzuv += row.grams / pzUV;
                    if (ex.eurKg === 0 && row.eurKg > 0) ex.eurKg = row.eurKg;
                } else {
                    map.set(key, { ing: row.ing, grammiTotali: row.grams, grammiXpzuv: row.grams / pzUV, eurKg: row.eurKg, resa: row.resa });
                }
            }
        }
        return [...map.values()].sort((a, b) => a.ing.nome.localeCompare(b.ing.nome, 'it'));
    }, [components]);

    const totAdditiveGramsXpzuv = useMemo(() =>
        components.reduce((s, c) => s + c.additiveRows.reduce((rs, r) => rs + (r.grams || 0), 0) / (c.pzUV || 1), 0),
    [components]);
    const totGrammiXpzuv = useMemo(() => mergedIngredients.reduce((s, r) => s + r.grammiXpzuv, 0) + totAdditiveGramsXpzuv, [mergedIngredients, totAdditiveGramsXpzuv]);

    // Calculation
    const per100g = useMemo(() => calcNutrients(components, fw), [components, fw]);

    useEffect(() => {
        if (!flashInitRef.current) { flashInitRef.current = true; return; }
        setIsFlashing(true);
        const t = setTimeout(() => setIsFlashing(false), 600);
        return () => clearTimeout(t);
    }, [per100g]);

    // Se peso specifico inserito, i valori per 100ml = valori per 100g × densità
    const per100display = useMemo(() => {
        const sgVal = parseFloat(specificGravity) || 0;
        return sgVal > 0 ? scaleResult(per100g, sgVal * 100) : per100g;
    }, [per100g, specificGravity]);

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
    const addComp = () => { setComponents(prev => [...prev, makeComp()]); };
    const handleSmartImport = useCallback((result: SmartImportResult) => {
        if (!result.components.length) return;
        const firstId = components[0]?.id;
        setComponents(prev => {
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
                    // primo componente → aggiunge al componente esistente
                    const name = result.productName || comp.name;
                    updated = updated.map(c => c.id !== firstId ? c : { ...c, rows: [...c.rows, ...newRows], name: c.name || name });
                } else {
                    updated = [...updated, { ...makeComp(), name: comp.name, rows: newRows }];
                }
            });
            return updated;
        });
        const total = result.components.reduce((s, c) => s + c.rows.length, 0);
        const label = result.productName ? `"${result.productName}"` : `${result.components.length} componente${result.components.length > 1 ? 'i' : ''}`;
        toast.success(`${total} ingredienti importati — ${label}.`);
    }, [components, toast]);
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
        const newId = String(Date.now() + Math.random());
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: [...c.rows, { id: newId, ing, grams: 100, eurKg: 0, resa: 100 }]
        }));
        setLastAddedRowId(newId);
        setTimeout(() => setLastAddedRowId(''), 250);
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
    const updateRowFlag = (compId: string, rowId: string, flag: 'postCottura' | 'acquaAggiunta', value: boolean) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: c.rows.map(r => r.id === rowId ? { ...r, [flag]: value } : r)
        }));
    };
    const removeRow = (compId: string, rowId: string) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : { ...c, rows: c.rows.filter(r => r.id !== rowId) }));
    };

    const addAdditiveRow = (compId: string) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, additiveRows: [...c.additiveRows, { id: String(Date.now() + Math.random()), categoria: '', nomeSpecifico: '', grams: 0, eurKg: 0, resa: 100 }]
        }));
    };
    const removeAdditiveRow = (compId: string, rowId: string) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : { ...c, additiveRows: c.additiveRows.filter(r => r.id !== rowId) }));
    };
    const updateAdditiveRow = (compId: string, rowId: string, field: keyof AdditiveRow, value: string | number) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, additiveRows: c.additiveRows.map(r => r.id !== rowId ? r : { ...r, [field]: value })
        }));
    };

    // Finished weight validation with input validation
    const handleFW = (val: string) => {
        const errorKey = 'finished-weight';
        const parsed = parseFloat(val) || 0;

        if (val !== '' && val !== '0') {
            const validation = validateFinishedWeight(parsed);
            if (!validation.isValid) {
                setFieldErrors(prev => ({...prev, [errorKey]: validation.error!}));
                setFinishedWeight(val);
                return;
            }
        }

        if (parsed > 0 && totGrammiXpzuv > 0 && parsed > totGrammiXpzuv) {
            setFwWarning(false);
            setFieldErrors(prev => ({...prev, [errorKey]: ''}));
            setFinishedWeight(String(Math.round(totGrammiXpzuv)));
        } else {
            setFwWarning(false);
            setFieldErrors(prev => ({...prev, [errorKey]: ''}));
            setFinishedWeight(val);
        }
    };

    // Re-valida peso finito ogni volta che cambia totGrammiXpzuv (es. si aggiungono ingredienti)
    useEffect(() => {
        const errorKey = 'finished-weight';
        const parsed = parseFloat(finishedWeight) || 0;
        if (parsed <= 0 || totGrammiXpzuv <= 0) { setFwWarning(false); setFieldErrors(prev => ({...prev, [errorKey]: ''})); return; }
        if (parsed > totGrammiXpzuv) {
            setFwWarning(false);
            setFieldErrors(prev => ({...prev, [errorKey]: ''}));
            setFinishedWeight(String(Math.round(totGrammiXpzuv)));
        } else {
            setFwWarning(false);
            setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        }
    }, [totGrammiXpzuv]);

    // Archive save/load
    const handleSave = () => {
        const name = productName || 'Ricetta';
        const existing = archiveItems.find(i => i.name === name);
        const snap = JSON.stringify(draftData);
        saveItem(name, {
            nome_prodotto: productName,
            componenti: components.map(c => ({
                nome: c.name,
                pz_uv: c.pzUV,
                ingredienti: c.rows.map(r => ({ nome: r.ing.nome, grammi: r.grams })),
                additiveRows: c.additiveRows,
            })),
            additivi: additiveChips.map(a => a.nome),
            peso_finito_pz: fw,
            serving_sizes: { UE: ue, USA: usa, Canada: ca, Australia: au, Arabi: arabi }
        }, existing?.id);
        clearDraft();
        lastSavedRef.current = snap;
        setIsDirty(false);
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
                additiveRows: (sc.additiveRows || []).map((ar: any) => ({
                    id: String(Date.now() + Math.random()),
                    categoria: ar.categoria || '',
                    nomeSpecifico: ar.nomeSpecifico || '',
                    grams: ar.grams || 0,
                    eurKg: ar.eurKg || 0,
                    resa: ar.resa || 100,
                })),
            };
        });
        const compsToSet = loadedComps.length ? loadedComps : [makeComp()];
        setComponents(compsToSet);
        // Ripristina pzUVRaw con i valori caricati (i nuovi ID non combacerebbero altrimenti)
        const restoredPzUVRaw: Record<string, string> = {};
        compsToSet.forEach(c => { restoredPzUVRaw[c.id] = String(c.pzUV); });
        setPzUVRaw(restoredPzUVRaw);
        setCurrentId(item.id);
        setCurrentName(item.name);
        setArchiveOpen(false);
        writeBridge(buildDesktopDraft(d, compsToSet));
    };

    const doResetRecipe = () => {
        setProductName('');
        setComponents([makeComp()]);
        setAdditives(['']);
        setAdditiveChips([]);
        setFinishedWeight('');
        setSpecificGravity('');
        setFwWarning(false);
        setUE({}); setUSA({}); setCA({}); setAU({}); setArabi({});
        setCurrentId(undefined);
        setCurrentName('');
    };

    const handleNew = () => {
        if (allRows.length > 0) {
            openConfirm({
                title: 'Nuova ricetta',
                message: 'Vuoi davvero creare una nuova ricetta? I dati non salvati andranno persi.',
                variant: 'warning',
                confirmLabel: 'Crea nuova',
                onConfirm: () => { closeConfirm(); doResetRecipe(); },
            });
            return;
        }
        doResetRecipe();
    };

    const _handlePDF = async () => {
        if (allRows.length === 0 || !productName) { toast.warning('Inserisci il nome del prodotto e almeno un ingrediente prima di scaricare.'); return; }
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
            const p = per100display;
            const sgVal = parseFloat(specificGravity) || 0;
            const pdfLabel = sgVal > 0 ? `Valori Nutrizionali per 100ml (peso specifico: ${sgVal})` : 'Valori Nutrizionali per 100g';
            doc.text(pdfLabel + ' (tutti i dati calcolati)', M, y); y += 5;
            doc.setDrawColor(220, 220, 220); doc.line(M, y, W - M, y); y += 5;
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

            const safeName = (productName || 'ricetta').replace(/[^\w\sÀ-ÿ\-]/g, '').trim().replace(/\s+/g, '_');
            doc.save(`${safeName}_scheda_${activeTab}.pdf`);
        } catch (e) {
            console.error('PDF export error:', e);
            toast.error('Errore durante la generazione del PDF.');
        }
    };
    void _handlePDF; // dead — UI button removed; logic preserved in git

    // ─── (wizard renderer removed) ────────────────────────────────────────────

    // ponytail: renderDownloadPreview mirrors renderTablePanel tab components with modal-local format state
    const renderDownloadPreview = (state: DownloadFormatState, handlers: DownloadPreviewHandlers): React.ReactNode => {
        switch (activeTab) {
            case 'UE':
                return (
                    <TabUE
                        p={per100display}
                        ue={ue}
                        specificGravity={parseFloat(specificGravity) || 0}
                        selectedOptionals={selectedOptionals}
                        showOptionals={showOptionals}
                        activeSubTab={state.euSubTab}
                    />
                );
            case 'USA':
                return (
                    <TabUSA p={per100display} usa={usa} specificGravity={parseFloat(specificGravity) || 0}
                        servingRef={state.servingRef} measure={state.measure} subTab={state.subTab} />
                );
            case 'Canada':
                return (
                    <TabCanada p={per100display} ca={ca} servingRef={state.servingRef} measure={state.measure}
                        subTab={state.subTab} setSubTab={handlers.setSubTab} full={false} />
                );
            case 'Australia':
                return (
                    <TabAustralia p={per100display} au={au} showDI={handlers.showDI} setShowDI={handlers.setShowDI} full={false} />
                );
            case 'Arabi':
                return (
                    <TabArabi p={per100display} arabi={arabi} servingRef={state.servingRef} measure={state.measure}
                        specificGravity={parseFloat(specificGravity) || 0} full={false} />
                );
        }
    };

    const renderTablePanel = (isMobileInline = false): React.ReactNode => {
        return (
            <div id={isMobileInline ? undefined : 'mob-tables-anchor'} className={`table-panel-inner${isFlashing ? ' value-flash' : ''}`}>
            <div className="table-panel-header">
                {/* TABELLA NUTRIZIONALE heading */}
                <div className="table-panel-header-title">Tabella nutrizionale</div>
                {/* Nation segmented control — matches HTML .right-seg */}
                <div className="right-seg" role="group" aria-label="Mercato di riferimento">
                    {(['UE', 'USA', 'Canada', 'Australia', 'Arabi'] as NationTab[]).map(t => {
                        const labels: Record<NationTab, string> = { UE: 'EU', USA: 'USA', Canada: 'Canada', Australia: 'Australia', Arabi: 'Arabi' };
                        return (
                            <button key={t} type="button" onClick={() => setActiveTab(t)}
                                className={`right-seg-btn${activeTab === t ? ' active' : ''}`}
                            >{labels[t]}</button>
                        );
                    })}
                </div>
                <button type="button" onClick={() => setDownloadModalOpen(true)}
                    className="btn btn-accent" style={{ fontSize: 12, padding: '5px 12px', marginLeft: 'auto' }}>
                    <ImageDown size={13} aria-hidden="true" /> Scarica ufficiale…
                </button>

            </div>{/* /table-panel-header */}

                {/* Body: tabella + colonna porzioni fissa */}
                <div className="table-panel-body">
                <div ref={isMobileInline ? undefined : tableRef} className="table-scroll-area" style={{ overflowX: 'auto' }}>
                    {activeTab === 'UE' && (
                        <>
                            <div style={{ border: '1px solid #eaecf0', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
                                <TabUE
                                    p={per100display}
                                    ue={ue}
                                    specificGravity={parseFloat(specificGravity) || 0}
                                    selectedOptionals={selectedOptionals}
                                    showOptionals={showOptionals}
                                    activeSubTab="100g"
                                />
                            </div>
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                                    <input
                                        type="checkbox"
                                        checked={showOptionals}
                                        onChange={e => setShowOptionals(e.target.checked)}
                                        style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--color-orange)' }}
                                    />
                                    Mostra valori facoltativi
                                </label>
                                {showOptionals && (
                                    <button
                                        type="button"
                                        onClick={() => setNutrModalOpen(true)}
                                        className="btn btn-outline"
                                        style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5 }}
                                    >
                                        ⚙ Configura nutrienti
                                    </button>
                                )}
                            </div>
                            {/* ── Claim nutrizionali EU (Reg. 2006/1924) ──────── */}
                            {(() => {
                                const claims = calcClaims(per100display, isLiquid);
                                return (
                                    <div style={{ marginTop: 12, borderTop: '1px solid #eaecf0', paddingTop: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)' }}>
                                                Claim nutrizionali EU
                                            </span>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isLiquid}
                                                    onChange={e => setIsLiquid(e.target.checked)}
                                                    style={{ width: 12, height: 12, cursor: 'pointer', accentColor: 'var(--color-orange)' }}
                                                />
                                                Prodotto liquido
                                            </label>
                                        </div>
                                        {claims.length === 0 ? (
                                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                Nessun claim applicabile con i valori attuali.
                                            </span>
                                        ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                                {claims.map(c => (
                                                    <span key={c} style={{
                                                        fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
                                                        background: 'var(--color-navy)', color: '#fff',
                                                        borderRadius: 4, padding: '3px 7px',
                                                    }}>
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: '6px 0 0', lineHeight: 1.4 }}>
                                            Reg. 2006/1924 — verificare sempre con il consulente prima di apporli in etichetta.
                                        </p>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                    {activeTab === 'USA' && (
                        <div style={{ border: '1px solid #eaecf0', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
                            <TabUSA p={per100display} usa={usa} specificGravity={parseFloat(specificGravity) || 0}
                                servingRef="serving" measure="g" subTab="verticale" />
                        </div>
                    )}
                    {activeTab === 'Canada' && (
                        <div style={{ border: '1px solid #eaecf0', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
                            <TabCanada p={per100display} ca={ca} servingRef="serving" measure="g" subTab={subTab} setSubTab={setSubTab} full={false} />
                        </div>
                    )}
                    {activeTab === 'Australia' && (
                        <div style={{ border: '1px solid #eaecf0', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
                            <TabAustralia p={per100display} au={au} showDI={auShowDI} setShowDI={setAuShowDI} full={false} />
                        </div>
                    )}
                    {activeTab === 'Arabi' && (
                        <div style={{ border: '1px solid #eaecf0', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
                            <TabArabi p={per100display} arabi={arabi} servingRef="serving" measure="g" specificGravity={parseFloat(specificGravity) || 0} full={false} />
                        </div>
                    )}
                </div>

                {/* Colonna porzioni fissa — sempre visibile */}
                <aside className="portions-col" aria-label={`Porzioni ${activeTab}`}>
                    <div className="portions-col-title">Porzioni {activeTab}</div>
                    {activeTab === 'UE' && (['porzione', 'confezione', 'pezzo'] as const).map((k, i) => {
                        const labels = ['Porzione (g/ml)', 'U.V. / Confezione (g/ml)', 'Pezzo (g/ml)'];
                        return (
                            <div key={k} className="field">
                                <label className="field-label">{labels[i]}</label>
                                <input type="number" min={0} placeholder="—" value={ue[k] || ''}
                                    onChange={e => setUE(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                    className="field-input" style={{ padding: '5px 8px', fontSize: 12 }} />
                            </div>
                        );
                    })}
                    {activeTab === 'USA' && (['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                        const labels = ['CUP 240ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                        return (
                            <div key={k} className="field">
                                <label className="field-label">{labels[i]}</label>
                                <input type="number" min={0} placeholder="—" value={usa[k] || ''}
                                    onChange={e => setUSA(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                    className="field-input" style={{ padding: '5px 8px', fontSize: 12 }} />
                            </div>
                        );
                    })}
                    {activeTab === 'Canada' && (['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                        const labels = ['CUP 250ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                        return (
                            <div key={k} className="field">
                                <label className="field-label">{labels[i]}</label>
                                <input type="number" min={0} placeholder="—" value={ca[k] || ''}
                                    onChange={e => setCA(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                    className="field-input" style={{ padding: '5px 8px', fontSize: 12 }} />
                            </div>
                        );
                    })}
                    {activeTab === 'Australia' && (['serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                        const labels = ['Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                        return (
                            <div key={k} className="field">
                                <label className="field-label">{labels[i]}</label>
                                <input type="number" min={0} placeholder="—" value={au[k] || ''}
                                    onChange={e => setAU(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                    className="field-input" style={{ padding: '5px 8px', fontSize: 12 }} />
                            </div>
                        );
                    })}
                    {activeTab === 'Arabi' && (['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                        const labels = ['CUP 240ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                        return (
                            <div key={k} className="field">
                                <label className="field-label">{labels[i]}</label>
                                <input type="number" min={0} placeholder="—" value={arabi[k] || ''}
                                    onChange={e => setArabi(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                    className="field-input" style={{ padding: '5px 8px', fontSize: 12 }} />
                            </div>
                        );
                    })}
                </aside>
                </div>{/* /table-panel-body */}

            <div className="table-panel-footer">
                <button type="button" onClick={handleSave}
                    style={{ width: '100%', padding: '7px', borderRadius: '7px', background: 'var(--color-navy)', color: 'white', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Save size={13} /> Salva in archivio
                </button>
            </div>
            </div>
        );
    };

    return (
        <>
            {/* Inject title into topbar-left slot */}
            {createPortal(
                <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                    {productName ? (
                        <span style={{ color: 'var(--color-orange)' }}>{productName}</span>
                    ) : (
                        <span style={{ color: 'var(--color-text)' }}>Calcolatore Ricette</span>
                    )}
                </div>,
                document.getElementById('topbar-title-slot') ?? document.body
            )}

            {/* Action buttons into topbar slot */}
            {createPortal(
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button type="button" className="topbar-btn-primary" onClick={handleNew}>
                        <Plus size={13} />
                        Nuova Ricetta
                    </button>
                    <button type="button" className="topbar-btn-ghost" onClick={() => setArchiveOpen(true)}>
                        <Archive size={13} />
                        Archivio
                    </button>
                    <button type="button" className="topbar-btn-ghost" onClick={() => setShowSmartImport(true)}>
                        <Sparkles size={13} />
                        Importa Ricetta
                    </button>
                    <button type="button" className="topbar-btn-ghost" onClick={() => setShowCustomModal(true)}>
                        <Database size={13} />
                        Nuovo Ingrediente
                    </button>
                    <button type="button" className="topbar-btn-ghost" onClick={() => setShowBrowseModal(true)}>
                        <Database size={13} />
                        Sfoglia DB
                    </button>
                    <button type="button" className="topbar-btn-ghost" onClick={handleSave} style={{ position: 'relative' }}>
                        {isDirty && (
                            <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--color-orange, #f97316)', pointerEvents: 'none' }} />
                        )}
                        <Save size={13} />
                        Salva
                    </button>
                </div>,
                document.getElementById('topbar-mode-toggle-slot') ?? document.body
            )}

            {/* Modals */}
            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                variant={confirmState.variant}
                confirmLabel={confirmState.confirmLabel}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
            />
            {showSmartImport && (
                <SmartImportModal
                    db={db}
                    onClose={() => setShowSmartImport(false)}
                    onImport={handleSmartImport}
                />
            )}
            {showCustomModal && (
                <CustomIngredientModal
                    onClose={() => setShowCustomModal(false)}
                    onSave={(ing) => { addCustomIngredient(ing); }}
                />
            )}
            {editIngredient && (
                <CustomIngredientModal
                    initialIngredient={editIngredient.ing}
                    originalNome={editIngredient.isCustom ? editIngredient.ing.nome : undefined}
                    onClose={() => setEditIngredient(null)}
                    onSave={(ing) => {
                        // Rimuovi vecchio e aggiungi nuovo nel db state
                        if (editIngredient.isCustom) {
                            setDb(prev => [...prev.filter(i => i.nome !== editIngredient.ing.nome), ing]);
                        } else {
                            addCustomIngredient(ing);
                        }
                        setEditIngredient(null);
                    }}
                />
            )}
            {showBrowseModal && (
                <BrowseIngredientsModal
                    db={db}
                    onClose={() => setShowBrowseModal(false)}
                    onEditIngredient={(ing, isCustom) => {
                        setShowBrowseModal(false);
                        setEditIngredient({ ing, isCustom });
                    }}
                />
            )}
            {downloadModalOpen && (
                <DownloadTableModal
                    region={activeTab}
                    ue={ue}
                    nation={activeTab === 'USA' ? usa : activeTab === 'Canada' ? ca : activeTab === 'Australia' ? au : activeTab === 'Arabi' ? arabi : {}}
                    productName={productName}
                    onClose={() => setDownloadModalOpen(false)}
                    renderPreview={renderDownloadPreview}
                />
            )}
            <NutrientSelectModal
                open={nutrModalOpen}
                onClose={() => setNutrModalOpen(false)}
                selected={selectedOptionals}
                onChange={setSelectedOptionals}
            />
            {/* Archive modal */}
            {archiveOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '90%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}><FolderOpen size={16} /> Archivio Ricette</h3>
                            <button className="btn btn-outline" onClick={() => setArchiveOpen(false)} title="Chiudi" style={{ display: 'flex', alignItems: 'center', padding: '4px 8px' }}><X size={14} /></button>
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
                                        <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px', color: '#e53e3e' }} onClick={() => openConfirm({ title: 'Eliminare ricetta', message: `Vuoi eliminare "${title}"? L'azione è irreversibile.`, variant: 'danger', confirmLabel: 'Elimina', onConfirm: () => { closeConfirm(); deleteItem(item.id); } })}>🗑 Elimina</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="calc-outer-shell" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height, 56px))' }}>

            <SplitShell
                left={
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: 15 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Tab bar — hidden on mobile, replaced by bottom bar */}
                            <div className="expert-desktop-tabbar" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'white', flexShrink: 0, height: 40 }}>
                                {([
                                    { key: 'ricetta',   label: 'Ricetta' },
                                    { key: 'riepilogo', label: 'Riepilogo' },
                                ] as { key: 'ricetta' | 'riepilogo'; label: string }[]).map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setExpertTab(tab.key)}
                                        className={`expert-tab-btn${expertTab === tab.key ? ' active' : ''}`}
                                        style={{ marginBottom: -1 }}
                                    >
                                        {tab.label}
                                        {tab.key === 'ricetta' && allRows.length > 0 && (
                                            <span className="count-badge">{allRows.length}</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Tab content */}
                            <div className="expert-tab-content" style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

                        {expertTab === 'ricetta' && (<>

            {/* ── Empty State ── */}
            {allRows.length === 0 && !productName && (
                <div style={{
                    marginBottom: 16,
                    borderRadius: 14,
                    border: '1.5px solid #e5e7eb',
                    background: '#fafafa',
                    overflow: 'hidden',
                }}>
                    {/* Hero: Smart Import */}
                    <div style={{ padding: '24px 24px 20px', textAlign: 'center' }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: 'linear-gradient(135deg, #ff7e2e, #dd5c0c)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 14px',
                        }}>
                            <Sparkles size={24} color="#fff" />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 6 }}>
                            Importazione intelligente
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 18, maxWidth: 300, margin: '0 auto 18px' }}>
                            Incolla la lista ingredienti dalla tua ricetta — abbino io al database in automatico
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowSmartImport(true)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '11px 24px', borderRadius: 10, border: 'none',
                                background: 'linear-gradient(135deg, #ff7e2e, #dd5c0c)',
                                color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(255,126,46,0.35)',
                            }}
                        >
                            <Sparkles size={16} /> Inizia l'import intelligente
                        </button>
                    </div>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
                        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>oppure</span>
                        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                    </div>

                    {/* Secondary actions */}
                    <div style={{ display: 'flex', gap: 10, padding: '16px 24px 20px' }}>
                        <button
                            type="button"
                            onClick={() => setArchiveOpen(true)}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 7, padding: '9px 12px', borderRadius: 9,
                                border: '1.5px solid #e5e7eb', background: '#fff',
                                color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <FolderOpen size={15} /> Carica da archivio
                        </button>
                        <button
                            type="button"
                            onClick={() => document.querySelector<HTMLInputElement>('.field-input')?.focus()}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 7, padding: '9px 12px', borderRadius: 9,
                                border: '1.5px solid #e5e7eb', background: '#fff',
                                color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <Plus size={15} /> Inserisci manualmente
                        </button>
                    </div>

                    {/* Excel import — solo utenti con tool 'excel-import' */}
                    {hasExcelImport && (
                        <div style={{
                            borderTop: '1px solid #e5e7eb',
                            padding: '12px 24px',
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: '#f0fdf4',
                        }}>
                            <FileSpreadsheet size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 12, color: '#15803d' }}>
                                Hai il Programma Excel AEA?
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowSmartImport(true)}
                                style={{
                                    padding: '5px 12px', borderRadius: 7,
                                    border: '1.5px solid #16a34a', background: '#fff',
                                    color: '#15803d', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 5,
                                }}
                            >
                                <FileSpreadsheet size={13} /> Importa da .xlsx
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Prodotto / Pesi ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nome prodotto</label>
                    <input type="text" placeholder="Es. Torta di mele, Ragù bolognese..." value={productName}
                        onChange={e => setProductName(e.target.value)} className="field-input"
                        style={{ fontWeight: 600, fontSize: 16, width: '100%', padding: '8px 10px' }} />
                </div>
                {/* Peso finito e specifico — compaiono dopo il primo ingrediente */}
                {allRows.length > 0 && (<>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Peso finito (g)</label>
                                <InfoTooltip text="Peso del prodotto dopo cottura, disidratazione o evaporazione di acqua. Deve essere uguale o inferiore al peso del prodotto processato." />
                            </div>
                            <input type="number" min={0} placeholder={`max ${totalGramsRaw.toFixed(0)}g`} value={finishedWeight}
                                onChange={e => handleFW(e.target.value)}
                                className="field-input" style={{ width: '100%', ...(fwWarning ? { borderColor: '#e53e3e', background: 'rgba(229,62,62,.05)' } : {}) }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Peso specifico (g/ml)</label>
                                <InfoTooltip text="Inserisci il peso specifico SOLO per alimenti liquidi. Quando compilato, i valori verranno espressi su 100 ml." />
                            </div>
                            <input type="number" min={0} step={0.01} placeholder="opzionale" value={specificGravity}
                                onChange={e => setSpecificGravity(e.target.value)} className="field-input" style={{ width: '100%' }} />
                        </div>
                    </div>
                    {fwWarning && (
                        <div style={{ padding: '5px 8px', background: 'rgba(229,62,62,.10)', border: '2px solid #e53e3e', borderRadius: 6, fontSize: 11, color: '#c53030', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                            <span>{fieldErrors['finished-weight'] || `Peso superiore al crudo. Max ${(totalGramsRaw / ((components[0]?.pzUV || 1))).toFixed(0)}g.`}</span>
                        </div>
                    )}
                </>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Ingredienti</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>

            {/* Components — mod 3, 4, 5, 6: PZ/UV decimals, tooltips, €/kg zero fix, wider fields */}
            {components.map((comp, ci) => {
                const isCompOpen = compOpen[comp.id] !== false;
                return (
                <div key={comp.id} className="comp-card">
                    <div
                        onClick={() => setCompOpen(prev => ({ ...prev, [comp.id]: !isCompOpen }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,126,46,0.07)', padding: '8px 10px', borderBottom: isCompOpen ? '1px solid var(--color-border)' : 'none', cursor: 'pointer' }}
                    >
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-orange)', flexShrink: 0, minWidth: 20 }}>C{ci + 1}</span>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {comp.name || `Componente ${ci + 1}`}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            {components.length > 1 && (
                                <button onClick={(e) => { e.stopPropagation(); removeComp(comp.id); }} className="comp-action-btn" title="Rimuovi questo componente">
                                    <Trash2 size={13} />
                                </button>
                            )}
                            <ChevronDown size={14} style={{ transform: isCompOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                        </div>
                    </div>
                    {isCompOpen && (<div className="comp-card-body">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <input
                            type="text"
                            placeholder="Nome componente"
                            value={comp.name}
                            onChange={e => updateCompName(comp.id, e.target.value)}
                            style={{ flex: 1, fontSize: 13, fontWeight: 600, border: '1px solid var(--color-border)', borderRadius: 6, padding: '5px 8px', color: 'var(--color-text)', background: 'white', fontFamily: 'inherit', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>pz/UV</span>
                            <InfoTooltip text="Digitare il numero di PZ o di Unità di Vendita che si possono realizzare con la quantità di componente che scaturisce dalla ricetta." />
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="—"
                                value={pzUVRaw[comp.id] ?? ''}
                                onChange={e => {
                                    const raw = e.target.value;
                                    setPzUVRaw(prev => ({ ...prev, [comp.id]: raw }));
                                    const v = parseFloat(raw.replace(',', '.'));
                                    if (!isNaN(v) && v >= 0.001) {
                                        updateCompPzUV(comp.id, v);
                                        setFieldErrors(prev => ({ ...prev, [`${comp.id}-pzuv`]: '' }));
                                    }
                                }}
                                onBlur={e => {
                                    const raw = e.target.value.trim();
                                    const v = parseFloat(raw.replace(',', '.'));
                                    if (!raw || isNaN(v) || v < 0.001) {
                                        setFieldErrors(prev => ({ ...prev, [`${comp.id}-pzuv`]: 'Inserisci il numero di pezzi per UV.' }));
                                    } else {
                                        updateCompPzUV(comp.id, v);
                                        setFieldErrors(prev => ({ ...prev, [`${comp.id}-pzuv`]: '' }));
                                    }
                                }}
                                style={{ width: 46, fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 6px', textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}
                            />
                        </div>
                    </div>
                    <ValidationError message={fieldErrors[`${comp.id}-pzuv`]} visible={!!fieldErrors[`${comp.id}-pzuv`]} />
                    <IngSearch onAdd={(ing) => addRowToComp(comp.id, ing)} db={db} loading={loadingDB} error={dbError} onRetry={loadDB} />
                    {comp.rows.length > 0 && (
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
                    {comp.rows.map((row, rowIdx) => {
                        const _displayGramsAdv = (() => { const raw = gramsRaw[`${comp.id}-${row.id}`]; if (raw === undefined) return row.grams; const v = parseFloat(raw.replace(',', '.')); return isNaN(v) ? row.grams : v; })();
                        const gramsPerPiece = comp.pzUV > 0 && _displayGramsAdv > 0 ? _displayGramsAdv / comp.pzUV : null;
                        const fabbReale = row.grams / ((row.resa || 100) / 100);
                        const costoIng = (row.eurKg / 1000) * fabbReale;
                        const rowKey = `${comp.id}-${row.id}`;
                        const isExpanded = expandedRows.has(rowKey);
                        const isLast = rowIdx === comp.rows.length - 1;
                        return (
                            <div key={row.id} className={row.id === lastAddedRowId ? 'ing-row-enter' : undefined} style={{ borderBottom: isLast && !isExpanded ? 'none' : '1px solid var(--color-border)' }}>
                                {/* Compact row */}
                                <div className="ing-row-compact">
                                    <button
                                        onClick={() => toggleExpandRow(rowKey)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                                        title={isExpanded ? 'Comprimi' : 'Espandi €/kg e Resa %'}
                                    >
                                        <ChevronDown size={12} style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
                                    </button>
                                    <div className="ing-row-name">
                                        <div className="ing-row-name-label">{row.ing.nome}</div>
                                        {row.ing.kcal != null && (
                                            <div className="ing-row-kcal">{row.ing.kcal} kcal/100g</div>
                                        )}
                                    </div>
                                    <div className="ing-row-grams">
                                        <input type="text" inputMode="decimal"
                                            style={{ width: 58, fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 5, padding: '3px 6px', textAlign: 'right', fontFamily: 'inherit', color: 'var(--color-text)', background: 'var(--color-bg-input)', outline: 'none' }}
                                            value={gramsRaw[rowKey] ?? String(row.grams)}
                                            onChange={e => {
                                                const raw = e.target.value;
                                                setGramsRaw(prev => ({ ...prev, [rowKey]: raw }));
                                                const v = parseFloat(raw.replace(',', '.'));
                                                if (!isNaN(v) && v >= 0) updateGrams(comp.id, row.id, v);
                                            }}
                                            onBlur={e => {
                                                const raw = e.target.value.trim();
                                                const v = parseFloat(raw.replace(',', '.'));
                                                const val = (!raw || isNaN(v) || v < 0) ? 0 : v;
                                                setGramsRaw(prev => ({ ...prev, [rowKey]: String(val) }));
                                                updateGrams(comp.id, row.id, val);
                                            }}
                                        />
                                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>g</span>
                                    </div>
                                    <button onClick={() => removeRow(comp.id, row.id)} className="ing-delete-btn" title="Rimuovi ingrediente" style={{ width: 24, height: 24, flexShrink: 0 }}>
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                {gramsPerPiece !== null && (
                                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', padding: '0 10px 3px', textAlign: 'right' }}>{gramsPerPiece.toFixed(1)} g/pz</div>
                                )}
                                <ValidationError message={fieldErrors[`${comp.id}-${row.id}-grams`]} visible={!!fieldErrors[`${comp.id}-${row.id}-grams`]} />
                                {/* Expandable detail: €/kg e Resa % */}
                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid var(--color-border)', padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--color-surface)' }}>
                                        <div className="ing-field-group">
                                            <div className="ing-field-header">
                                                <span className="ing-field-label">€/kg</span>
                                                <InfoTooltip text="Costo dell'ingrediente per kg, IVA esclusa. Non è obbligatorio: se non inserisci nulla, il valore predefinito è 0 e il costo non verrà calcolato." />
                                            </div>
                                            <input type="text" inputMode="decimal"
                                                placeholder="0"
                                                value={eurKgRaw[`${comp.id}-${row.id}`] ?? (row.eurKg === 0 ? '' : String(row.eurKg))}
                                                onFocus={e => e.target.select()}
                                                onChange={e => {
                                                    const raw = e.target.value.replace(',', '.');
                                                    setEurKgRaw(prev => ({ ...prev, [`${comp.id}-${row.id}`]: raw }));
                                                    const v = parseFloat(raw);
                                                    if (!isNaN(v) && v >= 0) updateEurKg(comp.id, row.id, v);
                                                }}
                                                onBlur={e => {
                                                    const v = parseFloat(e.target.value.replace(',', '.'));
                                                    const val = isNaN(v) || v < 0 ? 0 : v;
                                                    setEurKgRaw(prev => ({ ...prev, [`${comp.id}-${row.id}`]: val === 0 ? '' : String(val) }));
                                                    updateEurKg(comp.id, row.id, val);
                                                }}
                                                className="form-input ing-input" />
                                            <ValidationError message={fieldErrors[`${comp.id}-${row.id}-eurkgs`]} visible={!!fieldErrors[`${comp.id}-${row.id}-eurkgs`]} />
                                        </div>
                                        <div className="ing-field-group">
                                            <div className="ing-field-header">
                                                <span className="ing-field-label">Resa %</span>
                                                <InfoTooltip text="Percentuale di prodotto effettivamente utilizzabile dopo pulizia o lavorazione. Es: 70 per verdure con scarti (foglie, bucce). Default: 100" />
                                            </div>
                                            <input type="text" inputMode="decimal"
                                                value={resaRaw[`${comp.id}-${row.id}`] ?? String(row.resa || 100)}
                                                onFocus={e => e.target.select()}
                                                onChange={e => {
                                                    const raw = e.target.value.replace(',', '.');
                                                    setResaRaw(prev => ({ ...prev, [`${comp.id}-${row.id}`]: raw }));
                                                    const v = parseFloat(raw);
                                                    if (!isNaN(v) && v > 0 && v <= 100) updateResa(comp.id, row.id, v);
                                                }}
                                                onBlur={e => {
                                                    const v = parseFloat(e.target.value.replace(',', '.'));
                                                    const val = isNaN(v) || v <= 0 || v > 100 ? 100 : v;
                                                    setResaRaw(prev => ({ ...prev, [`${comp.id}-${row.id}`]: String(val) }));
                                                    updateResa(comp.id, row.id, val);
                                                }}
                                                className="form-input ing-input" />
                                            <ValidationError message={fieldErrors[`${comp.id}-${row.id}-resa`]} visible={!!fieldErrors[`${comp.id}-${row.id}-resa`]} />
                                        </div>
                                        {n(row.ing.alcol) > 0 && (
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--color-text)' }}>
                                                    <input type="checkbox" checked={!!row.postCottura}
                                                        onChange={() => updateRowFlag(comp.id, row.id, 'postCottura', !row.postCottura)} />
                                                    <span>Post-cottura <span style={{ color: 'var(--color-text-muted)' }}>(alcol non evapora)</span></span>
                                                </label>
                                            </div>
                                        )}
                                        {n(row.ing.acqua) > 90 && (
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--color-text)' }}>
                                                    <input type="checkbox" checked={!!row.acquaAggiunta}
                                                        onChange={() => updateRowFlag(comp.id, row.id, 'acquaAggiunta', !row.acquaAggiunta)} />
                                                    <span>Acqua aggiunta <span style={{ color: 'var(--color-text-muted)' }}>(evapora dopo alcol)</span></span>
                                                </label>
                                            </div>
                                        )}
                                        {(row.eurKg > 0) && (
                                            <div className="ing-cost-line" style={{ gridColumn: '1 / -1' }}>
                                                <span>Grammi reali: <strong>{fabbReale.toFixed(1)}g</strong></span>
                                                <span>Costo: <strong style={{ color: 'var(--color-orange)' }}>{costoIng.toFixed(4)} €</strong></span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    </div>
                    )}
                    {comp.rows.length > 0 && (
                        <div className="ing-total-bar">
                            <span>Totale: <strong>{comp.rows.reduce((s, r) => s + r.grams, 0).toFixed(0)} g</strong></span>
                        </div>
                    )}
                    {/* Additivi per componente — Vista Avanzata */}
                    {isCompOpen && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ marginBottom: 8 }}>
                            <button type="button" className="btn btn-outline" style={{ fontSize: 12, padding: '5px 14px' }} onClick={() => addAdditiveRow(comp.id)}>
                                <Plus size={13} /> Aggiungi additivo
                            </button>
                        </div>
                        {comp.additiveRows.map(arow => {
                            const fabbA = arow.grams / ((arow.resa || 100) / 100);
                            const costoA = (fabbA / 1000) * arow.eurKg;
                            return (
                                <div key={arow.id} className="ing-card" style={{ marginBottom: 8 }}>
                                    <div className="ing-card-header">
                                        <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                                            <select className="form-input" style={{ flex: '1 1 160px', fontSize: 12 }} value={arow.categoria} onChange={e => { updateAdditiveRow(comp.id, arow.id, 'categoria', e.target.value); updateAdditiveRow(comp.id, arow.id, 'nomeSpecifico', ''); }}>
                                                <option value="">— Categoria —</option>
                                                {ADDITIVI_CATEGORIE.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                            <select className="form-input" style={{ flex: '1 1 160px', fontSize: 12 }} value={arow.nomeSpecifico} onChange={e => updateAdditiveRow(comp.id, arow.id, 'nomeSpecifico', e.target.value)} disabled={!arow.categoria}>
                                                <option value="">{arow.categoria ? '— Seleziona additivo —' : '— Prima seleziona categoria —'}</option>
                                                {(ADDITIVI_SPECIFICI[arow.categoria] || []).map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <button className="ing-delete-btn" onClick={() => removeAdditiveRow(comp.id, arow.id)} title="Rimuovi additivo"><Trash2 size={13} /></button>
                                    </div>
                                    <div className="ing-card-body">
                                        <div className="ing-field-group">
                                            <div className="ing-field-header"><span className="ing-field-label">Grammi</span></div>
                                            <div className="ing-field-input-wrap">
                                                <input type="number" min={0} step={0.1} className="form-input ing-input" value={arow.grams || ''} placeholder="0" onChange={e => updateAdditiveRow(comp.id, arow.id, 'grams', parseFloat(e.target.value) || 0)} />
                                                <span className="ing-unit">g</span>
                                            </div>
                                        </div>
                                        <div className="ing-field-group">
                                            <div className="ing-field-header"><span className="ing-field-label">€/kg</span></div>
                                            <input type="text" inputMode="decimal" placeholder="0" className="form-input ing-input"
                                                value={eurKgRaw[`a-${comp.id}-${arow.id}`] ?? (arow.eurKg === 0 ? '' : String(arow.eurKg))}
                                                onFocus={e => e.target.select()}
                                                onChange={e => { const raw = e.target.value.replace(',', '.'); setEurKgRaw(prev => ({ ...prev, [`a-${comp.id}-${arow.id}`]: raw })); const v = parseFloat(raw); if (!isNaN(v) && v >= 0) updateAdditiveRow(comp.id, arow.id, 'eurKg', v); }}
                                                onBlur={e => { const v = parseFloat(e.target.value.replace(',', '.')); const val = isNaN(v) || v < 0 ? 0 : v; setEurKgRaw(prev => ({ ...prev, [`a-${comp.id}-${arow.id}`]: val === 0 ? '' : String(val) })); updateAdditiveRow(comp.id, arow.id, 'eurKg', val); }} />
                                        </div>
                                        <div className="ing-field-group">
                                            <div className="ing-field-header"><span className="ing-field-label">Resa %</span></div>
                                            <input type="text" inputMode="decimal" className="form-input ing-input"
                                                value={resaRaw[`a-${comp.id}-${arow.id}`] ?? String(arow.resa || 100)}
                                                onFocus={e => e.target.select()}
                                                onChange={e => { const raw = e.target.value.replace(',', '.'); setResaRaw(prev => ({ ...prev, [`a-${comp.id}-${arow.id}`]: raw })); const v = parseFloat(raw); if (!isNaN(v) && v > 0 && v <= 100) updateAdditiveRow(comp.id, arow.id, 'resa', v); }}
                                                onBlur={e => { const v = parseFloat(e.target.value.replace(',', '.')); const val = isNaN(v) || v <= 0 || v > 100 ? 100 : v; setResaRaw(prev => ({ ...prev, [`a-${comp.id}-${arow.id}`]: String(val) })); updateAdditiveRow(comp.id, arow.id, 'resa', val); }} />
                                        </div>
                                    </div>
                                    {arow.eurKg > 0 && (
                                        <div className="ing-cost-line">
                                            <span>Grammi reali: <strong>{fabbA.toFixed(1)}g</strong></span>
                                            <span>Costo: <strong style={{ color: 'var(--color-orange)' }}>{costoA.toFixed(4)} €</strong></span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    )}
                    </div>)}
                </div>
                );
            })}

            <button className="btn btn-outline add-comp-btn" onClick={addComp}><Plus size={14} /> Aggiungi componente</button>

        </>)}

        {expertTab === 'riepilogo' && (<>
            {/* Riepilogo ingredienti — Excel-style */}
            {allRows.length > 0 && (() => {
                const pesoFinitoPzCalc = fw > 0 ? fw : totGrammiXpzuv;
                const caloAcqua = totGrammiXpzuv > pesoFinitoPzCalc ? totGrammiXpzuv - pesoFinitoPzCalc : 0;
                const isAcqua = (nome: string) => (nome || '').trim().toLowerCase() === 'acqua';
                const totGrammiTotali = mergedIngredients.reduce((s, r) => s + r.grammiTotali, 0);
                const totQuid = pesoFinitoPzCalc > 0 ? (totGrammiXpzuv / pesoFinitoPzCalc * 100) : 0;
                let totCostoUV = 0;
                for (const r of mergedIngredients) {
                    if (r.eurKg > 0) {
                        const fabb = r.grammiXpzuv / ((r.resa || 100) / 100);
                        totCostoUV += (fabb / 1000) * r.eurKg;
                    }
                }
                const totCostoKg = pesoFinitoPzCalc > 0 && totCostoUV > 0 ? totCostoUV / (pesoFinitoPzCalc / 1000) : 0;
                const fmt3 = (v: number) => v.toFixed(3).replace('.', ',');
                const fmt2 = (v: number) => v.toFixed(2).replace('.', ',');
                const fmtC = (v: number) => v > 0 ? v.toFixed(3).replace('.', ',') : '—';
                return (
                    <div style={{ marginBottom: 20 }}>
                        <div className="ri-tab-bar" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                            <button onClick={() => setRiepilogoTab('q')} title="Visualizza quantità e grammature" className={`ri-toggle-btn${riepilogoTab === 'q' ? ' active' : ''}`}><Scale size={12} />Quantità</button>
                            <button onClick={() => setRiepilogoTab('c')} title="Visualizza costi e rese" className={`ri-toggle-btn${riepilogoTab === 'c' ? ' active' : ''}`}><Euro size={12} />Costi</button>
                        </div>
                        <div className="riepilogo-wrapper" data-riepilogo-tab={riepilogoTab} style={{ overflowX: 'auto', margin: '0 -14px', padding: '0 14px' }}>
                            <table className="riepilogo-table" style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%', minWidth: 480 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--color-orange)', color: 'white' }}>
                                            <td style={{ padding: '5px 7px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>{mergedIngredients.length}</td>
                                            <td className="ri-c" style={{ padding: '5px 6px' }} />
                                            <td className="ri-c" style={{ padding: '5px 6px' }} />
                                            <td className="ri-c" style={{ padding: '5px 6px' }} />
                                            <td className="ri-c" style={{ padding: '5px 6px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.15)' }}>{totCostoUV > 0 ? fmt3(totCostoUV) : '—'}</td>
                                            <td className="ri-c" style={{ padding: '5px 6px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.15)' }}>{totCostoKg > 0 ? fmt3(totCostoKg) : '—'}</td>
                                            <td className="ri-q" style={{ padding: '5px 7px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(totGrammiTotali)}</td>
                                            <td className="ri-q" style={{ padding: '5px 7px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(totGrammiXpzuv)}</td>
                                            <td className="ri-q" style={{ padding: '5px 7px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>100,000</td>
                                            <td className="ri-q" style={{ padding: '5px 7px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(totQuid)}</td>
                                        </tr>
                                        <tr style={{ background: '#f0f0f0', borderBottom: '2px solid var(--color-border)' }}>
                                            <th style={{ padding: '5px 7px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', minWidth: 100 }}>INGREDIENTI</th>
                                            <th className="ri-c" style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>€/KG<br />grezzo</th>
                                            <th className="ri-c" style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>RESA %</th>
                                            <th className="ri-c" style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>€/KG<br />pulito</th>
                                            <th className="ri-c" style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap', background: 'rgba(255,126,46,0.08)' }}>€/UV</th>
                                            <th className="ri-c" style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap', background: 'rgba(255,126,46,0.08)' }}>€/KG</th>
                                            <th className="ri-q" style={{ padding: '5px 7px', textAlign: 'right', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>g tot.</th>
                                            <th className="ri-q" style={{ padding: '5px 7px', textAlign: 'right', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>g X PZ</th>
                                            <th className="ri-q" style={{ padding: '5px 7px', textAlign: 'right', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>%</th>
                                            <th className="ri-q" style={{ padding: '5px 7px', textAlign: 'right', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap', color: 'var(--color-orange)' }}>QUID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mergedIngredients.map((row, i) => {
                                            const pctRicetta = totGrammiXpzuv > 0 ? (row.grammiXpzuv / totGrammiXpzuv * 100) : 0;
                                            const grammiEffettivi = isAcqua(row.ing.nome) ? Math.max(0, row.grammiXpzuv - caloAcqua) : row.grammiXpzuv;
                                            const quid = pesoFinitoPzCalc > 0 ? (grammiEffettivi / pesoFinitoPzCalc * 100) : 0;
                                            const costoKgPulito = row.eurKg > 0 ? row.eurKg / ((row.resa || 100) / 100) : 0;
                                            const fabbXpzuv = row.grammiXpzuv / ((row.resa || 100) / 100);
                                            const costoUV = row.eurKg > 0 ? (fabbXpzuv / 1000) * row.eurKg : 0;
                                            const costoKg = pesoFinitoPzCalc > 0 && costoUV > 0 ? costoUV / (pesoFinitoPzCalc / 1000) : 0;
                                            const bg = i % 2 === 0 ? 'white' : '#fafafa';
                                            return (
                                                <tr key={row.ing.nome} style={{ background: bg, borderBottom: '1px solid var(--color-border)' }}>
                                                    <td style={{ padding: '5px 7px', fontWeight: 500, minWidth: 100 }}>{(row.ing.nome || '').trim()}</td>
                                                    <td className="ri-c" style={{ padding: '5px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.eurKg > 0 ? fmt2(row.eurKg) : '—'}</td>
                                                    <td className="ri-c" style={{ padding: '5px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt2(row.resa || 100)}</td>
                                                    <td className="ri-c" style={{ padding: '5px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{costoKgPulito > 0 ? fmt2(costoKgPulito) : '—'}</td>
                                                    <td className="ri-c" style={{ padding: '5px 6px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, background: 'rgba(255,126,46,0.04)' }}>{fmtC(costoUV)}</td>
                                                    <td className="ri-c" style={{ padding: '5px 6px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, background: 'rgba(255,126,46,0.04)' }}>{fmtC(costoKg)}</td>
                                                    <td className="ri-q" style={{ padding: '5px 7px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{fmt3(row.grammiTotali)}</td>
                                                    <td className="ri-q" style={{ padding: '5px 7px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{fmt3(row.grammiXpzuv)}</td>
                                                    <td className="ri-q" style={{ padding: '5px 7px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(pctRicetta)}</td>
                                                    <td className="ri-q" style={{ padding: '5px 7px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--color-orange)' }}>{fmt3(quid)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                    </div>
                );
            })()}


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
                    <div style={{ marginBottom: 20, background: 'var(--color-surface)', borderRadius: 8, padding: '14px 20px' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}><Euro size={15} /> Riepilogo Costi Ingredienti</div>
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


        </>)}


                            </div>{/* end tab content */}
                        </div>
                    </div>
                }
                right={renderTablePanel()}
            />
            </div>

            {/* ── Mobile bottom bar ── */}
            <nav className="mob-bottom-bar" aria-label="Navigazione principale">
                <button
                    type="button"
                    className={`mob-tab-item${expertTab === 'ricetta' ? ' active' : ''}`}
                    onClick={() => setExpertTab('ricetta')}
                    aria-label="Ricetta"
                >
                    <Salad size={20} strokeWidth={1.8} />
                    Ricetta
                </button>
                <button
                    type="button"
                    className={`mob-tab-item${expertTab === 'riepilogo' ? ' active' : ''}`}
                    onClick={() => setExpertTab('riepilogo')}
                    aria-label="Riepilogo"
                >
                    <ClipboardList size={20} strokeWidth={1.8} />
                    Riepilogo
                </button>
                <button
                    type="button"
                    className="mob-tab-item"
                    onClick={() => document.getElementById('mob-tables-anchor')?.scrollIntoView({ behavior: 'smooth' })}
                    aria-label="Mercati"
                >
                    <Globe size={20} strokeWidth={1.8} />
                    Mercati
                </button>
                <button
                    type="button"
                    className="mob-tab-item"
                    onClick={() => setArchiveOpen(true)}
                    aria-label="Archivio"
                >
                    <Archive size={20} strokeWidth={1.8} />
                    Archivio
                </button>
            </nav>
        </>
    );
}

// ─── Allergen & Ingredient sections ──────────────────────────────────────────
// ─── Shared table styling ───────────────────────────────────────────────────

// ─── TabCanada ──────────────────────────────────────────────────────────────
function TabCanada({ p, ca, servingRef, measure, subTab, setSubTab, full }: {
    p: CalcResult; ca: ServingSizesNation;
    servingRef: USAServingRef; measure: USAMeasure;
    subTab: SubTab; setSubTab: (t: SubTab) => void; full?: boolean
}) {
    const refGrams = servingRef === 'confezione' ? (ca.confezione ?? 0) : (ca.serving ?? 0);
    const svG = refGrams;
    const sv = svG > 0 ? scaleResult(p, svG) : null;
    const d = sv || p;
    const satTrans = d.saturi + d.trans;

    // Serving size label (Canada)
    const caUnitSize = measure === 'tazze' ? (ca.cup ?? 250) : measure === 'cucchiai' ? (ca.cucchiaio ?? 15) : (ca.pezzo ?? (svG || 1));
    const caQty = svG > 0 ? (svG / caUnitSize).toFixed(1).replace('.', ',') : '0';
    const caEnUnit = measure === 'tazze' ? 'cup' : measure === 'cucchiai' ? 'tablespoon' : 'pieces';
    const caFrUnit = measure === 'tazze' ? 'tasse' : measure === 'cucchiai' ? 'cuillerée' : 'morceaux';
    const caServN = (ca.serving && ca.serving > 0 && svG > 0) ? Math.round(svG / ca.serving) : 0;

    let caEnLeft: string, caEnRight: string, caFrLeft: string, caFrRight: string;
    if (measure === 'g') {
        if (servingRef === 'confezione' && caServN > 0) {
            caEnLeft = `Per ${caServN} serving`; caEnRight = `(1container${svG}g)`;
            caFrLeft = `pour ${caServN} partie`; caFrRight = `(1emballage${svG}g)`;
        } else {
            caEnLeft = `Per ${svG}g`; caEnRight = '';
            caFrLeft = `pour ${svG}g`; caFrRight = '';
        }
    } else {
        caEnLeft = `Per ${caQty} ${caEnUnit}`;
        caEnRight = `(${servingRef === 'serving' ? '1 serving' : '1container'} ${svG}g)`;
        caFrLeft = `pour ${caQty} ${caFrUnit}`;
        caFrRight = `(${servingRef === 'serving' ? '1 partie' : '1emballage'} ${svG}g)`;
    }

    const caLinearServing = (() => {
        if (!svG) return '';
        if (measure === 'g') {
            if (servingRef === 'confezione' && caServN > 0) return `Per ${caServN} serving  (1container${svG}g)`;
            return `Per ${svG}g`;
        }
        const ref = servingRef === 'serving' ? `1serving${svG}g` : `1container${svG}g`;
        return `Per ${caQty} ${caEnUnit}  (${ref})`;
    })();

    return (
        <div style={{ background: 'white' }}>
            {!full && (
                <>
                    <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>Etichetta Nutrizionale (Canada)</h3>
                    <div className="subtab-bar" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        {(['verticale', 'orizzontale', 'lineare'] as SubTab[]).map(t => (
                            <button key={t} onClick={() => setSubTab(t)} className={`btn ${subTab === t ? 'btn-accent' : 'btn-outline'}`} style={{ fontSize: 11, padding: '5px 10px' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                        ))}
                    </div>
                </>
            )}
            <div data-table-export style={{ background: 'white', padding: 12, borderRadius: 0, display: 'inline-block' }}>
            {subTab === 'verticale' && (() => {
                const F = 'Arial, Helvetica, sans-serif';          // normal width
                const Fc = '"Arial Narrow", Arial, sans-serif';    // condensed — footnote only
                const ROW = (label: string, val: string, pct: string | null, sub: boolean, bold: boolean, thickBottom?: boolean, noBorder?: boolean) => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                        borderBottom: noBorder ? 'none' : thickBottom ? '3px solid #000' : '1px solid #bbb',
                        paddingLeft: sub ? 14 : 0, paddingTop: 1, paddingBottom: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, flex: 1 }}>
                            <span style={{ fontFamily: F, fontSize: 11, fontWeight: bold ? 700 : 400 }}>{label}</span>
                            <span style={{ fontFamily: F, fontSize: 11, fontWeight: 400 }}>{val}</span>
                        </div>
                        {pct !== null ? <span style={{ fontFamily: F, fontSize: 11, fontWeight: 400, minWidth: 22, textAlign: 'right' }}>{pct}%</span> : null}
                    </div>
                );
                return (
                    <div style={{ width: 280, border: '2px solid #000', padding: '4px 8px 6px 8px', fontFamily: F, backgroundColor: '#fff', color: '#000', boxSizing: 'border-box' }}>
                        {/* Title — 13pt bold */}
                        <div style={{ lineHeight: 1.1 }}>
                            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F }}>Nutrition Facts</div>
                            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F }}>Valeur nutritive</div>
                        </div>
                        {/* Serving — 9pt normal */}
                        <div style={{ fontSize: 12, fontFamily: F, fontWeight: 400, borderBottom: '5px solid #000', paddingBottom: 2, margin: '2px 0 0 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{caEnLeft}</span>
                                {caEnRight ? <span>{caEnRight}</span> : null}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{caFrLeft}</span>
                                {caFrRight ? <span>{caFrRight}</span> : null}
                            </div>
                        </div>
                        {/* Calories — 10pt bold, thick rule partial */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 2 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: F, borderBottom: '3px solid #000', paddingBottom: 3 }}>Calories{'\u2002'}{rCA_energy(d.energyKcal)}</div>
                            {/* % Daily Value subtitle — 6pt bold */}
                            <div style={{ textAlign: 'right', fontSize: 8, fontFamily: F, fontWeight: 700, lineHeight: 1.4 }}>% Daily Value*<br />% valeur quotidienne*</div>
                        </div>
                        {/* Nutrients — 8pt bold/normal */}
                        {ROW('Fat / Lipides', `${rCA_fat(d.grassi)}g`, rCA_pct(d.grassi, DV_CA.grassi), false, true, false, true)}
                        {ROW('Saturated / saturés', `${rCA_fat(d.saturi)}g`, null, true, false, false, true)}
                        {ROW('+ Trans / trans', `${rCA_fat(d.trans)}g`, rCA_pct(satTrans, DV_CA.satTrans), true, false)}
                        {ROW('Carbohydrate / Glucides', `${rCA_carb(d.carboidratiTot)}g`, null, false, true, false, true)}
                        {ROW('Fibre / Fibres', `${rCA_carb(d.fibre)}g`, rCA_pct(d.fibre, DV_CA.fibre), true, false, false, true)}
                        {ROW('Sugars / Sucres', `${rCA_carb(d.zuccheri)}g`, rCA_pct(d.zuccheri, DV_CA.zuccheri), true, false)}
                        {ROW('Protein / Protéines', `${rCA_carb(d.proteine)}g`, null, false, true)}
                        {ROW('Cholesterol / Cholestérol', `${rCA_chol(d.colesterolo)}mg`, null, false, true)}
                        {ROW('Sodium', `${rCA_na(d.sodio_mg)}mg`, rCA_pct(d.sodio_mg, DV_CA.sodio_mg), false, true, true)}
                        {ROW('Potassium', `${rCA_na(d.potassio)}mg`, rCA_pct(d.potassio, DV_CA.potassio), false, false)}
                        {ROW('Calcium', `${rCA_na(d.calcio)}mg`, rCA_pct(d.calcio, DV_CA.calcio), false, false)}
                        {ROW('Iron / Fer', `${rCA_iron(d.ferro)}mg`, rCA_pct(d.ferro, DV_CA.ferro), false, false, true)}
                        {/* Footnote — 6.5pt condensed */}
                        <div style={{ paddingTop: 2 }}>
                            <div style={{ fontSize: 9, fontFamily: Fc, lineHeight: 1.2 }}>* 5% or less is a <b>little</b>, 15% or more is a <b>lot</b></div>
                            <div style={{ fontSize: 9, fontFamily: Fc, lineHeight: 1.2 }}>* 5% ou moins c'est <b>peu</b>, 15% ou plus c'est <b>beaucoup</b></div>
                        </div>
                    </div>
                );
            })()}

            {subTab === 'orizzontale' && (() => {
                // Helvetica Neue Condensed: separate font families for bold vs regular (macOS fontStretch unreliable for regular)
                const FB = '"Helvetica Neue Condensed Bold", "HelveticaNeue-CondensedBold", "Helvetica Neue", Helvetica, Arial, sans-serif';
                const FR = '"Helvetica Neue Condensed", "HelveticaNeue-Condensed", "Arial Narrow", Helvetica, Arial, sans-serif';
                // Col2 row: label+val left, pct right, optional bottom rule
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
                            {/* Header row — borderBottom on inner div: gap = col2 rightPad(5) + col3 leftPad(5) + marginLeft(4) = 14px split */}
                            {/* Col3 inner marginLeft:4 extra gap; col3 right: 5px outer padding → line doesn't touch frame */}
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
                                    {/* Sat+Trans: borderBottom on outer wrapper → full col2 width, aligns with header thin line and Sugars thick rule */}
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
                    <div style={{ border: '0.5pt solid #000', padding: '3pt', fontFamily: F, fontSize: '7pt', display: 'inline-block', backgroundColor: '#fff', color: '#000', boxSizing: 'content-box' as const }}>
                        {/* Line 1: Heading · Serving · Calories */}
                        <div style={{ whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '10pt', fontWeight: 700 }}>Nutrition Facts</span>
                            {caLinearServing ? <span style={{ fontSize: '7.5pt', fontWeight: 400 }}>{' '}{caLinearServing}</span> : null}
                            {' :'}
                            <span style={{ fontSize: '8pt', fontWeight: 700 }}>{' '}Calories{' '}{rCA_energy(d.energyKcal)}</span>
                        </div>
                        {/* Line 2: Fat → Cholesterol */}
                        <div style={{ whiteSpace: 'nowrap', lineHeight: '8pt' }}>
                            {B('Fat')}{' '}{rCA_fat(d.grassi)} g{' '}{pctCA(d.grassi, DV_CA.grassi)},{' '}
                            {B('Saturated Fat')}{' '}{rCA_fat(d.saturi)} g + {B('Trans')}{' '}{rCA_fat(d.trans)} g{' '}{pctCA(satTrans, DV_CA.satTrans)},{' '}
                            {B('Cholesterol')}{' '}{rCA_chol(d.colesterolo)} mg
                        </div>
                        {/* Line 3: Carbohydrate → Sodium */}
                        <div style={{ whiteSpace: 'nowrap', lineHeight: '8pt' }}>
                            {B('Carbohydrate')}{' '}{rCA_carb(d.carboidratiTot)} g,{' '}
                            {B('Fibre')}{' '}{rCA_carb(d.fibre)} g{' '}{pctCA(d.fibre, DV_CA.fibre)},{' '}
                            {B('Sugars')}{' '}{rCA_carb(d.zuccheri)} g{' '}{pctCA(d.zuccheri, DV_CA.zuccheri)},{' '}
                            {B('Protein')}{' '}{rCA_carb(d.proteine)} g,{' '}
                            {B('Sodium')}{' '}{rCA_na(d.sodio_mg)} mg{' '}{pctCA(d.sodio_mg, DV_CA.sodio_mg)}
                        </div>
                        {/* Line 4: Potassium → Iron */}
                        <div style={{ whiteSpace: 'nowrap', lineHeight: '8pt' }}>
                            {B('Potassium')}{' '}{rCA_na(d.potassio)} mg{' '}{pctCA(d.potassio, DV_CA.potassio)},{' '}
                            {B('Calcium')}{' '}{rCA_na(d.calcio)} mg{' '}{pctCA(d.calcio, DV_CA.calcio)},{' '}
                            {B('Iron')}{' '}{rCA_iron(d.ferro)} mg{' '}{pctCA(d.ferro, DV_CA.ferro)}
                        </div>
                        {/* Line 5: Legend (left) · Footnote (right) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: '-2px', whiteSpace: 'nowrap' }}>
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

// ─── TabAustralia ─────────────────────────────────────────────────────────────
function TabAustralia({ p, au, showDI: _showDI, setShowDI: _setShowDI, full }: { p: CalcResult; au: ServingSizesNation; showDI: boolean; setShowDI: (v: boolean) => void; full?: boolean }) {
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
            svVal: `${rAU_kj(sv.energyKj)} kJ  ( ${rAU_kcal(sv.energyKcal)} Cal )`,
            di: diPct(sv.energyKj, DV_AU.energyKj),
            p100: `${rAU_kj(p.energyKj)} kJ  ( ${rAU_kcal(p.energyKcal)} Cal )`,
        });
        [
            { label: 'Protein',       svVal: sv.proteine,  p100: p.proteine,  ref: DV_AU.proteine,     unit: 'g' },
            { label: 'Fat, total',    svVal: sv.grassi,    p100: p.grassi,    ref: DV_AU.grassi,       unit: 'g' },
            { label: '- saturated',   svVal: sv.saturi,    p100: p.saturi,    ref: DV_AU.saturi,       unit: 'g', isSub: true },
            { label: 'Carbohydrate',  svVal: sv.carboidrati, p100: p.carboidrati, ref: DV_AU.carboidrati, unit: 'g' },
            { label: '- sugars',      svVal: sv.zuccheri,  p100: p.zuccheri,  ref: DV_AU.zuccheri,     unit: 'g', isSub: true },
            { label: 'Dietary fibre', svVal: sv.fibre,     p100: p.fibre,     ref: DV_AU.fibre,        unit: 'g' },
            { label: 'Sodium',        svVal: sv.sodio_mg,  p100: p.sodio_mg,  ref: DV_AU.sodio_mg,     unit: 'mg' },
        ].forEach(r => {
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
            {!full && (
                <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>Etichetta Nutrizionale (Australia)</h3>
            )}
            <div data-table-export style={{ background: 'white', padding: 12, borderRadius: 0, display: 'inline-block', width: 500, boxSizing: 'border-box' }}>
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
                                <th style={{ ...thStyle, textAlign: 'left', width: '34%' }}></th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Average Quantity<br/>per Serving</th>
                                <th style={{ ...thStyle, textAlign: 'left', whiteSpace: 'nowrap' }}>% Daily Intake*<br/>(per Serving)</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Average Quantity<br/>per 100 g</th>
                            </tr>
                        </thead>
                        <tbody>
                            {svG > 0 && sv ? rows.map((r, i) => (
                                <tr key={i}>
                                    <td style={{ ...tdStyle, paddingTop: i === 0 ? 8 : 2, paddingLeft: r.isSub ? 22 : 10, whiteSpace: i === 0 ? 'nowrap' : undefined }}>{r.label}</td>
                                    <td style={{ ...tdStyle, paddingTop: i === 0 ? 8 : 2, whiteSpace: i === 0 ? 'nowrap' : undefined }}>{r.svVal}</td>
                                    <td style={{ ...tdStyle, paddingTop: i === 0 ? 8 : 2, whiteSpace: i === 0 ? 'nowrap' : undefined }}>{r.di}</td>
                                    <td style={{ ...tdStyle, paddingTop: i === 0 ? 8 : 2, whiteSpace: i === 0 ? 'nowrap' : undefined }}>{r.p100}</td>
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

// ─── TabArabi ────────────────────────────────────────────────────────────────
const DV_GULF = {
    energyKcal: 2000, grassi: 70, saturi: 20, colesterolo: 300,
    sodio_mg: 2400, carboidratiTot: 260, fibre: 28, zuccheri_agg: 50,
};

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

function TabArabi({ p, arabi, servingRef, measure, specificGravity, full }: {
    p: CalcResult; arabi: ServingSizesNation;
    servingRef: USAServingRef; measure: USAMeasure;
    specificGravity?: number; full?: boolean;
}) {
    const unit = (specificGravity ?? 0) > 0 ? 'ml' : 'g';
    const si = buildArabiSI(arabi, servingRef, measure, unit);
    const d  = si.refGrams > 0 ? scaleResult(p, si.refGrams) : p;
    const F  = 'Arial, Helvetica, sans-serif';

    const addedSugarsG   = arRndG(d.zuccheri_agg);
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
            {!full && (
                <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>
                    Etichetta Nutrizionale (Gulf/Arabi)
                </h3>
            )}
            <div data-table-export style={{ background: 'white', padding: 12, display: 'inline-block' }}>
                <div style={{ width: 310, border: '2.5px solid #000', padding: '8px 8px 6px 8px', fontFamily: F, color: '#000', boxSizing: 'border-box' as const }}>

                    {/* Title */}
                    <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, whiteSpace: 'nowrap', textAlign: 'justify', textAlignLast: 'justify', WebkitTextStroke: '0.6px #000', borderBottom: '1px solid #000', paddingBottom: 3, marginBottom: 2 }}>Nutrition Facts</div>

                    {/* Servings per container */}
                    <div style={{ fontSize: 18, fontWeight: 400 }}>
                        {si.servingsPerContainer} servings per container
                    </div>

                    {/* Serving size */}
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
