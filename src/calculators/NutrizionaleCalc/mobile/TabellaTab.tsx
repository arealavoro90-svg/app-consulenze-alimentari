import React, { useState, useEffect } from 'react';
import { Settings2, Download } from 'lucide-react';
import { TabUE, DEFAULT_OPTIONALS } from '../TabUE';
import { TabUSA } from '../TabUSA';
import { TabCanada } from '../TabCanada';
import { TabAustralia } from '../TabAustralia';
import { TabArabi } from '../TabArabi';
import { NutrientSelectModal } from '../NutrientSelectModal';
import type { SelectedOptionals } from '../TabUE';
import type { CalcResult, MobileNutForm } from '../NutrizionaleCalcMobile';
import { calcClaims } from '../../../engines/nutrizionaleCalcEngine';
import { ExportOptionsModal } from '../ExportOptionsModal';
import type { ExportFormat } from '../ExportOptionsModal';

const DEFAULT_EXPORT_FORMAT: ExportFormat = { subTab: 'verticale', euSubTab: '100g', servingRef: 'serving', measure: 'g' };

type Region = 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';

interface Props {
    calcResult: CalcResult;
    form: MobileNutForm;
    onChange: (patch: Partial<MobileNutForm>) => void;
    onSave: (region: Region) => void;
    hasIngredients?: boolean;
    presentAllergens?: string[];
    crossAllergens?: string[];
    initialRegion?: Region;
}

const REGIONS: { id: Region; label: string; sub: string }[] = [
    { id: 'UE',        label: 'EU',  sub: 'Reg. 1169/2011' },
    { id: 'USA',       label: 'USA', sub: 'FDA NFP'        },
    { id: 'Canada',    label: 'CA',  sub: 'Health Canada'  },
    { id: 'Australia', label: 'AU',  sub: 'FSANZ'          },
    { id: 'Arabi',     label: 'AR',  sub: 'Gulf Standard'  },
];

function nf(v: string): number { const x = parseFloat(v); return isNaN(x) ? 0 : x; }

// ─── Serving field with grid layout ──────────────────────────────────────────
function ServingField({ label, field, form, onChange }: {
    label: string;
    field: keyof MobileNutForm;
    form: MobileNutForm;
    onChange: (p: Partial<MobileNutForm>) => void;
}) {
    return (
        <div className="m-serving-field">
            <label className="m-serving-field__label">{label}</label>
            <input
                className="m-input m-input--num"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="—"
                value={form[field] as string}
                onChange={e => onChange({ [field]: e.target.value } as Partial<MobileNutForm>)}
            />
        </div>
    );
}

// ─── Table preview wrapper ────────────────────────────────────────────────────
function TablePreviewWrap({
    layout, children, onNutrients,
}: {
    layout: string;
    children: React.ReactNode;
    onNutrients?: () => void;
}) {
    const isWide = layout === 'orizzontale' || layout === 'lineare';
    return (
        <div style={{ padding: '0 16px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, minHeight: onNutrients || isWide ? 24 : 0 }}>
                {isWide ? (
                    <span style={{ fontSize: 10, color: 'var(--m-text-muted)', fontStyle: 'italic' }}>
                        Scorri lateralmente per vedere tutta la tabella
                    </span>
                ) : <span />}
                {onNutrients && (
                    <button
                        type="button"
                        onClick={onNutrients}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            background: 'none', border: '1px solid var(--m-border)',
                            borderRadius: 6, padding: '3px 8px',
                            fontSize: 11, color: 'var(--m-text-muted)', cursor: 'pointer',
                        }}
                    >
                        <Settings2 size={11} /> Nutrienti
                    </button>
                )}
            </div>
            {/* Fix centering: scroll container blocco, inner flex centra senza rompere lo scroll a sinistra */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <div style={{ display: 'flex', justifyContent: 'center', minWidth: 'fit-content' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

// ─── Sezione porzioni smart (M4) ──────────────────────────────────────────────
// Primi 2 campi sempre visibili; il resto dietro "+ Altri formati".
// ponytail: remount su cambio regione (key sul blocco padre) ricalcola lo stato iniziale.
function ServingSection({ title, fields, form, onChange, open, onToggle }: {
    title: string;
    fields: { label: string; field: keyof MobileNutForm }[];
    form: MobileNutForm;
    onChange: (p: Partial<MobileNutForm>) => void;
    open: boolean;
    onToggle: () => void;
}) {
    const extras = fields.slice(2);
    const hasExtraValue = extras.some(f => nf(form[f.field] as string) > 0);
    const [extraOpen, setExtraOpen] = useState(hasExtraValue);
    const showExtra = extraOpen || hasExtraValue;

    return (
        <div className="m-section">
            <div className="m-section__header" onClick={onToggle} style={{ cursor: 'pointer' }}>
                <div className="m-section__line" />
                <span className="m-section__title">{title}</span>
                <span style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 14 }}>▾</span>
                <div className="m-section__line" />
            </div>
            <div className={`m-collapsible${open ? '' : ' m-collapsible--closed'}`}>
                <div className="m-serving-grid" style={{ padding: '8px 16px' }}>
                    {fields.slice(0, 2).map(f => (
                        <ServingField key={f.field} label={f.label} field={f.field} form={form} onChange={onChange} />
                    ))}
                    {showExtra && extras.map(f => (
                        <ServingField key={f.field} label={f.label} field={f.field} form={form} onChange={onChange} />
                    ))}
                </div>
                {extras.length > 0 && !hasExtraValue && (
                    <button
                        type="button"
                        onClick={() => setExtraOpen(o => !o)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 12, color: 'var(--m-orange, #ff7e2e)', fontWeight: 600,
                            padding: '0 16px 8px',
                        }}
                    >
                        {showExtra ? '− Meno formati' : `+ Altri formati (${extras.map(e => e.label.split(' ')[0]).join(', ')})`}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TabellaTab({ calcResult, form, onChange, onSave, hasIngredients, presentAllergens = [], crossAllergens = [], initialRegion }: Props) {
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(initialRegion ?? null);
    useEffect(() => { if (initialRegion) setSelectedRegion(initialRegion); }, [initialRegion]);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // EU: nutrienti facoltativi mostrati — persistente, non è formato di export (come desktop)
    const [selectedOptionals, setSelectedOptionals] = useState<SelectedOptionals>({ ...DEFAULT_OPTIONALS });
    const [nutrientModalOpen, setNutrientModalOpen] = useState(false);

    // Anteprima principale sempre fissa (verticale/100g/serving/g) come nel desktop —
    // le scelte di formato e la cattura PNG vivono dentro ExportOptionsModal.
    const [exportModalOpen, setExportModalOpen] = useState(false);

    // Key to trigger M3 animation (table appear) on region change
    const [tableKey, setTableKey] = useState(0);

    // Collapsible serving section
    const [servingOpen, setServingOpen] = useState(true);
    const [isLiquid, setIsLiquid] = useState(false);

    // Save button flash state (M8)
    const [saveFlash, setSaveFlash] = useState(false);

    const hasData = (hasIngredients ?? false) || calcResult.energyKcal > 0 || calcResult.proteine > 0 || calcResult.grassi > 0;
    const sg = nf(form.specificGravity);

    const showNotice = (type: 'success' | 'error', msg: string) => {
        setNotice({ type, msg });
        setTimeout(() => setNotice(null), 3000);
    };

    const handleSave = () => {
        if (!selectedRegion) { showNotice('error', 'Seleziona prima una regione.'); return; }
        if (!form.denominazione.trim()) { showNotice('error', 'Inserisci la denominazione nella scheda Ricetta.'); return; }
        if (!hasIngredients) { showNotice('error', 'Aggiungi almeno un ingrediente prima di salvare.'); return; }
        const porzione = nf(form.ue_porzione || form.porzione_g);
        if (porzione <= 0) { showNotice('error', 'Imposta una porzione valida (> 0 g).'); return; }
        onSave(selectedRegion);
        showNotice('success', 'Calcolo salvato in archivio.');
        setSaveFlash(true);
        setTimeout(() => setSaveFlash(false), 450);
    };

    const handleExport = () => {
        if (!selectedRegion) { showNotice('error', 'Seleziona prima una regione.'); return; }
        setExportModalOpen(true);
    };

    // ─── Serving size objects for each region ───────────────────────────────
    const ue = {
        porzione: nf(form.ue_porzione) || nf(form.porzione_g) || undefined,
        confezione: nf(form.ue_confezione) || undefined,
        pezzo: nf(form.ue_pezzo) || undefined,
    };
    const usa = {
        serving: nf(form.usa_serving) || nf(form.porzione_g) || undefined,
        confezione: nf(form.usa_confezione) || undefined,
        cup: nf(form.usa_cup) || undefined,
        cucchiaio: nf(form.usa_cucchiaio) || undefined,
        pezzo: nf(form.usa_pezzo) || undefined,
    };
    const ca = {
        serving: nf(form.ca_serving) || nf(form.porzione_g) || undefined,
        confezione: nf(form.ca_confezione) || undefined,
        cup: nf(form.ca_cup) || undefined,
        cucchiaio: nf(form.ca_cucchiaio) || undefined,
        pezzo: nf(form.ca_pezzo) || undefined,
    };
    const au = {
        serving: nf(form.au_serving) || nf(form.porzione_g) || undefined,
        confezione: nf(form.au_confezione) || undefined,
        pezzo: nf(form.au_pezzo) || undefined,
    };
    const arabi = {
        serving: nf(form.arabi_serving) || nf(form.porzione_g) || undefined,
        confezione: nf(form.arabi_confezione) || undefined,
        cup: nf(form.arabi_cup) || undefined,
        cucchiaio: nf(form.arabi_cucchiaio) || undefined,
        pezzo: nf(form.arabi_pezzo) || undefined,
    };

    // Nota: niente guard-effect su riferimento/unità/layout — vivono solo dentro
    // ExportOptionsModal (stato locale, reset ad ogni apertura), le opzioni non
    // disponibili sono semplicemente disabled lì.

    // ─── Formato anteprima principale: sempre fisso (come desktop) ──
    const fmt = DEFAULT_EXPORT_FORMAT;

    // Anteprima nel modal export — stessa struttura di renderDownloadPreview desktop.
    const renderExportPreview = (f: ExportFormat): React.ReactNode => {
        switch (selectedRegion) {
            case 'UE':
                return <TabUE p={calcResult as Parameters<typeof TabUE>[0]['p']} ue={ue} specificGravity={sg > 0 ? sg : undefined}
                    selectedOptionals={selectedOptionals} showOptionals={true} activeSubTab={f.euSubTab} />;
            case 'USA':
                return <TabUSA p={calcResult as Parameters<typeof TabUSA>[0]['p']} usa={usa} specificGravity={sg > 0 ? sg : 1}
                    servingRef={f.servingRef} measure={f.measure} subTab={f.subTab} />;
            case 'Canada':
                return <TabCanada p={calcResult} ca={ca} servingRef={f.servingRef} measure={f.measure} subTab={f.subTab} />;
            case 'Australia':
                return <TabAustralia p={calcResult} au={au} />;
            case 'Arabi':
                return <TabArabi p={calcResult} arabi={arabi} servingRef={f.servingRef} measure={f.measure}
                    specificGravity={sg > 0 ? sg : undefined} />;
            default:
                return null;
        }
    };

    // flex '1 0 auto' (shrink 0, NO minHeight:0): il root cresce col contenuto e scrolla
    // nel panel — con minHeight:0 flexbox schiacciava la barra chip a zero appena la
    // tabella la superava in altezza (bug "le chip spariscono selezionando un paese").
    return (
        <div style={{ paddingTop: 8, paddingBottom: 0, flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}>

            {/* ── Region chip bar ─────────────────────────────────────────── */}
            <div className="m-region-tabs">
                {REGIONS.map(r => {
                    const isActive = selectedRegion === r.id;
                    return (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                                setSelectedRegion(r.id);
                                setTableKey(k => k + 1);
                                setServingOpen(true);
                            }}
                            aria-pressed={isActive}
                            aria-label={r.sub ? `${r.label} — ${r.sub}` : r.label}
                            title={r.sub}
                            className={isActive ? 'm-region-tab m-region-tab--active' : 'm-region-tab'}
                        >
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{r.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* No data warning */}
            {!hasData && (
                <div className="m-notice m-notice--error" style={{ margin: '0 16px 12px' }}>
                    Aggiungi almeno un ingrediente nella scheda Ricetta prima di generare la tabella.
                </div>
            )}

            {/* Feedback notice */}
            {notice && (
                <div className={`m-notice m-notice--${notice.type}`}>
                    {notice.msg}
                </div>
            )}

            {/* ─── Region configurators + table preview ─────────────────── */}
            {selectedRegion && hasData && (
                <>
                    {/* ── UE ───────────────────────────────────────────────── */}
                    {selectedRegion === 'UE' && (
                        <div key={`UE-${tableKey}`} className="m-market-enter">
                            <ServingSection
                                title="Porzioni EU"
                                fields={[
                                    { label: 'Porzione (g)', field: 'ue_porzione' },
                                    { label: 'Confezione (g)', field: 'ue_confezione' },
                                    { label: 'Pezzo (g)', field: 'ue_pezzo' },
                                ]}
                                form={form} onChange={onChange}
                                open={servingOpen} onToggle={() => setServingOpen(o => !o)}
                            />
                            {/* EU table — sempre per 100g in anteprima, altre viste solo in esportazione */}
                            <TablePreviewWrap layout="verticale" onNutrients={() => setNutrientModalOpen(true)}>
                                <div key={`tbl-UE-${fmt.euSubTab}`} className="m-table-appear">
                                    <TabUE
                                        p={calcResult as Parameters<typeof TabUE>[0]['p']}
                                        ue={ue}
                                        specificGravity={sg > 0 ? sg : undefined}
                                        selectedOptionals={selectedOptionals}
                                        showOptionals={true}
                                        activeSubTab={fmt.euSubTab}
                                    />
                                </div>
                            </TablePreviewWrap>
                            {/* ── Claim nutrizionali EU (Reg. 2006/1924) ──── */}
                            {(() => {
                                const claims = calcClaims(calcResult as Parameters<typeof calcClaims>[0], isLiquid);
                                return (
                                    <div style={{ padding: '12px 16px 0', borderTop: '1px solid #eaecf0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600 }}>Claim nutrizionali EU</span>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', color: 'var(--m-text-muted)' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isLiquid}
                                                    onChange={e => setIsLiquid(e.target.checked)}
                                                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--m-orange, #ff7e2e)' }}
                                                />
                                                Prodotto liquido
                                            </label>
                                        </div>
                                        {claims.length === 0 ? (
                                            <p style={{ fontSize: 11, color: 'var(--m-text-muted)', fontStyle: 'italic', margin: 0 }}>
                                                Nessun claim applicabile.
                                            </p>
                                        ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {claims.map(c => (
                                                    <span key={c} style={{
                                                        fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                                                        background: 'var(--m-navy)', color: '#fff',
                                                        borderRadius: 5, padding: '4px 8px',
                                                    }}>
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <p style={{ fontSize: 10, color: 'var(--m-text-muted)', margin: '6px 0 8px', lineHeight: 1.4 }}>
                                            Reg. 2006/1924 — verificare con consulente prima di apporli in etichetta.
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ── USA ──────────────────────────────────────────────── */}
                    {selectedRegion === 'USA' && (
                        <div key={`USA-${tableKey}`} className="m-market-enter">
                            <ServingSection
                                title="Porzioni USA"
                                fields={[
                                    { label: 'Serving (g)', field: 'usa_serving' },
                                    { label: 'Confezione (g)', field: 'usa_confezione' },
                                    { label: 'Cup (g)', field: 'usa_cup' },
                                    { label: 'Cucchiaio (g)', field: 'usa_cucchiaio' },
                                    { label: 'Pezzo (g)', field: 'usa_pezzo' },
                                ]}
                                form={form} onChange={onChange}
                                open={servingOpen} onToggle={() => setServingOpen(o => !o)}
                            />
                            {/* Layout/riferimento/unità: solo in esportazione (ExportOptionsModal), anteprima sempre verticale/g/serving */}
                            <TablePreviewWrap layout="verticale" >
                                <div key={`tbl-USA-${fmt.subTab}-${fmt.servingRef}-${fmt.measure}`} className="m-table-appear">
                                    <TabUSA
                                        p={calcResult as Parameters<typeof TabUSA>[0]['p']}
                                        usa={usa}
                                        specificGravity={sg > 0 ? sg : 1}
                                        servingRef={fmt.servingRef}
                                        measure={fmt.measure}
                                        subTab={fmt.subTab}
                                    />
                                </div>
                            </TablePreviewWrap>
                        </div>
                    )}

                    {/* ── Canada ───────────────────────────────────────────── */}
                    {selectedRegion === 'Canada' && (
                        <div key={`Canada-${tableKey}`} className="m-market-enter">
                            <ServingSection
                                title="Porzioni Canada"
                                fields={[
                                    { label: 'Serving (g)', field: 'ca_serving' },
                                    { label: 'Confezione (g)', field: 'ca_confezione' },
                                    { label: 'Cup (g, 250ml)', field: 'ca_cup' },
                                    { label: 'Cucchiaio (g)', field: 'ca_cucchiaio' },
                                    { label: 'Pezzo (g)', field: 'ca_pezzo' },
                                ]}
                                form={form} onChange={onChange}
                                open={servingOpen} onToggle={() => setServingOpen(o => !o)}
                            />
                            {/* Layout/riferimento/unità: solo in esportazione (ExportOptionsModal), anteprima sempre verticale/g/serving */}
                            <TablePreviewWrap layout="verticale" >
                                <div key={`tbl-Canada-${fmt.subTab}-${fmt.servingRef}-${fmt.measure}`} className="m-table-appear">
                                    <TabCanada
                                        p={calcResult}
                                        ca={ca}
                                        servingRef={fmt.servingRef}
                                        measure={fmt.measure}
                                        subTab={fmt.subTab}
                                    />
                                </div>
                            </TablePreviewWrap>
                        </div>
                    )}

                    {/* ── Australia ────────────────────────────────────────── */}
                    {selectedRegion === 'Australia' && (
                        <div key={`Australia-${tableKey}`} className="m-market-enter">
                            <ServingSection
                                title="Porzioni Australia"
                                fields={[
                                    { label: 'Serving (g)', field: 'au_serving' },
                                    { label: 'Confezione (g)', field: 'au_confezione' },
                                    { label: 'Pezzo (g)', field: 'au_pezzo' },
                                ]}
                                form={form} onChange={onChange}
                                open={servingOpen} onToggle={() => setServingOpen(o => !o)}
                            />
                            <TablePreviewWrap layout="verticale" >
                                <div key={`tbl-Australia`} className="m-table-appear">
                                    <TabAustralia p={calcResult} au={au} />
                                </div>
                            </TablePreviewWrap>
                        </div>
                    )}

                    {/* ── Arabi ────────────────────────────────────────────── */}
                    {selectedRegion === 'Arabi' && (
                        <div key={`Arabi-${tableKey}`} className="m-market-enter">
                            <ServingSection
                                title="Porzioni Gulf/Arabi"
                                fields={[
                                    { label: 'Serving (g)', field: 'arabi_serving' },
                                    { label: 'Confezione (g)', field: 'arabi_confezione' },
                                    { label: 'Cup (g, 240ml)', field: 'arabi_cup' },
                                    { label: 'Cucchiaio (g)', field: 'arabi_cucchiaio' },
                                    { label: 'Pezzo (g)', field: 'arabi_pezzo' },
                                ]}
                                form={form} onChange={onChange}
                                open={servingOpen} onToggle={() => setServingOpen(o => !o)}
                            />
                            {/* Riferimento/unità: solo in esportazione (ExportOptionsModal), anteprima sempre serving/g */}
                            <TablePreviewWrap layout="verticale" >
                                <div key={`tbl-Arabi-${fmt.servingRef}-${fmt.measure}`} className="m-table-appear">
                                    <TabArabi
                                        p={calcResult}
                                        arabi={arabi}
                                        servingRef={fmt.servingRef}
                                        measure={fmt.measure}
                                        specificGravity={sg > 0 ? sg : undefined}
                                    />
                                </div>
                            </TablePreviewWrap>
                        </div>
                    )}
                </>
            )}

            {/* ─── Sticky CTA bar ─────────────────────────────────────────── */}
            <div className="m-cta-bar">
                <button
                    type="button"
                    className={`m-btn m-btn--primary${saveFlash ? ' m-btn--saved' : ''}`}
                    style={{ flex: 1 }}
                    onClick={handleSave}
                >
                    {saveFlash ? '✓ Salvato' : 'Salva'}
                </button>
                <button
                    type="button"
                    className="m-btn m-btn--accent"
                    style={{ flex: 1 }}
                    onClick={handleExport}
                >
                    <Download size={14} /> Scarica
                </button>
            </div>

            {/* Nutrient select modal */}
            <NutrientSelectModal
                open={nutrientModalOpen}
                onClose={() => setNutrientModalOpen(false)}
                selected={selectedOptionals}
                onChange={setSelectedOptionals}
            />

            {/* Opzioni esportazione — sempre aperta al tap su "Scarica PNG", come nel desktop */}
            {exportModalOpen && selectedRegion && (
                <ExportOptionsModal
                    region={selectedRegion}
                    showLayout={selectedRegion === 'USA' || selectedRegion === 'Canada'}
                    showColonne={selectedRegion === 'UE' && (ue.porzione != null || ue.confezione != null || ue.pezzo != null)}
                    showRiferimento={selectedRegion === 'USA' || selectedRegion === 'Canada' || selectedRegion === 'Arabi'}
                    showUnita={selectedRegion === 'USA' || selectedRegion === 'Canada' || selectedRegion === 'Arabi'}
                    ue={ue}
                    nation={selectedRegion === 'USA' ? usa : selectedRegion === 'Canada' ? ca : selectedRegion === 'Arabi' ? arabi : {}}
                    productName={form.denominazione}
                    renderPreview={renderExportPreview}
                    onClose={() => setExportModalOpen(false)}
                />
            )}
        </div>
    );
}
