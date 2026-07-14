import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Home, LogOut, Salad, Tag, Wine, Package,
    Thermometer, FileText, Settings2, BookOpen,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { TOOLS_CATALOG } from '../data/mockUsers';
import type { ToolId } from '../data/mockUsers';

const TOOL_ICONS: Record<ToolId, React.ReactNode> = {
    'nutrizionale':        <Salad size={16} />,
    'etichette':           <Tag size={16} />,
    'etichette-vini':      <Wine size={16} />,
    'rintracciabilita':    <Package size={16} />,
    'trattamento-termico': <Thermometer size={16} />,
    'schede-complete':     <FileText size={16} />,
    'scheda-processo':     <Settings2 size={16} />,
    'excel-import':        <FileText size={16} />,
};

interface SidebarProps {
    /** Used on <900px to open sidebar as a drawer */
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [flyoutOpen, setFlyoutOpen] = useState(false);
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (leaveTimer.current) clearTimeout(leaveTimer.current);
        };
    }, []);

    const handleLogout = () => { logout(); navigate('/login'); };

    const initials = user?.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('') ?? '?';

    const openFlyout  = () => {
        if (leaveTimer.current) clearTimeout(leaveTimer.current);
        setFlyoutOpen(true);
    };
    const closeFlyout = () => {
        leaveTimer.current = setTimeout(() => setFlyoutOpen(false), 120);
    };

    const allItems = [
        { to: '/dashboard',   icon: <Home size={16} />,     label: 'Dashboard',       key: 'dashboard' },
        { to: '/risorse',     icon: <BookOpen size={16} />, label: 'Links e Risorse', key: 'risorse' },
    ];
    const toolItems = (user?.purchasedTools ?? []).map((toolId) => ({
        to:    `/tool/${toolId}`,
        icon:  TOOL_ICONS[toolId],
        label: TOOLS_CATALOG[toolId].label,
        key:   toolId,
    }));

    return (
        <>
            {/* Collapsed rail */}
            <aside
                className={`sidebar${isOpen ? ' open' : ''}`}
                onMouseEnter={openFlyout}
                onMouseLeave={closeFlyout}
            >
                <div className="sidebar-logo-mark">AEA</div>

                <nav className="sidebar-nav" aria-label="Strumenti">
                    {[...allItems, ...toolItems].map((item) => (
                        <NavLink
                            key={item.key}
                            to={item.to}
                            title={item.label}
                            className={({ isActive }) =>
                                `sidebar-nav-icon-btn${isActive ? ' active' : ''}`
                            }
                            onClick={onClose}
                        >
                            {item.icon}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-bottom">
                    <div className="sidebar-user-avatar" title={user?.name ?? ''}>
                        {initials}
                    </div>
                </div>
            </aside>

            {/* Fly-out overlay */}
            <div
                className={`sidebar-flyout${flyoutOpen ? ' open' : ''}`}
                onMouseEnter={openFlyout}
                onMouseLeave={closeFlyout}
            >
                <div className="sidebar-flyout-brand-name">AEA Consulenze</div>
                <div className="sidebar-flyout-brand-sub">Portale Clienti</div>

                <div className="sidebar-flyout-section-label">NAVIGAZIONE</div>
                {allItems.map((item) => (
                    <NavLink
                        key={item.key}
                        to={item.to}
                        className={({ isActive }) =>
                            `sidebar-flyout-item${isActive ? ' active' : ''}`
                        }
                        onClick={() => { setFlyoutOpen(false); onClose?.(); }}
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}

                <div className="sidebar-flyout-section-label" style={{ marginTop: 12 }}>
                    I TUOI STRUMENTI
                </div>
                {toolItems.map((item) => (
                    <NavLink
                        key={item.key}
                        to={item.to}
                        className={({ isActive }) =>
                            `sidebar-flyout-item${isActive ? ' active' : ''}`
                        }
                        onClick={() => { setFlyoutOpen(false); onClose?.(); }}
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}

                <div className="sidebar-flyout-footer">
                    <div className="sidebar-user-avatar">{initials}</div>
                    <div>
                        <div className="sidebar-flyout-user-name">{user?.name}</div>
                        <div className="sidebar-flyout-user-email">{user?.company}</div>
                    </div>
                    <button
                        type="button"
                        className="sidebar-flyout-logout"
                        onClick={handleLogout}
                        title="Esci dall'account"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        </>
    );
}
