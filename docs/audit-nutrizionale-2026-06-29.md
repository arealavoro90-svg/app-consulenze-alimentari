# Audit Consolidato — Calcolatore Nutrizionale AEA
**Data:** 2026-06-29  
**Scope:** Solo tool Calcolo Valori Nutrizionali (`src/calculators/NutrizionaleCalc/`)  
**Metodo:** 4 agenti paralleli (UI/UX · Frontend · End-User · Backend), read-only

---

## PROBLEMI CRITICI (cross-team, rischio compliance)

### C-1 — Mobile `calcNutrients` produce valori errati
**UI/UX + Frontend + Backend convergono**

`NutrizionaleCalcMobile.tsx:171` manca di:
- 6 micronutrienti (`rame`, `manganese`, `selenio`, `iodio`, `vitK`, `vitB5`) — l'utente li seleziona in `NutrientSelectModal` e ottiene `0,0 mg` su mobile anche se gli ingredienti li contengono
- Logica evaporazione alcol (`NutrizionaleCalc.tsx:246–257`) — prodotti con vino/birra danno valori energetici divergenti desktop vs mobile

**Rischio:** etichette generate su mobile **non-conformi** al Reg. UE 1169/2011.

---

### C-2 — Archivio perde dati a ogni salvataggio
**Frontend + Backend convergono**

`handleSave` (`NutrizionaleCalc.tsx:1538`) salva solo `{nome, grammi}` per ingrediente. **Persi permanentemente:**
- `eurKg` (costo/kg) → ogni reload azzera i costi
- `resa` (resa %) → reload hardcoda `resa: 100`

Reload per nome string (`NutrizionaleCalc.tsx:1572`) — se un ingrediente viene rinominato nel DB, sparisce silenziosamente dalla ricetta caricata.

---

### C-3 — Energia calcolata da DB, non dai macronutrienti
**Backend + End-User convergono**

`NutrizionaleCalc.tsx:206–208` somma `item.ing.kcal * f` (valore preregistrato nel JSON). Il Reg. UE 1169/2011 Allegato XIV impone calcolo da macros con fattori fissi. Il backend Django pianificato userà `Decimal` con calcolo corretto da macros → **stessa ricetta = valori diversi pre/post migrazione**. Rischio normativo diretto.

---

### C-4 — `window.alert()` e `window.confirm()` — 5 violazioni
**UI/UX + Frontend convergono, viola CLAUDE.md**

| File | Riga | Tipo |
|------|------|------|
| `NutrizionaleCalc.tsx` | 1599 | `window.confirm` in `handleNew` |
| `NutrizionaleCalc.tsx` | 1614 | `alert()` in `handleDownloadPNG` |
| `NutrizionaleCalc.tsx` | 1636 | `alert()` in `handleDownloadEtichettaPDF` |
| `NutrizionaleCalc.tsx` | 1640 | `alert()` |
| `NutrizionaleCalc.tsx` | 1643 | `alert()` |
| `SavedTablesModal.tsx` | 67 | `window.confirm` |

In PWA mode e alcuni mobile browser, `confirm()` viene soppresso → delete avviene senza conferma.

---

## UI/UX — Top Issues

| # | Problema | File:riga | Impatto |
|---|---------|-----------|---------|
| 1 | PDF export mobile silenzioso — nessun feedback se `.m-table-preview` non in DOM | `NutrizionaleCalcMobile.tsx:419–432` | Alto |
| 2 | Carica da archivio sovrascrive senza conferma | `SavedTablesModal.tsx:64` | Alto |
| 3 | Nutrienti opzionali non persistiti tra sessioni — reset ogni refresh | `NutrientSelectModal.tsx` + `TabUE.tsx:16–24` | Medio-Alto |
| 4 | Notice errore auto-dismiss 3s senza pulsante chiudi | `TabellaTab.tsx:117–120` | Medio |
| 5 | Contrasto `--m-text-muted` ~3.3:1 — sotto WCAG AA (minimo 4.5:1) | `mobile.css` | Medio |

**Quick wins:**
- **QW1:** `×` su notice + timeout 6s per errori (`TabellaTab.tsx`) — impatto immediato, ~5 righe
- **QW2:** Inline confirm state per delete, 15 righe, zero dipendenze (`SavedTablesModal.tsx:67`)
- **QW3:** `useLocalStorage` per `selectedOptionals` invece di `useState` (`TabellaTab.tsx:97`) — one-liner

---

## FRONTEND — Top Technical Debt

| # | Problema | Severità | Posizioni |
|---|---------|----------|-----------|
| TD-1 | `DBIngredient`, `CalcResult`, `ZERO_CALC`, `scaleResult`, `ALLERGEN_FIELDS` definiti 3–7x — tipi allergen incompatibili (`string` vs `boolean`) | Critica | 10+ file |
| TD-2 | `calcNutrients` duplicato e **divergente** (alcol mancante su mobile) | Alta | `NutrizionaleCalc.tsx:186`, `NutrizionaleCalcMobile.tsx:171` |
| TD-3 | `ADDITIVI_SPECIFICI` (~350 voci) copy-paste in 2 file | Alta | `NutrizionaleCalc.tsx:319`, `CalcoloTab.tsx:16` |
| TD-4 | `NutrizionaleCalc.tsx` god component 1600+ righe, 40+ `useState` | Media | intero file |
| TD-5 | ID generati con `Date.now() + Math.random()` — collisioni possibili | Bassa | `NutrizionaleCalcMobile.tsx:90` |

**Estrazione prioritaria:** creare `src/calculators/NutrizionaleCalc/types.ts` + `calcEngine.ts` come fonte unica di verità per tipi e calcoli condivisi.

---

## END-USER — Gap di prodotto

**Missing per uso professionale quotidiano (ranked):**

1. **Persistenza cloud / export JSON ricetta** — tutto in localStorage = perso su altro device o browser clear
2. **Generazione automatica lista ingredienti** — ordine decrescente per peso, allergeni in bold, QUID — il tool calcola nutrition ma non la lista obbligatoria per legge
3. **Ingredienti composti/sub-ricette** — "besciamella base" deve poter essere un ingrediente in 30 prodotti
4. **Checker claim salutistici** (Reg. UE 1924/2006) — "fonte di fibre ≥3g/100g?" — calcolabile da dati già presenti
5. **Export vettoriale PDF** — attuale è canvas screenshot, non scalabile per packaging

**Gap regolatorio trovato:** `TabUSA` arrotonda sodio sempre a 5mg — FDA 21 CFR 101.9 richiede arrotondamento a 10mg per valori >140mg.

---

## BACKEND — Rischi migrazione Django

| # | Rischio | File | Severità |
|---|---------|------|---------|
| 1 | Archivio perde ingredienti su rename DB (lookup by name string) | `NutrizionaleCalc.tsx:1572` | Alto |
| 2 | Energia da DB non da macros → divergenza valori pre/post migrazione | `NutrizionaleCalc.tsx:206–208` | Alto |
| 3 | No precisione Decimal in TypeScript — CLAUDE.md promette 10.000x ma non implementato | `calcNutrients` intero | Medio |
| 4 | Modello Django Ingredient mancante 35+ campi (vitamine, minerali traccia, 30 allergen fields) | `django-backend-spec.md:§5.2` | **Blocker migrazione** |
| 5 | sessionBridge unidirezionale, lookup per nome mutabile, no TTL | `sessionBridge.ts:97` | Medio |

**Nota:** `useArchive` non controlla spazio localStorage disponibile — `catch` swallows l'errore di overflow silenziosamente.

---

## PRIORITÀ AZIONE SUGGERITA

```
URGENTE (impatto compliance)
├── Fix calcNutrients mobile — aggiungere 6 micronutrienti + alcol evaporation
├── Fix energia da macros (o documentare scelta e risk accepted)
└── Eliminare alert()/confirm() — 5 occorrenze in NutrizionaleCalc.tsx + 1 in SavedTablesModal.tsx

ALTA (integrità dati)
├── Fix archive save — aggiungere eurKg, resa, lookup by ID
├── Estrarre types.ts + calcEngine.ts (fonte unica di verità)
└── Fix Django model — aggiungere 35+ campi mancanti prima di import

MEDIA (UX professionale)
├── Persistere selectedOptionals in localStorage
├── Notice: close button + timeout 6s errori
└── JSON export/import ricette (cloud workaround a costo quasi zero)
```
