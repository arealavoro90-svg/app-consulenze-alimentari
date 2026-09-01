import React, { useState, useRef, useEffect } from 'react';
import { Search, Archive, Trash2, RotateCcw } from 'lucide-react';
import type { ArchiveItem } from '../../../hooks/useArchive';
import type { ArchiveData } from '../NutrizionaleCalc';

interface Props {
    items: ArchiveItem<ArchiveData>[];
    onLoad: (data: ArchiveData) => void;
    onDelete: (id: string) => void;
    onNewRecipe: () => void;
}

type Region = NonNullable<ArchiveData['region']>;

const REGION_CODE: Record<Region, string> = {
    UE:        'EU',
    USA:       'USA',
    Canada:    'CA',
    Australia: 'AU',
    Arabi:     'AR',
};

function formatDate(iso: string): string {
    const d = new Date(iso);
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

interface CtxPos { top: number; left: number }

export function ArchivioTab({ items, onLoad, onDelete, onNewRecipe }: Props) {
    const [query, setQuery]     = useState('');
    const [ctxId, setCtxId]     = useState<string | null>(null);
    const [ctxPos, setCtxPos]   = useState<CtxPos>({ top: 0, left: 0 });
    const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

    const filtered = query.trim()
        ? items.filter(it => it.name.toLowerCase().includes(query.trim().toLowerCase()))
        : items;

    const clearTimer = () => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    useEffect(() => () => clearTimer(), []);

    const handleTouchStart = (id: string, e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        timerRef.current = setTimeout(() => {
            setCtxPos({ top: touch.clientY, left: touch.clientX });
            setCtxId(id);
            timerRef.current = null;
        }, 500);
    };

    const handleTouchEnd = () => {
        clearTimer();
    };

    const handleTouchMove = () => {
        clearTimer();
    };

    const handleTap = (item: ArchiveItem<ArchiveData>) => {
        // Only fire tap if context menu is not being shown (timer already fired would set ctxId)
        if (ctxId === null) {
            onLoad(item.data);
        }
    };

    const dismissCtx = () => setCtxId(null);

    const handleOpen = (item: ArchiveItem<ArchiveData>) => {
        setCtxId(null);
        onLoad(item.data);
    };

    const handleDelete = (id: string) => {
        setCtxId(null);
        onDelete(id);
    };

    const ctxItem = ctxId ? items.find(it => it.id === ctxId) ?? null : null;

    return (
        <><div style={{ paddingBottom: 16 }}>
            {/* Search bar */}
            <div style={{ padding: '12px 16px 8px' }}>
                <div className="m-search">
                    <Search size={16} color="var(--m-text-muted)" />
                    <input
                        type="search"
                        placeholder="Cerca prodotto…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
                <div className="m-empty">
                    <Archive size={40} className="m-empty__icon" color="var(--m-text-faint)" />
                    <p className="m-empty__title">
                        {items.length === 0
                            ? 'Nessun calcolo salvato ancora'
                            : 'Nessun risultato per questa ricerca'}
                    </p>
                    <p className="m-empty__sub">
                        {items.length === 0
                            ? 'Salva un calcolo dalla scheda Mercati per trovarlo qui.'
                            : 'Prova con un termine diverso.'}
                    </p>
                </div>
            )}

            {/* Archive list */}
            {filtered.length > 0 && (
                <div>
                    {filtered.map(item => {
                        const region = item.data.region;
                        const kcal   = item.data.kcal_100g != null ? Math.round(item.data.kcal_100g) : null;
                        return (
                            <div
                                key={item.id}
                                className="m-archive-item m-archive-card"
                                role="button"
                                tabIndex={0}
                                aria-label={`Apri ${item.name}`}
                                onTouchStart={e => handleTouchStart(item.id, e)}
                                onTouchEnd={handleTouchEnd}
                                onTouchMove={handleTouchMove}
                                onClick={() => handleTap(item)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen(item); }
                                }}
                            >
                                {region && (
                                    <div className={`m-archive-badge m-archive-badge--${region}`}>
                                        {REGION_CODE[region]}
                                    </div>
                                )}
                                <div className="m-archive-info">
                                    <div className="m-archive-name">{item.name}</div>
                                    <div className="m-archive-meta">
                                        {formatDate(item.date)}{kcal != null ? ` · ${kcal} kcal/100 g` : ''}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="m-archive-delete-btn"
                                    aria-label={`Elimina ${item.name}`}
                                    onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                                >
                                    <Trash2 size={15} />
                                </button>
                                <svg className="m-archive-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
        <div className="m-cta-bar">
            <button
                type="button"
                className="m-btn m-btn--primary m-btn--full"
                onClick={onNewRecipe}
            >
                <RotateCcw size={14} /> Nuova ricetta
            </button>
        </div>

        {/* Context menu overlay */}
        {ctxId !== null && ctxItem !== null && (
            <>
                <div className="m-ctx-overlay" onClick={dismissCtx} />
                <div
                    className="m-ctx-menu"
                    style={{
                        top:  Math.min(ctxPos.top, window.innerHeight - 120),
                        left: Math.min(ctxPos.left, window.innerWidth  - 180),
                    }}
                >
                    <button
                        type="button"
                        className="m-ctx-menu__item"
                        onClick={() => handleOpen(ctxItem)}
                    >
                        Apri
                    </button>
                    <button
                        type="button"
                        className="m-ctx-menu__item m-ctx-menu__item--danger"
                        onClick={() => handleDelete(ctxItem.id)}
                    >
                        Elimina
                    </button>
                </div>
            </>
        )}
        </>
    );
}
