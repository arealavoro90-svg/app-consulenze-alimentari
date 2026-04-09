
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TOOLS_CATALOG } from '../data/mockUsers';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const initials = user?.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('') ?? '?';

    return (
        <aside className={`sidebar${isOpen ? ' open' : ''}`}>
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">🌿</div>
                <div className="sidebar-brand-text">
                    <h2>AEA Consulenze</h2>
                    <span>Portale Clienti</span>
                </div>
                {/* Close button — visible only on mobile */}
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            marginLeft: 'auto', background: 'none', border: 'none',
                            color: 'rgba(255,255,255,0.6)', fontSize: 20, cursor: 'pointer',
                            lineHeight: 1, padding: '0 4px',
                        }}
                        aria-label="Chiudi menu"
                    >
                        ✕
                    </button>
                )}
            </div>

            <div className="sidebar-user">
                <div className="sidebar-avatar">{initials}</div>
                <div className="sidebar-user-info">
                    <strong>{user?.name}</strong>
                    <span>{user?.company}</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Navigazione</div>
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
                    onClick={onClose}
                >
                    <span className="sidebar-nav-icon">🏠</span>
                    Dashboard
                </NavLink>

                <div className="sidebar-section-label" style={{ marginTop: 16 }}>I tuoi strumenti</div>
                {user?.purchasedTools.map((toolId) => {
                    const tool = TOOLS_CATALOG[toolId];
                    return (
                        <NavLink
                            key={toolId}
                            to={`/tool/${toolId}`}
                            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
                            onClick={onClose}
                        >
                            <span className="sidebar-nav-icon">{tool.icon}</span>
                            {tool.label}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <button className="sidebar-logout-btn" onClick={handleLogout}>
                    <span>🚪</span>
                    Esci dall'account
                </button>
            </div>
        </aside>
    );
}
