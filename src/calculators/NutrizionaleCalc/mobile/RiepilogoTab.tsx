import React, { useState } from 'react';
import { Scale, Euro, ArrowRight } from 'lucide-react';
import type { MobileComponent } from '../NutrizionaleCalcMobile';
import { calcQuid } from '../../../engines/nutrizionaleCalcEngine';

const isAcqua = (nome: string) => (nome || '').trim().toLowerCase() === 'acqua';

// ─── Merged ingredient row (desktop-equivalent) ───────────────────────────────
export interface MergedIngredient {
    ing: { nome: string; kcal: number };
    grammiTotali: number;
    grammiXpzuv: number;
    eurKg: number;
    resa: number;
}

// eslint-disable-next-line react-refresh/only-export-components
export function buildMergedIngredients(components: MobileComponent[]): MergedIngredient[] {
    const map = new Map<string, MergedIngredient>();
    for (const comp of components) {
        const pzUV = comp.pzUV || 1;
        for (const row of comp.rows) {
            const key = (row.ing.nome || '').trim();
            const ex = map.get(key);
            if (ex) {
                ex.grammiTotali += row.grams;
                ex.grammiXpzuv  += row.grams / pzUV;
                if (ex.eurKg === 0 && row.eurKg > 0) ex.eurKg = row.eurKg;
            } else {
                map.set(key, {
                    ing: { nome: row.ing.nome, kcal: row.ing.kcal },
                    grammiTotali: row.grams,
                    grammiXpzuv: row.grams / pzUV,
                    eurKg: row.eurKg,
                    resa: row.resa,
                });
            }
        }
    }
    return [...map.values()];
}

interface Props {
    components: MobileComponent[];
    pesoFinito: number;          // peso finito in grammi/pz (0 = non inserito)
    presentAllergens: string[];
    crossAllergens: string[];
    onGoToMercati: () => void;
}

type RTab = 'q' | 'c';

const fmt3 = (v: number) => v.toFixed(3).replace('.', ',');
const fmt2 = (v: number) => v.toFixed(2).replace('.', ',');
const fmtC = (v: number) => v > 0 ? v.toFixed(3).replace('.', ',') : '—';

export function RiepilogoTab({ components, pesoFinito, presentAllergens, crossAllergens, onGoToMercati }: Props) {
    const [rTab, setRTab] = useState<RTab>('q');

    const merged = buildMergedIngredients(components);
    if (merged.length === 0) {
        return (
            <>
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--m-text-muted)', fontSize: 13 }}>
                    Aggiungi ingredienti nella scheda Ricetta per vedere il riepilogo.
                </div>
                <div className="m-cta-bar">
                    <button type="button" className="m-btn m-btn--primary m-btn--full" onClick={onGoToMercati}>
                        Vai ai Mercati <ArrowRight size={14} />
                    </button>
                </div>
            </>
        );
    }

    // ── totals ────────────────────────────────────────────────────────────────
    const totGrammiTotali = merged.reduce((s, r) => s + r.grammiTotali, 0);
    const totAdditiveGramsXpzuv = components.reduce(
        (s, c) => s + c.additiveRows.reduce((rs, r) => rs + (r.grams || 0), 0) / (c.pzUV || 1), 0
    );
    const totGrammiXpzuv = merged.reduce((s, r) => s + r.grammiXpzuv, 0) + totAdditiveGramsXpzuv;
    const pesoFinitoPz   = pesoFinito > 0 ? pesoFinito : totGrammiXpzuv;
    const caloAcqua      = totGrammiXpzuv > pesoFinitoPz ? totGrammiXpzuv - pesoFinitoPz : 0;
    const totQuid        = merged.reduce(
        (s, r) => s + calcQuid(r.grammiXpzuv, isAcqua(r.ing.nome), caloAcqua, pesoFinitoPz), 0
    );

    let totCostoUV = 0;
    for (const r of merged) {
        if (r.eurKg > 0) {
            const fabb = r.grammiXpzuv / ((r.resa || 100) / 100);
            totCostoUV += (fabb / 1000) * r.eurKg;
        }
    }
    const totCostoKg = pesoFinitoPz > 0 && totCostoUV > 0
        ? totCostoUV / (pesoFinitoPz / 1000)
        : 0;

    const hasCosts = merged.some(r => r.eurKg > 0);

    return (
        <><div style={{ paddingTop: 8, paddingBottom: 16 }}>

            {/* ── Sub-toggle ──────────────────────────────────────────────── */}
            <div style={{ padding: '8px 16px 0' }}>
                <div style={{
                    display: 'inline-flex', borderRadius: 8, overflow: 'hidden',
                    border: '1.5px solid var(--m-border)',
                }}>
                    <button
                        type="button"
                        onClick={() => setRTab('q')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 14px', border: 'none', cursor: 'pointer',
                            fontSize: 12, fontWeight: 700,
                            background: rTab === 'q' ? 'var(--m-navy)' : 'transparent',
                            color: rTab === 'q' ? 'white' : 'var(--m-text-muted)',
                        }}
                    >
                        <Scale size={12} /> Quantità
                    </button>
                    <button
                        type="button"
                        onClick={() => setRTab('c')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 14px', border: 'none',
                            borderLeft: '1.5px solid var(--m-border)',
                            cursor: 'pointer', fontSize: 12, fontWeight: 700,
                            background: rTab === 'c' ? 'var(--m-navy)' : 'transparent',
                            color: rTab === 'c' ? 'white' : 'var(--m-text-muted)',
                        }}
                    >
                        <Euro size={12} /> Costi
                    </button>
                </div>
            </div>

            {/* ── Totals bar ──────────────────────────────────────────────── */}
            <div style={{
                margin: '10px 16px 0',
                background: 'var(--m-orange)',
                borderRadius: 10,
                padding: '8px 12px',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                fontWeight: 700,
            }}>
                <span>{merged.length} ingredienti</span>
                {rTab === 'q' ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span>{fmt3(totGrammiXpzuv)} g</span>
                        <span>QUID {fmt3(totQuid)}%</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span>UV: {totCostoUV > 0 ? fmt3(totCostoUV) + ' €' : '—'}</span>
                        {totCostoKg > 0 && <span>/kg: {fmt3(totCostoKg)} €</span>}
                    </div>
                )}
            </div>

            {/* ── Ingredient card-list ─────────────────────────────────────── */}
            {/* ponytail: card-list replaces overflow table — same data, readable on 360px screens */}
            <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {merged.map((row, i) => {
                    const pct   = totGrammiXpzuv > 0 ? row.grammiXpzuv / totGrammiXpzuv * 100 : 0;
                    const quid  = calcQuid(row.grammiXpzuv, isAcqua(row.ing.nome), caloAcqua, pesoFinitoPz);
                    const costoKgPulito = row.eurKg > 0 ? row.eurKg / ((row.resa || 100) / 100) : 0;
                    const fabb  = row.grammiXpzuv / ((row.resa || 100) / 100);
                    const costoUV = row.eurKg > 0 ? (fabb / 1000) * row.eurKg : 0;
                    const costoKg = pesoFinitoPz > 0 && costoUV > 0 ? costoUV / (pesoFinitoPz / 1000) : 0;
                    return (
                        <div key={row.ing.nome + i} className="m-archive-card">
                            <div className="m-archive-card__title">
                                {(row.ing.nome || '').trim()}
                            </div>
                            {rTab === 'q' ? (
                                <div className="m-archive-card__meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                                    <span>{fmt3(row.grammiXpzuv)} g/pz</span>
                                    {totGrammiTotali !== totGrammiXpzuv && (
                                        <span>tot: {fmt3(row.grammiTotali)} g</span>
                                    )}
                                    <span>{fmt3(pct)}%</span>
                                    <span style={{ color: 'var(--m-orange)', fontWeight: 700 }}>
                                        QUID: {fmt3(quid)}%
                                    </span>
                                </div>
                            ) : (
                                <div className="m-archive-card__meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                                    {row.eurKg > 0 && <span>€/kg: {fmt2(row.eurKg)}</span>}
                                    <span>resa: {fmt2(row.resa || 100)}%</span>
                                    {costoKgPulito > 0 && <span>€/kg pulito: {fmt2(costoKgPulito)}</span>}
                                    {costoUV > 0 && (
                                        <span style={{ color: 'var(--m-orange)', fontWeight: 700 }}>
                                            €/UV: {fmtC(costoUV)}
                                        </span>
                                    )}
                                    {costoKg > 0 && <span>€/kg fin.: {fmtC(costoKg)}</span>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Cost summary cards (only if costs entered) ──────────────── */}
            {hasCosts && (
                <div style={{ padding: '12px 16px 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--m-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Euro size={13} /> Riepilogo Costi Ingredienti
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, background: 'white', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--m-border)' }}>
                            <div style={{ fontSize: 10, color: 'var(--m-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                                Costo / pezzo
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--m-orange)' }}>
                                {totCostoUV.toFixed(3)} €
                            </div>
                        </div>
                        <div style={{ flex: 1, background: 'white', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--m-border)' }}>
                            <div style={{ fontSize: 10, color: 'var(--m-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                                Costo / kg
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--m-navy)' }}>
                                {totCostoKg > 0 ? totCostoKg.toFixed(3) : '—'} {totCostoKg > 0 ? '€' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Allergenici ──────────────────────────────────────────────── */}
            {(presentAllergens.length > 0 || crossAllergens.length > 0) && (
                <div style={{ padding: '12px 16px 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--m-text)', marginBottom: 8 }}>
                        Allergeni
                    </div>
                    {presentAllergens.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#c62828', margin: '0 0 5px', textTransform: 'uppercase' }}>
                                Contiene:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {presentAllergens.map(a => (
                                    <span key={a} style={{
                                        fontSize: 10, fontWeight: 700, padding: '3px 8px',
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
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#e65100', margin: '0 0 5px', textTransform: 'uppercase' }}>
                                Può contenere tracce di:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {crossAllergens.map(a => (
                                    <span key={a} style={{
                                        fontSize: 10, fontWeight: 600, padding: '3px 8px',
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

            {(presentAllergens.length === 0 && crossAllergens.length === 0) && (
                <div style={{ padding: '12px 16px 0' }}>
                    <div style={{ fontSize: 11, color: 'var(--m-text-muted)', fontStyle: 'italic' }}>
                        Nessun allergene rilevato dagli ingredienti del database.
                    </div>
                </div>
            )}

        </div>
        <div className="m-cta-bar">
            <button
                type="button"
                className="m-btn m-btn--primary m-btn--full"
                onClick={onGoToMercati}
            >
                Vai ai Mercati <ArrowRight size={14} />
            </button>
        </div>
        </>
    );
}
