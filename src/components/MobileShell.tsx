import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function MobileShell() {
    const { user, logout } = useAuth();

    const initials = user
        ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    return (
        <div className="m-shell">
            <header className="m-topbar">
                <div>
                    <div className="m-topbar__title">AEA</div>
                    <div className="m-topbar__sub">Portale Clienti</div>
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
