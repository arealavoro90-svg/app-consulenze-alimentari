# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesignare la shell (sidebar collassata + fly-out, topbar) e il NutrizionaleCalc (split-screen form/tabella + toggle Guidato/Esperto) senza rimuovere alcun campo o logica esistente.

**Architecture:** Layer di design system aggiunto a `index.css` (zero nuove dipendenze). La sidebar passa da 260px fissi a 48px collapsed con fly-out hover. Il NutrizionaleCalc aggiunge uno split-screen layout tramite `SplitShell.tsx`; il form esistente (wizard o avanzato) va nel pannello sinistro, la tabella nutrizionale è sempre visibile nel pannello destro.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, React Router 7, lucide-react (già installato), CSS custom properties (no framework)

**Verifica:** Questo progetto non ha test unitari. Ogni task usa `npm run build` per verificare zero errori TypeScript, e `npm run dev` per verifica visiva nel browser.

---

## File map

| File | Azione | Responsabilità |
|---|---|---|
| `src/index.css` | Modifica | Nuovi token CSS + classi `.sidebar-collapsed`, `.sidebar-flyout`, `.topbar`, `.split-panel`, `.mode-toggle`, `.step-indicator`, `.guided-callout` |
| `src/components/AppShell.tsx` | Modifica | Aggiunge stato `flyoutOpen`, topbar con breadcrumb + CTA, slot per ModeToggle |
| `src/components/Sidebar.tsx` | Modifica | Collassata default (48px icone) + fly-out overlay al hover |
| `src/components/ModeToggle.tsx` | Crea | Toggle [Guidato][Esperto], scrive `aea_ui_mode` in localStorage |
| `src/calculators/NutrizionaleCalc/SplitShell.tsx` | Crea | Wrapper CSS grid split-screen (due slot: left + right) |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` | Modifica | Integra SplitShell + ModeToggle; tabella sempre visibile a destra; form (wizard/avanzato) a sinistra |

---

## Task 1: Nuovi token e classi CSS base

**Files:**
- Modify: `src/index.css` (aggiunta dopo la sezione `:root` esistente, attorno alla riga 64)

- [ ] **Step 1: Aggiungi nuovi CSS custom properties a `:root`**

Apri `src/index.css`. Alla riga 63 (dopo `--transition: 0.2s ease;`), aggiungi prima della chiusura `}`:

```css
  /* ── Redesign 2026-05 ── */
  --sidebar-collapsed-width: 48px;
  --sidebar-expanded-width: 220px;
  --sidebar-flyout-bg: #111d35;
  --topbar-height: 52px;
  --toggle-bg: #eef1f5;
  --toggle-active-guidato: #ff7e2e;
  --toggle-active-esperto: #0c1326;
  --shadow-sidebar: 2px 0 12px rgba(12,19,38,0.18);
  --shadow-flyout: 4px 0 20px rgba(12,19,38,0.25);
```

- [ ] **Step 2: Aggiungi le classi del layout shell dopo `/* ===================== APP SHELL ===================== */` (riga ~384)**

Sostituisci il blocco `.app-shell` esistente (riga 385-390):

```css
.app-shell {
  display: flex;
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
}
```

con:

```css
.app-shell {
  display: flex;
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
}

/* ── Topbar ── */
.topbar {
  height: var(--topbar-height);
  background: white;
  border-bottom: 1px solid #eaecf0;
  box-shadow: 0 1px 3px rgba(12,19,38,0.04);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.topbar-breadcrumb-sep { color: #dde2ea; }
.topbar-breadcrumb-current { font-weight: 600; color: var(--color-text); }
.topbar-breadcrumb-parent { color: var(--color-text-muted); }
.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.topbar-btn-ghost {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 7px;
  border: 1px solid var(--color-border);
  background: white; color: var(--color-text-muted);
  font-size: 12px; cursor: pointer;
  transition: background var(--transition);
}
.topbar-btn-ghost:hover { background: var(--color-surface); }
.topbar-btn-primary {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 14px; border-radius: 7px;
  border: none; background: var(--color-orange);
  color: white; font-size: 12px; font-weight: 600; cursor: pointer;
  box-shadow: 0 2px 8px rgba(255,126,46,0.3);
  transition: background var(--transition);
}
.topbar-btn-primary:hover { background: var(--color-orange-hover); }

/* ── Mode toggle ── */
.mode-toggle {
  display: flex;
  background: var(--toggle-bg);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}
.mode-toggle button {
  padding: 5px 14px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.mode-toggle button.active-guidato {
  background: var(--toggle-active-guidato);
  color: white;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(255,126,46,0.4);
}
.mode-toggle button.active-esperto {
  background: var(--toggle-active-esperto);
  color: white;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(12,19,38,0.3);
}

/* ── Split panel ── */
.split-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.split-panel-left,
.split-panel-right {
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  overflow-y: auto;
  min-height: 0;
}

/* ── Form sections inside split panel ── */
.form-section-title {
  color: var(--color-orange);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}
.ingredient-row {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8f9fb;
  border-radius: 7px;
  padding: 6px 8px;
  border: 1px solid var(--color-surface);
}

/* ── Step indicator (guided mode) ── */
.step-indicator {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: white;
  border-bottom: 1px solid #eef1f5;
}
.step-indicator-connector {
  flex: 1;
  height: 2px;
  background: var(--color-border);
  margin: 0 6px;
}
.step-indicator-connector.done { background: var(--color-orange); }
.step-dot {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700; flex-shrink: 0;
}
.step-dot.pending {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  color: var(--color-text-dim);
}
.step-dot.active {
  background: var(--color-orange);
  color: white;
  box-shadow: 0 0 0 4px rgba(255,126,46,0.18);
}
.step-dot.done {
  background: var(--color-green);
  color: white;
}
.step-label {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-dim);
  white-space: nowrap;
}
.step-label.active { color: var(--color-orange); font-weight: 700; }
.step-label.done   { color: var(--color-green); }

/* ── Guided callout ── */
.guided-callout {
  background: rgba(255,126,46,0.06);
  border: 1px solid rgba(255,126,46,0.2);
  border-radius: 7px;
  padding: 8px 10px;
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.guided-callout-icon { font-size: 14px; flex-shrink: 0; line-height: 1.4; }
.guided-callout-title { color: var(--color-orange); font-size: 9px; font-weight: 700; margin-bottom: 2px; letter-spacing: 0.5px; }
.guided-callout-text  { color: var(--color-text-muted); font-size: 10px; line-height: 1.4; }

/* ── Main content area (updated to respect new sidebar width) ── */
```

- [ ] **Step 3: Aggiorna la classe `.main-content` a riga ~574**

Trova il blocco:
```css
  margin-left: var(--sidebar-width);
```

Sostituisci con:
```css
  margin-left: var(--sidebar-collapsed-width);
```

Trova anche `max-width: calc(100vw - var(--sidebar-width));` e sostituisci con:
```css
  max-width: calc(100vw - var(--sidebar-collapsed-width));
```

- [ ] **Step 4: Build check**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build
```

Atteso: compilazione senza errori TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "style: add redesign CSS tokens and layout classes"
```

---

## Task 2: ModeToggle component

**Files:**
- Create: `src/components/ModeToggle.tsx`

- [ ] **Step 1: Crea il file**

```tsx
// src/components/ModeToggle.tsx
import { useLocalStorage } from '../hooks/useLocalStorage';

export type UIMode = 'guided' | 'expert';

export function useModeToggle() {
    return useLocalStorage<UIMode>('aea_ui_mode', 'guided');
}

interface ModeToggleProps {
    mode: UIMode;
    onChange: (mode: UIMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
    return (
        <div className="mode-toggle" role="group" aria-label="Modalità inserimento">
            <button
                className={mode === 'guided' ? 'active-guidato' : ''}
                onClick={() => onChange('guided')}
                aria-pressed={mode === 'guided'}
            >
                Guidato
            </button>
            <button
                className={mode === 'expert' ? 'active-esperto' : ''}
                onClick={() => onChange('expert')}
                aria-pressed={mode === 'expert'}
            >
                Esperto
            </button>
        </div>
    );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build
```

Atteso: zero errori.

- [ ] **Step 3: Commit**

```bash
git add src/components/ModeToggle.tsx
git commit -m "feat: add ModeToggle component (Guidato/Esperto)"
```

---

## Task 3: SplitShell layout wrapper

**Files:**
- Create: `src/calculators/NutrizionaleCalc/SplitShell.tsx`

- [ ] **Step 1: Crea il file**

```tsx
// src/calculators/NutrizionaleCalc/SplitShell.tsx
import type { ReactNode } from 'react';

interface SplitShellProps {
    left: ReactNode;
    right: ReactNode;
    /** Opacità pannello destro (0-1). Usato in guided mode step 0 per attenuare la tabella. */
    rightOpacity?: number;
}

export function SplitShell({ left, right, rightOpacity = 1 }: SplitShellProps) {
    return (
        <div className="split-panel">
            <div className="split-panel-left">
                {left}
            </div>
            <div
                className="split-panel-right"
                style={{
                    opacity: rightOpacity,
                    pointerEvents: rightOpacity < 1 ? 'none' : undefined,
                    transition: 'opacity 0.2s ease',
                }}
            >
                {right}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/calculators/NutrizionaleCalc/SplitShell.tsx
git commit -m "feat: add SplitShell layout wrapper for NutrizionaleCalc"
```

---

## Task 4: Sidebar collassata + fly-out

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/index.css` (aggiornamento blocco sidebar)

> **Nota critica:** La sidebar passa da sempre-visibile-260px a always-collapsed-48px con fly-out overlay al hover. Il main content NON si sposta quando il fly-out è aperto (overlay, non push).

- [ ] **Step 1: Aggiorna il CSS della sidebar in `src/index.css`**

Trova il blocco `.sidebar {` (riga ~393) e sostituiscilo con:

```css
/* ===================== SIDEBAR (navy brand) — redesign 2026-05 ===================== */
.sidebar {
  width: var(--sidebar-collapsed-width);
  min-height: 100vh;
  background: var(--color-sidebar-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  box-shadow: var(--shadow-sidebar);
  padding: 12px 0 16px;
  transition: none;
}

/* Logo mark */
.sidebar-logo-mark {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--color-orange), var(--color-orange-light));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 10px;
  color: white;
  letter-spacing: -0.5px;
  flex-shrink: 0;
  margin-bottom: 14px;
}

/* Divider */
.sidebar-divider {
  width: 24px;
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin-bottom: 8px;
}

/* Nav icon items */
.sidebar-nav-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
  position: relative;
  text-decoration: none;
}
.sidebar-nav-icon-btn:hover {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
}
.sidebar-nav-icon-btn.active {
  background: rgba(255,126,46,0.18);
  border: 1px solid rgba(255,126,46,0.3);
  color: var(--color-orange-light);
}
.sidebar-nav-icon-btn.active::after {
  content: '';
  position: absolute;
  right: -2px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  background: var(--color-orange);
  border-radius: 2px;
}

/* User avatar (bottom) */
.sidebar-user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: 1.5px solid rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.6);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

/* ── Fly-out overlay ── */
.sidebar-flyout {
  position: fixed;
  left: var(--sidebar-collapsed-width);
  top: 0;
  bottom: 0;
  width: var(--sidebar-expanded-width);
  background: var(--sidebar-flyout-bg);
  z-index: 99;
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  box-shadow: var(--shadow-flyout);
  border-right: 1px solid rgba(255,255,255,0.06);
  opacity: 0;
  pointer-events: none;
  transform: translateX(-8px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.sidebar-flyout.open {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}
.sidebar-flyout-brand-name {
  color: rgba(255,255,255,0.9);
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 2px;
}
.sidebar-flyout-brand-sub {
  color: rgba(255,255,255,0.35);
  font-size: 11px;
  margin-bottom: 14px;
}
.sidebar-flyout-section-label {
  color: rgba(255,255,255,0.25);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.8px;
  margin-bottom: 6px;
}
.sidebar-flyout-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 7px;
  margin-bottom: 2px;
  color: rgba(255,255,255,0.45);
  font-size: 12.5px;
  text-decoration: none;
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
}
.sidebar-flyout-item:hover {
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.8);
}
.sidebar-flyout-item.active {
  background: rgba(255,126,46,0.15);
  border-left: 3px solid var(--color-orange);
  color: var(--color-orange-light);
  font-weight: 600;
  padding-left: 5px;
}
.sidebar-flyout-footer {
  border-top: 1px solid rgba(255,255,255,0.07);
  padding-top: 12px;
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sidebar-flyout-user-name {
  color: rgba(255,255,255,0.8);
  font-size: 11px;
  font-weight: 600;
}
.sidebar-flyout-user-email {
  color: rgba(255,255,255,0.3);
  font-size: 10px;
}
.sidebar-flyout-logout {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color var(--transition);
}
.sidebar-flyout-logout:hover { color: rgba(255,255,255,0.7); }
```

Trova e **rimuovi** i vecchi blocchi `.sidebar-brand`, `.sidebar-logo`, `.sidebar-user`, `.sidebar-avatar`, `.sidebar-user-info`, `.sidebar-nav`, `.sidebar-section-label`, `.sidebar-nav-item`, `.sidebar-nav-icon`, `.sidebar-footer`, `.sidebar-logout-btn` — sono sostituiti dalle classi sopra.

- [ ] **Step 2: Riscrivi `src/components/Sidebar.tsx`**

```tsx
// src/components/Sidebar.tsx
import { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Home, LogOut, Salad, Tag, Wine, Package,
    Thermometer, FileText, Settings2, BookOpen,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { TOOLS_CATALOG } from '../data/mockUsers';
import type { ToolId } from '../data/mockUsers';

const TOOL_ICONS: Record<ToolId, React.ReactNode> = {
    'nutrizionale':        <Salad size={16} />,
    'etichette':           <Tag size={16} />,
    'etichette-vini':      <Wine size={16} />,
    'rintracciabilita':    <Package size={16} />,
    'trattamento-termico': <Thermometer size={16} />,
    'schede-complete':     <FileText size={16} />,
    'scheda-processo':     <Settings2 size={16} />,
};

interface SidebarProps {
    /** Usato su <900px per aprire sidebar come drawer */
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [flyoutOpen, setFlyoutOpen] = useState(false);
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleLogout = () => { logout(); navigate('/login'); };

    const initials = user?.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('') ?? '?';

    const openFlyout  = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); setFlyoutOpen(true); };
    const closeFlyout = () => { leaveTimer.current = setTimeout(() => setFlyoutOpen(false), 120); };

    const allItems = [
        { to: '/dashboard',   icon: <Home size={16} />,     label: 'Dashboard',        key: 'dashboard' },
        { to: '/risorse',     icon: <BookOpen size={16} />, label: 'Links e Risorse',  key: 'risorse' },
    ];
    const toolItems = (user?.purchasedTools ?? []).map((toolId) => ({
        to:    `/tool/${toolId}`,
        icon:  TOOL_ICONS[toolId],
        label: TOOLS_CATALOG[toolId].label,
        key:   toolId,
    }));

    return (
        <>
            {/* Collapsed rail */}
            <aside
                className={`sidebar${isOpen ? ' open' : ''}`}
                onMouseEnter={openFlyout}
                onMouseLeave={closeFlyout}
            >
                {/* Logo mark */}
                <div className="sidebar-logo-mark">AEA</div>

                <div className="sidebar-divider" />

                {/* Nav icons */}
                {[...allItems, ...toolItems].map((item) => (
                    <NavLink
                        key={item.key}
                        to={item.to}
                        title={item.label}
                        className={({ isActive }) =>
                            `sidebar-nav-icon-btn${isActive ? ' active' : ''}`
                        }
                        onClick={onClose}
                    >
                        {item.icon}
                    </NavLink>
                ))}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* User avatar */}
                <div className="sidebar-user-avatar" title={user?.name ?? ''}>
                    {initials}
                </div>
            </aside>

            {/* Fly-out overlay */}
            <div
                className={`sidebar-flyout${flyoutOpen ? ' open' : ''}`}
                onMouseEnter={openFlyout}
                onMouseLeave={closeFlyout}
            >
                <div className="sidebar-flyout-brand-name">AEA Consulenze</div>
                <div className="sidebar-flyout-brand-sub">Portale Clienti</div>

                <div className="sidebar-flyout-section-label">NAVIGAZIONE</div>
                {allItems.map((item) => (
                    <NavLink
                        key={item.key}
                        to={item.to}
                        className={({ isActive }) =>
                            `sidebar-flyout-item${isActive ? ' active' : ''}`
                        }
                        onClick={() => { setFlyoutOpen(false); onClose?.(); }}
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}

                <div className="sidebar-flyout-section-label" style={{ marginTop: 12 }}>
                    I TUOI STRUMENTI
                </div>
                {toolItems.map((item) => (
                    <NavLink
                        key={item.key}
                        to={item.to}
                        className={({ isActive }) =>
                            `sidebar-flyout-item${isActive ? ' active' : ''}`
                        }
                        onClick={() => { setFlyoutOpen(false); onClose?.(); }}
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}

                <div className="sidebar-flyout-footer">
                    <div className="sidebar-user-avatar">{initials}</div>
                    <div>
                        <div className="sidebar-flyout-user-name">{user?.name}</div>
                        <div className="sidebar-flyout-user-email">{user?.company}</div>
                    </div>
                    <button
                        className="sidebar-flyout-logout"
                        onClick={handleLogout}
                        title="Esci dall'account"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        </>
    );
}
```

- [ ] **Step 3: Aggiorna `src/components/AppShell.tsx`**

```tsx
// src/components/AppShell.tsx
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AlignJustify, Archive, Plus } from 'lucide-react';

/** Mappa route → etichetta breadcrumb */
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
            <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Topbar */}
                <div className="topbar">
                    <div className="topbar-left">
                        {/* Hamburger — visibile solo <900px */}
                        <button
                            className="hamburger-btn topbar-hamburger"
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
                        {/* Il ModeToggle viene iniettato da NutrizionaleCalc tramite portal o context — per ora placeholder */}
                        <div id="topbar-mode-toggle-slot" />

                        {isNutrizionale && (
                            <>
                                <button className="topbar-btn-ghost">
                                    <Archive size={13} />
                                    Archivio
                                </button>
                                <button className="topbar-btn-primary">
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
```

> **Nota:** Il ModeToggle viene montato nel `#topbar-mode-toggle-slot` tramite `createPortal` in NutrizionaleCalc (Task 6). Questo evita prop drilling attraverso il router.

- [ ] **Step 4: Aggiorna il CSS hamburger e media queries in `src/index.css`**

Trova il blocco `@media (max-width: ...)` che gestisce `.hamburger-btn` e `.sidebar` (attorno alla riga ~1028). Sostituisci i blocchi relativi a sidebar e hamburger:

```css
/* Hamburger — nascosto su desktop, visibile solo <900px */
.hamburger-btn {
  display: none;
}
.topbar-hamburger {
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  padding: 4px;
  border-radius: 5px;
  margin-right: 4px;
}

/* ── Breakpoint: 900–1279px ── */
@media (max-width: 1279px) {
  /* Niente fly-out su medium — solo tooltip title nativo dell'icona */
  .sidebar-flyout { display: none !important; }
}

/* ── Breakpoint: <900px — tablet/mobile ── */
@media (max-width: 899px) {
  .hamburger-btn { display: flex; }

  /* Sidebar come drawer dal basso/lato su mobile */
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    width: var(--sidebar-expanded-width);
    align-items: flex-start;
    padding: 16px 12px;
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .app-shell.sidebar-open .sidebar-backdrop {
    display: block;
  }

  .main-content {
    margin-left: 0;
    max-width: 100vw;
  }

  /* Split panel: stacked */
  .split-panel {
    grid-template-columns: 1fr;
    overflow-y: auto;
    height: auto;
  }
}
```

- [ ] **Step 5: Build check**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build
```

Atteso: zero errori TypeScript. Se ci sono errori legati a `useLocation` in AppShell, assicurati che sia importato da `react-router-dom`.

- [ ] **Step 6: Verifica visiva**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run dev
```

Apri `http://localhost:5173`, accedi con `demo@aeaconsulenze.it` / `Demo2024!`.  
Verifica:
- Sidebar mostra 48px di icone
- Hover sulla sidebar apre il fly-out con etichette
- Il contenuto NON si sposta quando il fly-out è aperto
- Topbar mostra breadcrumb e pulsanti

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/components/Sidebar.tsx src/components/AppShell.tsx
git commit -m "feat: sidebar collapsed 48px + fly-out overlay + topbar"
```

---

## Task 5: NutrizionaleCalc — integrazione split-screen e ModeToggle

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

> **Regola critica da CLAUDE.md:** ogni modifica deve applicarsi a ENTRAMBE le modalità (Wizard e Vista Avanzata). In questo task la distinzione cambia nome: `wizardMode=true` → Guidato, `wizardMode=false` → Esperto.

- [ ] **Step 1: Aggiungi import per i nuovi componenti**

All'inizio del file, dopo gli import esistenti (riga ~28), aggiungi:

```tsx
import { createPortal } from 'react-dom';
import { ModeToggle, useModeToggle } from '../../components/ModeToggle';
import { SplitShell } from './SplitShell';
```

- [ ] **Step 2: Sostituisci lo stato `wizardMode`**

Trova (riga ~1182):
```tsx
const [wizardMode, setWizardMode] = useLocalStorage<boolean>('nutri_wizard_mode', true);
```

Sostituisci con:
```tsx
const [uiMode, setUiMode] = useModeToggle();
// Alias per compatibilità con il resto del codice esistente
const wizardMode = uiMode === 'guided';
const setWizardMode = (val: boolean) => setUiMode(val ? 'guided' : 'expert');
```

Trova (riga ~1184):
```tsx
const toggleWizardMode = (mode: boolean) => { setWizardMode(mode); setWizardStep(0); };
```

Lascialo invariato — funziona con il nuovo alias.

- [ ] **Step 3: Aggiungi il ModeToggle nel topbar tramite createPortal**

Trova l'inizio del `return (` principale del componente `NutrizionaleCalc` (cerca `return (` all'interno della funzione principale, non nei sotto-componenti). Aggiungi come primo figlio del return, prima del wrapper principale:

```tsx
{/* ModeToggle montato nel topbar tramite portal */}
{createPortal(
    <ModeToggle mode={uiMode} onChange={setUiMode} />,
    document.getElementById('topbar-mode-toggle-slot') ?? document.body
)}
```

- [ ] **Step 4: Individua i due blocchi di rendering (wizard e avanzato)**

Cerca nel file (attorno alla riga 3342 e 2636):
```tsx
{wizardMode && renderWizard()}
{!wizardMode && (<>
```

Questi sono i due blocchi che contengono il form. Devono diventare il contenuto del pannello sinistro del SplitShell.

- [ ] **Step 5: Individua il blocco tabelle nel wizard (step 3)**

Il rendering delle tabelle avviene all'interno di `{wizardStep === 3 && (...)}` nel wizard e nella vista avanzata. Devi estrarre la sezione "tab switcher + TabUE/TabUSA/ecc." in una variabile JSX riutilizzabile.

Aggiungi questa funzione (prima del return principale):

```tsx
/** Pannello destra: tab switcher + tabella live. Usato in entrambe le modalità. */
function renderTablePanel() {
    return (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tab switcher nazioni */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: 'var(--color-surface)', borderRadius: '7px', padding: '3px' }}>
                {(['UE', 'USA', 'Canada', 'Australia', 'Arabi'] as NationTab[]).map(t => {
                    const labels: Record<NationTab, string> = { UE: 'EU', USA: 'USA', Canada: 'Canada', Australia: 'Australia', Arabi: 'Arabi' };
                    return (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: '5px',
                                border: 'none',
                                background: activeTab === t ? 'white' : 'transparent',
                                boxShadow: activeTab === t ? '0 1px 2px rgba(0,0,0,0.07)' : 'none',
                                color: activeTab === t ? 'var(--color-text)' : 'var(--color-text-dim)',
                                fontWeight: activeTab === t ? 600 : 400,
                                fontSize: '11px',
                                cursor: 'pointer',
                            }}
                        >
                            {labels[t]}
                        </button>
                    );
                })}
            </div>

            {/* Tabella attiva */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {activeTab === 'UE' && (
                    <TabUE
                        p={per100display}
                        ue={ue}
                        selectedOptionals={selectedOptionals}
                        setSelectedOptionals={setSelectedOptionals}
                        euSubTab={euSubTab}
                        setEuSubTab={setEuSubTab}
                        ueServing={ueServing}
                        setUeServing={setUeServing}
                        full={false}
                    />
                )}
                {activeTab === 'USA' && (
                    <TabUSA
                        p={per100display}
                        usa={usa}
                        specificGravity={parseFloat(specificGravity) || 0}
                        servingRef={usaServingRef}
                        measure={usaMeasure}
                        setMeasure={setUsaMeasure}
                        subTab={subTab}
                        setSubTab={setSubTab}
                        full={false}
                    />
                )}
                {activeTab === 'Canada' && (
                    <TabCanada
                        p={per100display}
                        ca={ca}
                        servingRef={caServingRef}
                        measure={caMeasure}
                        subTab={subTab}
                        setSubTab={setSubTab}
                        full={false}
                    />
                )}
                {activeTab === 'Australia' && (
                    <TabAustralia
                        p={per100display}
                        au={au}
                        showDI={auShowDI}
                        setShowDI={setAuShowDI}
                        full={false}
                    />
                )}
                {activeTab === 'Arabi' && (
                    <TabArabi
                        p={per100display}
                        arabi={arabi}
                        servingRef={arabiServingRef}
                        measure={arabiMeasure}
                        specificGravity={parseFloat(specificGravity) || 0}
                        full={false}
                    />
                )}
            </div>

            {/* Export PDF */}
            <button
                onClick={handleExportPDF}
                style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '7px',
                    background: 'var(--color-navy)',
                    color: 'white',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                }}
            >
                Esporta PDF
            </button>
        </div>
    );
}
```

> **Nota:** Verifica i nomi esatti delle props di TabUE, TabUSA, ecc. guardando le loro signature in `TabUE.tsx` e `TabUSA.tsx`. Usa le stesse props che già usi nei blocchi `wizardStep === 3` e nella vista avanzata esistenti — copia esattamente da lì.

- [ ] **Step 6: Avvolgi il contenuto principale con SplitShell**

Trova il wrapper più esterno del return di `NutrizionaleCalc` (tipicamente un `<div className="...">` che contiene sia il wizard che la vista avanzata). Avvolgilo con SplitShell:

Il nuovo return principale deve avere questa struttura:

```tsx
return (
    <>
        {/* ModeToggle nel topbar */}
        {createPortal(
            <ModeToggle mode={uiMode} onChange={setUiMode} />,
            document.getElementById('topbar-mode-toggle-slot') ?? document.body
        )}

        {/* Wrapper pagina */}
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height))' }}>
            {/* Step indicator — visibile solo in Guidato */}
            {wizardMode && (
                <div className="step-indicator">
                    {[
                        { label: 'Ricetta', step: 0 },
                        { label: 'Ingredienti', step: 1 },
                        { label: 'Additivi', step: 2 },
                        { label: 'Tabelle', step: 3 },
                    ].map(({ label, step }, i) => (
                        <React.Fragment key={step}>
                            {i > 0 && (
                                <div className={`step-indicator-connector${wizardStep >= step ? ' done' : ''}`} />
                            )}
                            <div className={`step-dot ${wizardStep === step ? 'active' : wizardStep > step ? 'done' : 'pending'}`}>
                                {wizardStep > step ? <Check size={10} /> : step + 1}
                            </div>
                            <span className={`step-label${wizardStep === step ? ' active' : wizardStep > step ? ' done' : ''}`}>
                                {label}
                            </span>
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Split screen */}
            <SplitShell
                left={
                    <div style={{ padding: '14px' }}>
                        {wizardMode
                            ? renderWizard()
                            : /* Vista avanzata: è il blocco JSX che inizia con {!wizardMode && (<> alla riga ~2636.
                               Spostalo qui INTEGRALMENTE senza modifiche. Si tratta di un <React.Fragment> con
                               tutti i campi: nome prodotto, componenti, ingredienti, additivi, serving sizes ecc.
                               Taglia il blocco dall'attuale posizione e incollalo qui come valore del ternario. */
                              null
                        }
                    </div>
                }
                right={renderTablePanel()}
                rightOpacity={wizardMode && wizardStep === 0 ? 0.45 : 1}
            />
        </div>

        {/* Modali esistenti rimangono invariate (ArchiveModal, NutrientSelectModal, ecc.) */}
        {/* ... tutto il JSX delle modali che era già alla fine del return ... */}
    </>
);
```

> **Importante:** Il `renderWizard()` esistente già restituisce il JSX dei 4 step — lascialo invariato. La vista avanzata (`!wizardMode`) è il blocco che inizia a riga ~2636 — anch'essa lasciata invariata, solo spostata nel pannello sinistro.

- [ ] **Step 7: Build check**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build
```

Se ci sono errori sulle props di TabCanada/TabAustralia/TabArabi (che sono ancora inline in NutrizionaleCalc.tsx), copia le props esatte dal loro punto di uso esistente nel file.

- [ ] **Step 8: Verifica visiva**

```bash
npm run dev
```

Naviga a `/tool/nutrizionale`. Verifica:
- Split-screen form sinistra / tabella destra
- Toggle [Guidato][Esperto] visibile nel topbar
- In Guidato: step indicator visibile, tabella attenuata al step 0
- In Esperto: tutti i campi visibili, nessun step indicator, tabella sempre attiva
- I pulsanti "Archivio" e "Nuova Ricetta" nel topbar sono cliccabili

- [ ] **Step 9: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat: NutrizionaleCalc split-screen + ModeToggle integration"
```

---

## Task 6: Collegare Archivio e Nuova Ricetta nel topbar

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

> I pulsanti "Archivio" e "Nuova Ricetta" erano nel vecchio header inline di NutrizionaleCalc. Ora sono nel topbar di AppShell ma devono triggerare le azioni nel calcolatore.

- [ ] **Step 1: Aggiungi slot per azioni topbar**

In `AppShell.tsx`, aggiungi un secondo slot nel topbar, accanto al ModeToggle:

```tsx
<div id="topbar-actions-slot" />
```

Nel `topbar-right`, sostituisci i pulsanti statici con:

```tsx
<div id="topbar-mode-toggle-slot" />
<div id="topbar-actions-slot" />
```

- [ ] **Step 2: In `NutrizionaleCalc.tsx`, monta le azioni nel topbar**

Aggiungi nel portal (insieme al ModeToggle):

```tsx
{createPortal(
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ModeToggle mode={uiMode} onChange={setUiMode} />
        <button className="topbar-btn-ghost" onClick={() => setArchiveOpen(true)}>
            <Archive size={13} />
            Archivio
        </button>
        <button className="topbar-btn-primary" onClick={handleNewRecipe}>
            <Plus size={13} />
            Nuova Ricetta
        </button>
    </div>,
    document.getElementById('topbar-mode-toggle-slot') ?? document.body
)}
```

Rimuovi il `<div id="topbar-actions-slot" />` da AppShell (non più necessario) e rimuovi i pulsanti statici.

> `handleNewRecipe` è la funzione che resetta lo stato — guardala nel file esistente (cerca `reset` o `handleNew` o simile). `setArchiveOpen` è lo stato che apre l'ArchiveModal.

- [ ] **Step 3: Build check + verifica**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build && npm run dev
```

Verifica che Archivio e Nuova Ricetta funzionino come prima.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppShell.tsx src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat: wire Archivio and Nuova Ricetta to topbar"
```

---

## Task 7: Polish finale e guided callout

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 1: Aggiungi i callout contestuali in modalità Guidato**

In `renderWizard()`, all'inizio di ciascun blocco `{wizardStep === N && (...)}`, aggiungi il callout appropriato:

```tsx
{/* Step 0 */}
{wizardStep === 0 && (
    <>
        <div className="guided-callout">
            <span className="guided-callout-icon">💡</span>
            <div>
                <div className="guided-callout-title">STEP 1 — DATI RICETTA</div>
                <div className="guided-callout-text">
                    Inserisci il nome del prodotto e i pesi. Il peso finito include il calo cottura.
                </div>
            </div>
        </div>
        {/* ... resto del form step 0 invariato ... */}
    </>
)}

{/* Step 1 */}
{wizardStep === 1 && (
    <>
        <div className="guided-callout">
            <span className="guided-callout-icon">🥗</span>
            <div>
                <div className="guided-callout-title">STEP 2 — INGREDIENTI</div>
                <div className="guided-callout-text">
                    Cerca gli ingredienti nel database e inserisci i grammi. La tabella si aggiorna in tempo reale.
                </div>
            </div>
        </div>
        {/* ... resto del form step 1 invariato ... */}
    </>
)}

{/* Step 2 */}
{wizardStep === 2 && (
    <>
        <div className="guided-callout">
            <span className="guided-callout-icon">🧪</span>
            <div>
                <div className="guided-callout-title">STEP 3 — ADDITIVI</div>
                <div className="guided-callout-text">
                    Aggiungi additivi se presenti nella ricetta. Puoi saltare questo step se non ne hai.
                </div>
            </div>
        </div>
        {/* ... resto del form step 2 invariato ... */}
    </>
)}

{/* Step 3 */}
{wizardStep === 3 && (
    <>
        <div className="guided-callout">
            <span className="guided-callout-icon">📋</span>
            <div>
                <div className="guided-callout-title">STEP 4 — TABELLE</div>
                <div className="guided-callout-text">
                    Rivedi i valori e imposta le porzioni. Esporta il PDF dalla colonna destra.
                </div>
            </div>
        </div>
        {/* ... resto del form step 3 invariato ... */}
    </>
)}
```

- [ ] **Step 2: Build check finale**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build
```

- [ ] **Step 3: Verifica visiva completa**

```bash
npm run dev
```

Checklist finale:
- [ ] Sidebar collassata 48px, fly-out al hover con etichette
- [ ] Topbar: breadcrumb, toggle Guidato/Esperto, pulsanti Archivio e Nuova Ricetta
- [ ] Split-screen 50/50 su schermo largo
- [ ] Toggle [Guidato]: step indicator + callout + tabella attenuata step 0
- [ ] Toggle [Esperto]: tutti i campi visibili, nessun step indicator, tabella sempre attiva
- [ ] Preferenza toggle salvata in localStorage (`aea_ui_mode`)
- [ ] Su <900px: sidebar → hamburger topbar, split → stacked
- [ ] Export PDF funzionante
- [ ] Archivio funzionante
- [ ] Nuova Ricetta resetta il form

- [ ] **Step 4: Commit finale**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat: guided mode callouts + final UI polish"
```

---

## Checklist spec coverage

| Requisito spec | Task |
|---|---|
| Token CSS nuovi | Task 1 |
| Sidebar 48px + fly-out hover | Task 4 |
| Topbar 52px + breadcrumb + CTA | Task 4 |
| ModeToggle [Guidato][Esperto] + localStorage | Task 2 |
| SplitShell split-screen | Task 3 |
| NutrizionaleCalc integrazione split | Task 5 |
| Archivio e Nuova Ricetta nel topbar | Task 6 |
| Guided callout per ogni step | Task 7 |
| Breakpoints 900/1279px | Task 4 (step 4) |
| Zero campi rimossi | Verificato in ogni task |
