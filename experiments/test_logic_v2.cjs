const { getRules } = require('../src/logic/localizationModule');
const { calculateFromRecipe } = require('../src/engines/nutritionalEngine');

// Mock data
const testIngredients = [
    {
        ingredient: {
            nameIT: 'test product high fat',
            fat: 20,
            carbs: 5,
            protein: 10,
            salt: 1,
            sugars: 2,
            saturatedFat: 5
        },
        grams: 100
    }
];

// Valutiamo con cooking loss del 20% (peso finale 80g)
const cookingLoss = 20;
const portionSize = 50;

console.log('--- Prova Validazione Motore v2 ---');
console.log(`Ricetta: 100g ingrediente -> Loss: ${cookingLoss}% -> Peso Finale: 80g`);

const regions = ['UE', 'USA', 'CANADA', 'AUSTRALIA'];

regions.forEach(reg => {
    const res = calculateFromRecipe(testIngredients, portionSize, reg, null, cookingLoss);

    console.log(`\n[Regione: ${reg}]`);
    console.log(`  Peso Crudo: ${res.totalRecipeWeight}g`);
    console.log(`  Peso Finale: ${res.finalProductWeight}g`);
    console.log(`  Grassi Raw/100g (Finito): ${res.valuePer100gFinal.fat.toFixed(4)}`);
    console.log(`  Grassi Arrotondati/100g: ${res.roundedValuePer100gFinal.fat}`);

    if (reg === 'CANADA') {
        console.log(`  Nota Canada: Grassi > 5g devono essere arrotondati all'interno (20/80*100 = 25 -> 25)`);
    }

    console.log(`  Energia (kcal) Arrotondata: ${res.roundedValuePer100gFinal.energyKcal}`);
    console.log(`  Valore per Porzione (${portionSize}g) Grassi: ${res.roundedValuePerPortion.fat}`);
});
