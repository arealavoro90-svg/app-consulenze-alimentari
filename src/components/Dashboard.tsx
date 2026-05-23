
import { Link } from 'react-router-dom';
import {
    BarChart2, ArrowRight, Crown,
    Salad, Tag, Wine, Package, Thermometer, FileText, Settings2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { TOOLS_CATALOG } from '../data/mockUsers';
import type { ToolId } from '../data/mockUsers';

const TOOL_ICONS: Record<ToolId, React.ReactNode> = {
    'nutrizionale':        <Salad size={28} />,
    'etichette':           <Tag size={28} />,
    'etichette-vini':      <Wine size={28} />,
    'rintracciabilita':    <Package size={28} />,
    'trattamento-termico': <Thermometer size={28} />,
    'schede-complete':     <FileText size={28} />,
    'scheda-processo':     <Settings2 size={28} />,
};

export function Dashboard() {
    const { user } = useAuth();

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Buongiorno';
        if (h < 18) return 'Buon pomeriggio';
        return 'Buonasera';
    };

    return (
        <div>
            <div className="page-header">
                <h1>{greeting()}, {user?.name.split(' ')[0]}</h1>
                <p>Portale strumenti AEA · {user?.company}</p>
            </div>

            <div className="card" style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 52, height: 52,
                        background: 'linear-gradient(135deg, rgba(0,163,108,0.2), rgba(30,58,92,0.3))',
                        borderRadius: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-accent-light)', border: '1px solid rgba(0,163,108,0.2)'
                    }}>
                        <BarChart2 size={26} />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 2 }}>Strumenti acquistati</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-accent-light)' }}>
                            {user?.purchasedTools.length}
                            <span style={{ fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 8 }}>
                                / {Object.keys(TOOLS_CATALOG).length} disponibili
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="page-header">
                <h1 style={{ fontSize: 18 }}>I tuoi strumenti</h1>
                <p>Clicca su uno strumento per accedere al calcolatore</p>
            </div>

            <div className="card-grid-3">
                {user?.purchasedTools.map((toolId) => {
                    const tool = TOOLS_CATALOG[toolId];
                    return (
                        <Link key={toolId} to={`/tool/${toolId}`} className="tool-card">
                            <span className="tool-card-arrow"><ArrowRight size={16} /></span>
                            <div className="tool-card-icon">{TOOL_ICONS[toolId]}</div>
                            <h3>{tool.label}</h3>
                            <p>{tool.description}</p>
                        </Link>
                    );
                })}
            </div>

            {user?.role === 'admin' && (
                <div className="alert alert-info" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Crown size={16} />
                    Sei loggato come <strong>Admin</strong> — hai accesso a tutti gli strumenti disponibili.
                </div>
            )}
        </div>
    );
}
