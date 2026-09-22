import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { barcodeMetrics } from './barcodeUtils';

/**
 * Renderizza QR code, barcode Code128 o EAN-13.
 * - QR → canvas (QRCode.toCanvas API nativa)
 * - EAN-13 / Code128 → SVG vettoriale (JsBarcode su <svg>): la scala avviene ridimensionando
 *   il viewBox/width/height del SVG intero, NON il parametro `width` di JsBarcode che allarga
 *   le singole barre distorcendo il simbolo. Risultato: fedele alle spec GS1, nessuna perdita
 *   di definizione nell'export perché SVG è risoluzione-indipendente.
 */
export function CodeCanvas({ type, value, scale, pxPerMm }: { type: 'qr' | 'barcode' | 'ean13'; value: string; scale: number; pxPerMm: number }) {
    const svgRef = useRef<SVGSVGElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState('');

    // QR: canvas
    useEffect(() => {
        if (type !== 'qr') return;
        const canvas = canvasRef.current;
        if (!canvas || !value) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError('');
        const sidePx = Math.round(20 * (scale / 100) * pxPerMm);
        QRCode.toCanvas(canvas, value, { width: sidePx, margin: 0 })
            .catch(() => setError('Valore non valido per QR'));
    }, [type, value, scale, pxPerMm]);

    // EAN-13 / Code128: SVG — renderizza con width=1 (1px per modulo base) per avere le
    // proporzioni native del simbolo, poi imposta viewBox da quelle dimensioni e sovrascrive
    // width/height con i px target calcolati da barcodeMetrics. Scaling uniforme sull'intero
    // simbolo, senza toccare la larghezza delle singole barre.
    useEffect(() => {
        if (type === 'qr') return;
        const svg = svgRef.current;
        if (!svg || !value) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError('');
        if (type === 'ean13' && !/^\d{12,13}$/.test(value)) {
            setError('EAN-13 richiede 12 o 13 cifre numeriche');
            return;
        }
        const m = barcodeMetrics(scale, pxPerMm);
        try {
            JsBarcode(svg, value, {
                format: type === 'ean13' ? 'EAN13' : 'CODE128',
                width: 1,
                height: 50,
                displayValue: true,
                fontSize: 9,
                textMargin: 2,
                marginTop: 0,
                marginBottom: 2,
                marginLeft: type === 'ean13' ? 11 : 2,
                marginRight: type === 'ean13' ? 7 : 2,
                background: '#fff',
                lineColor: '#000',
            });
            const nW = parseFloat(svg.getAttribute('width') || '0');
            const nH = parseFloat(svg.getAttribute('height') || '0');
            if (nW > 0 && nH > 0) {
                svg.setAttribute('viewBox', `0 0 ${nW} ${nH}`);
                svg.setAttribute('width', String(Math.round(m.symbolWidthPx)));
                // height proporzionale all'aspect ratio naturale del SVG — così il resize
                // tramite maniglia scala l'intero simbolo uniformemente, non solo la larghezza.
                svg.setAttribute('height', String(Math.round(m.symbolWidthPx * nH / nW)));
            }
        } catch {
            setError(type === 'ean13' ? 'Codice EAN-13 non valido (check digit errato)' : 'Valore non valido per barcode');
        }
    }, [type, value, scale, pxPerMm]);

    if (!value) return null;
    return (
        <div style={{ display: 'inline-block' }}>
            {type === 'qr' ? <canvas ref={canvasRef} /> : <svg ref={svgRef} />}
            {error && <div style={{ fontSize: 9, color: '#c53030' }}>{error}</div>}
        </div>
    );
}
