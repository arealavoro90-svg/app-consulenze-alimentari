const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'ingredientsDB.ts');

const wb = XLSX.readFile(EXCEL_PATH, { cellFormula: false, sheetStubs: false, raw: true });
const ws = wb.Sheets['database'];
const json = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });

function n(v) {
    if (v === undefined || v === null || v === '') return 0.0;
    // Handle Italian locale (comma as decimal separator)
    const normalized = String(v).replace(',', '.');
    const x = parseFloat(normalized);
    return isNaN(x) ? 0.0 : Math.round(x * 10000) / 10000;
}

function s(v) {
    return String(v || '').trim()
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/`/g, '\\`');
}

const ingredients = [];

// Precise Mapping based on inspection (EU Reg 1169/2011 logic):
// Col 4: nameIT (Italian)
// Col 5: detail / ingredients list
// Col 276: nameES (Spanish) / nameIT fallback
// Col 277: nameEN (English)
// Col 281: category
// Col 288 (KC): fat
// Col 289 (KD): saturatedFat
// Col 290 (KE): monoFat
// Col 291 (KF): polyFat
// Col 292 (KG): transFat
// Col 293 (KH): cholesterol (mg)
// Col 294 (KI): carbohydrates (available, excluding fiber)
// Col 295 (KJ): totalCarbs (including fiber)
// Col 296 (KK): sugars
// Col 298 (KM): polyols
// Col 300 (KO): erythritol
// Col 302 (KQ): fibre
// Col 303 (KR): organicAcids
// Col 304 (KS): protein
// Col 305 (KT): sodium (mg)
// Col 306 (KU): salt (g)
// Col 308 (KW): alcohol
// Col 310 (KY): water
// Col 339 (MB): energy kcal
// Col 340 (MC): energy kj

for (let r = 8; r < json.length; r++) {
    const row = json[r];

    // Check for name in Italian (Col 4) or Spanish (Col 276)
    const itName = row[4];
    const esName = row[276];

    if (!itName && !esName) continue;

    const rawName = (itName || esName).toString().trim();
    if (rawName === '' || rawName === '0' || rawName === 'ESPANOL' || rawName === 'INGREDIENTES') continue;

    const displayName = rawName.replace(/^aaaa/, '').trim();
    const displayEn = (row[277] || row[8] || '').toString().trim().replace(/^aaaa/, '').trim();

    ingredients.push({
        id: r + 1,
        nameIT: s(displayName),
        nameEN: s(displayEn),
        category: s(row[281] || 'ingrediente'),
        detail: s(row[5]),
        allergens: '',
        kcal: n(row[339]),
        kj: n(row[340]),
        water: n(row[310]),
        fat: n(row[288]),
        saturatedFat: n(row[289]),
        monoFat: n(row[290]),
        polyFat: n(row[291]),
        transFat: n(row[292]),
        cholesterol: n(row[293]),
        carbs: n(row[295]),
        sugars: n(row[296]),
        fibre: n(row[302]),
        polyols: n(row[298]),
        erythritol: n(row[300]),
        organicAcids: n(row[303]),
        protein: n(row[304]),
        salt: n(row[306]),
        sodium: n(row[305]),
        alcohol: n(row[308]),
    });
}

console.log(`Extracted ${ingredients.length} ingredients`);

const lines = [];
lines.push(`// AUTO-GENERATED — DO NOT EDIT MANUALLY`);
lines.push(`// Source: Programma tabelle valori nutrizionali.xlsx (foglio: database)`);
lines.push(`// Generated: ${new Date().toISOString().slice(0, 10)}`);
lines.push(`// Total: ${ingredients.length} ingredients`);
lines.push(``);
lines.push(`export interface IngredientDB {`);
lines.push(`  id: number;`);
lines.push(`  nameIT: string;`);
lines.push(`  nameEN: string;`);
lines.push(`  category: string;`);
lines.push(`  detail: string;`);
lines.push(`  allergens: string;`);
lines.push(`  kcal: number;`);
lines.push(`  kj: number;`);
lines.push(`  water: number;`);
lines.push(`  fat: number;`);
lines.push(`  saturatedFat: number;`);
lines.push(`  monoFat: number;`);
lines.push(`  polyFat: number;`);
lines.push(`  transFat: number;`);
lines.push(`  cholesterol: number;`);
lines.push(`  carbs: number;`);
lines.push(`  sugars: number;`);
lines.push(`  fibre: number;`);
lines.push(`  polyols: number;`);
lines.push(`  erythritol: number;`);
lines.push(`  organicAcids: number;`);
lines.push(`  protein: number;`);
lines.push(`  salt: number;`);
lines.push(`  sodium: number;`);
lines.push(`  alcohol: number;`);
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
        `sugars:${ing.sugars}, fibre:${ing.fibre}, polyols:${ing.polyols}, ` +
        `erythritol:${ing.erythritol}, organicAcids:${ing.organicAcids}, protein:${ing.protein}, ` +
        `salt:${ing.salt}, sodium:${ing.sodium}, alcohol:${ing.alcohol} },`
    );
}

lines.push(`];`);
lines.push(``);
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
console.log(`Written: ${OUTPUT_PATH}`);
