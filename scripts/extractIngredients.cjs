// Script to extract ingredient database from Excel and generate TypeScript
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = '/Users/novanta/Desktop/programma per calcolare i valori nutrizionali-rev 20.xlsx';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'ingredientsDB.ts');

const wb = XLSX.readFile(EXCEL_PATH, { cellFormula: false, sheetStubs: false, raw: true });
const ws = wb.Sheets['database'];
const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

function n(v) {
    const x = parseFloat(v);
    return isNaN(x) ? 0 : Math.round(x * 10000) / 10000;
}

function s(v) {
    return String(v || '').trim()
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/`/g, '\\`');
}

const ingredients = [];

for (let r = 11; r < json.length; r++) {
    const row = json[r];
    const rawName = row[4];
    if (!rawName || typeof rawName !== 'string' || rawName.trim() === '') continue;

    // Remove internal sort prefix 'aaaa' from some water entries
    const displayName = String(rawName).trim().replace(/^aaaa/, '').trim();

    ingredients.push({
        id: r - 10,
        nameIT: s(displayName),
        nameEN: s(row[8]),
        category: s(row[12]),
        detail: s(row[13]),
        allergens: s(row[14]),
        kcal: n(row[16]),
        kj: n(row[17]),
        water: n(row[20]),
        fat: n(row[21]),
        saturatedFat: n(row[22]),
        monoFat: n(row[23]),
        polyFat: n(row[24]),
        transFat: n(row[25]),
        cholesterol: n(row[26]),
        carbs: n(row[28]),   // carboidrati incluse fibre
        sugars: n(row[29]),
        fibre: n(row[35]),
        protein: n(row[37]),
        salt: n(row[38]),    // NaCl g/100g
        sodium: n(row[39]),  // Na g/100g
        potassium: n(row[45]),
        calcium: n(row[46]),
        iron: n(row[50]),
    });
}

console.log(`Extracted ${ingredients.length} ingredients`);

// ---- Build TypeScript file ----
const lines = [];
lines.push(`// AUTO-GENERATED — DO NOT EDIT MANUALLY`);
lines.push(`// Source: programma per calcolare i valori nutrizionali-rev 20.xlsx (foglio: database)`);
lines.push(`// Generated: ${new Date().toISOString().slice(0, 10)}`);
lines.push(`// Total: ${ingredients.length} ingredients`);
lines.push(``);
lines.push(`export interface IngredientDB {`);
lines.push(`  id: number;`);
lines.push(`  nameIT: string;`);
lines.push(`  nameEN: string;`);
lines.push(`  category: string;  // ingrediente | additivo | prodotto | semilavorato`);
lines.push(`  detail: string;    // lista ingredienti dichiarata`);
lines.push(`  allergens: string;`);
lines.push(`  kcal: number;      // kcal/100g`);
lines.push(`  kj: number;        // kJ/100g`);
lines.push(`  water: number;     // g/100g`);
lines.push(`  fat: number;       // g/100g grassi totali`);
lines.push(`  saturatedFat: number;`);
lines.push(`  monoFat: number;`);
lines.push(`  polyFat: number;`);
lines.push(`  transFat: number;`);
lines.push(`  cholesterol: number; // mg/100g`);
lines.push(`  carbs: number;     // g/100g (incluse fibre)`);
lines.push(`  sugars: number;    // g/100g`);
lines.push(`  fibre: number;     // g/100g`);
lines.push(`  protein: number;   // g/100g`);
lines.push(`  salt: number;      // g/100g NaCl equivalente`);
lines.push(`  sodium: number;    // g/100g Na`);
lines.push(`  potassium: number; // mg/100g`);
lines.push(`  calcium: number;   // mg/100g`);
lines.push(`  iron: number;      // mg/100g`);
lines.push(`}`);
lines.push(``);
lines.push(`export const INGREDIENTS_DB: IngredientDB[] = [`);

for (const ing of ingredients) {
    lines.push(
        `  { id:${ing.id}, nameIT:'${ing.nameIT}', nameEN:'${ing.nameEN}', ` +
        `category:'${ing.category}', detail:'${ing.detail}', allergens:'${ing.allergens}', ` +
        `kcal:${ing.kcal}, kj:${ing.kj}, water:${ing.water}, fat:${ing.fat}, ` +
        `saturatedFat:${ing.saturatedFat}, monoFat:${ing.monoFat}, polyFat:${ing.polyFat}, ` +
        `transFat:${ing.transFat}, cholesterol:${ing.cholesterol}, carbs:${ing.carbs}, ` +
        `sugars:${ing.sugars}, fibre:${ing.fibre}, protein:${ing.protein}, salt:${ing.salt}, ` +
        `sodium:${ing.sodium}, potassium:${ing.potassium}, calcium:${ing.calcium}, iron:${ing.iron} },`
    );
}

lines.push(`];`);
lines.push(``);

// Also export a search helper
lines.push(`export function searchIngredients(query: string, limit = 20): IngredientDB[] {`);
lines.push(`  if (!query || query.trim().length < 2) return [];`);
lines.push(`  const q = query.toLowerCase().trim();`);
lines.push(`  const results: IngredientDB[] = [];`);
lines.push(`  for (const ing of INGREDIENTS_DB) {`);
lines.push(`    if (ing.nameIT.toLowerCase().includes(q) || ing.nameEN.toLowerCase().includes(q) || ing.detail.toLowerCase().includes(q)) {`);
lines.push(`      results.push(ing);`);
lines.push(`      if (results.length >= limit) break;`);
lines.push(`    }`);
lines.push(`  }`);
lines.push(`  return results;`);
lines.push(`}`);
lines.push(``);

const content = lines.join('\n');
fs.writeFileSync(OUTPUT_PATH, content, 'utf8');
const size = fs.statSync(OUTPUT_PATH).size;
console.log(`Written: ${OUTPUT_PATH}`);
console.log(`File size: ${(size / 1024).toFixed(1)} KB`);
