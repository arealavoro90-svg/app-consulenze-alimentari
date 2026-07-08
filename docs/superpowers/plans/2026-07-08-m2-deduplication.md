# M2 — Deduplicazione logica condivisa NutrizionaleCalc

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare ~650 righe di codice duplicato tra desktop e mobile senza modificare alcun comportamento, calcolo o UX.

**Architecture:** Nuovo file `shared/constants.ts` per costanti condivise; mobile importa `calcNutrients`/`scaleResult` dall'engine già testato; tipi mobile allineati a quelli dell'engine. Archivio (Sezione 3 spec) DIFFERITA — tipi `ArchiveData` e `MobileArchiveEntry` sono strutturalmente incompatibili, richiedono design separato.

**Tech Stack:** TypeScript, React 19, Vitest (17 test esistenti)

---

## File map

| Operazione | File |
|-----------|------|
| **CREA** | `src/calculators/NutrizionaleCalc/shared/constants.ts` |
| **MODIFICA** | `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` |
| **MODIFICA** | `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` |
| **MODIFICA** | `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx` |
| **INVARIATI** | Tab*.tsx, SplitShell.tsx, nutrizionaleCalcEngine.ts, tutti gli altri |

---

## Task 1: Crea shared/constants.ts

**Files:**
- Create: `src/calculators/NutrizionaleCalc/shared/constants.ts`

- [ ] **Step 1.1: Crea il file con le 4 costanti**

```typescript
// src/calculators/NutrizionaleCalc/shared/constants.ts
// Costanti condivise tra NutrizionaleCalc (desktop) e NutrizionaleCalcMobile + CalcoloTab (mobile).
// Fonte di verità unica: modifica qui si propaga a entrambi i tree.

import type { DBIngredient } from '../../../engines/nutrizionaleCalcEngine';

export const ALLERGEN_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'all_glutine', label: 'GLUTINE' },
    { key: 'all_grano', label: 'GRANO' },
    { key: 'all_crostacei', label: 'CROSTACEI' },
    { key: 'all_uova', label: 'UOVA' },
    { key: 'all_pesci', label: 'PESCE' },
    { key: 'all_arachidi', label: 'ARACHIDI' },
    { key: 'all_soia', label: 'SOIA' },
    { key: 'all_latte', label: 'LATTE' },
    { key: 'all_frutta_guscio', label: 'FRUTTA A GUSCIO' },
    { key: 'all_anacardi', label: 'ANACARDI' },
    { key: 'all_solfiti', label: 'SOLFITI (>10 ppm)' },
    { key: 'all_lupini', label: 'LUPINI' },
    { key: 'all_molluschi', label: 'MOLLUSCHI' },
];

export const CROSS_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'cross_glutine', label: 'GLUTINE' },
    { key: 'cross_grano', label: 'GRANO' },
    { key: 'cross_crostacei', label: 'CROSTACEI' },
    { key: 'cross_uova', label: 'UOVA' },
    { key: 'cross_pesci', label: 'PESCE' },
    { key: 'cross_arachidi', label: 'ARACHIDI' },
    { key: 'cross_soia', label: 'SOIA' },
    { key: 'cross_latte', label: 'LATTE' },
    { key: 'cross_frutta_guscio', label: 'FRUTTA A GUSCIO' },
    { key: 'cross_anacardi', label: 'ANACARDI' },
    { key: 'cross_sedano', label: 'SEDANO' },
    { key: 'cross_senape', label: 'SENAPE' },
    { key: 'cross_sesamo', label: 'SESAMO' },
    { key: 'cross_solfiti', label: 'SOLFITI' },
    { key: 'cross_lupini', label: 'LUPINI' },
    { key: 'cross_molluschi', label: 'MOLLUSCHI' },
];

export const ADDITIVI_CATEGORIE = [
    'addensante', 'agente di rivestimento', 'agente di trattamento della farina',
    'agente lievitante', 'antiagglomerante', 'antiossidante', 'conservante',
    'correttore di acidità', 'edulcorante', 'emulsionante', 'esaltatore di sapidità',
    'gas per confezionamento', 'gas propellente', 'lecitina di girasole bio',
    'lecitina di soia bio', 'lucidante', 'rassodante', 'sbiancante', 'schiumogeno',
    'stabilizzante del colore', 'stabilizzatore di schiuma', 'umettante',
] as const;

// NOTA: copiare l'intero oggetto ADDITIVI_SPECIFICI da NutrizionaleCalc.tsx:185-317.
// Incollarlo qui mantenendo l'identico contenuto (nessuna modifica ai valori).
export const ADDITIVI_SPECIFICI: Record<string, string[]> = {
    // → COPIA DA NutrizionaleCalc.tsx righe 185-317 ←
};
```

- [ ] **Step 1.2: Popola ADDITIVI_SPECIFICI**

Apri `NutrizionaleCalc.tsx`, copia il contenuto dell'oggetto `ADDITIVI_SPECIFICI` (righe 185–317, il blocco completo con tutte le categorie e i loro array di stringhe) e incollalo nel `{}` del file appena creato.

**Verifica:** `ADDITIVI_SPECIFICI` nel nuovo file deve avere esattamente le stesse chiavi e gli stessi array di `NutrizionaleCalc.tsx`. Se i valori differiscono da `CalcoloTab.tsx`, usare come source of truth `NutrizionaleCalc.tsx` (versione desktop = più aggiornata).

- [ ] **Step 1.3: Verifica type-check**

```bash
npx tsc --noEmit
```

Expected: zero errori. Il file nuovo non è ancora importato da nessuno, quindi eventuali errori indicano un problema nel file stesso (import path errato, contenuto malformato).

---

## Task 2: Aggiorna NutrizionaleCalc.tsx (desktop)

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx:36-40` (import block) e righe 44–63 (ALLERGEN/CROSS) e 176–317 (ADDITIVI)

- [ ] **Step 2.1: Aggiungi import da shared/constants**

Nel blocco import in cima a `NutrizionaleCalc.tsx` (subito dopo l'import esistente dall'engine, ~riga 36), aggiungi:

```typescript
import { ALLERGEN_FIELDS, CROSS_FIELDS, ADDITIVI_CATEGORIE, ADDITIVI_SPECIFICI } from './shared/constants';
```

- [ ] **Step 2.2: Rimuovi ALLERGEN_FIELDS locale (righe 44–53)**

Cancella le righe:
```typescript
const ALLERGEN_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'all_glutine', label: 'GLUTINE' }, { key: 'all_grano', label: 'GRANO' },
    { key: 'all_crostacei', label: 'CROSTACEI' }, { key: 'all_uova', label: 'UOVA' },
    { key: 'all_pesci', label: 'PESCE' }, { key: 'all_arachidi', label: 'ARACHIDI' },
    { key: 'all_soia', label: 'SOIA' }, { key: 'all_latte', label: 'LATTE' },
    { key: 'all_frutta_guscio', label: 'FRUTTA A GUSCIO' },
    { key: 'all_anacardi', label: 'ANACARDI' },
    { key: 'all_solfiti', label: 'SOLFITI (>10 ppm)' }, { key: 'all_lupini', label: 'LUPINI' },
    { key: 'all_molluschi', label: 'MOLLUSCHI' },
];
```

- [ ] **Step 2.3: Rimuovi CROSS_FIELDS locale (righe 54–64)**

Cancella le righe:
```typescript
const CROSS_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'cross_glutine', label: 'GLUTINE' }, { key: 'cross_grano', label: 'GRANO' },
    { key: 'cross_crostacei', label: 'CROSTACEI' }, { key: 'cross_uova', label: 'UOVA' },
    { key: 'cross_pesci', label: 'PESCE' }, { key: 'cross_arachidi', label: 'ARACHIDI' },
    { key: 'cross_soia', label: 'SOIA' }, { key: 'cross_latte', label: 'LATTE' },
    { key: 'cross_frutta_guscio', label: 'FRUTTA A GUSCIO' }, { key: 'cross_anacardi', label: 'ANACARDI' },
    { key: 'cross_sedano', label: 'SEDANO' }, { key: 'cross_senape', label: 'SENAPE' },
    { key: 'cross_sesamo', label: 'SESAMO' }, { key: 'cross_solfiti', label: 'SOLFITI' },
    { key: 'cross_lupini', label: 'LUPINI' }, { key: 'cross_molluschi', label: 'MOLLUSCHI' },
];
```

- [ ] **Step 2.4: Rimuovi ADDITIVI_CATEGORIE e ADDITIVI_SPECIFICI locali (righe 176–317)**

Cancella le definizioni locali di `ADDITIVI_CATEGORIE` (righe 176–183) e `ADDITIVI_SPECIFICI` (righe 185–317).

- [ ] **Step 2.5: Verifica type-check + test**

```bash
npx tsc --noEmit && npm test
```

Expected: zero errori TypeScript, 17 test passano. Se TypeScript si lamenta di `ALLERGEN_FIELDS` non trovato, controlla che l'import sia stato aggiunto correttamente.

- [ ] **Step 2.6: Commit**

```bash
git add src/calculators/NutrizionaleCalc/shared/constants.ts \
        src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "refactor(nut): extract shared constants (ALLERGEN, CROSS, ADDITIVI) — desktop"
```

---

## Task 3: Aggiorna NutrizionaleCalcMobile.tsx

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`

Questo task fa tre cose in sequenza:
1. Sostituisce ALLERGEN_FIELDS e CROSS_FIELDS locali con import da shared
2. Allinea i tipi locali a quelli dell'engine
3. Rimuove la funzione `calcNutrients` inline e usa quella dell'engine

### 3a — Costanti

- [ ] **Step 3a.1: Aggiungi import da shared/constants**

In cima al file, dopo gli import esistenti, aggiungi:

```typescript
import { ALLERGEN_FIELDS, CROSS_FIELDS } from './shared/constants';
```

- [ ] **Step 3a.2: Rimuovi ALLERGEN_FIELDS locale (righe 47–55)**

Cancella:
```typescript
export const ALLERGEN_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'all_glutine', label: 'GLUTINE' }, { key: 'all_grano', label: 'GRANO' },
    ...
];
```

- [ ] **Step 3a.3: Rimuovi CROSS_FIELDS locale (righe 56–65)**

Cancella:
```typescript
export const CROSS_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    ...
];
```

**Attenzione:** `ALLERGEN_FIELDS` e `CROSS_FIELDS` erano esportate da questo file. Ora vengono ri-esportate da `shared/constants.ts`. Le tab mobile che le importano da qui vanno aggiornate nel Task 4 per importare da `shared/constants` direttamente. Per ora lasciale così — TypeScript segnalerà gli errori dopo la rimozione, guideranno il Task 4.

### 3b — Tipi

- [ ] **Step 3b.1: Verifica DBIngredient**

Il file definisce `export interface DBIngredient` a riga 17. L'engine esporta già `DBIngredient`. Controlla se i campi sono identici cercando differenze:

```bash
grep -n "^export interface DBIngredient" \
  src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx \
  src/engines/nutrizionaleCalcEngine.ts
```

Se i campi dell'interfaccia sono identici (struttura uguale), procedi con Step 3b.2. Se differiscono, NON procedere: segnala la discrepanza e attendere istruzioni.

- [ ] **Step 3b.2: Sostituisci import dei tipi locali con import dall'engine**

Trova l'import esistente dell'engine in cima al file (cercherà `nutrizionaleCalcEngine`). Se non esiste ancora, aggiungilo. Aggiorna il blocco import in modo che `DBIngredient`, `RecipeRow`, `AdditiveRow`, `Component`, `CalcResult`, `ZERO_CALC`, `calcNutrients`, `scaleResult` vengano tutti dall'engine:

```typescript
import {
    type DBIngredient,
    type CalcResult,
    type RecipeRow,
    type AdditiveRow,
    type Component,
    ZERO_CALC,
    calcNutrients,
    scaleResult,
} from '../../engines/nutrizionaleCalcEngine';
```

- [ ] **Step 3b.3: Rimuovi definizioni locali duplicate**

Rimuovi dal file le seguenti definizioni locali (ora arrivano dall'engine):
- `export interface DBIngredient { ... }` (riga 17)
- `export interface RecipeRow { ... }` (righe 68–74)
- `export interface AdditiveRow { ... }` (righe 76–80)

**Tieni** `MobileComponent`, `MobileNutForm`, `MobileArchiveEntry` — sono tipi propri del mobile non presenti nell'engine.

- [ ] **Step 3b.4: Allinea MobileComponent all'engine Component**

`MobileComponent` ha gli stessi campi di `Component` dell'engine. Semplifica ridefinendola come alias o estensione:

```typescript
export interface MobileComponent extends Component {
    // ponytail: extend invece di duplicare; Component ha id, name, pzUV, rows, additiveRows
}
```

Oppure, se CalcoloTab.tsx e altri usano `MobileComponent` con gli stessi campi esatti di `Component`, sostituisci l'alias con:

```typescript
export type MobileComponent = Component;
```

Scegli in base a cosa causa meno errori TypeScript. Esegui `npx tsc --noEmit` dopo ogni variante per vedere quale funziona.

- [ ] **Step 3b.5: Aggiorna creazione AdditiveRow nel mobile**

L'engine richiede `AdditiveRow` con `grams: number`, `eurKg: number`, `resa: number` non opzionali. Nel mobile non vengono inseriti dall'utente. Cerca nel file tutte le costruzioni `{ id, categoria, nomeSpecifico }` per AdditiveRow e aggiunta i campi mancanti con default:

```typescript
// esempio: dove viene creata una nuova AdditiveRow mobile
const newRow: AdditiveRow = {
    id: crypto.randomUUID(),
    categoria: '',
    nomeSpecifico: '',
    grams: 0,     // ← aggiunto: additivi mobile non pesati
    eurKg: 0,     // ← aggiunto
    resa: 100,    // ← aggiunto
};
```

Fai la stessa cosa in `mobile/CalcoloTab.tsx` (Step 4b).

### 3c — Rimuovi calcNutrients inline

- [ ] **Step 3c.1: Rimuovi la funzione calcNutrients inline (righe 173–235)**

Cancella l'intera funzione:
```typescript
export function calcNutrients(components: MobileComponent[], pesoFinitoVal: number): CalcResult {
    // ... 63 righe ...
}
```

Ora `calcNutrients` arriva dall'engine (importato in Step 3b.2). La firma è compatibile: `Component[]` accetta `MobileComponent[]` perché `MobileComponent extends Component` (o è alias).

- [ ] **Step 3c.2: Verifica type-check**

```bash
npx tsc --noEmit
```

Se ci sono errori su `calcNutrients` non trovata: verifica che l'import dell'engine includa `calcNutrients` (non solo come `type`).
Se ci sono errori su tipi incompatibili: controlla che `MobileComponent` sia un `Component` valido (stessa struttura di rows/additiveRows).

- [ ] **Step 3c.3: Verifica test esistenti + golden value**

```bash
npm test
```

Expected: 17 test passano. I test sono sull'engine — non cambiano comportamento, perché la funzione importata è esattamente quella già testata.

**Golden value check manuale:** Apri l'app in browser, carica una ricetta di test semplice (es. 100g olio extravergine), verifica che i valori nutrizionali sul mobile corrispondano a quelli sul desktop per la stessa ricetta.

- [ ] **Step 3c.4: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx
git commit -m "refactor(nut-mobile): import types+calcNutrients from engine, remove local duplicates"
```

---

## Task 4: Aggiorna mobile/CalcoloTab.tsx

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx`

- [ ] **Step 4a.1: Aggiorna import da NutrizionaleCalcMobile**

Riga 4–6, import corrente:
```typescript
import type {
    MobileNutForm, DBIngredient, MobileComponent, RecipeRow, AdditiveRow,
} from '../NutrizionaleCalcMobile';
```

`DBIngredient`, `RecipeRow`, `AdditiveRow` ora arrivano dall'engine (ri-esportati transitivamente via NutrizionaleCalcMobile, oppure importabili direttamente). Aggiorna:

```typescript
import type {
    MobileNutForm, MobileComponent,
} from '../NutrizionaleCalcMobile';
import type { DBIngredient, RecipeRow, AdditiveRow } from '../../../engines/nutrizionaleCalcEngine';
```

- [ ] **Step 4a.2: Aggiorna import di ADDITIVI_CATEGORIE e ADDITIVI_SPECIFICI**

Aggiungi import da shared:
```typescript
import { ADDITIVI_CATEGORIE, ADDITIVI_SPECIFICI } from '../shared/constants';
```

- [ ] **Step 4a.3: Rimuovi ADDITIVI_CATEGORIE locale (righe 9–16)**

Cancella:
```typescript
const ADDITIVI_CATEGORIE = [
    'addensante','agente di rivestimento', ...
];
```

- [ ] **Step 4a.4: Rimuovi ADDITIVI_SPECIFICI locale (righe 18–150)**

Cancella l'intero blocco `const ADDITIVI_SPECIFICI: Record<string, string[]> = { ... }`.

- [ ] **Step 4b: Aggiorna creazione AdditiveRow**

Cerca nel file dove viene costruita una nuova `AdditiveRow` (probabile in un handler `addAdditivo` o simile). Aggiungi i campi richiesti dall'engine:

```typescript
const newAdditiveRow: AdditiveRow = {
    id: crypto.randomUUID(),
    categoria: '',
    nomeSpecifico: '',
    grams: 0,
    eurKg: 0,
    resa: 100,
};
```

- [ ] **Step 4c: Verifica ALLERGEN_FIELDS / CROSS_FIELDS in CalcoloTab**

Verifica se CalcoloTab.tsx usa ALLERGEN_FIELDS o CROSS_FIELDS direttamente. Se sì, aggiungi:
```typescript
import { ALLERGEN_FIELDS, CROSS_FIELDS } from '../shared/constants';
```
e rimuovi eventuali import da `NutrizionaleCalcMobile`.

- [ ] **Step 4d: Type-check + test**

```bash
npx tsc --noEmit && npm test
```

Expected: zero errori, 17 test passano.

- [ ] **Step 4e: Commit**

```bash
git add src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx
git commit -m "refactor(calcoloTab): import ADDITIVI and types from shared/engine, remove duplicates"
```

---

## Task 5: Verifica altri file mobile che importano da NutrizionaleCalcMobile

**Files:**
- Check: `mobile/TabellaTab.tsx`, `mobile/RiepilogoTab.tsx`, `mobile/ArchivioTab.tsx`

- [ ] **Step 5.1: Verifica import in TabellaTab.tsx**

```
import type { CalcResult, MobileNutForm } from '../NutrizionaleCalcMobile';
```

`CalcResult` ora arriva dall'engine. Aggiorna:
```typescript
import type { CalcResult } from '../../../engines/nutrizionaleCalcEngine';
import type { MobileNutForm } from '../NutrizionaleCalcMobile';
```

- [ ] **Step 5.2: Verifica import in RiepilogoTab.tsx**

```
import type { MobileComponent } from '../NutrizionaleCalcMobile';
```

`MobileComponent` resta in NutrizionaleCalcMobile. Nessun cambiamento necessario (a meno che non sia stato ridefinito come alias di `Component` — in quel caso l'import funziona ugualmente perché il tipo è ri-esportato).

- [ ] **Step 5.3: Verifica import in ArchivioTab.tsx**

```
import type { MobileArchiveEntry } from '../NutrizionaleCalcMobile';
```

`MobileArchiveEntry` resta locale. Nessun cambiamento.

- [ ] **Step 5.4: Type-check finale + test**

```bash
npx tsc --noEmit && npm test
```

Expected: zero errori, 17 test passano.

- [ ] **Step 5.5: Commit finale**

```bash
git add src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx \
        src/calculators/NutrizionaleCalc/mobile/RiepilogoTab.tsx \
        src/calculators/NutrizionaleCalc/mobile/ArchivioTab.tsx
git commit -m "refactor(nut-mobile-tabs): update imports after type consolidation"
```

---

## Task 6: Verifica funzionale manuale

- [ ] **Step 6.1: Test desktop**

Apri http://localhost:5173/tool/nutrizionale su viewport desktop (>768px).
1. Aggiungi un ingrediente (es. "olio extravergine di oliva", 100g)
2. Verifica che i valori nutrizionali UE siano visualizzati correttamente
3. Aggiungi un additivo (es. categoria "conservante")
4. Verifica che l'additivo appaia nella lista ingredienti dell'etichetta
5. Apri il modal allergenici — verifica che le etichette siano in italiano (non inglese)

- [ ] **Step 6.2: Test mobile**

Ridimensiona il browser a <768px oppure usa DevTools mobile.
1. Ripeti gli stessi passi del desktop
2. Verifica che i valori nutrizionali siano identici al desktop per la stessa ricetta
3. Verifica che gli additivi appaiano nella lista
4. Verifica che gli allergeni mostrino etichette in italiano

- [ ] **Step 6.3: Aggiorna AUDIT.md**

In `AUDIT.md`, alla voce M2 nella tabella riepilogo (riga ~357), cambia:
```
| 🟡 Pianificare | M2-nota | Unificare alberi desktop/mobile in componenti unici responsive |
```
in:
```
| ✅ Done | M2-nota | Costanti e calcolo deduplicati. Shell separati mantenuti (UX diversa). Archivio: differito (tipi incompatibili, design separato). |
```

- [ ] **Step 6.4: Commit**

```bash
git add AUDIT.md
git commit -m "docs(audit): mark M2 deduplication as done"
```

---

## Note per l'esecutore

### Archivio — perché differito

L'archivio desktop usa chiave `'nutrizionale-v3'` con tipo `ArchiveData` (recipe components + serving sizes).
L'archivio mobile usa chiave `'nut_mobile_v2'` con tipo `MobileArchiveEntry` (components + form + CalcResult pre-calcolato).

I due schemi hanno scopi diversi e non sono unificabili con un semplice merge. Un utente non vedrà le ricette cross-device finché non verrà progettato un tipo unificato in un task dedicato.

### Invariante assoluta

Se `npx tsc --noEmit` produce errori o `npm test` fallisce, NON procedere al commit del task in corso. Correggere prima di andare avanti.

### Se DBIngredient diverge tra mobile e engine

Step 3b.1 potrebbe rivelare che i campi di `DBIngredient` in NutrizionaleCalcMobile.tsx differiscono da quelli nell'engine. In quel caso:
1. Non procedere con la sostituzione automatica
2. Listare le differenze
3. Segnalare all'utente per decisione

### Ordine dei commit

Ogni task termina con un commit separato. In caso di revert, si può tornare indietro granularmente.
