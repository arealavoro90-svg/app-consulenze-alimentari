import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface MobileShellProps {
    pageLabel?: string;
}

export function MobileShell({ pageLabel = 'Dashboard' }: MobileShellProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isHome = pageLabel === 'Dashboard';

    const initials = user
        ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    return (
        <div className="m-shell">
            <header className="m-topbar">
                <button
                    type="button"
                    className="m-topbar__logo"
                    onClick={() => navigate('/dashboard')}
                    aria-label="Torna agli strumenti"
                >
                    {isHome ? 'AEA' : '← AEA'}
                </button>
                <div className="m-topbar__title-wrap">
                    <div className="m-topbar__title">{pageLabel}</div>
                </div>
                <button
                    type="button"
                    className="m-topbar__avatar"
                    onClick={logout}
                    aria-label="Logout"
                    title={`${user?.name ?? ''} — tocca per uscire`}
                >
                    {initials}
                </button>
            </header>

            <div className="m-page">
                <Outlet />
            </div>
        </div>
    );
}
