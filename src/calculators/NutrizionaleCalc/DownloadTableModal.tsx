import React, { useState, useRef, useEffect } from 'react';
import type { ComponentProps } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '../../components/ui/Toast';
import { TabUE } from './TabUE';
import type { EUSubTab, SelectedOptionals } from './TabUE';
import { TabUSA } from './TabUSA';
import type { USAServingRef, USAMeasure } from './TabUSA';
import { TabCanada } from './TabCanada';
import { TabAustralia } from './TabAustralia';
import { TabArabi } from './TabArabi';
import type { NationTab, SubTab, ServingSizesNation, UEServing } from './NutrizionaleCalc';

interface Props {
    region: NationTab;
    p: ComponentProps<typeof TabUE>['p'];
    ue: UEServing;
    usa: ServingSizesNation;
    ca: ServingSizesNation;
    au: ServingSizesNation;
    arabi: ServingSizesNation;
    specificGravity: number;
    selectedOptionals: SelectedOptionals;
    showOptionals: boolean;
    productName: string;
    onClose: () => void;
}

// ─── Option button helper ─────────────────────────────────────────────────────
function OptBtn({ label, active, disabled, onClick }: {
    label: string; active: boolean; disabled?: boolean; onClick: () => void;
}) {
    return (
        <button
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
    region, p, ue, usa, ca, au, arabi,
    specificGravity, selectedOptionals, showOptionals,
    productName, onClose,
}: Props) {
    const toast = useToast();
    const previewRef = useRef<HTMLDivElement>(null);

    // ─── Format state (all local) ─────────────────────────────────────────────
    const [subTab, setSubTab] = useState<SubTab>('verticale');
    const [euSubTab, setEuSubTab] = useState<EUSubTab>('100g');
    const [servingRef, setServingRef] = useState<USAServingRef>('serving');
    const [measure, setMeasure] = useState<USAMeasure>('g');

    // ─── Nation data by region ────────────────────────────────────────────────
    const nationData: ServingSizesNation =
        region === 'USA' ? usa :
        region === 'Canada' ? ca :
        region === 'Australia' ? au :
        region === 'Arabi' ? arabi : {};

    // ─── Fallback effects (replicate NutrizionaleCalc logic) ─────────────────
    useEffect(() => {
        if (region === 'UE') {
            if (euSubTab === 'uv' && ue.confezione == null) setEuSubTab('100g');
            if (euSubTab === 'porzione' && ue.porzione == null) setEuSubTab('100g');
            if (euSubTab === 'pezzo' && ue.pezzo == null) setEuSubTab('100g');
        }
    }, [region, euSubTab, ue.confezione, ue.porzione, ue.pezzo]);

    useEffect(() => {
        if (region !== 'UE' && region !== 'Australia') {
            if (servingRef === 'confezione' && (nationData.confezione == null || nationData.confezione === 0)) setServingRef('serving');
            if (measure === 'tazze' && nationData.cup == null) setMeasure('g');
            if (measure === 'cucchiai' && nationData.cucchiaio == null) setMeasure('g');
            if (measure === 'pezzi' && nationData.pezzo == null) setMeasure('g');
        }
    }, [region, servingRef, measure, nationData.confezione, nationData.cup, nationData.cucchiaio, nationData.pezzo]);

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
            console.error(e);
            toast.error("Errore durante l'esportazione della tabella in PNG.");
        }
    }

    // ─── Option groups visibility ─────────────────────────────────────────────
    // Layout (verticale/orizzontale/lineare): USA only (Canada handles it internally)
    const showLayout = region === 'USA';
    // Colonne UE (euSubTab): UE only
    const showColonne = region === 'UE';
    // Riferimento serving/confezione: USA, Canada, Arabi — only when confezione set
    const showRiferimento = (region === 'USA' || region === 'Canada' || region === 'Arabi')
        && (nationData.confezione ?? 0) > 0;
    // Unità: USA, Canada, Arabi
    const showUnita = region === 'USA' || region === 'Canada' || region === 'Arabi';

    // ─── Preview ──────────────────────────────────────────────────────────────
    function renderPreview() {
        switch (region) {
            case 'UE':
                return (
                    <TabUE
                        p={p}
                        ue={ue}
                        specificGravity={specificGravity}
                        selectedOptionals={selectedOptionals}
                        showOptionals={showOptionals}
                        activeSubTab={euSubTab}
                    />
                );
            case 'USA':
                return (
                    <TabUSA
                        p={p}
                        usa={usa}
                        specificGravity={specificGravity}
                        servingRef={servingRef}
                        measure={measure}
                        subTab={subTab}
                    />
                );
            case 'Canada':
                return (
                    <TabCanada
                        p={p}
                        ca={ca}
                        servingRef={servingRef}
                        measure={measure}
                        subTab={subTab}
                        setSubTab={setSubTab}
                        full={false}
                    />
                );
            case 'Australia':
                return <TabAustralia p={p} au={au} full={false} />;
            case 'Arabi':
                return (
                    <TabArabi
                        p={p}
                        arabi={arabi}
                        servingRef={servingRef}
                        measure={measure}
                        specificGravity={specificGravity}
                        full={false}
                    />
                );
        }
    }

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
                    <button className="btn btn-outline" onClick={onClose} style={{ padding: '6px 12px' }}>
                        ✕ Annulla
                    </button>
                </div>

                {/* Body */}
                <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
                    {/* Options column */}
                    <div data-testid="options-col" style={{ width: 180, flexShrink: 0, overflowY: 'auto' }}>
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
                                    <OptBtn label="Per 100g" active={euSubTab === '100g'} onClick={() => setEuSubTab('100g')} />
                                    <OptBtn
                                        label="Per U.V."
                                        active={euSubTab === 'uv'}
                                        disabled={ue.confezione == null}
                                        onClick={() => setEuSubTab('uv')}
                                    />
                                    <OptBtn
                                        label="Per porzione"
                                        active={euSubTab === 'porzione'}
                                        disabled={ue.porzione == null}
                                        onClick={() => setEuSubTab('porzione')}
                                    />
                                    <OptBtn
                                        label="Per pezzo"
                                        active={euSubTab === 'pezzo'}
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
                                    <OptBtn label="Per Serving" active={servingRef === 'serving'} onClick={() => setServingRef('serving')} />
                                    <OptBtn label="Per Confezione" active={servingRef === 'confezione'} onClick={() => setServingRef('confezione')} />
                                </div>
                            </>
                        )}

                        {showUnita && (
                            <>
                                <SectionLabel text="Unità" />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <OptBtn label="g / ml" active={measure === 'g'} onClick={() => setMeasure('g')} />
                                    <OptBtn
                                        label="Tazze"
                                        active={measure === 'tazze'}
                                        disabled={nationData.cup == null}
                                        onClick={() => setMeasure('tazze')}
                                    />
                                    <OptBtn
                                        label="Cucchiai"
                                        active={measure === 'cucchiai'}
                                        disabled={nationData.cucchiaio == null}
                                        onClick={() => setMeasure('cucchiai')}
                                    />
                                    <OptBtn
                                        label="Pezzi"
                                        active={measure === 'pezzi'}
                                        disabled={nationData.pezzo == null}
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
                        {renderPreview()}
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
