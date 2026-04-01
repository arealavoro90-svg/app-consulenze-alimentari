import { calculateFromRecipe, Region } from '../src/engines/nutritionalEngine';

// Mock recipe data derived from Excel "ricette" and "database"
const testIngredients = [
    {
        ingredient: {
            nameIT: 'acciughe in olio di semi di girasole',
            fat: 11.9,
            carbs: 0.15,
            protein: 27.2,
            salt: 14.75,
            sugars: 0.15,
            saturatedFat: 3.04
        } as any,
        grams: 100
    }
];

console.log("--- Testing Nutritional Engine (TS) ---");

const regions: Region[] = ['UE', 'USA', 'CANADA', 'AUSTRALIA'];

regions.forEach(region => {
    const result = calculateFromRecipe(testIngredients, 100, region);
    console.log(`\nRegion: ${region}`);
    console.log(`Energy (kcal): ${result.per100g.energyKcal}`);
    console.log(`Fat: ${result.per100g.fat}`);
    console.log(`Protein: ${result.per100g.protein}`);
    console.log(`Raw Fat (for verification): ${result.rawPer100g.fat}`);
    if (region === 'CANADA') {
        console.log(`Canada Case: Fat should be rounded to integer if > 5. Fat=${result.per100g.fat}`);
    }
});
