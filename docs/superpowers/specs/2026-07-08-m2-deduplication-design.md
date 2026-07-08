# M2 — Deduplicazione logica condivisa NutrizionaleCalc
**Data:** 2026-07-08 | **Audit ref:** AUDIT.md §3 M2 | **Approccio scelto:** A (deduplicazione, non unificazione shell)

---

## Obiettivo

Eliminare le duplicazioni di costanti e logica di calcolo tra il tree desktop (`NutrizionaleCalc.tsx`) e il tree mobile (`NutrizionaleCalcMobile.tsx` + `mobile/CalcoloTab.tsx`) **senza modificare alcuna funzionalità, logica di calcolo, o comportamento utente**.

**Invariante assoluto:** nessun cambiamento ai valori calcolati, alle soglie normative, ai claim nutrizionali, al flusso UX, alle props dei componenti Tab*.tsx.

---

## Contesto

I due shell esistenti (desktop split-pane, mobile bottom-tab) servono UX genuinamente diverse e restano separati. Il problema è che condividono ~650 righe di codice identico non estratto, causando bug silenziosi quando un fix viene applicato a uno shell e non all'altro (es. B4: parseDecimalIT esisteva sul desktop ma non sul mobile).

---

## Sezione 1 — Shared constants

### File nuovo: `src/calculators/NutrizionaleCalc/shared/constants.ts`

Estrae e ri-esporta le seguenti costanti oggi definite in duplicato:

| Costante | Sorgente attuale | Destinazione |
|----------|-----------------|--------------|
| `ALLERGEN_FIELDS: string[]` | `NutrizionaleCalc.tsx` + `NutrizionaleCalcMobile.tsx` | `shared/constants.ts` |
| `CROSS_FIELDS: string[]` | idem | idem |
| `ADDITIVI_CATEGORIE: string[]` | `NutrizionaleCalc.tsx` + `mobile/CalcoloTab.tsx` | idem |
| `ADDITIVI_SPECIFICI: Record<string, string[]>` | idem | idem |

**Regola di estrazione:** copiare il contenuto dal file desktop (source of truth), verificare che sia identico al mobile, poi rimuovere entrambe le definizioni locali e sostituire con import.

**File toccati (rimozioni):**
- `NutrizionaleCalc.tsx` — rimuove le 4 definizioni locali, aggiunge import
- `NutrizionaleCalcMobile.tsx` — rimuove `ALLERGEN_FIELDS`, `CROSS_FIELDS`, aggiunge import
- `mobile/CalcoloTab.tsx` — rimuove `ADDITIVI_CATEGORIE`, `ADDITIVI_SPECIFICI`, aggiunge import

**Nessun cambiamento ai valori.** Se desktop e mobile differiscono su un singolo entry, documentare la discrepanza e scegliere esplicitamente quale versione è corretta (non merged silenzioso).

---

## Sezione 2 — Mobile usa engine condiviso

### Situazione attuale

`NutrizionaleCalcMobile.tsx` contiene una funzione `calcNutrients()` inline (~76 righe) che è una versione semplificata di `calcNutrients()` in `src/engines/nutrizionaleCalcEngine.ts`.

La versione dell'engine:
- È coperta da 17 test in `nutrizionaleCalcEngine.test.ts`
- Supporta `postCottura`, `acquaAggiunta`, scaling completo
- È la source of truth per i calcoli nutrizionali

La versione mobile manca di alcune flag (`postCottura`, `acquaAggiunta`) perché i tipi mobile sono più semplici.

### Fix

1. **Allineare i tipi mobile all'engine** — `MobileRecipeRow` deve includere i campi mancanti rispetto a `RecipeRow`. I campi aggiunti hanno valore di default `false`/`0` se non presenti nel form mobile — **il risultato numerico per le ricette senza cottura è identico**.

2. **Rimuovere `calcNutrients()` inline** da `NutrizionaleCalcMobile.tsx`.

3. **Importare `calcNutrients` e `scaleResult`** da `nutrizionaleCalcEngine.ts`.

**Invariante:** per ricette senza `postCottura` e senza `acquaAggiunta` (tutti i casi attuali del mobile), il risultato numerico è matematicamente identico. Da verificare con un test di golden value prima e dopo.

**File toccati:**
- `NutrizionaleCalcMobile.tsx` — rimuove funzione inline, allinea tipi, aggiunge import
- Nessun cambiamento a `nutrizionaleCalcEngine.ts`

---

## Sezione 3 — Archivio unificato

### Situazione attuale

| Shell | Chiave localStorage | Tipo entry |
|-------|--------------------|-----------:|
| Desktop | `nut_archive` | `ArchiveEntry` |
| Mobile | `nut_mobile_v2` | `MobileArchiveEntry` |

Un consulente che salva una ricetta sul desktop non la vede sul mobile.

### Fix

**Migrazione one-shot su mount di `NutrizionaleCalcMobile`:**

```
if (localStorage.getItem('nut_mobile_v2')) {
  leggi nut_mobile_v2
  leggi nut_archive
  merge per id (deduplicazione)
  scrivi risultato in nut_archive
  cancella nut_mobile_v2
}
```

**Allineamento tipi:** prima della migrazione, verificare i campi di `MobileArchiveEntry` vs `ArchiveEntry`. La struttura merged conserva l'unione dei campi (nessun dato perso). Eventuali campi presenti solo nel tipo mobile vengono mantenuti — `useArchive` è generico e li serializza senza problemi.

**Dopo la migrazione:** `NutrizionaleCalcMobile` usa `useArchive('nut_archive')` — stessa chiave del desktop.

**File toccati:**
- `NutrizionaleCalcMobile.tsx` — aggiunge migrazione on mount, cambia chiave archivio

---

## File toccati — riepilogo

| File | Operazione |
|------|-----------|
| `shared/constants.ts` | **NUOVO** — estrazione costanti |
| `NutrizionaleCalc.tsx` | rimozione definizioni locali + import |
| `NutrizionaleCalcMobile.tsx` | rimozione calcNutrients + ALLERGEN/CROSS, allineamento tipi, migrazione archivio |
| `mobile/CalcoloTab.tsx` | rimozione ADDITIVI_*, import da shared |

Nessun altro file toccato. Tab*.tsx, SplitShell, engine, hooks: invariati.

---

## Ordine di esecuzione

1. **Sezione 1 prima** — estrazione costanti, zero rischio logico, verifica con `tsc --noEmit`
2. **Sezione 2** — allineamento tipi + import engine, verifica con `npm test` (golden values)
3. **Sezione 3** — migrazione archivio, verifica manuale in browser

Ogni sezione è un commit separato, revertibile indipendentemente.

---

## Criteri di successo

- `tsc --noEmit` zero errori dopo ogni sezione
- `npm test` passa (17 test esistenti + eventuale golden test pre/post per mobile)
- Nessuna differenza nei valori nutrizionali calcolati
- Ricette salvate da mobile visibili su desktop (e viceversa) dopo sezione 3
- Nessuna regressione UX visibile

---

## Fuori scope (non fare)

- Unificazione dei due shell in un unico componente responsive
- Modifica alla logica di calcolo dell'engine
- Cambiamenti ai Tab*.tsx regionali
- Nuove feature o comportamenti
- Modifiche al flusso UX desktop o mobile
