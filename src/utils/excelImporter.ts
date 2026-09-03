import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';
import type { DBIngredient } from '../engines/nutrizionaleCalcEngine';
import type { ParsedGroup, ParsedLine } from './recipeParser';

export interface ExcelImportData {
  productName: string;
  groups: ParsedGroup[];
  finishedWeight?: number;
}

// Colonne componente nel foglio "calcoli": I(8), M(12), Q(16), U(20)
const COMP_COLS = [8, 12, 16, 20];
// "Per N° Pz:" (pezzi prodotti dal componente) è 3 colonne dopo la colonna componente: I→L, M→P, Q→T, U→X
const PZ_COL_OFFSET = 3;
// Peso del prodotto dopo cottura/disidratazione: cella AF13
const FINISHED_WEIGHT_CELL = { r: 12, c: 31 };
const CONFIDENCE_THRESHOLD = 50;

export async function importFromExcel(file: File, db: DBIngredient[]): Promise<ExcelImportData> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const ws = wb.Sheets['calcoli'];
  if (!ws) throw new Error('Foglio "calcoli" non trovato. Assicurati di usare il file Excel AEA originale.');

  const productName = String(ws['L7']?.v ?? 'Ricetta importata').trim();

  const fwCell = ws[XLSX.utils.encode_cell(FINISHED_WEIGHT_CELL)];
  const finishedWeight = typeof fwCell?.v === 'number' && fwCell.v > 0 ? fwCell.v : undefined;

  const fuse = new Fuse(db, {
    keys: ['nome', 'etichetta'],
    threshold: 0.5,
    includeScore: true,
    minMatchCharLength: 2,
  });

  const groups: ParsedGroup[] = [];

  for (let ci = 0; ci < COMP_COLS.length; ci++) {
    const compCol = COMP_COLS[ci];

    // Salta componenti con totale 0
    const totalCell = ws[XLSX.utils.encode_cell({ r: 13, c: compCol })];
    if (!totalCell?.v || totalCell.v === 0) continue;

    const headerCell = ws[XLSX.utils.encode_cell({ r: 11, c: compCol })];
    const rawCompName = String(headerCell?.v ?? '').replace('Ricetta ', '').trim();
    const compName = rawCompName || `Componente ${ci + 1}`;

    const pzCell = ws[XLSX.utils.encode_cell({ r: 11, c: compCol + PZ_COL_OFFSET })];
    const pzUV = typeof pzCell?.v === 'number' && pzCell.v > 0 ? pzCell.v : undefined;

    const lines: ParsedLine[] = [];

    for (let r = 17; r < 3000; r++) {
      const nameCell = ws[XLSX.utils.encode_cell({ r, c: 1 })];
      if (!nameCell) break; // fine lista ingredienti

      const gramsCell = ws[XLSX.utils.encode_cell({ r, c: compCol })];
      const grams = typeof gramsCell?.v === 'number' ? gramsCell.v : 0;
      if (grams <= 0) continue;

      const rawName = String(nameCell.v).trim();

      const results = fuse.search(rawName, { limit: 3 });
      const suggestions = results.map(res => ({
        ingredient: res.item,
        score: Math.round((1 - (res.score ?? 1)) * 100),
      }));
      const best = suggestions[0] ?? null;
      const confidence_score = best?.score ?? 0;

      lines.push({
        raw_text: `${rawName} — ${grams}g`,
        parsed_quantity: grams,
        parsed_unit: 'g',
        standardized_weight_g: grams,
        matched_ingredient_id: confidence_score >= CONFIDENCE_THRESHOLD
          ? (best?.ingredient.nome ?? null)
          : null,
        matched_ingredient: confidence_score >= CONFIDENCE_THRESHOLD
          ? (best?.ingredient ?? null)
          : null,
        confidence_score,
        suggestions,
      });
    }

    if (lines.length > 0) groups.push({ name: compName, lines, pzUV });
  }

  if (groups.length === 0) throw new Error('Nessun ingrediente trovato. Controlla che la ricetta abbia grammi > 0 in almeno un componente.');

  return { productName, groups, finishedWeight };
}
