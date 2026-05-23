# Responsive Fix — NutrizionaleCalc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare tutti gli elementi che escono dalla pagina quando si riduce la finestra del browser su laptop.

**Architecture:** Opzione C — CSS breakpoints in `index.css` per i pattern ripetuti + micro-fix inline in `NutrizionaleCalc.tsx` per i `minWidth` e font-size hard-coded che il CSS non può sovrascrivere senza `!important`.

**Tech Stack:** React 19 + TypeScript + Vite, CSS inline + index.css, no framework CSS aggiuntivo.

---

## File modificati

- **Modify:** `src/index.css` — aggiunta di breakpoint `@media (max-width: 1100px)` e `@media (max-width: 900px)`
- **Modify:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` — aggiunta `className` su 5 elementi + 3 micro-fix inline

---

## Task 1: Aggiunta classi CSS agli elementi target in TSX

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 1: Riga 1366 — Aggiungere `className="wizard-step-label"` alla label dello step wizard**

Trovare:
```tsx
<span style={{
    fontSize: 12, fontWeight: 700,
    color: i < wizardStep ? 'var(--color-green)' : i === wizardStep ? 'var(--color-navy)' : 'var(--color-text-dim)',
    whiteSpace: 'nowrap',
}}>
    {s.label}
</span>
```
Sostituire con:
```tsx
<span className="wizard-step-label" style={{
    fontSize: 12, fontWeight: 700,
    color: i < wizardStep ? 'var(--color-green)' : i === wizardStep ? 'var(--color-navy)' : 'var(--color-text-dim)',
    whiteSpace: 'nowrap',
}}>
    {s.label}
</span>
```

- [ ] **Step 2: Riga 1421 — Aggiungere `className="pesocard-grid"` al grid peso/pesospecifico**

Trovare:
```tsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
```
Sostituire con:
```tsx
<div className="pesocard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
```

- [ ] **Step 3: Riga 2276 — Aggiungere `nation-tab-btn` alla className dei button nazioni**

Trovare:
```tsx
className={`btn ${activeTab === t ? 'btn-primary' : 'btn-outline'}`}
style={{ fontSize: 14, fontWeight: 600, padding: '8px 0', flex: 1, textAlign: 'center', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
```
Sostituire con:
```tsx
className={`btn nation-tab-btn ${activeTab === t ? 'btn-primary' : 'btn-outline'}`}
style={{ fontWeight: 600, flex: 1, textAlign: 'center', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
```
*(fontSize e padding escono dall'inline style — li gestisce il CSS)*

- [ ] **Step 4: Riga 2285 — Aggiungere `className="nutri-results-wrapper"` al wrapper delle tabelle nutrizionali (modalità avanzata)**

Trovare (riga ~2285, dopo la nation-tab-bar):
```tsx
<div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '16px 20px' }}>
    {/* Serving inputs for the active nation */}
```
Sostituire con:
```tsx
<div className="nutri-results-wrapper" style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '16px 20px' }}>
    {/* Serving inputs for the active nation */}
```

- [ ] **Step 5: Riga 2582 in TabUSA — Aggiungere `className="subtab-bar"` al div dei sub-tab**

Trovare (dentro `TabUSA`):
```tsx
<div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
    {(['verticale', 'orizzontale', 'lineare'] as SubTab[]).map(t => (
        <button key={t} onClick={() => setSubTab(t)} className={`btn ${subTab === t ? 'btn-accent' : 'btn-outline'}`} style={{ fontSize: 11, padding: '5px 10px' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
```
Sostituire con:
```tsx
<div className="subtab-bar" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
    {(['verticale', 'orizzontale', 'lineare'] as SubTab[]).map(t => (
        <button key={t} onClick={() => setSubTab(t)} className={`btn ${subTab === t ? 'btn-accent' : 'btn-outline'}`} style={{ fontSize: 11, padding: '5px 10px' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
```

- [ ] **Step 6: Stessa modifica per TabCanada (riga ~2720)**

Trovare (dentro `TabCanada`, stessa struttura):
```tsx
<div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
    {(['verticale', 'orizzontale', 'lineare'] as SubTab[]).map(t => (
        <button key={t} onClick={() => setSubTab(t)} className={`btn ${subTab === t ? 'btn-accent' : 'btn-outline'}`} style={{ fontSize: 11, padding: '5px 10px' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
```
Sostituire con:
```tsx
<div className="subtab-bar" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
    {(['verticale', 'orizzontale', 'lineare'] as SubTab[]).map(t => (
        <button key={t} onClick={() => setSubTab(t)} className={`btn ${subTab === t ? 'btn-accent' : 'btn-outline'}`} style={{ fontSize: 11, padding: '5px 10px' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
```

- [ ] **Step 7: Verificare che la build non abbia errori**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build 2>&1 | tail -5
```
Risultato atteso: `✓ built in X.XXs`

---

## Task 2: Micro-fix inline in TSX (dimensioni hard-coded)

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 1: Riga 1527 — Ridurre `minWidth` della tabella wizard da 520 a 420**

Trovare:
```tsx
<table className="table" style={{ width: '100%', minWidth: 520 }}>
```
Sostituire con:
```tsx
<table className="table" style={{ width: '100%', minWidth: 420 }}>
```

- [ ] **Step 2: Riga 2082 — Input €/kg: width fisso → min()**

Trovare:
```tsx
className="form-input" style={{ width: 150 }} />
```
*(quello dopo il placeholder "default: 0" per €/kg)*

Sostituire con:
```tsx
className="form-input" style={{ width: 'min(150px, 100%)' }} />
```

- [ ] **Step 3: Riga 2091 — Input Resa%: stessa modifica**

Trovare:
```tsx
className="form-input" style={{ width: 150 }} />
```
*(quello dopo `updateResa`)*

Sostituire con:
```tsx
className="form-input" style={{ width: 'min(150px, 100%)' }} />
```

- [ ] **Step 4: Verificare che la build non abbia errori**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build 2>&1 | tail -5
```
Risultato atteso: `✓ built in X.XXs`

---

## Task 3: Aggiunta breakpoint CSS in index.css

**File:** `src/index.css`

Aggiungere DOPO il blocco `/* ── Mobile (≤768px) ── */` (riga 1142) e PRIMA di `/* ── Login tablet adjust (≤1024px) ── */`.

- [ ] **Step 1: Aggiungere breakpoint @media (max-width: 1100px)**

Aggiungere dopo la riga `}` che chiude il blocco `@media (max-width: 768px)`:

```css
/* ── Laptop ridotto (≤1100px) ── */
@media (max-width: 1100px) {
  /* Nation tab buttons: font e padding ridotti */
  .nation-tab-btn {
    font-size: 12px !important;
    padding: 6px 4px !important;
  }

  /* Sub-tab (Verticale/Orizzontale/Lineare): più compatti */
  .subtab-bar button {
    font-size: 10px !important;
    padding: 4px 7px !important;
  }

  /* Wizard step labels: nascosti, restano solo i cerchi */
  .wizard-step-label {
    display: none;
  }

  /* Grid peso prodotto: da 2 colonne a 1 */
  .pesocard-grid {
    grid-template-columns: 1fr !important;
  }

  /* Wrapper risultati nutrizionali: scroll orizzontale */
  .nutri-results-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}

/* ── Laptop molto ridotto (≤900px) ── */
@media (max-width: 900px) {
  /* Nation tabs: scroll orizzontale, button non si comprimono */
  .nation-tab-bar {
    gap: 4px;
  }
  .nation-tab-btn {
    font-size: 11px !important;
    padding: 5px 6px !important;
    flex-shrink: 0 !important;
    min-width: 55px !important;
    flex: 0 1 auto !important;
  }

}
```

- [ ] **Step 2: Verificare build**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build 2>&1 | tail -5
```
Risultato atteso: `✓ built in X.XXs`

- [ ] **Step 3: Test visivo — aprire localhost e ridurre la finestra**

```bash
open http://localhost:5173
```

Checklist visiva da verificare riducendo la finestra da schermo intero fino a ~900px:
- [ ] Tab nazioni (UE/USA/Canada/Australia/Arabi) rimangono nella pagina
- [ ] Sub-tab (Verticale/Orizzontale/Lineare) rimangono nella pagina
- [ ] Step wizard (1-2-3-4) mostrano solo i cerchi, senza label che escono
- [ ] Grid peso prodotto / peso specifico va su colonna singola
- [ ] Tabelle nutrizionali scorrono orizzontalmente senza rompere il layout
- [ ] Input €/kg e Resa% non escono dalla riga ingrediente
- [ ] A schermo intero non ci sono differenze visive rispetto a prima

---

## Task 4: Commit

- [ ] **Step 1: Commit delle modifiche**

```bash
cd /Users/novanta/Desktop/APP/App_prova
git add src/index.css src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx docs/superpowers/
git commit -m "fix: responsive layout per laptop a finestra ridotta

- Aggiunti breakpoint CSS 1100px e 900px in index.css
- Nation tab buttons: font/padding responsivi via classe nation-tab-btn
- Wizard step labels nascosti a 1100px, restano cerchi numerati
- Grid peso prodotto collassa a 1 colonna a 1100px
- Input €/kg e Resa%: width min(150px, 100%)
- Tabelle nutrizionali: scroll orizzontale nel wrapper
- minWidth tabella wizard ridotto da 520 a 420

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
