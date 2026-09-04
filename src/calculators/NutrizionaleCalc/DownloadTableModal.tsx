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
function OptBtn({ label, active, disabled, onClick, disabledReason }: {
    label: string; active: boolean; disabled?: boolean; onClick: () => void; disabledReason?: string;
}) {
    return (
        <button
            type="button"  // fix 3: type=button esplicito
            className={active ? 'btn btn-accent' : 'btn btn-outline'}
            disabled={disabled}
            title={disabled && disabledReason ? disabledReason : undefined}
            onClick={onClick}
            style={{ fontSize: 13, padding: '8px 10px', opacity: disabled ? 0.4 : 1, width: '100%' }}
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
    const [downloading, setDownloading] = useState(false);

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

    // ─── AUDIT N3 — porzione obbligatoria sul pannello ufficiale ──────────────
    // USA (21 CFR 101.9), Canada (FDR B.01.401), Australia (FSANZ 1.2.8) e Golfo
    // (GSO 2233) stampano la porzione dentro il pannello: senza serving size le
    // tabelle escono con "Serving size 0 g" / "Par 0g", cioè un'etichetta non
    // valida — e il download non era bloccato. L'UE non compare qui: la sua base
    // è per 100g/100ml e la porzione è volontaria (Art. 33).
    // Il gate sta qui e non nei Tab*.tsx, che sono file protetti: questo è il
    // punto unico da cui passa ogni download ufficiale.
    const REGIONS_REQUIRING_SERVING: NationTab[] = ['USA', 'Canada', 'Australia', 'Arabi'];
    const servingMissing =
        REGIONS_REQUIRING_SERVING.includes(region) && !(nation.serving && nation.serving > 0);


    // ─── Download ─────────────────────────────────────────────────────────────
    async function handleDownload() {
        // Guard anche qui, non solo sul disabled del bottone: il gate non deve
        // dipendere dallo stato della UI (AUDIT N3).
        if (servingMissing) {
            toast.error('Indica la porzione per il mercato selezionato prima di scaricare.');
            return;
        }
        const container = previewRef.current;
        if (!container) {
            toast.error('Tabella non trovata.');
            return;
        }
        const target = container.querySelector<HTMLElement>('[data-table-export]') ?? container;
        setDownloading(true);

        // html2canvas clippa in base all'overflow degli antenati anche su elemento specifico.
        // Disabilita temporaneamente tutti gli overflow tra target e body.
        const overflowFixes: { el: HTMLElement; overflowX: string; overflowY: string; scrollLeft: number }[] = [];
        let ancestor: HTMLElement | null = target.parentElement;
        while (ancestor && ancestor !== document.body) {
            const cs = getComputedStyle(ancestor);
            if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
                overflowFixes.push({ el: ancestor, overflowX: ancestor.style.overflowX, overflowY: ancestor.style.overflowY, scrollLeft: ancestor.scrollLeft });
                ancestor.style.overflowX = 'visible';
                ancestor.style.overflowY = 'visible';
                ancestor.scrollLeft = 0;
            }
            ancestor = ancestor.parentElement;
        }

        try {
            const canvas = await html2canvas(target, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                windowWidth: 1200,
                windowHeight: 900,
                onclone: (clonedDoc: Document, el: HTMLElement) => {
                    const walker = clonedDoc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                    const nodes: Text[] = [];
                    let n: Node | null;
                    while ((n = walker.nextNode())) nodes.push(n as Text);
                    nodes.forEach(tn => {
                        const span = clonedDoc.createElement('span');
                        span.textContent = tn.textContent;
                        tn.parentNode?.replaceChild(span, tn);
                    });
                },
            });
            const layoutLabels: Record<SubTab, string> = { verticale: 'Verticale', orizzontale: 'Orizzontale', lineare: 'Lineare' };
            const euLabels: Record<EUSubTab, string> = { '100g': 'Per 100g', uv: 'UV', porzione: 'Porzione', pezzo: 'Pezzo' };
            const formato = (region === 'USA' || region === 'Canada') ? layoutLabels[subTab]
                : region === 'UE' ? euLabels[effEuSubTab]
                : '';
            const baseName = productName || 'tabella';
            const fileName = formato
                ? `${baseName} - tabella ${region} - ${formato}.png`
                : `${baseName} - tabella ${region}.png`;
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('PNG Export error:', e);
            toast.error("Errore durante l'esportazione della tabella in PNG.");
        } finally {
            overflowFixes.forEach(({ el, overflowX, overflowY, scrollLeft }) => {
                el.style.overflowX = overflowX;
                el.style.overflowY = overflowY;
                el.scrollLeft = scrollLeft;
            });
            setDownloading(false);
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
                                        disabledReason="Inserisci il peso confezione nel pannello Porzioni (a destra) per abilitare"
                                        onClick={() => setEuSubTab('uv')}
                                    />
                                    <OptBtn
                                        label="Per porzione"
                                        active={effEuSubTab === 'porzione'}
                                        disabled={ue.porzione == null}
                                        disabledReason="Inserisci la porzione nel pannello Porzioni (a destra) per abilitare"
                                        onClick={() => setEuSubTab('porzione')}
                                    />
                                    <OptBtn
                                        label="Per pezzo"
                                        active={effEuSubTab === 'pezzo'}
                                        disabled={ue.pezzo == null}
                                        disabledReason="Inserisci il peso pezzo nel pannello Porzioni (a destra) per abilitare"
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
                                        disabledReason="Inserisci la misura in tazze nel pannello Porzioni (a destra) per abilitare"
                                        onClick={() => setMeasure('tazze')}
                                    />
                                    <OptBtn
                                        label="Cucchiai"
                                        active={effMeasure === 'cucchiai'}
                                        disabled={nation.cucchiaio == null}
                                        disabledReason="Inserisci la misura in cucchiai nel pannello Porzioni (a destra) per abilitare"
                                        onClick={() => setMeasure('cucchiai')}
                                    />
                                    <OptBtn
                                        label="Pezzi"
                                        active={effMeasure === 'pezzi'}
                                        disabled={nation.pezzo == null}
                                        disabledReason="Inserisci il peso pezzo nel pannello Porzioni (a destra) per abilitare"
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 16 }}>
                    {servingMissing && (
                        <span style={{ fontSize: 12, color: '#b7791f', textAlign: 'right' }}>
                            Indica la <strong>porzione</strong> per questo mercato: senza, il pannello esce con
                            &ldquo;Serving size 0&nbsp;g&rdquo; e non è un&apos;etichetta valida.
                        </span>
                    )}
                    <button className="btn btn-accent" onClick={handleDownload}
                        disabled={downloading || servingMissing}
                        title={servingMissing ? 'Serve la porzione per il mercato selezionato' : undefined}
                        style={{ padding: '8px 20px', flexShrink: 0 }}>
                        {downloading ? 'Generazione…' : 'Scarica PNG'}
                    </button>
                </div>
            </div>
        </div>
    );
}
