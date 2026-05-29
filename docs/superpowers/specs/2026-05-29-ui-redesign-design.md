# UI Redesign — AEA Portale Clienti
**Data:** 2026-05-29  
**Scope:** Shell completa (AppShell, Sidebar, topbar) + NutrizionaleCalc  
**Approccio:** Design system layer su `index.css` — zero nuove dipendenze

---

## 1. Vincoli non negoziabili

- Nessun CSS framework esterno
- Nessuna nuova dipendenza npm
- Zero campi rimossi o spostati nel NutrizionaleCalc — stessa struttura dati e stato
- `localizationModule.ts`, `nutritionalEngine.ts`, `validation.ts` intoccabili
- Ogni modifica al NutrizionaleCalc va applicata a entrambe le modalità: Guidata ed Esperta
- I token di colore esistenti in `index.css` sono la base — si estende, non si riscrive

---

## 2. Design token (estensioni a index.css)

I token esistenti rimangono invariati. Si aggiungono:

```css
/* Sidebar */
--sidebar-collapsed-width: 48px;
--sidebar-expanded-width: 220px;
--sidebar-flyout-bg: #111d35;

/* Topbar */
--topbar-height: 52px;

/* Split panel */
--split-ratio-lg: 50%;      /* ≥1280px */
--split-ratio-md: 55%;      /* 900-1279px */

/* Mode toggle */
--toggle-bg: #eef1f5;
--toggle-active-guidato: #ff7e2e;
--toggle-active-esperto: #0c1326;

/* Nuovi shadow */
--shadow-sidebar: 2px 0 12px rgba(12,19,38,0.18);
--shadow-flyout: 4px 0 20px rgba(12,19,38,0.25);
```

---

## 3. Shell — AppShell.tsx

### Layout generale
```
[Sidebar 48px] [Main area flex:1]
                 ├── [Topbar 52px fissi]
                 └── [Page content scroll]
```

### Sidebar collassata (default)
- Larghezza: `48px`
- Sfondo: `--color-navy` (`#0c1326`)
- Contenuto: logo mark AEA arancio (32×32px, border-radius 8px) + icone nav (36×36px touch target)
- Voce attiva: `background: rgba(255,126,46,0.18)`, `border: 1px solid rgba(255,126,46,0.3)`, dot laterale `3×16px #ff7e2e` sulla destra
- Voci inattive: icone `stroke: rgba(255,255,255,0.4)`, hover `background: rgba(255,255,255,0.08)`
- In fondo: avatar utente (30px, bordo sottile)
- `box-shadow: --shadow-sidebar`

### Fly-out (hover su sidebar o su singola voce)
- Si sovrappone al contenuto (position absolute/fixed, non sposta il layout)
- Larghezza: `220px`, `background: #111d35`
- Mostra: logo testuale "AEA Consulenze / Portale Clienti", etichette complete di tutti gli strumenti con icone
- Voce attiva: `border-left: 3px solid #ff7e2e`, `background: rgba(255,126,46,0.15)`, testo `#ff9f4f`
- In fondo: sezione utente con email + logout icon
- Transizione: `width 0.22s ease` (o opacity+transform per fly-out overlay)
- A 900–1279px: niente fly-out, solo tooltip (`title` nativo o piccolo tooltip CSS) sull'hover delle icone

### Topbar
- Altezza: `52px`, `background: white`, `border-bottom: 1px solid #eaecf0`, `box-shadow: 0 1px 3px rgba(12,19,38,0.04)`
- Sinistra: breadcrumb `Strumenti / [Nome strumento]` (colori: muted → bold)
- Destra: pulsante "Archivio" (border, ghost) + pulsante "Nuova Ricetta" (arancio, `box-shadow: 0 2px 8px rgba(255,126,46,0.3)`)
- Nel NutrizionaleCalc la destra include anche il toggle `[Guidato][Esperto]`

---

## 4. NutrizionaleCalc — Layout split-screen

### Struttura pagina
```
[Topbar con toggle Guidato/Esperto]
[Split panel]
  ├── [Pannello Form — sinistra]
  └── [Pannello Tabella live — destra]
```

### Pannello form (sinistra)
- `background: white`, `border-radius: 12px`, `box-shadow: --shadow-card`
- Sezioni interne: RICETTA, INGREDIENTI, ADDITIVI — titoli in `#ff7e2e`, `font-size: 10px`, `font-weight: 700`, `letter-spacing: 0.6px`
- Campi input: `background: #f8f9fb`, `border: 1.5px solid #dde2ea`, `border-radius: 7px`; focus: `border-color: #ff7e2e`, `box-shadow: 0 0 0 3px rgba(255,126,46,0.08)`
- Righe ingredienti: `background: #f8f9fb`, `border-radius: 7px`, `padding: 6px 8px` con nome / grammi / % QUID / pulsante rimozione
- Riga aggiunta ingrediente: bordo tratteggiato `1.5px dashed #dde2ea`

### Pannello tabella live (destra)
- `background: white`, `border-radius: 12px`, `box-shadow: --shadow-card`
- Tab switcher in cima: EU / USA / Canada / Australia / Arabi — pill background `#f4f6f9`, voce attiva `background: white`, `box-shadow: 0 1px 2px rgba(0,0,0,0.07)`
- Tabella EU: intestazione `background: #1a1f2e`, energia evidenziata `color: #ff7e2e`
- Debounce aggiornamento: 300ms dall'ultima modifica agli ingredienti
- Pulsante "Esporta PDF": full-width, `background: #0c1326`, fondo del pannello

### Breakpoints
| Breakpoint | Form | Tabella | Sidebar |
|---|---|---|---|
| ≥ 1280px | 50% | 50% | 48px + fly-out hover |
| 900–1279px | 55% | 45% | 48px, solo tooltip |
| < 900px | 100% (sopra) | 100% (sotto, scroll) | Nascosta → hamburger topbar |

---

## 5. Toggle Guidato / Esperto

### Posizione
In topbar a destra — visibile solo nel NutrizionaleCalc. Componente: `ModeToggle.tsx` (nuovo, ~40 righe).

### Struttura
```tsx
<div className="mode-toggle">
  <button className={mode === 'guided' ? 'active-guided' : ''} onClick={() => setMode('guided')}>
    Guidato
  </button>
  <button className={mode === 'expert' ? 'active-expert' : ''} onClick={() => setMode('expert')}>
    Esperto
  </button>
</div>
```

### Persistenza
`localStorage` con chiave `aea_ui_mode` (separata da `aea_user`). Default: `'guided'` per nuovi utenti.

### Modalità Guidata
- Step indicator orizzontale visibile (4 step: Ricetta → Ingredienti → Additivi → Tabelle)
- Solo i campi dello step corrente sono visibili nel pannello form
- Callout contestuale per ogni step: `background: rgba(255,126,46,0.06)`, `border: 1px solid rgba(255,126,46,0.2)`
- Tabella live disabilitata (`opacity: 0.5`, `pointer-events: none`) nello step 1; attiva e aggiornata in tempo reale dagli step 2 in poi
- Pulsanti navigazione: "← Indietro" (ghost) + "Avanti →" (arancio primario)
- Validazione step: non si avanza se il peso finito è 0 (banner rosso esistente mantenuto)

### Modalità Esperta
- Nessun step indicator
- Tutti i campi visibili subito, organizzati in sezioni collassabili (chevron)
- Sezioni: RICETTA (aperta di default) / INGREDIENTI (aperta) / ADDITIVI (chiusa se vuota)
- Tabella live sempre attiva
- Nessun callout contestuale

---

## 6. File da creare / modificare

### Nuovi file
| File | Descrizione |
|---|---|
| `src/components/ModeToggle.tsx` | Toggle Guidato/Esperto, ~40 righe |
| `src/calculators/NutrizionaleCalc/SplitShell.tsx` | Wrapper split-screen, gestisce breakpoint |
| `src/calculators/NutrizionaleCalc/FormPanel.tsx` | Pannello form (estrae logica da NutrizionaleCalc.tsx) |
| `src/calculators/NutrizionaleCalc/TablePanel.tsx` | Pannello tabella live + tab switcher |

### File modificati
| File | Modifica |
|---|---|
| `src/index.css` | Aggiunta token, classi `.sidebar-collapsed`, `.flyout`, `.mode-toggle`, `.split-panel`, `.form-section` |
| `src/components/AppShell.tsx` | Nuova sidebar collassata + fly-out |
| `src/components/Sidebar.tsx` | Refactor per supportare stato collapsed/expanded |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` | Integra SplitShell, ModeToggle; estrae sezioni in sotto-componenti |

### File NON toccati
- `src/engines/nutritionalEngine.ts`
- `src/logic/localizationModule.ts`
- `src/utils/validation.ts`
- Tutti i calcolatori diversi da NutrizionaleCalc (ereditano solo il nuovo shell)
- `public/data/ingredientsDB.json`

---

## 7. Classi CSS da aggiungere a index.css

```css
/* Sidebar */
.sidebar-collapsed { width: var(--sidebar-collapsed-width); }
.sidebar-flyout { width: var(--sidebar-expanded-width); position: absolute; left: 48px; ... }
.sidebar-nav-item { /* icon + hover state */ }
.sidebar-nav-item.active { /* orange highlight + dot */ }

/* Topbar */
.topbar { height: var(--topbar-height); ... }

/* Split panel */
.split-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 1279px) { .split-panel { grid-template-columns: 55fr 45fr; } }
@media (max-width: 899px)  { .split-panel { grid-template-columns: 1fr; } }

/* Mode toggle */
.mode-toggle { display: flex; background: var(--toggle-bg); border-radius: 8px; padding: 3px; }
.mode-toggle button.active-guided { background: var(--toggle-active-guidato); color: white; }
.mode-toggle button.active-expert  { background: var(--toggle-active-esperto); color: white; }

/* Form sections */
.form-section-title { color: var(--color-orange); font-size: 10px; font-weight: 700; letter-spacing: 0.6px; }
.ingredient-row { background: #f8f9fb; border-radius: 7px; padding: 6px 8px; border: 1px solid var(--color-surface); }

/* Step indicator (guided mode) */
.step-indicator { display: flex; align-items: center; }
.step-dot { width: 22px; height: 22px; border-radius: 50%; ... }
.step-dot.active { background: var(--color-orange); }
.step-dot.done   { background: var(--color-green); }
.step-dot.pending { background: var(--color-surface); border: 2px solid var(--color-border); }

/* Guided callout */
.guided-callout { background: rgba(255,126,46,0.06); border: 1px solid rgba(255,126,46,0.2); border-radius: 7px; padding: 8px 10px; }
```

---

## 8. Fuori scope

- Redesign interno degli altri 6 strumenti (ereditano solo shell)
- Dark mode
- Mobile <600px
- Animazioni complesse (solo transizioni CSS semplici)
- Modifica alla logica di calcolo o validazione
