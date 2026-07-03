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

// ─── Compact selector button strip ───────────────────────────────────────────
function Pill<T extends string>({ options, value, onChange }: {
    options: { v: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {options.map(o => (
                <button
                    key={o.v}
                    type="button"
                    onClick={() => onChange(o.v)}
                    style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 20, cursor: 'pointer',
                        background: value === o.v ? 'var(--m-orange, #ff7e2e)' : 'transparent',
                        color: value === o.v ? 'white' : 'var(--m-text)',
                        border: '1px solid var(--m-orange, #ff7e2e)',
                        fontWeight: value === o.v ? 700 : 400,
                    }}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

// ─── Compact number input ─────────────────────────────────────────────────────
function SField({ label, field, form, onChange }: {
    label: string;
    field: keyof MobileNutForm;
    form: MobileNutForm;
    onChange: (p: Partial<MobileNutForm>) => void;
}) {
    return (
        <div className="m-field" style={{ minWidth: 80 }}>
            <label className="m-label" style={{ fontSize: 10 }}>{label}</label>
            <input
                className="m-input m-input--num"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="—"
                value={form[field] as string}
                onChange={e => onChange({ [field]: e.target.value } as Partial<MobileNutForm>)}
                style={{ fontSize: 13 }}
            />
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

    const hasData = (hasIngredients ?? false) || calcResult.energyKcal > 0 || calcResult.proteine > 0 || calcResult.grassi > 0;
    const sg = nf(form.specificGravity);

    const showNotice = (type: 'success' | 'error', msg: string) => {
        setNotice({ type, msg });
        setTimeout(() => setNotice(null), 3000);
    };

    const handleSave = () => {
        if (!selectedRegion) { showNotice('error', 'Seleziona prima una regione.'); return; }
        if (!form.denominazione.trim()) { showNotice('error', 'Inserisci la denominazione nel tab Calcolo.'); return; }
        onSave(selectedRegion);
        showNotice('success', 'Calcolo salvato in archivio.');
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
        <div style={{ paddingTop: 8, paddingBottom: 100 }}>

            {/* ── Compact region chip bar ──────────────────────────────────── */}
            <div className="m-region-tabs">
                {REGIONS.map(r => {
                    const isActive = selectedRegion === r.id;
                    return (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedRegion(r.id)}
                            aria-pressed={isActive}
                            className={isActive ? 'm-region-tab m-region-tab--active' : 'm-region-tab'}
                        >
                            <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>{r.label}</span>
                            <span style={{ fontSize: 9, opacity: isActive ? 0.85 : 0.55, marginTop: 1 }}>{r.sub}</span>
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
                        <>
                            {/* EU serving sizes */}
                            <div className="m-section">
                                <div className="m-section__header" style={{ cursor: 'default' }}>
                                    <div className="m-section__line" />
                                    <span className="m-section__title">Porzioni EU</span>
                                    <div className="m-section__line" />
                                </div>
                                <div className="m-input-group">
                                    <SField label="Porzione (g)" field="ue_porzione" form={form} onChange={onChange} />
                                    <SField label="Confezione (g)" field="ue_confezione" form={form} onChange={onChange} />
                                    <SField label="Pezzo (g)" field="ue_pezzo" form={form} onChange={onChange} />
                                </div>
                            </div>
                            {/* EU sub-tab selector + nutrienti button */}
                            <div style={{ padding: '0 16px 12px' }}>
                                <p style={{ fontSize: 11, color: 'var(--m-text-muted)', margin: '0 0 6px' }}>Vista tabella:</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <Pill<EUSubTab>
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
                            <div className="m-table-preview">
                                <TabUE
                                    p={calcResult as Parameters<typeof TabUE>[0]['p']}
                                    ue={ue}
                                    specificGravity={sg > 0 ? sg : undefined}
                                    selectedOptionals={selectedOptionals}
                                    showOptionals={true}
                                    activeSubTab={euSubTab}
                                />
                            </div>
                        </>
                    )}

                    {/* ── USA ──────────────────────────────────────────────── */}
                    {selectedRegion === 'USA' && (
                        <>
                            <div className="m-section">
                                <div className="m-section__header" style={{ cursor: 'default' }}>
                                    <div className="m-section__line" />
                                    <span className="m-section__title">Porzioni USA</span>
                                    <div className="m-section__line" />
                                </div>
                                <div className="m-input-group">
                                    <SField label="Serving (g)" field="usa_serving" form={form} onChange={onChange} />
                                    <SField label="Confezione (g)" field="usa_confezione" form={form} onChange={onChange} />
                                    <SField label="Cup (g)" field="usa_cup" form={form} onChange={onChange} />
                                    <SField label="Cucchiaio (g)" field="usa_cucchiaio" form={form} onChange={onChange} />
                                    <SField label="Pezzo (g)" field="usa_pezzo" form={form} onChange={onChange} />
                                </div>
                            </div>
                            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div>
                                    <p style={{ fontSize: 11, color: 'var(--m-text-muted)', margin: '0 0 6px' }}>Layout:</p>
                                    <Pill<SubTab>
                                        options={[
                                            { v: 'verticale', label: 'Verticale' },
                                            { v: 'orizzontale', label: 'Orizzontale' },
                                            { v: 'lineare', label: 'Lineare' },
                                        ]}
                                        value={usaSubTab}
                                        onChange={setUsaSubTab}
                                    />
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, color: 'var(--m-text-muted)', margin: '0 0 6px' }}>Riferimento:</p>
                                    <Pill<USAServingRef>
                                        options={[
                                            { v: 'serving', label: 'Porzione' },
                                            { v: 'confezione', label: 'Confezione' },
                                        ]}
                                        value={usaServingRef}
                                        onChange={setUsaServingRef}
                                    />
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, color: 'var(--m-text-muted)', margin: '0 0 6px' }}>Unità di misura:</p>
                                    <Pill<USAMeasure>
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
                            </div>
                            <div className="m-table-preview">
                                <TabUSA
                                    p={calcResult as Parameters<typeof TabUSA>[0]['p']}
                                    usa={usa}
                                    specificGravity={sg > 0 ? sg : 1}
                                    servingRef={usaServingRef}
                                    measure={usaMeasure}
                                    subTab={usaSubTab}
                                />
                            </div>
                        </>
                    )}

                    {/* ── Canada ───────────────────────────────────────────── */}
                    {selectedRegion === 'Canada' && (
                        <>
                            <div className="m-section">
                                <div className="m-section__header" style={{ cursor: 'default' }}>
                                    <div className="m-section__line" />
                                    <span className="m-section__title">Porzioni Canada</span>
                                    <div className="m-section__line" />
                                </div>
                                <div className="m-input-group">
                                    <SField label="Serving (g)" field="ca_serving" form={form} onChange={onChange} />
                                    <SField label="Confezione (g)" field="ca_confezione" form={form} onChange={onChange} />
                                    <SField label="Cup (g, 250ml)" field="ca_cup" form={form} onChange={onChange} />
                                    <SField label="Cucchiaio (g)" field="ca_cucchiaio" form={form} onChange={onChange} />
                                    <SField label="Pezzo (g)" field="ca_pezzo" form={form} onChange={onChange} />
                                </div>
                            </div>
                            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div>
                                    <p style={{ fontSize: 11, color: 'var(--m-text-muted)', margin: '0 0 6px' }}>Layout:</p>
                                    <Pill<SubTab>
                                        options={[
                                            { v: 'verticale', label: 'Verticale' },
                                            { v: 'orizzontale', label: 'Orizzontale' },
                                            { v: 'lineare', label: 'Lineare' },
                                        ]}
                                        value={caSubTab}
                                        onChange={setCaSubTab}
                                    />
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, color: 'var(--m-text-muted)', margin: '0 0 6px' }}>Riferimento:</p>
                                    <Pill<USAServingRef>
                                        options={[
                                            { v: 'serving', label: 'Porzione' },
                                            { v: 'confezione', label: 'Confezione' },
                                        ]}
                                        value={caServingRef}
                                        onChange={setCaServingRef}
                                    />
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, color: 'var(--m-text-muted)', margin: '0 0 6px' }}>Unità:</p>
                                    <Pill<USAMeasure>
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
                            </div>
                            <div className="m-table-preview">
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
                        </>
                    )}

                    {/* ── Australia ────────────────────────────────────────── */}
                    {selectedRegion === 'Australia' && (
                        <>
                            <div className="m-section">
                                <div className="m-section__header" style={{ cursor: 'default' }}>
                                    <div className="m-section__line" />
                                    <span className="m-section__title">Porzioni Australia</span>
                                    <div className="m-section__line" />
                                </div>
                                <div className="m-input-group">
                                    <SField label="Serving (g)" field="au_serving" form={form} onChange={onChange} />
                                    <SField label="Confezione (g)" field="au_confezione" form={form} onChange={onChange} />
                                    <SField label="Pezzo (g)" field="au_pezzo" form={form} onChange={onChange} />
                                </div>
                            </div>
                            <div className="m-table-preview">
                                <TabAustralia p={calcResult} au={au} full />
                            </div>
                        </>
                    )}

                    {/* ── Arabi ────────────────────────────────────────────── */}
                    {selectedRegion === 'Arabi' && (
                        <>
                            <div className="m-section">
                                <div className="m-section__header" style={{ cursor: 'default' }}>
                                    <div className="m-section__line" />
                                    <span className="m-section__title">Porzioni Gulf/Arabi</span>
                                    <div className="m-section__line" />
                                </div>
                                <div className="m-input-group">
                                    <SField label="Serving (g)" field="arabi_serving" form={form} onChange={onChange} />
                                    <SField label="Confezione (g)" field="arabi_confezione" form={form} onChange={onChange} />
                                    <SField label="Cup (g, 240ml)" field="arabi_cup" form={form} onChange={onChange} />
                                    <SField label="Cucchiaio (g)" field="arabi_cucchiaio" form={form} onChange={onChange} />
                                    <SField label="Pezzo (g)" field="arabi_pezzo" form={form} onChange={onChange} />
                                </div>
                            </div>
                            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div>
                                    <p style={{ fontSize: 11, color: 'var(--m-text-muted)', margin: '0 0 6px' }}>Riferimento:</p>
                                    <Pill<USAServingRef>
                                        options={[
                                            { v: 'serving', label: 'Porzione' },
                                            { v: 'confezione', label: 'Confezione' },
                                        ]}
                                        value={arabiServingRef}
                                        onChange={setArabiServingRef}
                                    />
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, color: 'var(--m-text-muted)', margin: '0 0 6px' }}>Unità:</p>
                                    <Pill<USAMeasure>
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
                            </div>
                            <div className="m-table-preview">
                                <TabArabi
                                    p={calcResult}
                                    arabi={arabi}
                                    servingRef={arabiServingRef}
                                    measure={arabiMeasure}
                                    specificGravity={sg > 0 ? sg : undefined}
                                    full
                                />
                            </div>
                        </>
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

            {/* Action buttons */}
            <div className="m-btn-row" style={{ marginTop: 16, marginBottom: 16 }}>
                <button type="button" className="m-btn m-btn--primary" style={{ flex: 1 }} onClick={handleSave}>
                    Salva
                </button>
                <button type="button" className="m-btn m-btn--green" style={{ flex: 1 }} onClick={handlePDF}>
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
