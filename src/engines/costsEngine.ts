// Cost & Traceability Engine

export interface Ingredient {
    id: string;
    name: string;
    supplier: string;
    lotNumber: string;
    quantity: number;   // kg or L
    unit: 'kg' | 'L' | 'g' | 'ml' | 'pz';
    unitCost: number;   // € per unit
    waste: number;      // % waste/loss (0-100)
}

export interface CostResult {
    totalRawCost: number;
    totalCostWithWaste: number;
    costPerKg: number;
    costPerPortion: number;
    marginPrice: number;      // with 30% margin
    ingredients: IngredientCostBreakdown[];
    traceabilityCode: string;
}

export interface IngredientCostBreakdown {
    name: string;
    supplier: string;
    lotNumber: string;
    quantity: number;
    unit: string;
    rawCost: number;
    effectiveCost: number; // after waste
}

export interface CostInput {
    productName: string;
    batchSizeKg: number;
    ingredients: Ingredient[];
    overheadPercent?: number;  // % (default 15)
}

export function calculateProductionCost(input: CostInput): CostResult {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { productName: _productName, batchSizeKg, ingredients, overheadPercent = 15 } = input;

    const breakdown: IngredientCostBreakdown[] = ingredients.map((ing) => {
        const rawCost = ing.quantity * ing.unitCost;
        const effectiveCost = rawCost * (1 + ing.waste / 100);
        return {
            name: ing.name,
            supplier: ing.supplier,
            lotNumber: ing.lotNumber,
            quantity: ing.quantity,
            unit: ing.unit,
            rawCost: round2(rawCost),
            effectiveCost: round2(effectiveCost),
        };
    });

    const totalRawCost = breakdown.reduce((s, b) => s + b.rawCost, 0);
    const totalCostWithWaste = breakdown.reduce((s, b) => s + b.effectiveCost, 0);
    const costWithOverhead = totalCostWithWaste * (1 + overheadPercent / 100);
    const costPerKg = batchSizeKg > 0 ? round2(costWithOverhead / batchSizeKg) : 0;
    const costPerPortion = round2(costPerKg * 0.15); // default 150g portion
    const marginPrice = round2(costPerKg * 1.3);

    // Generate traceability code
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const lots = ingredients.map((i) => i.lotNumber).join('-');
    const traceabilityCode = `AEA-${date}-${lots.slice(0, 12).toUpperCase()}`;

    return {
        totalRawCost: round2(totalRawCost),
        totalCostWithWaste: round2(totalCostWithWaste),
        costPerKg,
        costPerPortion,
        marginPrice,
        ingredients: breakdown,
        traceabilityCode,
    };
}

function round2(val: number): number {
    return Math.round(val * 100) / 100;
}
