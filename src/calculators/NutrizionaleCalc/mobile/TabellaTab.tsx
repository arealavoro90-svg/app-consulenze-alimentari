import React, { useState, useEffect } from 'react';
import { Settings2, X, Maximize2, Download } from 'lucide-react';
import { TabUE, DEFAULT_OPTIONALS } from '../TabUE';
import { TabUSA } from '../TabUSA';
import { TabCanada } from '../TabCanada';
import { TabAustralia } from '../TabAustralia';
import { TabArabi } from '../TabArabi';
import { NutrientSelectModal } from '../NutrientSelectModal';
import type { EUSubTab, SelectedOptionals } from '../TabUE';
import type { USAServingRef, USAMeasure } from '../TabUSA';
import type { CalcResult, MobileNutForm } from '../NutrizionaleCalcMobile';
import { calcClaims } from '../../../engines/nutrizionaleCalcEngine';

type Region = 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';
type SubTab = 'verticale' | 'orizzontale' | 'lineare';

interface Props {
    calcResult: CalcResult;
    form: MobileNutForm;
    onChange: (patch: Partial<MobileNutForm>) => void;
    onSave: (region: Region) => void;
    onExportPDF: (region: Region) => void;
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

// ─── Segmented control (44px touch targets) ───────────────────────────────────
// inline: label + chips su una riga sola (M2). disabled: opzione spenta finché manca il peso (M3).
function SegmentedControl<T extends string>({
    label,
    options,
    value,
    onChange,
    inline = false,
}: {
    label: string;
    options: { v: T; label: string; disabled?: boolean }[];
    value: T;
    onChange: (v: T) => void;
    inline?: boolean;
}) {
    return (
        <div style={inline
            ? { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
            : { marginBottom: 10 }}>
            <span className="m-segmented__label" style={inline ? { marginBottom: 0, flexShrink: 0 } : undefined}>{label}</span>
            <div className="m-segmented">
                {options.map(o => (
                    <button
                        key={o.v}
                        type="button"
                        disabled={o.disabled}
                        className={`m-segmented__btn${value === o.v ? ' m-segmented__btn--active' : ''}`}
                        title={o.disabled ? 'Inserisci prima il peso corrispondente nelle porzioni' : undefined}
                        onClick={() => onChange(o.v)}
                        aria-pressed={value === o.v}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

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

// ─── Table preview wrapper — always visible, no scaling ──────────────────────
// La preview inline mostra il formato reale selezionato (scroll orizzontale se largo).
function TablePreviewWrap({
    layout, children, onExpand,
}: {
    layout: string;
    children: React.ReactNode;
    onExpand: () => void;
}) {
    const isWide = layout === 'orizzontale' || layout === 'lineare';
    return (
        <div style={{ padding: '0 16px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                {isWide ? (
                    <span style={{ fontSize: 10, color: 'var(--m-text-muted)', fontStyle: 'italic' }}>
                        Scorri lateralmente per vedere tutta la tabella
                    </span>
                ) : (
                    <span />
                )}
                <button
                    type="button"
                    className="m-expand-btn"
                    onClick={onExpand}
                >
                    <Maximize2 size={13} /> Schermo intero
                </button>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {children}
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

function FullscreenOverlay({
    open, exiting, region, layout, onClose, children,
}: {
    open: boolean;
    exiting: boolean;
    region: string;
    layout: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    React.useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className={`m-fullscreen-overlay ${exiting ? 'm-fullscreen-exit' : 'm-fullscreen-enter'}`}>
            <div className="m-fullscreen-overlay__header">
                <span className="m-fullscreen-overlay__title">
                    {region}{layout && layout !== 'default' ? ` — ${layout}` : ''}
                </span>
                <button type="button" className="m-fullscreen-overlay__close" onClick={onClose} aria-label="Chiudi">
                    <X size={20} />
                </button>
            </div>
            <div className="m-fullscreen-overlay__body">
                {children}
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TabellaTab({ calcResult, form, onChange, onSave, onExportPDF, hasIngredients, presentAllergens = [], crossAllergens = [], initialRegion }: Props) {
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(initialRegion ?? null);
    useEffect(() => { if (initialRegion) setSelectedRegion(initialRegion); }, [initialRegion]);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // EU display options
    const [euSubTab, setEuSubTab] = useState<EUSubTab>('100g');
    const [selectedOptionals, setSelectedOptionals] = useState<SelectedOptionals>({ ...DEFAULT_OPTIONALS });
    const [nutrientModalOpen, setNutrientModalOpen] = useState(false);

    // USA display options
    const [usaSubTab, setUsaSubTab] = useState<SubTab>('verticale');
    const [usaMeasure, setUsaMeasure] = useState<USAMeasure>('g');
    const [usaServingRef, setUsaServingRef] = useState<USAServingRef>('serving');

    // Canada display options
    const [caSubTab, setCaSubTab] = useState<SubTab>('verticale');
    const [caMeasure, setCaMeasure] = useState<USAMeasure>('g');
    const [caServingRef, setCaServingRef] = useState<USAServingRef>('serving');

    // Arabi display options
    const [arabiServingRef, setArabiServingRef] = useState<USAServingRef>('serving');
    const [arabiMeasure, setArabiMeasure] = useState<USAMeasure>('g');

    // Fullscreen overlay
    const [fullscreenOpen, setFullscreenOpen] = useState(false);
    const [fullscreenExiting, setFullscreenExiting] = useState(false);

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

    const closeFullscreen = () => {
        setFullscreenExiting(true);
        setTimeout(() => {
            setFullscreenOpen(false);
            setFullscreenExiting(false);
        }, 200);
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

    const handlePDF = () => {
        if (!selectedRegion) { showNotice('error', 'Seleziona prima una regione.'); return; }
        onExportPDF(selectedRegion);
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

    // ─── Guard: se il peso di riferimento viene rimosso, torna al default ───
    // (stesso pattern del desktop per euSubTab)
    React.useEffect(() => {
        if (euSubTab === 'porzione' && !ue.porzione) setEuSubTab('100g');
        if (euSubTab === 'uv' && !ue.confezione) setEuSubTab('100g');
        if (euSubTab === 'pezzo' && !ue.pezzo) setEuSubTab('100g');
    }, [euSubTab, ue.porzione, ue.confezione, ue.pezzo]);
    React.useEffect(() => {
        if (usaServingRef === 'confezione' && !usa.confezione) setUsaServingRef('serving');
        if ((usaMeasure === 'tazze' && !usa.cup) || (usaMeasure === 'cucchiai' && !usa.cucchiaio) || (usaMeasure === 'pezzi' && !usa.pezzo)) setUsaMeasure('g');
    }, [usaServingRef, usaMeasure, usa.confezione, usa.cup, usa.cucchiaio, usa.pezzo]);
    React.useEffect(() => {
        if (caServingRef === 'confezione' && !ca.confezione) setCaServingRef('serving');
        if ((caMeasure === 'tazze' && !ca.cup) || (caMeasure === 'cucchiai' && !ca.cucchiaio) || (caMeasure === 'pezzi' && !ca.pezzo)) setCaMeasure('g');
    }, [caServingRef, caMeasure, ca.confezione, ca.cup, ca.cucchiaio, ca.pezzo]);
    React.useEffect(() => {
        if (arabiServingRef === 'confezione' && !arabi.confezione) setArabiServingRef('serving');
        if ((arabiMeasure === 'tazze' && !arabi.cup) || (arabiMeasure === 'cucchiai' && !arabi.cucchiaio) || (arabiMeasure === 'pezzi' && !arabi.pezzo)) setArabiMeasure('g');
    }, [arabiServingRef, arabiMeasure, arabi.confezione, arabi.cup, arabi.cucchiaio, arabi.pezzo]);

    return (
        <div style={{ paddingTop: 8, paddingBottom: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

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
                            className={isActive ? 'm-region-tab m-region-tab--active' : 'm-region-tab'}
                        >
                            <span style={{ fontSize: 13, fontWeight: 800 }}>{r.label}</span>
                            {r.sub && <span style={{ fontSize: 9, marginTop: 1 }}>{r.sub}</span>}
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
                            {/* EU sub-tab selector + nutrienti button */}
                            <div style={{ padding: '0 16px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <SegmentedControl<EUSubTab>
                                        label="Vista tabella:"
                                        inline
                                        options={[
                                            { v: '100g', label: 'per 100g' },
                                            { v: 'porzione', label: 'Porzione', disabled: !ue.porzione },
                                            { v: 'uv', label: 'Confezione', disabled: !ue.confezione },
                                            { v: 'pezzo', label: 'Pezzo', disabled: !ue.pezzo },
                                        ]}
                                        value={euSubTab}
                                        onChange={setEuSubTab}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setNutrientModalOpen(true)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            background: 'none', border: '1px solid var(--m-orange, #ff7e2e)',
                                            borderRadius: 20, padding: '3px 10px',
                                            fontSize: 11, color: 'var(--m-orange, #ff7e2e)', cursor: 'pointer',
                                        }}
                                    >
                                        <Settings2 size={11} /> Nutrienti
                                    </button>
                                </div>
                            </div>
                            {/* EU table */}
                            <TablePreviewWrap layout={euSubTab} onExpand={() => setFullscreenOpen(true)}>
                                <div key={`tbl-UE-${euSubTab}`} className="m-table-appear">
                                    <TabUE
                                        p={calcResult as Parameters<typeof TabUE>[0]['p']}
                                        ue={ue}
                                        specificGravity={sg > 0 ? sg : undefined}
                                        selectedOptionals={selectedOptionals}
                                        showOptionals={true}
                                        activeSubTab={euSubTab}
                                    />
                                </div>
                            </TablePreviewWrap>
                            <FullscreenOverlay
                                open={fullscreenOpen}
                                exiting={fullscreenExiting}
                                region="EU"
                                layout={euSubTab}
                                onClose={closeFullscreen}
                            >
                                <TabUE
                                    p={calcResult as Parameters<typeof TabUE>[0]['p']}
                                    ue={ue}
                                    specificGravity={sg > 0 ? sg : undefined}
                                    selectedOptionals={selectedOptionals}
                                    showOptionals={true}
                                    activeSubTab={euSubTab}
                                />
                            </FullscreenOverlay>
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
                            <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 10, rowGap: 8 }}>
                                <SegmentedControl<SubTab>
                                    label="Layout:"
                                    inline
                                    options={[
                                        { v: 'verticale', label: 'Verticale' },
                                        { v: 'orizzontale', label: 'Orizzontale' },
                                        { v: 'lineare', label: 'Lineare' },
                                    ]}
                                    value={usaSubTab}
                                    onChange={setUsaSubTab}
                                />
                                <SegmentedControl<USAServingRef>
                                    label="Riferimento:"
                                    inline
                                    options={[
                                        { v: 'serving', label: 'Porzione' },
                                        { v: 'confezione', label: 'Confezione', disabled: !usa.confezione },
                                    ]}
                                    value={usaServingRef}
                                    onChange={setUsaServingRef}
                                />
                                <SegmentedControl<USAMeasure>
                                    label="Unità:"
                                    inline
                                    options={[
                                        { v: 'g', label: 'g' },
                                        { v: 'tazze', label: 'Tazze', disabled: !usa.cup },
                                        { v: 'cucchiai', label: 'Cucchiai', disabled: !usa.cucchiaio },
                                        { v: 'pezzi', label: 'Pezzi', disabled: !usa.pezzo },
                                    ]}
                                    value={usaMeasure}
                                    onChange={setUsaMeasure}
                                />
                            </div>
                            <TablePreviewWrap layout={usaSubTab} onExpand={() => setFullscreenOpen(true)}>
                                <div key={`tbl-USA-${usaSubTab}-${usaServingRef}-${usaMeasure}`} className="m-table-appear">
                                    <TabUSA
                                        p={calcResult as Parameters<typeof TabUSA>[0]['p']}
                                        usa={usa}
                                        specificGravity={sg > 0 ? sg : 1}
                                        servingRef={usaServingRef}
                                        measure={usaMeasure}
                                        subTab={usaSubTab}
                                    />
                                </div>
                            </TablePreviewWrap>
                            <FullscreenOverlay
                                open={fullscreenOpen}
                                exiting={fullscreenExiting}
                                region="USA"
                                layout={usaSubTab}
                                onClose={closeFullscreen}
                            >
                                <SegmentedControl<SubTab>
                                    label="Layout:"
                                    options={[
                                        { v: 'verticale', label: 'Verticale' },
                                        { v: 'orizzontale', label: 'Orizzontale' },
                                        { v: 'lineare', label: 'Lineare' },
                                    ]}
                                    value={usaSubTab}
                                    onChange={setUsaSubTab}
                                />
                                <TabUSA
                                    p={calcResult as Parameters<typeof TabUSA>[0]['p']}
                                    usa={usa}
                                    specificGravity={sg > 0 ? sg : 1}
                                    servingRef={usaServingRef}
                                    measure={usaMeasure}
                                    subTab={usaSubTab}
                                />
                            </FullscreenOverlay>
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
                            <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 10, rowGap: 8 }}>
                                <SegmentedControl<SubTab>
                                    label="Layout:"
                                    inline
                                    options={[
                                        { v: 'verticale', label: 'Verticale' },
                                        { v: 'orizzontale', label: 'Orizzontale' },
                                        { v: 'lineare', label: 'Lineare' },
                                    ]}
                                    value={caSubTab}
                                    onChange={setCaSubTab}
                                />
                                <SegmentedControl<USAServingRef>
                                    label="Riferimento:"
                                    inline
                                    options={[
                                        { v: 'serving', label: 'Porzione' },
                                        { v: 'confezione', label: 'Confezione', disabled: !ca.confezione },
                                    ]}
                                    value={caServingRef}
                                    onChange={setCaServingRef}
                                />
                                <SegmentedControl<USAMeasure>
                                    label="Unità:"
                                    inline
                                    options={[
                                        { v: 'g', label: 'g' },
                                        { v: 'tazze', label: 'Tazze', disabled: !ca.cup },
                                        { v: 'cucchiai', label: 'Cucchiai', disabled: !ca.cucchiaio },
                                        { v: 'pezzi', label: 'Pezzi', disabled: !ca.pezzo },
                                    ]}
                                    value={caMeasure}
                                    onChange={setCaMeasure}
                                />
                            </div>
                            <TablePreviewWrap layout={caSubTab} onExpand={() => setFullscreenOpen(true)}>
                                <div key={`tbl-Canada-${caSubTab}-${caServingRef}-${caMeasure}`} className="m-table-appear">
                                    <TabCanada
                                        p={calcResult}
                                        ca={ca}
                                        servingRef={caServingRef}
                                        measure={caMeasure}
                                        subTab={caSubTab}
                                    />
                                </div>
                            </TablePreviewWrap>
                            <FullscreenOverlay
                                open={fullscreenOpen}
                                exiting={fullscreenExiting}
                                region="Canada"
                                layout={caSubTab}
                                onClose={closeFullscreen}
                            >
                                <SegmentedControl<SubTab>
                                    label="Layout:"
                                    options={[
                                        { v: 'verticale', label: 'Verticale' },
                                        { v: 'orizzontale', label: 'Orizzontale' },
                                        { v: 'lineare', label: 'Lineare' },
                                    ]}
                                    value={caSubTab}
                                    onChange={setCaSubTab}
                                />
                                <TabCanada
                                    p={calcResult}
                                    ca={ca}
                                    servingRef={caServingRef}
                                    measure={caMeasure}
                                    subTab={caSubTab}
                                />
                            </FullscreenOverlay>
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
                            <TablePreviewWrap layout="verticale" onExpand={() => setFullscreenOpen(true)}>
                                <div key={`tbl-Australia`} className="m-table-appear">
                                    <TabAustralia p={calcResult} au={au} />
                                </div>
                            </TablePreviewWrap>
                            <FullscreenOverlay
                                open={fullscreenOpen}
                                exiting={fullscreenExiting}
                                region="Australia"
                                layout="default"
                                onClose={closeFullscreen}
                            >
                                <TabAustralia p={calcResult} au={au} />
                            </FullscreenOverlay>
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
                            <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 10, rowGap: 8 }}>
                                <SegmentedControl<USAServingRef>
                                    label="Riferimento:"
                                    inline
                                    options={[
                                        { v: 'serving', label: 'Porzione' },
                                        { v: 'confezione', label: 'Confezione', disabled: !arabi.confezione },
                                    ]}
                                    value={arabiServingRef}
                                    onChange={setArabiServingRef}
                                />
                                <SegmentedControl<USAMeasure>
                                    label="Unità:"
                                    inline
                                    options={[
                                        { v: 'g', label: 'g' },
                                        { v: 'tazze', label: 'Tazze', disabled: !arabi.cup },
                                        { v: 'cucchiai', label: 'Cucchiai', disabled: !arabi.cucchiaio },
                                        { v: 'pezzi', label: 'Pezzi', disabled: !arabi.pezzo },
                                    ]}
                                    value={arabiMeasure}
                                    onChange={setArabiMeasure}
                                />
                            </div>
                            <TablePreviewWrap layout="verticale" onExpand={() => setFullscreenOpen(true)}>
                                <div key={`tbl-Arabi-${arabiServingRef}-${arabiMeasure}`} className="m-table-appear">
                                    <TabArabi
                                        p={calcResult}
                                        arabi={arabi}
                                        servingRef={arabiServingRef}
                                        measure={arabiMeasure}
                                        specificGravity={sg > 0 ? sg : undefined}
                                    />
                                </div>
                            </TablePreviewWrap>
                            <FullscreenOverlay
                                open={fullscreenOpen}
                                exiting={fullscreenExiting}
                                region="Arabi"
                                layout="default"
                                onClose={closeFullscreen}
                            >
                                <TabArabi
                                    p={calcResult}
                                    arabi={arabi}
                                    servingRef={arabiServingRef}
                                    measure={arabiMeasure}
                                    specificGravity={sg > 0 ? sg : undefined}
                                />
                            </FullscreenOverlay>
                        </div>
                    )}
                </>
            )}

            {/* ─── Allergenici ─────────────────────────────────────────────── */}
            {hasIngredients && (presentAllergens.length > 0 || crossAllergens.length > 0) && (
                <div className="m-section" style={{ marginTop: 4 }}>
                    <div className="m-section__header" style={{ cursor: 'default' }}>
                        <div className="m-section__line" />
                        <span className="m-section__title">Allergeni</span>
                        <div className="m-section__line" />
                    </div>
                    {presentAllergens.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#c62828', margin: '0 0 6px' }}>
                                Contiene:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {presentAllergens.map(a => (
                                    <span key={a} style={{
                                        fontSize: 11, fontWeight: 700, padding: '3px 9px',
                                        background: '#ffebee', color: '#c62828',
                                        borderRadius: 20, border: '1px solid #ef9a9a',
                                    }}>
                                        {a}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {crossAllergens.length > 0 && (
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#e65100', margin: '0 0 6px' }}>
                                Può contenere tracce di:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {crossAllergens.map(a => (
                                    <span key={a} style={{
                                        fontSize: 11, fontWeight: 600, padding: '3px 9px',
                                        background: '#fff3e0', color: '#e65100',
                                        borderRadius: 20, border: '1px solid #ffcc80',
                                    }}>
                                        {a}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
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
                    className="m-btn m-btn--green"
                    style={{ flex: 1 }}
                    onClick={handlePDF}
                >
                    <Download size={14} /> PDF
                </button>
            </div>

            {/* Nutrient select modal */}
            <NutrientSelectModal
                open={nutrientModalOpen}
                onClose={() => setNutrientModalOpen(false)}
                selected={selectedOptionals}
                onChange={setSelectedOptionals}
            />
        </div>
    );
}
