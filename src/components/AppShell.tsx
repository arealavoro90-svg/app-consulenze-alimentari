import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileShell } from './MobileShell';
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

    if (isMobile) {
        return <MobileShell />;
    }

    const pageLabel = ROUTE_LABELS[location.pathname] ?? 'Portale';

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
                        <span className="topbar-breadcrumb-parent topbar-breadcrumb-fallback">Strumenti</span>
                        <span className="topbar-breadcrumb-sep topbar-breadcrumb-fallback">/</span>
                        <span className="topbar-breadcrumb-current topbar-breadcrumb-fallback">{pageLabel}</span>
                    </div>

                    <div className="topbar-right">
                        <div id="topbar-mode-toggle-slot" />
                        <div id="topbar-actions-slot" />
                    </div>
                </div>

                <Outlet />
            </main>
        </div>
    );
}
