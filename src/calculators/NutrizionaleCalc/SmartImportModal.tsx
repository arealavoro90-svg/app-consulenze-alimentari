import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Sparkles, Plus, Search, FileSpreadsheet } from 'lucide-react';
import { parseRecipeGroups } from '../../utils/recipeParser';
import { importFromExcel } from '../../utils/excelImporter';
import type { DBIngredient } from '../../engines/nutrizionaleCalcEngine';

export interface SmartImportResult {
  productName?: string;
  finishedWeight?: number;
  components: Array<{ name: string; pzUV?: number; rows: Array<{ ing: DBIngredient; grams: number }> }>;
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

interface GroupState {
  name: string;
  pzUV?: number;
  rows: RowState[];
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
  onExcelFile,
  excelLoading,
}: {
  rawText: string;
  onTextChange: (t: string) => void;
  onAnalyze: () => void;
  onExcelFile: (file: File) => void;
  excelLoading: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEmpty = rawText.trim().length === 0;

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Importa da Excel */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 10,
        border: '1.5px dashed #d1d5db',
        background: '#f9fafb',
      }}>
        <FileSpreadsheet size={22} color="#22c55e" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Carica file Excel AEA</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Importa direttamente dal programma tabelle nutrizionali (.xlsx)</div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onExcelFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={excelLoading}
          style={{
            flexShrink: 0,
            padding: '7px 14px',
            borderRadius: 8,
            border: '1.5px solid #22c55e',
            background: '#fff',
            color: '#16a34a',
            fontWeight: 600,
            fontSize: 13,
            cursor: excelLoading ? 'wait' : 'pointer',
            opacity: excelLoading ? 0.6 : 1,
          }}
        >
          {excelLoading ? 'Caricamento…' : 'Scegli file'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9ca3af', fontSize: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        oppure incolla il testo
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
      </div>

      <textarea
        rows={8}
        placeholder={'Incolla la ricetta qui — una riga per ingrediente.\nPer più componenti usa le intestazioni (riga che termina con ":"):\n\nPer la pasta:\n200g farina 00\n3 uova\n\nPer il ripieno:\n300g ricotta\n100g zucchero'}
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
        onClick={onAnalyze}
        disabled={isEmpty}
        title={isEmpty ? 'Incolla il testo della ricetta prima di analizzare' : undefined}
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

function IngredientTable({
  rows, db, groupIdx,
  onRowChange, onRowRemove, onRowAdd,
}: {
  rows: RowState[]; db: DBIngredient[]; groupIdx: number;
  onRowChange: (gIdx: number, rIdx: number, patch: Partial<RowState>) => void;
  onRowRemove: (gIdx: number, rIdx: number) => void;
  onRowAdd: (gIdx: number) => void;
}) {
  const thStyle: React.CSSProperties = {
    padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600,
    color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em',
    borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
  };
  const tdStyle: React.CSSProperties = {
    padding: '6px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f3f4f6',
  };
  return (
    <>
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
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td style={tdStyle}>
                  <span style={{ fontStyle: 'italic', color: '#6b7280', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, fontSize: 12 }} title={row.raw_text}>
                    {row.raw_text}
                  </span>
                </td>
                <td style={tdStyle}>
                  <input type="number" min={0} value={row.qty}
                    onChange={e => onRowChange(groupIdx, rIdx, { qty: parseFloat(e.target.value) || 0 })}
                    style={{ width: 60, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none' }}
                  />
                </td>
                <td style={tdStyle}>
                  <select value={row.unit} onChange={e => onRowChange(groupIdx, rIdx, { unit: e.target.value })}
                    style={{ padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', outline: 'none' }}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                <td style={tdStyle}>
                  <IngredientCell row={row} db={db} onChange={patch => onRowChange(groupIdx, rIdx, patch)} />
                </td>
                <td style={tdStyle}>
                  <button type="button" onClick={() => onRowRemove(groupIdx, rIdx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, display: 'flex', alignItems: 'center' }}
                    title="Rimuovi riga">
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => onRowAdd(groupIdx)}
        style={{ marginTop: 8, marginLeft: 2, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', border: '1.5px dashed #d1d5db', borderRadius: 8, background: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>
        <Plus size={13} /> Aggiungi ingrediente
      </button>
    </>
  );
}

function PhaseValidation({
  groups, db, onRowChange, onRowRemove, onRowAdd, onGroupAdd, onGroupRename,
}: {
  groups: GroupState[];
  db: DBIngredient[];
  onRowChange: (gIdx: number, rIdx: number, patch: Partial<RowState>) => void;
  onRowRemove: (gIdx: number, rIdx: number) => void;
  onRowAdd: (gIdx: number) => void;
  onGroupAdd: () => void;
  onGroupRename: (gIdx: number, name: string) => void;
}) {
  const multiComp = groups.length > 1;
  return (
    <div style={{ padding: '0 24px 20px' }}>
      {groups.map((group, gIdx) => (
        <div key={gIdx} style={{ marginBottom: multiComp ? 24 : 0 }}>
          {/* Intestazione componente (solo se multi-componente) */}
          {multiComp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 8px', borderBottom: '2px solid #e5e7eb', paddingBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ff7e2e', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                Componente {gIdx + 1}
              </span>
              <input
                value={group.name}
                onChange={e => onGroupRename(gIdx, e.target.value)}
                style={{ flex: 1, border: 'none', borderBottom: '1px dashed #d1d5db', outline: 'none', fontSize: 14, fontWeight: 600, color: '#111827', background: 'transparent', padding: '2px 4px' }}
                placeholder="Nome componente"
              />
            </div>
          )}
          <IngredientTable
            rows={group.rows} db={db} groupIdx={gIdx}
            onRowChange={onRowChange} onRowRemove={onRowRemove} onRowAdd={onRowAdd}
          />
        </div>
      ))}
      {/* Aggiungi componente */}
      <button type="button" onClick={onGroupAdd}
        style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', border: '1.5px dashed #ff7e2e', borderRadius: 8, background: 'none', color: '#ff7e2e', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        <Plus size={14} /> Aggiungi componente
      </button>
    </div>
  );
}

// ─── SmartImportModal (main) ──────────────────────────────────────────────────

const EMPTY_ROW = (): RowState => ({
  raw_text: '', qty: 0, unit: 'g', selectedIngredient: null,
  confidence_score: 0, suggestions: [], searchQuery: '', searchOpen: false, searchResults: [],
});

function parsedGroupsToGroupState(parsed: ReturnType<typeof parseRecipeGroups>): GroupState[] {
  return parsed.map(g => ({
    name: g.name,
    pzUV: g.pzUV,
    rows: g.lines.map(line => ({
      raw_text: line.raw_text,
      qty: line.parsed_quantity || 0,
      unit: line.parsed_unit || 'g',
      selectedIngredient: line.matched_ingredient,
      confidence_score: line.confidence_score,
      suggestions: line.suggestions,
      searchQuery: '', searchOpen: false, searchResults: [],
    })),
  }));
}

export function SmartImportModal({ db, onClose, onImport }: Props) {
  const [phase, setPhase] = useState<'input' | 'validation'>('input');
  const [rawText, setRawText] = useState('');
  const [groups, setGroups] = useState<GroupState[]>([]);
  const [productName, setProductName] = useState<string | undefined>();
  const [finishedWeight, setFinishedWeight] = useState<number | undefined>();
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);

  const handleAnalyze = useCallback(() => {
    const parsed = parseRecipeGroups(rawText, db);
    setGroups(parsedGroupsToGroupState(parsed));
    setProductName(undefined);
    setFinishedWeight(undefined);
    setPhase('validation');
  }, [rawText, db]);

  const handleExcelFile = useCallback(async (file: File) => {
    setExcelLoading(true);
    setExcelError(null);
    try {
      const data = await importFromExcel(file, db);
      setGroups(parsedGroupsToGroupState(data.groups));
      setProductName(data.productName);
      setFinishedWeight(data.finishedWeight);
      setPhase('validation');
    } catch (err) {
      setExcelError(err instanceof Error ? err.message : 'Errore durante la lettura del file.');
    } finally {
      setExcelLoading(false);
    }
  }, [db]);

  const handleRowChange = useCallback((gIdx: number, rIdx: number, patch: Partial<RowState>) => {
    setGroups(prev => prev.map((g, gi) => gi !== gIdx ? g : {
      ...g, rows: g.rows.map((r, ri) => ri !== rIdx ? r : { ...r, ...patch }),
    }));
  }, []);

  const handleRowRemove = useCallback((gIdx: number, rIdx: number) => {
    setGroups(prev => prev.map((g, gi) => gi !== gIdx ? g : {
      ...g, rows: g.rows.filter((_, ri) => ri !== rIdx),
    }));
  }, []);

  const handleRowAdd = useCallback((gIdx: number) => {
    setGroups(prev => prev.map((g, gi) => gi !== gIdx ? g : {
      ...g, rows: [...g.rows, EMPTY_ROW()],
    }));
  }, []);

  const handleGroupAdd = useCallback(() => {
    setGroups(prev => [...prev, { name: `Componente ${prev.length + 1}`, rows: [EMPTY_ROW()] }]);
  }, []);

  const handleGroupRename = useCallback((gIdx: number, name: string) => {
    setGroups(prev => prev.map((g, gi) => gi !== gIdx ? g : { ...g, name }));
  }, []);

  const handleImport = useCallback(() => {
    const components = groups.map(g => ({
      name: g.name,
      pzUV: g.pzUV,
      rows: g.rows
        .filter(r => r.selectedIngredient !== null && r.qty > 0)
        .map(r => ({ ing: r.selectedIngredient!, grams: toGrams(r.qty, r.unit) })),
    })).filter(c => c.rows.length > 0);
    onImport({ productName, finishedWeight, components });
    onClose();
  }, [groups, productName, finishedWeight, onImport, onClose]);

  const allRows = groups.flatMap(g => g.rows);
  const matchedCount = allRows.filter(r => r.selectedIngredient !== null).length;
  const totalCount = allRows.length;

  const maxWidth = phase === 'input' ? 560 : 860;

  const subtitle = phase === 'input'
    ? 'Incolla gli ingredienti della tua ricetta e li abbino automaticamente al database.'
    : productName
      ? `Prodotto: "${productName}" — verifica e correggi prima di importare.`
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
      role="dialog"
      aria-modal="true"
      aria-label="Importa ricetta"
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
            <>
              <PhaseInput
                rawText={rawText}
                onTextChange={setRawText}
                onAnalyze={handleAnalyze}
                onExcelFile={handleExcelFile}
                excelLoading={excelLoading}
              />
              {excelError && (
                <div style={{ margin: '0 24px 16px', padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }}>
                  {excelError}
                </div>
              )}
            </>
          ) : (
            <PhaseValidation
              groups={groups}
              db={db}
              onRowChange={handleRowChange}
              onRowRemove={handleRowRemove}
              onRowAdd={handleRowAdd}
              onGroupAdd={handleGroupAdd}
              onGroupRename={handleGroupRename}
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
