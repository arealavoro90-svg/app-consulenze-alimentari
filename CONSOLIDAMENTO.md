# CONSOLIDAMENTO.md — Mappatura, stato audit, piano consolidamento tool Nutrizionale

**Data:** 2026-07-30 | **Metodo:** solo lettura, nessuna modifica al codice. Verifiche basate su analisi statica degli import (`grep`/pattern matching su tutto `src/`), esecuzione di `npx tsc -b --noEmit`, `npx vitest run` (con e senza esclusione worktree) e `npx eslint` (repo-wide e scoped a `src/`).

---

## 1. Mappatura e pulizia

### 1a — Codice essenziale (per cartella/modulo)

Verificato per raggiungibilità reale da `src/main.tsx` → `src/App.tsx` (routing con `React.lazy`), non per nome file.

| Modulo | Contenuto | Note |
|---|---|---|
| `src/main.tsx`, `src/App.tsx` | entry point, routing (`react-router-dom`), 8 route lazy (7 tool + variante mobile Nutrizionale) | raggiungibile, unico entry |
| `src/auth/` | `AuthContext.tsx`, `ProtectedRoute.tsx` | live; ibrido Django+mock (vedi §4) |
| `src/api/` | `client.ts`, `auth.ts` | live; layer verso backend Django |
| `src/calculators/*Calc/` (7 tool) | componenti principali dei 7 strumenti | tutti importati in `App.tsx` via `lazy()` |
| `src/calculators/NutrizionaleCalc/` | 21 file (desktop+mobile+shared) | il più esteso, vedi §3 |
| `src/components/` | `AppShell`, `Sidebar`, `Dashboard`, `LoginPage`, `ArchiveModal`, `ErrorBoundary`, `RisorseLinks`, `WelcomeModal`, `ui/ConfirmDialog`, `ui/Toast` | live; `ValidationError.tsx` live ma usato solo da Nutrizionale (vedi §3) |
| `src/engines/` | `nutrizionaleCalcEngine.ts`, `wineEngine.ts` | **soli due engine vivi** su 5 presenti nella cartella (vedi 1d) |
| `src/hooks/` | `useArchive`, `useAutosave`, `useLocalStorage`, `useMobile` | live |
| `src/utils/` | `validation.ts`, `pdfGenerator.ts`, `excelImporter.ts`, `recipeParser.ts`, `nutritionalRounding.ts` | live |
| `src/data/` | `ingredientsDB.json` (fetch runtime, 478 KB), `mockUsers.ts` (fallback auth) | live |
| `src/styles/` | `mobile.css`, `motion.css`, `unified-tokens.css` + `App.css`/`index.css` | live |

### 1b — Documenti di pianificazione/report (non codice applicativo)

`AUDIT.md`, `todo.md`, `README.md`, `PRODUCT.md`, `Back-end_specs.md`, `aea-motion-system.md`, tutta `docs/` (piani/spec superpowers, audit ingredienti, spec backend), `docs_riferimento/`, `docs/ui-proposals/mockup-ui-proposals.html` (mockup HTML isolato, non collegato al build). Non spostati, solo segnalati come richiesto.

### 1c — File duplicati

| Gruppo | File | Motivazione |
|---|---|---|
| Engine nutrizionale | `src/engines/nutritionalEngine.ts` (324 righe) vs `src/engines/nutrizionaleCalcEngine.ts` | **Non più un duplicato attivo**: `nutritionalEngine.ts` è codice morto confermato (0 importer, vedi 1d). `nutrizionaleCalcEngine.ts` è l'unico usato a runtime (11 importer). Il duplicato "vivo" è solo storico. |
| Tabelle regionali Canada/Australia/Arabi | `TabCanada.tsx`/`TabAustralia.tsx`/`TabArabi.tsx` | **Duplicazione già risolta** (TAB-UNIFY, 2026-07-17 per todo.md) — verificato: `NutrizionaleCalc.tsx` e `mobile/TabellaTab.tsx` importano entrambi gli stessi 5 moduli `Tab*.tsx` condivisi, nessuna versione inline residua. La nota D-RP2 in fondo ad `AUDIT.md` (datata 2026-07-14, prima di TAB-UNIFY) è **obsoleta** — va rimossa o marcata risolta. |
| Schema tipo ingrediente | `IngredientDB` (inglese) vs `DBIngredient` (italiano) | **Risolto**: `IngredientDB` è stato rimosso (Q4). `DBIngredient` è l'unico tipo, definito in `nutrizionaleCalcEngine.ts` e re-esportato (ma non consumato, vedi 1d) da `src/data/ingredientsDB.ts`. |
| Logica di calcolo F0 / costi | `src/engines/thermalEngine.ts` vs logica inline in `TrattamentoTermicoCalc.tsx`; `src/engines/costsEngine.ts` vs logica inline in `RintracciabilitaCalc.tsx` | **Duplicazione reale e non segnalata altrove**: i due engine dedicati esistono ma nessuno dei due tool li importa — ogni tool ricalcola la propria logica localmente. Vedi 1d e §3. |

### 1d — File morti (0 importer verificati via analisi statica)

| File | Righe | Verifica |
|---|---|---|
| `src/engines/nutritionalEngine.ts` | 324 | 0 import in tutto `src/` (confermato anche da AUDIT B5/todo DOC-1) |
| `src/logic/localizationModule.ts` | 102 | Unico importer era `nutritionalEngine.ts` → morto per transitività. **Contraddice direttamente CLAUDE.md** ("`localizationModule.ts` impatta tutti i calcolatori: massima cautela") — falso, impatta zero calcolatori a runtime. Arrotondamenti regionali reali vivono altrove (inline nei `Tab*.tsx`, per nota M2-nota di AUDIT.md). |
| `src/engines/thermalEngine.ts` | 64 | 0 import. `TrattamentoTermicoCalc.tsx` (919 righe) implementa il proprio ciclo di integrazione Bigelow inline (`cumF0 += lethality`, riga 122) **senza usare l'engine dedicato**. Contraddice CLAUDE.md ("Engine esistente e tool attivo"). |
| `src/engines/costsEngine.ts` | 84 | 0 import. `RintracciabilitaCalc.tsx` implementa `calcAll()` inline (righe 55–101) con la stessa logica di costo, duplicata. |
| `src/utils/regionalFormats.ts` | 50 | 0 import in tutto il repo, nessun riferimento nemmeno in test. |
| `src/components/ModeToggle.tsx` | 36 | 0 import — solo auto-riferimenti interni al file stesso. |
| `src/calculators/NutrizionaleCalc/mobile/ToolsTab.tsx` | 91 | 0 import. Coerente con todo.md MOB-P4-1: il tab "Tools" è stato rimosso dalla tab bar mobile (2026-05-30) ma il file non è mai stato eliminato. |
| `src/data/ingredientsDB.ts` (come modulo, non come tipo) | 4 | Il file esiste solo per il re-export `export type { DBIngredient } from '../engines/nutrizionaleCalcEngine'`, ma **nessun file lo importa** — tutti importano `DBIngredient` direttamente da `nutrizionaleCalcEngine.ts`. Shim orfano dal refactor Q4. |
| `3` (root, 0 byte) | — | File vuoto senza estensione, presente anche dentro `.worktrees/mobile-redesign/`. Probabile redirect shell accidentale (`> 3` invece di `>> file`). |
| `inspect_all.cjs`, `inspect_csv.cjs`, `inspect_data.cjs`, `inspect_numbers.cjs`, `inspect_totals.cjs`, `inspect_ue.cjs`, `inspection_results.json` (root) | — | Script una-tantum di ispezione dati Excel, non referenziati in `package.json` scripts né importati da `src/`. Stessa natura per gran parte di `scripts/*.cjs` e `scripts/*.json` (dump/estrazioni usati durante l'import del DB ingredienti, non nel build). |

### 1e — File ambigui

| File | Ragione dell'incertezza |
|---|---|
| `.worktrees/mobile-redesign/` (git worktree collegato, branch `feat/mobile-nutrizionale-redesign`) e `.claude/worktrees/agent-aa8c63f7/` | Non è codice morto: è un checkout Git parallelo attivo con proprio `node_modules`, in lavorazione su un'altra branch. `npm test` e `npx eslint .` lanciati dalla root **includono anche questi alberi** (vedi §4) perché non esclusi da `vite.config.ts`/`eslint.config.js` — comportamento verificabile ma non "dead code" in senso stretto. |
| `Beck-end/backend` | Sottocartella con propria repo Git (modified content, untracked: `.env.production.local`, `.env.neon`, nuova migration, nuovo `apps/users/authentication.py`) — modifiche locali non committate, non è chiaro se lavoro in corso o abbandonato. Non toccato per istruzione esplicita ("solo lettura"). |
| `src/components/RisorseLinks.tsx` | Importato in `App.tsx` (1 hit) ma non verificato se il componente sia effettivamente montato in una route attiva o solo importato — non eseguibile senza avviare l'app (vedi limiti di verifica). |
| `docs/ui-proposals/mockup-ui-proposals.html` | HTML isolato, non collegato al build Vite; non chiaro se sia riferimento storico o mockup ancora da implementare. |

---

## 2. Stato reale rispetto ad AUDIT.md

Verificato codice reale, non nomi di funzione/commenti, per gli item con impatto maggiore o con dubbio residuo.

| ID | Stato dichiarato in AUDIT.md | Stato verificato | Evidenza |
|---|---|---|---|
| B1 (claim "sodium" non tradotto) | ✅ Done | **Non verificabile sul percorso vivo** | Il fix è in `nutritionalEngine.ts:243`, file confermato morto (0 import, §1d). Il claim generato realmente arriva da `calcClaims()` in `nutrizionaleCalcEngine.ts` — lì non esiste il bug originale (funzione scritta dopo, con campi italiani). Il fix B1 storico è quindi ininfluente ma il bug non è comunque presente nel path live. |
| B4 (virgola IT mobile) | ✅ Done | **Confermato** | `mobile/CalcoloTab.tsx` usa `parseDecimalIT()` da `utils/validation.ts` in tutti e 4 i punti (righe 242, 247, 252, 472), non `parseFloat` diretto. |
| B5 (due engine paralleli) | ✅ Marcato/noto | **Confermato + esteso**: non è solo `nutritionalEngine.ts` — anche `thermalEngine.ts` e `costsEngine.ts` sono nella stessa condizione (§1d), ma questo non è ancora tracciato in AUDIT.md/CLAUDE.md. | Vedi 1d |
| TAB-UNIFY (todo.md) | ✅ Completato 2026-07-17 | **Confermato** | Nessuna versione inline di TabCanada/Australia/Arabi in `NutrizionaleCalc.tsx`; import da moduli condivisi in desktop e mobile. |
| D-RP1 (3 `useState(true)` morti, AUDIT §"Debito post-redesign") | 🟡 Aperto | **Confermato ancora aperto** | `NutrizionaleCalc.tsx:1066,1078,1079` — `useState(true); // pesoCardOpen — dead state, hook order preserved` (e simili), invariati. |
| D-RP2 (duplicati Tab* inline) | 🟡 Aperto (nota AUDIT del 2026-07-14) | **Risolto ma non aggiornato in AUDIT.md** | Superato da TAB-UNIFY (2026-07-17), tre giorni dopo la nota. AUDIT.md non riflette il fix — nota stale da rimuovere. |
| Q1 (NutrizionaleCalc.tsx monolitico) | 🟡 Risolto parziale — "CustomIngredientModal ancora inline" | **Confermato parziale** | File oggi 2.879 righe (ridotto da 3.457 dichiarate, ma comunque enorme). `CustomIngredientModal` confermato ancora definito inline (righe 431–506+) e usato 2 volte nello stesso file. |
| Q2 (test) | ✅ Done — 17 test | **Confermato ed esteso**: oggi 96 test in 7 file passano puliti se si esclude il rumore delle worktree annidate (§4). `npx tsc -b --noEmit` pulito, zero errori. | `npx vitest run --exclude '**/.worktrees/**' --exclude '**/.claude/**'` → 7 file, 96/96 pass |
| Q3 (`noUnusedLocals`/`noUnusedParameters`) | ✅ Done — "zero errori generati" | **Confermato per tsc, ma fuorviante per lint** | `tsc -b --noEmit` è effettivamente pulito. Ma `npm run lint` (= `eslint .`) oggi produce **87 errori + 3 warning reali** in `src/` (esclusi i 302 totali gonfiati dal rumore di `Beck-end/.venv` e worktree, §4). AUDIT.md non menziona mai lo stato di ESLint separatamente da tsc — ambiguità terminologica che ha nascosto il problema. |
| AUTH-2 (rimuovere fallback mock) | 🔴 Aperto, bloccato da AUTH-1 | **Confermato aperto** | `src/api/auth.ts`: `catch { const { MOCK_USERS } = await import('../data/mockUsers'); ... }` ancora presente sia in login sia in `apiMe`. |
| BUG-1 (native `alert`/`confirm`/`prompt`) | 🔴 Aperto, "impatta tutti i calcolatori + ArchiveModal + SavedTablesModal" | **Confermato aperto, `SavedTablesModal` non trovato** | Uso nativo trovato in `ArchiveModal.tsx` + 6 dei 7 calculator (tutti tranne Nutrizionale). `SavedTablesModal` citato in todo.md non esiste più come file in `src/` — riferimento probabilmente stale (rinominato/rimosso in un refactor successivo, non tracciato). |
| DOC-1 (CLAUDE.md/skill descrivono `nutritionalEngine.ts`/`localizationModule.ts` come canonici) | 🔴 Aperto — decisione da prendere | **Confermato aperto e ancora attuale**: CLAUDE.md in root (letto a inizio sessione) ripete esattamente l'errore descritto: cita `localizationModule.ts` come modulo che "impatta tutti i calcolatori" e `thermalEngine.ts` come "Engine esistente e tool attivo" — entrambe le affermazioni sono false a runtime (§1d). | — |

**Item non riverificabili senza eseguire l'app** (richiederebbero browser/rete, fuori scope "solo lettura"): M4 (comportamento reale su fetch DB fallito), V6 (dati ingredienti vs fonte CREA BDA live), V7 (contrasto/focus visibile), S0 (risposta reale del backend Django in prod), M6 (comportamento offline PWA). Per questi AUDIT.md riporta già "non ancora verificato/verificare manualmente" — coerente, nessuna contraddizione trovata.

---

## 3. Valori Nutrizionali come fulcro

### 3.1 — Logica/dati

**Cosa è già generico e riutilizzabile:**
- `src/utils/validation.ts` — `parseDecimalIT()`, `isValidDBIngredient()`: pure function, zero dipendenze da schema Nutrizionale, già pronte per essere usate da qualunque tool con input numerici IT (Rintracciabilità, Trattamento Termico, Etichette Vino oggi non le usano — verificato via grep, nessun risultato).
- `src/utils/pdfGenerator.ts` — già condiviso: usato sia da `NutrizionaleCalc` che da `EtichetteCalc` (`generatePDFReport`). Gli altri 5 tool generano PDF con `jsPDF`/`html2canvas` direttamente inline (verificato import diretto in `TrattamentoTermicoCalc.tsx`, `RintracciabilitaCalc.tsx`, `EtichetteViniCalc.tsx` — nessuno passa da `pdfGenerator.ts`).
- `src/calculators/NutrizionaleCalc/shared/constants.ts` — allergeni/tracce/additivi: generico per dominio ma fisicamente dentro la cartella del tool Nutrizionale, non in `src/utils/` o `src/constants/` condiviso — barriera solo organizzativa, non tecnica.

**Cosa è scritto in modo specifico e andrebbe astratto prima di condividere:**
- `nutrizionaleCalcEngine.ts` (`calcNutrients`, `scaleResult`, `calcClaims`) — pure, ben isolato, ma il tipo `DBIngredient` (schema italiano dell'ingrediente) è cucito sul dominio nutrizionale. Il pattern (engine puro + test golden) **non è stato replicato** per Trattamento Termico o Rintracciabilità: lì la stessa logica di calcolo (Bigelow, costi) è scritta due volte — una volta come engine dedicato mai collegato (`thermalEngine.ts`, `costsEngine.ts`), una volta inline nel componente. Questo è l'esatto pattern che ha già afflitto il tool Nutrizionale prima del refactor Q1/B5, e non è stato risolto negli altri tool.
- Chiamate al DB ingredienti: il fetch di `ingredientsDB.json` e la relativa gestione errore/retry (M4) sono scritte solo dentro `NutrizionaleCalc.tsx`, non estratte in un hook (`useIngredientsDB` non esiste) — se un altro tool avesse bisogno del DB ingredienti (es. Schede Complete), duplicherebbe fetch+parsing+error state da zero.
- Arrotondamenti regionali: vivono ora **dentro i singoli `Tab*.tsx`** (per nota M2-nota di AUDIT.md), non in un modulo condiviso — `localizationModule.ts` che dovrebbe fare questo è morto (§1d, §2). Nessuna funzione di arrotondamento è oggi riutilizzabile da un tool esterno al Nutrizionale.

### 3.2 — UI/UX desktop

**Cosa esiste oggi come componente riutilizzabile:**
- `ArchiveModal.tsx`, `useArchive.ts` — genuinamente condivisi: usati da Nutrizionale, Trattamento Termico, Rintracciabilità, Etichette (Vino incluso) — pattern di archiviazione locale coerente su 5+ tool.
- `ConfirmDialog.tsx`, `Toast.tsx`, `ValidationError.tsx` — esistono come componenti generici e ben fatti (in `src/components/ui/` e `src/components/`), ma **usati solo da `NutrizionaleCalc.tsx`/`NutrizionaleCalcMobile.tsx`** (verificato via grep, 0 riferimenti negli altri 6 calculator). Gli altri tool usano ancora `alert()`/`confirm()`/`prompt()` nativi (BUG-1, §2) invece di questi componenti già pronti — non manca il building block, manca solo l'adozione.

**Cosa è codice incollato con variazioni minime:**
- Ogni calculator (`EtichetteCalc`, `EtichetteViniCalc`, `RintracciabilitaCalc`, `SchedaProcessoCalc`, `SchedeCompleteCalc`, `TrattamentoTermicoCalc`) ha 5–12 `useState` locali per gestire form + stato UI, nessuno passa da un hook di form condiviso — non è stato verificato se esista duplicazione di markup form field-per-field (fuori scope di un'analisi statica di import; richiederebbe diff testuale mirato, non eseguito in questa sessione).
- Generazione PDF: 3 pattern diversi coesistono — `pdfGenerator.ts` condiviso (Nutrizionale + Etichette), `jsPDF` diretto con markup inline (Trattamento Termico, Rintracciabilità, Etichette Vino) — nessuna convergenza.

### 3.3 — UI/UX mobile

**Cosa esiste oggi:**
- Il Nutrizionale è **l'unico tool con una variante mobile dedicata** (`NutrizionaleCalcMobile.tsx` + 5 tab in `mobile/`) — gli altri 6 tool non hanno controparte mobile, si affidano presumibilmente al layout responsive del componente desktop (non verificato senza avviare il browser).
- Riuso reale confermato tra desktop e mobile Nutrizionale: `TabUE/USA/Canada/Australia/Arabi.tsx` (stessa sorgente per entrambi), `nutrizionaleCalcEngine.calcClaims`, `parseDecimalIT`, `NutrientSelectModal`. Questo è un impianto solido — il livello di condivisione codice desktop/mobile **dentro** il tool Nutrizionale è alto.
- `useMobile.ts` (media query hook) è generico e in `src/hooks/`, pronto per essere riusato da qualunque altro tool per costruire una propria variante mobile.

**Cosa manca per un vero design system mobile condiviso:**
- Non esiste alcuna astrazione "mobile shell per tool" oltre `MobileShell.tsx`/`AppShell.tsx` a livello di app — la logica di tab bar, gestione tastiera numerica, touch target (M3, già portato a 44×44px solo nella sidebar) è scritta specificamente per Nutrizionale e non estratta in componenti generici (`MobileTabBar`, `NumericKeyboardInput`, ecc. non esistono).
- Tastiera numerica sugli input: non verificabile staticamente se gli `<input>` degli altri tool abbiano `inputMode="decimal"` o `type="number"` coerente — richiederebbe ispezione DOM/browser, fuori scope di questa sessione read-only.
- **Non verificabile senza eseguire l'app**: se il layout "responsive" degli altri 6 tool sia reale (breakpoint testati) o "si adatta per caso" (nessun media query dedicato) — richiede DevTools/browser reale.

### Ordine di priorità per il consolidamento (sblocca di più → sblocca di meno)

1. **Riattivare o eliminare `localizationModule.ts`, `thermalEngine.ts`, `costsEngine.ts`, `nutritionalEngine.ts`** (decisione DOC-1 estesa ai 3 nuovi casi trovati). Finché questi file morti restano nel repo con nomi "canonici" citati in CLAUDE.md, ogni sessione futura (umana o AI) rischia di modificare codice che non ha alcun effetto — è il blocco più economico da rimuovere e quello con più potenziale di causare bug futuri "invisibili".
2. **Estrarre `useIngredientsDB()` come hook condiviso** (fetch + cache + retry, oggi solo in `NutrizionaleCalc.tsx`) — sblocca qualunque tool futuro che debba consultare il DB ingredienti (es. Schede Complete) senza duplicare M4.
3. **Spostare `ConfirmDialog`/`Toast`/`ValidationError` da "esistono" a "adottati"** negli altri 6 calculator, contestualmente alla chiusura di BUG-1 — building block già pronti, zero lavoro di design, solo migrazione.
4. **Astrarre il pattern "engine puro + golden test" già validato in `nutrizionaleCalcEngine.ts`** e applicarlo a Trattamento Termico/Rintracciabilità **ricollegando** (non duplicando) `thermalEngine.ts`/`costsEngine.ts` ai rispettivi componenti — oggi la logica critica (Bigelow, costi) non ha alcun test perché vive inline nei componenti React.
5. **Unificare la generazione PDF** su `pdfGenerator.ts` per tutti i tool — oggi 3 pattern diversi coesistono, ognuno con propria superficie di rischio (S1/jsPDF injection già auditata solo per il path Nutrizionale/Etichette).

---

## 4. Coerenza trasversale

- **`npm run lint` non è oggi affidabile come gate**: `eslint.config.js` ha solo `globalIgnores(['dist'])`. Lanciando `eslint .` dalla root vengono lintati anche `Beck-end/backend/.venv/.../jquery.js`, `xregexp.js` (libreria Python/Django vendorizzata) e le due worktree annidate (`.worktrees/mobile-redesign`, `.claude/worktrees/agent-aa8c63f7`), gonfiando il conteggio a 340 problemi. Lo stesso vale per `npm test` (`vitest run`): senza `include`/`exclude` in `vite.config.ts`, vengono eseguiti anche i test delle worktree, con 13 fallimenti che appartengono a codice di un'altra branch (`feat/mobile-nutrizionale-redesign`), non a `main`. **Il numero reale su `src/` è 87 errori/3 warning ESLint e 96/96 test verdi.** Questo è un gap di configurazione, non di codice applicativo — ma CLAUDE.md rende `npm test`/lint obbligatori "su ogni modifica" senza che i comandi siano scoped correttamente: rischio concreto che una sessione futura interpreti male l'output rumoroso.
- **CLAUDE.md (root) contiene 2 affermazioni verificate false**: `localizationModule.ts` non "impatta tutti i calcolatori" (impatta zero, è codice morto) e `thermalEngine.ts` non è "Engine esistente e tool attivo" (0 import, mai chiamato). Sono esattamente il tipo di errore che DOC-1 (todo.md) chiede di risolvere, ma la portata reale è più ampia di quanto DOC-1 descriva oggi (menziona solo `nutritionalEngine.ts`).
- **Naming doppio persistente**: "Nutrizionale" (cartella `NutrizionaleCalc`, italiano) vs "nutritional" (`nutritionalEngine.ts`, inglese, morto) vs "nutrizionaleCalc" (`nutrizionaleCalcEngine.ts`, camelCase misto IT/EN). I file vivi usano naming italiano/camelCase misto in modo coerente tra loro; il file morto è l'unico relitto in inglese puro — un ulteriore argomento a favore della sua rimozione (§3, priorità 1).
- **`SavedTablesModal`** citato in `todo.md` (BUG-1) non esiste più in `src/` — riferimento stale, nessun file con quel nome trovato nella mappatura Task 1.
- **AUDIT.md contiene una nota di debito (D-RP2) già risolta** da un commit successivo (TAB-UNIFY, 2026-07-17) mai riportato nel documento — l'audit non è stato aggiornato dopo quel fix, rischio di rilavorare qualcosa di già chiuso.
- **Convenzione file vuoti/di scarto in root** (`3`, dump `inspect_*.cjs`/`.json` da ~1 MB): non seguono alcuna convenzione di progetto (non sono in `scripts/` in modo sistematico, alcuni sì altri no) — nessuna cartella tipo `scripts/one-off/` o `.gitignore` dedicata li isola dal resto del codice applicativo.

---

## Nutrizionale — consolidamento completato (2026-07-30)

Lavoro eseguito in 5 step supervisionati (conferma esplicita tra uno step e l'altro), perimetro rigorosamente limitato a `src/calculators/NutrizionaleCalc/`, `src/engines/nutrizionaleCalcEngine.ts`, `src/hooks/`. Nessun altro tool toccato.

### Cosa è stato fatto

1. **Rimosso codice morto confermato** — `src/engines/nutritionalEngine.ts` eliminato (0 importer verificati; `calcClaims()` in `nutrizionaleCalcEngine.ts` già gestiva correttamente il claim sodio, nessun fix da migrare prima della cancellazione). `CLAUDE.md` corretto: non cita più `nutritionalEngine.ts`/`localizationModule.ts` come canonici — `localizationModule.ts` resta su disco (non era nello scope di cancellazione dello step 1) ma è documentato come codice morto.
2. **Rimossi 3 hook morti** (`useState(true)` senza consumer, `pesoCardOpen`/`additiveOpen`/`riepilogoOpen`) in `NutrizionaleCalc.tsx` — debito D-RP1 di AUDIT.md, chiuso.
3. **Estratto `CustomIngredientModal`** (605 righe) in file dedicato `CustomIngredientModal.tsx` — stessa interfaccia, nessuna modifica funzionale. `InfoTooltip` reso `export` per condivisione tra i due file.
4. **Creato `src/hooks/useIngredientsDB.ts`** — fetch (API Django → fallback statico) + merge custom ingredients + stato loading/error/retry, con messaggio d'errore parametrizzabile. Durante l'estrazione è emerso che il fetch era **duplicato anche in `NutrizionaleCalcMobile.tsx`** (non solo nel desktop, come inizialmente indicato) — consolidato in entrambi su richiesta esplicita, con la logica di ripristino bridge/autosave separata in un effect dedicato che mirror-a esattamente il pattern già in uso nel desktop (dep `[loadingDB]` con `eslint-disable-next-line react-hooks/exhaustive-deps`, deliberato per non far ripartire il ripristino a ogni cambio di `db`).
5. **Lint scoped**: da 54 errori/1 warning a **24 errori/1 warning** — 30 fix meccanici applicati (import/variabili/funzioni morte: `AdditiveSearch`+`searchAdditiviDB` mai chiamati, stato `additives`/`servingOpen` scritto ma mai letto, icone lucide-react inutilizzate, blocchi `catch {}` vuoti commentati, escape regex superfluo, parametri `_region`/`_measure` con disable mirato per convenzione underscore non riconosciuta dalla config eslint del repo).

Verifica ripetuta ad ogni step: `npx tsc -b --noEmit` sempre pulito, `npx vitest run` (esclusioni worktree) **96/96 verdi** su run multipli.

### Cosa resta (debito noto, non toccato in questa sessione)

- **25 errori/warning eslint strutturali** nel perimetro, non corretti su scelta esplicita (rischio di alterare comportamento reale, non lint puro):
  - `react-hooks/set-state-in-effect` (5×: `BrowseIngredientsModal.tsx`, `NutrizionaleCalc.tsx`, `mobile/CalcoloTab.tsx`, `mobile/TabellaTab.tsx`, `useIngredientsDB.ts`) — pattern "ricerca live"/reload, fix corretto richiederebbe `useMemo` o refactor degli handler.
  - `react-hooks/static-components` (6×, tutti in `CustomIngredientModal.tsx`: `AccHead`, `AllergenRow` definiti dentro il render) — fix richiede spostarli a livello di modulo passando `openSec`/`toggleSec` come prop.
  - `react-hooks/exhaustive-deps` (1×, `NutrizionaleCalc.tsx`, dep `finishedWeight` mancante) — da valutare se omissione intenzionale.
  - `no-explicit-any` (6×, tutti nel parsing dell'archivio ricette legacy, commento esplicito "Allow legacy fallback") — retipizzare richiede conoscere tutti gli schemi storici salvati nel tempo.
  - `react-refresh/only-export-components` (7×) — solo Fast Refresh/DX, zero impatto produzione.
- **`src/logic/localizationModule.ts`** resta nel repo, ora orfano al 100% (era importato solo da `nutritionalEngine.ts`, rimosso) — non cancellato in questo step, decisione rimandata.
- **`thermalEngine.ts`/`costsEngine.ts`** (Trattamento Termico/Rintracciabilità) — fuori perimetro di questa sessione per esplicita richiesta ("lavoriamo SOLO sul tool Valori Nutrizionali"), restano morti come già documentato in §1-3 sopra.
- **Nuova scoperta non nota prima di questa sessione**: `tsconfig.app.json` ha `noUnusedLocals: false` e `noUnusedParameters: false` — AUDIT.md (Q3) dichiara questi flag `true` e "zero errori generati", ma il valore reale su disco è `false`. Questo spiega perché `tsc -b --noEmit` non aveva mai segnalato le ~20 import/variabili morte che ESLint ha invece trovato in questo step. Non corretto (flag di progetto trasversale, fuori dal perimetro "solo Nutrizionale" — impatterebbe l'intera repo se attivato).
- **Duplicazione fetch DB** era doppia (desktop+mobile): risolta in questo step, ma resta il gap più ampio già segnalato in §3 — nessun altro tool (Schede Complete, Etichette) consuma ancora `useIngredientsDB()`; l'hook è pronto ma non collegato altrove, per scelta esplicita ("non collegarlo ad altri tool per ora").

---

## AUTH-2 — risolto (2026-07-30)

**Perimetro**: `src/auth/`, `src/api/auth.ts`, `src/api/client.ts`, `src/data/mockUsers.ts`. Nessun altro tool o UI toccato.

### Rischio originale

`src/api/auth.ts` (`apiLogin`/`apiMe`) faceva fallback silenzioso su **qualsiasi** errore del backend Django — non solo rete assente, ma anche 401/403/500 dal backend reale (`apiFetch` in `client.ts` lancia lo stesso `Error` generico per ogni risposta non-2xx, senza distinguere "credenziali sbagliate" da "backend giù"). Il fallback aveva due percorsi:
1. `apiLogin`: cercava la password in chiaro dentro `MOCK_USERS` (5 account, incluso `admin@aea.it`/`admin2024`).
2. `apiMe`: rileggeva `aea_user` da `localStorage` **senza verificarlo** — un utente poteva aprire i devtools, scrivere `{"role":"admin", "purchasedTools":[...tutti]}` in quella chiave, e ottenere accesso admin non appena una chiamata al backend falliva per qualunque motivo.

Introdotto come ponte di sviluppo (commit `cb9e283`, 2026-07-03) durante la migrazione da mock a backend Django reale; il rischio era già noto e documentato (`// TODO go-live` in `auth.ts`, `AUTH-2` in `todo.md`), mai risolto.

### Decisione presa

**Opzione A — rimozione totale del fallback**, scelta esplicitamente dall'utente dopo aver visto entrambe le opzioni (A: nessuna stampella, errore chiaro e accesso negato; B: env var dev-only con banner visibile). Motivazione: prodotto a pagamento, meno superficie di errore possibile è preferibile a un interruttore aggiuntivo da configurare correttamente.

### Cosa è cambiato

- `src/api/auth.ts`: `apiLogin`/`apiMe` non hanno più `try/catch` — l'errore di `apiFetch` propaga sempre al chiamante. Rimossi anche `IS_PROD` (mai letto) e l'import di `setTokens` (usato solo dal ramo mock).
- `src/data/mockUsers.ts`: rimosso l'intero array `MOCK_USERS` (0 consumatori rimasti in tutto il repo) — non solo il percorso di codice, anche il dato (5 password in chiaro) non esiste più nel sorgente. `TOOLS_CATALOG`/`User`/`ToolId` (usati da Dashboard/Sidebar/altri, non collegati al fallback) restano intatti.
- `src/auth/AuthContext.tsx`: **nessuna modifica**. La sua logica di logout-su-fallimento (`apiMe().catch(() => { setUser(null); ...clearTokens(); })`) era già corretta — semplicemente non scattava mai perché `apiMe()` non falliva mai davvero. Ora si attiva automaticamente.
- `src/components/LoginPage.tsx`: non toccato (fuori perimetro/UI) — **effetto collaterale noto e accettato**: il bottone "Entra come Demo" userà ora il login reale contro Django; siccome oggi esiste un solo account reale (`admin@aea.it`, per AUTH-1/S0), il demo mostrerà "Email o password non corretti" finché non verrà creato un account demo reale nel backend.

### Come è stato verificato

1. **`tsc -b --noEmit`**: pulito ad ogni modifica.
2. **Build di produzione reale** (`npm run build`, non `dev`): eseguita con successo. Grep mirato su `dist/` per le vecchie credenziali (`admin2024`, `password123`, `mario@test.it`, `laura@test.it`, `vino@test.it`, `mock-access-token`) → **0 risultati**. Non è una garanzia probabilistica da tree-shaking: il codice che leggeva quei dati non esiste più, quindi non c'è nulla da tree-shakare. (Le credenziali demo `demo@aeaconsulenze.it`/`Demo2024!` restano nel bundle, ma sono il prefill pubblico e dichiarato del bottone Demo in `LoginPage.tsx`, non il fallback rimosso.)
3. **Test nuovo**: `src/auth/AuthContext.test.tsx`, 2 casi:
   - `login()` con backend che fallisce (fetch mockato a reject) → risolve `false`, `user` resta `null`, nessuna scrittura in `aea_user`.
   - Mount con cache `aea_user` **manomessa** (`role: 'admin'`, tutti i tool acquistati — simula esattamente l'attacco descritto nel vecchio TODO) + `apiMe()` che fallisce → `user` finisce `null`, cache e token vengono cancellati, non l'account finto elevato.
   - Nota tecnica: isolato un bug d'ambiente preesistente (jsdom 29 + Node 25 → `localStorage` non funzionante sotto vitest in tutta la repo, già noto e già risolto altrove in `.worktrees/mobile-redesign/vitest.setup.ts` ma mai portato su `main`). Risolto con un polyfill **scoped al solo file di test nuovo**, per non toccare `vite.config.ts` (fuori perimetro). Il gap resta aperto per l'intera repo — nessun altro test lo usa oggi, ma qualunque test futuro con `localStorage` sotto jsdom lo incontrerà.
4. **Suite completa**: `npx vitest run --exclude '**/.worktrees/**' --exclude '**/.claude/**'` → **98/98 verdi** (96 preesistenti + 2 nuovi), ripetuto 2 volte.

### Cosa resta aperto

- **Bottone "Entra come Demo"** in `LoginPage.tsx` fallirà in produzione finché non esiste un account demo reale in Django (dipende da AUTH-1, già tracciato in `todo.md`) — non risolto qui, fuori perimetro.
- **Gap ambiente jsdom/localStorage** sotto Node 25 — impatta qualunque test futuro che usi `localStorage` con `@vitest-environment jsdom` in tutta la repo, non solo qui. Fix già esistente e pronto da copiare da `.worktrees/mobile-redesign/vitest.setup.ts`, mai portato su `main`.

---

## Database ingredienti — verifica dati completata (2026-07-30)

**Perimetro**: solo dati (`public/data/ingredientsDB.json`), nessun file di codice toccato.

### Cosa è stato verificato

Confronto **completo** (non a campione) dei 1071 ingredienti base contro il file Excel master di riferimento (`Programma tabelle valori nutrizionali con calcolo.xlsx`, foglio "database", localizzato in `_materiale e modifiche_app AEA/PRODOTTI DIGITALI/...` — percorso spostato rispetto a quello scritto negli script in `scripts/*.cjs`, mai aggiornato). Mappatura colonne validata su dati campione reali prima del confronto (es. "acciughe in olio di oliva": kcal, grassi, sodio identici tra JSON ed Excel).

**Risultato**: 1071/1076 ingredienti trovati per nome, 93 differenze di campo concentrate in 12 ingredienti:

- **8 spiegate**: sono le correzioni CREA BDA 2019 già documentate in `AUDIT.md` (V6, 2026-07-08/09) — banana, burro, carote, fegato di pollo, parmigiano reggiano, miele bio, farina di lenticchie rosse bio, mozzarella di bufala. Applicate solo al JSON all'epoca, mai riportate nel file Excel — il JSON è più corretto dell'Excel qui, non il contrario.
- **4 approfondite con ricerca su CREA BDA** (alimentinutrizione.it): 3 (semola di grano duro rimacinata, misto per soffritto, formaggio grattugiato da mix di formaggi a pasta dura) risultano con l'Excel semplicemente **incompleto** (celle potassio/calcio/ferro/colesterolo a zero secco — fisiologicamente impossibile, non un valore verificato) — confrontando coi CREA più vicini (Parmigiano Reggiano DOP, Frumento duro) il JSON risulta plausibile. Nessuna azione necessaria.

### Scoperta collaterale: 12 nomi duplicati nel database (24 righe)

Non isolato al lievito — trovati altri 11 nomi con 2 righe ciascuno. Analizzati singolarmente:

- **10 duplicati innocui** (stessi valori nutrizionali, solo differenze cosmetiche di etichetta/categoria): agente/agenti di rivestimento, fumo liquido, noci di macadamia, preparato per ginseng, propoli, prosciutto cotto, prosciutto crudo, proteina di frumento vitalizzata, segale. **Rimossa la riga ridondante**, tenuta quella con etichetta più corretta.
- **lievito di birra disidratato**: le 2 righe avevano dati nutrizionali realmente diversi (kcal 377 vs 335, fibre 0 vs 25, micronutrienti assenti vs presenti). CREA BDA ha solo la variante "compressa" (fresca, 71% acqua) — non comparabile alla secca senza conversione, quindi non verificabile con la fonte accreditata disponibile. **Tenuta la riga più completa** (kcal 335.6, con potassio/calcio/ferro popolati — coerente con una stima di conversione dal dato CREA compresso), **rimossa** quella incompleta, aggiunto `fonte_dati: "da verificare con fornitore — ..."` (stesso pattern già usato per la farina di lenticchie rosse in AUDIT V6).
- **preparato a base di frutti di bosco**: le 2 righe avevano liste ingredienti dichiarate diverse (una con lamponi/more, l'altra con fragole e conservante) — 2 prodotti commerciali reali con lo stesso nome generico, non un errore. **Rinominati** in `preparato a base di frutti di bosco (mirtilli, lamponi, more)` e `preparato a base di frutti di bosco (mirtilli, fragole, con conservante)` per distinguerli.

### Scoperta collaterale 2: copia morta del database in `src/data/`

`src/data/ingredientsDB.json` (488 KB, tracciato in git) risultava **non importato da nessun file** (unico riferimento: una riga commentata in `NutrizionaleCalc.tsx`) e conteneva ancora i 12 duplicati appena corretti nella copia reale (`public/data/ingredientsDB.json`, l'unica effettivamente servita all'app via `fetch('/data/ingredientsDB.json')`). **Eliminato** — rischio concreto altrimenti: riattivare per errore quell'import avrebbe reintrodotto silenziosamente i dati vecchi/duplicati.

### Come è stato verificato

1. Confronto programmatico completo (script Node, non a campione) JSON vs Excel su tutti i campi nutrizionali principali, con tolleranza di arrotondamento.
2. Ricerca diretta su CREA BDA (alimentinutrizione.it) per i 4 casi irrisolti, con lettura delle tabelle di composizione reali.
3. `tsc -b --noEmit` pulito dopo ogni modifica.
4. `npx vitest run --exclude '**/.worktrees/**' --exclude '**/.claude/**'` → 98/98 verdi.
5. Verifica end-to-end: dev server avviato, file `/data/ingredientsDB.json` interrogato via `fetch()` reale dal browser (lo stesso path usato dall'app) — confermati 1065 ingredienti, 0 nomi duplicati, nota `fonte_dati` presente sulla riga lievito, nomi frutti di bosco distinti.

### Cosa resta aperto

- **lievito di birra disidratato**: valore accettato come "più plausibile" ma non confermato al 100% — richiede scheda tecnica del fornitore specifico per chiudere davvero la verifica (campo `fonte_dati` già pronto per essere aggiornato quando disponibile).
- **Verifica dati non ancora estesa oltre questi 12** — i restanti ~1053 ingredienti matchati senza discrepanze rispetto all'Excel non sono stati controllati contro CREA BDA in modo indipendente (l'Excel stesso non è mai stato validato al 100% contro la fonte primaria — resta il limite già noto di V6 in `AUDIT.md`).

---

## QUID header — risolto (2026-07-30)

**Perimetro**: solo `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` e `src/engines/nutrizionaleCalcEngine.ts`.

**Segnalato dall'utente**: verifica manuale contro il file Excel aziendale (ricetta "Lasagna alla Bolognese") — nella tabella Riepilogo desktop, l'header della colonna QUID mostrava un valore (es. "109,629%") diverso dalla somma dei QUID di riga (che sommavano correttamente a ~100%).

### Causa

In `NutrizionaleCalc.tsx`, la sezione Riepilogo (`expertTab === 'riepilogo'`) calcolava il QUID di ogni riga tenendo conto dell'acqua persa in cottura (`grammiEffettivi = isAcqua ? max(0, grammiXpzuv − caloAcqua) : grammiXpzuv`), ma l'header sommava direttamente `totGrammiXpzuv` — il totale **grezzo, prima** di sottrarre l'acqua persa — invece della somma dei valori effettivi mostrati riga per riga. La differenza tra le due basi di calcolo produceva uno scarto pari esattamente alla percentuale di acqua persa in cottura sul peso finito (da cui il "109,629%" invece di ~100%). Bug isolato al desktop: la versione mobile (`mobile/RiepilogoTab.tsx`) non ha questa logica di calo-acqua e quindi non era affetta (ma nemmeno applica questa correzione al proprio QUID — discrepanza desktop/mobile preesistente, segnalata ma non toccata in questo intervento).

### Fix

Estratta la formula QUID (per singolo ingrediente) in una funzione pura `calcQuid(grammiXpzuv, isAcqua, caloAcqua, pesoFinitoPz)` in `nutrizionaleCalcEngine.ts`. Sia l'header sia ogni riga ora chiamano la stessa funzione — l'header somma `calcQuid(...)` su tutti gli ingredienti uniti invece di usare `totGrammiXpzuv` grezzo. Per costruzione, la somma dei QUID di riga ora coincide sempre con l'header (nessuna doppia formula da tenere allineata a mano in futuro).

**Documentazione della scelta di precisione** (Step 3, non codice): commento nel JSDoc di `calcQuid()` che spiega perché il calcolo è tenuto a precisione piena fino al risultato finale (arrotondamento solo in visualizzazione) — più preciso del foglio Excel storico sugli ingredienti in piccola quantità, che arrotonda un passaggio intermedio a 2 decimali prima di applicare il fattore di concentrazione. Serve a evitare che una sessione futura "corregga" il calcolo per farlo somigliare all'Excel.

### Verifica

- 6 nuovi test in `nutrizionaleCalcEngine.test.ts` per `calcQuid`: ingrediente normale, `pesoFinitoPz=0`, ingrediente acqua con calo, clamp a 0 se il calo supera il peso dell'acqua, e un test di regressione esplicito che riproduce lo scenario "Lasagna" (500g grezzi, 400g finiti, 100g di acqua persa in cottura) verificando che la somma dei QUID di riga sia tra 99.9% e 100.1% — prima del fix sarebbe stata 125%.
- `tsc -b --noEmit` pulito.
- `npx vitest run --exclude '**/.worktrees/**' --exclude '**/.claude/**'` → **104/104 verdi** (98 preesistenti + 6 nuovi), ripetuto 2 volte.

### Cosa resta aperto

- Discrepanza desktop/mobile sul calcolo QUID: il mobile (`mobile/RiepilogoTab.tsx`) non applica la correzione per l'acqua persa in cottura che il desktop ha sempre avuto — non è il bug segnalato in questa sessione (mobile non ha mai avuto lo scarto header/riga, essendo la stessa formula in entrambi i punti), ma resta una differenza di precisione tra le due piattaforme non ancora armonizzata.
