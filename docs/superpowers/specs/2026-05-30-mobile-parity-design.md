# Mobile Parity — NutrizionaleCalc
_Spec approvata dal cliente il 2026-05-30 (opzione B: parità completa)_

## Obiettivo
Rendere `NutrizionaleCalcMobile` funzionalmente identico a `NutrizionaleCalc` (desktop).
Riferimento desktop: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` (~3960 righe).

---

## Gap analizzati

### Bug critici (bloccano l'uso equivalente)
| ID | Problema | File | Priorità |
|----|----------|------|----------|
| B1 | EU sub-tab hardcoded `"100g"` | TabellaTab.tsx:107 | CRITICA |
| B2 | USA layout/measure/servingRef hardcoded | TabellaTab.tsx:115-118 | CRITICA |
| B3 | Canada/Australia/Arabi mostrano placeholder | TabellaTab.tsx:120-128 | CRITICA |
| B4 | Serving sizes CA/AU/Arabi non configurabili | MobileNutForm | ALTA |
| B5 | Peso specifico (liquidi) assente | MobileNutForm | MEDIA |

### Funzionalità mancanti (parità completa)
| ID | Feature | Desktop | Priorità |
|----|---------|---------|----------|
| F1 | Multi-componente (Impasto + Farcitura...) | ✅ | ALTA |
| F2 | Resa % per ingrediente | ✅ | ALTA |
| F3 | Peso finito prodotto (post-cottura) | ✅ | ALTA |
| F4 | Additivi specifici (E-numbers) | ✅ | MEDIA |
| F5 | Costi EUR/kg | ✅ | BASSA |
| F6 | Allergenici dichiarati | ✅ | ALTA |
| F7 | Optional nutrients (NutrientSelectModal) | ✅ | MEDIA |

---

## Architettura proposta

### Nuovi file estratti come componenti condivisi
I rendering di Canada/Australia/Arabi esistono inline in `NutrizionaleCalc.tsx`.
Vengono estratti come file separati (come già fatto per TabUE e TabUSA):

- `src/calculators/NutrizionaleCalc/TabCanada.tsx`
  — Layout: verticale, orizzontale, lineare (EN+FR bilingue, Health Canada)
- `src/calculators/NutrizionaleCalc/TabAustralia.tsx`
  — Layout: tabella FSANZ, colonne per serving/DI%/100g
- `src/calculators/NutrizionaleCalc/TabArabi.tsx`
  — Layout: FDA-style Gulf Standard, DV Gulf 2000kcal

### Estensione MobileNutForm
Aggiunta serving sizes per tutte le 5 regioni + specific gravity.
Tutti i campi come stringhe (input controllato), serializzabili in archivio.

### TabellaTab.tsx — Refactor completo
State locale aggiunto:
- `euSubTab: EUSubTab` (default '100g')
- `usaSubTab: 'verticale'|'orizzontale'|'lineare'`
- `usaMeasure: USAMeasure` (default 'g')
- `usaServingRef: USAServingRef` (default 'serving')
- `caSubTab`, `caMeasure`, `caServingRef`
- `arabiServingRef`, `arabiMeasure`

UI aggiunta per ogni regione:
- Selector compact per layout/misure
- Input serving sizes per CA/AU/Arabi (già presenti per UE/USA)

### CalcoloTab.tsx — Estensione (Phase 2)
Refactor da `IngredientRow[]` a `Component[]`:
- Ogni Component ha nome, pzUV, righe ingredienti con resa %
- Peso finito opzionale
- Additivi

---

## Fasi di implementazione

### Fase 1 — Fix TabellaTab + Estrai CA/AU/Arabi (QUESTA SESSIONE)
Task: MOB-P1-1 → MOB-P2-6
File modificati: TabCanada.tsx (nuovo), TabAustralia.tsx (nuovo), TabArabi.tsx (nuovo),
NutrizionaleCalcMobile.tsx (espansione form), TabellaTab.tsx (refactor completo)

### Fase 2 — CalcoloTab avanzato (PROSSIMA SESSIONE)
Task: MOB-P3-1 → MOB-P3-5
File modificati: CalcoloTab.tsx, NutrizionaleCalcMobile.tsx

### Fase 3 — Feature complete (SESSIONE FUTURA)
Task: MOB-P4-1 → MOB-P4-3
File modificati: NutrizionaleCalcMobile.tsx, TabellaTab.tsx

---

## Vincoli (da CLAUDE.md)
- Zero `any` impliciti, zero `@ts-ignore`
- Nessun CSS framework esterno
- Nessun nuovo state manager
- Validazione via `src/utils/validation.ts` dove applicabile
