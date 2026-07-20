# Spec: Redesign Mobile — Tool Valori Nutrizionali

**Data:** 2026-07-20  
**Stato:** Approvato  
**Scope:** Refactor completo di `NutrizionaleCalcMobile.tsx` e cartella `mobile/`

---

## Contesto

Il tool nutrizionale desktop (split-panel, 2879 linee) è completo e funzionante. Esiste già una versione mobile (`NutrizionaleCalcMobile.tsx`, 621 linee + `mobile/` subfolder con 4 tab) ma il layout è incompleto e non replica fedelmente tutte le feature del desktop. L'obiettivo è un redesign impeccabile: più fluido, intuitivo, con parità funzionale rispetto al desktop.

---

## Architettura

### Navigazione — 3 tab bottom nav

```
┌─────────────────────────────────────┐
│            Content area             │
├─────────┬───────────────────────────┤
│ ✏️ Editor │ 📊 Tabelle │ 💾 Archivio │
└─────────┴───────────────────────────┘
```

Sostituisce i 4 tab attuali (Calcolo / Tabella / Riepilogo / Archivio). Il "Riepilogo" confluisce nell'Editor come sezione accordion.

---

## Tab 1 — Editor

Scroll verticale unico. Sezioni in ordine:

### 1. Smart Import Hero
- Banner navy con gradient, identico al desktop
- Due CTA: `✨ Smart import` (apre `SmartImportModal`) e `📁 Archivio` (switcha al tab Archivio)
- Visibile solo se zero ingredienti; si nasconde non appena c'è almeno un componente

### 2. Accordion — Prodotto & Pesi
- **Aperto di default**
- Campi: `Nome prodotto` (text), `Peso finito (g)` (number), `Peso specifico (ml/g)` (number, opzionale, solo liquidi)
- Warning badge rosso se peso finito > somma grammi ingredienti (stesso comportamento desktop)

### 3. Accordion — Componenti
- **Aperto di default**
- Navigator swipe inline: `‹ [n · Nome componente] ›` + pulsante `+` per aggiungere componente
- Per ogni componente:
  - Nome componente (text input) + Pz/UV (number)
  - Search bar ingrediente → apre `BrowseIngredientsModal` (modale fullscreen)
  - Lista ingredienti: riga per riga con nome, grammi, expand row per resa/€/kg/flags
  - Pulsante `+ Additivo` (identico al desktop)
  - Pulsante `🗑` rimuovi componente (se componenti > 1)
- Badge contatore componenti nell'header accordion

### 4. Accordion — Allergeni & Additivi
- **Chiuso di default**, badge con allergeni presenti
- Checkbox allergeni + cross-contamination (stesso layout desktop, in griglia 2 colonne)
- Lista additivi aggiunti (chip removibili)

### 5. Accordion — Porzioni per nazione
- **Chiuso di default**
- Sub-sezioni collapsibili per ogni nazione (UE / USA / Canada / Australia / Arabi)
- Ogni sub-sezione: stessi input del desktop (porzione, confezione, pezzo, serving ref, measure)

### 6. Sezione Riepilogo (in fondo, non accordion)
- Toggle Quantità / Costi
- Tabella ingredienti mergiati (scroll orizzontale)
- KPI card: Costo UV / Costo KG / Fabbisogno

---

## Tab 2 — Tabelle

### Pill selector nazioni
```
[🇪🇺 UE] [🇺🇸 USA] [🇨🇦 CA] [🇦🇺 AU] [🌙 AR]
```
- Scrollabile orizzontalmente se non entrano
- Pill attiva: background `#0c1326`, colore bianco

### Subtab per nazione
- **UE:** `Per 100 g` / `Porzione` / `Pezzo`
- **USA/Canada/Arabi:** `Verticale` / `Orizzontale` / `Lineare`
- **Australia:** nessun subtab (layout unico)

### Serving sizes inline (collapsibile)
- Accordion compatto sopra la tabella
- Mostra i campi serving della nazione attiva
- Aperto di default solo se ancora vuoti

### Tabella nutrizionale
- Riusa i componenti `TabUE`, `TabUSA`, `TabCanada`, `TabAustralia`, `TabArabi` **senza modifiche**
- Scroll verticale + orizzontale (overflow-x: auto) per tabelle larghe
- Safe area inset bottom

### Footer azioni
- `⬇️ Scarica tabella` → apre `DownloadTableModal`
- `⚙️ Configura nutrienti` → apre `NutrientSelectModal` (solo UE, se facoltativi attivi)
- `☑ Mostra valori facoltativi` (solo UE)

---

## Tab 3 — Archivio

- Search bar in cima
- Sezioni temporali: Recenti / Questo mese / Più vecchi
- Card per ricetta: nome, badge nazioni configurate, metadata (n ingredienti, peso, data)
- Azioni per card: `▶ Carica` (carica in Editor), `🗑 Elimina` (con conferma)
- Pulsante `+` in topbar → equivalente a "Nuova ricetta" (reset Editor)

---

## Riuso componenti

| Componente | Azione |
|---|---|
| `TabUE.tsx`, `TabUSA.tsx`, `TabCanada.tsx`, `TabAustralia.tsx`, `TabArabi.tsx` | **Invariati** — stesse props, stesso output |
| `SmartImportModal.tsx` | Riusato as-is |
| `BrowseIngredientsModal.tsx` | Riusato as-is |
| `DownloadTableModal.tsx` | Riusato as-is |
| `NutrientSelectModal.tsx` | Riusato as-is |
| `nutrizionaleCalcEngine.ts` | Invariato |
| `nutritionalRounding.ts` | Invariato |
| `sessionBridge.ts` | Riusato (stessa serializzazione archivio) |
| `src/styles/mobile.css` | Esteso con nuovi token se necessario |

---

## State management

Tutto lo stato vive in `NutrizionaleCalcMobile.tsx` (root). I tab ricevono props + callback. Nessun context provider aggiuntivo (YAGNI).

State da mantenere:
- `productName`, `finishedWeight`, `specificGravity`
- `components: Component[]` (stessa interfaccia del desktop)
- `activeComponentIdx: number` (per swipe navigator)
- `activeTab: 'editor' | 'tabelle' | 'archivio'`
- `activeNation: NationTab` (UE/USA/CA/AU/AR)
- `ue, usa, ca, au, arabi` (serving sizes per nazione)
- `activeSubTab` per nazione attiva
- `allergyStates`, `crossStates`, `additiveChips`
- `showOptionals`, `selectedOptionals`
- `openAccordions: Set<string>` (quali accordion sono aperti)

---

## File da modificare / creare

| File | Azione |
|---|---|
| `NutrizionaleCalcMobile.tsx` | **Refactor completo** — nuova struttura 3 tab |
| `mobile/EditorTab.tsx` | **Nuovo** (sostituisce `CalcoloTab.tsx`) |
| `mobile/TabelleTab.tsx` | **Refactor** di `TabellaTab.tsx` — pill + serving inline |
| `mobile/ArchivioTab.tsx` | **Refactor** minore — aggiunge sezioni temporali |
| `mobile/CalcoloTab.tsx` | **Eliminato** (mergiato in EditorTab) |
| `mobile/RiepilogoTab.tsx` | **Eliminato** (mergiato in EditorTab come sezione) |
| `mobile/ToolsTab.tsx` | **Eliminato** (non necessario) |

---

## Vincoli

- Zero nuove dipendenze
- Tailwind 4 per eventuali nuovi stili inline; `mobile.css` per token custom
- Zero `any` impliciti, zero `@ts-ignore`
- `npm test` verde, `npx tsc -b` zero errori prima di dichiarare completato
- Non toccare `TabUE/USA/CA/AU/AR` — sono classificati come "intoccabili"
- Non toccare engine e logic esistenti

---

## Criteri di completamento

1. Le 3 tab navigano correttamente senza regressioni
2. Tutti e 5 gli standard nutrizionali mostrano la tabella corretta
3. Smart Import funziona dall'Editor
4. Archivio: salva, carica, elimina ricette
5. Componenti multipli navigabili con lo swipe navigator
6. `npx tsc -b` e `npm run lint` zero errori
7. `npm test` verde
