import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import { X } from 'lucide-react';
import type { EUSubTab } from './TabUE';
import type { USAServingRef, USAMeasure } from './TabUSA';

type Region = 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';
type SubTab = 'verticale' | 'orizzontale' | 'lineare';

// ─── Export format state (scelto solo al momento dell'esportazione, mai in anteprima) ──
export interface ExportFormat {
    subTab: SubTab;
    euSubTab: EUSubTab;
    servingRef: USAServingRef;
    measure: USAMeasure;
}
// ─── Segmented control (44px touch targets) ───────────────────────────────────
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

// ─── Modal opzioni esportazione — stessa logica di DownloadTableModal (desktop):
// opzioni + anteprima live della tabella + cattura PNG interna (html2canvas). ──
export function ExportOptionsModal({
    region, showLayout, showColonne, showRiferimento, showUnita, ue, nation, productName, renderPreview, onClose,
}: {
    region: Region;
    showLayout: boolean;
    showColonne: boolean;
    showRiferimento: boolean;
    showUnita: boolean;
    ue: { porzione?: number; confezione?: number; pezzo?: number };
    nation: { confezione?: number; cup?: number; cucchiaio?: number; pezzo?: number };
    productName: string;
    renderPreview: (format: ExportFormat) => React.ReactNode;
    onClose: () => void;
}) {
    const [subTab, setSubTab] = useState<SubTab>('verticale');
    const [euSubTab, setEuSubTab] = useState<EUSubTab>('100g');
    const [servingRef, setServingRef] = useState<USAServingRef>('serving');
    const [measure, setMeasure] = useState<USAMeasure>('g');
    const [downloading, setDownloading] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        const container = previewRef.current;
        if (!container) return;
        const target = container.querySelector<HTMLElement>('[data-table-export]') ?? container;
        setDownloading(true);
        setExportError(null);

        // html2canvas rispetta overflow dei parent anche quando si targetta un elemento specifico.
        // Traversa tutti gli antenati fino a body, disabilita overflow temporaneamente.
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
                // Forza viewport desktop: impedisce che html2canvas clippi le tabelle
                // a larghezza mobile (es. USA lineare = 740px su iPhone SE = 375px).
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
                : region === 'UE' ? euLabels[euSubTab]
                : '';
            const baseName = productName || 'tabella';
            const fileName = formato
                ? `${baseName} - tabella ${region} - ${formato}.png`
                : `${baseName} - tabella ${region}.png`;
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            // appendChild necessario su mobile browser (Safari iOS ignora link.click() senza DOM)
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('PNG Export error:', e);
            setExportError("Errore durante l'esportazione della tabella in PNG.");
        } finally {
            overflowFixes.forEach(({ el, overflowX, overflowY, scrollLeft }) => {
                el.style.overflowX = overflowX;
                el.style.overflowY = overflowY;
                el.scrollLeft = scrollLeft;
            });
            setDownloading(false);
        }
    };

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    // Portal su body: il modal è montato dentro .m-slide-track (transform: translateX),
    // che rompe position:fixed — senza portal lo sheet finisce clippato/fuori viewport.
    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Opzioni esportazione ${region}`}
            style={{ position: 'fixed', inset: 0, background: 'rgba(12,19,38,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
            onClick={onClose}
        >
            <div
                style={{ background: '#fff', width: '100%', maxHeight: '80vh', overflowY: 'auto', borderRadius: '16px 16px 0 0', padding: 16 }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--m-text)' }}>Opzioni esportazione — {region}</span>
                    <button type="button" onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--m-text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                {showLayout && (
                    <SegmentedControl<SubTab>
                        label="Layout"
                        options={[
                            { v: 'verticale', label: 'Verticale' },
                            { v: 'orizzontale', label: 'Orizzontale' },
                            { v: 'lineare', label: 'Lineare' },
                        ]}
                        value={subTab} onChange={setSubTab}
                    />
                )}
                {showColonne && (
                    <SegmentedControl<EUSubTab>
                        label="Colonne"
                        options={[
                            { v: '100g', label: 'per 100g' },
                            { v: 'porzione', label: 'Porzione', disabled: ue.porzione == null },
                            { v: 'uv', label: 'Confezione', disabled: ue.confezione == null },
                            { v: 'pezzo', label: 'Pezzo', disabled: ue.pezzo == null },
                        ]}
                        value={euSubTab} onChange={setEuSubTab}
                    />
                )}
                {showRiferimento && (
                    <SegmentedControl<USAServingRef>
                        label="Riferimento"
                        options={[
                            { v: 'serving', label: 'Porzione' },
                            { v: 'confezione', label: 'Confezione', disabled: !nation.confezione },
                        ]}
                        value={servingRef} onChange={setServingRef}
                    />
                )}
                {showUnita && (
                    <SegmentedControl<USAMeasure>
                        label="Unità"
                        options={[
                            { v: 'g', label: 'g' },
                            { v: 'tazze', label: 'Tazze', disabled: !nation.cup },
                            { v: 'cucchiai', label: 'Cucchiai', disabled: !nation.cucchiaio },
                            { v: 'pezzi', label: 'Pezzi', disabled: !nation.pezzo },
                        ]}
                        value={measure} onChange={setMeasure}
                    />
                )}

                {/* Anteprima live della tabella col formato scelto (come desktop) */}
                <div
                    ref={previewRef}
                    style={{
                        border: '1px solid var(--color-border)', borderRadius: 8,
                        padding: 12, marginTop: 8, overflowX: 'auto',
                        display: 'flex', justifyContent: 'center', background: '#fff',
                    }}
                >
                    {renderPreview({ subTab, euSubTab, servingRef, measure })}
                </div>

                {exportError && (
                    <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '8px 0 0' }}>{exportError}</p>
                )}

                <button
                    type="button"
                    className="m-btn m-btn--accent"
                    style={{ width: '100%', marginTop: 10 }}
                    disabled={downloading}
                    onClick={handleDownload}
                >
                    {downloading ? 'Generazione…' : 'Scarica PNG'}
                </button>
            </div>
        </div>,
        document.body
    );
}
