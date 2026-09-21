
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BarChart2, ArrowRight, Crown,
    Salad, Tag, Wine, Package, Thermometer, FileText, Settings2,
    ClipboardList, BookOpen, HelpCircle,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useArchive } from '../hooks/useArchive';
import { TOOLS_CATALOG } from '../data/mockUsers';
import type { ToolId } from '../data/mockUsers';
import { WelcomeModal, ONBOARDING_SLIDES } from './WelcomeModal';

const ONBOARDING_KEY = 'aea_onboarding_done';

const TOOL_ICONS: Record<ToolId, React.ReactNode> = {
    'nutrizionale':        <Salad size={28} />,
    'etichette':           <Tag size={28} />,
    'etichette-vini':      <Wine size={28} />,
    'rintracciabilita':    <Package size={28} />,
    'trattamento-termico': <Thermometer size={28} />,
    'schede-complete':     <FileText size={28} />,
    'scheda-processo':     <Settings2 size={28} />,
    'excel-import':        <FileText size={28} />,
};

export function Dashboard() {
    const { user } = useAuth();
    const { items: recipes } = useArchive('nutrizionale-v3', 'nutrizionale');
    const { items: labels } = useArchive('aea_archive_etichette', 'etichette');

    const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(ONBOARDING_KEY));

    const closeOnboarding = () => setShowOnboarding(false);
    const neverShowOnboarding = () => {
        localStorage.setItem(ONBOARDING_KEY, '1');
        setShowOnboarding(false);
    };

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Buongiorno';
        if (h < 18) return 'Buon pomeriggio';
        return 'Buonasera';
    };

    // Admin vede tutti gli strumenti, gli altri solo quelli acquistati
    const visibleTools: ToolId[] = user?.role === 'admin'
        ? (Object.keys(TOOLS_CATALOG) as ToolId[])
        : (user?.purchasedTools ?? []);

    return (
        <div>
            {showOnboarding && (
                <WelcomeModal
                    slides={ONBOARDING_SLIDES}
                    onClose={closeOnboarding}
                    onNeverShow={neverShowOnboarding}
                />
            )}

            {/* Floating "Guida rapida" button */}
            <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                aria-label="Apri guida rapida"
                style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--color-orange)', color: '#fff',
                    border: 'none', borderRadius: 24, padding: '10px 16px',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                }}
            >
                <HelpCircle size={16} />
                Guida rapida
            </button>

            <div className="page-header">
                <h1>{greeting()}, {user?.name.split(' ')[0]}</h1>
                <p>Portale strumenti AEA · {user?.company}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
                <div className="card" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="stat-icon-box"><BarChart2 size={22} /></div>
                        <div>
                            <div className="info-label" style={{ marginBottom: 2 }}>Strumenti</div>
                            <div className="stat-value">
                                {visibleTools.length}
                                <span className="stat-value-sub">/ {Object.keys(TOOLS_CATALOG).length}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="stat-icon-box"><BookOpen size={22} /></div>
                        <div>
                            <div className="info-label" style={{ marginBottom: 2 }}>Ricette salvate</div>
                            <div className="stat-value">{recipes.length}</div>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="stat-icon-box"><ClipboardList size={22} /></div>
                        <div>
                            <div className="info-label" style={{ marginBottom: 2 }}>Etichette salvate</div>
                            <div className="stat-value">{labels.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="page-header">
                <h2 style={{ fontSize: 'var(--text-2xl)' }}>I tuoi strumenti</h2>
                <p>Clicca su uno strumento per accedere al calcolatore</p>
            </div>

            <div className="card-grid-3">
                {visibleTools.map((toolId) => {
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
