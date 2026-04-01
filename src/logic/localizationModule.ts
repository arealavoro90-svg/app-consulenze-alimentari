/**
 * Localization Module for International Nutritional Tables
 * Implements rounding rules for UE, USA, CANADA, Australia, and Arab Countries.
 */

export type Region = 'UE' | 'USA' | 'CANADA' | 'AUSTRALIA' | 'ARABI';

export interface RoundingRules {
    roundEnergy: (val: number) => number;
    roundNutrient: (val: number, key: string) => number;
}

/**
 * UE (EU Reg 1169/2011)
 */
export const UERules: RoundingRules = {
    roundEnergy: (val) => Math.round(val),
    roundNutrient: (val, key) => {
        // EU Reg. 1169/2011, Annex XV — specific thresholds per nutrient
        if (key === 'salt') {
            if (val < 0.0125) return 0;                    // < 0.0125g → "0"
            if (val < 0.5) return Math.round(val * 100) / 100; // 0.0125–0.5g → 2 decimali
            return Math.round(val * 10) / 10;              // ≥ 0.5g → 1 decimale
        }
        if (key === 'fibre') {
            if (val < 0.5) return 0;
            return Math.round(val * 10) / 10;
        }
        // Grassi, carboidrati, proteine, zuccheri, saturi
        if (val < 0.5) return 0;
        return Math.round(val * 10) / 10;
    }
};

/**
 * USA (Based on user prompt for t. USA.csv)
 * "Calories round to 0, Fat/Carbs/Protein to 1 decimal, set < 0.5 to 0"
 */
export const USARules: RoundingRules = {
    roundEnergy: (val) => Math.round(val),
    roundNutrient: (val) => {
        if (val < 0.5) return 0;
        return Math.round(val * 10) / 10;
    }
};

/**
 * CANADA (Health Canada / Excel sheet t. CANADA verticale)
 */
export const CanadaRules: RoundingRules = {
    roundEnergy: (val) => (val < 5 ? 0 : Math.round(val)),
    roundNutrient: (val, key) => {
        if (key === 'fat' || key === 'saturatedFat' || key === 'transFat') {
            if (val < 0.5) return 0;
            if (val <= 5) return Math.round(val * 10) / 10;
            return Math.round(val);
        }
        if (key === 'cholesterol') return val < 2 ? 0 : Math.round(val);
        if (key === 'sodium' || key === 'potassium' || key === 'calcium') return val < 5 ? 0 : Math.round(val);
        if (key === 'carbohydrates' || key === 'fibre' || key === 'sugars') return val < 0.5 ? 0 : Math.round(val);
        if (key === 'protein') {
            if (val < 0.5) return Math.round(val * 10) / 10;
            return Math.round(val);
        }
        if (key === 'iron') return val < 0.05 ? 0 : Math.round(val * 10) / 10;
        return Math.round(val * 10) / 10;
    }
};

/**
 * Australia / NZ (FSANZ)
 */
export const AustraliaRules: RoundingRules = {
    roundEnergy: (val) => Math.round(val),
    roundNutrient: (val) => Math.round(val * 10) / 10
};

/**
 * Arab Countries (GSO)
 */
export const ArabiRules: RoundingRules = {
    roundEnergy: (val) => Math.round(val),
    roundNutrient: (val) => Math.round(val * 10) / 10
};

export const getRules = (region: Region): RoundingRules => {
    switch (region) {
        case 'USA': return USARules;
        case 'CANADA': return CanadaRules;
        case 'AUSTRALIA': return AustraliaRules;
        case 'ARABI': return ArabiRules;
        default: return UERules;
    }
};
