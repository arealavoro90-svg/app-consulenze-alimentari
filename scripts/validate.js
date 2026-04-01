import { calculateNutritionalValues } from '../src/engines/nutritionalEngine.js';
import { INGREDIENTS_DB } from '../src/data/ingredientsDB.js';

// Mock some data for verification
const sample = INGREDIENTS_DB.find(i => i.nameIT.includes('acciughe in olio di oliva'));
if (!sample) {
    console.error('Sample ingredient not found');
    process.exit(1);
}

console.log('--- VERIFICATION: Ingredient High-Precision Data ---');
console.log('Name:', sample.nameIT);
console.log('Kcal (Raw in DB):', sample.kcal);
console.log('Salt (Raw in DB):', sample.salt);

const result = calculateNutritionalValues({
    ...sample,
    carbohydrates: sample.carbs,
    portionSize: 100
});

console.log('\n--- VERIFICATION: Engine Output (per 100g) ---');
console.log('Rounded Kcal:', result.per100g.energyKcal);
console.log('Raw Kcal:', result.rawPer100g.energyKcal);
console.log('Rounded Salt:', result.per100g.salt);
console.log('Raw Salt:', result.rawPer100g.salt);

// Check portion calculation (50g)
const portionResult = calculateNutritionalValues({
    ...sample,
    carbohydrates: sample.carbs,
    portionSize: 50
});

console.log('\n--- VERIFICATION: Engine Output (per Portion 50g) ---');
console.log('Rounded Salt (Portion):', portionResult.perPortion.salt);
console.log('Raw Salt (Portion):', portionResult.rawPerPortion.salt);

if (sample.salt > 0 && result.rawPer100g.salt === sample.salt) {
    console.log('\nSUCCESS: High-precision data preserved in rawPer100g');
} else {
    console.warn('\nWARNING: Salt value might have been rounded prematurely or not matching');
}
