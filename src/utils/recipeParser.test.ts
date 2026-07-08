import { describe, it, expect } from 'vitest';
import { parseRecipe } from './recipeParser';
import type { DBIngredient } from '../engines/nutrizionaleCalcEngine';

const MOCK_DB: Partial<DBIngredient>[] = [
  { nome: 'farina 00', etichetta: 'Farina di grano tenero tipo 00', kcal: 350, kj: 1465, grassi: 1, saturi: 0.2, carboidrati: 73, zuccheri: 1, proteine: 11, sodio_mg: 2 },
  { nome: 'latte intero', etichetta: 'Latte vaccino intero', kcal: 64, kj: 268, grassi: 3.6, saturi: 2.3, carboidrati: 4.9, zuccheri: 4.9, proteine: 3.2, sodio_mg: 44 },
  { nome: 'olio extravergine oliva', etichetta: 'Olio EVO', kcal: 884, kj: 3699, grassi: 99.9, saturi: 14, carboidrati: 0, zuccheri: 0, proteine: 0, sodio_mg: 0 },
  { nome: 'uova intere', etichetta: 'Uovo di gallina intero', kcal: 143, kj: 598, grassi: 10, saturi: 3, carboidrati: 0.7, zuccheri: 0.7, proteine: 13, sodio_mg: 140 },
] as DBIngredient[];

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
