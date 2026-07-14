import { useState, useMemo, useEffect } from 'react';

interface DBIngredient {
    nome: string; etichetta: string;
    kcal: number; kj: number; acqua?: number;
    grassi: number; saturi: number; monoins?: number; polins?: number;
    trans?: number; colesterolo?: number;
    carboidrati: number; zuccheri: number; zuccheri_agg?: number;
    polioli?: number; amido?: number; fibre?: number;
    proteine: number; sodio_mg: number;
    potassio?: number; calcio?: number; fosforo?: number;
    magnesio?: number; ferro?: number; zinco?: number;
    vitA_eq?: number; vitD?: number; vitE?: number; vitC?: number;
    vitB1?: number; vitB2?: number; vitB3?: number;
    vitB6?: number; vitB9?: number; vitB12?: number;
    alcol?: number; eur_kg?: number;
    eritritolo?: number; acidi_organici?: number; glicerolo?: number;
    iodio?: number; rame?: number; manganese?: number; selenio?: number;
    betaCarotene?: number; retaCarotene?: number; retinolo?: number; vitA_iu?: number;
    vitK?: number; vitB5?: number;
    categoria?: string;
    fonte_dati?: string; fonte_link?: string;
    all_glutine?: string; all_grano?: string; all_crostacei?: string;
    all_uova?: string; all_pesci?: string; all_arachidi?: string;
    all_soia?: string; all_latte?: string; all_frutta_guscio?: string;
    all_anacardi?: string; all_sedano?: string; all_senape?: string; all_sesamo?: string;
    all_solfiti?: string; all_lupini?: string; all_molluschi?: string;
    cross_glutine?: string; cross_grano?: string; cross_crostacei?: string;
    cross_uova?: string; cross_pesci?: string; cross_arachidi?: string;
    cross_soia?: string; cross_latte?: string; cross_frutta_guscio?: string;
    cross_anacardi?: string; cross_sedano?: string; cross_senape?: string; cross_sesamo?: string;
    cross_solfiti?: string; cross_lupini?: string; cross_molluschi?: string;
}

interface Props {
    onClose: () => void;
    db: DBIngredient[];
    onEditIngredient: (ing: DBIngredient, isCustom: boolean) => void;
}

type MacroRow = { label: string; value: number | undefined; unit: string };
type MicroRow = { label: string; value: number | undefined; unit: string };

function fmt(v: number | undefined, dec = 1): string {
    if (v === undefined || v === null) return '';
    return v.toFixed(dec);
}

function isPresent(v: number | undefined): boolean {
    return v !== undefined && v !== null && v !== 0;
}

function ExpandedDetails({ ing }: { ing: DBIngredient }) {
    const macros: MacroRow[] = [
        { label: 'Energia', value: ing.kcal, unit: 'kcal' },
        { label: 'Energia kJ', value: ing.kj, unit: 'kJ' },
        { label: 'Acqua', value: ing.acqua, unit: 'g' },
        { label: 'Grassi totali', value: ing.grassi, unit: 'g' },
        { label: 'di cui saturi', value: ing.saturi, unit: 'g' },
        { label: 'di cui monoinsaturi', value: ing.monoins, unit: 'g' },
        { label: 'di cui polinsaturi', value: ing.polins, unit: 'g' },
        { label: 'di cui trans', value: ing.trans, unit: 'g' },
        { label: 'Colesterolo', value: ing.colesterolo, unit: 'mg' },
        { label: 'Carboidrati', value: ing.carboidrati, unit: 'g' },
        { label: 'di cui zuccheri', value: ing.zuccheri, unit: 'g' },
        { label: 'di cui zuccheri aggiunti', value: ing.zuccheri_agg, unit: 'g' },
        { label: 'Polioli', value: ing.polioli, unit: 'g' },
        { label: 'Amido', value: ing.amido, unit: 'g' },
        { label: 'Fibre', value: ing.fibre, unit: 'g' },
        { label: 'Proteine', value: ing.proteine, unit: 'g' },
        { label: 'Sale (sodio)', value: ing.sodio_mg, unit: 'mg' },
        { label: 'Alcol', value: ing.alcol, unit: 'g' },
        { label: 'Eritritolo', value: ing.eritritolo, unit: 'g' },
        { label: 'Acidi organici', value: ing.acidi_organici, unit: 'g' },
        { label: 'Glicerolo', value: ing.glicerolo, unit: 'g' },
    ];

    const micros: MicroRow[] = [
        { label: 'Potassio', value: ing.potassio, unit: 'mg' },
        { label: 'Calcio', value: ing.calcio, unit: 'mg' },
        { label: 'Fosforo', value: ing.fosforo, unit: 'mg' },
        { label: 'Magnesio', value: ing.magnesio, unit: 'mg' },
        { label: 'Ferro', value: ing.ferro, unit: 'mg' },
        { label: 'Zinco', value: ing.zinco, unit: 'mg' },
        { label: 'Iodio', value: ing.iodio, unit: 'µg' },
        { label: 'Rame', value: ing.rame, unit: 'mg' },
        { label: 'Manganese', value: ing.manganese, unit: 'mg' },
        { label: 'Selenio', value: ing.selenio, unit: 'µg' },
    ];

    const vitamine: MicroRow[] = [
        { label: 'Vit. A eq.', value: ing.vitA_eq, unit: 'µg' },
        { label: 'Beta-carotene', value: ing.betaCarotene, unit: 'µg' },
        { label: 'Retinolo', value: ing.retinolo, unit: 'µg' },
        { label: 'Vit. A (IU)', value: ing.vitA_iu, unit: 'IU' },
        { label: 'Vit. D', value: ing.vitD, unit: 'µg' },
        { label: 'Vit. E', value: ing.vitE, unit: 'mg' },
        { label: 'Vit. K', value: ing.vitK, unit: 'µg' },
        { label: 'Vit. C', value: ing.vitC, unit: 'mg' },
        { label: 'Vit. B1', value: ing.vitB1, unit: 'mg' },
        { label: 'Vit. B2', value: ing.vitB2, unit: 'mg' },
        { label: 'Vit. B3 (Niacina)', value: ing.vitB3, unit: 'mg' },
        { label: 'Vit. B5', value: ing.vitB5, unit: 'mg' },
        { label: 'Vit. B6', value: ing.vitB6, unit: 'mg' },
        { label: 'Vit. B9 (Folati)', value: ing.vitB9, unit: 'µg' },
        { label: 'Vit. B12', value: ing.vitB12, unit: 'µg' },
    ];

    const visibleMacros = macros.filter(r => isPresent(r.value));
    const visibleMicros = micros.filter(r => isPresent(r.value));
    const visibleVit = vitamine.filter(r => isPresent(r.value));

    const cellStyle: React.CSSProperties = {
        padding: '3px 0',
        fontSize: 13,
        color: 'var(--color-text)',
    };
    const labelStyle: React.CSSProperties = {
        color: 'var(--color-text-muted)',
        marginRight: 4,
    };

    const sectionTitle: React.CSSProperties = {
        fontWeight: 600,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-text-muted)',
        marginTop: 10,
        marginBottom: 4,
    };

    return (
        <div style={{ paddingTop: 10, paddingBottom: 4 }}>
            {visibleMacros.length > 0 && (
                <>
                    <div style={sectionTitle}>Macronutrienti</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0 16px' }}>
                        {visibleMacros.map(r => (
                            <div key={r.label} style={cellStyle}>
                                <span style={labelStyle}>{r.label}:</span>
                                <strong>{fmt(r.value)} {r.unit}</strong>
                            </div>
                        ))}
                    </div>
                </>
            )}
            {visibleMicros.length > 0 && (
                <>
                    <div style={sectionTitle}>Minerali</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0 16px' }}>
                        {visibleMicros.map(r => (
                            <div key={r.label} style={cellStyle}>
                                <span style={labelStyle}>{r.label}:</span>
                                <strong>{fmt(r.value)} {r.unit}</strong>
                            </div>
                        ))}
                    </div>
                </>
            )}
            {visibleVit.length > 0 && (
                <>
                    <div style={sectionTitle}>Vitamine</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0 16px' }}>
                        {visibleVit.map(r => (
                            <div key={r.label} style={cellStyle}>
                                <span style={labelStyle}>{r.label}:</span>
                                <strong>{fmt(r.value)} {r.unit}</strong>
                            </div>
                        ))}
                    </div>
                </>
            )}
            {ing.fonte_dati && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Fonte: {ing.fonte_link
                        ? <a href={ing.fonte_link} target="_blank" rel="noopener noreferrer">{ing.fonte_dati}</a>
                        : ing.fonte_dati}
                </div>
            )}
        </div>
    );
}

export function BrowseIngredientsModal({ onClose, db, onEditIngredient }: Props) {
    const [search, setSearch] = useState('');
    const [soloPersonali, setSoloPersonali] = useState(false);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = db.filter(ing => {
            if (soloPersonali && ing.categoria !== '_custom') return false;
            if (q && !ing.nome.toLowerCase().includes(q)) return false;
            return true;
        });
        list = [...list].sort((a, b) => {
            if (soloPersonali) {
                const aC = a.categoria === '_custom' ? 0 : 1;
                const bC = b.categoria === '_custom' ? 0 : 1;
                if (aC !== bC) return aC - bC;
            }
            return a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' });
        });
        return list;
    }, [db, search, soloPersonali]);

    useEffect(() => { setExpandedIdx(null); }, [search, soloPersonali]);

    function toggleExpand(idx: number) {
        setExpandedIdx(prev => (prev === idx ? null : idx));
    }

    const overlayStyle: React.CSSProperties = {
        position: 'fixed', inset: 0, zIndex: 1500,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
    };

    const cardStyle: React.CSSProperties = {
        width: '100%', maxWidth: 860,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--color-surface, #fff)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border, #e5e7eb)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        overflow: 'hidden',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border, #e5e7eb)',
        flexShrink: 0,
    };

    const toolbarStyle: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '12px 20px',
        borderBottom: '1px solid var(--color-border, #e5e7eb)',
        flexShrink: 0,
    };

    const listStyle: React.CSSProperties = {
        flex: 1, overflowY: 'auto',
        padding: '8px 12px',
    };

    const rowBaseStyle: React.CSSProperties = {
        borderRadius: 8,
        marginBottom: 4,
        border: '1px solid var(--color-border, #e5e7eb)',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s',
    };

    const rowHeaderStyle: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px',
        cursor: 'pointer',
        userSelect: 'none',
        backgroundColor: 'var(--color-surface, #fff)',
    };

    const badgeCustomStyle: React.CSSProperties = {
        fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
        backgroundColor: 'var(--color-orange, #f97316)',
        color: '#fff', whiteSpace: 'nowrap', flexShrink: 0,
    };

    const badgeDBStyle: React.CSSProperties = {
        fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
        backgroundColor: 'var(--color-border, #e5e7eb)',
        color: 'var(--color-text-muted, #6b7280)', whiteSpace: 'nowrap', flexShrink: 0,
    };

    const miniValStyle: React.CSSProperties = {
        fontSize: 12, color: 'var(--color-text-muted, #6b7280)', whiteSpace: 'nowrap',
    };

    return (
        <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-label="Sfoglia ingredienti">
            <div style={cardStyle} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={headerStyle}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>Sfoglia ingredienti DB</h2>
                    <button className="btn btn-outline" onClick={onClose} style={{ padding: '6px 12px' }}>✕ Chiudi</button>
                </div>

                {/* Toolbar */}
                <div style={toolbarStyle}>
                    <div className="form-field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
                        <input
                            type="text"
                            placeholder="Cerca ingrediente..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                            style={{ margin: 0 }}
                        />
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {filtered.length} ingredienti
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input
                            type="checkbox"
                            checked={soloPersonali}
                            onChange={e => setSoloPersonali(e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        Solo personali
                    </label>
                </div>

                {/* List */}
                <div style={listStyle}>
                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                            Nessun ingrediente trovato.
                        </div>
                    )}
                    {filtered.map((ing, idx) => {
                        const isCustom = ing.categoria === '_custom';
                        const isExpanded = expandedIdx === idx;
                        const sodioG = ing.sodio_mg != null ? (ing.sodio_mg * 2.5 / 1000) : undefined;

                        return (
                            <div key={`${idx}-${ing.nome}`} style={rowBaseStyle}>
                                <div
                                    style={{
                                        ...rowHeaderStyle,
                                        backgroundColor: isExpanded
                                            ? 'var(--color-surface-hover, #f9fafb)'
                                            : 'var(--color-surface, #fff)',
                                    }}
                                    onClick={() => toggleExpand(idx)}
                                >
                                    {/* Chevron */}
                                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0, width: 14 }}>
                                        {isExpanded ? '▼' : '▶'}
                                    </span>

                                    {/* Nome */}
                                    <span style={{ fontWeight: 500, fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ing.nome}
                                    </span>

                                    {/* Badge */}
                                    <span style={isCustom ? badgeCustomStyle : badgeDBStyle}>
                                        {isCustom ? 'Personale' : 'DB'}
                                    </span>

                                    {/* Mini valori */}
                                    <span style={miniValStyle}>
                                        {ing.kcal} kcal &nbsp;|&nbsp;
                                        G {fmt(ing.grassi)} g &nbsp;|&nbsp;
                                        C {fmt(ing.carboidrati)} g &nbsp;|&nbsp;
                                        P {fmt(ing.proteine)} g
                                        {sodioG !== undefined && <> &nbsp;|&nbsp; Sale {fmt(sodioG, 2)} g</>}
                                    </span>

                                    {/* Modifica */}
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }}
                                        onClick={e => {
                                            e.stopPropagation();
                                            onEditIngredient(ing, isCustom);
                                        }}
                                    >
                                        Modifica
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div style={{ padding: '0 16px 12px 40px', borderTop: '1px solid var(--color-border, #e5e7eb)' }}>
                                        <ExpandedDetails ing={ing} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
