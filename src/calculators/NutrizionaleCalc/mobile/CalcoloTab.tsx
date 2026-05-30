import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { MobileNutForm } from '../NutrizionaleCalcMobile';

interface Props {
    form: MobileNutForm;
    onChange: (patch: Partial<MobileNutForm>) => void;
    onGoToTabella: () => void;
}

function NumInput({ label, field, form, onChange, unit }: {
    label: string; field: keyof MobileNutForm;
    form: MobileNutForm; onChange: (p: Partial<MobileNutForm>) => void;
    unit?: string;
}) {
    return (
        <div className="m-field">
            <label className="m-label">{label}{unit ? ` (${unit})` : ''}</label>
            <input
                className="m-input m-input--num"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="0"
                value={form[field] as string}
                onChange={e => onChange({ [field]: e.target.value } as Partial<MobileNutForm>)}
            />
        </div>
    );
}

export function CalcoloTab({ form, onChange, onGoToTabella }: Props) {
    const [macroOpen, setMacroOpen] = useState(true);
    const [microOpen, setMicroOpen] = useState(false);

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
                    <NumInput label="Porzione" field="porzione_g" form={form} onChange={onChange} unit="g" />
                </div>
            </div>

            {/* Sezione: Energia */}
            <div className="m-section">
                <div className="m-section__header" style={{ cursor: 'default' }}>
                    <div className="m-section__line" />
                    <span className="m-section__title">Energia per 100g</span>
                    <div className="m-section__line" />
                </div>
                <div className="m-input-group">
                    <NumInput label="Energia" field="kcal" form={form} onChange={onChange} unit="kcal" />
                    <NumInput label="Energia" field="kj" form={form} onChange={onChange} unit="kJ" />
                </div>
                <p style={{ fontSize: 10, color: 'var(--m-text-muted)', margin: '4px 0 0' }}>
                    Se lasci kJ vuoto viene calcolato automaticamente (kcal × 4.184).
                </p>
            </div>

            {/* Sezione: Macro — collassabile */}
            <div className="m-section">
                <button
                    type="button"
                    className="m-section__header"
                    onClick={() => setMacroOpen(o => !o)}
                    style={{ width: '100%', background: 'none', border: 'none', padding: 0 }}
                    aria-expanded={macroOpen}
                >
                    <div className="m-section__line" />
                    <span className="m-section__title">Macro per 100g</span>
                    <ChevronDown
                        size={14}
                        className={`m-section__chevron${macroOpen ? ' m-section__chevron--open' : ''}`}
                    />
                    <div className="m-section__line" />
                </button>

                {macroOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="m-input-group">
                            <NumInput label="Grassi tot." field="grassi" form={form} onChange={onChange} unit="g" />
                            <NumInput label="di cui saturi" field="saturi" form={form} onChange={onChange} unit="g" />
                        </div>
                        <div className="m-input-group">
                            <NumInput label="Carboidrati" field="carboidrati" form={form} onChange={onChange} unit="g" />
                            <NumInput label="di cui zuccheri" field="zuccheri" form={form} onChange={onChange} unit="g" />
                        </div>
                        <div className="m-input-group">
                            <NumInput label="Proteine" field="proteine" form={form} onChange={onChange} unit="g" />
                            <NumInput label="Sodio" field="sodio_mg" form={form} onChange={onChange} unit="mg" />
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--m-text-muted)', margin: '2px 0 0' }}>
                            Il sale viene calcolato da sodio × 2.5 / 1000.
                        </p>
                    </div>
                )}
            </div>

            {/* Sezione: Micro — collassabile */}
            <div className="m-section">
                <button
                    type="button"
                    className="m-section__header"
                    onClick={() => setMicroOpen(o => !o)}
                    style={{ width: '100%', background: 'none', border: 'none', padding: 0 }}
                    aria-expanded={microOpen}
                >
                    <div className="m-section__line" />
                    <span className="m-section__title">Micro (opzionale)</span>
                    <ChevronDown
                        size={14}
                        className={`m-section__chevron${microOpen ? ' m-section__chevron--open' : ''}`}
                    />
                    <div className="m-section__line" />
                </button>

                {microOpen && (
                    <div className="m-input-group">
                        <NumInput label="Fibre" field="fibre" form={form} onChange={onChange} unit="g" />
                    </div>
                )}
            </div>

            {/* CTA */}
            <div className="m-btn-row" style={{ marginTop: 8, marginBottom: 16 }}>
                <button
                    type="button"
                    className="m-btn m-btn--primary m-btn--full"
                    onClick={onGoToTabella}
                >
                    Genera Tabella →
                </button>
            </div>
        </div>
    );
}
