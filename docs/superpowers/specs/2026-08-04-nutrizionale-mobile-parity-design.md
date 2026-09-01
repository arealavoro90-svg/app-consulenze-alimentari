# Spec: NutrizionaleCalc — Parità e Unificazione Mobile/Desktop

**Data:** 2026-08-04  
**Obiettivo:** Commercializzazione settembre 2026  
**Approccio:** Gap-first (Approccio A) — mantieni due componenti, colma i gap  
**Desktop = reference visivo e funzionale**

---

## Contesto

Due componenti separati servono la stessa route in base al breakpoint 768px:
- `NutrizionaleCalc.tsx` (≥768px) — 2081r, monolite
- `NutrizionaleCalcMobile.tsx` (<768px) — 601r + 4 sub-tab in `mobile/`

Il mobile manca di alcune feature funzionali e ha codice duplicato rispetto al desktop.

---

## Gap da colmare

### GAP-1 — `isLiquid` toggle (normativo)

**Problema:** `isLiquid` è già in `TabellaTab.tsx:423` come `useState(false)` e già passato a `calcClaims` a riga 589. Manca solo il toggle UI.

**Fix:** Aggiungere checkbox "Prodotto liquido" nel `TabellaTab`, visibile sopra la chip-bar regioni quando `hasData`. Stessa logica del desktop.

**File:** `src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx`  
**Impatto:** 3-5 righe aggiunte

---

### GAP-2 — `postCottura` + `acquaAggiunta` flags (normativo)

**Problema:** I campi esistono già in `RecipeRow` (engine `nutrizionaleCalcEngine.ts:47-48`) e il desktop li mostra nel blocco espanso. Nel mobile `RecipeRowItem` il blocco espanso ha solo €/kg e Resa%.

**Fix:** Aggiungere nel blocco espanso di `RecipeRowItem` (in `CalcoloTab.tsx`):
- Checkbox `postCottura` condizionale a `row.ing.alcol > 0`
- Checkbox `acquaAggiunta` condizionale a `row.ing.acqua > 90`

Usare `onUpdate(compId, row.id, { postCottura: !row.postCottura })` (già supportato da `updateRow` in `NutrizionaleCalcMobile.tsx`).

**File:** `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx`  
**Impatto:** ~15 righe nel blocco `{expanded && ...}`

---

### GAP-3 — `InfoTooltip` condiviso

**Problema:** `InfoTooltip` è una funzione locale in `NutrizionaleCalc.tsx:94-171`. Non disponibile in mobile.

**Fix:** Estrarre in `src/calculators/NutrizionaleCalc/InfoTooltip.tsx`. Aggiornare import in `NutrizionaleCalc.tsx`. Importare in `CalcoloTab.tsx` e aggiungere sui campi:
- `pesoFinito_g` → "Peso del prodotto finito dopo cottura/lavorazione in grammi"
- `specificGravity` → "Peso specifico per prodotti liquidi (g/ml). Lascia vuoto per prodotti solidi."
- `€/kg` → stesso testo del desktop: "Costo dell'ingrediente per kg, IVA esclusa..."
- `Resa %` → stesso testo del desktop: "Percentuale di peso rimanente dopo cottura..."

**File:** nuovo `InfoTooltip.tsx`, edit `NutrizionaleCalc.tsx`, edit `CalcoloTab.tsx`  
**Impatto:** nuovo file ~30r, edit minimi

---

### GAP-4 — `ValidationError` in mobile

**Problema:** `src/components/ValidationError.tsx` già esiste. Non importato in CalcoloTab.

**Fix:** Importare `ValidationError` in `CalcoloTab.tsx`, aggiungere sotto:
- Input `pesoFinito_g` — usa `validateFinishedWeight`
- Input grammi ingrediente — usa `validateIngredientQuantity`

**File:** `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx`  
**Impatto:** import + ~6 righe

---

### GAP-5 — `ExportOptionsModal` estratto (manutenibilità)

**Problema:** `ExportOptionsModal` (~230r) è inline in `TabellaTab.tsx` (righe 196-401). Duplica la logica di `DownloadTableModal.tsx` del desktop. Se uno viene aggiornato, l'altro si desincronizza silenziosamente.

**Fix:** Estrarre `ExportOptionsModal` da `TabellaTab.tsx` a file proprio `src/calculators/NutrizionaleCalc/ExportOptionsModal.tsx`. Zero modifica alla logica o all'interfaccia. `TabellaTab.tsx` lo importa. 

Nota: non sostituire con `DownloadTableModal` perché quest'ultimo usa layout desktop-oriented (860px wide, opzioni a sinistra/preview a destra) incompatibile con mobile. L'`ExportOptionsModal` usa invece `SegmentedControl` e layout verticale mobile-friendly.

**File:** nuovo `ExportOptionsModal.tsx`, edit `TabellaTab.tsx`  
**Impatto:** TabellaTab −230r, nuovo file +230r + imports

---

### GAP-6 — CSS token unificati

**Problema:** `mobile.css` definisce `--m-orange`, `--m-navy`, `--m-border` etc. con valori hardcoded identici a `--color-orange`, `--color-navy`, `--color-border` in `index.css`. Doppia definizione → rischio drift brand.

**Fix:** In `mobile.css`, nel blocco `:root`, rimappare i token brand su quelli desktop:
```css
--m-orange:       var(--color-orange);
--m-navy:         var(--color-navy);
--m-border:       var(--color-border);
--m-surface:      var(--color-surface);
--m-bg:           var(--color-bg, #faf7f4);
--m-text:         var(--color-text);
--m-text-muted:   var(--color-text-muted);
```
I token mobile-specifici (`--m-topbar-h`, `--m-tabbar-h`, `--m-radius-*`, colori derivati come `--m-orange-hover`) rimangono in `mobile.css`.

**Prerequisito:** verificare che tutti i `--color-*` referenziati esistano in `index.css` prima di applicare.

**File:** `src/styles/mobile.css`  
**Impatto:** ~8 righe modificate

---

## Fuori scope

- `mob-bottom-bar` in `NutrizionaleCalc.tsx` — non toccare (uso tablet)
- Refactor architetturale (single responsive component, shared sub-components) — post-launch
- Merge `DownloadTableModal` + `ExportOptionsModal` in unico componente — post-launch

---

## Ordine implementazione

1. GAP-3 (InfoTooltip.tsx — prerequisito per GAP-2 e GAP-4)
2. GAP-5 (ExportOptionsModal.tsx — alleggerisce TabellaTab prima di toccarla)
3. GAP-1 (isLiquid toggle in TabellaTab)
4. GAP-2 (postCottura/acquaAggiunta in CalcoloTab)
5. GAP-4 (ValidationError in CalcoloTab)
6. GAP-6 (CSS token mapping)

---

## Verifica

Dopo ogni file modificato:
- `npx tsc -b` verde
- `npm run lint` verde
- `npm test` verde (se toccato engine o calcoli)
