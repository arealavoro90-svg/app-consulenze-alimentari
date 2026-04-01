
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TOOLS_CATALOG } from '../data/mockUsers';

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
                <h1>{greeting()}, {user?.name.split(' ')[0]} 👋</h1>
                <p>Portale strumenti AEA · {user?.company}</p>
            </div>

            <div className="card" style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 52, height: 52,
                        background: 'linear-gradient(135deg, rgba(0,163,108,0.2), rgba(30,58,92,0.3))',
                        borderRadius: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 26, border: '1px solid rgba(0,163,108,0.2)'
                    }}>
                        📊
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
                            <span className="tool-card-arrow">→</span>
                            <div className="tool-card-icon">{tool.icon}</div>
                            <h3>{tool.label}</h3>
                            <p>{tool.description}</p>
                        </Link>
                    );
                })}
            </div>

            {user?.role === 'admin' && (
                <div className="alert alert-info" style={{ marginTop: 24 }}>
                    👑 Sei loggato come <strong>Admin</strong> — hai accesso a tutti gli strumenti disponibili.
                </div>
            )}
        </div>
    );
}
