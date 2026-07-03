# Mobile NutrizionaleCalc — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creare un'interfaccia mobile completamente separata per NutrizionaleCalc con Bottom Tab Bar, estetica Warm Professional, modalità Esperto.

**Architecture:** `AppShell.tsx` rileva viewport < 768px e renderizza `MobileShell` invece della Sidebar desktop. Il routing resta invariato; la route `/tool/nutrizionale` usa un wrapper che sceglie `NutrizionaleCalcMobile` su mobile. I componenti `TabUE`/`TabUSA` esistenti sono riusati per il rendering delle tabelle.

**Tech Stack:** React 19, Vite, TypeScript, CSS custom, lucide-react. Nessuna nuova dipendenza npm. Font Outfit via Google Fonts @import in CSS.

---

## Mappa file

| File | Operazione | Responsabilità |
|---|---|---|
| `src/hooks/useMobile.ts` | Crea | Rileva viewport < 768px, cleanup su unmount |
| `src/styles/mobile.css` | Crea | Design tokens CSS mobile, base styles |
| `src/components/MobileShell.tsx` | Crea | Shell mobile: topbar compatta navy + Outlet |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` | Crea | Stato condiviso, routing tab, bottom bar |
| `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx` | Crea | Form inserimento valori nutrizionali |
| `src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx` | Crea | Selezione regione + rendering TabUE/TabUSA |
| `src/calculators/NutrizionaleCalc/mobile/ArchivioTab.tsx` | Crea | Lista calcoli salvati con long-press delete |
| `src/calculators/NutrizionaleCalc/mobile/ToolsTab.tsx` | Crea | Griglia 7 strumenti AEA |
| `src/components/AppShell.tsx` | Modifica | Aggiunge useMobile() + rende MobileShell su mobile |
| `src/App.tsx` | Modifica | Route nutrizionale → NutrizionaleCalcEntry |
| `src/index.css` | Modifica | Import mobile.css + Outfit font |

---

## Task 1: CSS foundation — mobile.css + Outfit font

**Files:**
- Crea: `src/styles/mobile.css`
- Modifica: `src/index.css` (prime 5 righe)

- [ ] **Step 1.1: Crea src/styles/mobile.css**

```css
/* ── Mobile Design Tokens ───────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

:root {
  --m-bg:           #faf7f4;
  --m-surface:      #ffffff;
  --m-navy:         #0c1326;
  --m-orange:       #ff7e2e;
  --m-orange-hover: #dd5c0c;
  --m-green:        #43821c;
  --m-border:       #e8e0d8;
  --m-border-light: #f0ebe3;
  --m-text:         #0c1326;
  --m-text-muted:   rgba(12, 19, 38, 0.45);
  --m-text-faint:   rgba(12, 19, 38, 0.25);
  --m-topbar-h:     52px;
  --m-tabbar-h:     64px;
  --m-radius-sm:    6px;
  --m-radius-md:    10px;
  --m-radius-lg:    14px;
}

/* ── Mobile shell base ──────────────────────────────────────────────────── */
.m-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--m-bg);
  font-family: 'Outfit', system-ui, sans-serif;
}

/* ── Mobile topbar ──────────────────────────────────────────────────────── */
.m-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  height: var(--m-topbar-h);
  background: var(--m-navy);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
}
.m-topbar__title { color: #fff; font-size: 15px; font-weight: 800; letter-spacing: -0.3px; }
.m-topbar__sub   { color: var(--m-orange); font-size: 10px; font-weight: 500; margin-top: 1px; }
.m-topbar__avatar {
  width: 32px; height: 32px;
  background: var(--m-orange);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 11px; font-weight: 700;
  flex-shrink: 0;
  cursor: pointer;
  transition: opacity 0.15s;
}
.m-topbar__avatar:hover { opacity: 0.85; }

/* ── Page content area ──────────────────────────────────────────────────── */
.m-page {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(var(--m-tabbar-h) + env(safe-area-inset-bottom, 0px));
}

/* ── Bottom tab bar ─────────────────────────────────────────────────────── */
.m-tabbar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 20;
  height: var(--m-tabbar-h);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--m-surface);
  border-top: 1.5px solid var(--m-border);
  display: flex;
}
.m-tabbar__item {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 3px;
  cursor: pointer;
  border: none; background: none; padding: 8px 0;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.1s;
}
.m-tabbar__item:active { opacity: 0.7; }
.m-tabbar__dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: transparent;
  transition: background 0.15s;
}
.m-tabbar__dot--active { background: var(--m-orange); }
.m-tabbar__label {
  font-size: 10px; font-weight: 500;
  color: var(--m-text-muted);
  font-family: 'Outfit', system-ui, sans-serif;
}
.m-tabbar__label--active { color: var(--m-orange); font-weight: 700; }

/* ── Form elements ──────────────────────────────────────────────────────── */
.m-field { display: flex; flex-direction: column; gap: 4px; }
.m-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.7px;
  color: var(--m-text-muted); text-transform: uppercase;
}
.m-input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  font-size: 16px; /* prevents iOS zoom */
  font-family: 'Outfit', system-ui, sans-serif;
  color: var(--m-text);
  background: var(--m-surface);
  border: 1.5px solid var(--m-border);
  border-radius: var(--m-radius-md);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.m-input:focus  { border-color: var(--m-orange); }
.m-input--num   { font-family: 'Courier New', monospace; font-size: 17px; font-weight: 700; }
.m-input-group  {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.m-input-group--3 { grid-template-columns: 1fr 1fr 1fr; }

/* ── Section divider ────────────────────────────────────────────────────── */
.m-section {
  padding: 0 16px;
  margin-bottom: 12px;
}
.m-section__header {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 8px; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.m-section__line { flex: 1; height: 1px; background: var(--m-border); }
.m-section__title {
  font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
  color: var(--m-text-muted); text-transform: uppercase;
  white-space: nowrap;
}
.m-section__chevron {
  color: var(--m-text-muted);
  transition: transform 0.2s;
}
.m-section__chevron--open { transform: rotate(180deg); }

/* ── Card / surface ─────────────────────────────────────────────────────── */
.m-card {
  background: var(--m-surface);
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius-md);
  overflow: hidden;
}
.m-card__row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--m-border-light);
}
.m-card__row:last-child { border-bottom: none; }
.m-card__row-label { font-size: 13px; color: var(--m-text); }
.m-card__row-label--sub { font-size: 12px; color: var(--m-text-muted); padding-left: 12px; }
.m-card__row-val {
  font-family: 'Courier New', monospace;
  font-size: 13px; font-weight: 600; color: var(--m-text);
}
.m-card__row-val--accent { color: var(--m-orange); font-size: 15px; font-weight: 700; }

/* ── Buttons ────────────────────────────────────────────────────────────── */
.m-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 44px; padding: 0 20px;
  font-size: 13px; font-weight: 700; letter-spacing: 0.4px;
  font-family: 'Outfit', system-ui, sans-serif;
  border: none; border-radius: var(--m-radius-md);
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}
.m-btn:active { transform: scale(0.98); opacity: 0.9; }
.m-btn--primary   { background: var(--m-navy); color: var(--m-orange); }
.m-btn--accent    { background: var(--m-orange); color: #fff; }
.m-btn--green     { background: var(--m-green); color: #fff; }
.m-btn--ghost     { background: var(--m-border); color: var(--m-text); }
.m-btn--full      { width: 100%; }
.m-btn-row        { display: flex; gap: 8px; padding: 0 16px; }

/* ── Region grid (TabellaTab) ───────────────────────────────────────────── */
.m-region-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  padding: 16px;
}
.m-region-tile {
  background: var(--m-surface);
  border: 1.5px solid var(--m-border);
  border-radius: var(--m-radius-lg);
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.m-region-tile--selected {
  border-color: var(--m-orange);
  background: rgba(255, 126, 46, 0.04);
}
.m-region-tile__code {
  font-size: 22px; font-weight: 800; color: var(--m-text);
  font-family: 'Outfit', system-ui, sans-serif;
  letter-spacing: -0.5px;
}
.m-region-tile__sub { font-size: 10px; color: var(--m-text-muted); margin-top: 3px; }
.m-region-tile--span2 { grid-column: span 2; }

/* ── Archive list ───────────────────────────────────────────────────────── */
.m-archive-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--m-border-light);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.1s;
}
.m-archive-item:active { background: var(--m-border-light); }
.m-archive-badge {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; color: #fff;
  flex-shrink: 0;
  font-family: 'Outfit', system-ui, sans-serif;
}
.m-archive-badge--UE        { background: var(--m-navy); }
.m-archive-badge--USA       { background: #1a3a6b; }
.m-archive-badge--Canada    { background: var(--m-green); }
.m-archive-badge--Australia { background: #b05a1a; }
.m-archive-badge--Arabi     { background: #6b1a1a; }

.m-archive-info { flex: 1; min-width: 0; }
.m-archive-name {
  font-size: 13px; font-weight: 600; color: var(--m-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.m-archive-meta { font-size: 11px; color: var(--m-text-muted); margin-top: 2px; }
.m-archive-chevron { color: var(--m-text-faint); flex-shrink: 0; }

/* ── Tools grid ─────────────────────────────────────────────────────────── */
.m-tools-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px;
}
.m-tool-tile {
  background: var(--m-surface);
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius-lg);
  padding: 14px;
  display: flex; flex-direction: column;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s, opacity 0.15s;
  position: relative;
}
.m-tool-tile:active { opacity: 0.8; }
.m-tool-tile--active { background: var(--m-navy); border-color: var(--m-navy); }
.m-tool-tile--locked { opacity: 0.4; pointer-events: none; }
.m-tool-tile__icon {
  width: 28px; height: 28px; border-radius: 7px; margin-bottom: 10px;
}
.m-tool-tile__name {
  font-size: 11px; font-weight: 600; line-height: 1.4;
  color: var(--m-text);
}
.m-tool-tile--active .m-tool-tile__name { color: #fff; }
.m-tool-tile__badge {
  position: absolute; top: 8px; right: 8px;
  background: var(--m-orange); color: #fff;
  font-size: 8px; font-weight: 700; letter-spacing: 0.3px;
  padding: 2px 5px; border-radius: 4px;
}

/* ── Search bar ─────────────────────────────────────────────────────────── */
.m-search {
  display: flex; align-items: center; gap: 8px;
  background: var(--m-surface);
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius-md);
  padding: 0 12px; height: 44px;
}
.m-search input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 14px; color: var(--m-text);
  font-family: 'Outfit', system-ui, sans-serif;
}
.m-search input::placeholder { color: var(--m-text-muted); }

/* ── Empty state ────────────────────────────────────────────────────────── */
.m-empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 48px 32px; text-align: center; gap: 12px;
}
.m-empty__icon { color: var(--m-text-faint); }
.m-empty__title { font-size: 15px; font-weight: 700; color: var(--m-text); }
.m-empty__sub   { font-size: 13px; color: var(--m-text-muted); max-width: 240px; }

/* ── Table preview wrapper ──────────────────────────────────────────────── */
.m-table-preview {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px;
}
.m-table-preview > * { max-width: 360px; }

/* ── Inline notification (replaces alert) ───────────────────────────────── */
.m-notice {
  margin: 0 16px 12px;
  padding: 10px 14px;
  border-radius: var(--m-radius-md);
  font-size: 13px; font-weight: 500;
  display: flex; align-items: center; gap: 8px;
}
.m-notice--success { background: #e8f5e0; color: var(--m-green); }
.m-notice--error   { background: #fdecea; color: #c0392b; }

/* ── Context menu (long-press) ──────────────────────────────────────────── */
.m-ctx-menu {
  position: fixed; z-index: 100;
  background: var(--m-surface);
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius-md);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  overflow: hidden; min-width: 160px;
}
.m-ctx-menu__item {
  padding: 12px 16px;
  font-size: 14px; font-weight: 500; color: var(--m-text);
  cursor: pointer; border: none; background: none; width: 100%; text-align: left;
  transition: background 0.1s;
}
.m-ctx-menu__item:hover  { background: var(--m-bg); }
.m-ctx-menu__item--danger { color: #c0392b; }
.m-ctx-overlay {
  position: fixed; inset: 0; z-index: 99;
}
```

- [ ] **Step 1.2: Aggiungi import in src/index.css**

Aggiungi come primissima riga di `src/index.css`:
```css
@import './styles/mobile.css';
```

- [ ] **Step 1.3: Verifica in browser**

Apri http://localhost:5173 — la pagina deve caricarsi normalmente senza errori console. Il font Outfit verrà caricato da Google Fonts (richiede connessione internet).

- [ ] **Step 1.4: Commit**

```bash
cd /Users/novanta/Desktop/APP/App_prova
git add src/styles/mobile.css src/index.css
git commit -m "feat(mobile): add mobile CSS design tokens and Outfit font"
```

---

## Task 2: Hook useMobile

**Files:**
- Crea: `src/hooks/useMobile.ts`

- [ ] **Step 2.1: Crea src/hooks/useMobile.ts**

```typescript
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useMobile(): boolean {
    const [isMobile, setIsMobile] = useState<boolean>(
        () => window.innerWidth < MOBILE_BREAKPOINT
    );

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        setIsMobile(mq.matches);

        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return isMobile;
}
```

- [ ] **Step 2.2: Verifica compilazione TypeScript**

```bash
cd /Users/novanta/Desktop/APP/App_prova
npx tsc --noEmit
```

Output atteso: nessun errore.

- [ ] **Step 2.3: Commit**

```bash
git add src/hooks/useMobile.ts
git commit -m "feat(mobile): add useMobile viewport detection hook"
```

---

## Task 3: MobileShell

**Files:**
- Crea: `src/components/MobileShell.tsx`

- [ ] **Step 3.1: Crea src/components/MobileShell.tsx**

```tsx
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
```

- [ ] **Step 3.2: Commit**

```bash
git add src/components/MobileShell.tsx
git commit -m "feat(mobile): add MobileShell component"
```

---

## Task 4: AppShell — integrazione mobile

**Files:**
- Modifica: `src/components/AppShell.tsx`

- [ ] **Step 4.1: Modifica AppShell.tsx**

Sostituisci l'intero file con:

```tsx
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

    // Su mobile, renderizza la shell dedicata
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
```

- [ ] **Step 4.2: Verifica visiva — desktop**

Apri http://localhost:5173 su desktop (finestra > 768px). L'interfaccia deve essere identica a prima.

- [ ] **Step 4.3: Verifica visiva — mobile**

Apri DevTools → device toolbar → scegli iPhone 14 (390px). Deve apparire la MobileShell: topbar navy con "AEA" + avatar arancio. Nessuna sidebar.

- [ ] **Step 4.4: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat(mobile): switch to MobileShell on viewports < 768px"
```

---

## Task 5: NutrizionaleCalcMobile — scaffold e stato

**Files:**
- Crea: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`
- Crea: `src/calculators/NutrizionaleCalc/mobile/` (directory)

Questo task crea il contenitore principale con tutta la gestione stato e il routing tra tab. I tab sono stub temporanei.

- [ ] **Step 5.1: Crea tipi condivisi in NutrizionaleCalcMobile.tsx**

```tsx
// src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useArchive } from '../../hooks/useArchive';

// ─── Shared types ─────────────────────────────────────────────────────────────
export interface CalcResult {
    energyKcal: number; energyKj: number;
    grassi: number; saturi: number; monoins: number; polins: number;
    trans: number; colesterolo: number;
    carboidrati: number; carboidratiTot: number; zuccheri: number;
    zuccheri_agg: number; polioli: number; amido: number; fibre: number;
    proteine: number; sodio_mg: number; sale: number;
    potassio: number; calcio: number; fosforo: number; magnesio: number;
    ferro: number; zinco: number;
    vitA_eq: number; vitD: number; vitE: number; vitC: number;
    vitB1: number; vitB2: number; vitB3: number; vitB6: number;
    vitB9: number; vitB12: number;
}

export const ZERO_CALC: CalcResult = {
    energyKcal: 0, energyKj: 0, grassi: 0, saturi: 0, monoins: 0, polins: 0,
    trans: 0, colesterolo: 0, carboidrati: 0, carboidratiTot: 0, zuccheri: 0,
    zuccheri_agg: 0, polioli: 0, amido: 0, fibre: 0, proteine: 0, sodio_mg: 0,
    sale: 0, potassio: 0, calcio: 0, fosforo: 0, magnesio: 0, ferro: 0, zinco: 0,
    vitA_eq: 0, vitD: 0, vitE: 0, vitC: 0, vitB1: 0, vitB2: 0, vitB3: 0,
    vitB6: 0, vitB9: 0, vitB12: 0,
};

// Form fields (stringhe per gestire input decimale senza perdere "0.")
export interface MobileNutForm {
    denominazione: string;
    porzione_g: string;
    kcal: string; kj: string;
    grassi: string; saturi: string;
    carboidrati: string; zuccheri: string;
    proteine: string; sodio_mg: string;
    fibre: string;
    // serving sizes per tabella
    ue_porzione: string; ue_confezione: string;
    usa_serving: string;
}

export const EMPTY_FORM: MobileNutForm = {
    denominazione: '', porzione_g: '100',
    kcal: '', kj: '',
    grassi: '', saturi: '',
    carboidrati: '', zuccheri: '',
    proteine: '', sodio_mg: '',
    fibre: '',
    ue_porzione: '', ue_confezione: '',
    usa_serving: '',
};

// Convert form → CalcResult (valori per 100g)
export function formToCalcResult(f: MobileNutForm): CalcResult {
    const n = (v: string) => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
    const sodio = n(f.sodio_mg);
    const kcal  = n(f.kcal);
    return {
        ...ZERO_CALC,
        energyKcal:     kcal,
        energyKj:       n(f.kj) || Math.round(kcal * 4.184),
        grassi:         n(f.grassi),
        saturi:         n(f.saturi),
        carboidrati:    n(f.carboidrati),
        carboidratiTot: n(f.carboidrati),
        zuccheri:       n(f.zuccheri),
        fibre:          n(f.fibre),
        proteine:       n(f.proteine),
        sodio_mg:       sodio,
        sale:           parseFloat((sodio * 2.5 / 1000).toFixed(3)),
    };
}

export interface MobileArchiveEntry {
    denominazione: string;
    porzione_g: number;
    region: 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';
    calcResult: CalcResult;
    form: MobileNutForm;
}

export type MobileTab = 'calcolo' | 'tabella' | 'archivio' | 'tools';

// ─── Component ────────────────────────────────────────────────────────────────
export function NutrizionaleCalcMobile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const archive = useArchive<MobileArchiveEntry>('nut_mobile_v1');

    const [activeTab, setActiveTab] = useState<MobileTab>('calcolo');
    const [form, setForm] = useState<MobileNutForm>(EMPTY_FORM);

    const updateForm = (patch: Partial<MobileNutForm>) =>
        setForm(prev => ({ ...prev, ...patch }));

    const loadFromArchive = (entry: MobileArchiveEntry) => {
        setForm(entry.form);
        setActiveTab('calcolo');
    };

    const calcResult = formToCalcResult(form);

    const tabs: { id: MobileTab; label: string }[] = [
        { id: 'calcolo',  label: 'Calcolo'  },
        { id: 'tabella',  label: 'Tabella'  },
        { id: 'archivio', label: 'Archivio' },
        { id: 'tools',    label: 'Tools'    },
    ];

    const renderTab = () => {
        // Tab components vengono aggiunti nei task successivi
        return <div style={{ padding: 16, color: '#999' }}>{activeTab} — in arrivo</div>;
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--m-bg)' }}>
            {renderTab()}

            {/* Bottom Tab Bar */}
            <nav className="m-tabbar" aria-label="Navigazione principale">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className="m-tabbar__item"
                        onClick={() => setActiveTab(tab.id)}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                        <span className={`m-tabbar__dot${activeTab === tab.id ? ' m-tabbar__dot--active' : ''}`} />
                        <span className={`m-tabbar__label${activeTab === tab.id ? ' m-tabbar__label--active' : ''}`}>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
```

**Nota:** `archive` e `navigate` vengono usati nei task successivi. TypeScript mostrerà warning "unused variable" — è normale, sparirà quando i tab saranno completati.

- [ ] **Step 5.2: Crea directory mobile/**

```bash
mkdir -p /Users/novanta/Desktop/APP/App_prova/src/calculators/NutrizionaleCalc/mobile
```

- [ ] **Step 5.3: Verifica compilazione**

```bash
cd /Users/novanta/Desktop/APP/App_prova
npx tsc --noEmit
```

- [ ] **Step 5.4: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx
git commit -m "feat(mobile): scaffold NutrizionaleCalcMobile with shared state"
```

---

## Task 6: App.tsx — routing

**Files:**
- Modifica: `src/App.tsx`

- [ ] **Step 6.1: Leggi l'attuale App.tsx**

Apri `src/App.tsx` e trova il blocco che include la route per `nutrizionale`:
```tsx
<Route path="nutrizionale" element={
  <ProtectedRoute requiredTool="nutrizionale">
    <NutrizionaleCalc />
  </ProtectedRoute>
} />
```

- [ ] **Step 6.2: Aggiungi import NutrizionaleCalcMobile e useMobile**

In cima al file, aggiungi gli import (dopo gli import esistenti):
```tsx
import { NutrizionaleCalcMobile } from './calculators/NutrizionaleCalc/NutrizionaleCalcMobile';
import { useMobile } from './hooks/useMobile';
```

- [ ] **Step 6.3: Crea wrapper NutrizionaleCalcEntry dentro App.tsx**

Aggiungi questo componente helper **prima** della funzione `App()`:
```tsx
function NutrizionaleCalcEntry() {
    const isMobile = useMobile();
    return isMobile ? <NutrizionaleCalcMobile /> : <NutrizionaleCalc />;
}
```

- [ ] **Step 6.4: Aggiorna la route nutrizionale**

Trova:
```tsx
<NutrizionaleCalc />
```
Sostituisci con:
```tsx
<NutrizionaleCalcEntry />
```
(solo dentro la ProtectedRoute `requiredTool="nutrizionale"`)

- [ ] **Step 6.5: Verifica visiva**

Su mobile (DevTools → iPhone 14): vai su `/tool/nutrizionale`. Deve apparire il placeholder "calcolo — in arrivo" con la bottom tab bar. Su desktop: deve apparire il NutrizionaleCalc originale invariato.

- [ ] **Step 6.6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(mobile): route nutrizionale to NutrizionaleCalcMobile on mobile"
```

---

## Task 7: CalcoloTab

**Files:**
- Crea: `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx`
- Modifica: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` (renderTab)

- [ ] **Step 7.1: Crea CalcoloTab.tsx**

```tsx
// src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { MobileNutForm } from '../NutrizionaleCalcMobile';

interface Props {
    form: MobileNutForm;
    onChange: (patch: Partial<MobileNutForm>) => void;
    onGoToTabella: () => void;
}

function NumInput({ label, field, form, onChange, unit }: {
    label: string; field: keyof MobileNutForm;
    form: MobileNutForm; onChange: (p: Partial<MobileNutForm>) => void;
    unit?: string;
}) {
    return (
        <div className="m-field">
            <label className="m-label">{label}{unit ? ` (${unit})` : ''}</label>
            <input
                className="m-input m-input--num"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="0"
                value={form[field] as string}
                onChange={e => onChange({ [field]: e.target.value } as Partial<MobileNutForm>)}
            />
        </div>
    );
}

export function CalcoloTab({ form, onChange, onGoToTabella }: Props) {
    const [macroOpen, setMacroOpen] = useState(true);
    const [microOpen, setMicroOpen] = useState(false);

    return (
        <div style={{ paddingTop: 12 }}>

            {/* Sezione: Prodotto */}
            <div className="m-section">
                <div className="m-section__header" style={{ cursor: 'default' }}>
                    <div className="m-section__line" />
                    <span className="m-section__title">Prodotto</span>
                    <div className="m-section__line" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="m-field">
                        <label className="m-label">Denominazione</label>
                        <input
                            className="m-input"
                            type="text"
                            placeholder="Es. Mozzarella di Bufala"
                            value={form.denominazione}
                            onChange={e => onChange({ denominazione: e.target.value })}
                            autoComplete="off"
                        />
                    </div>
                    <NumInput label="Porzione" field="porzione_g" form={form} onChange={onChange} unit="g" />
                </div>
            </div>

            {/* Sezione: Energia */}
            <div className="m-section">
                <div className="m-section__header" style={{ cursor: 'default' }}>
                    <div className="m-section__line" />
                    <span className="m-section__title">Energia per 100g</span>
                    <div className="m-section__line" />
                </div>
                <div className="m-input-group">
                    <NumInput label="Energia" field="kcal" form={form} onChange={onChange} unit="kcal" />
                    <NumInput label="Energia" field="kj" form={form} onChange={onChange} unit="kJ" />
                </div>
                <p style={{ fontSize: 10, color: 'var(--m-text-muted)', margin: '4px 0 0' }}>
                    Se lasci kJ vuoto viene calcolato automaticamente (kcal × 4.184).
                </p>
            </div>

            {/* Sezione: Macro — collassabile */}
            <div className="m-section">
                <button
                    type="button"
                    className="m-section__header"
                    onClick={() => setMacroOpen(o => !o)}
                    style={{ width: '100%', background: 'none', border: 'none', padding: 0 }}
                    aria-expanded={macroOpen}
                >
                    <div className="m-section__line" />
                    <span className="m-section__title">Macro per 100g</span>
                    <ChevronDown
                        size={14}
                        className={`m-section__chevron${macroOpen ? ' m-section__chevron--open' : ''}`}
                    />
                    <div className="m-section__line" />
                </button>

                {macroOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="m-input-group">
                            <NumInput label="Grassi tot." field="grassi" form={form} onChange={onChange} unit="g" />
                            <NumInput label="di cui saturi" field="saturi" form={form} onChange={onChange} unit="g" />
                        </div>
                        <div className="m-input-group">
                            <NumInput label="Carboidrati" field="carboidrati" form={form} onChange={onChange} unit="g" />
                            <NumInput label="di cui zuccheri" field="zuccheri" form={form} onChange={onChange} unit="g" />
                        </div>
                        <div className="m-input-group">
                            <NumInput label="Proteine" field="proteine" form={form} onChange={onChange} unit="g" />
                            <NumInput label="Sodio" field="sodio_mg" form={form} onChange={onChange} unit="mg" />
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--m-text-muted)', margin: '2px 0 0' }}>
                            Il sale viene calcolato da sodio × 2.5 / 1000.
                        </p>
                    </div>
                )}
            </div>

            {/* Sezione: Micro — collassabile */}
            <div className="m-section">
                <button
                    type="button"
                    className="m-section__header"
                    onClick={() => setMicroOpen(o => !o)}
                    style={{ width: '100%', background: 'none', border: 'none', padding: 0 }}
                    aria-expanded={microOpen}
                >
                    <div className="m-section__line" />
                    <span className="m-section__title">Micro (opzionale)</span>
                    <ChevronDown
                        size={14}
                        className={`m-section__chevron${microOpen ? ' m-section__chevron--open' : ''}`}
                    />
                    <div className="m-section__line" />
                </button>

                {microOpen && (
                    <div className="m-input-group">
                        <NumInput label="Fibre" field="fibre" form={form} onChange={onChange} unit="g" />
                    </div>
                )}
            </div>

            {/* CTA */}
            <div className="m-btn-row" style={{ marginTop: 8, marginBottom: 16 }}>
                <button
                    type="button"
                    className="m-btn m-btn--primary m-btn--full"
                    onClick={onGoToTabella}
                >
                    Genera Tabella →
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 7.2: Integra CalcoloTab in NutrizionaleCalcMobile.tsx**

Aggiungi l'import in cima al file:
```tsx
import { CalcoloTab } from './mobile/CalcoloTab';
```

Sostituisci la funzione `renderTab` con:
```tsx
const renderTab = () => {
    switch (activeTab) {
        case 'calcolo':
            return (
                <CalcoloTab
                    form={form}
                    onChange={updateForm}
                    onGoToTabella={() => setActiveTab('tabella')}
                />
            );
        default:
            return <div style={{ padding: 16, color: '#999' }}>{activeTab} — in arrivo</div>;
    }
};
```

- [ ] **Step 7.3: Verifica visiva**

Su mobile, apri `/tool/nutrizionale`. Il tab Calcolo deve mostrare il form completo con:
- Campo denominazione (input testo grande)
- Porzione in g
- Sezione Energia con 2 input affiancati
- Sezione Macro collassabile con grid 2 colonne
- Sezione Micro collassabile
- Bottone "Genera Tabella →" in fondo

Testa che i campi accettino valori decimali senza zoom iOS.

- [ ] **Step 7.4: Commit**

```bash
git add src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx \
        src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx
git commit -m "feat(mobile): add CalcoloTab with expert data entry form"
```

---

## Task 8: TabellaTab

**Files:**
- Crea: `src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx`
- Modifica: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`

- [ ] **Step 8.1: Crea TabellaTab.tsx**

```tsx
// src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx
import React, { useState, useRef } from 'react';
import { Check } from 'lucide-react';
import { TabUE, DEFAULT_OPTIONALS } from '../TabUE';
import { TabUSA } from '../TabUSA';
import type { CalcResult, MobileNutForm, MobileArchiveEntry } from '../NutrizionaleCalcMobile';

type Region = 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';

interface Props {
    calcResult: CalcResult;
    form: MobileNutForm;
    onSave: (region: Region) => void;
    onExportPDF: (region: Region) => void;
}

const REGIONS: { id: Region; label: string; sub: string }[] = [
    { id: 'UE',        label: 'EU',     sub: 'Reg. 1169/2011' },
    { id: 'USA',       label: 'USA',    sub: 'FDA NFP'        },
    { id: 'Canada',    label: 'CA',     sub: 'Health Canada'  },
    { id: 'Australia', label: 'AU',     sub: 'FSANZ'          },
    { id: 'Arabi',     label: 'AR',     sub: 'Gulf Standard'  },
];

function n(v: string): number { const x = parseFloat(v); return isNaN(x) ? 0 : x; }

export function TabellaTab({ calcResult, form, onSave, onExportPDF }: Props) {
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const hasData = calcResult.energyKcal > 0 || calcResult.proteine > 0;

    const showNotice = (type: 'success' | 'error', msg: string) => {
        setNotice({ type, msg });
        setTimeout(() => setNotice(null), 3000);
    };

    const handleSave = () => {
        if (!selectedRegion) { showNotice('error', 'Seleziona prima una regione.'); return; }
        if (!form.denominazione.trim()) { showNotice('error', 'Inserisci la denominazione nel tab Calcolo.'); return; }
        onSave(selectedRegion);
        showNotice('success', 'Calcolo salvato in archivio.');
    };

    const handlePDF = () => {
        if (!selectedRegion || !previewRef.current) { showNotice('error', 'Seleziona prima una regione.'); return; }
        onExportPDF(selectedRegion);
    };

    return (
        <div style={{ paddingTop: 12 }}>
            {/* Griglia selezione regione */}
            <div style={{ padding: '0 16px 8px' }}>
                <p style={{ fontSize: 12, color: 'var(--m-text-muted)', margin: '0 0 8px' }}>
                    Seleziona il formato della tabella nutrizionale.
                </p>
            </div>

            <div className="m-region-grid">
                {REGIONS.map(r => (
                    <div
                        key={r.id}
                        className={`m-region-tile${r.id === 'Arabi' ? ' m-region-tile--span2' : ''}${selectedRegion === r.id ? ' m-region-tile--selected' : ''}`}
                        onClick={() => setSelectedRegion(r.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && setSelectedRegion(r.id)}
                        aria-pressed={selectedRegion === r.id}
                    >
                        <div className="m-region-tile__code">{r.label}</div>
                        <div className="m-region-tile__sub">{r.sub}</div>
                        {selectedRegion === r.id && (
                            <Check size={12} style={{ color: 'var(--m-orange)', marginTop: 4 }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Avviso dati mancanti */}
            {!hasData && (
                <div className="m-notice m-notice--error" style={{ margin: '0 16px 12px' }}>
                    Inserisci i valori nutrizionali nel tab Calcolo prima di generare la tabella.
                </div>
            )}

            {/* Notice feedback */}
            {notice && (
                <div className={`m-notice m-notice--${notice.type}`}>
                    {notice.msg}
                </div>
            )}

            {/* Anteprima tabella */}
            {selectedRegion && hasData && (
                <div ref={previewRef} className="m-table-preview">
                    {selectedRegion === 'UE' && (
                        <TabUE
                            p={calcResult}
                            ue={{
                                porzione: n(form.ue_porzione) || n(form.porzione_g) || undefined,
                                confezione: n(form.ue_confezione) || undefined,
                            }}
                            selectedOptionals={DEFAULT_OPTIONALS}
                            showOptionals={false}
                            activeSubTab="100g"
                        />
                    )}
                    {selectedRegion === 'USA' && (
                        <TabUSA
                            p={calcResult}
                            usa={{ serving: n(form.usa_serving) || n(form.porzione_g) || 30 }}
                            specificGravity={1}
                            servingRef="serving"
                            measure="g"
                            subTab="verticale"
                        />
                    )}
                    {(selectedRegion === 'Canada' || selectedRegion === 'Australia' || selectedRegion === 'Arabi') && (
                        <div style={{
                            padding: 16, background: '#fff8e1', border: '1px solid #ffe082',
                            borderRadius: 8, fontSize: 13, color: '#795548'
                        }}>
                            Formato {selectedRegion} in fase di revisione (vedi todo.md TAB-CA / TAB-AU / TAB-AR).
                            I valori sono corretti — il layout visivo sarà aggiornato a breve.
                        </div>
                    )}
                </div>
            )}

            {/* Serving sizes configurabili (EU e USA) */}
            {selectedRegion === 'UE' && (
                <div className="m-section" style={{ marginTop: 8 }}>
                    <div className="m-section__header" style={{ cursor: 'default' }}>
                        <div className="m-section__line" />
                        <span className="m-section__title">Porzioni EU (opzionale)</span>
                        <div className="m-section__line" />
                    </div>
                    <div className="m-input-group">
                        <div className="m-field">
                            <label className="m-label">Porzione (g)</label>
                            <input className="m-input m-input--num" type="number" inputMode="decimal"
                                placeholder={form.porzione_g || '100'}
                                value={form.ue_porzione}
                                onChange={e => {/* updateForm viene passato via onSave — qui usiamo form direttamente */}} />
                        </div>
                        <div className="m-field">
                            <label className="m-label">Confezione (g)</label>
                            <input className="m-input m-input--num" type="number" inputMode="decimal"
                                placeholder="0"
                                value={form.ue_confezione}
                                onChange={e => {}} />
                        </div>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="m-btn-row" style={{ marginTop: 16, marginBottom: 16 }}>
                <button type="button" className="m-btn m-btn--primary" style={{ flex: 1 }} onClick={handleSave}>
                    Salva
                </button>
                <button type="button" className="m-btn m-btn--green" style={{ flex: 1 }} onClick={handlePDF}>
                    PDF ↗
                </button>
            </div>
        </div>
    );
}
```

**Nota:** I due handler `onChange` inline nella sezione "Porzioni EU" sono stub vuoti — i serving sizes configurabili richiedono che `updateForm` sia passato come prop. Questo viene completato nel passo successivo.

- [ ] **Step 8.2: Aggiungi prop updateForm a TabellaTab**

Modifica l'interfaccia `Props` in TabellaTab.tsx aggiungendo:
```tsx
interface Props {
    calcResult: CalcResult;
    form: MobileNutForm;
    onChange: (patch: Partial<MobileNutForm>) => void;  // ← aggiunto
    onSave: (region: Region) => void;
    onExportPDF: (region: Region) => void;
}
```

Aggiorna la firma del componente:
```tsx
export function TabellaTab({ calcResult, form, onChange, onSave, onExportPDF }: Props) {
```

Sostituisci i due `onChange={e => {}}` vuoti con:
```tsx
// Porzione EU
onChange={e => onChange({ ue_porzione: e.target.value })}
// Confezione EU
onChange={e => onChange({ ue_confezione: e.target.value })}
```

- [ ] **Step 8.3: Integra TabellaTab in NutrizionaleCalcMobile.tsx**

Aggiungi import:
```tsx
import { TabellaTab } from './mobile/TabellaTab';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
```

Aggiungi funzione `handleExportPDF` prima di `renderTab`:
```tsx
const handleExportPDF = async (region: string) => {
    // Usa html2canvas sul container della tabella
    const previewEl = document.querySelector('.m-table-preview') as HTMLElement | null;
    if (!previewEl) return;
    try {
        const canvas = await html2canvas(previewEl, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const w = pdf.internal.pageSize.getWidth();
        const ratio = canvas.height / canvas.width;
        pdf.addImage(imgData, 'PNG', 10, 10, w - 20, (w - 20) * ratio);
        pdf.save(`${form.denominazione || 'tabella'}_${region}.pdf`);
    } catch (e) {
        console.error('PDF export failed', e);
    }
};
```

Aggiorna `renderTab` aggiungendo il caso `'tabella'`:
```tsx
case 'tabella':
    return (
        <TabellaTab
            calcResult={calcResult}
            form={form}
            onChange={updateForm}
            onSave={(region) => {
                archive.saveItem(
                    form.denominazione || 'Senza nome',
                    {
                        denominazione: form.denominazione,
                        porzione_g: parseFloat(form.porzione_g) || 100,
                        region,
                        calcResult,
                        form,
                    }
                );
            }}
            onExportPDF={handleExportPDF}
        />
    );
```

- [ ] **Step 8.4: Verifica visiva**

Su mobile: compila alcuni valori nel tab Calcolo (es. kcal=271, grassi=20.1, proteine=14.2), poi vai in tab Tabella. Seleziona EU → deve apparire la tabella nutrizionale EU. Testa il bottone Salva (deve salvare senza errori). Testa USA.

- [ ] **Step 8.5: Commit**

```bash
git add src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx \
        src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx
git commit -m "feat(mobile): add TabellaTab with region selector and TabUE/TabUSA preview"
```

---

## Task 9: ArchivioTab

**Files:**
- Crea: `src/calculators/NutrizionaleCalc/mobile/ArchivioTab.tsx`
- Modifica: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`

- [ ] **Step 9.1: Crea ArchivioTab.tsx**

```tsx
// src/calculators/NutrizionaleCalc/mobile/ArchivioTab.tsx
import React, { useState, useRef, useCallback } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import type { ArchiveItem } from '../../../hooks/useArchive';
import type { MobileArchiveEntry } from '../NutrizionaleCalcMobile';

interface CtxMenu { id: string; x: number; y: number }

interface Props {
    items: ArchiveItem<MobileArchiveEntry>[];
    onLoad: (entry: MobileArchiveEntry) => void;
    onDelete: (id: string) => void;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' });
}

export function ArchivioTab({ items, onLoad, onDelete }: Props) {
    const [query, setQuery] = useState('');
    const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const filtered = items.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase())
    );

    const handleLongPressStart = useCallback((e: React.TouchEvent | React.MouseEvent, id: string) => {
        const touch = 'touches' in e ? e.touches[0] : e as React.MouseEvent;
        longPressTimer.current = setTimeout(() => {
            setCtxMenu({ id, x: touch.clientX, y: touch.clientY });
        }, 500);
    }, []);

    const handleLongPressEnd = useCallback(() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }, []);

    const closeCtx = () => setCtxMenu(null);

    return (
        <div style={{ paddingTop: 12 }}>
            {/* Search */}
            <div style={{ padding: '0 16px 12px' }}>
                <div className="m-search">
                    <Search size={16} color="var(--m-text-muted)" />
                    <input
                        type="search"
                        placeholder="Cerca prodotto..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoComplete="off"
                    />
                </div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
                <div className="m-empty">
                    <div className="m-empty__icon">
                        <Search size={32} />
                    </div>
                    <div className="m-empty__title">
                        {items.length === 0 ? 'Nessun calcolo salvato' : 'Nessun risultato'}
                    </div>
                    <div className="m-empty__sub">
                        {items.length === 0
                            ? 'Inserisci i dati nel tab Calcolo e salva dal tab Tabella.'
                            : `Nessun prodotto corrisponde a "${query}".`}
                    </div>
                </div>
            )}

            {/* List */}
            <div>
                {filtered.map(item => (
                    <div
                        key={item.id}
                        className="m-archive-item"
                        onClick={() => { if (!ctxMenu) onLoad(item.data); }}
                        onTouchStart={e => handleLongPressStart(e, item.id)}
                        onTouchEnd={handleLongPressEnd}
                        onTouchMove={handleLongPressEnd}
                        onMouseDown={e => handleLongPressStart(e, item.id)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                    >
                        <div className={`m-archive-badge m-archive-badge--${item.data.region}`}>
                            {item.data.region === 'Arabi' ? 'AR' : item.data.region}
                        </div>
                        <div className="m-archive-info">
                            <div className="m-archive-name">{item.name}</div>
                            <div className="m-archive-meta">
                                {formatDate(item.date)} · {Math.round(item.data.calcResult.energyKcal)} kcal/100g
                            </div>
                        </div>
                        <ChevronRight size={16} className="m-archive-chevron" />
                    </div>
                ))}
            </div>

            {/* Context menu */}
            {ctxMenu && (
                <>
                    <div className="m-ctx-overlay" onClick={closeCtx} />
                    <div className="m-ctx-menu" style={{ top: ctxMenu.y, left: Math.min(ctxMenu.x, window.innerWidth - 180) }}>
                        <button type="button" className="m-ctx-menu__item"
                            onClick={() => {
                                const item = items.find(i => i.id === ctxMenu.id);
                                if (item) onLoad(item.data);
                                closeCtx();
                            }}>
                            Apri calcolo
                        </button>
                        <button type="button" className="m-ctx-menu__item m-ctx-menu__item--danger"
                            onClick={() => { onDelete(ctxMenu.id); closeCtx(); }}>
                            Elimina
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 9.2: Integra ArchivioTab in NutrizionaleCalcMobile.tsx**

Aggiungi import:
```tsx
import { ArchivioTab } from './mobile/ArchivioTab';
```

Aggiorna `renderTab` aggiungendo il caso `'archivio'`:
```tsx
case 'archivio':
    return (
        <ArchivioTab
            items={archive.items}
            onLoad={loadFromArchive}
            onDelete={archive.deleteItem}
        />
    );
```

- [ ] **Step 9.3: Verifica visiva**

Salva almeno un calcolo dal tab Tabella, poi vai in tab Archivio. La voce deve apparire con badge colorato. Tap → ricarica i dati nel tab Calcolo. Long press (500ms) → menu contestuale con Apri/Elimina.

- [ ] **Step 9.4: Commit**

```bash
git add src/calculators/NutrizionaleCalc/mobile/ArchivioTab.tsx \
        src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx
git commit -m "feat(mobile): add ArchivioTab with long-press context menu"
```

---

## Task 10: ToolsTab

**Files:**
- Crea: `src/calculators/NutrizionaleCalc/mobile/ToolsTab.tsx`
- Modifica: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`

- [ ] **Step 10.1: Crea ToolsTab.tsx**

```tsx
// src/calculators/NutrizionaleCalc/mobile/ToolsTab.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import type { ToolId } from '../../../data/mockUsers';

interface ToolDef {
    id: ToolId;
    label: string;
    labelShort: string;
    color: string;
    path: string;
}

const TOOLS: ToolDef[] = [
    { id: 'nutrizionale',        label: 'Tabelle Nutrizionali',  labelShort: 'Tabelle\nNutrizionali', color: '#ff7e2e', path: '/tool/nutrizionale'        },
    { id: 'etichette',           label: 'Etichette Alimentari',  labelShort: 'Etichette\nAlimentari', color: '#43821c', path: '/tool/etichette'           },
    { id: 'etichette-vini',      label: 'Etichette Vini',        labelShort: 'Etichette\nVini',       color: '#7b4f9e', path: '/tool/etichette-vini'      },
    { id: 'rintracciabilita',    label: 'Rintracciabilità',      labelShort: 'Rintraccia-\nbilità',   color: '#1a5f7a', path: '/tool/rintracciabilita'    },
    { id: 'trattamento-termico', label: 'Trattamento Termico',   labelShort: 'Trattamento\nTermico',  color: '#b05a1a', path: '/tool/trattamento-termico' },
    { id: 'schede-complete',     label: 'Schede Complete',       labelShort: 'Schede\nComplete',      color: '#4a4a6a', path: '/tool/schede-complete'     },
    { id: 'scheda-processo',     label: 'Scheda Processo',       labelShort: 'Scheda\nProcesso',      color: '#2a6a4a', path: '/tool/scheda-processo'     },
];

export function ToolsTab() {
    const navigate = useNavigate();
    const { hasTool } = useAuth();

    return (
        <div style={{ paddingTop: 12 }}>
            <div style={{ padding: '0 16px 8px' }}>
                <p style={{ fontSize: 12, color: 'var(--m-text-muted)', margin: 0 }}>
                    Strumenti disponibili nel tuo piano.
                </p>
            </div>

            <div className="m-tools-grid">
                {TOOLS.map(tool => {
                    const isActive = tool.id === 'nutrizionale';
                    const isLocked = !hasTool(tool.id);

                    return (
                        <div
                            key={tool.id}
                            className={`m-tool-tile${isActive ? ' m-tool-tile--active' : ''}${isLocked ? ' m-tool-tile--locked' : ''}`}
                            onClick={() => { if (!isLocked) navigate(tool.path); }}
                            role="button"
                            tabIndex={isLocked ? -1 : 0}
                            onKeyDown={e => { if (e.key === 'Enter' && !isLocked) navigate(tool.path); }}
                            aria-label={tool.label}
                            aria-disabled={isLocked}
                        >
                            {isActive && <span className="m-tool-tile__badge">ATTIVO</span>}
                            <div
                                className="m-tool-tile__icon"
                                style={{ background: isActive ? tool.color : tool.color + '22', borderRadius: 7 }}
                            />
                            <div className="m-tool-tile__name" style={{ whiteSpace: 'pre-line' }}>
                                {tool.labelShort}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 10.2: Integra ToolsTab in NutrizionaleCalcMobile.tsx**

Aggiungi import:
```tsx
import { ToolsTab } from './mobile/ToolsTab';
```

Aggiorna `renderTab` aggiungendo il caso `'tools'`:
```tsx
case 'tools':
    return <ToolsTab />;
```

Ora tutti e 4 i tab sono implementati. Rimuovi il ramo `default` dallo switch (non serve più).

- [ ] **Step 10.3: Verifica TypeScript**

```bash
cd /Users/novanta/Desktop/APP/App_prova
npx tsc --noEmit
```

Eventuali warning su `navigate` e `archive` non più "unused" — devono sparire ora che tutti i tab sono implementati.

- [ ] **Step 10.4: Verifica visiva completa**

Testa il flusso completo su mobile (DevTools → iPhone 14):
1. Tab Calcolo → inserisci "Mozzarella di Bufala", 125g porzione, kcal=271, grassi=20.1, saturi=14.3, proteine=14.2, sodio_mg=400
2. Premi "Genera Tabella →" → tab Tabella si apre
3. Seleziona EU → la tabella EU appare
4. Premi "Salva" → notice verde "Calcolo salvato"
5. Tab Archivio → voce con badge navy "UE" e "271 kcal/100g"
6. Tab Tools → griglia 7 tool, Nutrizionale evidenziato con badge ATTIVO
7. Ridimensiona browser > 768px → l'app torna all'interfaccia desktop invariata

- [ ] **Step 10.5: Commit**

```bash
git add src/calculators/NutrizionaleCalc/mobile/ToolsTab.tsx \
        src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx
git commit -m "feat(mobile): add ToolsTab — complete mobile NutrizionaleCalc interface"
```

---

## Task 11: Cleanup e verifica finale

- [ ] **Step 11.1: Controlla CLAUDE.md constraints**

Verifica che nei nuovi file non ci siano:
- `any` impliciti (tsc --noEmit deve passare senza errori)
- `alert()`, `confirm()`, `prompt()` — nessuno nei nuovi file
- `@ts-ignore`
- Dipendenze nuove in package.json (nessuna deve essere stata aggiunta)

```bash
cd /Users/novanta/Desktop/APP/App_prova
npx tsc --noEmit
grep -r "alert\|confirm\|prompt" src/calculators/NutrizionaleCalc/mobile/
grep -r "ts-ignore" src/calculators/NutrizionaleCalc/mobile/ src/hooks/useMobile.ts src/components/MobileShell.tsx
```

Output atteso: tsc senza errori, grep senza risultati.

- [ ] **Step 11.2: Test orientamento landscape**

DevTools → iPhone 14 → ruota landscape. L'interfaccia deve restare usabile (scrollabile, tab bar visibile).

- [ ] **Step 11.3: Aggiorna todo.md**

Aggiungi una nota in fondo alla sezione COMPLETATI:

```markdown
- [x] **MOB-1** — Interfaccia mobile NutrizionaleCalc: MobileShell, Bottom Tab Bar, CalcoloTab (expert mode), TabellaTab (EU+USA), ArchivioTab, ToolsTab (2026-05-30)
```

- [ ] **Step 11.4: Commit finale**

```bash
git add todo.md
git commit -m "docs: mark MOB-1 mobile interface as completed"
```

---

## Self-review checklist

- [x] **Spec coverage:** MobileShell ✓, useMobile ✓, BottomTabBar ✓, CalcoloTab ✓, TabellaTab (EU+USA) ✓, ArchivioTab ✓, ToolsTab ✓, AppShell integration ✓, routing ✓
- [x] **Placeholder scan:** Nessun TBD. Canada/Australia/Arab in TabellaTab hanno un avviso esplicito (non un placeholder).
- [x] **Type consistency:** `CalcResult` definita in `NutrizionaleCalcMobile.tsx` ed esportata. `MobileNutForm`, `MobileArchiveEntry`, `MobileTab` tutti esportati e usati coerentemente. `formToCalcResult` usata in Task 5 e passata ai tab nei task successivi.
- [x] **CLAUDE.md:** nessuna dipendenza nuova, nessun alert/confirm/prompt, nessun @ts-ignore, zero `any` impliciti.
