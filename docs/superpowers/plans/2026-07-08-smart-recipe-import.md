# Smart Recipe Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importazione smart di ricette da testo libero, client-side, con fuzzy matching sul DB ingredienti locale e tabella di validazione interattiva.

**Architecture:** Parser puro TypeScript (regex + NLP) in una utility separata → fuzzy search via fuse.js sul DB locale → modal in due fasi (textarea → tabella) → integrazione diretta con `setComponents` di NutrizionaleCalc (desktop) e `onAddRow`/`onUpdateRow` (mobile).

**Tech Stack:** React 19 + TypeScript, fuse.js (da installare), inline styles (pattern progetto), vitest (già installato).

---

## Mappa file

| Azione | File | Responsabilità |
|--------|------|----------------|
| **Crea** | `src/utils/recipeParser.ts` | Parsing testo → `ParsedLine[]`, conversione unità, fuzzy search |
| **Crea** | `src/calculators/NutrizionaleCalc/SmartImportModal.tsx` | Modal completo: fase 1 (textarea) + fase 2 (tabella validazione) |
| **Crea** | `src/utils/recipeParser.test.ts` | Test unitari parser |
| **Modifica** | `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` | Bottone "Importa Ricetta" in topbar + stato modal + `handleSmartImport` |
| **Modifica** | `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx` | Bottone "Importa Ricetta" mobile + apertura modal |
| **Modifica** | `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` | Gestione stato modal SmartImport + `handleSmartImportMobile` |

---

## Task 1 — Installa fuse.js

**Files:**
- Modifica: `package.json`

- [ ] **Step 1: Installa**

```bash
npm install fuse.js
```

Output atteso: `added 1 package` + versione fuse.js ≥ 7.x in `package.json`.

- [ ] **Step 2: Verifica tipo incluso**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -5
```

Output atteso: nessun errore relativo a fuse.js (i tipi sono bundled dalla v7).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install fuse.js for smart recipe import"
```

---

## Task 2 — `src/utils/recipeParser.ts`

**Files:**
- Crea: `src/utils/recipeParser.ts`

- [ ] **Step 1: Crea il file con tipi e costanti**

```typescript
import Fuse from 'fuse.js';
import type { DBIngredient } from '../engines/nutrizionaleCalcEngine';

// ─── Output strutturato (spec §4) ────────────────────────────────────────────
export interface ParsedLine {
  raw_text: string;
  parsed_quantity: number;
  parsed_unit: string;
  standardized_weight_g: number;
  matched_ingredient_id: string | null;  // nome (PK del DB) o null
  matched_ingredient: DBIngredient | null;
  confidence_score: number;              // 0–100
  suggestions: Array<{ ingredient: DBIngredient; score: number }>;
}

// ─── Tabella unità → normalizzato ────────────────────────────────────────────
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

// ─── Conversione in grammi/ml (spec §2) ──────────────────────────────────────
const TO_GRAMS: Record<string, number> = {
  g: 1, kg: 1000,
  l: 1000, ml: 1, cl: 10,
  cucchiaio: 15, cucchiaino: 5, tazza: 240,
  pizzico: 1,
  pz: 100, // fallback modificabile
};

// ─── Stop words italiane ─────────────────────────────────────────────────────
const STOP = new Set([
  'di', 'del', 'della', 'dello', 'dei', 'degli', 'delle', "d'",
  'un', 'una', 'uno', 'il', 'lo', 'la', 'i', 'gli', 'le',
  'in', 'con', 'a', 'al', 'alla', 'allo', 'ai', 'agli', 'alle',
  'e', 'ed', 'circa', 'abbondante', 'abbondanti', 'q.b', 'q.b.',
  'freschi', 'fresca', 'fresco', 'secco', 'secca', 'secchi',
]);

// ─── Regex per quantità (interi, decimali con . o ,, frazioni) ───────────────
const QTY_RE = /(\d+\/\d+|\d+[.,]\d+|\d+)/;

// Regex per unità di misura (parola intera, case-insensitive)
const UNIT_KEYS = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);
const UNIT_RE = new RegExp(
  `\\b(${UNIT_KEYS.map(k => k.replace('.', '\\.')).join('|')})\\b`,
  'i'
);
```

- [ ] **Step 2: Aggiungi la funzione di parsing**

```typescript
function parseQuantity(raw: string): number {
  const m = raw.match(QTY_RE);
  if (!m) return 0;
  const s = m[1];
  if (s.includes('/')) {
    const [num, den] = s.split('/').map(Number);
    return den !== 0 ? num / den : 0;
  }
  return parseFloat(s.replace(',', '.'));
}

function parseUnit(text: string): string {
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
    // rimuovi quantità
    .replace(/\d+\/\d+|\d+[.,]\d+|\d+/g, '')
    // rimuovi unità
    .replace(UNIT_RE, '')
    // rimuovi punteggiatura
    .replace(/[,;:()\[\]]/g, ' ')
    // tokenizza e filtra stop words
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP.has(t))
    .join(' ')
    .trim();
}
```

- [ ] **Step 3: Aggiungi la funzione principale `parseRecipe`**

```typescript
const CONFIDENCE_THRESHOLD = 50;

export function parseRecipe(
  text: string,
  db: DBIngredient[]
): ParsedLine[] {
  const fuse = new Fuse(db, {
    keys: ['nome', 'etichetta'],
    threshold: 0.5,       // più permissivo per catturare varianti
    includeScore: true,
    minMatchCharLength: 2,
  });

  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((raw_text): ParsedLine => {
      const qty = parseQuantity(raw_text);
      const unit = parseUnit(raw_text);
      const weight = toGrams(qty, unit);
      const cleanName = cleanIngredientName(raw_text);

      const results = fuse.search(cleanName, { limit: 3 });
      const suggestions = results.map(r => ({
        ingredient: r.item,
        // fuse score: 0 = perfect, 1 = no match → inverto per percentuale
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
    });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/recipeParser.ts
git commit -m "feat: add client-side recipe parser with unit normalization"
```

---

## Task 3 — `src/utils/recipeParser.test.ts`

**Files:**
- Crea: `src/utils/recipeParser.test.ts`

- [ ] **Step 1: Crea il file di test**

```typescript
import { describe, it, expect } from 'vitest';
import { parseRecipe } from './recipeParser';
import type { DBIngredient } from '../engines/nutrizionaleCalcEngine';

const MOCK_DB: DBIngredient[] = [
  { nome: 'farina 00', etichetta: 'Farina di grano tenero tipo 00', kcal: 350, kj: 1465, grassi: 1, saturi: 0.2, carboidrati: 73, zuccheri: 1, proteine: 11, sodio_mg: 2 } as DBIngredient,
  { nome: 'latte intero', etichetta: 'Latte vaccino intero', kcal: 64, kj: 268, grassi: 3.6, saturi: 2.3, carboidrati: 4.9, zuccheri: 4.9, proteine: 3.2, sodio_mg: 44 } as DBIngredient,
  { nome: 'olio extravergine oliva', etichetta: 'Olio EVO', kcal: 884, kj: 3699, grassi: 99.9, saturi: 14, carboidrati: 0, zuccheri: 0, proteine: 0, sodio_mg: 0 } as DBIngredient,
  { nome: 'uova intere', etichetta: 'Uovo di gallina intero', kcal: 143, kj: 598, grassi: 10, saturi: 3, carboidrati: 0.7, zuccheri: 0.7, proteine: 13, sodio_mg: 140 } as DBIngredient,
];

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
    expect(r.standardized_weight_g).toBe(2.5); // 0.5 * 5g
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

  it('returns null match below threshold', () => {
    const [r] = parseRecipe('100g ingrediente_xyz_inesistente', MOCK_DB);
    expect(r.matched_ingredient_id).toBeNull();
  });

  it('returns top 3 suggestions', () => {
    const [r] = parseRecipe('200ml latte', MOCK_DB);
    expect(r.suggestions.length).toBeLessThanOrEqual(3);
    expect(r.suggestions[0].score).toBeGreaterThanOrEqual(0);
  });

  it('parses multi-line recipe', () => {
    const text = '500g farina 00\n200ml latte\n3 uova';
    const rows = parseRecipe(text, MOCK_DB);
    expect(rows).toHaveLength(3);
  });

  it('skips empty lines', () => {
    const text = '500g farina\n\n   \n200ml latte';
    const rows = parseRecipe(text, MOCK_DB);
    expect(rows).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Esegui i test**

```bash
npx vitest run src/utils/recipeParser.test.ts
```

Output atteso: tutti i test passano. Se qualcuno fallisce, aggiusta la regex o le soglie in `recipeParser.ts` prima di continuare.

- [ ] **Step 3: Commit**

```bash
git add src/utils/recipeParser.test.ts
git commit -m "test: add unit tests for recipe parser"
```

---

## Task 4 — `src/calculators/NutrizionaleCalc/SmartImportModal.tsx`

**Files:**
- Crea: `src/calculators/NutrizionaleCalc/SmartImportModal.tsx`

Questo componente gestisce entrambe le fasi internamente. Non ha CSS esterno: usa inline styles seguendo il pattern del progetto.

- [ ] **Step 1: Scheletro e tipi**

```typescript
import React, { useState, useRef, useCallback } from 'react';
import { X, Sparkles, Plus, Search } from 'lucide-react';
import { parseRecipe, type ParsedLine } from '../../utils/recipeParser';
import type { DBIngredient, RecipeRow } from '../../engines/nutrizionaleCalcEngine';

export interface SmartImportResult {
  rows: Array<{ ing: DBIngredient; grams: number }>;
}

interface Props {
  db: DBIngredient[];
  onClose: () => void;
  onImport: (result: SmartImportResult) => void;
}

// Stato per-riga nella tabella di validazione
interface RowState {
  raw_text: string;
  qty: number;
  unit: string;
  selectedIngredient: DBIngredient | null;
  confidence_score: number;
  suggestions: Array<{ ingredient: DBIngredient; score: number }>;
  searchQuery: string;
  searchOpen: boolean;
  searchResults: DBIngredient[];
}

const UNITS = ['g', 'kg', 'ml', 'l', 'cucchiaio', 'cucchiaino', 'tazza', 'pizzico', 'pz'];
```

- [ ] **Step 2: Aggiungi funzione searchDB locale e helper badge colore**

```typescript
function searchDB(query: string, db: DBIngredient[]): DBIngredient[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase();
  return db
    .filter(i => i.nome.toLowerCase().includes(q) || (i.etichetta || '').toLowerCase().includes(q))
    .slice(0, 8);
}

function confidenceBadge(score: number): { bg: string; color: string; label: string } {
  if (score >= 80) return { bg: '#e6f4ea', color: '#2e7d32', label: `${score}%` };
  if (score >= 50) return { bg: '#fff8e1', color: '#f57f17', label: `${score}%` };
  return { bg: '#fce4ec', color: '#c62828', label: score > 0 ? `${score}%` : '—' };
}
```

- [ ] **Step 3: Componente principale — fase 1 (textarea)**

```typescript
export function SmartImportModal({ db, onClose, onImport }: Props) {
  const [phase, setPhase] = useState<'input' | 'validation'>('input');
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState<RowState[]>([]);

  const handleAnalyze = useCallback(() => {
    if (!rawText.trim()) return;
    const parsed = parseRecipe(rawText, db);
    setRows(parsed.map((p): RowState => ({
      raw_text: p.raw_text,
      qty: p.parsed_quantity,
      unit: p.parsed_unit,
      selectedIngredient: p.matched_ingredient,
      confidence_score: p.confidence_score,
      suggestions: p.suggestions,
      searchQuery: p.matched_ingredient?.nome ?? '',
      searchOpen: false,
      searchResults: [],
    })));
    setPhase('validation');
  }, [rawText, db]);

  const handleAddRow = () => {
    setRows(prev => [...prev, {
      raw_text: '',
      qty: 100,
      unit: 'g',
      selectedIngredient: null,
      confidence_score: 0,
      suggestions: [],
      searchQuery: '',
      searchOpen: false,
      searchResults: [],
    }]);
  };

  const updateRow = (i: number, patch: Partial<RowState>) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  const removeRow = (i: number) => {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleImport = () => {
    const validRows = rows
      .filter(r => r.selectedIngredient !== null && r.qty > 0)
      .map(r => ({ ing: r.selectedIngredient!, grams: r.qty * (r.unit === 'kg' ? 1000 : r.unit === 'l' ? 1000 : 1) }));
    if (validRows.length === 0) return;
    onImport({ rows: validRows });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      background: 'rgba(12,19,38,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        width: '100%', maxWidth: phase === 'validation' ? 860 : 560,
        maxHeight: '90dvh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(12,19,38,0.3)',
        transition: 'max-width 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #eef0f4',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #ff7e2e, #dd5c0c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1f2e' }}>
              Importazione smart ricetta
            </div>
            <div style={{ fontSize: 12, color: '#9ba8bb', marginTop: 1 }}>
              {phase === 'input' ? 'Incolla la ricetta in testo libero' : 'Verifica e correggi gli ingredienti trovati'}
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ba8bb', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {phase === 'input' ? (
            <PhaseInput
              rawText={rawText}
              onChange={setRawText}
              onAnalyze={handleAnalyze}
            />
          ) : (
            <PhaseValidation
              rows={rows}
              db={db}
              onUpdate={updateRow}
              onRemove={removeRow}
              onAddRow={handleAddRow}
            />
          )}
        </div>

        {/* Footer */}
        {phase === 'validation' && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #eef0f4',
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <button
              type="button"
              onClick={() => setPhase('input')}
              style={{
                padding: '10px 18px', borderRadius: 10,
                border: '1px solid #dde2ea', background: '#fff',
                fontSize: 13, fontWeight: 500, color: '#5e6b80', cursor: 'pointer',
              }}
            >
              ← Modifica testo
            </button>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 12, color: '#9ba8bb' }}>
              {rows.filter(r => r.selectedIngredient).length} / {rows.length} ingredienti abbinati
            </div>
            <button
              type="button"
              onClick={handleImport}
              style={{
                padding: '10px 20px', borderRadius: 10,
                background: '#ff7e2e', color: '#fff',
                border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Calcola valori nutrizionali →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Aggiungi `PhaseInput`**

```typescript
function PhaseInput({ rawText, onChange, onAnalyze }: {
  rawText: string;
  onChange: (v: string) => void;
  onAnalyze: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <textarea
        value={rawText}
        onChange={e => onChange(e.target.value)}
        placeholder={'Incolla qui la tua ricetta, es:\n500g farina 00\n200 ml di latte\n3 uova\n1/2 cucchiaino di sale'}
        rows={10}
        style={{
          width: '100%', border: '1.5px solid #dde2ea', borderRadius: 12,
          padding: '14px 16px', fontSize: 14, lineHeight: 1.7,
          fontFamily: 'inherit', color: '#1a1f2e', resize: 'vertical',
          outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = '#ff7e2e'; }}
        onBlur={e => { e.target.style.borderColor = '#dde2ea'; }}
        autoFocus
      />
      <button
        type="button"
        onClick={onAnalyze}
        disabled={!rawText.trim()}
        style={{
          padding: '13px 24px', borderRadius: 12,
          background: rawText.trim() ? '#ff7e2e' : '#f0f2f6',
          color: rawText.trim() ? '#fff' : '#9ba8bb',
          border: 'none', fontSize: 15, fontWeight: 700,
          cursor: rawText.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.15s',
        }}
      >
        <Sparkles size={16} />
        Analizza ricetta
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Aggiungi `PhaseValidation` e `IngredientCell`**

```typescript
function PhaseValidation({ rows, db, onUpdate, onRemove, onAddRow }: {
  rows: RowState[];
  db: DBIngredient[];
  onUpdate: (i: number, patch: Partial<RowState>) => void;
  onRemove: (i: number) => void;
  onAddRow: () => void;
}) {
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eef0f4' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#9ba8bb', fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Riga originale</th>
              <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#9ba8bb', fontSize: 11, textTransform: 'uppercase', width: 80 }}>Qtà</th>
              <th style={{ padding: '8px 6px', fontWeight: 700, color: '#9ba8bb', fontSize: 11, textTransform: 'uppercase', width: 100 }}>Unità</th>
              <th style={{ padding: '8px 10px', fontWeight: 700, color: '#9ba8bb', fontSize: 11, textTransform: 'uppercase' }}>Ingrediente DB</th>
              <th style={{ padding: '8px 6px', width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f4f6f9' }}>
                {/* raw_text */}
                <td style={{ padding: '10px 10px', color: '#9ba8bb', fontSize: 12, fontStyle: 'italic', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.raw_text || '— riga manuale'}
                </td>
                {/* qty */}
                <td style={{ padding: '10px 6px' }}>
                  <input
                    type="number" min="0" step="0.1"
                    value={row.qty}
                    onChange={e => onUpdate(i, { qty: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: 72, textAlign: 'right', padding: '6px 8px',
                      border: '1px solid #dde2ea', borderRadius: 8,
                      fontSize: 13, fontVariantNumeric: 'tabular-nums',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </td>
                {/* unit */}
                <td style={{ padding: '10px 6px' }}>
                  <select
                    value={row.unit}
                    onChange={e => onUpdate(i, { unit: e.target.value })}
                    style={{
                      width: 96, padding: '6px 8px',
                      border: '1px solid #dde2ea', borderRadius: 8,
                      fontSize: 13, background: '#fff', fontFamily: 'inherit',
                    }}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                {/* ingredient autocomplete */}
                <td style={{ padding: '10px 10px' }}>
                  <IngredientCell row={row} db={db} onUpdate={patch => onUpdate(i, patch)} />
                </td>
                {/* remove */}
                <td style={{ padding: '10px 6px' }}>
                  <button
                    type="button" onClick={() => onRemove(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccd3de', padding: 4 }}
                  >
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button" onClick={onAddRow}
        style={{
          marginTop: 12, width: '100%', padding: '10px',
          border: '1px dashed #dde2ea', borderRadius: 10,
          background: 'none', color: '#9ba8bb', fontSize: 13,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontFamily: 'inherit',
        }}
      >
        <Plus size={14} /> Aggiungi riga
      </button>
    </div>
  );
}

function IngredientCell({ row, db, onUpdate }: {
  row: RowState;
  db: DBIngredient[];
  onUpdate: (patch: Partial<RowState>) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const badge = confidenceBadge(row.confidence_score);

  const openSearch = () => {
    onUpdate({ searchOpen: true, searchResults: row.suggestions.map(s => s.ingredient) });
  };

  const handleSearchChange = (q: string) => {
    onUpdate({ searchQuery: q, searchResults: searchDB(q, db) });
  };

  const selectIngredient = (ing: DBIngredient) => {
    onUpdate({
      selectedIngredient: ing,
      searchQuery: ing.nome,
      searchOpen: false,
      confidence_score: 100,
    });
  };

  // Chiudi dropdown se click fuori
  React.useEffect(() => {
    if (!row.searchOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onUpdate({ searchOpen: false });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [row.searchOpen, onUpdate]);

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: 200 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          border: `1.5px solid ${row.selectedIngredient ? '#dde2ea' : '#fcc'}`,
          borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
          background: '#fff',
        }}
        onClick={openSearch}
      >
        <Search size={12} style={{ color: '#9ba8bb', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, color: row.selectedIngredient ? '#1a1f2e' : '#9ba8bb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.selectedIngredient?.nome ?? 'Seleziona ingrediente…'}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
          background: badge.bg, color: badge.color, flexShrink: 0,
        }}>
          {badge.label}
        </span>
      </div>

      {row.searchOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #dde2ea', borderRadius: 10,
          marginTop: 4, boxShadow: '0 8px 24px rgba(12,19,38,0.12)',
          maxHeight: 240, overflowY: 'auto',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f2f6' }}>
            <input
              autoFocus
              type="text"
              value={row.searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Cerca nel database…"
              style={{
                width: '100%', border: 'none', outline: 'none',
                fontSize: 13, fontFamily: 'inherit', color: '#1a1f2e',
              }}
            />
          </div>
          {/* Suggerimenti da fuse.js — mostrati quando searchQuery è vuoto */}
          {!row.searchQuery && row.suggestions.length > 0 && (
            <div style={{ padding: '4px 0' }}>
              <div style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#9ba8bb' }}>Suggerimenti</div>
              {row.suggestions.map((s, si) => {
                const b = confidenceBadge(s.score);
                return (
                  <div
                    key={si}
                    onClick={() => selectIngredient(s.ingredient)}
                    style={{ padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f8f9fb'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                  >
                    <span style={{ flex: 1, fontSize: 13, color: '#1a1f2e' }}>{s.ingredient.nome}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: b.bg, color: b.color }}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          )}
          {/* Risultati ricerca libera */}
          {row.searchQuery && (
            <div style={{ padding: '4px 0' }}>
              {row.searchResults.length === 0 ? (
                <div style={{ padding: '12px 10px', color: '#9ba8bb', fontSize: 13 }}>Nessun risultato</div>
              ) : row.searchResults.map((ing, ri) => (
                <div
                  key={ri}
                  onClick={() => selectIngredient(ing)}
                  style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 13, color: '#1a1f2e' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f8f9fb'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                >
                  {ing.nome}
                  {ing.etichetta && ing.etichetta !== ing.nome && (
                    <span style={{ fontSize: 11, color: '#9ba8bb', marginLeft: 6 }}>{ing.etichetta}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/calculators/NutrizionaleCalc/SmartImportModal.tsx
git commit -m "feat: add SmartImportModal with two-phase import UI"
```

---

## Task 5 — Integrazione Desktop (`NutrizionaleCalc.tsx`)

**Files:**
- Modifica: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 1: Aggiungi import in cima al file**

Subito dopo gli import esistenti, aggiungi:

```typescript
import { SmartImportModal } from './SmartImportModal';
import type { SmartImportResult } from './SmartImportModal';
```

- [ ] **Step 2: Aggiungi stato modal**

Cerca il blocco degli `useState` nel componente principale (attorno alla riga 1012) e aggiungi:

```typescript
const [showSmartImport, setShowSmartImport] = useState(false);
```

- [ ] **Step 3: Aggiungi handler `handleSmartImport`**

Subito dopo la funzione `addComp` (attorno alla riga 1299), aggiungi:

```typescript
const handleSmartImport = useCallback((result: SmartImportResult) => {
    const targetCompId = components[0]?.id;
    if (!targetCompId) return;
    setComponents(prev => prev.map(c => {
        if (c.id !== targetCompId) return c;
        const newRows: RecipeRow[] = result.rows.map(r => ({
            id: String(Date.now() + Math.random()),
            ing: r.ing,
            grams: r.grams,
            eurKg: r.ing.eur_kg ?? 0,
            resa: 100,
        }));
        return { ...c, rows: [...c.rows, ...newRows] };
    }));
    toast.success(`${result.rows.length} ingredienti importati.`);
}, [components, toast]);
```

- [ ] **Step 4: Aggiungi bottone in topbar**

Cerca nel JSX il bottone "Nuovo Ingrediente" (attorno alla riga 2026) e aggiungi PRIMA di esso:

```tsx
<button type="button" className="topbar-btn-ghost" onClick={() => setShowSmartImport(true)}>
    <Sparkles size={13} />
    Importa Ricetta
</button>
```

- [ ] **Step 5: Aggiungi import di `Sparkles` da lucide**

Nel blocco import di lucide-react (riga 10), aggiungi `Sparkles`:

```typescript
import {
    Salad, Flame, Globe, Package, ImageDown, Download, Sparkles,
    // ...altri già presenti
} from 'lucide-react';
```

- [ ] **Step 6: Aggiungi il modal nel JSX**

Alla fine del JSX del componente, prima del `</>`  di chiusura, aggiungi:

```tsx
{showSmartImport && (
    <SmartImportModal
        db={db}
        onClose={() => setShowSmartImport(false)}
        onImport={handleSmartImport}
    />
)}
```

- [ ] **Step 7: TypeCheck**

```bash
npx tsc --noEmit --skipLibCheck 2>&1
```

Output atteso: nessun errore.

- [ ] **Step 8: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat: integrate SmartImportModal in desktop nutritional calculator"
```

---

## Task 6 — Integrazione Mobile

**Files:**
- Modifica: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`
- Modifica: `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx`

- [ ] **Step 1: `NutrizionaleCalcMobile.tsx` — aggiungi stato e handler**

Aggiungi import:

```typescript
import { SmartImportModal } from './SmartImportModal';
import type { SmartImportResult } from './SmartImportModal';
```

Aggiungi stato nel componente:

```typescript
const [showSmartImport, setShowSmartImport] = useState(false);
```

Aggiungi handler (dopo gli handler esistenti `addRow`/`updateRow`):

```typescript
const handleSmartImportMobile = useCallback((result: SmartImportResult) => {
    const targetComp = components[0];
    if (!targetComp) return;
    result.rows.forEach(r => {
        const newId = String(Date.now() + Math.random());
        onAddRow_internal(targetComp.id, r.ing, r.grams, newId);
    });
}, [components]);
```

> Nota: usa il pattern già esistente in NutrizionaleCalcMobile per aggiungere righe (cerca `onAddRow` interno al file e adatta).

Aggiungi il modal nel JSX (dopo il bottom tabbar):

```tsx
{showSmartImport && (
    <SmartImportModal
        db={db}
        onClose={() => setShowSmartImport(false)}
        onImport={handleSmartImportMobile}
    />
)}
```

- [ ] **Step 2: `CalcoloTab.tsx` — aggiungi prop e bottone**

Aggiungi `onOpenSmartImport: () => void` all'interfaccia `Props`.

Aggiungi il bottone nell'header della sezione ingredienti (cerca il bottone "+ Aggiungi" esistente):

```tsx
<button
    type="button"
    className="m-btn m-btn--ghost"
    onClick={onOpenSmartImport}
    style={{ fontSize: 12, padding: '6px 12px' }}
>
    ✨ Importa ricetta
</button>
```

Passa `onOpenSmartImport={() => setShowSmartImport(true)}` dal parent `NutrizionaleCalcMobile`.

- [ ] **Step 3: TypeCheck**

```bash
npx tsc --noEmit --skipLibCheck 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx \
        src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx
git commit -m "feat: integrate SmartImportModal in mobile calculator"
```

---

## Self-Review

### Spec coverage

| Requisito spec | Task |
|---|---|
| §1 Textarea + "Analizza Ricetta" | Task 4 `PhaseInput` |
| §2 Parser: qty, unit, nome pulito, standardizzazione | Task 2 |
| §3 Fuzzy search fuse.js top-3 + score | Task 2 `parseRecipe` |
| §4 JSON output `ParsedLine` | Task 2 (interfaccia) |
| §5 Tabella validazione: raw_text, qty input, unit select, autocomplete+badge, +row | Task 4 `PhaseValidation` + `IngredientCell` |
| §6 "Calcola" → passa a funzioni esistenti | Task 5 + Task 6 |

### Placeholder scan

Nessun TBD, TODO, o "handle edge cases" generici. Ogni step ha codice completo.

### Type consistency

- `ParsedLine` definito in Task 2, usato in Task 4 (`parseRecipe` ritorna `ParsedLine[]`)
- `SmartImportResult` definito in Task 4, usato in Task 5 e Task 6
- `RecipeRow` importato da `nutrizionaleCalcEngine` in Task 5
- `RowState` è locale a `SmartImportModal.tsx` — non esposto

---

> **Piano salvato.** Due opzioni di esecuzione:
>
> **1. Subagent-driven** — dispatcho un agente per task, review tra un task e l'altro
>
> **2. Inline** — esecuzione in questa sessione con `executing-plans`
>
> Quale preferisci?
