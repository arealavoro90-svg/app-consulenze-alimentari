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
import { WelcomeModal } from '../../components/WelcomeModal';
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
import type { DownloadFormatState } from './DownloadTableModal';
import {
    type DBIngredient, type CalcResult, type RecipeRow, type AdditiveRow, type Component,
    ZERO_CALC, calcNutrients, scaleResult, calcClaims, energyFromMacros,
} from '../../engines/nutrizionaleCalcEngine';
import { ALLERGEN_FIELDS, CROSS_FIELDS, ADDITIVI_CATEGORIE, ADDITIVI_SPECIFICI } from './shared/constants';
import { writeBridge, readBridge, buildDesktopDraft } from './sessionBridge';
import { TabCanada } from './TabCanada';
import { TabAustralia } from './TabAustralia';
import { TabArabi } from './TabArabi';

// const DB = DB_RAW as unknown as DBIngredient[]; // Replaced with fetch state

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
const TOOLTIP_W = 230;
const TOOLTIP_MARGIN = 8; // min distanza dal bordo viewport

function InfoTooltip({ text }: { text: string }) {
    const [visible, setVisible] = useState(false);
    const [pinned, setPinned] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    const computePos = () => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        const vw = window.innerWidth;

        // Posizione orizzontale: centrata sul bottone, clamped nel viewport
        let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
        left = Math.max(TOOLTIP_MARGIN, Math.min(left, vw - TOOLTIP_W - TOOLTIP_MARGIN));

        // Verticale: sopra di default, sotto se non c'è spazio (stima 110px di altezza)
        const below = rect.top < 120;
        const top = below ? rect.bottom + 6 : rect.top - 8;

        setPos({ top, left, below });
    };

    const handleMouseEnter = () => { computePos(); setVisible(true); };
    const handleMouseLeave = () => { if (!pinned) setVisible(false); };
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (pinned) {
            setPinned(false);
            setVisible(false);
        } else {
            computePos();
            setPinned(true);
            setVisible(true);
        }
    };

    // Chiude su click ovunque quando pinnato
    useEffect(() => {
        if (!pinned) return;
        const close = () => { setPinned(false); setVisible(false); };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [pinned]);

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}>
            <button
                ref={btnRef}
                type="button"
                title={text}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
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
                    position: 'fixed',
                    top: pos.top,
                    left: pos.left,
                    transform: pos.below ? 'none' : 'translateY(-100%)',
                    background: 'var(--color-navy)', color: '#fff', fontSize: 11.5, lineHeight: 1.5,
                    padding: '7px 11px', borderRadius: 'var(--radius-sm)', whiteSpace: 'normal',
                    width: TOOLTIP_W, zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
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
        const close = () => setDropOpen(false);
        window.addEventListener('scroll', close, { passive: true, capture: true });
        return () => window.removeEventListener('scroll', close, true);
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
                    data-ing-add-btn
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
                            role="combobox" aria-expanded={dropOpen} aria-controls="ing-search-listbox"
                            aria-autocomplete="list" aria-label="Cerca ingrediente"
                            aria-activedescendant={selectedIdx >= 0 ? `ing-search-opt-${selectedIdx}` : undefined}
                            style={{ width: '100%' }} />
                        <button type="button" onClick={closeSearch} aria-label="Chiudi ricerca"
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

                    {/* Nessun risultato */}
                    {!dropOpen && q.trim().length >= 2 && res.length === 0 && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Search size={12} style={{ flexShrink: 0 }} />
                            Nessun risultato per &ldquo;{q}&rdquo;
                        </div>
                    )}

                    {/* Dropdown risultati */}
                    {dropOpen && dropPos && (
                        <div ref={listRef} id="ing-search-listbox" role="listbox" aria-label="Risultati ricerca ingredienti" style={{
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
                                    id={`ing-search-opt-${i}`} role="option" aria-selected={i === selectedIdx}
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
                                            <span style={{ fontSize: 10, background: 'var(--color-orange)', color: 'white', borderRadius: 'var(--radius-sm)', padding: '1px 6px', fontWeight: 700, flexShrink: 0 }}>Personale</span>
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
                    <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--color-bg-card)', border: '1.5px solid var(--color-orange)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 500, maxHeight: 260, overflowY: 'auto' }}>
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
const _iS: React.CSSProperties = { width: '100%', padding: '5px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 13, boxSizing: 'border-box' };
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
    const { kcal: kcalCalc, kj: kjCalc } = energyFromMacros({
        grassi: grassiN, carboidrati: carbN, polioli: polioliN, eritritolo: eritritoloN,
        fibre: fibreN, acidiOrganici: acidoOrgN, proteine: protN, alcolG,
    });

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
    const iS: React.CSSProperties = _iS;
    const lS: React.CSSProperties = _lS;
    const secS: React.CSSProperties = { marginBottom: 14, padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' };
    const secT = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color, marginBottom: 10 });
    const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 };
    const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 };

    // Accordion state per sezioni collassabili
    const [openSec, setOpenSec] = useState({ facoltativi: false, condizionali: false, micro: false, allergenici: false });
    const toggleSec = (k: keyof typeof openSec) => setOpenSec(prev => ({ ...prev, [k]: !prev[k] }));
    const AccHead = ({ label, sKey, color = '#718096' }: { label: string; sKey: keyof typeof openSec; color?: string }) => (
        <button type="button" onClick={() => toggleSec(sKey)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            {openSec[sKey] ? <ChevronDown size={12} style={{ flexShrink: 0, color }} /> : <ChevronRight size={12} style={{ flexShrink: 0, color }} />}
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
                    <h3 style={{ margin: 0 }}>{initialIngredient ? 'Modifica ingrediente' : 'Aggiungi ingrediente al Database'}</h3>
                    <button className="btn btn-outline" onClick={onClose} style={{ display: 'flex', alignItems: 'center' }}><X size={14} /></button>
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
                        {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#c53030', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={11} style={{ flexShrink: 0 }} />{e}</div>)}
                    </div>
                )}

                {/* Info base */}
                <div style={secS}>
                    <div style={secT('#333')}>Informazioni base</div>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ ...lS, color: '#333' }} htmlFor="custom-ing-nome">Nome ingrediente <span style={{ color: '#c53030' }}>*</span></label>
                        <input id="custom-ing-nome" style={!nome.trim() && errors.length > 0 ? _iSErr : _iS} value={nome}
                            onChange={e => { setNome(e.target.value); clearErrors(); }}
                            placeholder="es. salsa di soia artigianale" />
                    </div>
                    <div style={grid2}>
                        <div>
                            <label style={lS} htmlFor="custom-ing-categoria">Categoria</label>
                            <select id="custom-ing-categoria" style={iS} value={categoria} onChange={e => setCategoria(e.target.value)}>
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
    // ponytail: subTab/auShowDI rimossi — gestiti internamente dai componenti o dal DownloadTableModal
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

    const [welcomeSeen, setWelcomeSeen] = useLocalStorage<boolean>('aea_welcome_seen', false);
    const [showWelcome, setShowWelcome] = useState<boolean>(!welcomeSeen);

    const [expertTab, setExpertTab] = useState<'ricetta' | 'riepilogo'>('ricetta');
    const [dbMenuOpen, setDbMenuOpen] = useState(false);
    const dbMenuRef = useRef<HTMLDivElement>(null);

    // Chiude dropdown Database al click fuori
    useEffect(() => {
        if (!dbMenuOpen) return;
        const h = (e: MouseEvent) => { if (dbMenuRef.current && !dbMenuRef.current.contains(e.target as Node)) setDbMenuOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [dbMenuOpen]);

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

    // ─── Porzioni: colonna sempre visibile (redesign 2026-07) ───
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
                const skippedDraft: string[] = [];
                const restoredComps: Component[] = draft.components.map(c => ({
                    ...c,
                    id: String(Date.now() + Math.random()),
                    rows: c.rows.flatMap(r => {
                        const found = db.find(d => d.nome === r.ing.nome);
                        if (!found) { skippedDraft.push(r.ing.nome); return []; }
                        return [{ ...r, id: String(Date.now() + Math.random()), ing: found }];
                    }),
                }));
                if (skippedDraft.length > 0) toast.warning(`Ingredienti non trovati nel database e rimossi: ${skippedDraft.join(', ')}`);
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
        if (result.productName) setProductName(result.productName);
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
                    updated = updated.map(c => c.id !== firstId ? c : { ...c, rows: [...c.rows, ...newRows], name: c.name || comp.name, pzUV: comp.pzUV ?? c.pzUV });
                } else {
                    updated = [...updated, { ...makeComp(), name: comp.name, rows: newRows, pzUV: comp.pzUV ?? 1 }];
                }
            });
            return updated;
        });
        if (result.finishedWeight) setFinishedWeight(String(result.finishedWeight));
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
    const [lastDeleted, setLastDeleted] = useState<{ compId: string; row: RecipeRow; idx: number } | null>(null);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const removeRow = (compId: string, rowId: string) => {
        setComponents(prev => {
            const comp = prev.find(c => c.id === compId);
            if (!comp) return prev;
            const idx = comp.rows.findIndex(r => r.id === rowId);
            const row = comp.rows[idx];
            if (row) {
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                setLastDeleted({ compId, row, idx });
                undoTimerRef.current = setTimeout(() => setLastDeleted(null), 5000);
            }
            return prev.map(c => c.id !== compId ? c : { ...c, rows: c.rows.filter(r => r.id !== rowId) });
        });
    };

    const undoRemoveRow = () => {
        if (!lastDeleted) return;
        setComponents(prev => prev.map(c => {
            if (c.id !== lastDeleted.compId) return c;
            const rows = [...c.rows];
            rows.splice(lastDeleted.idx, 0, lastDeleted.row);
            return { ...c, rows };
        }));
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setLastDeleted(null);
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

        if (parsed > 0 && totGrammiXpzuv > 0 && Math.round(parsed) > Math.round(totGrammiXpzuv)) {
            setFwWarning(true);
            setFieldErrors(prev => ({...prev, [errorKey]: `Il peso finito non può superare il totale ingredienti (${Math.round(totGrammiXpzuv)}g). Controlla le quantità.`}));
            setFinishedWeight(val);
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
        if (Math.round(parsed) > Math.round(totGrammiXpzuv)) {
            setFwWarning(true);
            setFieldErrors(prev => ({...prev, [errorKey]: `Il peso finito non può superare il totale ingredienti (${Math.round(totGrammiXpzuv)}g). Controlla le quantità.`}));
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
        const skippedLoad: string[] = [];
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
                    if (!found) { skippedLoad.push(ingName); return []; }
                    return [{ id: String(Date.now() + Math.random()), ing: found, grams, eurKg: 0, resa: 100 }];
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
        if (skippedLoad.length > 0) toast.warning(`Ingredienti non trovati nel database e rimossi: ${skippedLoad.join(', ')}`);
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
        if (allRows.length > 0 || productName.trim().length > 0) {
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
    const renderDownloadPreview = (state: DownloadFormatState): React.ReactNode => {
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
                        subTab={state.subTab} />
                );
            case 'Australia':
                return (
                    <TabAustralia p={per100display} au={au} />
                );
            case 'Arabi':
                return (
                    <TabArabi p={per100display} arabi={arabi} servingRef={state.servingRef} measure={state.measure}
                        specificGravity={parseFloat(specificGravity) || 0} />
                );
        }
    };

    const renderTablePanel = (isMobileInline = false): React.ReactNode => {
        return (
            <div id={isMobileInline ? undefined : 'mob-tables-anchor'} className="table-panel-inner">
            <div className="table-panel-header">
                {/* Product name as header anchor */}
                <div className="table-panel-header-title" style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    {productName
                        ? <span style={{ fontWeight: 700 }}>{productName}</span>
                        : <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', fontWeight: 400 }}>Prodotto senza nome</span>
                    }
                </div>
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

            </div>{/* /table-panel-header */}

                {/* Body: tabella + colonna porzioni fissa */}
                <div className="table-panel-body">
                <div ref={isMobileInline ? undefined : tableRef} className={`table-scroll-area${isFlashing ? ' value-flash' : ''}`} style={{ overflowX: 'auto' }}>
                    {activeTab === 'UE' && (
                        <div className="table-wrap-center" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: 8 }}>
                            <TabUE
                                p={per100display}
                                ue={ue}
                                specificGravity={parseFloat(specificGravity) || 0}
                                selectedOptionals={selectedOptionals}
                                showOptionals={showOptionals}
                                activeSubTab="100g"
                            />
                        </div>
                    )}
                    {activeTab === 'USA' && (
                        <div className="table-wrap-center" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: 8 }}>
                            <TabUSA p={per100display} usa={usa} specificGravity={parseFloat(specificGravity) || 0}
                                servingRef="serving" measure="g" subTab="verticale" />
                        </div>
                    )}
                    {activeTab === 'Canada' && (
                        // Canada (280px) è più stretta delle altre tabelle (~300-328px): l'intero box
                        // (bordo + tabella) scala come unità, così l'overflow:hidden non taglia nulla.
                        <div className="table-wrap-center" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: 8, transform: 'scale(1.12)', transformOrigin: 'center' }}>
                            <TabCanada p={per100display} ca={ca} servingRef="serving" measure="g" subTab="verticale" />
                        </div>
                    )}
                    {activeTab === 'Australia' && (
                        <div className="table-wrap-center" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: 8 }}>
                            <TabAustralia p={per100display} au={au} />
                        </div>
                    )}
                    {activeTab === 'Arabi' && (
                        <div className="table-wrap-center" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: 8 }}>
                            <TabArabi p={per100display} arabi={arabi} servingRef="serving" measure="g" specificGravity={parseFloat(specificGravity) || 0} />
                        </div>
                    )}
                </div>

                {/* Valori facoltativi + Claim EU — fuori da table-scroll-area: non deve muoversi
                    quando la tabella cresce coi facoltativi attivi (a pari con la colonna porzioni) */}
                {activeTab === 'UE' && (
                    <div style={{ flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                                    <SlidersHorizontal size={12} /> Configura nutrienti
                                </button>
                            )}
                        </div>
                        {/* ── Claim nutrizionali EU (Reg. 2006/1924) ──────── */}
                        {(() => {
                            const claims = calcClaims(per100display, isLiquid);
                            return (
                                <div style={{
                                    marginTop: 10,
                                    background: 'color-mix(in srgb, var(--color-navy) 6%, var(--color-bg-card))',
                                    border: '1px solid color-mix(in srgb, var(--color-navy) 18%, var(--color-border))',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 12px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: claims.length > 0 ? 8 : 0 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-navy)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                            Claim applicabili
                                        </span>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                                            <input
                                                type="checkbox"
                                                checked={isLiquid}
                                                onChange={e => setIsLiquid(e.target.checked)}
                                                style={{ width: 12, height: 12, cursor: 'pointer', accentColor: 'var(--color-orange)' }}
                                            />
                                            Liquido
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
                                                    borderRadius: 'var(--radius-sm)', padding: '3px 7px',
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
                    </div>
                )}

                {/* Colonna porzioni — struttura speculare al DownloadTableModal */}
                <aside className="portions-col" aria-label={`Porzioni ${activeTab}`}>
                    {/* ── UE: sezione Colonne (specchia "Colonne" del modal) ── */}
                    {activeTab === 'UE' && (
                        <div role="group" aria-label="Colonne" style={{ display: 'contents' }}>
                            {(['porzione', 'confezione', 'pezzo'] as const).map((k, i) => {
                                const shortLabels = ['Porzione', 'U.V./Conf.', 'Pezzo'];
                                const fullLabels = ['Porzione (g/ml)', 'U.V. / Conf. (g/ml)', 'Pezzo (g/ml)'];
                                return (
                                    <div key={k} className="field">
                                        <label className="field-label" htmlFor={`portion-ue-${k}`} title={fullLabels[i]}>{shortLabels[i]}</label>
                                        <input id={`portion-ue-${k}`} type="number" min={0} placeholder="—" value={ue[k] || ''}
                                            onChange={e => setUE(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                            className="field-input" />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Australia: solo riferimenti serving ── */}
                    {activeTab === 'Australia' && (
                        <div role="group" aria-label="Riferimento" style={{ display: 'contents' }}>
                            {(['serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                const shortLabels = ['Serving', 'Confez.', 'Pezzo'];
                                const fullLabels = ['Serving size (g/ml)', 'Confezione (g/ml)', 'Pezzo (g/ml)'];
                                return (
                                    <div key={k} className="field">
                                        <label className="field-label" htmlFor={`portion-au-${k}`} title={fullLabels[i]}>{shortLabels[i]}</label>
                                        <input id={`portion-au-${k}`} type="number" min={0} placeholder="—" value={au[k] || ''}
                                            onChange={e => setAU(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                            className="field-input" />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── USA / Canada / Arabi: Riferimento + Unità ── */}
                    {(activeTab === 'USA' || activeTab === 'Canada' || activeTab === 'Arabi') && (() => {
                        const cupMl = activeTab === 'Canada' ? 250 : 240;
                        const setFn = activeTab === 'USA' ? setUSA : activeTab === 'Canada' ? setCA : setArabi;
                        const vals = activeTab === 'USA' ? usa : activeTab === 'Canada' ? ca : arabi;
                        return (
                            <>
                                <div role="group" aria-label="Riferimento" style={{ display: 'contents' }}>
                                    <div className="field">
                                        <label className="field-label" htmlFor="portion-serving" title="Serving size (g/ml)">Serving</label>
                                        <input id="portion-serving" type="number" min={0} placeholder="—" value={vals.serving || ''}
                                            onChange={e => setFn(prev => ({ ...prev, serving: parseFloat(e.target.value) || undefined }))}
                                            className="field-input" />
                                    </div>
                                    <div className="field">
                                        <label className="field-label" htmlFor="portion-confezione" title="Confezione (g/ml)">Confez.</label>
                                        <input id="portion-confezione" type="number" min={0} placeholder="—" value={vals.confezione || ''}
                                            onChange={e => setFn(prev => ({ ...prev, confezione: parseFloat(e.target.value) || undefined }))}
                                            className="field-input" />
                                    </div>
                                </div>

                                <span className="portions-col-divider" aria-hidden="true" />

                                <div role="group" aria-label="Unità" style={{ display: 'contents' }}>
                                    <div className="field">
                                        <label className="field-label" htmlFor="portion-cup" title={`1 Cup = ${cupMl}ml → (g)`}>Cup</label>
                                        <InfoTooltip text={`Una cup è un contenitore fisico standard da ${cupMl}ml. Inserisci il peso in grammi di una cup piena del tuo prodotto. Es: 1 cup di farina = 120g, 1 cup di riso = 185g, 1 cup di liquido = ~${cupMl}g.`} />
                                        <input id="portion-cup" type="number" min={0} placeholder="—" value={vals.cup || ''}
                                            onChange={e => setFn(prev => ({ ...prev, cup: parseFloat(e.target.value) || undefined }))}
                                            className="field-input" />
                                    </div>
                                    <div className="field">
                                        <label className="field-label" htmlFor="portion-cucchiaio" title="1 Cucchiaio = 15ml → (g)">Cucch.</label>
                                        <input id="portion-cucchiaio" type="number" min={0} placeholder="—" value={vals.cucchiaio || ''}
                                            onChange={e => setFn(prev => ({ ...prev, cucchiaio: parseFloat(e.target.value) || undefined }))}
                                            className="field-input" />
                                    </div>
                                    <div className="field">
                                        <label className="field-label" htmlFor="portion-pezzo" title="Pezzo (g)">Pezzo</label>
                                        <input id="portion-pezzo" type="number" min={0} placeholder="—" value={vals.pezzo || ''}
                                            onChange={e => setFn(prev => ({ ...prev, pezzo: parseFloat(e.target.value) || undefined }))}
                                            className="field-input" />
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </aside>
                </div>{/* /table-panel-body */}

                <div className="table-panel-footer" style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-accent" onClick={() => setDownloadModalOpen(true)}
                        style={{ flex: 1, padding: '7px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <ImageDown size={13} aria-hidden="true" /> Scarica ufficiale…
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
                    <button type="button" className="topbar-btn-ghost" onClick={() => setShowWelcome(true)} title="Apri guida rapida">
                        <BookOpen size={13} />
                        Guida
                    </button>
                    <div ref={dbMenuRef} style={{ position: 'relative' }}>
                        <button type="button" className="topbar-btn-ghost" onClick={() => setDbMenuOpen(o => !o)}>
                            <Database size={13} />
                            Database
                            <ChevronDown size={11} style={{ marginLeft: 2 }} />
                        </button>
                        {dbMenuOpen && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)',
                                minWidth: 180, zIndex: 200, overflow: 'hidden',
                            }}>
                                <button type="button"
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', padding: '9px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--color-text)', textAlign: 'left' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    onClick={() => { setShowCustomModal(true); setDbMenuOpen(false); }}>
                                    <Plus size={13} /> Nuovo ingrediente
                                </button>
                                <button type="button"
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', padding: '9px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--color-text)', textAlign: 'left', borderTop: '1px solid var(--color-border)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    onClick={() => { setShowBrowseModal(true); setDbMenuOpen(false); }}>
                                    <BookOpen size={13} /> Sfoglia database
                                </button>
                            </div>
                        )}
                    </div>
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
            {showWelcome && (
                <WelcomeModal
                    onClose={() => setShowWelcome(false)}
                    onNeverShow={() => { setWelcomeSeen(true); setShowWelcome(false); }}
                />
            )}
            {/* Archive modal */}
            {archiveOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '90%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}><FolderOpen size={16} /> Archivio Ricette</h3>
                            <button className="btn btn-outline" onClick={() => setArchiveOpen(false)} title="Chiudi" style={{ display: 'flex', alignItems: 'center', padding: '4px 8px' }}><X size={14} /></button>
                        </div>
                        {archiveItems.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--color-text-muted)' }}>
                                <Archive size={36} style={{ opacity: 0.25, marginBottom: 12 }} />
                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', marginBottom: 6 }}>Nessuna ricetta salvata</div>
                                <div style={{ fontSize: 13, lineHeight: 1.5 }}>Compila una ricetta e usa "Salva in archivio" per trovarla qui.</div>
                            </div>
                        )}
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
                                        <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px', color: '#e53e3e', display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => openConfirm({ title: 'Eliminare ricetta', message: `Vuoi eliminare "${title}"? L'azione è irreversibile.`, variant: 'danger', confirmLabel: 'Elimina', onConfirm: () => { closeConfirm(); deleteItem(item.id); } })}><Trash2 size={12} /> Elimina</button>
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

                            {/* Banner undo eliminazione ingrediente */}
                            {lastDeleted && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '8px 14px', background: 'var(--color-navy)', color: '#fff',
                                    fontSize: 12, gap: 10, flexShrink: 0,
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Trash2 size={12} style={{ opacity: 0.7 }} />
                                        <strong>{(lastDeleted.row.ing.nome || '').trim()}</strong> rimosso
                                    </span>
                                    <button type="button" onClick={undoRemoveRow}
                                        style={{ background: 'var(--color-orange)', border: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', padding: '3px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                        Annulla
                                    </button>
                                </div>
                            )}

                            {/* Tab content */}
                            <div className="expert-tab-content" style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

                        {expertTab === 'ricetta' && (<>

            {/* ── Empty State ── */}
            {allRows.length === 0 && !productName && (
                <div style={{
                    marginBottom: 16,
                    borderRadius: 'var(--radius-lg)',
                    border: '1.5px solid var(--color-border)',
                    background: '#fafafa',
                    overflow: 'hidden',
                }}>
                    {/* Hero: Smart Import */}
                    <div style={{ padding: '24px 24px 20px', textAlign: 'center' }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 'var(--radius-lg)',
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
                                padding: '11px 24px', borderRadius: 'var(--radius-md)', border: 'none',
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
                                gap: 7, padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                                border: '1.5px solid var(--color-border)', background: '#fff',
                                color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <FolderOpen size={15} /> Carica da archivio
                        </button>
                        <button
                            type="button"
                            onClick={() => document.querySelector<HTMLButtonElement>('[data-ing-add-btn]')?.click()}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 7, padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                                border: '1.5px solid var(--color-border)', background: '#fff',
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
                                    padding: '5px 12px', borderRadius: 'var(--radius-sm)',
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
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }} htmlFor="nut-product-name">Nome prodotto *</label>
                    <input id="nut-product-name" type="text" placeholder="Es. Pasta fresca all'uovo (obbligatorio per scaricare)" value={productName}
                        onChange={e => setProductName(e.target.value)} className="field-input"
                        style={{ fontWeight: 600, fontSize: 16, width: '100%', padding: '8px 10px' }} />
                </div>
                {/* Peso finito e specifico — sempre visibili, disabled senza ingredienti */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }} htmlFor="nut-finished-weight">Peso finito (g)</label>
                            <InfoTooltip text="Peso del prodotto dopo cottura, disidratazione o evaporazione di acqua. Deve essere uguale o inferiore al peso del prodotto processato." />
                        </div>
                        <input id="nut-finished-weight" type="number" min={0}
                            placeholder={allRows.length === 0 ? 'Aggiungi prima gli ingredienti' : `max ${Math.round(totGrammiXpzuv)}g`}
                            value={finishedWeight}
                            disabled={allRows.length === 0}
                            onChange={e => handleFW(e.target.value)}
                            className="field-input" style={{ width: '100%', ...(fwWarning ? { borderColor: '#e53e3e', background: 'rgba(229,62,62,.05)' } : {}), ...(allRows.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }} htmlFor="nut-specific-gravity">Peso specifico (g/ml)</label>
                            <InfoTooltip text="Inserisci il peso specifico SOLO per alimenti liquidi. Quando compilato, i valori verranno espressi su 100 ml." />
                        </div>
                        <input id="nut-specific-gravity" type="number" min={0} step={0.01} placeholder="opzionale" value={specificGravity}
                            onChange={e => setSpecificGravity(e.target.value)} className="field-input" style={{ width: '100%' }} />
                    </div>
                </div>
                {fwWarning && (
                    <div style={{ padding: '5px 8px', background: 'rgba(229,62,62,.10)', border: '2px solid #e53e3e', borderRadius: 6, fontSize: 11, color: '#c53030', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors['finished-weight'] || `Peso superiore al crudo. Max ${(totalGramsRaw / ((components[0]?.pzUV || 1))).toFixed(0)}g.`}</span>
                    </div>
                )}
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
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-orange)', flexShrink: 0, minWidth: 20, display: 'flex', alignItems: 'center', gap: 2 }}>C{ci + 1}<InfoTooltip text="Un componente è una parte separata della ricetta. Usa un solo componente per ricette semplici (es. pasta fresca, ragù). Aggiungi un secondo componente solo per prodotti strutturati con parti distinte (es. biscotto + farcia, pizza + condimento)." /></span>
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
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Pezzi prodotti</span>
                            <InfoTooltip text="Quante confezioni/pezzi finiti produce questa ricetta. Es: se la ricetta produce 4 pacchetti da 250g, scrivi 4. Se non sai, lascia 1." />
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
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cerca e aggiungi ingrediente dal database</div>
                    <IngSearch onAdd={(ing) => addRowToComp(comp.id, ing)} db={db} loading={loadingDB} error={dbError} onRetry={loadDB} />
                    {comp.rows.length > 0 && (
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 6 }}>
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
                                        title={isExpanded ? 'Comprimi' : 'Espandi €/kg e Resa dopo cottura (%)'}
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
                                            style={{ width: 58, fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', textAlign: 'right', fontFamily: 'inherit', color: 'var(--color-text)', background: 'var(--color-bg-input)', outline: 'none' }}
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
                                                <span className="ing-field-label">Resa dopo cottura (%)</span>
                                                <InfoTooltip text="Percentuale di peso rimanente dopo cottura o lavorazione. Es: 80% significa che 100g crudi diventano 80g cotti. Lascia 100% se non c'è perdita di peso." />
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 6px' }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Additivi tecnologici</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 8px' }}>Conservanti, coloranti, addensanti (E-numbers). Non contribuiscono al calcolo nutrizionale ma compaiono in etichetta.</p>
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
                                            <div className="ing-field-header"><span className="ing-field-label">Resa dopo cottura (%)</span></div>
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
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', margin: '4px 0 0' }}>Usa più componenti solo per prodotti con parti separate (es. biscotto + farcia).</p>

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
                                            <th className="ri-q" style={{ padding: '5px 7px', textAlign: 'right', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap', color: 'var(--color-orange)' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>QUID<InfoTooltip text="Dichiarazione Quantitativa degli Ingredienti (QUID): percentuale di ogni ingrediente presente nel prodotto finito, richiesta dalla normativa UE quando l'ingrediente è citato nella denominazione o nell'immagine del prodotto." /></span></th>
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
                    <div style={{ marginBottom: 20, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '14px 20px' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}><Euro size={15} /> Riepilogo Costi Ingredienti</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                            <div style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Costo ingredienti per pezzo</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-orange)', marginTop: 4 }}>{costoTotale.toFixed(3)} €</div>
                            </div>
                            <div style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Costo ingredienti per kg</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-navy)', marginTop: 4 }}>{costPerKg.toFixed(3)} €</div>
                            </div>
                            <div style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
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

