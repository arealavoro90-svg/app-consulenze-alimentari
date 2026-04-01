export type RegionFormat = 'UE' | 'USA' | 'CANADA' | 'AUSTRALIA' | 'ARABI';

// US FDA Reference Values (2000 kcal diet)
const US_DV = {
    fat: 78,
    saturatedFat: 20,
    cholesterol: 300,
    sodium: 2300,
    carbohydrates: 275,
    fibre: 28,
    addedSugars: 50, // Not currently tracked, defaulting to 0 or omitting
    protein: 50,
    vitaminD: 20, // mcg
    calcium: 1300,
    iron: 18,
    potassium: 4700
};

// Canadian Reference Values (per 2016 updates)
const CA_DV = {
    fat: 75,
    satTrans: 20,
    cholesterol: 300,
    sodium: 2300,
    carbohydrates: 0, // No longer has DV
    fibre: 28,
    sugars: 100, // Canada has a DV for total sugars!
    protein: 0, // Varies, but usually no %DV shown unless claiming
    potassium: 3400,
    calcium: 1300,
    iron: 18
};

// Helper to calculate % DV
export function getPercentage(amount: number | undefined, dailyValue: number): number | null {
    if (amount === undefined || dailyValue === 0) return null;
    return Math.round((amount / dailyValue) * 100);
}

export function formatCanadaRounding(value: number, type: 'energy' | 'fat' | 'carbs' | 'protein' | 'sodium' | 'minerals'): number {
    if (value === undefined) return 0;

    // As per Canadian rounding rules loosely described in Excel
    if (type === 'energy' && value < 5) return 0;

    // Apply standard Math.round for now
    return Math.round(value);
}

export { US_DV, CA_DV };
