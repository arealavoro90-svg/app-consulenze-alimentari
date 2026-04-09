import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppShell() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className={`app-shell${sidebarOpen ? ' sidebar-open' : ''}`}>
            {/* Backdrop mobile */}
            <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />

            {/* Hamburger mobile */}
            <button
                className="hamburger-btn"
                onClick={() => setSidebarOpen(o => !o)}
                aria-label="Apri menu"
            >
                ☰
            </button>

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
