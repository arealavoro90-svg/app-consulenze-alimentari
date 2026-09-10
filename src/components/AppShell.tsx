import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileShell } from './MobileShell';
import { NotificationBell } from './NotificationBell';
import { useMobile } from '../hooks/useMobile';
import { AlignJustify } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
    '/dashboard':                'Dashboard',
    '/risorse':                  'Links e Risorse',
    '/tool/nutrizionale':        'Tabelle Nutrizionali',
    '/tool/etichette':           'Etichette Alimentari',
    '/tool/etichette-vini':      'Etichette Vini',
    '/tool/rintracciabilita':    'Rintracciabilità',
    '/tool/trattamento-termico': 'Trattamento Termico',
    '/tool/schede-complete':     'Schede Complete',
    '/tool/scheda-processo':     'Scheda di Processo',
};

export function AppShell() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const isMobile = useMobile();
    const pageLabel = ROUTE_LABELS[location.pathname] ?? 'Portale';

    useEffect(() => {
        const label = ROUTE_LABELS[location.pathname];
        document.title = label
            ? `${label} — AEA Consulenze`
            : 'AEA Consulenze Alimentari — Portale Clienti';
    }, [location.pathname]);

    if (isMobile) {
        const insideTool = location.pathname.startsWith('/tool/');
        return <MobileShell pageLabel={pageLabel} insideTool={insideTool} />;
    }

    return (
        <div className={`app-shell${sidebarOpen ? ' sidebar-open' : ''}`}>
            <div
                className="sidebar-backdrop"
                onClick={() => setSidebarOpen(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') setSidebarOpen(false); }}
                role="presentation"
                aria-hidden="true"
            />

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="topbar">
                    <div className="topbar-left">
                        <button
                            type="button"
                            className="hamburger-btn"
                            onClick={() => setSidebarOpen(o => !o)}
                            aria-label="Apri menu"
                        >
                            <AlignJustify size={18} />
                        </button>
                        <div id="topbar-title-slot" className="topbar-title-portal" />
                        <Link to="/dashboard" className="topbar-breadcrumb-parent topbar-breadcrumb-fallback">Strumenti</Link>
                        <span className="topbar-breadcrumb-sep topbar-breadcrumb-fallback">/</span>
                        <span className="topbar-breadcrumb-current topbar-breadcrumb-fallback">{pageLabel}</span>
                    </div>

                    <div className="topbar-right">
                        <NotificationBell />
                        <div id="topbar-mode-toggle-slot" />
                        <div id="topbar-actions-slot" />
                    </div>
                </div>

                <Outlet />

                {/* ponytail: disclaimer legale globale — QW-2 audit 2026-09-07 */}
                <footer style={{
                    padding: '10px 24px',
                    borderTop: '1px solid var(--color-border)',
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    textAlign: 'center',
                    lineHeight: 1.5,
                }}>
                    I dati prodotti da questo strumento hanno scopo informativo e di supporto professionale.
                    AEA Consulenze Alimentari non risponde di errori od omissioni nei documenti finali.
                    La responsabilità della correttezza delle etichette e delle dichiarazioni nutrizionali rimane in capo al produttore.
                </footer>
            </main>
        </div>
    );
}
