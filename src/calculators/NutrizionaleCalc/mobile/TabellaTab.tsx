import React, { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { TabUE, DEFAULT_OPTIONALS } from '../TabUE';
import { TabUSA } from '../TabUSA';
import { TabCanada } from '../TabCanada';
import { TabAustralia } from '../TabAustralia';
import { TabArabi } from '../TabArabi';
import { NutrientSelectModal } from '../NutrientSelectModal';
import type { EUSubTab, SelectedOptionals } from '../TabUE';
import type { USAServingRef, USAMeasure } from '../TabUSA';
import type { CalcResult, MobileNutForm } from '../NutrizionaleCalcMobile';

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
function SegmentedControl<T extends string>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: { v: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div style={{ marginBottom: 10 }}>
            <span className="m-segmented__label">{label}</span>
            <div className="m-segmented">
                {options.map(o => (
                    <button
                        key={o.v}
                        type="button"
                        className={`m-segmented__btn${value === o.v ? ' m-segmented__btn--active' : ''}`}
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

// ─── Table scale constants ────────────────────────────────────────────────────
const TABLE_SCALES: Record<string, Record<string, number>> = {
    UE:        { default: 0.92 },
    USA:       { verticale: 0.88, orizzontale: 0.72, lineare: 0.88 },
    Canada:    { verticale: 0.78, orizzontale: 0.70, lineare: 0.88 },
    Australia: { default: 0.88 },
    Arabi:     { default: 0.88 },
};

function getScale(region: string, layout: string): number {
    const r = TABLE_SCALES[region];
    if (!r) return 0.88;
    return r[layout] ?? r['default'] ?? 0.88;
}

function TableScaleWrap({
    region, layout, children, onExpand,
}: {
    region: string;
    layout: string;
    children: React.ReactNode;
    onExpand: () => void;
}) {
    const scale = getScale(region, layout);
    const isWide = scale < 0.80;
    return (
        <div style={{ padding: '0 16px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                {isWide && (
                    <span style={{ fontSize: 10, color: 'var(--m-text-muted)', fontStyle: 'italic' }}>
                        ← scorri per vedere tutto →
                    </span>
                )}
                <button
                    type="button"
                    className="m-expand-btn"
                    onClick={onExpand}
                    style={{ marginLeft: 'auto' }}
                >
                    <span className="m-expand-pulse" style={{ display: 'inline-block' }}>⤢</span>
                    Espandi
                </button>
            </div>
            <div className="m-table-scale-wrap">
                <div
                    className="m-table-scale-wrap__inner"
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        width: `${Math.round(100 / scale)}%`,
                    }}
                >
                    {children}
                </div>
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
                    ×
                </button>
            </div>
            <div className="m-fullscreen-overlay__body">
                {children}
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TabellaTab({ calcResult, form, onChange, onSave, onExportPDF, hasIngredients, presentAllergens = [], crossAllergens = [] }: Props) {
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
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
        if (!form.denominazione.trim()) { showNotice('error', 'Inserisci la denominazione nel tab Calcolo.'); return; }
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

    return (
        <div style={{ paddingTop: 8, paddingBottom: 140 }}>

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
                    Aggiungi almeno un ingrediente nel tab Calcolo prima di generare la tabella.
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
                            {/* Serving section — collapsible */}
                            <div className="m-section">
                                <div
                                    className="m-section__header"
                                    onClick={() => setServingOpen(o => !o)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="m-section__line" />
                                    <span className="m-section__title">Porzioni EU</span>
                                    <span style={{ transform: servingOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 14 }}>▾</span>
                                    <div className="m-section__line" />
                                </div>
                                <div className={`m-collapsible${servingOpen ? '' : ' m-collapsible--closed'}`}>
                                    <div className="m-serving-grid" style={{ padding: '8px 16px' }}>
                                        <ServingField label="Porzione (g)" field="ue_porzione" form={form} onChange={onChange} />
                                        <ServingField label="Confezione (g)" field="ue_confezione" form={form} onChange={onChange} />
                                        <ServingField label="Pezzo (g)" field="ue_pezzo" form={form} onChange={onChange} />
                                    </div>
                                </div>
                            </div>
                            {/* EU sub-tab selector + nutrienti button */}
                            <div style={{ padding: '0 16px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <SegmentedControl<EUSubTab>
                                        label="Vista tabella:"
                                        options={[
                                            { v: '100g', label: 'per 100g' },
                                            { v: 'porzione', label: 'Porzione' },
                                            { v: 'uv', label: 'Confezione' },
                                            { v: 'pezzo', label: 'Pezzo' },
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
                            <TableScaleWrap region="UE" layout={euSubTab} onExpand={() => setFullscreenOpen(true)}>
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
                            </TableScaleWrap>
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
                        </div>
                    )}

                    {/* ── USA ──────────────────────────────────────────────── */}
                    {selectedRegion === 'USA' && (
                        <div key={`USA-${tableKey}`} className="m-market-enter">
                            <div className="m-section">
                                <div
                                    className="m-section__header"
                                    onClick={() => setServingOpen(o => !o)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="m-section__line" />
                                    <span className="m-section__title">Porzioni USA</span>
                                    <span style={{ transform: servingOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 14 }}>▾</span>
                                    <div className="m-section__line" />
                                </div>
                                <div className={`m-collapsible${servingOpen ? '' : ' m-collapsible--closed'}`}>
                                    <div className="m-serving-grid" style={{ padding: '8px 16px' }}>
                                        <ServingField label="Serving (g)" field="usa_serving" form={form} onChange={onChange} />
                                        <ServingField label="Confezione (g)" field="usa_confezione" form={form} onChange={onChange} />
                                        <ServingField label="Cup (g)" field="usa_cup" form={form} onChange={onChange} />
                                        <ServingField label="Cucchiaio (g)" field="usa_cucchiaio" form={form} onChange={onChange} />
                                        <ServingField label="Pezzo (g)" field="usa_pezzo" form={form} onChange={onChange} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                                <SegmentedControl<USAServingRef>
                                    label="Riferimento:"
                                    options={[
                                        { v: 'serving', label: 'Porzione' },
                                        { v: 'confezione', label: 'Confezione' },
                                    ]}
                                    value={usaServingRef}
                                    onChange={setUsaServingRef}
                                />
                                <SegmentedControl<USAMeasure>
                                    label="Unità di misura:"
                                    options={[
                                        { v: 'g', label: 'g' },
                                        { v: 'tazze', label: 'Tazze' },
                                        { v: 'cucchiai', label: 'Cucchiai' },
                                        { v: 'pezzi', label: 'Pezzi' },
                                    ]}
                                    value={usaMeasure}
                                    onChange={setUsaMeasure}
                                />
                            </div>
                            <TableScaleWrap region="USA" layout={usaSubTab} onExpand={() => setFullscreenOpen(true)}>
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
                            </TableScaleWrap>
                            <FullscreenOverlay
                                open={fullscreenOpen}
                                exiting={fullscreenExiting}
                                region="USA"
                                layout={usaSubTab}
                                onClose={closeFullscreen}
                            >
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
                            <div className="m-section">
                                <div
                                    className="m-section__header"
                                    onClick={() => setServingOpen(o => !o)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="m-section__line" />
                                    <span className="m-section__title">Porzioni Canada</span>
                                    <span style={{ transform: servingOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 14 }}>▾</span>
                                    <div className="m-section__line" />
                                </div>
                                <div className={`m-collapsible${servingOpen ? '' : ' m-collapsible--closed'}`}>
                                    <div className="m-serving-grid" style={{ padding: '8px 16px' }}>
                                        <ServingField label="Serving (g)" field="ca_serving" form={form} onChange={onChange} />
                                        <ServingField label="Confezione (g)" field="ca_confezione" form={form} onChange={onChange} />
                                        <ServingField label="Cup (g, 250ml)" field="ca_cup" form={form} onChange={onChange} />
                                        <ServingField label="Cucchiaio (g)" field="ca_cucchiaio" form={form} onChange={onChange} />
                                        <ServingField label="Pezzo (g)" field="ca_pezzo" form={form} onChange={onChange} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                                <SegmentedControl<USAServingRef>
                                    label="Riferimento:"
                                    options={[
                                        { v: 'serving', label: 'Porzione' },
                                        { v: 'confezione', label: 'Confezione' },
                                    ]}
                                    value={caServingRef}
                                    onChange={setCaServingRef}
                                />
                                <SegmentedControl<USAMeasure>
                                    label="Unità:"
                                    options={[
                                        { v: 'g', label: 'g' },
                                        { v: 'tazze', label: 'Tazze' },
                                        { v: 'cucchiai', label: 'Cucchiai' },
                                        { v: 'pezzi', label: 'Pezzi' },
                                    ]}
                                    value={caMeasure}
                                    onChange={setCaMeasure}
                                />
                            </div>
                            <TableScaleWrap region="Canada" layout={caSubTab} onExpand={() => setFullscreenOpen(true)}>
                                <div key={`tbl-Canada-${caSubTab}-${caServingRef}-${caMeasure}`} className="m-table-appear">
                                    <TabCanada
                                        p={calcResult}
                                        ca={ca}
                                        servingRef={caServingRef}
                                        measure={caMeasure}
                                        subTab={caSubTab}
                                        setSubTab={setCaSubTab}
                                        full
                                    />
                                </div>
                            </TableScaleWrap>
                            <FullscreenOverlay
                                open={fullscreenOpen}
                                exiting={fullscreenExiting}
                                region="Canada"
                                layout={caSubTab}
                                onClose={closeFullscreen}
                            >
                                <TabCanada
                                    p={calcResult}
                                    ca={ca}
                                    servingRef={caServingRef}
                                    measure={caMeasure}
                                    subTab={caSubTab}
                                    setSubTab={setCaSubTab}
                                    full
                                />
                            </FullscreenOverlay>
                        </div>
                    )}

                    {/* ── Australia ────────────────────────────────────────── */}
                    {selectedRegion === 'Australia' && (
                        <div key={`Australia-${tableKey}`} className="m-market-enter">
                            <div className="m-section">
                                <div
                                    className="m-section__header"
                                    onClick={() => setServingOpen(o => !o)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="m-section__line" />
                                    <span className="m-section__title">Porzioni Australia</span>
                                    <span style={{ transform: servingOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 14 }}>▾</span>
                                    <div className="m-section__line" />
                                </div>
                                <div className={`m-collapsible${servingOpen ? '' : ' m-collapsible--closed'}`}>
                                    <div className="m-serving-grid" style={{ padding: '8px 16px' }}>
                                        <ServingField label="Serving (g)" field="au_serving" form={form} onChange={onChange} />
                                        <ServingField label="Confezione (g)" field="au_confezione" form={form} onChange={onChange} />
                                        <ServingField label="Pezzo (g)" field="au_pezzo" form={form} onChange={onChange} />
                                    </div>
                                </div>
                            </div>
                            <TableScaleWrap region="Australia" layout="default" onExpand={() => setFullscreenOpen(true)}>
                                <div key={`tbl-Australia`} className="m-table-appear">
                                    <TabAustralia p={calcResult} au={au} full />
                                </div>
                            </TableScaleWrap>
                            <FullscreenOverlay
                                open={fullscreenOpen}
                                exiting={fullscreenExiting}
                                region="Australia"
                                layout="default"
                                onClose={closeFullscreen}
                            >
                                <TabAustralia p={calcResult} au={au} full />
                            </FullscreenOverlay>
                        </div>
                    )}

                    {/* ── Arabi ────────────────────────────────────────────── */}
                    {selectedRegion === 'Arabi' && (
                        <div key={`Arabi-${tableKey}`} className="m-market-enter">
                            <div className="m-section">
                                <div
                                    className="m-section__header"
                                    onClick={() => setServingOpen(o => !o)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="m-section__line" />
                                    <span className="m-section__title">Porzioni Gulf/Arabi</span>
                                    <span style={{ transform: servingOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 14 }}>▾</span>
                                    <div className="m-section__line" />
                                </div>
                                <div className={`m-collapsible${servingOpen ? '' : ' m-collapsible--closed'}`}>
                                    <div className="m-serving-grid" style={{ padding: '8px 16px' }}>
                                        <ServingField label="Serving (g)" field="arabi_serving" form={form} onChange={onChange} />
                                        <ServingField label="Confezione (g)" field="arabi_confezione" form={form} onChange={onChange} />
                                        <ServingField label="Cup (g, 240ml)" field="arabi_cup" form={form} onChange={onChange} />
                                        <ServingField label="Cucchiaio (g)" field="arabi_cucchiaio" form={form} onChange={onChange} />
                                        <ServingField label="Pezzo (g)" field="arabi_pezzo" form={form} onChange={onChange} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <SegmentedControl<USAServingRef>
                                    label="Riferimento:"
                                    options={[
                                        { v: 'serving', label: 'Porzione' },
                                        { v: 'confezione', label: 'Confezione' },
                                    ]}
                                    value={arabiServingRef}
                                    onChange={setArabiServingRef}
                                />
                                <SegmentedControl<USAMeasure>
                                    label="Unità:"
                                    options={[
                                        { v: 'g', label: 'g' },
                                        { v: 'tazze', label: 'Tazze' },
                                        { v: 'cucchiai', label: 'Cucchiai' },
                                        { v: 'pezzi', label: 'Pezzi' },
                                    ]}
                                    value={arabiMeasure}
                                    onChange={setArabiMeasure}
                                />
                            </div>
                            <TableScaleWrap region="Arabi" layout="default" onExpand={() => setFullscreenOpen(true)}>
                                <div key={`tbl-Arabi-${arabiServingRef}-${arabiMeasure}`} className="m-table-appear">
                                    <TabArabi
                                        p={calcResult}
                                        arabi={arabi}
                                        servingRef={arabiServingRef}
                                        measure={arabiMeasure}
                                        specificGravity={sg > 0 ? sg : undefined}
                                        full
                                    />
                                </div>
                            </TableScaleWrap>
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
                                    full
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
                    PDF ↗
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
