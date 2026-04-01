import type { IngredientDB } from '../data/ingredientsDB';
import { getRules } from '../logic/localizationModule';
import type { Region } from '../logic/localizationModule';

export interface NutritionalValues {
    energyKj: number;
    energyKcal: number;
    fat: number;
    saturatedFat: number;
    monoFat?: number;
    polyFat?: number;
    transFat?: number;
    cholesterol?: number;
    carbohydrates: number;
    sugars: number;
    fibre?: number;
    polyols?: number;
    erythritol?: number;
    organicAcids?: number;
    protein: number;
    salt: number;
    sodium?: number;
    potassium?: number;
    calcium?: number;
    iron?: number;
    alcohol?: number;
}

export interface RecipeIngredient {
    ingredient: IngredientDB;
    grams: number;
}

export interface NutritionalResult {
    // Pesaggi intermedi richiesti
    totalNutrientsRaw: Partial<NutritionalValues>; // Grammi totali nella ricetta
    totalRecipeWeight: number; // Peso crudo totale
    finalProductWeight: number; // Peso dopo cooking loss

    // Valori calcolati (sempre ad alta precisione)
    valuePer100gRaw: NutritionalValues;    // Su 100g di peso crudo
    valuePer100gFinal: NutritionalValues;  // Su 100g di peso finale (pre-arrotondamento)

    // Valori finali arrotondati per etichetta
    roundedValuePer100gFinal: NutritionalValues;
    roundedValuePerPortion: NutritionalValues;

    portionSize: number;
}

const FACTORS = {
    kcal: { fat: 9, carbs: 4, polyols: 2.4, protein: 4, fiber: 2, organicAcids: 3, alcohol: 7, erythritol: 0 },
    kj: { fat: 37, carbs: 17, polyols: 10, protein: 17, fiber: 8, organicAcids: 13, alcohol: 29, erythritol: 0 }
};

const PRECISION = 10000;
const p = (v: number) => Math.round(v * PRECISION) / PRECISION;

export function calculateEnergy(values: Partial<NutritionalValues>): { kcal: number; kj: number } {
    const fiber = values.fibre || 0;
    const polyols = values.polyols || 0;
    const erythritol = values.erythritol || 0;
    // EU Reg. 1169/2011, Annex XIV: available carbs = total carbs - polyols - erythritol
    // Fiber is NOT subtracted from carbs; it contributes separately (8 kJ/g, 2 kcal/g)
    const carbsAvailable = Math.max(0, (values.carbohydrates || 0) - polyols - erythritol);

    const kcal = p(
        (values.fat || 0) * FACTORS.kcal.fat +
        carbsAvailable * FACTORS.kcal.carbs +
        polyols * FACTORS.kcal.polyols +
        (values.protein || 0) * FACTORS.kcal.protein +
        fiber * FACTORS.kcal.fiber +
        (values.organicAcids || 0) * FACTORS.kcal.organicAcids +
        (values.alcohol || 0) * FACTORS.kcal.alcohol
    );

    const kj = p(
        (values.fat || 0) * FACTORS.kj.fat +
        carbsAvailable * FACTORS.kj.carbs +
        polyols * FACTORS.kj.polyols +
        (values.protein || 0) * FACTORS.kj.protein +
        fiber * FACTORS.kj.fiber +
        (values.organicAcids || 0) * FACTORS.kj.organicAcids +
        (values.alcohol || 0) * FACTORS.kj.alcohol
    );

    return { kcal, kj };
}

export function calculateFromRecipe(
    items: RecipeIngredient[],
    portionSize: number,
    region: Region = 'UE',
    finishedWeight?: number,
    cookingLoss = 0
): NutritionalResult {
    const totalRecipeWeight = items.reduce((s, it) => s + it.grams, 0);

    let finalProductWeight = totalRecipeWeight;
    if (finishedWeight && finishedWeight > 0) {
        finalProductWeight = finishedWeight;
    } else if (cookingLoss > 0) {
        finalProductWeight = p(totalRecipeWeight * (1 - cookingLoss / 100));
    }

    const keys: (keyof NutritionalValues)[] = [
        'fat', 'saturatedFat', 'monoFat', 'polyFat', 'transFat', 'cholesterol',
        'carbohydrates', 'sugars', 'fibre', 'polyols', 'erythritol', 'organicAcids',
        'protein', 'salt', 'sodium', 'potassium', 'calcium', 'iron', 'alcohol'
    ];

    // 1. Sum nutrients across all ingredients (TotalNutrientsRaw)
    const totalNutrientsRaw: any = {};
    for (const { ingredient: ing, grams } of items) {
        for (const key of keys) {
            let nutrientPer100 = 0;
            if (key === 'carbohydrates') {
                nutrientPer100 = (ing as any).carbs || 0;
            } else {
                nutrientPer100 = (ing as any)[key] || 0;
            }
            const absoluteAmountInIng = p((nutrientPer100 * grams) / 100);
            totalNutrientsRaw[key] = p((totalNutrientsRaw[key] || 0) + absoluteAmountInIng);
        }
    }

    // 2. Calculate ValuePer100g_Raw (pre-cooking)
    const valuePer100gRaw: any = {};
    for (const key of keys) {
        valuePer100gRaw[key] = p((totalNutrientsRaw[key] / totalRecipeWeight) * 100);
    }
    const energyRaw = calculateEnergy(valuePer100gRaw);
    valuePer100gRaw.energyKj = energyRaw.kj;
    valuePer100gRaw.energyKcal = energyRaw.kcal;

    // 3. Calculate ValuePer100g_Final (post-cooking, high precision)
    const valuePer100gFinal: any = {};
    for (const key of keys) {
        valuePer100gFinal[key] = p((totalNutrientsRaw[key] / finalProductWeight) * 100);
    }
    const energyFinal = calculateEnergy(valuePer100gFinal);
    valuePer100gFinal.energyKj = energyFinal.kj;
    valuePer100gFinal.energyKcal = energyFinal.kcal;

    // 4. Apply Rounding Rules (Final output for label)
    const rules = getRules(region);
    const roundedValuePer100gFinal: any = {};
    for (const key in valuePer100gFinal) {
        if (key === 'energyKj' || key === 'energyKcal') {
            roundedValuePer100gFinal[key] = rules.roundEnergy(valuePer100gFinal[key]);
        } else {
            roundedValuePer100gFinal[key] = rules.roundNutrient(valuePer100gFinal[key], key);
        }
    }

    // 5. Calculate Portion Values
    const ratio = portionSize / 100;
    const roundedValuePerPortion: any = {};
    for (const key in roundedValuePer100gFinal) {
        // Rounding is applied to the raw portion value
        const rawPortion = p(valuePer100gFinal[key] * ratio);
        if (key === 'energyKj' || key === 'energyKcal') {
            roundedValuePerPortion[key] = rules.roundEnergy(rawPortion);
        } else {
            roundedValuePerPortion[key] = rules.roundNutrient(rawPortion, key);
        }
    }

    return {
        totalNutrientsRaw,
        totalRecipeWeight,
        finalProductWeight,
        valuePer100gRaw: valuePer100gRaw as NutritionalValues,
        valuePer100gFinal: valuePer100gFinal as NutritionalValues,
        roundedValuePer100gFinal: roundedValuePer100gFinal as NutritionalValues,
        roundedValuePerPortion: roundedValuePerPortion as NutritionalValues,
        portionSize
    };
}

