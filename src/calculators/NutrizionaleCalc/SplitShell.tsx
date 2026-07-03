// src/calculators/NutrizionaleCalc/SplitShell.tsx
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';

interface SplitShellProps {
    left: ReactNode;
    right: ReactNode;
    /** Opacità pannello destro (0-1). Usato in guided mode step 0 per attenuare la tabella. */
    rightOpacity?: number;
    /** Percentuale iniziale pannello sinistro (default 55) */
    defaultLeftPct?: number;
}

export function SplitShell({ left, right, rightOpacity = 1, defaultLeftPct = 55 }: SplitShellProps) {
    const [leftPct, setLeftPct] = useState(defaultLeftPct);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragging.current = true;
    }, []);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const pct = Math.min(80, Math.max(20, ((e.clientX - rect.left) / rect.width) * 100));
            setLeftPct(pct);
        };
        const onUp = () => { dragging.current = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    return (
        <div ref={containerRef} className="split-panel">
            <div className="split-panel-left" style={{ width: `${leftPct}%` }}>
                {left}
            </div>
            <div
                className="split-panel-divider"
                onMouseDown={onMouseDown}
            />
            <div
                className="split-panel-right"
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
