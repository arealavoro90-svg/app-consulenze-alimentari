# Responsive Fix — NutrizionaleCalc
**Data:** 2026-05-18  
**Approccio:** Opzione C — CSS breakpoint + micro-fix TSX

---

## Problema
Su laptop a finestra ridotta (~900–1200px) diversi elementi escono dal viewport:
- Wizard: step header, grid input, ingredienti row
- Tab nazioni (UE/USA/Canada/Australia/Arabi)
- Sub-tab (Verticale/Orizzontale/Lineare)
- Tabelle nutrizionali e riepilogo ingredienti

A schermo intero tutto funziona. Il problema è alle larghezze intermedie.

---

## Soluzione

### 1. `src/index.css` — due nuovi breakpoint

#### `@media (max-width: 1100px)`
- `.nation-tab-bar button` → `font-size: 12px; padding: 6px 4px`
- `.subtab-bar button` → `font-size: 11px; padding: 4px 8px`
- `.wizard-step-label` → `display: none` (restano solo i cerchi)
- `.pesocard-grid` → `grid-template-columns: 1fr`

#### `@media (max-width: 900px)`
- `.nation-tab-bar` → `gap: 4px`; button `flex-shrink: 0; min-width: 60px`
- `.nutri-table-wrapper` → `overflow-x: auto; -webkit-overflow-scrolling: touch`
- `.serving-grid` → `grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))`

### 2. `NutrizionaleCalc.tsx` — 4 micro-fix inline

| Target | Modifica |
|---|---|
| Input €/kg e Resa% (ingredienti row) | `width: 150px` → `width: 'min(150px, 100%)'` |
| Grid step wizard componente | aggiunge `flexWrap: 'wrap'` |
| Tabella wizard `minWidth: 520` | → `minWidth: 420` |
| Wrapper tabella riepilogo ingredienti | aggiunge classe `nutri-table-wrapper` |

### 3. Classi CSS da aggiungere ai tag JSX
- `className="nutri-table-wrapper"` sul div wrapper delle tabelle nutrizionali
- `className="wizard-step-label"` sulle label degli step
- `className="pesocard-grid"` sul grid peso/peso-specifico
- `className="subtab-bar"` sul div dei sub-tab

---

## Vincoli
- Nessun nuovo CSS framework
- Nessuna dipendenza aggiuntiva
- A schermo intero: zero differenze visive rispetto a oggi
