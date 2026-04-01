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

// Maps NutritionalValues keys to their corresponding IngredientDB keys.
// Keys absent here (iron, energyKj, energyKcal) are not in IngredientDB and return 0.
const NUTRIENT_KEY_MAP: Partial<Record<keyof NutritionalValues, keyof IngredientDB>> = {
    fat: 'fat',
    saturatedFat: 'saturatedFat',
    monoFat: 'monoFat',
    polyFat: 'polyFat',
    transFat: 'transFat',
    cholesterol: 'cholesterol',
    carbohydrates: 'carbs', // NutritionalValues uses 'carbohydrates', IngredientDB uses 'carbs'
    sugars: 'sugars',
    fibre: 'fibre',
    polyols: 'polyols',
    erythritol: 'erythritol',
    organicAcids: 'organicAcids',
    protein: 'protein',
    salt: 'salt',
    sodium: 'sodium',
    potassium: 'potassium',
    calcium: 'calcium',
    alcohol: 'alcohol',
};

function getIngredientNutrient(ing: IngredientDB, key: keyof NutritionalValues): number {
    const ingKey = NUTRIENT_KEY_MAP[key];
    if (!ingKey) return 0;
    const val = ing[ingKey];
    return typeof val === 'number' ? val : 0;
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
    const allKeys: (keyof NutritionalValues)[] = ['energyKj', 'energyKcal', ...keys];

    // 1. Sum nutrients across all ingredients (TotalNutrientsRaw)
    const totalNutrientsRaw: Partial<NutritionalValues> = {};
    for (const { ingredient: ing, grams } of items) {
        for (const key of keys) {
            const nutrientPer100 = getIngredientNutrient(ing, key);
            const absoluteAmountInIng = p((nutrientPer100 * grams) / 100);
            totalNutrientsRaw[key] = p((totalNutrientsRaw[key] ?? 0) + absoluteAmountInIng);
        }
    }

    // 2. Calculate ValuePer100g_Raw (pre-cooking)
    const valuePer100gRaw: Partial<NutritionalValues> = {};
    for (const key of keys) {
        valuePer100gRaw[key] = p(((totalNutrientsRaw[key] ?? 0) / totalRecipeWeight) * 100);
    }
    const energyRaw = calculateEnergy(valuePer100gRaw);
    valuePer100gRaw.energyKj = energyRaw.kj;
    valuePer100gRaw.energyKcal = energyRaw.kcal;

    // 3. Calculate ValuePer100g_Final (post-cooking, high precision)
    const valuePer100gFinal: Partial<NutritionalValues> = {};
    for (const key of keys) {
        valuePer100gFinal[key] = p(((totalNutrientsRaw[key] ?? 0) / finalProductWeight) * 100);
    }
    const energyFinal = calculateEnergy(valuePer100gFinal);
    valuePer100gFinal.energyKj = energyFinal.kj;
    valuePer100gFinal.energyKcal = energyFinal.kcal;

    // 4. Apply Rounding Rules (Final output for label)
    const rules = getRules(region);
    const roundedValuePer100gFinal: Partial<NutritionalValues> = {};
    for (const key of allKeys) {
        const val = valuePer100gFinal[key] ?? 0;
        if (key === 'energyKj' || key === 'energyKcal') {
            roundedValuePer100gFinal[key] = rules.roundEnergy(val);
        } else {
            roundedValuePer100gFinal[key] = rules.roundNutrient(val, key);
        }
    }

    // 5. Calculate Portion Values
    const ratio = portionSize / 100;
    const roundedValuePerPortion: Partial<NutritionalValues> = {};
    for (const key of allKeys) {
        // Rounding is applied to the raw portion value
        const rawPortion = p((valuePer100gFinal[key] ?? 0) * ratio);
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
