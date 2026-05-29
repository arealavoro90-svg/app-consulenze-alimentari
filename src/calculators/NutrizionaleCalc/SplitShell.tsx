// src/calculators/NutrizionaleCalc/SplitShell.tsx
import type { ReactNode } from 'react';

interface SplitShellProps {
    left: ReactNode;
    right: ReactNode;
    /** Opacità pannello destro (0-1). Usato in guided mode step 0 per attenuare la tabella. */
    rightOpacity?: number;
}

export function SplitShell({ left, right, rightOpacity = 1 }: SplitShellProps) {
    return (
        <div className="split-panel">
            <div className="split-panel-left">
                {left}
            </div>
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
