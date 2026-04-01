const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';

try {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets['database'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });

    // Mapping focused on Row 11+
    const map = {
        nameIT: 5,
        nameEN: 277,
        category: 281,
        kcal: 283,
        kj: 284,
        water: 310,
        fat: 288,
        saturatedFat: 289,
        monoFat: 290,
        polyFat: 291,
        transFat: 292,
        cholesterol: 293,
        carbs: 294,
        sugars: 295,
        fibre: 296,
        protein: 301,
        salt: 302,
        sodium: 303,
        potassium: 312,
        calcium: 313,
        iron: 315,
        allergens: 105 // Guessing... let's check a few. For now leave empty if not sure.
    };

    const ingredients = [];
    for (let i = 10; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[map.nameIT]) continue;

        const val = (idx) => {
            const v = row[idx];
            return (typeof v === 'number') ? v : (parseFloat(v) || 0);
        };

        ingredients.push({
            id: i - 9,
            nameIT: String(row[map.nameIT]).trim(),
            nameEN: String(row[map.nameEN] || '').replace(/^aaaa/, '').trim(),
            category: String(row[map.category] || 'ingrediente').trim(),
            detail: '', // No clear detail col yet
            allergens: '', // No clear allergens col yet
            kcal: val(map.kcal),
            kj: val(map.kj),
            water: val(map.water),
            fat: val(map.fat),
            saturatedFat: val(map.saturatedFat),
            monoFat: val(map.monoFat),
            polyFat: val(map.polyFat),
            transFat: val(map.transFat),
            cholesterol: val(map.cholesterol),
            carbs: val(map.carbs),
            sugars: val(map.sugars),
            fibre: val(map.fibre),
            protein: val(map.protein),
            salt: val(map.salt),
            sodium: val(map.sodium),
            potassium: val(map.potassium),
            calcium: val(map.calcium),
            iron: val(map.iron)
        });
    }

    let code = `// AUTO-GENERATED FROM EXCEL — DO NOT EDIT MANUALLY\n`;
    code += `export interface IngredientDB {\n`;
    code += `  id: number; nameIT: string; nameEN: string; category: string; detail: string; allergens: string;\n`;
    code += `  kcal: number; kj: number; water: number; fat: number; saturatedFat: number; monoFat: number;\n`;
    code += `  polyFat: number; transFat: number; cholesterol: number; carbs: number; sugars: number;\n`;
    code += `  fibre: number; protein: number; salt: number; sodium: number; potassium: number; calcium: number; iron: number;\n`;
    code += `}\n\n`;
    code += `export const INGREDIENTS_DB: IngredientDB[] = [\n`;

    ingredients.forEach(ing => {
        code += `  ${JSON.stringify(ing)},\n`;
    });

    code += `];\n`;

    fs.writeFileSync('/Users/novanta/Desktop/APP/App_prova/src/data/ingredientsDB.ts', code);
    console.log(`Successfully wrote ${ingredients.length} ingredients to src/data/ingredientsDB.ts`);

} catch (e) {
    console.error('Error:', e.stack);
}
