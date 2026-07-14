# Nutrizionale Mobile Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesignare l'esperienza mobile del tool Nutrizionale con slide orizzontale tra sezioni, stile Bold/Branded, e risoluzione del conflitto tra le due tab bar.

**Architecture:** La tabbar app in `MobileShell` si nasconde quando `insideTool=true`. `NutrizionaleCalcMobile` sostituisce lo scroll-container con un slide-track a 4 pannelli (`transform: translateX`). Le tab interne (Ricetta/Riepilogo/Mercati/Archivio) si spostano sopra il contenuto (inner-tabs sotto topbar) anziché in fondo.

**Tech Stack:** React 19 + TypeScript, CSS vanilla (mobile.css), nessuna nuova dipendenza.

---

## File map

| File | Modifica |
|---|---|
| `src/styles/mobile.css` | Aggiunge classi slide, inner-tabs, Bold/Branded, m-page--tool |
| `src/components/MobileShell.tsx` | Aggiunge prop `insideTool`, topbar variante tool, hide tabbar app |
| `src/components/AppShell.tsx` | Passa `insideTool` basandosi su `location.pathname` |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` | Rimuove scroll+IntersectionObserver, aggiunge slide container + inner-tabs + dot indicator |

**Non si toccano:** `mobile/CalcoloTab.tsx`, `mobile/RiepilogoTab.tsx`, `mobile/TabellaTab.tsx`, `mobile/ArchivioTab.tsx`, engine, logic.

---

## Task 1: CSS — nuove classi in `mobile.css`

**File:** `src/styles/mobile.css` (append in fondo)

- [ ] **Step 1: Aggiungi il token `--m-inner-tabs-h` ai token esistenti in `:root`**

Apri `src/styles/mobile.css`. Trova il blocco `:root` (riga 1) e aggiungi la variabile:

```css
:root {
  /* ... variabili esistenti ... */
  --m-inner-tabs-h: 36px;
}
```

- [ ] **Step 2: Appendi tutte le nuove classi in fondo al file**

```css
/* ── m-page variante tool (no overflow, no padding-bottom fisso) ─────────── */
.m-page--tool {
  overflow: hidden;
  padding-bottom: 0;
  display: flex;
  flex-direction: column;
}

/* ── Topbar variante tool ────────────────────────────────────────────────── */
.m-topbar--tool {
  background: linear-gradient(135deg, #0c1326 0%, #111d35 100%);
}
.m-topbar__back {
  color: var(--m-orange);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: -0.2px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  display: flex;
  align-items: center;
}
.m-topbar__center {
  text-align: center;
  flex: 1;
}
.m-topbar__sub {
  color: rgba(255, 126, 46, 0.6);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.3px;
  margin-top: 1px;
}

/* ── Inner tabs (sezioni del tool, sotto topbar) ─────────────────────────── */
.m-inner-tabs {
  display: flex;
  background: var(--m-navy);
  height: var(--m-inner-tabs-h);
  flex-shrink: 0;
}
.m-inner-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  cursor: pointer;
  position: relative;
  border: none;
  background: none;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s;
}
.m-inner-tab--active {
  color: var(--m-orange);
}
.m-inner-tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: var(--m-orange);
  border-radius: 2px 2px 0 0;
}

/* ── Slide container ─────────────────────────────────────────────────────── */
.m-slide-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.m-slide-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
.m-slide-track {
  display: flex;
  width: 400%;
  height: 100%;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}
.m-slide-panel {
  width: 25%;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* ── Dot indicator (posizione slide) ─────────────────────────────────────── */
.m-dot-indicator {
  display: flex;
  justify-content: center;
  gap: 5px;
  padding: 7px 0;
  background: var(--m-bg);
  flex-shrink: 0;
}
.m-dot-indicator__pip {
  width: 18px;
  height: 3px;
  border-radius: 2px;
  background: rgba(12, 19, 38, 0.1);
  transition: width 0.2s, background 0.2s;
}
.m-dot-indicator__pip--active {
  background: var(--m-orange);
  width: 24px;
}

/* ── Bold/Branded: product header ────────────────────────────────────────── */
.m-product-header {
  background: var(--m-surface);
  border-left: 3px solid var(--m-orange);
  border-radius: var(--m-radius-md);
  padding: 10px 12px;
  margin: 12px 16px 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.m-product-header__label {
  font-size: 9px;
  font-weight: 700;
  color: var(--m-text-muted);
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-bottom: 3px;
}
.m-product-header__name {
  font-size: 14px;
  font-weight: 900;
  color: var(--m-text);
  letter-spacing: -0.3px;
}
.m-product-header__meta {
  font-size: 10px;
  color: var(--m-text-muted);
  margin-top: 2px;
}

/* ── Bold/Branded: ingredient card ──────────────────────────────────────── */
.m-ing-card {
  background: var(--m-surface);
  border-radius: var(--m-radius-md);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.m-ing-card__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--m-orange);
  flex-shrink: 0;
}
.m-ing-card__name {
  flex: 1;
  font-size: 11px;
  font-weight: 700;
  color: var(--m-text);
}
.m-ing-card__grams {
  font-size: 12px;
  font-weight: 900;
  color: var(--m-orange);
  font-family: 'Courier New', monospace;
}

/* ── Bold/Branded: energy strip ──────────────────────────────────────────── */
.m-energy-strip {
  background: linear-gradient(135deg, var(--m-orange) 0%, #dd5c0c 100%);
  border-radius: var(--m-radius-md);
  padding: 12px 16px;
  margin: 12px 16px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.m-energy-strip__label {
  font-size: 9px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.m-energy-strip__unit {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}
.m-energy-strip__value {
  font-size: 28px;
  font-weight: 900;
  color: #fff;
  font-family: 'Courier New', monospace;
  letter-spacing: -1px;
  line-height: 1;
  text-align: right;
}
.m-energy-strip__kj {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  text-align: right;
  margin-top: 2px;
}

/* ── Bold/Branded: nutrient card ─────────────────────────────────────────── */
.m-nut-card {
  background: var(--m-surface);
  border-radius: var(--m-radius-md);
  overflow: hidden;
  margin: 0 16px 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.m-nut-card__header {
  background: var(--m-navy);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.m-nut-card__title {
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.m-nut-card__per {
  color: rgba(255, 126, 46, 0.8);
  font-size: 9px;
  font-weight: 600;
}
.m-nut-card__row {
  padding: 7px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(12, 19, 38, 0.04);
}
.m-nut-card__row:last-child { border-bottom: none; }
.m-nut-card__key {
  font-size: 11px;
  color: var(--m-text-muted);
  font-weight: 600;
}
.m-nut-card__key--sub {
  padding-left: 12px;
  font-size: 10px;
}
.m-nut-card__val {
  font-size: 12px;
  font-weight: 900;
  color: var(--m-text);
  font-family: 'Courier New', monospace;
}
.m-nut-card__val--accent { color: var(--m-orange); }
```

- [ ] **Step 3: Verifica build CSS**

```bash
npx tsc -b 2>&1
```

Atteso: nessun output (zero errori).

- [ ] **Step 4: Commit**

```bash
cd /Users/novanta/Desktop/APP/App_prova
git add src/styles/mobile.css
git commit -m "style: aggiungi classi Bold/Branded e slide per mobile redesign"
```

---

## Task 2: MobileShell — prop `insideTool` + topbar variante tool

**File:** `src/components/MobileShell.tsx` (riscrittura completa — il file è piccolo)

- [ ] **Step 1: Riscrivi `MobileShell.tsx`**

```tsx
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
```

- [ ] **Step 2: Verifica TS**

```bash
npx tsc -b 2>&1
```

Atteso: nessun output.

- [ ] **Step 3: Commit**

```bash
git add src/components/MobileShell.tsx
git commit -m "feat(mobile): MobileShell prop insideTool — topbar variante tool, hide tabbar app"
```

---

## Task 3: AppShell — passa `insideTool` a MobileShell

**File:** `src/components/AppShell.tsx`

- [ ] **Step 1: Aggiorna il branch mobile in AppShell**

Trova questa sezione in `AppShell.tsx`:

```tsx
if (isMobile) {
    return <MobileShell pageLabel={pageLabel} />;
}
```

Sostituisci con:

```tsx
if (isMobile) {
    const insideTool = location.pathname.startsWith('/tool/');
    return <MobileShell pageLabel={pageLabel} insideTool={insideTool} />;
}
```

- [ ] **Step 2: Verifica TS**

```bash
npx tsc -b 2>&1
```

Atteso: nessun output.

- [ ] **Step 3: Controlla in browser (DevTools mobile 390px)**

- Vai su `/dashboard` → tabbar app visibile in fondo ✓
- Vai su `/tool/nutrizionale` → tabbar app sparisce, topbar con "‹ AEA" e sottotitolo ✓

- [ ] **Step 4: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat(mobile): AppShell passa insideTool a MobileShell"
```

---

## Task 4: NutrizionaleCalcMobile — slide container

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`

Questo task rimuove lo scroll-container e l'IntersectionObserver, aggiunge il slide.

- [ ] **Step 1: Rimuovi `sectionRefs` e l'`IntersectionObserver`**

Rimuovi queste righe (circa 130–162 nel file originale):

```tsx
// ── DA RIMUOVERE ──
const sectionRefs = {
    ricetta:   useRef<HTMLDivElement>(null),
    riepilogo: useRef<HTMLDivElement>(null),
    mercati:   useRef<HTMLDivElement>(null),
    archivio:  useRef<HTMLDivElement>(null),
};

const goToSection = useCallback((tab: MobileTab) => {
    setActiveTab(tab);
    sectionRefs[tab].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
// ponytail: refs are stable, no dep needed
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
    const candidates = Object.entries(sectionRefs) as [MobileTab, React.RefObject<HTMLDivElement>][];
    const observer = new IntersectionObserver(
        (entries) => {
            const best = entries
                .filter(e => e.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (best) {
                const tab = best.target.getAttribute('data-section') as MobileTab;
                if (tab) setActiveTab(tab);
            }
        },
        { threshold: [0.2, 0.5], rootMargin: '0px 0px -30% 0px' },
    );
    candidates.forEach(([, ref]) => { if (ref.current) observer.observe(ref.current); });
    return () => observer.disconnect();
// ponytail: refs are stable objects, intentionally omitted from deps
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 2: Aggiungi `TAB_ORDER` e semplifica `goToSection`**

Subito dopo la definizione di `activeTab`, aggiungi:

```tsx
const TAB_ORDER: MobileTab[] = ['ricetta', 'riepilogo', 'mercati', 'archivio'];

const goToSection = useCallback((tab: MobileTab) => {
    setActiveTab(tab);
}, []);
```

Rimuovi l'import di `useRef` se non usato altrove (controlla prima).

- [ ] **Step 3: Sostituisci il render con slide container**

Nel `return`, sostituisci l'intera struttura (da `<div style={{ minHeight: '100%' ...}}>` fino alla chiusura) con:

```tsx
return (
    <div className="m-slide-wrapper">
        {/* ── Inner tabs (sezioni) ── */}
        <nav className="m-inner-tabs" role="tablist">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`m-inner-tab${activeTab === tab.id ? ' m-inner-tab--active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </nav>

        {/* ── Slide container ── */}
        <div className="m-slide-container">
            <div
                className="m-slide-track"
                style={{ transform: `translateX(-${TAB_ORDER.indexOf(activeTab) * 25}%)` }}
            >
                {/* Panel 0: Ricetta */}
                <div className="m-slide-panel">
                    <CalcoloTab
                        form={form}
                        onChange={updateForm}
                        onGoToTabella={() => goToSection('mercati')}
                        db={db}
                        loadingDB={loadingDB}
                        dbError={dbError}
                        components={components}
                        onAddComponent={addComponent}
                        onRemoveComponent={removeComponent}
                        onUpdateComponentName={updateComponentName}
                        onUpdateComponentPzUV={updateComponentPzUV}
                        onAddRow={addRow}
                        onRemoveRow={removeRow}
                        onUpdateRow={updateRow}
                        onAddAdditiveRow={addAdditiveRow}
                        onRemoveAdditiveRow={removeAdditiveRow}
                        onUpdateAdditiveRow={updateAdditiveRow}
                        onOpenSmartImport={() => setShowSmartImport(true)}
                        onOpenArchive={() => goToSection('archivio')}
                        hasExcelImport={hasExcelImport}
                    />
                </div>

                {/* Panel 1: Riepilogo */}
                <div className="m-slide-panel">
                    <RiepilogoTab
                        components={components}
                        pesoFinito={parseFloat(form.pesoFinito_g) || 0}
                        presentAllergens={presentAllergens}
                        crossAllergens={crossAllergens}
                    />
                </div>

                {/* Panel 2: Mercati */}
                <div className="m-slide-panel">
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
                                    components,
                                }
                            );
                        }}
                        onExportPDF={handleExportPDF}
                        hasIngredients={hasIngredients}
                        presentAllergens={presentAllergens}
                        crossAllergens={crossAllergens}
                    />
                </div>

                {/* Panel 3: Archivio */}
                <div className="m-slide-panel">
                    <ArchivioTab
                        items={archive.items}
                        onLoad={(entry) => loadFromArchive(entry)}
                        onDelete={(id) => archive.deleteItem(id)}
                    />
                </div>
            </div>
        </div>

        {/* ── Dot indicator ── */}
        <div className="m-dot-indicator" aria-hidden="true">
            {TAB_ORDER.map((t, i) => (
                <div
                    key={t}
                    className={`m-dot-indicator__pip${TAB_ORDER.indexOf(activeTab) === i ? ' m-dot-indicator__pip--active' : ''}`}
                />
            ))}
        </div>

        {/* ── SmartImport modal ── */}
        {showSmartImport && (
            <SmartImportModal
                db={db}
                onClose={() => setShowSmartImport(false)}
                onImport={handleSmartImportMobile}
            />
        )}
    </div>
);
```

- [ ] **Step 4: Verifica TS**

```bash
npx tsc -b 2>&1
```

Atteso: nessun output. Se ci sono errori di `useRef` rimasto senza body, rimuovi l'import di `useRef` dalla riga 1 del file.

- [ ] **Step 5: Verifica in browser (DevTools iPhone 390px)**

1. Apri `http://localhost:5173/tool/nutrizionale` in mobile view
2. Le 4 tab (Ricetta / Riepilogo / Mercati / Archivio) sono visibili sotto la topbar
3. Clicca "Riepilogo" → il contenuto slide orizzontalmente (transizione 0.28s)
4. Il dot indicator in basso avanza
5. "‹ AEA" nella topbar porta a `/dashboard`
6. Su `/dashboard` la tabbar app è visibile di nuovo

- [ ] **Step 6: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx
git commit -m "feat(mobile): slide orizzontale tra sezioni Nutrizionale, rimuove IntersectionObserver"
```

---

## Task 5: Build finale e verifica checklist

- [ ] **Step 1: Build completo**

```bash
npm run build 2>&1
```

Atteso: `✓ built in Xs` senza errori.

- [ ] **Step 2: Checklist di accettazione (dalla spec)**

Apri `http://localhost:5173` in DevTools mobile (390px) ed esegui manualmente:

- [ ] Tab Ricetta → Riepilogo → Mercati → Archivio: slide orizzontale fluido ✓
- [ ] Tabbar app assente su `/tool/nutrizionale` ✓
- [ ] `‹ AEA` porta a `/dashboard` ✓
- [ ] Tabbar app visibile su `/dashboard` e `/risorse` ✓
- [ ] Autosave: ricarica la pagina → gli ingredienti sono ancora presenti ✓
- [ ] Archivio: salva un prodotto da Mercati, vai in Archivio → compare ✓

- [ ] **Step 3: Commit finale**

```bash
git add -A
git commit -m "chore: mobile redesign — build OK, checklist passata"
```
