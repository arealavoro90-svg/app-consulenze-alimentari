import { describe, it, expect } from 'vitest';
import { parseRecipe } from './recipeParser';
import type { DBIngredient } from '../engines/nutrizionaleCalcEngine';

const MOCK_DB: Partial<DBIngredient>[] = [
  { nome: 'farina 00', etichetta: 'Farina di grano tenero tipo 00', kcal: 350, kj: 1465, grassi: 1, saturi: 0.2, carboidrati: 73, zuccheri: 1, proteine: 11, sodio_mg: 2 },
  { nome: 'latte intero', etichetta: 'Latte vaccino intero', kcal: 64, kj: 268, grassi: 3.6, saturi: 2.3, carboidrati: 4.9, zuccheri: 4.9, proteine: 3.2, sodio_mg: 44 },
  { nome: 'olio extravergine oliva', etichetta: 'Olio EVO', kcal: 884, kj: 3699, grassi: 99.9, saturi: 14, carboidrati: 0, zuccheri: 0, proteine: 0, sodio_mg: 0 },
  { nome: 'uova intere', etichetta: 'Uovo di gallina intero', kcal: 143, kj: 598, grassi: 10, saturi: 3, carboidrati: 0.7, zuccheri: 0.7, proteine: 13, sodio_mg: 140 },
] as DBIngredient[];

// ─── 5 ricette "scritte male" — test di robustezza ───────────────────────────
describe('robustezza parsing ricette reali', () => {

  // Ricetta 1: copia-incolla da Word con simboli strani, maiuscole, spazi doppi
  it('ricetta 1 — copia-incolla da Word con rumore tipografico', () => {
    const text = [
      '  FARINA  00:  500gr  ',       // maiuscole, doppi spazi, ":" spurio
      '- Latte (intero) 200ML',       // trattino, parentesi, unità maiuscola
      'N.2 Uova fresche grandi',      // "N.2" invece di quantità numerica
      '1/2 bicchiere Olio EVO',       // frazione + unità non standard
    ].join('\n');

    const rows = parseRecipe(text, MOCK_DB);
    expect(rows).toHaveLength(4);

    // farina: 500g
    expect(rows[0].parsed_quantity).toBe(500);
    expect(rows[0].standardized_weight_g).toBe(500);
    expect(rows[0].matched_ingredient_id).toBe('farina 00');

    // latte: 200ml
    expect(rows[1].parsed_quantity).toBe(200);
    expect(rows[1].parsed_unit).toBe('ml');

    // uova: deve estrarre "2" da "N.2"
    expect(rows[2].parsed_quantity).toBe(2);

    // olio: 1/2 → 0.5
    expect(rows[3].parsed_quantity).toBe(0.5);
  });

  // Ricetta 2: formato "ingrediente prima, quantità dopo" (ordine invertito)
  it('ricetta 2 — quantità in fondo alla riga', () => {
    const text = [
      'Farina tipo 00 - 350 g',
      'Latte intero: 250ml',
      'Sale fino q.b.',               // q.b. → quantità 0
    ].join('\n');

    const rows = parseRecipe(text, MOCK_DB);
    expect(rows).toHaveLength(3);
    expect(rows[0].parsed_quantity).toBe(350);
    expect(rows[0].standardized_weight_g).toBe(350);
    expect(rows[1].parsed_quantity).toBe(250);
    expect(rows[1].parsed_unit).toBe('ml');
    // q.b. → nessun numero → quantity 0
    expect(rows[2].parsed_quantity).toBe(0);
  });

  // Ricetta 3: unità scritte per esteso e in dialetto/slang
  it('ricetta 3 — unità per esteso e varianti dialettali', () => {
    const text = [
      '2 chilogrammi farina',          // "chilogrammi" → kg
      '3 cucchiai olio extravergine',  // "cucchiai"
      '1 tazza latte',                 // "tazza" → 240ml
      '2 pizzichi sale',               // "pizzichi"
    ].join('\n');

    const rows = parseRecipe(text, MOCK_DB);
    expect(rows[0].standardized_weight_g).toBe(2000);  // 2 kg
    expect(rows[1].standardized_weight_g).toBe(45);    // 3 × 15g
    expect(rows[2].standardized_weight_g).toBe(240);   // 1 tazza
    expect(rows[3].standardized_weight_g).toBe(2);     // 2 pizzichi × 1g
  });

  // Ricetta 4: linee miste con commenti, righe vuote e caratteri speciali
  it('ricetta 4 — commenti inline, righe vuote, caratteri speciali', () => {
    const text = [
      '// Per la pasta:',              // riga commento → non skippata ma quantità 0
      '500g farina 00',
      '',                              // riga vuota → skippata
      '   ',                           // spazi → skippata
      '0,250 kg latte intero (freddo)',// decimale con virgola + testo extra
      '3 uova intere [grandi]',        // parentesi quadre
      '-- fine ingredienti --',        // riga senza ingredienti utili
    ].join('\n');

    const rows = parseRecipe(text, MOCK_DB);
    // Righe vuote/spazi skippate (2), resto parsato
    expect(rows).toHaveLength(5);
    expect(rows[1].parsed_quantity).toBe(500);
    expect(rows[1].matched_ingredient_id).toBe('farina 00');

    // 0,250 kg → 250g
    expect(rows[2].parsed_quantity).toBe(0.25);
    expect(rows[2].parsed_unit).toBe('kg');
    expect(rows[2].standardized_weight_g).toBe(250);

    // uova: 3
    expect(rows[3].parsed_quantity).toBe(3);
  });

  // Ricetta 5: formato lista numerata stile "ricettario vecchio"
  it('ricetta 5 — lista numerata e abbreviazioni compatte', () => {
    const text = [
      '1) 1Kg. di Farina 00',         // numero lista + "Kg." con punto
      '2) 200 ml. latte intero',       // "ml." con punto
      '3) 3 uova intere',
      '4) 1/2 cucchiaino sale fino',
      '5) 4 cucchiai olio evo',
    ].join('\n');

    const rows = parseRecipe(text, MOCK_DB);
    expect(rows).toHaveLength(5);

    // "1Kg." → qty=1, unit=kg, weight=1000
    expect(rows[0].parsed_quantity).toBe(1);
    expect(rows[0].standardized_weight_g).toBe(1000);
    expect(rows[0].matched_ingredient_id).toBe('farina 00');

    // "200 ml." → 200ml
    expect(rows[1].parsed_quantity).toBe(200);
    expect(rows[1].standardized_weight_g).toBe(200);

    // 1/2 cucchiaino → 2.5g
    expect(rows[3].parsed_quantity).toBe(0.5);
    expect(rows[3].standardized_weight_g).toBe(2.5);

    // 4 cucchiai → 60g
    expect(rows[4].standardized_weight_g).toBe(60);
  });
});

describe('parseRecipe', () => {
  it('parses integer grams', () => {
    const [r] = parseRecipe('500g farina 00', MOCK_DB);
    expect(r.parsed_quantity).toBe(500);
    expect(r.parsed_unit).toBe('g');
    expect(r.standardized_weight_g).toBe(500);
  });

  it('parses decimal with comma', () => {
    const [r] = parseRecipe('0,5 kg farina', MOCK_DB);
    expect(r.parsed_quantity).toBe(0.5);
    expect(r.parsed_unit).toBe('kg');
    expect(r.standardized_weight_g).toBe(500);
  });

  it('parses decimal with dot', () => {
    const [r] = parseRecipe('1.5 kg zucchero', MOCK_DB);
    expect(r.standardized_weight_g).toBe(1500);
  });

  it('parses fractions', () => {
    const [r] = parseRecipe('1/2 cucchiaino sale', MOCK_DB);
    expect(r.parsed_quantity).toBe(0.5);
    expect(r.standardized_weight_g).toBe(2.5);
  });

  it('converts kg to grams', () => {
    const [r] = parseRecipe('2 kg farina', MOCK_DB);
    expect(r.standardized_weight_g).toBe(2000);
  });

  it('converts litri to ml', () => {
    const [r] = parseRecipe('1 litro latte', MOCK_DB);
    expect(r.standardized_weight_g).toBe(1000);
  });

  it('assigns 1g to pizzico', () => {
    const [r] = parseRecipe('1 pizzico sale', MOCK_DB);
    expect(r.standardized_weight_g).toBe(1);
  });

  it('matches ingredient with high confidence', () => {
    const [r] = parseRecipe('500g farina 00', MOCK_DB);
    expect(r.confidence_score).toBeGreaterThan(50);
    expect(r.matched_ingredient_id).toBe('farina 00');
  });

  it('returns null match below threshold for unknown ingredient', () => {
    const [r] = parseRecipe('100g ingrediente_xyz_inesistente_12345', MOCK_DB);
    expect(r.matched_ingredient_id).toBeNull();
  });

  it('returns up to 3 suggestions', () => {
    const [r] = parseRecipe('200ml latte', MOCK_DB);
    expect(r.suggestions.length).toBeLessThanOrEqual(3);
  });

  it('skips empty lines and parses multi-line recipe', () => {
    const text = '500g farina 00\n\n   \n200ml latte';
    const rows = parseRecipe(text, MOCK_DB);
    expect(rows).toHaveLength(2);
  });
});
