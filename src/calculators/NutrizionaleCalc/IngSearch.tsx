/**
 * IngSearch — ricerca e aggiunta ingredienti dal database.
 * Estratto da NutrizionaleCalc.tsx (2026-07-31) per essere condiviso
 * tra desktop e mobile senza importare il componente monolitico.
 * Markup e comportamento invariati rispetto alla versione desktop.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { DBIngredient } from '../../engines/nutrizionaleCalcEngine';

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

// ─── Recenti ──────────────────────────────────────────────────────────────────
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

export function IngSearch({ onAdd, db, loading, error, onRetry }: { onAdd: (ing: DBIngredient) => void; db: DBIngredient[]; loading: boolean; error: string | null; onRetry: () => void }) {
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync search results on query change
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
