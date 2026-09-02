import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    Home, Salad, Tag, Wine, Package,
    Thermometer, FileText, Settings2, MoreHorizontal, X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from './ui/ConfirmDialog';
import type { ToolId } from '../data/mockUsers';

const TAB_ICONS: Record<ToolId, React.ReactNode> = {
    'nutrizionale':        <Salad size={20} />,
    'etichette':           <Tag size={20} />,
    'etichette-vini':      <Wine size={20} />,
    'rintracciabilita':    <Package size={20} />,
    'trattamento-termico': <Thermometer size={20} />,
    'schede-complete':     <FileText size={20} />,
    'scheda-processo':     <Settings2 size={20} />,
    'excel-import':        <FileText size={20} />,
};

const TAB_LABELS: Record<ToolId, string> = {
    'nutrizionale':        'Nutriz.',
    'etichette':           'Etich.',
    'etichette-vini':      'Vini',
    'rintracciabilita':    'Rintrac.',
    'trattamento-termico': 'Termico',
    'schede-complete':     'Schede',
    'scheda-processo':     'Processo',
    'excel-import':        'Excel',
};

// Max tool tabs visibili in barra prima di collassare in drawer
const MAX_VISIBLE_TABS = 3;

interface MobileShellProps {
    pageLabel?: string;
    insideTool?: boolean;
}

export function MobileShell({ pageLabel = 'Dashboard', insideTool = false }: MobileShellProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleLogout = () => { logout(); navigate('/login'); };

    const initials = user
        ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    const toolTabs = (user?.purchasedTools ?? []).map(toolId => ({
        to: `/tool/${toolId}`,
        icon: TAB_ICONS[toolId],
        label: TAB_LABELS[toolId],
        key: toolId,
    }));

    const visibleTabs = toolTabs.slice(0, MAX_VISIBLE_TABS);
    const overflowTabs = toolTabs.slice(MAX_VISIBLE_TABS);
    const hasOverflow = overflowTabs.length > 0;

    return (
        <>
        <div className={`m-shell${insideTool ? ' m-shell--tool' : ''}`}>
            <header className={`m-topbar${insideTool ? ' m-topbar--tool' : ''}`}>
                {insideTool ? (
                    <>
                        <button
                            type="button"
                            className="m-topbar__back"
                            onClick={() => navigate('/dashboard')}
                            aria-label="Torna alla dashboard"
                        >
                            ‹ AEA
                        </button>
                        <div className="m-topbar__center">
                            <div className="m-topbar__title">{pageLabel}</div>
                            <div className="m-topbar__sub">AEA Consulenze Alimentari</div>
                        </div>
                        <button
                            type="button"
                            className="m-topbar__avatar"
                            onClick={() => setLogoutOpen(true)}
                            aria-label="Logout"
                        >
                            {initials}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            className="m-topbar__logo"
                            onClick={() => navigate('/dashboard')}
                            aria-label="Torna agli strumenti"
                        >
                            AEA
                        </button>
                        <div className="m-topbar__title-wrap">
                            <div className="m-topbar__title">{pageLabel}</div>
                        </div>
                        <button
                            type="button"
                            className="m-topbar__avatar"
                            onClick={() => setLogoutOpen(true)}
                            aria-label="Logout"
                        >
                            {initials}
                        </button>
                    </>
                )}
            </header>

            <div className={`m-page${insideTool ? ' m-page--tool' : ''}`}>
                <Outlet />
            </div>

            {!insideTool && (
            <nav className="m-tabbar" aria-label="Navigazione principale">
                {/* Home always first */}
                <NavLink
                    to="/dashboard"
                    end
                    className={({ isActive }) =>
                        `m-tabbar__item${isActive ? ' m-tabbar__item--active' : ''}`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <div className={`m-tabbar__dot${isActive ? ' m-tabbar__dot--active' : ''}`} />
                            <div className={`m-tabbar__icon${isActive ? ' m-tabbar__icon--active' : ''}`}>
                                <Home size={20} />
                            </div>
                            <span className={`m-tabbar__label${isActive ? ' m-tabbar__label--active' : ''}`}>
                                Home
                            </span>
                        </>
                    )}
                </NavLink>

                {/* First MAX_VISIBLE_TABS tools */}
                {visibleTabs.map(tab => (
                    <NavLink
                        key={tab.key}
                        to={tab.to}
                        className={({ isActive }) =>
                            `m-tabbar__item${isActive ? ' m-tabbar__item--active' : ''}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`m-tabbar__dot${isActive ? ' m-tabbar__dot--active' : ''}`} />
                                <div className={`m-tabbar__icon${isActive ? ' m-tabbar__icon--active' : ''}`}>
                                    {tab.icon}
                                </div>
                                <span className={`m-tabbar__label${isActive ? ' m-tabbar__label--active' : ''}`}>
                                    {tab.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}

                {/* "Altri" button — only when overflow exists */}
                {hasOverflow && (
                    <button
                        type="button"
                        className={`m-tabbar__item${drawerOpen ? ' m-tabbar__item--active' : ''}`}
                        onClick={() => setDrawerOpen(o => !o)}
                        aria-label="Altri strumenti"
                        aria-expanded={drawerOpen}
                        aria-haspopup="dialog"
                    >
                        <div className={`m-tabbar__dot${drawerOpen ? ' m-tabbar__dot--active' : ''}`} />
                        <div className={`m-tabbar__icon${drawerOpen ? ' m-tabbar__icon--active' : ''}`}>
                            <MoreHorizontal size={20} />
                        </div>
                        <span className={`m-tabbar__label${drawerOpen ? ' m-tabbar__label--active' : ''}`}>
                            Altri
                        </span>
                    </button>
                )}
            </nav>
            )}
        </div>

        {/* ── Overflow tool drawer ── */}
        {drawerOpen && !insideTool && (
            <>
                {/* Backdrop */}
                <div
                    className="m-drawer-backdrop"
                    onClick={() => setDrawerOpen(false)}
                    aria-hidden="true"
                />
                {/* Sheet */}
                <div
                    className="m-drawer"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Altri strumenti"
                >
                    <div className="m-drawer__header">
                        <span className="m-drawer__title">Altri strumenti</span>
                        <button
                            type="button"
                            className="m-drawer__close"
                            onClick={() => setDrawerOpen(false)}
                            aria-label="Chiudi"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="m-drawer__list">
                        {overflowTabs.map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                className="m-drawer__item"
                                onClick={() => { navigate(tab.to); setDrawerOpen(false); }}
                            >
                                <span className="m-drawer__item-icon">{tab.icon}</span>
                                <span className="m-drawer__item-label">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </>
        )}

        <ConfirmDialog
            open={logoutOpen}
            title="Esci dall'account"
            message="Vuoi davvero uscire? La sessione corrente verrà terminata."
            confirmLabel="Esci"
            cancelLabel="Annulla"
            variant="warning"
            onConfirm={handleLogout}
            onCancel={() => setLogoutOpen(false)}
        />
        </>
    );
}
