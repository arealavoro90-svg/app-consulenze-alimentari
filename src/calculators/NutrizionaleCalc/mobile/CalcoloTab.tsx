import React, { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronDown, Plus, Sparkles, ArrowRight, RotateCcw, BookOpen } from 'lucide-react';
import { parseDecimalIT, validateFinishedWeight, validateIngredientQuantity } from '../../../utils/validation';
import { ADDITIVI_CATEGORIE, ADDITIVI_SPECIFICI } from '../shared/constants';
import { IngSearch } from '../IngSearch';
import { InfoTooltip } from '../InfoTooltip';
import { ValidationError } from '../../../components/ValidationError';
import type {
    MobileNutForm, DBIngredient, MobileComponent, RecipeRow, AdditiveRow, CalcResult,
} from '../NutrizionaleCalcMobile';

interface Props {
    form: MobileNutForm;
    onChange: (patch: Partial<MobileNutForm>) => void;
    onGoToTabella: () => void;
    db: DBIngredient[];
    loadingDB: boolean;
    dbError: string | null;
    onRetryDB: () => void;
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
    onOpenArchive: () => void;
    onNewRecipe: () => void;
    onOpenCustomIngredient: () => void;
    onOpenBrowseDB: () => void;
    hasExcelImport: boolean;
    calcResult?: CalcResult;
}

// ─── Sub-component: single recipe row ────────────────────────────────────────
// Stesso markup/classi della riga ingrediente desktop (.ing-row-compact + espandibile
// €/kg + Resa in .ing-field-group) — replica visiva richiesta esplicitamente.
function RecipeRowItem({ row, compId, isLast, onRemove, onUpdate }: {
    row: RecipeRow;
    compId: string;
    isLast: boolean;
    onRemove: (compId: string, rowId: string) => void;
    onUpdate: (compId: string, rowId: string, patch: Partial<RecipeRow>) => void;
}) {
    const [gramsRaw, setGramsRaw] = useState(String(row.grams));
    const [resaRaw, setResaRaw] = useState(String(row.resa));
    const [eurRaw, setEurRaw] = useState(String(row.eurKg));
    const [expanded, setExpanded] = useState(false);
    const [gramsError, setGramsError] = useState<string | undefined>(undefined);

    const handleGrams = (v: string) => {
        setGramsRaw(v);
        const num = parseDecimalIT(v);
        const result = validateIngredientQuantity(num, (row.ing.nome || '').trim());
        setGramsError(result.isValid ? undefined : result.error);
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
        <div style={{ borderBottom: isLast && !expanded ? 'none' : '1px solid var(--color-border)' }}>
            {/* Compact row */}
            <div className="ing-row-compact">
                <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                    title={expanded ? 'Comprimi' : 'Espandi €/kg e Resa dopo cottura (%)'}
                    aria-label="Espandi dettagli"
                >
                    <ChevronDown size={12} style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
                </button>
                <div className="ing-row-name">
                    <div className="ing-row-name-label">{(row.ing.nome || '').trim()}</div>
                    {row.ing.kcal != null && (
                        <div className="ing-row-kcal">{row.ing.kcal} kcal/100g</div>
                    )}
                </div>
                <div className="ing-row-grams">
                    <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        className="form-input ing-input"
                        style={{ textAlign: 'right' }}
                        value={gramsRaw}
                        onChange={e => handleGrams(e.target.value)}
                        aria-label={`Grammi di ${(row.ing.nome || '').trim()}`}
                    />
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>g</span>
                </div>
                <button
                    type="button"
                    onClick={() => onRemove(compId, row.id)}
                    className="ing-delete-btn"
                    title="Rimuovi ingrediente"
                    aria-label={`Rimuovi ${(row.ing.nome || '').trim()}`}
                >
                    <Trash2 size={12} />
                </button>
            </div>
            <ValidationError message={gramsError} visible={!!gramsError} />

            {/* Expandable detail: €/kg e Resa % — stesso layout desktop */}
            {expanded && (
                <div style={{ borderTop: '1px solid var(--color-border)', padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--color-surface)' }}>
                    <div className="ing-field-group">
                        <div className="ing-field-header">
                            <label className="ing-field-label" htmlFor={`eur-${row.id}`}>€/kg<InfoTooltip text="Costo dell'ingrediente per kg, IVA esclusa. Usato per il calcolo del costo ricetta." /></label>
                        </div>
                        <input
                            id={`eur-${row.id}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={eurRaw}
                            onChange={e => handleEur(e.target.value)}
                            className="form-input ing-input"
                        />
                    </div>
                    <div className="ing-field-group">
                        <div className="ing-field-header">
                            <label className="ing-field-label" htmlFor={`resa-${row.id}`}>Resa dopo cottura (%)<InfoTooltip text="Percentuale di peso rimanente dopo cottura/lavorazione. Es. 70 = perde il 30% del peso." /></label>
                        </div>
                        <input
                            id={`resa-${row.id}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            step="1"
                            value={resaRaw}
                            onChange={e => handleResa(e.target.value)}
                            className="form-input ing-input"
                        />
                    </div>
                    {(row.ing.alcol ?? 0) > 0 && (
                        <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--color-text)' }}>
                            <input
                                type="checkbox"
                                checked={row.postCottura ?? false}
                                onChange={() => onUpdate(compId, row.id, { postCottura: !row.postCottura })}
                                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--m-orange, #ff7e2e)' }}
                            />
                            <span>Post-cottura <span style={{ color: 'var(--color-text-muted)' }}>(alcol non evapora)</span></span>
                        </label>
                    )}
                    {(row.ing.acqua ?? 0) > 90 && (
                        <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--color-text)' }}>
                            <input
                                type="checkbox"
                                checked={row.acquaAggiunta ?? false}
                                onChange={() => onUpdate(compId, row.id, { acquaAggiunta: !row.acquaAggiunta })}
                                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--m-orange, #ff7e2e)' }}
                            />
                            <span>Acqua aggiunta <span style={{ color: 'var(--color-text-muted)' }}>(evapora dopo alcol)</span></span>
                        </label>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Sub-component: single additive row ──────────────────────────────────────
// Stesse classi .ing-* del desktop (NutrizionaleCalc.tsx) — card sempre aperta,
// Grammi/€/kg/Resa sempre visibili assieme, nessun accordion (era "troppo piccola").
function AdditiveRowItem({ row, compId, onRemove, onUpdate }: {
    row: AdditiveRow;
    compId: string;
    onRemove: (compId: string, rowId: string) => void;
    onUpdate: (compId: string, rowId: string, patch: Partial<AdditiveRow>) => void;
}) {
    const [gramsRaw, setGramsRaw] = useState(String(row.grams));
    const [eurRaw, setEurRaw] = useState(String(row.eurKg));
    const [resaRaw, setResaRaw] = useState(String(row.resa));

    const handleGrams = (v: string) => {
        setGramsRaw(v);
        const num = parseDecimalIT(v);
        if (!isNaN(num) && num >= 0) onUpdate(compId, row.id, { grams: num });
    };
    const handleEur = (v: string) => {
        setEurRaw(v);
        const num = parseDecimalIT(v);
        if (!isNaN(num) && num >= 0) onUpdate(compId, row.id, { eurKg: num });
    };
    const handleResa = (v: string) => {
        setResaRaw(v);
        const num = parseDecimalIT(v);
        if (!isNaN(num) && num >= 0 && num <= 100) onUpdate(compId, row.id, { resa: num });
    };

    const fabbA = row.grams / ((row.resa || 100) / 100);
    const costoA = (fabbA / 1000) * row.eurKg;

    return (
        <div className="ing-card">
            <div className="ing-card-header">
                <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                    <select
                        className="form-input"
                        aria-label="Categoria additivo"
                        value={row.categoria}
                        onChange={e => onUpdate(compId, row.id, { categoria: e.target.value, nomeSpecifico: '' })}
                        style={{ flex: '1 1 140px', fontSize: 12 }}
                    >
                        <option value="">— Categoria —</option>
                        {ADDITIVI_CATEGORIE.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select
                        className="form-input"
                        aria-label="Nome additivo"
                        value={row.nomeSpecifico}
                        onChange={e => onUpdate(compId, row.id, { nomeSpecifico: e.target.value })}
                        disabled={!row.categoria}
                        style={{ flex: '1 1 140px', fontSize: 12 }}
                    >
                        <option value="">
                            {row.categoria ? '— Seleziona additivo —' : '— Prima seleziona categoria —'}
                        </option>
                        {(ADDITIVI_SPECIFICI[row.categoria] || []).map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
                <button type="button" className="ing-delete-btn" onClick={() => onRemove(compId, row.id)} aria-label="Rimuovi additivo">
                    <Trash2 size={13} />
                </button>
            </div>
            <div className="ing-card-body">
                <div className="ing-field-group">
                    <div className="ing-field-header"><span className="ing-field-label">Grammi</span></div>
                    <div className="ing-field-input-wrap">
                        <input
                            type="number" inputMode="decimal" min="0" step="1"
                            className="form-input ing-input"
                            value={gramsRaw}
                            onChange={e => handleGrams(e.target.value)}
                            aria-label="Grammi additivo"
                        />
                        <span className="ing-unit">g</span>
                    </div>
                </div>
                <div className="ing-field-group">
                    <div className="ing-field-header"><span className="ing-field-label">€/kg</span></div>
                    <input
                        type="text" inputMode="decimal"
                        className="form-input ing-input"
                        value={eurRaw}
                        onChange={e => handleEur(e.target.value)}
                        aria-label="Prezzo al kg additivo"
                    />
                </div>
                <div className="ing-field-group">
                    <div className="ing-field-header"><span className="ing-field-label">Resa dopo cottura (%)</span></div>
                    <input
                        type="text" inputMode="decimal"
                        className="form-input ing-input"
                        value={resaRaw}
                        onChange={e => handleResa(e.target.value)}
                        aria-label="Resa additivo"
                    />
                </div>
            </div>
            {row.eurKg > 0 && (
                <div className="ing-cost-line">
                    <span>Grammi reali: <strong>{fabbA.toFixed(1)}g</strong></span>
                    <span>Costo: <strong style={{ color: 'var(--color-orange)' }}>{costoA.toFixed(4)} €</strong></span>
                </div>
            )}
        </div>
    );
}

// ─── Sub-component: additive section ─────────────────────────────────────────
// Stesso layout della sezione "Additivi tecnologici" desktop: divider con titolo,
// descrizione, bottone "Aggiungi additivo" sopra le card, sempre visibile.
function AdditiveSection({ comp, onAdd, onRemove, onUpdate }: {
    comp: MobileComponent;
    onAdd: (compId: string) => void;
    onRemove: (compId: string, rowId: string) => void;
    onUpdate: (compId: string, rowId: string, patch: Partial<AdditiveRow>) => void;
}) {
    return (
        <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 6px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Additivi tecnologici</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 8px' }}>Conservanti, coloranti, addensanti (E-numbers). Non contribuiscono al calcolo nutrizionale ma compaiono in etichetta.</p>
            <div style={{ marginBottom: 8 }}>
                <button type="button" className="btn btn-outline" style={{ fontSize: 12, padding: '5px 14px' }} onClick={() => onAdd(comp.id)}>
                    <Plus size={13} /> Aggiungi additivo
                </button>
            </div>
            {comp.additiveRows.map(row => (
                <AdditiveRowItem
                    key={row.id}
                    row={row}
                    compId={comp.id}
                    onRemove={onRemove}
                    onUpdate={onUpdate}
                />
            ))}
        </div>
    );
}

// ─── Sub-component: single component card ────────────────────────────────────
function ComponentCard({
    comp, index, isOnly, db, loadingDB, dbError, onRetryDB,
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
    loadingDB: boolean;
    dbError: string | null;
    onRetryDB: () => void;
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
    const [collapsed, setCollapsed] = useState(false);
    const totalGrams = comp.rows.reduce((s, r) => s + r.grams, 0);

    const handlePzUV = (v: string) => {
        setPzRaw(v);
        const num = parseDecimalIT(v);
        if (!isNaN(num) && num > 0) onUpdatePzUV(comp.id, num);
    };

    return (
        <>
            <div className="m-comp-card">
                {/* Card header — tappabile per collassare */}
                <div
                    className="m-comp-card__header"
                    role="button"
                    tabIndex={0}
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? 'Espandi' : 'Comprimi'} componente ${index + 1}`}
                    style={{
                        borderBottom: collapsed ? 'none' : '1px solid var(--m-border)',
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}
                    onClick={() => setCollapsed(c => !c)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(c => !c); } }}
                >
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--m-orange, #ff7e2e)', flexShrink: 0 }}>
                        C{index + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {comp.name || `Componente ${index + 1}`}
                        </div>
                        {collapsed && comp.rows.length > 0 && (
                            <div style={{ fontSize: 12, color: 'var(--m-text-muted)' }}>
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
                            aria-label={`Nome componente ${index + 1}`}
                            value={comp.name}
                            onChange={e => onUpdateName(comp.id, e.target.value)}
                            style={{ flex: 1, fontSize: 13, fontWeight: 600 }}
                            autoComplete="off"
                            onClick={e => e.stopPropagation()}
                        />
                        {!isOnly && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                <span style={{ fontSize: 12, color: 'var(--m-text-muted)' }}>pz/UV</span>
                                <input
                                    className="m-input m-input--num"
                                    type="number"
                                    inputMode="decimal"
                                    min="1"
                                    step="1"
                                    value={pzRaw}
                                    aria-label="Pezzi per unità di vendita"
                                    onChange={e => handlePzUV(e.target.value)}
                                    style={{ width: 46, textAlign: 'right', fontSize: 12 }}
                                    onClick={e => e.stopPropagation()}
                                />
                            </div>
                        )}
                    </div>
                    {/* Ricerca ingredienti — stesso componente IngSearch del desktop */}
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cerca e aggiungi ingrediente dal database</div>
                    <IngSearch onAdd={(ing) => onAddRow(comp.id, ing)} db={db} loading={loadingDB} error={dbError} onRetry={onRetryDB} />

                    {comp.rows.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--m-text-muted)', textAlign: 'center', margin: '8px 0 4px' }}>
                            Nessun ingrediente aggiunto
                        </p>
                    ) : (
                        <>
                            {/* Contenitore bordato unico, come la lista ingredienti desktop */}
                            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 6 }}>
                                {comp.rows.map((row, rowIdx) => (
                                    <RecipeRowItem
                                        key={row.id}
                                        row={row}
                                        compId={comp.id}
                                        isLast={rowIdx === comp.rows.length - 1}
                                        onRemove={onRemoveRow}
                                        onUpdate={onUpdateRow}
                                    />
                                ))}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--m-text-muted)', textAlign: 'right', marginTop: 2, marginBottom: 4 }}>
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
    db, loadingDB, dbError, onRetryDB,
    components,
    onAddComponent, onRemoveComponent,
    onUpdateComponentName, onUpdateComponentPzUV,
    onAddRow, onRemoveRow, onUpdateRow,
    onAddAdditiveRow, onRemoveAdditiveRow, onUpdateAdditiveRow,
    onOpenSmartImport,
    onOpenArchive,
    onNewRecipe,
    onOpenCustomIngredient,
    onOpenBrowseDB,
    hasExcelImport,
    calcResult,
}: Props) {
    const hasIngredients = components.some(c => c.rows.length > 0);
    const denominazioneRef = useRef<HTMLInputElement>(null);
    const [showLiquid, setShowLiquid] = useState(!!form.specificGravity);
    useEffect(() => { if (form.specificGravity) setShowLiquid(true); }, [form.specificGravity]);

    return (
        <>
        <div style={{ paddingTop: 12, paddingBottom: 0 }}>

            {/* Sezione: Prodotto */}
            <div className="m-section">
                <div className="m-section__header" style={{ cursor: 'default' }}>
                    <div className="m-section__line" />
                    <span className="m-section__title">Prodotto</span>
                    <div className="m-section__line" />
                </div>
                <div style={{ padding: '0 16px 8px' }}>
                    <button
                        type="button"
                        onClick={onNewRecipe}
                        style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '10px 14px', borderRadius: 10, border: 'none',
                            background: 'linear-gradient(135deg, #ff7e2e, #dd5c0c)',
                            color: '#fff', fontWeight: 700, fontSize: 13,
                            cursor: 'pointer', boxShadow: '0 3px 10px rgba(255,126,46,0.3)',
                        }}
                    >
                        <RotateCcw size={14} /> Nuova ricetta
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="m-field">
                        <label className="m-label">Denominazione</label>
                        <input
                            ref={denominazioneRef}
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
                            <span style={{ fontSize: 10, color: 'var(--m-text-faint)', display: 'block', marginBottom: 4 }}>Per la colonna "per porzione" in etichetta</span>
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
                            <label className="m-label">Peso finito (g) <span style={{ fontWeight: 400, opacity: 0.6 }}>opz.</span><InfoTooltip text="Peso del prodotto finito dopo cottura/lavorazione in grammi" /></label>
                            <span style={{ fontSize: 10, color: 'var(--m-text-faint)', display: 'block', marginBottom: 4 }}>Peso dopo cottura/lavorazione (calcola /100g)</span>
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
                            <ValidationError
                                message={validateFinishedWeight(form.pesoFinito_g === '' ? '' : parseDecimalIT(String(form.pesoFinito_g))).error}
                                visible={form.pesoFinito_g !== '' && !validateFinishedWeight(parseDecimalIT(String(form.pesoFinito_g))).isValid}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: showLiquid ? 6 : 0 }}>
                            <input
                                type="checkbox"
                                checked={showLiquid}
                                onChange={e => { setShowLiquid(e.target.checked); if (!e.target.checked) onChange({ specificGravity: '' }); }}
                                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--m-orange, #ff7e2e)' }}
                            />
                            <span className="m-label" style={{ marginBottom: 0 }}>Prodotto liquido (peso specifico g/ml)<InfoTooltip text="Peso specifico per prodotti liquidi (g/ml). Lascia vuoto per prodotti solidi." /></span>
                        </label>
                        {showLiquid && (
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
                        )}
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

                {/* Database ingredienti — stesse azioni del menu "Database" desktop */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button type="button" className="btn btn-outline" style={{ fontSize: 12, padding: '5px 14px', flex: 1, justifyContent: 'center' }} onClick={onOpenCustomIngredient}>
                        <Plus size={13} /> Nuovo ingrediente
                    </button>
                    <button type="button" className="btn btn-outline" style={{ fontSize: 12, padding: '5px 14px', flex: 1, justifyContent: 'center' }} onClick={onOpenBrowseDB}>
                        <BookOpen size={13} /> Sfoglia database
                    </button>
                </div>

                {/* Import strip — visibile solo su ricetta vuota, scompare quando inizia compilazione */}
                {(!hasIngredients && !form.denominazione.trim()) && (
                    <button
                        type="button"
                        onClick={onOpenSmartImport}
                        style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 14px',
                            marginBottom: 10,
                            borderRadius: 10,
                            border: 'none',
                            background: 'linear-gradient(135deg, #ff7e2e, #dd5c0c)',
                            color: '#fff',
                            fontWeight: 700, fontSize: 13,
                            cursor: 'pointer',
                            boxShadow: '0 3px 10px rgba(255,126,46,0.3)',
                        }}
                    >
                        <Sparkles size={15} />
                        <span style={{ flex: 1, textAlign: 'left' }}>Importa ricetta</span>
                        <span style={{ fontSize: 12, opacity: 0.85 }}>✨</span>
                    </button>
                )}

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
                        <div className="stagger-children--tight">
                            {components.map((comp, idx) => (
                                <ComponentCard
                                    key={comp.id}
                                    comp={comp}
                                    index={idx}
                                    isOnly={components.length === 1}
                                    db={db}
                                    loadingDB={loadingDB}
                                    dbError={dbError}
                                    onRetryDB={onRetryDB}
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

                        {hasIngredients && (
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
                                <Plus size={14} /> {components.length === 1 ? '+ Secondo componente' : '+ Componente'}
                            </button>
                        )}
                    </>
                )}
            </div>

        </div>
        {/* Mini-riepilogo live — visibile solo quando ci sono ingredienti */}
        {hasIngredients && calcResult && (
            <div style={{
                display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                padding: '8px 16px', background: 'var(--color-accent-bg)', borderTop: '1px solid rgba(255,126,46,0.2)',
                fontSize: 11, fontWeight: 600, color: 'var(--color-orange)',
            }}>
                <span>{Math.round(calcResult.energyKcal)} <span style={{ fontWeight: 400, color: 'var(--m-text-muted)' }}>kcal</span></span>
                <span>{calcResult.grassi.toFixed(1)}g <span style={{ fontWeight: 400, color: 'var(--m-text-muted)' }}>G</span></span>
                <span>{calcResult.carboidrati.toFixed(1)}g <span style={{ fontWeight: 400, color: 'var(--m-text-muted)' }}>C</span></span>
                <span>{calcResult.proteine.toFixed(1)}g <span style={{ fontWeight: 400, color: 'var(--m-text-muted)' }}>P</span></span>
            </div>
        )}
        <div className="m-cta-bar">
            <button
                type="button"
                className="m-btn m-btn--primary m-btn--full"
                onClick={onGoToTabella}
                disabled={!hasIngredients}
            >
                Riepilogo <ArrowRight size={14} />
            </button>
            {!hasIngredients && (
                <p style={{ textAlign: 'center', margin: '6px 0 0', fontSize: 12, color: 'var(--m-text-muted)' }}>
                    Aggiungi almeno un ingrediente per continuare
                </p>
            )}
        </div>
        </>
    );
}
