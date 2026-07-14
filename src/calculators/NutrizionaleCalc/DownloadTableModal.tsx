import React, { useState, useRef, type ReactNode } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '../../components/ui/Toast';
import type { EUSubTab } from './TabUE';
import type { USAServingRef, USAMeasure } from './TabUSA';
import type { NationTab, SubTab, ServingSizesNation, UEServing } from './NutrizionaleCalc';

export interface DownloadFormatState {
    subTab: SubTab;
    euSubTab: EUSubTab;
    servingRef: USAServingRef;
    measure: USAMeasure;
}

interface Props {
    region: NationTab;
    // solo per calcolare i disabled state delle opzioni:
    ue: UEServing;
    nation: ServingSizesNation; // dati della regione attiva ({} per UE)
    productName: string;
    renderPreview: (state: DownloadFormatState) => ReactNode;
    onClose: () => void;
}

// ─── Option button helper ─────────────────────────────────────────────────────
function OptBtn({ label, active, disabled, onClick }: {
    label: string; active: boolean; disabled?: boolean; onClick: () => void;
}) {
    return (
        <button
            type="button"  // fix 3: type=button esplicito
            className={active ? 'btn btn-accent' : 'btn btn-outline'}
            disabled={disabled}
            onClick={onClick}
            style={{ fontSize: 11, padding: '3px 8px', opacity: disabled ? 0.4 : 1, width: '100%' }}
        >
            {label}
        </button>
    );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
    return (
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 4, marginTop: 12 }}>
            {text}
        </div>
    );
}

export function DownloadTableModal({
    region, ue, nation, productName, renderPreview, onClose,
}: Props) {
    const toast = useToast();
    const previewRef = useRef<HTMLDivElement>(null);

    // ─── Format state (all local) ─────────────────────────────────────────────
    const [subTab, setSubTab] = useState<SubTab>('verticale');
    const [euSubTab, setEuSubTab] = useState<EUSubTab>('100g');
    const [servingRef, setServingRef] = useState<USAServingRef>('serving');
    const [measure, setMeasure] = useState<USAMeasure>('g');

    // ─── Effective values derivati durante il render (no useEffect) ───────────
    // ponytail: derive instead of setState-in-effect (lint set-state-in-effect)
    const effEuSubTab: EUSubTab =
        (euSubTab === 'uv' && ue.confezione == null) ||
        (euSubTab === 'porzione' && ue.porzione == null) ||
        (euSubTab === 'pezzo' && ue.pezzo == null)
            ? '100g' : euSubTab;

    const effServingRef: USAServingRef =
        servingRef === 'confezione' && !(nation.confezione != null && nation.confezione > 0)
            ? 'serving' : servingRef;

    const effMeasure: USAMeasure =
        (measure === 'tazze' && nation.cup == null) ||
        (measure === 'cucchiai' && nation.cucchiaio == null) ||
        (measure === 'pezzi' && nation.pezzo == null)
            ? 'g' : measure;

    const formatState: DownloadFormatState = {
        subTab,
        euSubTab: effEuSubTab,
        servingRef: effServingRef,
        measure: effMeasure,
    };


    // ─── Download ─────────────────────────────────────────────────────────────
    async function handleDownload() {
        const container = previewRef.current;
        if (!container) {
            toast.error('Tabella non trovata.');
            return;
        }
        const target = container.querySelector<HTMLElement>('[data-table-export]') ?? container;
        try {
            const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const link = document.createElement('a');
            link.download = `${productName || 'tabella'}_nutrizionale.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error('PNG Export error:', e);  // fix 4: prefisso log ripristinato
            toast.error("Errore durante l'esportazione della tabella in PNG.");
        }
    }

    // ─── Option groups visibility ─────────────────────────────────────────────
    // Layout (verticale/orizzontale/lineare): USA + Canada
    const showLayout = region === 'USA' || region === 'Canada';
    // Colonne UE (euSubTab): UE only, solo quando almeno un campo UE è valorizzato
    const showColonne = region === 'UE' &&
        (ue.confezione != null || ue.porzione != null || ue.pezzo != null);
    // Riferimento serving/confezione: USA, Canada, Arabi — solo quando confezione impostata
    const showRiferimento = (region === 'USA' || region === 'Canada' || region === 'Arabi')
        && (nation.confezione ?? 0) > 0;
    // Unità: USA, Canada, Arabi
    const showUnita = region === 'USA' || region === 'Canada' || region === 'Arabi';
    // Nascondi colonna opzioni se nessun gruppo visibile (es. Australia)
    const showOptionsCol = showLayout || showColonne || showRiferimento || showUnita;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Scarica tabella ${region}`}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
        >
            <div
                className="card"
                style={{
                    width: '100%', maxWidth: 860, maxHeight: '85vh',
                    display: 'flex', flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 16 }}>
                        Scarica tabella ufficiale — {region}
                    </h2>
                    <button type="button" className="btn btn-outline" onClick={onClose} style={{ padding: '6px 12px' }}>
                        ✕ Annulla
                    </button>
                </div>

                {/* Body */}
                <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
                    {/* Options column */}
                    <div data-testid="options-col" style={{ width: showOptionsCol ? 180 : 0, flexShrink: 0, overflowY: 'auto', display: showOptionsCol ? undefined : 'none' }}>
                        {showLayout && (
                            <>
                                <SectionLabel text="Layout" />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <OptBtn label="Verticale" active={subTab === 'verticale'} onClick={() => setSubTab('verticale')} />
                                    <OptBtn label="Orizzontale" active={subTab === 'orizzontale'} onClick={() => setSubTab('orizzontale')} />
                                    <OptBtn label="Lineare" active={subTab === 'lineare'} onClick={() => setSubTab('lineare')} />
                                </div>
                            </>
                        )}

                        {showColonne && (
                            <>
                                <SectionLabel text="Colonne" />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <OptBtn label="Per 100g" active={effEuSubTab === '100g'} onClick={() => setEuSubTab('100g')} />
                                    <OptBtn
                                        label="Per U.V."
                                        active={effEuSubTab === 'uv'}
                                        disabled={ue.confezione == null}
                                        onClick={() => setEuSubTab('uv')}
                                    />
                                    <OptBtn
                                        label="Per porzione"
                                        active={effEuSubTab === 'porzione'}
                                        disabled={ue.porzione == null}
                                        onClick={() => setEuSubTab('porzione')}
                                    />
                                    <OptBtn
                                        label="Per pezzo"
                                        active={effEuSubTab === 'pezzo'}
                                        disabled={ue.pezzo == null}
                                        onClick={() => setEuSubTab('pezzo')}
                                    />
                                </div>
                            </>
                        )}

                        {showRiferimento && (
                            <>
                                <SectionLabel text="Riferimento" />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <OptBtn label="Per Serving" active={effServingRef === 'serving'} onClick={() => setServingRef('serving')} />
                                    <OptBtn label="Per Confezione" active={effServingRef === 'confezione'} onClick={() => setServingRef('confezione')} />
                                </div>
                            </>
                        )}

                        {showUnita && (
                            <>
                                <SectionLabel text="Unità" />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <OptBtn label="g / ml" active={effMeasure === 'g'} onClick={() => setMeasure('g')} />
                                    <OptBtn
                                        label="Tazze"
                                        active={effMeasure === 'tazze'}
                                        disabled={nation.cup == null}
                                        onClick={() => setMeasure('tazze')}
                                    />
                                    <OptBtn
                                        label="Cucchiai"
                                        active={effMeasure === 'cucchiai'}
                                        disabled={nation.cucchiaio == null}
                                        onClick={() => setMeasure('cucchiai')}
                                    />
                                    <OptBtn
                                        label="Pezzi"
                                        active={effMeasure === 'pezzi'}
                                        disabled={nation.pezzo == null}
                                        onClick={() => setMeasure('pezzi')}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Preview pane */}
                    <div
                        ref={previewRef}
                        style={{
                            flex: 1, overflowY: 'auto',
                            border: '1px solid var(--color-border)',
                            borderRadius: 8, padding: 12,
                        }}
                    >
                        {renderPreview(formatState)}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <button className="btn btn-accent" onClick={handleDownload} style={{ padding: '8px 20px' }}>
                        Scarica PNG
                    </button>
                </div>
            </div>
        </div>
    );
}
