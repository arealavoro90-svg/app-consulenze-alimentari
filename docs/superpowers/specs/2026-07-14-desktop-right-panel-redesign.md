# Spec — Redesign pannello destro NutrizionaleCalc (desktop)

Data: 2026-07-14 · Stato: approvata dal cliente (brainstorming visivo)

## Problema

Audit UI (11/20): il pannello destro del calcolatore nutrizionale desktop è il punto più caotico del tool.

- 13 controlli di visualizzazione in una riga (3 layout + 2 riferimento + 4 unità, per regione) — `NutrizionaleCalc.tsx:1936-1969` (USA), `:1978-2004` (Canada), `:2017-2043` (Arabi)
- Griglia porzioni collassabile poco visibile (label 10px uppercase) — `NutrizionaleCalc.tsx:1758-1830`
- Input e output mescolati senza gerarchia

## Obiettivo

Vista di lavoro pulita con tabella ufficiale sempre live; tutte le opzioni di formato spostate in un modale download con anteprima esatta.

## Vincoli assoluti

1. **NON toccare la formattazione attuale delle tabelle**: `TabUE.tsx`, `TabUSA.tsx`, `TabCanada.tsx`, `TabAustralia.tsx`, `TabArabi.tsx` invariati (né markup né stili). Vengono solo renderizzati con props diverse.
2. Zero modifiche a engine/calcoli/rounding (`src/engines/`, `localizationModule.ts`).
3. Il PNG scaricato, a parità di opzioni, deve essere identico a quello attuale.
4. Modalità Guidata desktop: non si implementa.
5. Nessuna dipendenza nuova; token CSS esistenti (`--color-*`), niente hex nuovi.

## Design

### 1. Vista di lavoro (pannello destro)

- **Riga top**: tab regione piccole (UE · USA · CA · AU · AR) + unico bottone `Scarica ufficiale…`
- **Centro**: tabella ufficiale della regione attiva, forzata a layout verticale, aggiornata live con la ricetta
- **Colonna destra fissa ~170px**: campi porzione della regione attiva, sempre visibili, label ≥11px non uppercase. Sostituisce la griglia collassabile `servingsGridOpen`.
  - UE: Porzione, Confezione/U.V., Pezzo
  - USA / Canada / Arabi: CUP, Cucchiaio, Serving, Confezione, Pezzo
  - Australia: Serving, Confezione, Pezzo
- **Rimossi dalla vista**: toolbar layout/riferimento/unità e chips sub-tab UE (`:1838-1844`) in quanto toggle di formato

### 2. Modale download — nuovo componente `DownloadTableModal.tsx`

- Aperto da `Scarica ufficiale…`, titolo con regione attiva
- Colonna opzioni:
  - Layout: Verticale / Orizzontale / Lineare
  - Riferimento/colonne: 100 g / +porzione / per serving / per confezione
  - Unità: g-ml / Tazze / Cucchiai / Pezzi
- Opzioni disabilitate se il dato porzione manca — riuso logica esistente (`NutrizionaleCalc.tsx:1146-1169`)
- Anteprima live: rende lo stesso componente `Tab*` con le props scelte (nessun nuovo renderer)
- Azioni: Annulla / Scarica PNG (riuso `handleDownloadPNG` con ref sull'anteprima del modale)
- Pattern modale coerente con i modali esistenti (`SavedTablesModal.tsx`)

### 3. Stati

- Stati esistenti riusati e letti solo dal modale: `subTab`, `usaServingRef`, `usaMeasure`, `caServingRef`, `caMeasure`, `arabiServingRef`, `arabiMeasure`, `euSubTab`, `auShowDI`
- La vista principale li ignora: forza verticale, 100 g (+porzione se compilata)
- `Salva in archivio`, claims UE, `isDirty`: invariati

## File toccati

| File | Intervento |
|---|---|
| `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` | Ristrutturazione render pannello destro; rimozione toolbar; griglia porzioni → colonna fissa; wiring modale |
| `src/calculators/NutrizionaleCalc/DownloadTableModal.tsx` | NUOVO |
| `src/index.css` | Classi colonna porzioni e header pannello destro |
| `Tab*.tsx` | NESSUNA MODIFICA |

## Verifica

1. `npm test` verde (nessun test tabelle rotto)
2. `npx tsc -b` e `npm run lint` puliti
3. Manuale su dev server, per ogni regione: tabella verticale live identica a prima; colonna porzioni aggiorna la tabella; modale corretto per ogni combinazione; opzioni disabilitate senza dato porzione
4. Regression: PNG prima/dopo identico a parità di ricetta e opzioni

## Fuori scope

- Mobile (redesign già trattato in piani separati)
- Pannello sinistro (ricetta)
- Modalità Guidata
- Scala spaziatura globale / typography (passi successivi del piano audit)
