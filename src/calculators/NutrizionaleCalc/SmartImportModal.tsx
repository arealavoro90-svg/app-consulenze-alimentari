import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Sparkles, Plus, Search } from 'lucide-react';
import { parseRecipe, type ParsedLine } from '../../utils/recipeParser';
import type { DBIngredient } from '../../engines/nutrizionaleCalcEngine';

export interface SmartImportResult {
  rows: Array<{ ing: DBIngredient; grams: number }>;
}

interface Props {
  db: DBIngredient[];
  onClose: () => void;
  onImport: (result: SmartImportResult) => void;
}

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

function toGrams(qty: number, unit: string): number {
  if (unit === 'kg') return qty * 1000;
  if (unit === 'l') return qty * 1000;
  return qty;
}

// ─── IngredientCell ───────────────────────────────────────────────────────────

interface IngredientCellProps {
  row: RowState;
  db: DBIngredient[];
  onChange: (patch: Partial<RowState>) => void;
}

function IngredientCell({ row, db, onChange }: IngredientCellProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const openDropdown = useCallback(() => {
    onChange({ searchOpen: true, searchQuery: '', searchResults: [] });
  }, [onChange]);

  const closeDropdown = useCallback(() => {
    onChange({ searchOpen: false });
  }, [onChange]);

  const selectIngredient = useCallback((ing: DBIngredient) => {
    onChange({
      selectedIngredient: ing,
      confidence_score: 100,
      searchOpen: false,
      searchQuery: '',
      searchResults: [],
    });
  }, [onChange]);

  useEffect(() => {
    if (!row.searchOpen) return;
    setTimeout(() => searchInputRef.current?.focus(), 0);

    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [row.searchOpen, closeDropdown]);

  const badge = confidenceBadge(row.selectedIngredient ? row.confidence_score : 0);
  const hasSelection = row.selectedIngredient !== null;

  const cellBorder = hasSelection ? '1px solid #d1d5db' : '1px solid #ef4444';

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={openDropdown}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          border: cellBorder,
          borderRadius: 6,
          background: '#fff',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 13,
          minWidth: 0,
        }}
      >
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: hasSelection ? '#111827' : '#9ca3af',
        }}>
          {hasSelection ? row.selectedIngredient!.nome : 'Seleziona ingrediente…'}
        </span>
        {hasSelection && (
          <span style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            padding: '1px 5px',
            borderRadius: 999,
            background: badge.bg,
            color: badge.color,
          }}>
            {badge.label}
          </span>
        )}
      </button>

      {row.searchOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            background: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            marginTop: 2,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={13} color="#9ca3af" style={{ flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cerca nel DB…"
              value={row.searchQuery}
              onChange={e => {
                const q = e.target.value;
                onChange({ searchQuery: q, searchResults: searchDB(q, db) });
              }}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: 13,
                flex: 1,
                background: 'transparent',
              }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {row.searchQuery.trim().length < 2 ? (
              // show fuse suggestions
              row.suggestions.length > 0
                ? row.suggestions.slice(0, 3).map((s, i) => {
                    const b = confidenceBadge(s.score);
                    return (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => selectIngredient(s.ingredient)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '7px 10px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.ingredient.nome}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 5px', borderRadius: 999, background: b.bg, color: b.color, flexShrink: 0 }}>
                          {b.label}
                        </span>
                      </button>
                    );
                  })
                : (
                  <div style={{ padding: '10px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                    Digita per cercare nel DB
                  </div>
                )
            ) : (
              row.searchResults.length > 0
                ? row.searchResults.map((ing, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => selectIngredient(ing)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {ing.nome}
                  </button>
                ))
                : (
                  <div style={{ padding: '10px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                    Nessun risultato
                  </div>
                )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PhaseInput ───────────────────────────────────────────────────────────────

function PhaseInput({
  rawText,
  onTextChange,
  onAnalyze,
}: {
  rawText: string;
  onTextChange: (t: string) => void;
  onAnalyze: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const isEmpty = rawText.trim().length === 0;

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <textarea
        autoFocus
        rows={10}
        placeholder={'Incolla la ricetta qui, una riga per ingrediente.\nEsempio:\n200g farina 00\n3 uova\n100 ml latte intero\n50g burro\nun pizzico di sale'}
        value={rawText}
        onChange={e => onTextChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          padding: '12px 14px',
          border: `1.5px solid ${focused ? '#ff7e2e' : '#d1d5db'}`,
          borderRadius: 10,
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.15s',
          color: '#111827',
        }}
      />
      <button
        type="button"
        onClick={!isEmpty ? onAnalyze : undefined}
        style={{
          alignSelf: 'flex-end',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 10,
          border: 'none',
          background: isEmpty ? '#e5e7eb' : 'linear-gradient(135deg, #ff7e2e, #dd5c0c)',
          color: isEmpty ? '#9ca3af' : '#fff',
          fontWeight: 600,
          fontSize: 14,
          cursor: isEmpty ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.15s',
        }}
      >
        <Sparkles size={16} />
        Analizza ricetta
      </button>
    </div>
  );
}

// ─── PhaseValidation ─────────────────────────────────────────────────────────

function PhaseValidation({
  rows,
  db,
  onRowChange,
  onRowRemove,
  onRowAdd,
}: {
  rows: RowState[];
  db: DBIngredient[];
  onRowChange: (idx: number, patch: Partial<RowState>) => void;
  onRowRemove: (idx: number) => void;
  onRowAdd: () => void;
}) {
  const thStyle: React.CSSProperties = {
    padding: '8px 10px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
  };

  const tdStyle: React.CSSProperties = {
    padding: '6px 8px',
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
  };

  return (
    <div style={{ padding: '0 24px 20px' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '28%' }}>Riga originale</th>
              <th style={{ ...thStyle, width: 70 }}>Qtà</th>
              <th style={{ ...thStyle, width: 100 }}>Unità</th>
              <th style={thStyle}>Ingrediente DB</th>
              <th style={{ ...thStyle, width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>
                  <span style={{
                    fontStyle: 'italic',
                    color: '#6b7280',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 200,
                    fontSize: 12,
                  }} title={row.raw_text}>
                    {row.raw_text}
                  </span>
                </td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    min={0}
                    value={row.qty}
                    onChange={e => onRowChange(idx, { qty: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: 60,
                      padding: '4px 6px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </td>
                <td style={tdStyle}>
                  <select
                    value={row.unit}
                    onChange={e => onRowChange(idx, { unit: e.target.value })}
                    style={{
                      padding: '4px 6px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 13,
                      background: '#fff',
                      outline: 'none',
                    }}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                <td style={tdStyle}>
                  <IngredientCell
                    row={row}
                    db={db}
                    onChange={patch => onRowChange(idx, patch)}
                  />
                </td>
                <td style={tdStyle}>
                  <button
                    type="button"
                    onClick={() => onRowRemove(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Rimuovi riga"
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
        type="button"
        onClick={onRowAdd}
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          border: '1.5px dashed #d1d5db',
          borderRadius: 8,
          background: 'none',
          color: '#6b7280',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        <Plus size={14} />
        Aggiungi riga
      </button>
    </div>
  );
}

// ─── SmartImportModal (main) ──────────────────────────────────────────────────

export function SmartImportModal({ db, onClose, onImport }: Props) {
  const [phase, setPhase] = useState<'input' | 'validation'>('input');
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState<RowState[]>([]);

  const handleAnalyze = useCallback(() => {
    const parsed: ParsedLine[] = parseRecipe(rawText, db);
    const newRows: RowState[] = parsed.map(line => ({
      raw_text: line.raw_text,
      qty: line.parsed_quantity || 0,
      unit: line.parsed_unit || 'g',
      selectedIngredient: line.matched_ingredient,
      confidence_score: line.confidence_score,
      suggestions: line.suggestions,
      searchQuery: '',
      searchOpen: false,
      searchResults: [],
    }));
    setRows(newRows);
    setPhase('validation');
  }, [rawText, db]);

  const handleRowChange = useCallback((idx: number, patch: Partial<RowState>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }, []);

  const handleRowRemove = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleRowAdd = useCallback(() => {
    setRows(prev => [...prev, {
      raw_text: '',
      qty: 0,
      unit: 'g',
      selectedIngredient: null,
      confidence_score: 0,
      suggestions: [],
      searchQuery: '',
      searchOpen: false,
      searchResults: [],
    }]);
  }, []);

  const handleImport = useCallback(() => {
    const validRows = rows
      .filter(r => r.selectedIngredient !== null && r.qty > 0)
      .map(r => ({ ing: r.selectedIngredient!, grams: toGrams(r.qty, r.unit) }));
    onImport({ rows: validRows });
    onClose();
  }, [rows, onImport, onClose]);

  const matchedCount = rows.filter(r => r.selectedIngredient !== null).length;
  const totalCount = rows.length;

  const maxWidth = phase === 'input' ? 560 : 860;

  const subtitle = phase === 'input'
    ? 'Incolla gli ingredienti della tua ricetta e li abbino automaticamente al database.'
    : 'Verifica e correggi i risultati prima di importare.';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        backgroundColor: 'rgba(12,19,38,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          transition: 'max-width 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f3f4f6',
          flexShrink: 0,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #ff7e2e, #dd5c0c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>
              Import intelligente ricetta
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {subtitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {phase === 'input' ? (
            <PhaseInput
              rawText={rawText}
              onTextChange={setRawText}
              onAnalyze={handleAnalyze}
            />
          ) : (
            <PhaseValidation
              rows={rows}
              db={db}
              onRowChange={handleRowChange}
              onRowRemove={handleRowRemove}
              onRowAdd={handleRowAdd}
            />
          )}
        </div>

        {/* Footer (validation only) */}
        {phase === 'validation' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 24px',
            borderTop: '1px solid #f3f4f6',
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={() => setPhase('input')}
              style={{
                background: 'none',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                cursor: 'pointer',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ← Modifica testo
            </button>
            <span style={{ flex: 1, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
              {matchedCount}/{totalCount} ingredienti abbinati
            </span>
            <button
              type="button"
              onClick={handleImport}
              style={{
                background: 'linear-gradient(135deg, #ff7e2e, #dd5c0c)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
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
