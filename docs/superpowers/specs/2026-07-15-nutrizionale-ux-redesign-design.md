# Spec: Redesign UX Tool Valori Nutrizionali

**Data**: 2026-07-15  
**Deadline**: Settembre 2026 (~7 settimane)  
**Obiettivo**: Tool pronto per pubblicazione ufficiale — intuitivo per PMI non tecniche e efficiente per consulenti esperti.

---

## Contesto

Il tool nutrizionale è il fulcro dell'app AEA. Attualmente è usabile ma confonde sia gli utenti occasionali (PMI alimentari) che i consulenti esperti nei medesimi punti:

- **Inizio**: nessun onboarding, schermata vuota con decine di campi
- **Durante**: il concetto di "componente" è oscuro, terminologia tecnica (`pzUV`, `% AR`)
- **Fine**: download con opzioni disabilitate senza spiegazione

Vincoli fissi: layout split-panel mantenuto (form sinistra / tabella live destra), calcoli e engine intoccati, stessa feature set per tutti gli utenti.

---

## Approccio scelto: Pannello sinistro a fasi

Il pannello sinistro diventa un **mini-wizard a 3 step** con progress bar in cima. La tabella a destra si aggiorna live in tutti e tre gli step — il valore principale del layout split è preservato.

Una **"Modalità esperta"** (toggle `SlidersHorizontal`) collassa la progress bar e mostra tutto simultaneamente, replicando il layout attuale. Questo è la rete di sicurezza: un click per tornare all'esperienza precedente.

---

## Architettura

### Stato aggiunto (additivo, non sostituisce)
```ts
// NutrizionaleCalc.tsx
const [phase, setPhase] = useState<1 | 2 | 3>(1);
const [expertMode, setExpertMode] = useLocalStorage<boolean>('nutri_expert_mode', false);
```

`expertMode` è persistito in localStorage. Se attivo, la UI mostra tutto simultaneamente (comportamento attuale), la progress bar è nascosta.

### Stato invariato
- `expertTab: 'ricetta' | 'riepilogo'` — integrato come sub-tab in Fase 2
- `activeTab: NationTab` — pannello destro, invariato
- Tutti gli state di calcolo, serving sizes, componenti

### File modificati
| File | Modifica |
|---|---|
| `NutrizionaleCalc.tsx` | Progress bar + phase state + expertMode toggle + label rinominate |
| `NutrizionaleCalcMobile.tsx` | Stessa logica fasi applicata ai 4 tab esistenti |
| `SavedTablesModal.tsx` | Fix BUG-1: `confirm()` → `ConfirmDialog` |
| CSS (index.css o modulo dedicato) | Stili progress bar, accordion porzioni |

### File NON modificati
`SplitShell.tsx`, `Tab*.tsx`, `nutrizionaleCalcEngine.ts`, `nutritionalEngine.ts`, `localizationModule.ts`, `DownloadTableModal.tsx`, `BrowseIngredientsModal.tsx`, `SmartImportModal.tsx`, `sessionBridge.ts`

---

## Fase 1 — "Prodotto"

Schermata iniziale del pannello sinistro.

```
[ ✦ 1 Prodotto ] ──── [ 2 Ingredienti ] ──── [ 3 Dettagli ]    [≡ Esperto]

Nome prodotto *
[_________________________________]

Tipo prodotto
○ Solido   ● Liquido

[Carica da archivio]              [Avanti →]
```

- `[Avanti →]` disabilitato finché nome prodotto è vuoto
- Radio "Solido/Liquido" imposta `isLiquid` (già usato per claim EU e soglie)
- Sostituisce la checkbox "Prodotto liquido" nascosta nella tab UE
- `[Carica da archivio]` apre `SavedTablesModal` — scorciatoia per ri-editare
- Tabella destra: placeholder "Aggiungi ingredienti per vedere la tabella" (no zeri)

**Avanzamento automatico**: se si carica da archivio, `phase` salta a 2.

---

## Fase 2 — "Ingredienti"

```
[ ✓ Prodotto ] ──── [ ✦ 2 Ingredienti ] ──── [ 3 Dettagli ]    [≡ Esperto]

[Ricetta | Riepilogo]   ← sub-tab esistente

── RICETTA ──
▼ Componente: [Nome editabile___________]
  ┌──────────────────────────────────────┐
  │ [Farina 00          ]  250 g  [×]   │
  │ [Burro              ]   80 g  [×]   │
  └──────────────────────────────────────┘
  [+ Aggiungi ingrediente]   [⚡ Import]

[+ Secondo componente]   ← appare solo dopo ≥1 ingrediente nella ricetta

[← Indietro]                           [Avanti →]
```

### Regole di disclosure progressiva
- `[+ Secondo componente]` invisibile finché il primo componente ha 0 ingredienti
- `[+ Componente]` (label generica) per il terzo in poi
- "Pezzi per confezione" (`pzUV`) appare **solo** se ci sono ≥2 componenti, inline sotto il nome componente
- "Resa dopo cottura (%)" appare su espansione riga ingrediente (chevron), non inline di default

### Terminologia aggiornata
| Stato interno | Label UI |
|---|---|
| `pzUV` | "Pezzi per confezione" |
| `resa` | "Resa dopo cottura (%)" |
| `eurKg` | "Costo (€/kg)" |

### Empty states
- Ricerca DB senza risultati: "Nessun risultato per '[query]'. Prova con un nome più generico o aggiungi un ingrediente personalizzato."
- Archivio vuoto: "Nessuna ricetta salvata. Completa una ricetta e premi Salva."

---

## Fase 3 — "Dettagli"

```
[ ✓ Prodotto ] ──── [ ✓ Ingredienti ] ──── [ ✦ 3 Dettagli ]    [≡ Esperto]

Peso prodotto finito (g)  [_______]
ℹ "Peso dopo cottura/lavorazione. Lascia vuoto se uguale alla somma ingredienti."

Peso specifico (g/ml)     [_______]   ← visibile solo se Tipo = Liquido

▶ Additivi (opzionale)               ← sezione collassata di default

[← Indietro]                    [⬇ Scarica tabella]
```

- `[⬇ Scarica tabella]` è il bottone primario (arancione AEA, grande) — apre `DownloadTableModal`
- Il bottone di download nel pannello destro rimane come accesso secondario per esperti
- Le **porzioni** rimangono nel pannello destro dove sono oggi: l'utente le compila vedendo la tabella aggiornarsi in tempo reale

---

## Fix collaterali inclusi nel refactor

### BUG-1 residuo — SavedTablesModal
`confirm()` nativo ancora presente in `SavedTablesModal.tsx:73`. Sostituire con `ConfirmDialog` (già importato e usato in `NutrizionaleCalc.tsx`).

### Tooltip su % AR
Intestazione colonna `% AR` → `% AR ⓘ` con tooltip "% Apporto Raccomandato giornaliero (adulto medio)". Impatta `TabUE.tsx` — modifica solo label, nessun calcolo.

### Opzioni disabilitate in DownloadTableModal
Aggiungere `title` attribute ai bottoni/select disabilitati con messaggio esplicativo:
- euSubTab 'uv' senza confezione → "Inserisci il peso confezione in Fase 3 per abilitare"
- euSubTab 'porzione' senza porzione → "Inserisci la porzione nel pannello destro per abilitare"

---

## Mobile

La stessa logica viene applicata ai tab mobile già esistenti in `NutrizionaleCalcMobile.tsx`:
- Tab "Ricetta" (CalcoloTab) → Fase 1 + Fase 2 collassate in sequenza verticale
- Tab "Mercati" (TabellaTab) → Fase 3 + pannello tabella (già separati su mobile)
- Nessun nuovo tab — si lavora sull'ordine e disclosure dei campi esistenti

---

## Cosa NON è in scope

- Calcoli nutrizionali (engine intoccato)
- Tabelle Tab*.tsx (solo fix tooltip % AR)
- Autenticazione (AUTH-1 — debito separato)
- Backend Django / S0 ingredientsDB
- V1-V8 verifiche normative
- A11Y-1 (V7) — rinviato, non blocca go-live

---

## Criteri di accettazione

1. Un utente nuovo completa la prima tabella EU senza leggere istruzioni
2. Un consulente esperto attiva "Modalità esperta" e lavora come oggi
3. `npm test` verde, `npx tsc -b` zero errori
4. Nessuna regressione sui calcoli (valori identici a prima del refactor)
5. BUG-1 SavedTablesModal: nessun `confirm()` nativo residuo
