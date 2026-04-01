import { useState, useMemo, useRef } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceLine, ResponsiveContainer, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../../auth/AuthContext';
import { useArchive } from '../../hooks/useArchive';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ArchiveModal } from '../../components/ArchiveModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProcessMode = 'sterilizzazione' | 'pastorizzazione';

interface MeasurementRow {
    id: string;
    tPuntuale: string;   // input: puntual time (min)
    temperature: string; // input: temperature (°C)
}

interface ProductData {
    prodotto: string;
    formato: string;
    dataProduzioneInput: string;
    lotto: string;
    tmc: string;
}

interface MicroorgData {
    microrganismo: string;
    tRif: string;
    dValue: string;
    zValue: string;
    nRiduzioni: string;
}

interface F0ArchiveData {
    mode: ProcessMode;
    product: ProductData;
    microorg: MicroorgData;
    annotazioni: string;
    oraInizio: string;
    oraFine: string;
    rows: MeasurementRow[];
}

// ─── Default configs ──────────────────────────────────────────────────────────

const STERILIZZAZIONE_MICROORG: MicroorgData = {
    microrganismo: 'Clostridium Botulinum',
    tRif: '121.1',
    dValue: '0.25',
    zValue: '10',
    nRiduzioni: '12',
};

const PASTORIZZAZIONE_MICROORG: MicroorgData = {
    microrganismo: 'Staphilococcus Aureus',
    tRif: '75',
    dValue: '0.2',
    zValue: '10',
    nRiduzioni: '20',
};

const STERILIZZAZIONE_MIN_TEMP = 100;
const PASTORIZZAZIONE_MIN_TEMP = 60;

// Reference tables for tooltip/info panel
const REF_STERILIZZAZIONE = [
    { name: 'Clostridium Botulinum tipo A e B', tRif: 121, d: '0.1 – 0.25', z: 10 },
    { name: 'Bacillus Stearothermophilus', tRif: 121, d: '4 – 5', z: 10 },
    { name: 'Clostridium Thermosaccharolyticum', tRif: 121, d: '3 – 4', z: 10 },
];
const REF_PASTORIZZAZIONE = [
    { name: 'Salmonelle spp', tRif: 65, d: '0.1 – 0.25', z: 5 },
    { name: 'Staphilococcus Aureus', tRif: 65, d: '0.5 – 2', z: 10 },
    { name: 'Listeria Monocytogenes', tRif: 65, d: '0.5 – 0.8', z: 5 },
];

function makeId() {
    return Math.random().toString(36).slice(2);
}

function makeEmptyRow(): MeasurementRow {
    return { id: makeId(), tPuntuale: '0.2', temperature: '' };
}

// ─── Calculation engine ───────────────────────────────────────────────────────

interface ComputedRow {
    tProgressivo: number;   // cumulative time
    tPuntuale: number;
    temperature: number;
    fPuntuale: number;      // lethal value for this interval
    f0Progressivo: number;  // cumulative F0
    diff: number;           // f0Progressivo - f0Obiettivo
}

function computeRows(
    rows: MeasurementRow[],
    tRif: number,
    z: number,
    f0Obiettivo: number,
    minTemp: number,
): ComputedRow[] {
    const result: ComputedRow[] = [];
    let cumTime = 0;
    let cumF0 = 0;

    for (let i = 0; i < rows.length; i++) {
        const tp = parseFloat(rows[i].tPuntuale) || 0;
        const T = parseFloat(rows[i].temperature);
        cumTime += tp;

        // Only temperatures above threshold contribute
        const lethality = (!isNaN(T) && T >= minTemp)
            ? tp * Math.pow(10, (T - tRif) / z)
            : 0;

        cumF0 += lethality;

        result.push({
            tProgressivo: cumTime,
            tPuntuale: tp,
            temperature: isNaN(T) ? 0 : T,
            fPuntuale: lethality,
            f0Progressivo: cumF0,
            diff: cumF0 - f0Obiettivo,
        });
    }
    return result;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TrattamentoTermicoCalc() {
    const { user } = useAuth();

    // Mode tabs
    const [mode, setMode] = useState<ProcessMode>('sterilizzazione');

    // Product data
    const [product, setProduct] = useState<ProductData>({
        prodotto: '', formato: '', dataProduzioneInput: '', lotto: '', tmc: '',
    });

    // Microorganism parameters
    const [microorg, setMicroorg] = useState<MicroorgData>(STERILIZZAZIONE_MICROORG);

    // Annotations
    const [annotazioni, setAnnotazioni] = useState('');

    // Time range
    const [oraInizio, setOraInizio] = useState('');
    const [oraFine, setOraFine] = useState('');

    // Measurement rows
    const [rows, setRows] = useState<MeasurementRow[]>([makeEmptyRow()]);

    // Show/hide reference table
    const [showRefTable, setShowRefTable] = useState(false);

    // Quick-guide open/closed – persisted in localStorage with useLocalStorage hook
    const [guideOpen, setGuideOpen] = useLocalStorage<boolean>('f0_guide_open', true);
    const toggleGuide = () => setGuideOpen(prev => !prev);

    // Archive
    const { items: savedItems, saveItem, deleteItem } = useArchive<F0ArchiveData>('aea_archive_f0');
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [currentId, setCurrentId] = useState<string | undefined>(undefined);
    const [currentName, setCurrentName] = useState('');

    // Chart ref for PDF export
    const chartRef = useRef<HTMLDivElement>(null);

    // ── Derived values ──────────────────────────────────────────────────────

    const tRif = parseFloat(microorg.tRif) || 121.1;
    const z = parseFloat(microorg.zValue) || 10;
    const d = parseFloat(microorg.dValue) || 0.25;
    const nRid = parseFloat(microorg.nRiduzioni) || 12;
    const f0Obiettivo = d * nRid;
    const minTemp = mode === 'sterilizzazione' ? STERILIZZAZIONE_MIN_TEMP : PASTORIZZAZIONE_MIN_TEMP;

    const computed = useMemo(
        () => computeRows(rows, tRif, z, f0Obiettivo, minTemp),
        [rows, tRif, z, f0Obiettivo, minTemp],
    );

    const totalTime = computed.length > 0 ? computed[computed.length - 1].tProgressivo : 0;
    const f0Reached = computed.length > 0 ? computed[computed.length - 1].f0Progressivo : 0;
    const isAdequate = f0Reached >= f0Obiettivo;

    // Chart data
    const chartData = computed.map((r) => ({
        t: parseFloat(r.tProgressivo.toFixed(1)),
        f0: parseFloat(r.f0Progressivo.toFixed(4)),
    }));

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleModeChange = (m: ProcessMode) => {
        setMode(m);
        setMicroorg(m === 'sterilizzazione' ? STERILIZZAZIONE_MICROORG : PASTORIZZAZIONE_MICROORG);
    };

    const updateRow = (id: string, field: keyof MeasurementRow, value: string) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const addRow = () => setRows(prev => [...prev, makeEmptyRow()]);

    const removeRow = (id: string) => {
        setRows(prev => prev.filter(r => r.id !== id));
    };

    const handleSave = () => {
        const name = currentName || prompt('Nome per questo calcolo F0:', `${product.prodotto || 'F0'} — ${new Date().toLocaleDateString('it-IT')}`);
        if (!name) return;
        const id = saveItem(name, { mode, product, microorg, annotazioni, oraInizio, oraFine, rows }, currentId);
        setCurrentId(id);
        setCurrentName(name);
        alert('Salvato nell\'archivio!');
    };

    const handleLoad = (item: any) => {
        const d = item.data as F0ArchiveData;
        setMode(d.mode || 'sterilizzazione');
        setProduct(d.product || { prodotto: '', formato: '', dataProduzioneInput: '', lotto: '', tmc: '' });
        setMicroorg(d.microorg || STERILIZZAZIONE_MICROORG);
        setAnnotazioni(d.annotazioni || '');
        setOraInizio(d.oraInizio || '');
        setOraFine(d.oraFine || '');
        setRows(d.rows || [makeEmptyRow()]);
        setCurrentId(item.id);
        setCurrentName(item.name);
        setIsArchiveOpen(false);
    };

    const handleNew = () => {
        if (!confirm('Iniziare un nuovo calcolo? I dati non salvati andranno persi.')) return;
        setMode('sterilizzazione');
        setProduct({ prodotto: '', formato: '', dataProduzioneInput: '', lotto: '', tmc: '' });
        setMicroorg(STERILIZZAZIONE_MICROORG);
        setAnnotazioni('');
        setOraInizio('');
        setOraFine('');
        setRows([makeEmptyRow()]);
        setCurrentId(undefined);
        setCurrentName('');
    };

    // ── PDF Export ───────────────────────────────────────────────────────────

    const handlePDF = async () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const PAGE_W = 210;
        const MARGIN = 14;
        const CW = PAGE_W - MARGIN * 2;
        let y = 0;

        // Header
        doc.setFillColor(12, 19, 38);
        doc.rect(0, 0, PAGE_W, 38, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18); doc.setFont('helvetica', 'bold');
        doc.text('AEA Consulenze Alimentari', MARGIN, 14);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text(`Calcolo F0 — ${mode === 'sterilizzazione' ? 'Sterilizzazione' : 'Pastorizzazione'}`, MARGIN, 24);
        doc.setFontSize(8);
        doc.text('www.aeaconsulenzealimentari.it', MARGIN, 32);
        y = 46;

        // Product info
        const prodLines = [
            ['Prodotto', product.prodotto || '—'],
            ['Formato', product.formato || '—'],
            ['Data produzione', product.dataProduzioneInput || '—'],
            ['Lotto', product.lotto || '—'],
            ['T.M.C.', product.tmc || '—'],
            ['Operatore', user?.name ?? '—'],
            ['Azienda', user?.company ?? '—'],
        ];
        doc.setFillColor(240, 243, 248);
        doc.rect(MARGIN, y, CW, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(12, 19, 38);
        doc.text('DATI PRODOTTO', MARGIN + 3, y + 5);
        y += 10;
        prodLines.forEach(([label, val], i) => {
            if (i % 2 === 0) { doc.setFillColor(249, 250, 252); doc.rect(MARGIN, y - 1, CW, 6.5, 'F'); }
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 100);
            doc.text(label + ':', MARGIN + 2, y + 4);
            doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
            doc.text(val, MARGIN + CW / 2, y + 4);
            y += 7;
        });
        y += 4;

        // Microorganism
        doc.setFillColor(240, 243, 248);
        doc.rect(MARGIN, y, CW, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(12, 19, 38);
        doc.text('MICRORGANISMO BERSAGLIO', MARGIN + 3, y + 5);
        y += 10;
        const microLines = [
            ['Microrganismo', microorg.microrganismo],
            ['T riferimento', `${microorg.tRif} °C`],
            ['Valore D', `${microorg.dValue} min`],
            ['Valore Z', `${microorg.zValue} °C`],
            ['N° riduzioni decimali', microorg.nRiduzioni],
            ['F0 obiettivo', `${f0Obiettivo.toFixed(2)} min`],
        ];
        microLines.forEach(([label, val], i) => {
            if (i % 2 === 0) { doc.setFillColor(249, 250, 252); doc.rect(MARGIN, y - 1, CW, 6.5, 'F'); }
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 100);
            doc.text(label + ':', MARGIN + 2, y + 4);
            doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
            doc.text(val, MARGIN + CW / 2, y + 4);
            y += 7;
        });
        y += 4;

        // Time + notes
        doc.setFillColor(240, 243, 248);
        doc.rect(MARGIN, y, CW, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(12, 19, 38);
        doc.text('PROCESSO', MARGIN + 3, y + 5);
        y += 10;
        const procLines = [
            ['Ora inizio', oraInizio || '—'],
            ['Ora fine', oraFine || '—'],
            ['Annotazioni', annotazioni || '—'],
        ];
        procLines.forEach(([label, val], i) => {
            if (i % 2 === 0) { doc.setFillColor(249, 250, 252); doc.rect(MARGIN, y - 1, CW, 6.5, 'F'); }
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 100);
            doc.text(label + ':', MARGIN + 2, y + 4);
            doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
            const wrapped = doc.splitTextToSize(val, CW - CW / 2 - 4);
            doc.text(wrapped, MARGIN + CW / 2, y + 4);
            y += 7;
        });
        y += 6;

        // Results summary box
        const esito = isAdequate ? '✓ OBIETTIVO RAGGIUNTO' : '✗ OBIETTIVO NON RAGGIUNTO';
        doc.setFillColor(isAdequate ? [230, 250, 235] as any : [255, 235, 235] as any);
        doc.roundedRect(MARGIN, y, CW, 26, 3, 3, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(12, 19, 38);
        doc.text('RIEPILOGO RISULTATI', MARGIN + 4, y + 7);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        doc.text(`Tempo totale: ${totalTime.toFixed(1)} min`, MARGIN + 4, y + 14);
        doc.text(`F0 obiettivo: ${f0Obiettivo.toFixed(2)} min`, MARGIN + 4, y + 20);
        doc.text(`F0 raggiunto: ${f0Reached.toFixed(4)} min`, MARGIN + CW / 2, y + 14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(isAdequate ? 30 : 200, isAdequate ? 130 : 30, 30);
        doc.text(esito, MARGIN + CW / 2, y + 20);
        y += 32;

        // Table on new page if needed
        if (y > 200) { doc.addPage(); y = 14; }

        doc.setFillColor(12, 19, 38);
        doc.rect(MARGIN, y, CW, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
        const cols = ['T.prog (min)', 'T.punt (min)', 'Temp (°C)', 'F punt.', 'F0 prog.', 'Diff.'];
        const colW = [CW / 6, CW / 6, CW / 6, CW / 6, CW / 6, CW / 6];
        let cx = MARGIN + 2;
        cols.forEach((c, i) => { doc.text(c, cx, y + 5); cx += colW[i]; });
        y += 9;

        computed.forEach((row, i) => {
            if (y > 275) { doc.addPage(); y = 14; }
            if (i % 2 === 0) { doc.setFillColor(249, 250, 252); doc.rect(MARGIN, y - 1, CW, 6, 'F'); }
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
            doc.setTextColor(row.diff >= 0 ? 30 : 200, row.diff >= 0 ? 100 : 30, 30);
            const vals = [
                row.tProgressivo.toFixed(1),
                row.tPuntuale.toFixed(1),
                row.temperature.toFixed(1),
                row.fPuntuale.toFixed(4),
                row.f0Progressivo.toFixed(4),
                row.diff.toFixed(4),
            ];
            cx = MARGIN + 2;
            vals.forEach((v, vi) => { doc.text(v, cx, y + 4); cx += colW[vi]; });
            y += 6;
        });

        // Try chart canvas
        if (chartRef.current) {
            try {
                const canvas = await html2canvas(chartRef.current, { scale: 1.5, backgroundColor: '#ffffff' });
                const imgData = canvas.toDataURL('image/png');
                doc.addPage();
                doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(12, 19, 38);
                doc.text('GRAFICO F0 PROGRESSIVO', MARGIN, 16);
                doc.addImage(imgData, 'PNG', MARGIN, 22, CW, CW * 0.45);
            } catch (e) {
                console.warn('Chart not included in PDF:', e);
            }
        }

        // Footer
        const pCount = (doc as any).internal.getNumberOfPages();
        for (let p = 1; p <= pCount; p++) {
            doc.setPage(p);
            doc.setFillColor(245, 247, 250); doc.rect(0, 285, PAGE_W, 12, 'F');
            doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(120, 120, 140);
            doc.text('Report AEA Consulenze Alimentari — Documento riservato', MARGIN, 291);
            doc.text(`Pag. ${p}/${pCount}`, PAGE_W - MARGIN - 10, 291);
        }

        const prodName = (product.prodotto || 'F0').replace(/\s+/g, '-');
        const dateStr = new Date().toISOString().slice(0, 10);
        doc.save(`F0_${prodName}_${dateStr}.pdf`);
    };

    // ── Check warnings ──────────────────────────────────────────────────────

    const hasLowTempWarning = rows.some(r => {
        const T = parseFloat(r.temperature);
        return !isNaN(T) && T < minTemp && T > 0;
    });

    const refTable = mode === 'sterilizzazione' ? REF_STERILIZZAZIONE : REF_PASTORIZZAZIONE;

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div>
            {isArchiveOpen && (
                <ArchiveModal
                    items={savedItems}
                    currentId={currentId}
                    onClose={() => setIsArchiveOpen(false)}
                    onLoad={handleLoad}
                    onDelete={deleteItem}
                    renderItemDetails={(d) => (
                        <>
                            <span><strong>Tipo:</strong> {d.mode}</span><br />
                            <span><strong>Prodotto:</strong> {d.product?.prodotto || '—'}</span><br />
                            <span><strong>F0 obiettivo:</strong> {((parseFloat(d.microorg?.dValue) || 0) * (parseFloat(d.microorg?.nRiduzioni) || 0)).toFixed(2)} min</span>
                        </>
                    )}
                />
            )}

            {/* Page Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1>🌡️ Calcolo F0 — Indice di Letalità</h1>
                    <p>Sterilizzazione &amp; Pastorizzazione — Modello Bigelow (F₀ = ∫ 10^((T−T<sub>rif</sub>)/z) dt)</p>
                    {currentId && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,126,46,0.1)', color: 'var(--color-accent)', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, marginTop: 6 }}>
                            ✏️ In modifica: {currentName}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" onClick={handleNew}>✨ Nuovo</button>
                    <button className="btn btn-outline" onClick={() => setIsArchiveOpen(true)}>📂 Archivio ({savedItems.length})</button>
                    <button className="btn btn-accent" onClick={handleSave}>💾 {currentId ? 'Aggiorna' : 'Salva'}</button>
                    <button className="btn btn-outline" onClick={handlePDF} style={{ borderColor: 'var(--color-navy)', color: 'var(--color-navy)' }}>📄 PDF</button>
                </div>
            </div>

            {/* ── Quick Guide ─────────────────────────────────────────────────── */}
            <div style={{ marginBottom: 20, border: '1.5px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--color-bg, #fff)' }}>
                {/* Guide header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--color-bg-secondary, #f8f9fb)', borderBottom: guideOpen ? '1px solid var(--color-border)' : 'none' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-navy)' }}>
                        📖 Come usare il calcolo F0 — guida rapida
                    </span>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={toggleGuide}>
                        {guideOpen ? 'Nascondi guida' : 'Mostra guida'}
                    </button>
                </div>

                {/* Guide body */}
                <div style={{
                    maxHeight: guideOpen ? '1200px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.35s ease',
                }}>
                    <div style={{ padding: '18px 18px 6px' }}>
                        {/* 7-step card grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
                            {/* STEP 1 */}
                            <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>STEP 1</div>
                                <div style={{ fontSize: 20 }}>🧪</div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>Scegli la modalità</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>Tab Sterilizzazione per conserve. Tab Pastorizzazione per prodotti freschi.</div>
                                <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, background: '#f0f0f0', color: '#555', borderRadius: 20, padding: '3px 10px' }}>entrambe le modalità</span>
                                </div>
                            </div>

                            {/* STEP 2 */}
                            <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>STEP 2</div>
                                <div style={{ fontSize: 20 }}>📋</div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>Dati prodotto</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>Inserisci nome, formato, lotto, data produzione e TMC.</div>
                                <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, background: '#f0f0f0', color: '#555', borderRadius: 20, padding: '3px 10px' }}>obbligatorio</span>
                                </div>
                            </div>

                            {/* STEP 3 */}
                            <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>STEP 3</div>
                                <div style={{ fontSize: 20 }}>🦠</div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>Microrganismo bersaglio</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>Preimpostato: Cl. Botulinum (steril.) o Staph. Aureus (past.). Modificabile se necessario.</div>
                                <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, background: '#f0f0f0', color: '#555', borderRadius: 20, padding: '3px 10px' }}>editabile</span>
                                </div>
                            </div>

                            {/* STEP 4 */}
                            <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>STEP 4</div>
                                <div style={{ fontSize: 20 }}>🌡️</div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>Inserisci i dati rilevati</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>Quando la sonda raggiunge la soglia, inserisci tempo e temperatura riga per riga.</div>
                                <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, padding: '3px 10px', display: 'inline-block' }}>≥ 100°C sterilizzazione</span>
                                    <span style={{ fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#166534', borderRadius: 20, padding: '3px 10px', display: 'inline-block' }}>≥ 60°C pastorizzazione</span>
                                </div>
                            </div>

                            {/* STEP 5 */}
                            <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>STEP 5</div>
                                <div style={{ fontSize: 20 }}>📈</div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>Monitora il grafico</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>Il valore F0 progressivo sale in tempo reale. La linea tratteggiata rossa è il tuo obiettivo.</div>
                                <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, background: '#f0f0f0', color: '#555', borderRadius: 20, padding: '3px 10px' }}>automatico</span>
                                </div>
                            </div>

                            {/* STEP 6 */}
                            <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>STEP 6</div>
                                <div style={{ fontSize: 20 }}>✅</div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>Verifica obiettivo</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>Valori in rosso = obiettivo non raggiunto. Valori in verde = processo sicuro e completato.</div>
                                <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, background: '#f0f0f0', color: '#555', borderRadius: 20, padding: '3px 10px' }}>semaforo rosso/verde</span>
                                </div>
                            </div>

                            {/* STEP 7 */}
                            <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>STEP 7</div>
                                <div style={{ fontSize: 20 }}>📄</div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>Salva e scarica</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>Archivia il calcolo e scarica il report PDF da conservare con la documentazione del lotto.</div>
                                <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, background: '#f0f0f0', color: '#555', borderRadius: 20, padding: '3px 10px' }}>HACCP</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 0 12px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingBottom: 16 }}>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span>💡</span>
                                <span>La formula è certificata: confrontata con software autoclave professionale, scarto &lt; 2%.</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span>⚠️</span>
                                <span>Inserisci temperature sia in riscaldamento che in raffreddamento — entrambe contribuiscono all'F0.</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span>💾</span>
                                <span>Lavora sempre su un calcolo nuovo — usa l'archivio per recuperare i calcoli precedenti.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mode Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--color-border)', width: 'fit-content' }}>
                {(['sterilizzazione', 'pastorizzazione'] as ProcessMode[]).map(m => (
                    <button
                        key={m}
                        onClick={() => handleModeChange(m)}
                        style={{
                            padding: '10px 28px', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
                            background: mode === m ? 'linear-gradient(135deg,var(--color-orange),var(--color-orange-hover))' : 'white',
                            color: mode === m ? 'white' : 'var(--color-text-muted)',
                            transition: 'all .2s',
                        }}
                    >
                        {m === 'sterilizzazione' ? '🧪 Sterilizzazione' : '🌡️ Pastorizzazione'}
                    </button>
                ))}
            </div>

            {/* SECTION 1 — Product Data */}
            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>📋 Dati Prodotto</h3>
                <div className="form-row">
                    <div className="form-field">
                        <label className="form-label">Prodotto</label>
                        <input className="form-input" type="text" value={product.prodotto} onChange={e => setProduct(p => ({ ...p, prodotto: e.target.value }))} placeholder="Es. Ragù di carne" />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Formato</label>
                        <input className="form-input" type="text" value={product.formato} onChange={e => setProduct(p => ({ ...p, formato: e.target.value }))} placeholder="Es. Vasetto 200g" />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-field">
                        <label className="form-label">Data di produzione</label>
                        <input className="form-input" type="date" value={product.dataProduzioneInput} onChange={e => setProduct(p => ({ ...p, dataProduzioneInput: e.target.value }))} />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Lotto</label>
                        <input className="form-input" type="text" value={product.lotto} onChange={e => setProduct(p => ({ ...p, lotto: e.target.value }))} placeholder="Es. L240319" />
                    </div>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">T.M.C. (Termine Minimo di Conservazione)</label>
                    <input className="form-input" type="text" value={product.tmc} onChange={e => setProduct(p => ({ ...p, tmc: e.target.value }))} placeholder="Es. 31/12/2026" />
                </div>
            </div>

            {/* SECTION 2 — Microorganism */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>🦠 Microrganismo Bersaglio</h3>
                    <button
                        className="btn btn-outline"
                        style={{ fontSize: 12, padding: '5px 12px' }}
                        onClick={() => setShowRefTable(v => !v)}
                    >
                        📋 {showRefTable ? 'Nascondi' : 'Mostra'} riferimenti
                    </button>
                </div>

                {showRefTable && (
                    <div style={{ marginBottom: 20, border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ background: 'var(--color-navy)', color: 'white', padding: '8px 14px', fontSize: 12, fontWeight: 700 }}>
                            {mode === 'sterilizzazione' ? '🧪 Riferimenti Sterilizzazione' : '🌡️ Riferimenti Pastorizzazione'}
                        </div>
                        <table className="result-table" style={{ margin: 0 }}>
                            <thead>
                                <tr>
                                    <th>Microrganismo</th>
                                    <th>T rif. (°C)</th>
                                    <th>Valore D (min)</th>
                                    <th>Valore Z (°C)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refTable.map((row, i) => (
                                    <tr key={i}>
                                        <td>{row.name}</td>
                                        <td>{row.tRif}</td>
                                        <td>{row.d}</td>
                                        <td>{row.z}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="form-row">
                    <div className="form-field" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Microrganismo</label>
                        <input className="form-input" type="text" value={microorg.microrganismo} onChange={e => setMicroorg(m => ({ ...m, microrganismo: e.target.value }))} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">T riferimento (°C)</label>
                        <input className="form-input" type="number" step={0.1} value={microorg.tRif} onChange={e => setMicroorg(m => ({ ...m, tRif: e.target.value }))} />
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">Valore D (min)</label>
                        <input className="form-input" type="number" step={0.01} value={microorg.dValue} onChange={e => setMicroorg(m => ({ ...m, dValue: e.target.value }))} />
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">Valore Z (°C)</label>
                        <input className="form-input" type="number" step={0.5} value={microorg.zValue} onChange={e => setMicroorg(m => ({ ...m, zValue: e.target.value }))} />
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">N° riduzioni decimali</label>
                        <input className="form-input" type="number" step={1} value={microorg.nRiduzioni} onChange={e => setMicroorg(m => ({ ...m, nRiduzioni: e.target.value }))} />
                    </div>
                </div>

                {/* F0 target computed */}
                <div style={{ background: 'linear-gradient(135deg,rgba(255,126,46,0.08),rgba(12,19,38,0.04))', border: '1.5px solid rgba(255,126,46,0.25)', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-orange)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>F₀ obiettivo (D × n° riduzioni)</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-navy)' }}>{f0Obiettivo.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 500 }}>min</span></div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                        = {microorg.dValue} × {microorg.nRiduzioni} = {f0Obiettivo.toFixed(2)} min
                    </div>
                </div>
            </div>

            {/* SECTION 3 — Annotations */}
            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📝 Annotazioni</h3>
                <div className="form-field" style={{ marginBottom: 0 }}>
                    <textarea
                        className="form-input"
                        rows={3}
                        value={annotazioni}
                        onChange={e => setAnnotazioni(e.target.value)}
                        placeholder="Es. Autoclave a vapore saturo, 45 vasetti, pressione 1.2 bar..."
                        style={{ resize: 'vertical' }}
                    />
                </div>
            </div>

            {/* SECTION 4 — Time range */}
            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>⏱️ Ora Inizio / Ora Fine</h3>
                <div className="form-row" style={{ marginBottom: 0 }}>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">Ora inizio (HH:MM)</label>
                        <input className="form-input" type="time" value={oraInizio} onChange={e => setOraInizio(e.target.value)} />
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">Ora fine (HH:MM)</label>
                        <input className="form-input" type="time" value={oraFine} onChange={e => setOraFine(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* SECTION 5 — Measurement Table */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>📊 Tabella Dati di Rilevazione</h3>
                    <button className="btn btn-accent" onClick={addRow} style={{ padding: '7px 16px', fontSize: 12 }}>+ Aggiungi riga</button>
                </div>

                {hasLowTempWarning && (
                    <div style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.35)', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 13, color: '#92400e' }}>
                        ⚠️ Alcune temperature sono sotto la soglia minima ({minTemp}°C) e non contribuiscono al calcolo F0.
                    </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                        <thead>
                            <tr style={{ background: 'var(--color-navy)' }}>
                                {['#', 'T. progressivo (min)', 'T. puntuale (min)', 'Temperatura (°C)', 'F puntuale', 'F0 progressivo', 'Diff. F0', ''].map((h, i) => (
                                    <th key={i} style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.8)', fontSize: 10.5, fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap', letterSpacing: '.03em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => {
                                const comp = computed[i];
                                const T = parseFloat(row.temperature);
                                const isBelowThreshold = !isNaN(T) && T > 0 && T < minTemp;
                                const diffPositive = comp ? comp.diff >= 0 : false;
                                return (
                                    <tr key={row.id} style={{ background: i % 2 === 0 ? '#fafbfc' : 'white' }}>
                                        <td style={{ padding: '6px 10px', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{i + 1}</td>
                                        <td style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, color: 'var(--color-navy)' }}>
                                            {comp ? comp.tProgressivo.toFixed(1) : '0.0'}
                                        </td>
                                        <td style={{ padding: '4px 6px' }}>
                                            <input
                                                type="number"
                                                step={0.1}
                                                min={0}
                                                value={row.tPuntuale}
                                                onChange={e => updateRow(row.id, 'tPuntuale', e.target.value)}
                                                style={{ width: 80, padding: '5px 8px', border: '1.5px solid var(--color-border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                                            />
                                        </td>
                                        <td style={{ padding: '4px 6px' }}>
                                            <input
                                                type="number"
                                                step={0.1}
                                                value={row.temperature}
                                                onChange={e => updateRow(row.id, 'temperature', e.target.value)}
                                                style={{
                                                    width: 90, padding: '5px 8px',
                                                    border: isBelowThreshold ? '1.5px solid var(--color-warning)' : '1.5px solid var(--color-border)',
                                                    borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                                                    background: isBelowThreshold ? 'rgba(217,119,6,0.07)' : 'white',
                                                }}
                                                placeholder={`≥${minTemp}`}
                                            />
                                        </td>
                                        <td style={{ padding: '6px 10px', fontSize: 12, color: 'var(--color-orange)', fontWeight: 700 }}>
                                            {comp ? comp.fPuntuale.toFixed(4) : '0.0000'}
                                        </td>
                                        <td style={{ padding: '6px 10px', fontSize: 12, fontWeight: 700, color: 'var(--color-navy)' }}>
                                            {comp ? comp.f0Progressivo.toFixed(4) : '0.0000'}
                                        </td>
                                        <td style={{
                                            padding: '6px 10px', fontSize: 12, fontWeight: 700,
                                            color: diffPositive ? 'var(--color-success)' : 'var(--color-danger)',
                                        }}>
                                            {comp ? (diffPositive ? '+' : '') + comp.diff.toFixed(4) : '—'}
                                        </td>
                                        <td style={{ padding: '4px 6px' }}>
                                            <button
                                                onClick={() => removeRow(row.id)}
                                                style={{ background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.25)', color: '#c53030', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14 }}
                                                title="Elimina riga"
                                            >🗑</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline" onClick={addRow} style={{ fontSize: 12, padding: '7px 16px' }}>+ Aggiungi riga</button>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                        {rows.length} righe — soglia minima {minTemp}°C per {mode}
                    </span>
                </div>
            </div>

            {/* SECTION 6 — Results Summary */}
            <div style={{
                background: isAdequate
                    ? 'linear-gradient(135deg,rgba(67,130,28,0.07),rgba(67,130,28,0.03))'
                    : 'linear-gradient(135deg,rgba(229,62,62,0.07),rgba(229,62,62,0.03))',
                border: `2px solid ${isAdequate ? 'rgba(67,130,28,0.35)' : 'rgba(229,62,62,0.35)'}`,
                borderRadius: 14, padding: '20px 24px', marginBottom: 20,
            }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--color-navy)' }}>📋 Riepilogo Risultati</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 16 }}>
                    {[
                        { label: 'Tempo totale esposizione', value: `${totalTime.toFixed(1)} min`, color: 'var(--color-navy)' },
                        { label: 'F₀ obiettivo', value: `${f0Obiettivo.toFixed(2)} min`, color: 'var(--color-orange)' },
                        { label: 'F₀ raggiunto', value: `${f0Reached.toFixed(4)} min`, color: isAdequate ? 'var(--color-success)' : 'var(--color-danger)' },
                        { label: 'Numero misurazioni', value: String(rows.length), color: 'var(--color-navy)' },
                    ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{label}</div>
                        </div>
                    ))}
                </div>
                <div style={{
                    background: isAdequate ? 'var(--color-success)' : 'var(--color-danger)',
                    color: 'white', borderRadius: 10, padding: '12px 20px', textAlign: 'center', fontSize: 16, fontWeight: 800, letterSpacing: '.05em',
                }}>
                    {isAdequate ? '✅ OBIETTIVO RAGGIUNTO' : '❌ OBIETTIVO NON RAGGIUNTO'}
                    <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 12, opacity: .85 }}>
                        F₀ = {f0Reached.toFixed(4)} min {isAdequate ? '≥' : '<'} {f0Obiettivo.toFixed(2)} min
                    </span>
                </div>
            </div>

            {/* SECTION 7 — Chart */}
            <div className="card" style={{ marginBottom: 20 }} ref={chartRef}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📈 Grafico F₀ Progressivo</h3>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" />
                            <XAxis
                                dataKey="t"
                                label={{ value: 'Tempo (min)', position: 'insideBottom', offset: -4, fontSize: 11 }}
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis
                                label={{ value: 'F₀ (min)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
                                tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                                formatter={(v: any) => [(Number(v) || 0).toFixed(4) + ' min', 'F₀ progressivo']}
                                labelFormatter={(l: any) => `Tempo: ${l} min`}
                                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <ReferenceLine
                                y={f0Obiettivo}
                                stroke="#e53e3e"
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                label={{ value: `F₀ ob. = ${f0Obiettivo.toFixed(2)}`, position: 'right', fontSize: 11, fill: '#e53e3e' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="f0"
                                name="F₀ progressivo"
                                stroke="var(--color-orange)"
                                strokeWidth={2.5}
                                dot={chartData.length <= 50}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                        Aggiungi misurazioni per visualizzare il grafico
                    </div>
                )}
            </div>
        </div>
    );
}
