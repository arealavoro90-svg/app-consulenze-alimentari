import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../../auth/AuthContext';
import { useArchive } from '../../hooks/useArchive';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ArchiveModal } from '../../components/ArchiveModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticalData {
    grassi: string;          // g/litro
    saturi: string;          // g/litro
    alcol: string;           // % vol
    tartarico: string;       // g/litro
    malico: string;          // g/litro
    volatile: string;        // g/litro
    residuoZucch: string;    // g/litro
    polialcoli: string;      // g/litro
    glicerolo: string;       // g/litro
    fibre: string;           // g/litro
    proteine: string;        // g/litro
    sale: string;            // g/litro
}

interface PackagingComponent {
    id: string;
    nome: string;
    codice: string;
    smaltimento: string;
}

interface LabelData {
    logoPresente: boolean;
    nomeCommerciale: string;
    categoriaVino: string;
    tenoreZuccheri: string;
    denominazioneOrigine: string;
    nomeDenominazione: string;
    regioneProvenienza: string;
    annataVendemmia: string;
    dichiarazioniVolontarie: string;
    ragioneSociale: string;
    paeseOrigine: string;
    prodottoImbottigliato: boolean;
    prodottoImbottigliatoTesto: string;
    usaQrCode: boolean;
    urlQrCode: string;
    allergenici: string;
    tracce: boolean;
    tracceSpecifiche: string;
    lotto: string;
    volumeNominale: string;
    tmcAttivo: boolean;
    tmcData: string;
    imballaggi: PackagingComponent[];
}

interface ViniArchiveData {
    analytical: AnalyticalData;
    label: LabelData;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultAnalytical: AnalyticalData = {
    grassi: '', saturi: '', alcol: '',
    tartarico: '0', malico: '0', volatile: '0',
    residuoZucch: '', polialcoli: '0', glicerolo: '0',
    fibre: '0', proteine: '', sale: '',
};

const defaultLabel: LabelData = {
    logoPresente: false,
    nomeCommerciale: '',
    categoriaVino: '',
    tenoreZuccheri: '',
    denominazioneOrigine: '',
    nomeDenominazione: '',
    regioneProvenienza: '',
    annataVendemmia: '',
    dichiarazioniVolontarie: '',
    ragioneSociale: '',
    paeseOrigine: 'PRODOTTO IN ITALIA',
    prodottoImbottigliato: false,
    prodottoImbottigliatoTesto: '',
    usaQrCode: false,
    urlQrCode: '',
    allergenici: 'SOLFITI',
    tracce: false,
    tracceSpecifiche: '',
    lotto: '',
    volumeNominale: '750 ml',
    tmcAttivo: false,
    tmcData: '',
    imballaggi: [{ id: '1', nome: 'Bottiglia', codice: 'GL 70', smaltimento: 'Raccolta vetro' }],
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIE_VINO = [
    'VINO SPUMANTE', 'VINO SPUMANTE DI QUALITÀ', 'VINO SPUMANTE DI QUALITÀ AROMATICO',
    'VINO SPUMANTE GASSIFICATO', 'VINO ROSSO', 'VINO ROSATO', 'VINO BIANCO',
    'VINO NUOVO ANCORA IN FERMENTAZIONE', 'VINO LIQUOROSO', 'VINO FRIZZANTE',
    'VINO FRIZZANTE GASSIFICATO', 'MOSTO DI UVE', 'MOSTO DI UVE PARZIALMENTE FERMENTATO',
    'MOSTO DI UVE PARZIALMENTE FERMENTATO OTTENUTO CON UVE APPASSITE',
    'MOSTO DI UVE CONCENTRATO', 'MOSTO DI UVE CONCENTRATO RETTIFICATO',
    'VINO OTTENUTO DA UVE APPASSITE', 'VINO DI UVE STRAMATURE',
];

const TENORI_ZUCCHERI = ['DOSAGGIO ZERO', 'EXTRA BRUT', 'BRUT', 'EXTRA DRY', 'DRY', 'DEMI-SEC', 'DOLCE'];

const DENOMINAZIONI_ORIGINE = [
    'Denominazione di Origine Protetta',
    'Indicazione Geografica Protetta',
    'Denominazione di Origine Controllata',
    'Denominazione di Origine Controllata e Garantita',
    'Indicazione Geografica Tipica',
];

const CODICI_SMALTIMENTO: Record<string, string> = {
    'PET 1': 'Raccolta plastica', 'HDPE 2': 'Raccolta plastica', 'PVC 3': 'Raccolta indifferenziata',
    'LDPE 4': 'Raccolta plastica', 'PP 5': 'Raccolta plastica', 'PS 6': 'Raccolta indifferenziata',
    'PAP 20': 'Raccolta carta/cartone', 'PAP 21': 'Raccolta carta/cartone', 'PAP 22': 'Raccolta carta/cartone',
    'FE 40': 'Raccolta metalli', 'ALU 41': 'Raccolta metalli/alluminio',
    'FOR 50': 'Raccolta legno', 'FOR 51': 'Raccolta legno',
    'TEX 60': 'Raccolta indifferenziata', 'TEX 61': 'Raccolta indifferenziata',
    'GL 70': 'Raccolta vetro', 'GL 71': 'Raccolta vetro', 'GL 72': 'Raccolta vetro',
    'C/PAP 80': 'Raccolta carta/cartone', 'C/FE 80': 'Raccolta metalli',
    'C/ALU 82': 'Raccolta metalli/alluminio', 'C/PET 81': 'Raccolta plastica',
    'OTHER 7': 'Raccolta indifferenziata',
};

const NOMI_COMPONENTI = ['Bottiglia', 'Capsula', 'Tappo', 'Etichetta', 'Retro-etichetta', 'Scatola'];

// ─── Nutrition Engine ─────────────────────────────────────────────────────────

interface NutritionResult {
    kj: number; kcal: number;
    grassiPer100: number; saturiPer100: number;
    carboPer100: number; zuccheriPer100: number;
    proteinePer100: number; salePer100: number;
}

function calcNutrition(a: AnalyticalData): NutritionResult {
    const g = (v: string) => parseFloat(v) || 0;
    const grassi = g(a.grassi); const saturi = g(a.saturi);
    const alcol = g(a.alcol); const tartarico = g(a.tartarico);
    const malico = g(a.malico); const volatile = g(a.volatile);
    const residuo = g(a.residuoZucch); const polialcoli = g(a.polialcoli);
    const glicerolo = g(a.glicerolo); const fibre = g(a.fibre);
    const proteine = g(a.proteine); const sale = g(a.sale);

    // Carboidrati auto = residuo + polialcoli + glicerolo (g/litro)
    const carbo = residuo + polialcoli + glicerolo;

    // Formula esatta replicata dall'Excel (verificata)
    const kj =
        (grassi / 10) * 37 +
        alcol * 22.91 +
        (tartarico / 10) * 13 +
        (malico / 10) * 13 +
        (volatile / 10) * 13 +
        (residuo / 10) * 17 +
        (polialcoli / 10) * 10 +
        (glicerolo / 10) * 17 +
        (fibre / 10) * 8 +
        (proteine / 10) * 17;

    const kcal =
        (grassi / 10) * 9 +
        alcol * 5.53 +
        (tartarico / 10) * 3 +
        (malico / 10) * 3 +
        (volatile / 10) * 3 +
        (residuo / 10) * 4 +
        (polialcoli / 10) * 2.4 +
        (glicerolo / 10) * 4 +
        (fibre / 10) * 2 +
        (proteine / 10) * 4;

    // Arrotondamenti UE
    const rnd1 = (v: number) => v < 0.5 ? 0 : Math.round(v * 10) / 10;
    const rndSale = (v: number) => v < 0.0125 ? 0 : Math.round(v * 100) / 100;

    return {
        kj, kcal,
        grassiPer100: rnd1(grassi / 10),
        saturiPer100: rnd1(saturi / 10),
        carboPer100: rnd1(carbo / 10),
        zuccheriPer100: rnd1(residuo / 10),
        proteinePer100: rnd1(proteine / 10),
        salePer100: rndSale(sale / 10),
    };
}

function fmt(n: number, decimals = 1): string {
    return n.toFixed(decimals).replace('.', ',');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ text, color }: { text: string; color: 'orange' | 'green' | 'gray' | 'yellow' | 'blue' }) {
    const styles: Record<string, React.CSSProperties> = {
        orange: { background: 'rgba(255,126,46,0.12)', color: '#c2510a', border: '1px solid rgba(255,126,46,0.3)' },
        green: { background: 'rgba(34,197,94,0.12)', color: '#15803d', border: '1px solid rgba(34,197,94,0.3)' },
        gray: { background: '#f0f0f0', color: '#555', border: '1px solid #ddd' },
        yellow: { background: 'rgba(234,179,8,0.12)', color: '#92400e', border: '1px solid rgba(234,179,8,0.3)' },
        blue: { background: 'rgba(59,130,246,0.12)', color: '#1d4ed8', border: '1px solid rgba(59,130,246,0.3)' },
    };
    return (
        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 9px', letterSpacing: '.04em', ...styles[color] }}>
            {text}
        </span>
    );
}

function LabelRow({
    label, badge, children, note,
}: { label: string; badge: React.ReactNode; children: React.ReactNode; note?: string }) {
    return (
        <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
                {badge}
            </div>
            {children}
            {note && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{note}</div>}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EtichetteViniCalc() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'nutrizionale' | 'etichetta' | 'anteprima'>('nutrizionale');

    // Guide — persisted in localStorage with useLocalStorage hook
    const [guideOpen, setGuideOpen] = useLocalStorage<boolean>('vini_guide_open', true);
    const toggleGuide = () => setGuideOpen(prev => !prev);

    // Data
    const [analytical, setAnalytical] = useState<AnalyticalData>(defaultAnalytical);
    const [label, setLabel] = useState<LabelData>(defaultLabel);

    // Archive
    const { items: savedItems, saveItem, deleteItem } = useArchive<ViniArchiveData>('aea_archive_vini');
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [currentId, setCurrentId] = useState<string | undefined>(undefined);
    const [currentName, setCurrentName] = useState('');

    // Refs
    const previewRef = useRef<HTMLDivElement>(null);

    // Derived
    const nutrition = calcNutrition(analytical);
    const isSpumante = analytical.alcol ? label.categoriaVino.includes('SPUMANTE') : false;
    const carboLitro = (parseFloat(analytical.residuoZucch) || 0) + (parseFloat(analytical.polialcoli) || 0) + (parseFloat(analytical.glicerolo) || 0);
    const titoloAlco = analytical.alcol ? `${parseFloat(analytical.alcol).toFixed(1).replace('.', ',')}% vol` : '';
    const energiaAuto = analytical.alcol ? `E (100 ml) = ${fmt(nutrition.kj, 2)} kJ / ${fmt(nutrition.kcal, 2)} kcal` : '';

    // Handlers
    const setA = (field: keyof AnalyticalData, val: string) => setAnalytical(p => ({ ...p, [field]: val }));
    const setL = (field: keyof LabelData, val: any) => setLabel(p => ({ ...p, [field]: val }));

    const addImballaggio = () => {
        if (label.imballaggi.length >= 5) return;
        setL('imballaggi', [...label.imballaggi, { id: String(Date.now()), nome: '', codice: '', smaltimento: '' }]);
    };
    const updateImballaggio = (id: string, field: keyof PackagingComponent, val: string) => {
        setL('imballaggi', label.imballaggi.map(i => {
            if (i.id !== id) return i;
            const updated = { ...i, [field]: val };
            if (field === 'codice') updated.smaltimento = CODICI_SMALTIMENTO[val] || '';
            return updated;
        }));
    };
    const removeImballaggio = (id: string) => setL('imballaggi', label.imballaggi.filter(i => i.id !== id));

    const handleSave = () => {
        const name = currentName || prompt('Nome per questa etichetta:', `${label.nomeCommerciale || 'Etichetta'} — ${new Date().toLocaleDateString('it-IT')}`);
        if (!name) return;
        const id = saveItem(name, { analytical, label }, currentId);
        setCurrentId(id);
        setCurrentName(name);
        alert('Salvato nell\'archivio!');
    };

    const handleLoad = (item: any) => {
        const d = item.data as ViniArchiveData;
        setAnalytical(d.analytical || defaultAnalytical);
        setLabel(d.label || defaultLabel);
        setCurrentId(item.id);
        setCurrentName(item.name);
        setIsArchiveOpen(false);
    };

    const handleNew = () => {
        if (!confirm('Iniziare una nuova etichetta? I dati non salvati andranno persi.')) return;
        setAnalytical(defaultAnalytical);
        setLabel(defaultLabel);
        setCurrentId(undefined);
        setCurrentName('');
    };

    const handlePDF = () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const M = 14; const CW = 210 - M * 2; let y = 0;
        doc.setFillColor(12, 19, 38);
        doc.rect(0, 0, 210, 36, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(17); doc.setFont('helvetica', 'bold');
        doc.text('AEA Consulenze Alimentari', M, 14);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text('Scheda Etichetta Vino — Reg. UE 2021/2117', M, 23);
        doc.setFontSize(8); doc.text('www.aeaconsulenzealimentari.it', M, 31);
        y = 44;

        const section = (title: string) => {
            doc.setFillColor(240, 243, 248); doc.rect(M, y, CW, 7, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(12, 19, 38);
            doc.text(title, M + 3, y + 5); y += 10;
        };
        const row = (lbl: string, val: string, i: number) => {
            if (i % 2 === 0) { doc.setFillColor(249, 250, 252); doc.rect(M, y - 1, CW, 6.5, 'F'); }
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 100);
            doc.text(lbl + ':', M + 2, y + 4);
            doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
            const w = doc.splitTextToSize(val || '—', CW - CW / 2 - 4);
            doc.text(w, M + CW / 2, y + 4);
            y += 7;
        };

        section('VALORI NUTRIZIONALI (per 100 ml)');
        [
            ['Energia', `${fmt(nutrition.kj, 2)} kJ / ${fmt(nutrition.kcal, 2)} kcal`],
            ['Grassi', `${fmt(nutrition.grassiPer100)} g`],
            ['di cui acidi grassi saturi', `${fmt(nutrition.saturiPer100)} g`],
            ['Carboidrati', `${fmt(nutrition.carboPer100)} g`],
            ['di cui zuccheri', `${fmt(nutrition.zuccheriPer100)} g`],
            ['Proteine', `${fmt(nutrition.proteinePer100)} g`],
            ['Sale', `${fmt(nutrition.salePer100, 2)} g`],
        ].forEach(([l, v], i) => row(l, v, i));
        y += 4;

        section('COMPOSIZIONE ETICHETTA');
        const labelRows = [
            ['Nome commerciale', label.nomeCommerciale],
            ['Categoria vino', label.categoriaVino],
            ['Denominazione origine', `${label.denominazioneOrigine} ${label.nomeDenominazione}`],
            ['Regione', label.regioneProvenienza],
            ['Annata vendemmia', label.annataVendemmia],
            ['Imbottigliatore', label.ragioneSociale],
            ['Paese origine', label.paeseOrigine],
            ['Titolo alcolometrico', titoloAlco],
            ['Volume nominale', label.volumeNominale],
            ['Lotto', label.lotto],
            ['Energia (automatico)', energiaAuto],
            ['Allergeni', `Contiene: ${label.allergenici}${label.tracce ? `. Può contenere tracce di: ${label.tracceSpecifiche}` : ''}`],
        ];
        labelRows.forEach(([l, v], i) => { if (v) row(l, v, i); });
        y += 4;

        if (label.imballaggi.length > 0) {
            if (y > 240) { doc.addPage(); y = 14; }
            section('SMALTIMENTO IMBALLAGGI');
            label.imballaggi.forEach((im, i) => row(`${im.nome}`, `${im.codice} — ${im.smaltimento}`, i));
        }

        const pCount = (doc as any).internal.getNumberOfPages();
        for (let p = 1; p <= pCount; p++) {
            doc.setPage(p);
            doc.setFillColor(245, 247, 250); doc.rect(0, 285, 210, 12, 'F');
            doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(120, 120, 140);
            doc.text('Report AEA Consulenze Alimentari — Documento riservato', M, 291);
            doc.text(`Utente: ${user?.name || ''} | ${user?.company || ''}`, 210 - M - 50, 291);
        }

        const safeName = (label.nomeCommerciale || 'vino').replace(/\s+/g, '-').toLowerCase();
        doc.save(`etichetta_vino_${safeName}.pdf`);
    };

    const handlePNG = async () => {
        if (!previewRef.current) return;
        try {
            const canvas = await html2canvas(previewRef.current, { scale: 3, backgroundColor: '#ffffff', logging: false, useCORS: true });
            const url = canvas.toDataURL('image/png', 1.0);
            const a = document.createElement('a');
            a.download = `etichetta_vino_${(label.nomeCommerciale || 'vino').replace(/\s+/g, '_').toLowerCase()}.png`;
            a.href = url; a.click();
        } catch (e) { alert('Errore esportazione PNG'); }
    };

    // ── Guide steps ──────────────────────────────────────────────────────────
    const guideSteps = [
        { n: 1, icon: '🔬', title: 'Inserisci i dati analitici', desc: 'Inserisci i valori del laboratorio (g/litro) nelle celle verdi. I carboidrati si calcolano in automatico.', badge: { text: 'dati di laboratorio', color: 'gray' as const } },
        { n: 2, icon: '📊', title: 'Verifica i valori nutrizionali', desc: 'Energia, grassi, carboidrati, proteine e sale vengono calcolati automaticamente per 100 ml.', badge: { text: 'calcolo automatico', color: 'green' as const } },
        { n: 3, icon: '✅', title: 'Compila le voci obbligatorie', desc: 'I badge colorati indicano: arancione = obbligatorio, giallo = dipende dal caso, verde = facoltativo.', badge: { text: 'obbligatorio', color: 'orange' as const } },
        { n: 4, icon: '📱', title: 'Scegli QR Code o dichiarazione diretta', desc: 'Puoi rimandare ingredienti e valori nutrizionali a una pagina web tramite QR Code, oppure dichiararli in etichetta.', badge: { text: 'scelta alternativa', color: 'gray' as const } },
        { n: 5, icon: '♻️', title: 'Inserisci smaltimento imballi', desc: 'Seleziona il codice di smaltimento per ogni componente dell\'imballaggio (bottiglia, capsula, tappo).', badge: { text: 'obbligatorio dal 2023', color: 'gray' as const } },
        { n: 6, icon: '📥', title: 'Esporta l\'etichetta', desc: 'Scarica la scheda etichetta come PDF o PNG ad alta risoluzione pronta per il grafico.', badge: { text: 'PNG consigliato', color: 'gray' as const } },
    ];

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
                    renderItemDetails={(d: ViniArchiveData) => (
                        <>
                            <span><strong>Brand:</strong> {d.label?.nomeCommerciale || '—'}</span><br />
                            <span><strong>Categoria:</strong> {d.label?.categoriaVino || '—'}</span><br />
                            <span><strong>Alcol:</strong> {d.analytical?.alcol || '—'}% vol</span>
                        </>
                    )}
                />
            )}

            {/* Page Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1>🍷 Etichette Vini</h1>
                    <p>Composizione etichetta secondo Reg. UE 2021/2117 — valori nutrizionali automatici</p>
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
                </div>
            </div>

            {/* Quick Guide */}
            <div style={{ marginBottom: 20, border: '1.5px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--color-bg-secondary, #f8f9fb)', borderBottom: guideOpen ? '1px solid var(--color-border)' : 'none' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-navy)' }}>📖 Come usare il tool Etichette Vini — guida rapida</span>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={toggleGuide}>{guideOpen ? 'Nascondi guida' : 'Mostra guida'}</button>
                </div>
                <div style={{ maxHeight: guideOpen ? '900px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                    <div style={{ padding: '18px 18px 6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
                            {guideSteps.map(s => (
                                <div key={s.n} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>STEP {s.n}</div>
                                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
                                    <div style={{ marginTop: 'auto', paddingTop: 8 }}><Badge text={s.badge.text} color={s.badge.color} /></div>
                                </div>
                            ))}
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 0 12px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingBottom: 16 }}>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 8 }}><span>💡</span><span>I valori energetici dell'alcol sono calcolati con il fattore 29 kJ/g (7 kcal/g) come da reg. UE.</span></div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 8 }}><span>⚠️</span><span>L'elenco ingredienti e i valori nutrizionali sono OBBLIGATORI dal 8 dicembre 2023, anche solo tramite QR Code.</span></div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 8 }}><span>📋</span><span>Per i vini DOP/IGP la denominazione di origine è obbligatoria. Per i generici è facoltativa.</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--color-border)', width: 'fit-content' }}>
                {([['nutrizionale', '📊 Valori Nutrizionali'], ['etichetta', '🏷️ Composizione Etichetta'], ['anteprima', '📄 Anteprima & Export']] as const).map(([id, name]) => (
                    <button key={id} onClick={() => setActiveTab(id)} style={{
                        padding: '10px 22px', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
                        background: activeTab === id ? 'linear-gradient(135deg,var(--color-orange),var(--color-orange-hover))' : 'white',
                        color: activeTab === id ? 'white' : 'var(--color-text-muted)', transition: 'all .2s',
                    }}>{name}</button>
                ))}
            </div>

            {/* ── TAB 1: VALORI NUTRIZIONALI ───────────────────────────────── */}
            {activeTab === 'nutrizionale' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Input */}
                    <div className="card">
                        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>🔬 Dati Analitici di Laboratorio</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {([
                                ['grassi', 'Grassi', 'green'],
                                ['saturi', 'Acidi grassi saturi', 'green'],
                                ['alcol', 'Grado alcolico (% Vol.)', 'green'],
                                ['residuoZucch', 'Residuo zuccherino (glucosio+fruttosio)', 'green'],
                                ['proteine', 'Proteine', 'green'],
                                ['sale', 'Sale', 'green'],
                                ['tartarico', 'Acido tartarico', 'orange'],
                                ['malico', 'Acido malico', 'orange'],
                                ['volatile', 'Acidità volatile (acido acetico)', 'orange'],
                                ['polialcoli', 'Polialcoli (escluso glicerolo)', 'orange'],
                                ['glicerolo', 'Glicerolo', 'orange'],
                                ['fibre', 'Fibre', 'orange'],
                            ] as [keyof AnalyticalData, string, 'green' | 'orange'][]).map(([field, label, color]) => (
                                <div key={field} className="form-field" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11 }}>{label} <span style={{ color: 'var(--color-text-muted)' }}>{field === 'alcol' ? '% vol' : 'g/litro'}</span></label>
                                    <input
                                        className="form-input"
                                        type="number" step={0.01} min={0}
                                        value={(analytical as any)[field]}
                                        onChange={e => setA(field, e.target.value)}
                                        style={{ borderColor: color === 'green' ? '#22c55e' : '#f97316', background: color === 'green' ? 'rgba(34,197,94,0.04)' : 'rgba(249,115,22,0.04)' }}
                                    />
                                </div>
                            ))}
                            <div className="form-field" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                                <label className="form-label" style={{ fontSize: 11 }}>Carboidrati totali <span style={{ color: 'var(--color-text-muted)' }}>g/litro — calcolato auto</span></label>
                                <input className="form-input" type="text" readOnly value={carboLitro.toFixed(2)} style={{ background: '#f5f5f5', color: 'var(--color-text-muted)', cursor: 'not-allowed' }} />
                            </div>
                        </div>
                    </div>

                    {/* Nutrition table */}
                    <div className="card" style={{ alignSelf: 'start' }}>
                        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>📊 Tabella Nutrizionale Calcolata</h3>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>Valori nutrizionali medi per 100 ml</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
                            <tbody>
                                {([
                                    ['Energia', `${fmt(nutrition.kj, 2)} kJ / ${fmt(nutrition.kcal, 2)} kcal`, true],
                                    ['Grassi', `${fmt(nutrition.grassiPer100)} g`, true],
                                    ['di cui acidi grassi saturi', `${fmt(nutrition.saturiPer100)} g`, false],
                                    ['Carboidrati', `${fmt(nutrition.carboPer100)} g`, true],
                                    ['di cui zuccheri', `${fmt(nutrition.zuccheriPer100)} g`, false],
                                    ['Proteine', `${fmt(nutrition.proteinePer100)} g`, true],
                                    ['Sale', `${fmt(nutrition.salePer100, 2)} g`, true],
                                ] as [string, string, boolean][]).map(([name, val, bold], i) => (
                                    <tr key={i} style={{ background: i % 2 === 0 ? '#fafbfc' : 'white', borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: bold ? 600 : 400, paddingLeft: bold ? 12 : 24 }}>{name}</td>
                                        <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 700, textAlign: 'right', color: 'var(--color-navy)' }}>{val}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ marginTop: 16, background: 'linear-gradient(135deg,rgba(255,126,46,0.08),rgba(12,19,38,0.04))', border: '1.5px solid rgba(255,126,46,0.25)', borderRadius: 10, padding: '12px 16px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-orange)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Energia totale per 100 ml</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-navy)' }}>{fmt(nutrition.kj, 2)} kJ <span style={{ fontSize: 14, fontWeight: 500 }}>/ {fmt(nutrition.kcal, 2)} kcal</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 2: COMPOSIZIONE ETICHETTA ────────────────────────────── */}
            {activeTab === 'etichetta' && (
                <div className="card">
                    <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>🏷️ Composizione Etichetta</h3>

                    <LabelRow label="Logo aziendale" badge={<Badge text="facoltativo" color="green" />}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                            <input type="checkbox" checked={label.logoPresente} onChange={e => setL('logoPresente', e.target.checked)} />
                            Logo presente (inserire l'immagine direttamente nel PDF/PNG finale)
                        </label>
                    </LabelRow>

                    <LabelRow label="Nome commerciale / Brand" badge={<Badge text="facoltativo" color="green" />}>
                        <input className="form-input" type="text" value={label.nomeCommerciale} onChange={e => setL('nomeCommerciale', e.target.value)} placeholder="es. Barolo Riserva" />
                    </LabelRow>

                    <LabelRow label="Categoria del vino" badge={<Badge text="facoltativa per vini generici" color="yellow" />}>
                        <select className="form-input" value={label.categoriaVino} onChange={e => setL('categoriaVino', e.target.value)}>
                            <option value="">— seleziona —</option>
                            {CATEGORIE_VINO.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </LabelRow>

                    {isSpumante && (
                        <LabelRow label="Classificazione tenore zuccheri" badge={<Badge text="solo per spumanti" color="yellow" />}>
                            <select className="form-input" value={label.tenoreZuccheri} onChange={e => setL('tenoreZuccheri', e.target.value)}>
                                <option value="">— seleziona —</option>
                                {TENORI_ZUCCHERI.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </LabelRow>
                    )}

                    <LabelRow label="Denominazione di origine" badge={<Badge text="obbligatoria per DOP/IGP" color="yellow" />}>
                        <select className="form-input" value={label.denominazioneOrigine} onChange={e => setL('denominazioneOrigine', e.target.value)} style={{ marginBottom: 8 }}>
                            <option value="">— seleziona —</option>
                            {DENOMINAZIONI_ORIGINE.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <input className="form-input" type="text" value={label.nomeDenominazione} onChange={e => setL('nomeDenominazione', e.target.value)} placeholder="Nome denominazione (es. BAROLO)" />
                    </LabelRow>

                    <LabelRow label="Regione di provenienza" badge={<Badge text="obbligatoria per DOP/IGP" color="yellow" />}>
                        <input className="form-input" type="text" value={label.regioneProvenienza} onChange={e => setL('regioneProvenienza', e.target.value)} placeholder="es. PIEMONTE" />
                    </LabelRow>

                    <LabelRow label="Annata di vendemmia" badge={<Badge text="obbligatoria per DOP/IGP" color="yellow" />}>
                        <input className="form-input" type="text" value={label.annataVendemmia} onChange={e => setL('annataVendemmia', e.target.value)} placeholder="es. Vendemmia 2022" />
                    </LabelRow>

                    <LabelRow label="Dichiarazioni volontarie" badge={<Badge text="facoltativo" color="green" />}>
                        <textarea className="form-input" rows={2} value={label.dichiarazioniVolontarie} onChange={e => setL('dichiarazioniVolontarie', e.target.value)} style={{ resize: 'vertical' }} />
                    </LabelRow>

                    <LabelRow label="Ragione sociale e indirizzo imbottigliatore" badge={<Badge text="obbligatorio" color="orange" />}>
                        <textarea className="form-input" rows={3} value={label.ragioneSociale} onChange={e => setL('ragioneSociale', e.target.value)} placeholder="Prodotto e imbottigliato da… via… N°… CAP… Comune (Prov.) nel territorio di…" style={{ resize: 'vertical' }} />
                    </LabelRow>

                    <LabelRow label="Paese di origine" badge={<Badge text="obbligatorio" color="orange" />}>
                        <input className="form-input" type="text" value={label.paeseOrigine} onChange={e => setL('paeseOrigine', e.target.value)} />
                    </LabelRow>

                    <LabelRow label="Integralmente prodotto e imbottigliato nella zona di origine" badge={<Badge text="facoltativo" color="green" />}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 6 }}>
                            <input type="checkbox" checked={label.prodottoImbottigliato} onChange={e => setL('prodottoImbottigliato', e.target.checked)} />
                            Dichiarare questa frase
                        </label>
                        {label.prodottoImbottigliato && (
                            <input className="form-input" type="text" value={label.prodottoImbottigliatoTesto} onChange={e => setL('prodottoImbottigliatoTesto', e.target.value)} placeholder="es. nella zona di origine del BAROLO" />
                        )}
                    </LabelRow>

                    <LabelRow label="Contenuto energetico (100 ml)" badge={<Badge text="obbligatorio" color="orange" />} note="Compilato automaticamente dai valori analitici">
                        <input className="form-input" type="text" readOnly value={energiaAuto} style={{ background: '#f5f5f5', color: 'var(--color-text-muted)' }} />
                    </LabelRow>

                    <LabelRow label="QR Code — ingredienti e valori nutrizionali" badge={<Badge text="alternativa alla dichiarazione in etichetta" color="yellow" />}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: label.usaQrCode ? 8 : 0 }}>
                            <input type="checkbox" checked={label.usaQrCode} onChange={e => setL('usaQrCode', e.target.checked)} />
                            Rimandare a pagina web tramite QR Code
                        </label>
                        {label.usaQrCode && (
                            <>
                                <input className="form-input" type="url" value={label.urlQrCode} onChange={e => setL('urlQrCode', e.target.value)} placeholder="https://..." style={{ marginBottom: 6 }} />
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Testo fisso etichetta: "Inquadra il QR CODE per visualizzare l'elenco degli ingredienti e la dichiarazione nutrizionale"</div>
                            </>
                        )}
                    </LabelRow>

                    {!label.usaQrCode && (
                        <LabelRow label="Dichiarazione nutrizionale in etichetta" badge={<Badge text="obbligatorio" color="orange" />} note="Alternativa al QR Code — calcolata automaticamente">
                            <div style={{ background: '#fafbfc', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, fontSize: 13, fontFamily: 'monospace' }}>
                                {energiaAuto || '— inserire i dati analitici —'}
                            </div>
                        </LabelRow>
                    )}

                    <LabelRow label="Sostanze allergeniche" badge={<Badge text="obbligatorio" color="orange" />}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Contiene:</span>
                            <input className="form-input" type="text" value={label.allergenici} onChange={e => setL('allergenici', e.target.value)} placeholder="es. SOLFITI" style={{ flex: 1 }} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: label.tracce ? 8 : 0 }}>
                            <input type="checkbox" checked={label.tracce} onChange={e => setL('tracce', e.target.checked)} />
                            Può contenere tracce di:
                        </label>
                        {label.tracce && <input className="form-input" type="text" value={label.tracceSpecifiche} onChange={e => setL('tracceSpecifiche', e.target.value)} placeholder="es. latte, uova" />}
                    </LabelRow>

                    <LabelRow label="Lotto — Volume nominale — Titolo alcolometrico" badge={<Badge text="obbligatorio" color="orange" />}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            <div><label className="form-label" style={{ fontSize: 11 }}>Lotto</label><input className="form-input" type="text" value={label.lotto} onChange={e => setL('lotto', e.target.value)} placeholder="L123" /></div>
                            <div><label className="form-label" style={{ fontSize: 11 }}>Volume nominale</label><input className="form-input" type="text" value={label.volumeNominale} onChange={e => setL('volumeNominale', e.target.value)} placeholder="750 ml" /></div>
                            <div><label className="form-label" style={{ fontSize: 11 }}>Titolo alcolometrico</label><input className="form-input" type="text" readOnly value={titoloAlco} style={{ background: '#f5f5f5', color: 'var(--color-text-muted)' }} /></div>
                        </div>
                    </LabelRow>

                    <LabelRow label="T.M.C." badge={<Badge text="solo per alcol < 10% o dealcolizzati" color="yellow" />}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: label.tmcAttivo ? 8 : 0 }}>
                            <input type="checkbox" checked={label.tmcAttivo} onChange={e => setL('tmcAttivo', e.target.checked)} />
                            Indicare T.M.C.
                        </label>
                        {label.tmcAttivo && <input className="form-input" type="text" value={label.tmcData} onChange={e => setL('tmcData', e.target.value)} placeholder="es. Consumare preferibilmente entro 12/2027" />}
                    </LabelRow>

                    {/* Smaltimento imballi */}
                    <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 14, marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>Dichiarazione smaltimento imballi</span>
                            <Badge text="obbligatorio" color="orange" />
                        </div>
                        {label.imballaggi.map(im => (
                            <div key={im.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                                <div>
                                    <label className="form-label" style={{ fontSize: 11 }}>Componente</label>
                                    <select className="form-input" value={im.nome} onChange={e => updateImballaggio(im.id, 'nome', e.target.value)}>
                                        <option value="">— seleziona —</option>
                                        {NOMI_COMPONENTI.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: 11 }}>Codice smaltimento</label>
                                    <select className="form-input" value={im.codice} onChange={e => updateImballaggio(im.id, 'codice', e.target.value)}>
                                        <option value="">— seleziona —</option>
                                        {Object.keys(CODICI_SMALTIMENTO).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: 11 }}>Smaltimento</label>
                                    <input className="form-input" type="text" readOnly value={im.smaltimento} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                </div>
                                <button onClick={() => removeImballaggio(im.id)} style={{ background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.25)', color: '#c53030', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', marginBottom: 1 }}>🗑</button>
                            </div>
                        ))}
                        {label.imballaggi.length < 5 && (
                            <button className="btn btn-outline" onClick={addImballaggio} style={{ fontSize: 12, padding: '6px 14px', marginTop: 4 }}>+ Aggiungi componente</button>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB 3: ANTEPRIMA & EXPORT ────────────────────────────────── */}
            {activeTab === 'anteprima' && (
                <div>
                    {/* Preview */}
                    <div ref={previewRef} style={{ background: '#faf8f0', border: '2.5px solid #8b4513', borderRadius: 10, padding: '28px 32px', fontFamily: 'Georgia, "Times New Roman", serif', color: '#111', maxWidth: 520, marginBottom: 20, lineHeight: 1.8 }}>
                        {label.nomeCommerciale && <div style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 4, letterSpacing: '.03em' }}>{label.nomeCommerciale}</div>}
                        {label.categoriaVino && <div style={{ textAlign: 'center', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{label.categoriaVino}</div>}
                        {label.tenoreZuccheri && isSpumante && <div style={{ textAlign: 'center', fontSize: 11, color: '#555', marginBottom: 4 }}>{label.tenoreZuccheri}</div>}
                        {(label.denominazioneOrigine || label.nomeDenominazione) && (
                            <div style={{ textAlign: 'center', fontSize: 11, color: '#666', marginBottom: 8 }}>
                                {label.denominazioneOrigine && <span>{label.denominazioneOrigine} </span>}{label.nomeDenominazione}
                            </div>
                        )}
                        {label.annataVendemmia && <div style={{ textAlign: 'center', fontSize: 12, marginBottom: 8 }}>{label.annataVendemmia}</div>}
                        {label.dichiarazioniVolontarie && <div style={{ fontSize: 12, marginBottom: 8, color: '#444' }}>{label.dichiarazioniVolontarie}</div>}
                        <hr style={{ border: 'none', borderTop: '1px solid #c8a887', margin: '10px 0' }} />
                        {label.ragioneSociale && <div style={{ fontSize: 11 }}>{label.ragioneSociale}</div>}
                        {label.regioneProvenienza && <div style={{ fontSize: 11 }}>Prodotto in: {label.regioneProvenienza}</div>}
                        <div style={{ fontSize: 11 }}>{label.paeseOrigine}</div>
                        {label.prodottoImbottigliato && label.prodottoImbottigliatoTesto && <div style={{ fontSize: 11 }}>Integralmente prodotto e imbottigliato {label.prodottoImbottigliatoTesto}</div>}
                        <hr style={{ border: 'none', borderTop: '1px solid #c8a887', margin: '10px 0' }} />
                        <div style={{ fontSize: 12, fontWeight: 700 }}>
                            {titoloAlco && <span>{titoloAlco} · </span>}
                            {label.volumeNominale && <span>{label.volumeNominale}</span>}
                        </div>
                        {energiaAuto && <div style={{ fontSize: 11, marginTop: 4 }}>{energiaAuto}</div>}
                        {label.usaQrCode ? (
                            <div style={{ fontSize: 11, marginTop: 6, color: '#555', fontStyle: 'italic' }}>
                                [QR CODE] Inquadra il QR CODE per visualizzare l'elenco degli ingredienti e la dichiarazione nutrizionale
                                {label.urlQrCode && <span> → {label.urlQrCode}</span>}
                            </div>
                        ) : analytical.alcol && (
                            <div style={{ marginTop: 8, fontSize: 11, background: 'rgba(139,69,19,0.06)', border: '1px solid rgba(139,69,19,0.2)', borderRadius: 6, padding: '8px 10px' }}>
                                <strong>Valori nutrizionali medi per 100 ml</strong><br />
                                Energia {fmt(nutrition.kj, 2)} kJ / {fmt(nutrition.kcal, 2)} kcal · Grassi {fmt(nutrition.grassiPer100)} g · Saturi {fmt(nutrition.saturiPer100)} g · Carboidrati {fmt(nutrition.carboPer100)} g · di cui zuccheri {fmt(nutrition.zuccheriPer100)} g · Proteine {fmt(nutrition.proteinePer100)} g · Sale {fmt(nutrition.salePer100, 2)} g
                            </div>
                        )}
                        {label.allergenici && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700 }}>Contiene: {label.allergenici}{label.tracce && label.tracceSpecifiche ? `. Può contenere tracce di: ${label.tracceSpecifiche}` : ''}</div>}
                        {label.lotto && <div style={{ fontSize: 10, color: '#666', marginTop: 6 }}>Lotto: {label.lotto}</div>}
                        {label.tmcAttivo && label.tmcData && <div style={{ fontSize: 10, color: '#666' }}>{label.tmcData}</div>}
                        {label.imballaggi.filter(i => i.nome && i.codice).length > 0 && (
                            <div style={{ marginTop: 8, fontSize: 10, color: '#666', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {label.imballaggi.filter(i => i.nome && i.codice).map(i => (
                                    <span key={i.id}>{i.nome}: {i.codice}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Export buttons */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button className="btn btn-accent" onClick={handlePDF} style={{ padding: '10px 24px', fontSize: 14 }}>📄 Scarica PDF</button>
                        <button className="btn btn-outline" onClick={handlePNG} style={{ padding: '10px 24px', fontSize: 14 }}>🖼️ Scarica PNG</button>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>Il PNG viene esportato a 3x risoluzione, pronto per il grafico. Salvare prima il calcolo con il pulsante "Salva" in cima.</div>
                </div>
            )}
        </div>
    );
}
