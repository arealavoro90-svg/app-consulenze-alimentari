---
name: nutritional-calc
description: Regole e workflow per i calcoli nutrizionali AEA (EU Reg 1169/2011). Usare quando si tocca nutritionalEngine, nutrizionaleCalcEngine, localizationModule, NutrizionaleCalc (desktop/mobile) o si calcolano/verificano valori nutrizionali di una ricetta. I calcoli attuali FUNZIONANO — obiettivo primario è non introdurre regressioni.
---

# Calcoli nutrizionali — AEA

## Stato: FUNZIONANTE. Non rompere.

I calcoli nutrizionali sono il fulcro dell'app e sono verificati. Prima di qualsiasi modifica:

1. Leggere i file coinvolti per intero prima di proporre.
2. Proporre la modifica e attendere approvazione (regola CLAUDE.md).
3. Dopo la modifica: `npm test` DEVE essere verde. Nessuna eccezione.
4. Se il test copre il caso modificato, aggiornare/estendere il test, mai eliminarlo per farlo passare.

## File chiave

| File | Ruolo | Cautela |
|---|---|---|
| `src/engines/nutritionalEngine.ts` | Fattori energetici, claim, soglie | Fattori EU 1169/2011: intoccabili senza fonte normativa |
| `src/engines/nutrizionaleCalcEngine.ts` | Calcolo ricetta (test: `nutrizionaleCalcEngine.test.ts`) | Test obbligatori |
| `src/logic/localizationModule.ts` | Arrotondamento regionale EU/USA/CA/AU/Arabi | Impatta TUTTI i calcolatori: sempre proporre prima |
| `public/data/ingredientsDB.json` | DB ingredienti (~668KB) | Mai modificare a mano |

## Invarianti di calcolo

- Precisione interna: **10.000x** (interi scalati), arrotondamento solo in output via `localizationModule.ts`.
- Fattori energetici EU Reg 1169/2011 (kcal/g): grassi 9, carboidrati 4, proteine 4, fibre 2, polioli 2.4, alcol 7.

## Workflow: calcolo valori per 100g di ricetta

1. **Raccolta dati**: per ogni ingrediente → peso (g) + valori nutrizionali /100g dal DB.
2. **Nutrienti totali**: `Contributo = (PesoIngrediente × ValoreDB) / 100`; sommare i contributi.
3. **Peso totale crudo**: somma dei pesi ingredienti.
4. **Calo peso (cooking loss)**: `PesoFinito = PesoCrudo × (1 − CookingLoss% / 100)`. Senza calo: PesoFinito = PesoCrudo. Considerare anche la resa % per singolo ingrediente se presente.
5. **Normalizzazione**: `ValorePer100g = (TotaleNutriente / PesoFinito) × 100`.
6. **Arrotondamento UE** (via localizationModule, mai a mano):
   - Energia: 0 decimali
   - Altri nutrienti: 1 decimale
   - Valori < 0.5: → 0 per i nutrienti previsti (es. grassi, carboidrati)

## Verifica finale (obbligatoria)

```bash
npm test          # vitest — deve passare
npx tsc -b        # zero errori TS
```

Se un valore calcolato sembra anomalo, confrontare con il file Excel di riferimento dello strumento prima di "correggere" l'engine.
