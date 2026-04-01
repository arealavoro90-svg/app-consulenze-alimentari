const FACTORS = {
    kcal: { fat: 9, carbs: 4, polyols: 2.4, protein: 4, fiber: 2, organicAcids: 3, alcohol: 7, erythritol: 0 },
    kj: { fat: 37, carbs: 17, polyols: 10, protein: 17, fiber: 8, organicAcids: 13, alcohol: 29, erythritol: 0 }
};

function roundEU(val, key) {
    if (val < 0.5 && key !== 'energyKcal' && key !== 'energyKj') return 0;
    if (key === 'energyKcal' || key === 'energyKj') return Math.round(val);
    return Math.round(val * 10) / 10;
}

function roundUSA(val, key) {
    if (val < 0.5 && key !== 'energyKcal') return 0;
    if (key === 'energyKcal') return Math.round(val);
    return Math.round(val * 10) / 10;
}

function roundCanada(val, key) {
    if (key === 'energyKcal' || key === 'energyKj') {
        return val < 5 ? 0 : Math.round(val);
    }
    if (key === 'fat' || key === 'saturatedFat' || key === 'transFat') {
        if (val < 0.5) return 0;
        if (val <= 5) return Math.round(val * 10) / 10;
        return Math.round(val);
    }
    if (key === 'cholesterol') {
        return val < 2 ? 0 : Math.round(val);
    }
    if (key === 'sodium' || key === 'potassium' || key === 'calcium') {
        return val < 5 ? 0 : Math.round(val);
    }
    if (key === 'carbohydrates' || key === 'fibre' || key === 'sugars' || key === 'protein') {
        return val < 0.5 ? 0 : Math.round(val);
    }
    if (key === 'iron') {
        return val < 0.05 ? 0 : Math.round(val * 10) / 10;
    }
    return Math.round(val * 10) / 10;
}

function roundAustralia(val, key) {
    if (key === 'energyKcal' || key === 'energyKj') return Math.round(val);
    return Math.round(val * 10) / 10;
}

function applyRounding(val, key, region) {
    switch (region) {
        case 'UE': return roundEU(val, key);
        case 'USA': return roundUSA(val, key);
        case 'CANADA': return roundCanada(val, key);
        case 'AUSTRALIA':
        case 'ARABI': return roundAustralia(val, key);
        default: return roundEU(val, key);
    }
}

const PRECISION = 10000;
const p = (v) => Math.round(v * PRECISION) / PRECISION;

function calculateEnergy(values) {
    const fiber = values.fibre || 0;
    const polyols = values.polyols || 0;
    const erythritol = values.erythritol || 0;
    const carbsAvailable = Math.max(0, (values.carbohydrates || 0) - fiber - polyols - erythritol);

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

function calculateFromRecipe(items, portionSize, region = 'UE', finishedWeight, cookingLoss = 0) {
    const totalRawWeight = items.reduce((s, it) => s + it.grams, 0);
    let finalWeight = totalRawWeight;
    if (finishedWeight && finishedWeight > 0) {
        finalWeight = finishedWeight;
    } else if (cookingLoss > 0) {
        finalWeight = p(totalRawWeight * (1 - cookingLoss / 100));
    }

    const keys = ['fat', 'saturatedFat', 'carbohydrates', 'protein', 'salt', 'sugars'];
    const totals = {};
    for (const { ingredient: ing, grams } of items) {
        for (const key of keys) {
            let nutrientPer100 = 0;
            if (key === 'carbohydrates') {
                nutrientPer100 = ing.carbs || 0;
            } else {
                nutrientPer100 = ing[key] || 0;
            }
            const absoluteAmount = p((nutrientPer100 * grams) / 100);
            totals[key] = p((totals[key] || 0) + absoluteAmount);
        }
    }

    const rawPer100g = {};
    for (const key of keys) {
        rawPer100g[key] = p((totals[key] / finalWeight) * 100);
    }

    const energy = calculateEnergy(rawPer100g);
    rawPer100g.energyKj = energy.kj;
    rawPer100g.energyKcal = energy.kcal;

    const per100g = {};
    for (const key in rawPer100g) {
        per100g[key] = applyRounding(rawPer100g[key], key, region);
    }

    return { per100g, rawPer100g };
}

// TEST RUN
const testIngredients = [
    {
        ingredient: {
            nameIT: 'test product',
            fat: 11.9,
            carbs: 0.15,
            protein: 27.2,
            salt: 14.75,
            sugars: 0.15,
            saturatedFat: 3.04
        },
        grams: 100
    }
];

console.log('--- Logic Verification ---');
['UE', 'USA', 'CANADA', 'AUSTRALIA'].forEach(reg => {
    const res = calculateFromRecipe(testIngredients, 100, reg);
    console.log(`Region: ${reg}`);
    console.log(`  Kcal: ${res.per100g.energyKcal} (Raw: ${res.rawPer100g.energyKcal})`);
    console.log(`  Fat: ${res.per100g.fat} (Raw: ${res.rawPer100g.fat})`);
    console.log(`  Protein: ${res.per100g.protein} (Raw: ${res.rawPer100g.protein})`);
});
