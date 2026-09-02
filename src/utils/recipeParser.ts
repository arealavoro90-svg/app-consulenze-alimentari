import Fuse from 'fuse.js';
import type { DBIngredient } from '../engines/nutrizionaleCalcEngine';

export interface ParsedLine {
  raw_text: string;
  parsed_quantity: number;
  parsed_unit: string;
  standardized_weight_g: number;
  matched_ingredient_id: string | null;
  matched_ingredient: DBIngredient | null;
  confidence_score: number;
  suggestions: Array<{ ingredient: DBIngredient; score: number }>;
}

const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gr: 'g', grammo: 'g', grammi: 'g',
  kg: 'kg', kilo: 'kg', chilo: 'kg', chilogrammo: 'kg', chilogrammi: 'kg',
  l: 'l', lt: 'l', litro: 'l', litri: 'l',
  ml: 'ml', millilitro: 'ml', millilitri: 'ml', cc: 'ml', cl: 'cl',
  cucchiaio: 'cucchiaio', cucchiai: 'cucchiaio', tbsp: 'cucchiaio',
  cucchiaino: 'cucchiaino', tsp: 'cucchiaino',
  tazza: 'tazza', tazze: 'tazza', cup: 'tazza',
  pizzico: 'pizzico', pizzichi: 'pizzico', punta: 'pizzico',
  pz: 'pz', pezzo: 'pz', pezzi: 'pz',
  foglia: 'pz', foglie: 'pz', spicchio: 'pz', spicchi: 'pz',
  fetta: 'pz', fette: 'pz', rametto: 'pz', rametti: 'pz',
};

const TO_GRAMS: Record<string, number> = {
  g: 1, kg: 1000,
  l: 1000, ml: 1, cl: 10,
  cucchiaio: 15, cucchiaino: 5, tazza: 240,
  pizzico: 1,
  pz: 100,
};

const STOP = new Set([
  'di', 'del', 'della', 'dello', 'dei', 'degli', 'delle', "d'",
  'un', 'una', 'uno', 'il', 'lo', 'la', 'i', 'gli', 'le',
  'in', 'con', 'a', 'al', 'alla', 'allo', 'ai', 'agli', 'alle',
  'e', 'ed', 'circa', 'abbondante', 'abbondanti', 'q.b', 'q.b.',
  'freschi', 'fresca', 'fresco', 'secco', 'secca', 'secchi',
]);

const QTY_RE = /(\d+\/\d+|\d+[.,]\d+|\d+)/;

const UNIT_KEYS = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);
const UNIT_RE = new RegExp(
  `\\b(${UNIT_KEYS.map(k => k.replace('.', '\\.')).join('|')})\\b`,
  'i'
);

// Priorità: numero ADIACENTE a unità (gestisce "500gr", "1Kg.", "350 g")
// Evita di catturare numeri che fanno parte del nome (es: "farina 00")
const UNIT_ATTACHED_RE = new RegExp(
  `(\\d+\\/\\d+|\\d+[.,]\\d+|\\d+)\\s*(${UNIT_KEYS.map(k => k.replace('.', '\\.')).join('|')})\\b`,
  'i'
);

function parseQuantity(raw: string): number {
  const attached = raw.match(UNIT_ATTACHED_RE);
  const m = attached ?? raw.match(QTY_RE);
  if (!m) return 0;
  const s = m[1];
  if (s.includes('/')) {
    const [num, den] = s.split('/').map(Number);
    return den !== 0 ? num / den : 0;
  }
  return parseFloat(s.replace(',', '.'));
}

function parseUnit(text: string): string {
  const attached = text.match(UNIT_ATTACHED_RE);
  if (attached) return UNIT_ALIASES[attached[2].toLowerCase()] ?? 'g';
  const m = text.match(UNIT_RE);
  if (!m) return 'g';
  return UNIT_ALIASES[m[1].toLowerCase()] ?? 'g';
}

function toGrams(qty: number, unit: string): number {
  return qty * (TO_GRAMS[unit] ?? 1);
}

function cleanIngredientName(text: string): string {
  return text
    .toLowerCase()
    .replace(/\d+\/\d+|\d+[.,]\d+|\d+/g, '')
    .replace(UNIT_RE, '')
    .replace(/[,;:()[\]]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP.has(t))
    .join(' ')
    .trim();
}

const CONFIDENCE_THRESHOLD = 50;

/** Raggruppa ingredienti per componente */
export interface ParsedGroup {
  name: string;
  lines: ParsedLine[];
  pzUV?: number;
}

/**
 * Una riga è un'intestazione componente se:
 * - finisce con ':'
 * - non contiene una quantità numerica (altrimenti è un ingrediente tipo "olio: 50g")
 */
function isHeaderLine(raw: string): boolean {
  if (!raw.trimEnd().endsWith(':')) return false;
  return parseQuantity(raw) === 0;
}

function parseLine(raw_text: string, fuse: Fuse<DBIngredient>): ParsedLine {
  const qty = parseQuantity(raw_text);
  const unit = parseUnit(raw_text);
  const weight = toGrams(qty, unit);
  const cleanName = cleanIngredientName(raw_text);

  const results = fuse.search(cleanName, { limit: 3 });
  const suggestions = results.map(r => ({
    ingredient: r.item,
    score: Math.round((1 - (r.score ?? 1)) * 100),
  }));

  const best = suggestions[0] ?? null;
  const confidence_score = best?.score ?? 0;

  return {
    raw_text,
    parsed_quantity: qty,
    parsed_unit: unit,
    standardized_weight_g: weight,
    matched_ingredient_id: confidence_score >= CONFIDENCE_THRESHOLD
      ? (best?.ingredient.nome ?? null)
      : null,
    matched_ingredient: confidence_score >= CONFIDENCE_THRESHOLD
      ? (best?.ingredient ?? null)
      : null,
    confidence_score,
    suggestions,
  };
}

/**
 * Parsa la ricetta rilevando le intestazioni componente (righe che finiscono con ':').
 * Ritorna sempre almeno un gruppo.
 *
 * Formato supportato:
 *   Per la pasta:          ← intestazione → nuovo componente "Per la pasta"
 *   200g farina 00
 *   3 uova
 *
 *   Per il sugo:           ← intestazione → nuovo componente "Per il sugo"
 *   400g pomodori pelati
 */
export function parseRecipeGroups(text: string, db: DBIngredient[]): ParsedGroup[] {
  const fuse = new Fuse(db, {
    keys: ['nome', 'etichetta'],
    threshold: 0.5,
    includeScore: true,
    minMatchCharLength: 2,
  });

  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const groups: ParsedGroup[] = [];
  let current: ParsedGroup = { name: 'Ingredienti', lines: [] };

  for (const raw of rawLines) {
    if (isHeaderLine(raw)) {
      if (current.lines.length > 0) groups.push(current);
      current = { name: raw.slice(0, -1).trim() || 'Componente', lines: [] };
    } else {
      current.lines.push(parseLine(raw, fuse));
    }
  }
  if (current.lines.length > 0) groups.push(current);

  return groups.length > 0 ? groups : [{ name: 'Ingredienti', lines: [] }];
}

/** @deprecated usa parseRecipeGroups — mantenuta per compatibilità test */
export function parseRecipe(text: string, db: DBIngredient[]): ParsedLine[] {
  const groups = parseRecipeGroups(text, db);
  return groups.flatMap(g => g.lines);
}
