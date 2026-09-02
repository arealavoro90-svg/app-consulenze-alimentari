// src/calculators/NutrizionaleCalc/SplitShell.tsx
import { useState, useEffect, type ReactNode } from 'react';

interface SplitShellProps {
    left: ReactNode;
    right: ReactNode;
    /** Opacità pannello destro (0-1). Usato in guided mode step 0 per attenuare la tabella. */
    rightOpacity?: number;
}

const STORAGE_KEY = 'aea_split_collapsed';

export function SplitShell({ left, right, rightOpacity = 1 }: SplitShellProps) {
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
    });

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch { /* noop */ }
    }, [collapsed]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                setCollapsed(c => !c);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div className="split-panel">
            <div className="split-panel-left">
                {left}
            </div>
            <div className="split-panel-divider" role="separator" aria-orientation="vertical">
                <button
                    className="split-panel-toggle"
                    onClick={() => setCollapsed(c => !c)}
                    title={collapsed ? 'Mostra tabella (Ctrl+B)' : 'Nascondi tabella (Ctrl+B)'}
                    aria-label={collapsed ? 'Mostra pannello tabella' : 'Nascondi pannello tabella'}
                    aria-expanded={!collapsed}
                >
                    {/* chevron left when expanded, right when collapsed */}
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                        style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
            </div>
            <div
                className={`split-panel-right${collapsed ? ' split-panel-right--collapsed' : ''}`}
                style={{
                    opacity: rightOpacity,
                    pointerEvents: rightOpacity < 1 ? 'none' : undefined,
                    transition: 'opacity 0.2s ease',
                }}
            >
                {right}
            </div>
        </div>
    );
}
