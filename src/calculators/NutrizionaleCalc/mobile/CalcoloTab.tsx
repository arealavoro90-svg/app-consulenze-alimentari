import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { parseDecimalIT } from '../../../utils/validation';
import { ADDITIVI_CATEGORIE, ADDITIVI_SPECIFICI } from '../shared/constants';
import type {
    MobileNutForm, DBIngredient, MobileComponent, RecipeRow, AdditiveRow,
} from '../NutrizionaleCalcMobile';

interface Props {
    form: MobileNutForm;
    onChange: (patch: Partial<MobileNutForm>) => void;
    onGoToTabella: () => void;
    db: DBIngredient[];
    loadingDB: boolean;
    dbError: string | null;
    components: MobileComponent[];
    onAddComponent: () => void;
    onRemoveComponent: (id: string) => void;
    onUpdateComponentName: (id: string, name: string) => void;
    onUpdateComponentPzUV: (id: string, pzUV: number) => void;
    onAddRow: (compId: string, ing: DBIngredient) => void;
    onRemoveRow: (compId: string, rowId: string) => void;
    onUpdateRow: (compId: string, rowId: string, patch: Partial<RecipeRow>) => void;
    onAddAdditiveRow: (compId: string) => void;
    onRemoveAdditiveRow: (compId: string, rowId: string) => void;
    onUpdateAdditiveRow: (compId: string, rowId: string, patch: Partial<AdditiveRow>) => void;
    onOpenSmartImport: () => void;
}

function searchDB(q: string, db: DBIngredient[]): DBIngredient[] {
    if (!q || q.trim().length < 2) return [];
    const query = q.toLowerCase().trim();
    return db
        .filter(ing => {
            const nome = (ing.nome || '').trim().toLowerCase();
            const etichetta = (ing.etichetta || '').toLowerCase();
            return nome.includes(query) || etichetta.includes(query);
        })
        .sort((a, b) => {
            const nA = (a.nome || '').trim().toLowerCase();
            const nB = (b.nome || '').trim().toLowerCase();
            if (nA === query && nB !== query) return -1;
            if (nB === query && nA !== query) return 1;
            if (nA.startsWith(query) && !nB.startsWith(query)) return -1;
            if (nB.startsWith(query) && !nA.startsWith(query)) return 1;
            return nA.localeCompare(nB, 'it');
        })
        .slice(0, 30);
}

function nv(v: unknown): number { const x = Number(v); return isNaN(x) ? 0 : x; }

// ─── Modale picker ingredienti ────────────────────────────────────────────────
function IngredientPickerModal({ db, compId, onAdd, onClose }: {
    db: DBIngredient[];
    compId: string;
    onAdd: (compId: string, ing: DBIngredient) => void;
    onClose: () => void;
}) {
    const [q, setQ] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Autofocus con piccolo ritardo per garantire il mount dell'overlay
        const t = setTimeout(() => inputRef.current?.focus(), 80);
        return () => clearTimeout(t);
    }, []);

    // Chiudi con Escape
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    const results: DBIngredient[] = q.trim().length >= 2
        ? searchDB(q, db)
        : db.slice(0, 30).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it'));

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1200,
                background: 'rgba(12,19,38,0.55)',
                display: 'flex', flexDirection: 'column',
            }}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Panel */}
            <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                maxHeight: '85dvh',
                background: 'var(--m-bg)',
                borderRadius: '16px 16px 0 0',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--m-border)' }} />
                </div>

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 16px 10px',
                }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--m-text)' }}>
                        Aggiungi ingrediente
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--m-text-muted)' }}
                        aria-label="Chiudi"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Barra di ricerca */}
                <div style={{ padding: '0 16px 10px', position: 'relative' }}>
                    <Search size={14} style={{
                        position: 'absolute', left: 28, top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--m-text-muted)', pointerEvents: 'none',
                    }} />
                    <input
                        ref={inputRef}
                        className="m-input"
                        type="text"
                        placeholder="Cerca ingrediente…"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        style={{ paddingLeft: 34, fontSize: 14 }}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                    />
                </div>

                {/* Lista */}
                <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
                    {results.length === 0 && q.trim().length >= 2 && (
                        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--m-text-muted)', padding: '20px 16px' }}>
                            Nessun risultato per "{q}"
                        </p>
                    )}
                    {results.map((ing, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => { onAdd(compId, ing); onClose(); }}
                            style={{
                                display: 'block', width: '100%', background: 'transparent',
                                border: 'none', borderBottom: '1px solid var(--m-border-light)',
                                padding: '10px 16px', textAlign: 'left', cursor: 'pointer',
                            }}
                        >
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-text)' }}>
                                {(ing.nome || '').trim()}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--m-text-muted)', marginTop: 2 }}>
                                {Math.round(nv(ing.kcal))} kcal · {nv(ing.grassi).toFixed(1)}g G · {nv(ing.carboidrati).toFixed(1)}g C
                            </div>
                        </button>
                    ))}
                    {q.trim().length < 2 && (
                        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--m-text-faint)', padding: '8px 16px 16px' }}>
                            Digita almeno 2 caratteri per cercare nel database completo
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sub-component: single recipe row ────────────────────────────────────────
function RecipeRowItem({ row, compId, onRemove, onUpdate }: {
    row: RecipeRow;
    compId: string;
    onRemove: (compId: string, rowId: string) => void;
    onUpdate: (compId: string, rowId: string, patch: Partial<RecipeRow>) => void;
}) {
    const [gramsRaw, setGramsRaw] = useState(String(row.grams));
    const [resaRaw, setResaRaw] = useState(String(row.resa));
    const [eurRaw, setEurRaw] = useState(String(row.eurKg));
    const [expanded, setExpanded] = useState(false);
    const [removing, setRemoving] = useState(false);

    const handleRemove = () => {
        setRemoving(true);
        setTimeout(() => onRemove(compId, row.id), 200);
    };

    const handleGrams = (v: string) => {
        setGramsRaw(v);
        const num = parseDecimalIT(v);
        if (!isNaN(num) && num >= 0) onUpdate(compId, row.id, { grams: num });
    };
    const handleResa = (v: string) => {
        setResaRaw(v);
        const num = parseDecimalIT(v);
        if (!isNaN(num) && num >= 0 && num <= 100) onUpdate(compId, row.id, { resa: num });
    };
    const handleEur = (v: string) => {
        setEurRaw(v);
        const num = parseDecimalIT(v);
        if (!isNaN(num) && num >= 0) onUpdate(compId, row.id, { eurKg: num });
    };

    return (
        <div className={`m-ing-row${removing ? ' m-ing-row--removing' : ''}`} style={{ marginBottom: 5 }}>
            {/* Main row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px' }}>
                <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--m-text-muted)', flexShrink: 0 }}
                    aria-label="Espandi dettagli"
                >
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <div className="m-ing-row__name">
                    <div className="m-ing-row__title">
                        {(row.ing.nome || '').trim()}
                    </div>
                    <div className="m-ing-row__sub">
                        {Math.round(nv(row.ing.kcal))} kcal/100g
                    </div>
                </div>
                <input
                    className="m-input m-input--num m-ing-row__input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={gramsRaw}
                    onChange={e => handleGrams(e.target.value)}
                    style={{ width: 58, textAlign: 'right', flexShrink: 0, fontSize: 13 }}
                    aria-label={`Grammi di ${(row.ing.nome || '').trim()}`}
                />
                <span className="m-ing-row__unit">g</span>
                <button
                    type="button"
                    onClick={handleRemove}
                    className="m-ing-row__remove"
                    aria-label={`Rimuovi ${(row.ing.nome || '').trim()}`}
                >
                    <Trash2 size={13} />
                </button>
            </div>

            {/* Expanded: resa + eurKg */}
            {expanded && (
                <div style={{
                    display: 'flex', gap: 8, padding: '6px 10px 8px 34px',
                    borderTop: '1px solid var(--m-border, #eee)',
                    background: 'rgba(0,0,0,0.02)',
                }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: 'var(--m-text-muted)', display: 'block', marginBottom: 2 }}>
                            Resa %
                        </label>
                        <input
                            className="m-input m-input--num"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            step="1"
                            value={resaRaw}
                            onChange={e => handleResa(e.target.value)}
                            style={{ width: '100%', textAlign: 'right', fontSize: 12 }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: 'var(--m-text-muted)', display: 'block', marginBottom: 2 }}>
                            €/kg
                        </label>
                        <input
                            className="m-input m-input--num"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={eurRaw}
                            onChange={e => handleEur(e.target.value)}
                            style={{ width: '100%', textAlign: 'right', fontSize: 12 }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sub-component: additive section ─────────────────────────────────────────
function AdditiveSection({ comp, onAdd, onRemove, onUpdate }: {
    comp: MobileComponent;
    onAdd: (compId: string) => void;
    onRemove: (compId: string, rowId: string) => void;
    onUpdate: (compId: string, rowId: string, patch: Partial<AdditiveRow>) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div style={{ marginTop: 8, borderTop: '1px dashed var(--m-border, #ddd)', paddingTop: 6 }}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: 'var(--m-text-muted)', padding: '2px 0',
                }}
            >
                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Additivi {comp.additiveRows.length > 0 ? `(${comp.additiveRows.length})` : ''}
            </button>

            {open && (
                <div style={{ marginTop: 6 }}>
                    {comp.additiveRows.map(row => (
                        <div key={row.id} style={{
                            display: 'flex', gap: 6, alignItems: 'flex-start',
                            marginBottom: 8,
                        }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {/* Categoria */}
                                <select
                                    className="m-input"
                                    value={row.categoria}
                                    onChange={e => onUpdate(comp.id, row.id, {
                                        categoria: e.target.value,
                                        nomeSpecifico: '',
                                    })}
                                    style={{ fontSize: 12 }}
                                >
                                    <option value="">— Categoria —</option>
                                    {ADDITIVI_CATEGORIE.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                {/* Nome specifico: select filtrato per categoria */}
                                <select
                                    className="m-input"
                                    value={row.nomeSpecifico}
                                    onChange={e => onUpdate(comp.id, row.id, { nomeSpecifico: e.target.value })}
                                    disabled={!row.categoria}
                                    style={{ fontSize: 12, color: row.nomeSpecifico ? 'var(--m-text)' : 'var(--m-text-muted)' }}
                                >
                                    <option value="">
                                        {row.categoria ? '— Seleziona additivo —' : '— Prima seleziona categoria —'}
                                    </option>
                                    {(ADDITIVI_SPECIFICI[row.categoria] || []).map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemove(comp.id, row.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: 4, marginTop: 2 }}
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => onAdd(comp.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: '1px dashed var(--m-orange, #ff7e2e)',
                            borderRadius: 6, padding: '4px 10px',
                            fontSize: 12, color: 'var(--m-orange, #ff7e2e)', cursor: 'pointer',
                        }}
                    >
                        <Plus size={12} /> Aggiungi additivo
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Sub-component: single component card ────────────────────────────────────
function ComponentCard({
    comp, index, isOnly, db,
    onRemoveComponent,
    onUpdateName,
    onUpdatePzUV,
    onAddRow,
    onRemoveRow,
    onUpdateRow,
    onAddAdditiveRow,
    onRemoveAdditiveRow,
    onUpdateAdditiveRow,
}: {
    comp: MobileComponent;
    index: number;
    isOnly: boolean;
    db: DBIngredient[];
    onRemoveComponent: (id: string) => void;
    onUpdateName: (id: string, name: string) => void;
    onUpdatePzUV: (id: string, pzUV: number) => void;
    onAddRow: (compId: string, ing: DBIngredient) => void;
    onRemoveRow: (compId: string, rowId: string) => void;
    onUpdateRow: (compId: string, rowId: string, patch: Partial<RecipeRow>) => void;
    onAddAdditiveRow: (compId: string) => void;
    onRemoveAdditiveRow: (compId: string, rowId: string) => void;
    onUpdateAdditiveRow: (compId: string, rowId: string, patch: Partial<AdditiveRow>) => void;
}) {
    const [pzRaw, setPzRaw] = useState(String(comp.pzUV));
    const [pickerOpen, setPickerOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const totalGrams = comp.rows.reduce((s, r) => s + r.grams, 0);

    const handlePzUV = (v: string) => {
        setPzRaw(v);
        const num = parseDecimalIT(v);
        if (!isNaN(num) && num > 0) onUpdatePzUV(comp.id, num);
    };

    return (
        <>
            {pickerOpen && (
                <IngredientPickerModal
                    db={db}
                    compId={comp.id}
                    onAdd={onAddRow}
                    onClose={() => setPickerOpen(false)}
                />
            )}

            <div className="m-comp-card">
                {/* Card header — tappabile per collassare */}
                <div
                    className="m-comp-card__header"
                    style={{
                        borderBottom: collapsed ? 'none' : '1px solid var(--m-border, #e0e0e0)',
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}
                    onClick={() => setCollapsed(c => !c)}
                >
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--m-orange, #ff7e2e)', flexShrink: 0 }}>
                        C{index + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {comp.name || `Componente ${index + 1}`}
                        </div>
                        {collapsed && comp.rows.length > 0 && (
                            <div style={{ fontSize: 10, color: 'var(--m-text-muted)' }}>
                                {comp.rows.length} ingredienti · {totalGrams.toFixed(0)} g
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {!isOnly && (
                            <button
                                type="button"
                                onClick={() => onRemoveComponent(comp.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: 2 }}
                                aria-label="Rimuovi componente"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        <ChevronDown size={14} style={{
                            color: 'var(--m-text-muted)',
                            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                            transition: 'transform 0.2s',
                        }} />
                    </div>
                </div>

                {/* Card body — collassabile */}
                {!collapsed && <div className="m-comp-card__body">
                    {/* Nome e pz/UV — mostrati nel body quando espanso */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input
                            className="m-input"
                            type="text"
                            placeholder={`Nome componente ${index + 1}`}
                            value={comp.name}
                            onChange={e => onUpdateName(comp.id, e.target.value)}
                            style={{ flex: 1, fontSize: 13, fontWeight: 600 }}
                            autoComplete="off"
                            onClick={e => e.stopPropagation()}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, color: 'var(--m-text-muted)' }}>pz/UV</span>
                            <input
                                className="m-input m-input--num"
                                type="number"
                                inputMode="decimal"
                                min="1"
                                step="1"
                                value={pzRaw}
                                onChange={e => handlePzUV(e.target.value)}
                                style={{ width: 46, textAlign: 'right', fontSize: 12 }}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    {/* Pulsante apri picker */}
                    <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            width: '100%', padding: '8px 12px', marginBottom: 6,
                            background: 'var(--m-surface)',
                            border: '1.5px dashed var(--m-orange, #ff7e2e)',
                            borderRadius: 8, cursor: 'pointer',
                            fontSize: 13, color: 'var(--m-orange, #ff7e2e)',
                        }}
                    >
                        <Search size={13} />
                        Cerca e aggiungi ingrediente…
                    </button>

                    {comp.rows.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--m-text-muted)', textAlign: 'center', margin: '8px 0 4px' }}>
                            Nessun ingrediente aggiunto
                        </p>
                    ) : (
                        <>
                            {comp.rows.map(row => (
                                <RecipeRowItem
                                    key={row.id}
                                    row={row}
                                    compId={comp.id}
                                    onRemove={onRemoveRow}
                                    onUpdate={onUpdateRow}
                                />
                            ))}
                            <div style={{ fontSize: 10, color: 'var(--m-text-muted)', textAlign: 'right', marginTop: 2, marginBottom: 4 }}>
                                Totale: {totalGrams.toFixed(1)} g (normalizzato a 100g)
                            </div>
                        </>
                    )}

                    <AdditiveSection
                        comp={comp}
                        onAdd={onAddAdditiveRow}
                        onRemove={onRemoveAdditiveRow}
                        onUpdate={onUpdateAdditiveRow}
                    />
                </div>}
            </div>
        </>
    );
}

// ─── Main CalcoloTab ──────────────────────────────────────────────────────────
export function CalcoloTab({
    form, onChange, onGoToTabella,
    db, loadingDB, dbError,
    components,
    onAddComponent, onRemoveComponent,
    onUpdateComponentName, onUpdateComponentPzUV,
    onAddRow, onRemoveRow, onUpdateRow,
    onAddAdditiveRow, onRemoveAdditiveRow, onUpdateAdditiveRow,
    onOpenSmartImport,
}: Props) {
    const hasIngredients = components.some(c => c.rows.length > 0);

    return (
        <div style={{ paddingTop: 12 }}>

            {/* Sezione: Prodotto */}
            <div className="m-section">
                <div className="m-section__header" style={{ cursor: 'default' }}>
                    <div className="m-section__line" />
                    <span className="m-section__title">Prodotto</span>
                    <div className="m-section__line" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="m-field">
                        <label className="m-label">Denominazione</label>
                        <input
                            className="m-input"
                            type="text"
                            placeholder="Es. Mozzarella di Bufala"
                            value={form.denominazione}
                            onChange={e => onChange({ denominazione: e.target.value })}
                            autoComplete="off"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div className="m-field" style={{ flex: 1 }}>
                            <label className="m-label">Porzione (g)</label>
                            <input
                                className="m-input m-input--num"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                placeholder="100"
                                value={form.porzione_g}
                                onChange={e => onChange({ porzione_g: e.target.value })}
                            />
                        </div>
                        <div className="m-field" style={{ flex: 1 }}>
                            <label className="m-label">Peso finito (g) <span style={{ fontWeight: 400, opacity: 0.6 }}>opz.</span></label>
                            <input
                                className="m-input m-input--num"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                placeholder="—"
                                value={form.pesoFinito_g}
                                onChange={e => onChange({ pesoFinito_g: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="m-field">
                        <label className="m-label">
                            Peso specifico (g/ml) <span style={{ fontWeight: 400, opacity: 0.6 }}>solo per liquidi</span>
                        </label>
                        <input
                            className="m-input m-input--num"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.001"
                            placeholder="es. 1.030"
                            value={form.specificGravity}
                            onChange={e => onChange({ specificGravity: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Sezione: Componenti + Ingredienti */}
            <div className="m-section">
                <div className="m-section__header" style={{ cursor: 'default' }}>
                    <div className="m-section__line" />
                    <span className="m-section__title">Ingredienti</span>
                    <div className="m-section__line" />
                </div>

                {dbError ? (
                    <div style={{
                        padding: '8px 12px', background: '#fff3f3', borderRadius: 6,
                        border: '1px solid #e53935', fontSize: 12, color: '#c62828', marginBottom: 8,
                    }}>
                        {dbError}
                    </div>
                ) : loadingDB ? (
                    <div style={{
                        padding: '8px 12px', background: '#f5f5f5', borderRadius: 6,
                        fontSize: 12, color: 'var(--m-text-muted)', marginBottom: 8,
                    }}>
                        Caricamento database ingredienti…
                    </div>
                ) : (
                    <>
                        {!hasIngredients && !form.denominazione && (
                            <div style={{ margin: '0 14px 16px', padding: '20px 16px', border: '1.5px dashed var(--m-border)', borderRadius: 10, textAlign: 'center' }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>🍳</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--m-text)', marginBottom: 4 }}>Inizia la ricetta</div>
                                <div style={{ fontSize: 13, color: 'var(--m-text-muted)' }}>Inserisci il nome del prodotto e aggiungi gli ingredienti</div>
                            </div>
                        )}
                        <div className="stagger-children--tight">
                            {components.map((comp, idx) => (
                                <ComponentCard
                                    key={comp.id}
                                    comp={comp}
                                    index={idx}
                                    isOnly={components.length === 1}
                                    db={db}
                                    onRemoveComponent={onRemoveComponent}
                                    onUpdateName={onUpdateComponentName}
                                    onUpdatePzUV={onUpdateComponentPzUV}
                                    onAddRow={onAddRow}
                                    onRemoveRow={onRemoveRow}
                                    onUpdateRow={onUpdateRow}
                                    onAddAdditiveRow={onAddAdditiveRow}
                                    onRemoveAdditiveRow={onRemoveAdditiveRow}
                                    onUpdateAdditiveRow={onUpdateAdditiveRow}
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={onAddComponent}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                width: '100%', padding: '9px 0',
                                background: 'none',
                                border: '1.5px dashed var(--m-orange, #ff7e2e)',
                                borderRadius: 8, fontSize: 13,
                                color: 'var(--m-orange, #ff7e2e)', cursor: 'pointer',
                            }}
                        >
                            <Plus size={14} /> Aggiungi componente
                        </button>
                    </>
                )}
            </div>

            {/* CTA */}
            <div className="m-btn-row" style={{ marginTop: 8, marginBottom: 4 }}>
                <button
                    type="button"
                    className="m-btn m-btn--ghost"
                    onClick={onOpenSmartImport}
                    style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                    ✨ Importa ricetta
                </button>
            </div>
            <div className="m-btn-row" style={{ marginTop: 4, marginBottom: 16 }}>
                <button
                    type="button"
                    className="m-btn m-btn--primary m-btn--full"
                    onClick={onGoToTabella}
                    disabled={!hasIngredients}
                >
                    Vai a Mercati →
                </button>
            </div>
        </div>
    );
}
