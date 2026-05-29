import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AlignJustify, Archive, Plus } from 'lucide-react';

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

    const pageLabel = ROUTE_LABELS[location.pathname] ?? 'Portale';
    const isNutrizionale = location.pathname === '/tool/nutrizionale';

    return (
        <div className={`app-shell${sidebarOpen ? ' sidebar-open' : ''}`}>
            {/* Backdrop mobile */}
            <div
                    className="sidebar-backdrop"
                    onClick={() => setSidebarOpen(false)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setSidebarOpen(false); }}
                    role="presentation"
                    aria-hidden="true"
                />

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Topbar */}
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
                        <span className="topbar-breadcrumb-parent">Strumenti</span>
                        <span className="topbar-breadcrumb-sep">/</span>
                        <span className="topbar-breadcrumb-current">{pageLabel}</span>
                    </div>

                    <div className="topbar-right">
                        <div id="topbar-mode-toggle-slot" />
                        {isNutrizionale && (
                            <>
                                <button type="button" className="topbar-btn-ghost">
                                    <Archive size={13} />
                                    Archivio
                                </button>
                                <button type="button" className="topbar-btn-primary">
                                    <Plus size={13} />
                                    Nuova Ricetta
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <Outlet />
            </main>
        </div>
    );
}
