import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    Home, Salad, Tag, Wine, Package,
    Thermometer, FileText, Settings2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
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

interface MobileShellProps {
    pageLabel?: string;
    insideTool?: boolean;
}

export function MobileShell({ pageLabel = 'Dashboard', insideTool = false }: MobileShellProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const initials = user
        ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    const toolTabs = (user?.purchasedTools ?? []).map(toolId => ({
        to: `/tool/${toolId}`,
        icon: TAB_ICONS[toolId],
        label: TAB_LABELS[toolId],
        key: toolId,
    }));

    return (
        <div className="m-shell">
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
                            onClick={logout}
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
                            onClick={logout}
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

                {toolTabs.map(tab => (
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
            </nav>
            )}
        </div>
    );
}
