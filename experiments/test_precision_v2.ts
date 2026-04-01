import { calculateFromRecipe } from '../src/engines/nutritionalEngine';
import type { Region } from '../src/logic/localizationModule';

// Mock data: 20.3g fat in 100g raw -> 25.375g fat in 80g final
const testIngredients = [
    {
        ingredient: {
            nameIT: 'test product non-integer',
            fat: 20.3,
            carbs: 5,
            protein: 10,
            salt: 1,
            sugars: 2,
            saturatedFat: 5
        } as any,
        grams: 100
    }
];

const cookingLoss = 20;
const portionSize = 50;

console.log('--- Validazione Precisione v2 ---');
console.log(`20.3g grassi in 100g raw -> Loss 20% -> 25.375g/100g`);

const regions: Region[] = ['UE', 'USA', 'CANADA', 'AUSTRALIA'];

regions.forEach(reg => {
    const res = calculateFromRecipe(testIngredients, portionSize, reg, undefined, cookingLoss);

    console.log(`\n[Regione: ${reg}]`);
    console.log(`  Raw: ${res.valuePer100gFinal.fat.toFixed(4)}`);
    console.log(`  Arrotondato: ${res.roundedValuePer100gFinal.fat}`);
});
