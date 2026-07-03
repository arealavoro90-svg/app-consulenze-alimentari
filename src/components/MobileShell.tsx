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
                    onClick={() => navigate('/dashboard')}
                    aria-label="Torna agli strumenti"
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 0, textAlign: 'left',
                    }}
                >
                    <div className="m-topbar__title">{isHome ? 'AEA' : 'AEA ←'}</div>
                    <div className="m-topbar__sub">{pageLabel}</div>
                </button>
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
