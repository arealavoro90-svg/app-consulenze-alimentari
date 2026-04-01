---
description: Calculate nutritional values per 100g for a recipe
---

# Workflow: Calcolo Valori Nutrizionali Ricetta

Segui questi passaggi per calcolare accuratamente i valori nutrizionali per 100g di un prodotto finito (ricetta).

## 1. Raccolta Dati Ingredienti

Recupera dal database la lista degli ingredienti utilizzati nella ricetta. Per ogni ingrediente, annota:

- **Peso (g)** utilizzato nella ricetta.
- **Valori Nutrizionali / 100g** (Energia kcal/kJ, Grassi, Carboidrati, Proteine, Sale, Fibre).

## 2. Calcolo Nutrienti Totali nella Ricetta

Per ogni nutriente (es. Proteine), calcola il contributo di ogni singolo ingrediente e sommali:
`Contributo = (PesoIngrediente * ValoreNutrienteDatabase) / 100`
`TotaleNutrienteRicetta = Somma di tutti i Contributi`

## 3. Calcolo Peso Totale Ricetta (Crudo)

Somma il peso di tutti gli ingredienti a crudo:
`PesoTotaleCrudo = Somma(PesiIngredienti)`

## 4. Applicazione Calo Peso (Cooking Loss)

Se la ricetta prevede un calo peso dovuto a cottura, disidratazione o evaporazione:
`PesoProdottoFinito = PesoTotaleCrudo * (1 - CookingLoss% / 100)`

Se non c'è calo peso, il `PesoProdottoFinito` è uguale al `PesoTotaleCrudo`.

## 5. Calcolo Valori per 100g di Prodotto Finito

Normalizza i nutrienti totali sul peso del prodotto finito:
`ValorePer100g = (TotaleNutrienteRicetta / PesoProdottoFinito) * 100`

## 6. Arrotondamento (Regole UE)

Applica le seguenti regole di arrotondamento per la dichiarazione nutrizionale:

- **Energia (kcal/kJ)**: 0 decimali (intero più vicino).
- **Altri Nutrienti**: 1 decimale.
- **Valori < 0.5**: Se il valore finale è inferiore a 0.5, impostare a 0 (per alcuni nutrienti come grassi e carboidrati).
