
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Home, LogOut, Salad, Tag, Wine, Package,
    Thermometer, FileText, Settings2, LayoutGrid, BookOpen,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { TOOLS_CATALOG } from '../data/mockUsers';
import type { ToolId } from '../data/mockUsers';

const TOOL_ICONS: Record<ToolId, React.ReactNode> = {
    'nutrizionale':       <Salad size={16} />,
    'etichette':          <Tag size={16} />,
    'etichette-vini':     <Wine size={16} />,
    'rintracciabilita':   <Package size={16} />,
    'trattamento-termico':<Thermometer size={16} />,
    'schede-complete':    <FileText size={16} />,
    'scheda-processo':    <Settings2 size={16} />,
};

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
                <img
                    src="/aea-logo.png"
                    alt="AEA Consulenze Alimentari"
                    className="sidebar-logo"
                />
                {/* Close button — visible only on mobile */}
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none',
                            color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer',
                            lineHeight: 1, padding: '0 2px', flexShrink: 0,
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
                    <span className="sidebar-nav-icon"><Home size={16} /></span>
                    Dashboard
                </NavLink>
                <NavLink
                    to="/risorse"
                    className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
                    onClick={onClose}
                >
                    <span className="sidebar-nav-icon"><BookOpen size={16} /></span>
                    Links e Risorse
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
                            <span className="sidebar-nav-icon">{TOOL_ICONS[toolId]}</span>
                            {tool.label}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <button className="sidebar-logout-btn" onClick={handleLogout}>
                    <LogOut size={15} />
                    Esci dall'account
                </button>
            </div>
        </aside>
    );
}
