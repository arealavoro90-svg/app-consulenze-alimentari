import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import type { ToolId } from '../../../data/mockUsers';

// ─── Tool definitions ──────────────────────────────────────────────────────────
interface ToolDef {
    id: ToolId;
    label: string;
    color: string;
}

const TOOLS: ToolDef[] = [
    { id: 'nutrizionale',       label: 'Tabelle Nutrizionali',   color: '#ff7e2e' },
    { id: 'etichette',          label: 'Etichette Alimentari',   color: '#1a6bbf' },
    { id: 'etichette-vini',     label: 'Etichette Vini',         color: '#7b1c3e' },
    { id: 'rintracciabilita',   label: 'Rintracciabilità',       color: '#2e7d32' },
    { id: 'trattamento-termico',label: 'Trattamento Termico',    color: '#e53935' },
    { id: 'schede-complete',    label: 'Schede Complete',        color: '#5c35a8' },
    { id: 'scheda-processo',    label: 'Scheda Processo',        color: '#795548' },
];

const ACTIVE_TOOL: ToolId = 'nutrizionale';

// ─── Component ────────────────────────────────────────────────────────────────
export function ToolsTab() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const purchasedTools = user?.purchasedTools ?? [];

    const handleTileTap = (toolId: ToolId) => {
        if (toolId === ACTIVE_TOOL) return;
        if (!purchasedTools.includes(toolId)) return;
        navigate('/tool/' + toolId);
    };

    return (
        <div className="m-tools-grid">
            {TOOLS.map((tool, index) => {
                const isActive = tool.id === ACTIVE_TOOL;
                const isLocked = !purchasedTools.includes(tool.id);
                const isLast   = index === TOOLS.length - 1;

                let tileClass = 'm-tool-tile';
                if (isActive)  tileClass += ' m-tool-tile--active';
                if (isLocked)  tileClass += ' m-tool-tile--locked';

                return (
                    <div
                        key={tool.id}
                        className={tileClass}
                        style={isLast ? { gridColumn: 'span 2' } : undefined}
                        onClick={() => handleTileTap(tool.id)}
                        role="button"
                        tabIndex={isLocked ? -1 : 0}
                        aria-label={tool.label}
                        aria-pressed={isActive}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleTileTap(tool.id);
                            }
                        }}
                    >
                        {/* Color dot indicator */}
                        <span
                            style={{
                                display: 'block',
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: tool.color,
                                marginBottom: 8,
                                flexShrink: 0,
                            }}
                        />

                        {/* Tool name */}
                        <span className="m-tool-tile__name">{tool.label}</span>

                        {/* Active badge */}
                        {isActive && (
                            <span className="m-tool-tile__badge">ATTIVO</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
