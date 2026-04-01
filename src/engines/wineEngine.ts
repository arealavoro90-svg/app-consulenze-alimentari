export interface WineAnalysis {
    fat: number;
    saturatedFat: number;
    alcoholDegree: number;
    tartaricAcid: number;
    malicAcid: number;
    volatileAcidity: number;
    residualSugar: number;
    polyols: number;
    glycerol: number;
    fiber: number;
    proteins: number;
    salt: number;
}

export interface NutritionalInfo {
    energy: number;
    kj: number;
    kcal: number;
    fat: number;
    saturatedFat: number;
    carbohydrates: number;
    sugars: number;
    fiber: number;
    proteins: number;
    salt: number;
}

/**
 * Calculates nutritional information for wine
 * Based on analytical data from wine composition
 */
export function calculateWineNutrition(analysis: WineAnalysis): NutritionalInfo {
    // Wine energy calculation: primarily from alcohol and residual sugars
    // Alcohol: 7 kcal/g, Carbohydrates: 4 kcal/g
    const energyFromAlcohol = analysis.alcoholDegree * 7.9; // ~7-8 kcal per degree alcohol per liter
    const energyFromSugars = analysis.residualSugar * 4;
    const kcal = Math.round((energyFromAlcohol + energyFromSugars) / 10); // per 100ml
    const kj = Math.round(kcal * 4.184);
    
    return {
        energy: kj,
        kj: kj,
        kcal: kcal,
        fat: Math.max(0, analysis.fat),
        saturatedFat: Math.max(0, analysis.saturatedFat),
        carbohydrates: analysis.residualSugar + analysis.polyols + analysis.glycerol,
        sugars: analysis.residualSugar,
        fiber: Math.max(0, analysis.fiber),
        proteins: Math.max(0, analysis.proteins),
        salt: Math.max(0, analysis.salt),
    };
}

/**
 * Calculates carbohydrates in grams per liter for wine
 */
export function calculateCarbohydratesGL(analysis: WineAnalysis): number {
    return analysis.residualSugar + analysis.polyols + analysis.glycerol;
}
