import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import { useAuth } from '../../auth/AuthContext';
import { useArchive } from '../../hooks/useArchive';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ArchiveModal } from '../../components/ArchiveModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Ingredient {
    id: string; name: string; supplier: string; lotNumber: string;
    gPerConf: number; eurKg: number; resa: number; // resa % (default 100)
}
interface Imballo {
    id: string; descrizione: string; costoUnit: number; pzConf: number; resa: number;
}
interface Postazione {
    id: string; nome: string; eurOra: number; nAddetti: number; conf8h: number;
}
interface MansioneIndiretta {
    id: string; mansione: string; costoMese: number; nAddetti: number;
}
interface AltroFisso { id: string; descrizione: string; eurMese: number; }

interface CostiData {
    productName: string; nConf: string; pesoNettoG: string;
    ingredients: Ingredient[];
    imballaggi: Imballo[];
    postazioni: Postazione[];
    mansioniIndirette: MansioneIndiretta[];
    altriFissi: AltroFisso[];
    kgMese: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const mkIng = (): Ingredient => ({ id: uid(), name: '', supplier: '', lotNumber: '', gPerConf: 0, eurKg: 0, resa: 100 });
const mkImb = (): Imballo => ({ id: uid(), descrizione: '', costoUnit: 0, pzConf: 1, resa: 100 });
const mkPost = (): Postazione => ({ id: uid(), nome: '', eurOra: 10, nAddetti: 1, conf8h: 100 });
const mkMans = (): MansioneIndiretta => ({ id: uid(), mansione: '', costoMese: 0, nAddetti: 1 });
const mkAltro = (): AltroFisso => ({ id: uid(), descrizione: '', eurMese: 0 });
function uid() { return String(Date.now() + Math.random()); }

const DEFAULT: CostiData = {
    productName: '', nConf: '', pesoNettoG: '',
    ingredients: [mkIng()],
    imballaggi: [mkImb()],
    postazioni: [mkPost()],
    mansioniIndirette: [mkMans()],
    altriFissi: [mkAltro()],
    kgMese: '',
};

// ─── Calculation engine ───────────────────────────────────────────────────────
function g(v: unknown): number { const n = parseFloat(String(v)); return isNaN(n) ? 0 : n; }

function calcAll(d: CostiData) {
    const nConf = g(d.nConf);
    const pesoNettoG = g(d.pesoNettoG);
    const kgMese = g(d.kgMese);

    // Ingredienti
    let ingPerConf = 0;
    const ingRows = d.ingredients.map(i => {
        const fabbReale = i.gPerConf / ((i.resa || 100) / 100);
        const cpc = (i.eurKg / 1000) * fabbReale;
        ingPerConf += cpc;
        return { ...i, fabbRealeG: fabbReale, costoPerConf: cpc, costoPerKg: pesoNettoG > 0 ? (cpc / pesoNettoG) * 1000 : 0, costoTotale: cpc * nConf };
    });

    // Imballi
    let imbPerConf = 0;
    const imbRows = d.imballaggi.map(i => {
        const fabb = i.pzConf / ((i.resa || 100) / 100);
        const cpc = i.costoUnit * fabb;
        imbPerConf += cpc;
        return { ...i, fabbPerConf: fabb, costoPerConf: cpc, costoPerKg: pesoNettoG > 0 ? (cpc / pesoNettoG) * 1000 : 0, fabbTotale: fabb * nConf, costoTotale: cpc * nConf };
    });

    // Manodopera diretta
    let mdPerConf = 0;
    const mdRows = d.postazioni.map(p => {
        const ore100 = (8 * p.nAddetti / (p.conf8h || 1)) * 100;
        const cpc = (p.eurOra * ore100) / 100;
        mdPerConf += cpc;
        return { ...p, ore100conf: ore100, costoPerConf: cpc, costoPerKg: pesoNettoG > 0 ? (cpc / pesoNettoG) * 1000 : 0, oreTotali: (ore100 / 100) * nConf, costoTotale: cpc * nConf };
    });

    // Manodopera indiretta
    let miPerConf = 0;
    const miRows = d.mansioniIndirette.map(m => {
        const mensile = m.costoMese * m.nAddetti;
        const cpc = kgMese > 0 ? (mensile / kgMese) * (pesoNettoG / 1000) : 0;
        miPerConf += cpc;
        return { ...m, costoMeseTot: mensile, costoPerConf: cpc, costoPerKg: kgMese > 0 ? mensile / kgMese : 0, costoTotale: cpc * nConf };
    });

    // Altri costi
    let altriPerConf = 0;
    const altriRows = d.altriFissi.map(a => {
        const cpc = kgMese > 0 ? (a.eurMese / kgMese) * (pesoNettoG / 1000) : 0;
        altriPerConf += cpc;
        return { ...a, costoPerConf: cpc, costoPerKg: kgMese > 0 ? a.eurMese / kgMese : 0, costoTotale: cpc * nConf };
    });

    const totalePerConf = ingPerConf + imbPerConf + mdPerConf + miPerConf + altriPerConf;
    const totalePerKg = pesoNettoG > 0 ? (totalePerConf / pesoNettoG) * 1000 : 0;
    const totaleTot = totalePerConf * nConf;

    const pct = (v: number) => totalePerConf > 0 ? (v / totalePerConf) * 100 : 0;

    return {
        ingPerConf, imbPerConf, mdPerConf, miPerConf, altriPerConf,
        totalePerConf, totalePerKg, totaleTot,
        ingRows, imbRows, mdRows, miRows, altriRows,
        pctIng: pct(ingPerConf), pctImb: pct(imbPerConf),
        pctMd: pct(mdPerConf), pctMi: pct(miPerConf), pctAltri: pct(altriPerConf),
    };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
const f2 = (v: number) => v.toFixed(3);
const f3 = (v: number) => v.toFixed(3);

function GuideCard({ n, icon, title, desc, badge, badgeColor }: { n: number; icon: string; title: string; desc: string; badge: string; badgeColor: string }) {
    const colors: Record<string, React.CSSProperties> = {
        gray: { background: '#f0f0f0', color: '#555' },
        green: { background: 'rgba(34,197,94,0.12)', color: '#15803d' },
        orange: { background: 'rgba(255,126,46,0.12)', color: '#c2510a' },
    };
    return (
        <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>STEP {n}</div>
            <div style={{ fontSize: 20 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</div>
            <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 9px', ...colors[badgeColor] }}>{badge}</span>
            </div>
        </div>
    );
}

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd?: () => void; addLabel?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontWeight: 700, margin: 0, fontSize: 15 }}>{title}</h3>
            {onAdd && <button className="btn btn-outline" onClick={onAdd} style={{ fontSize: 12, padding: '6px 14px' }}>{addLabel || '+ Aggiungi'}</button>}
        </div>
    );
}

function ColHeader({ labels }: { labels: string[] }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${labels.length}, 1fr)`, gap: 6, paddingBottom: 8, borderBottom: '1px solid var(--color-border)', marginBottom: 8 }}>
            {labels.map((h, i) => <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{h}</div>)}
        </div>
    );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick} style={{ background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.25)', color: '#c53030', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>🗑</button>
    );
}

function Inp({ type = 'number', value, onChange, placeholder, style }: { type?: string; value: string | number; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties }) {
    return <input className="form-input" type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />;
}

function ProgressBar({ color, pct, label }: { color: string; pct: number; label: string }) {
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span>{label}</span><span style={{ fontWeight: 700 }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ background: '#e8ecf0', borderRadius: 6, height: 8 }}>
                <div style={{ background: color, borderRadius: 6, height: 8, width: `${Math.min(100, pct)}%`, transition: 'width .4s' }} />
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RintracciabilitaCalc() {
    const { user } = useAuth();
    const [data, setData] = useState<CostiData>(DEFAULT);
    const { items: savedItems, saveItem, deleteItem } = useArchive<CostiData>('aea_archive_rintracciabilita');
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [currentId, setCurrentId] = useState<string | undefined>(undefined);
    const [currentName, setCurrentName] = useState('');

    // Guide — persisted in localStorage with useLocalStorage hook
    const [guideOpen, setGuideOpen] = useLocalStorage<boolean>('costi_guide_open', true);
    const toggleGuide = () => setGuideOpen(prev => !prev);

    const set = (field: keyof CostiData, val: any) => setData(p => ({ ...p, [field]: val }));

    // Ingredient ops
    const updateIng = (id: string, field: keyof Ingredient, val: string) =>
        set('ingredients', data.ingredients.map(i => i.id !== id ? i : { ...i, [field]: ['gPerConf', 'eurKg', 'resa'].includes(field) ? g(val) : val }));
    const removeIng = (id: string) => set('ingredients', data.ingredients.filter(i => i.id !== id));

    // Imballo ops
    const updateImb = (id: string, field: keyof Imballo, val: string) =>
        set('imballaggi', data.imballaggi.map(i => i.id !== id ? i : { ...i, [field]: ['costoUnit', 'pzConf', 'resa'].includes(field) ? g(val) : val }));
    const removeImb = (id: string) => set('imballaggi', data.imballaggi.filter(i => i.id !== id));

    // Postazione ops
    const updatePost = (id: string, field: keyof Postazione, val: string) =>
        set('postazioni', data.postazioni.map(p => p.id !== id ? p : { ...p, [field]: ['eurOra', 'nAddetti', 'conf8h'].includes(field) ? g(val) : val }));
    const removePost = (id: string) => set('postazioni', data.postazioni.filter(p => p.id !== id));

    // Mansione ops
    const updateMans = (id: string, field: keyof MansioneIndiretta, val: string) =>
        set('mansioniIndirette', data.mansioniIndirette.map(m => m.id !== id ? m : { ...m, [field]: ['costoMese', 'nAddetti'].includes(field) ? g(val) : val }));
    const removeMans = (id: string) => set('mansioniIndirette', data.mansioniIndirette.filter(m => m.id !== id));

    // Altro ops
    const updateAltro = (id: string, field: keyof AltroFisso, val: string) =>
        set('altriFissi', data.altriFissi.map(a => a.id !== id ? a : { ...a, [field]: field === 'eurMese' ? g(val) : val }));
    const removeAltro = (id: string) => set('altriFissi', data.altriFissi.filter(a => a.id !== id));

    const result = useMemo(() => calcAll(data), [data]);

    // Archive
    const handleSave = () => {
        const name = currentName || prompt('Nome per questo calcolo:', data.productName || 'Costi Produzione') || '';
        if (!name) return;
        const id = saveItem(name, data, currentId);
        setCurrentId(id); setCurrentName(name);
        alert('Salvato!');
    };
    const handleLoad = (item: any) => {
        setData({ ...DEFAULT, ...(item.data as CostiData) });
        setCurrentId(item.id); setCurrentName(item.name);
        setIsArchiveOpen(false);
    };
    const handleNew = () => {
        if (data.productName && !confirm('Iniziare un nuovo calcolo? I dati non salvati andranno persi.')) return;
        setData(DEFAULT); setCurrentId(undefined); setCurrentName('');
    };

    // PDF
    const handlePDF = () => {
        if (!data.productName) { alert('Inserisci almeno il nome del prodotto prima di scaricare il PDF.'); return; }
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const M = 14; const CW = 210 - M * 2; let y = 0;

        // Header
        doc.setFillColor(12, 19, 38); doc.rect(0, 0, 210, 36, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(17); doc.setFont('helvetica', 'bold'); doc.text('AEA Consulenze Alimentari', M, 14);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('Analisi Costi Produzione — Rintracciabilità', M, 23);
        doc.setFontSize(8); doc.text(`Utente: ${user?.name || ''} | ${user?.company || ''} | ${new Date().toLocaleDateString('it-IT')}`, M, 31);
        y = 44;

        const section = (title: string) => {
            if (y > 240) { doc.addPage(); y = 14; }
            doc.setFillColor(240, 243, 248); doc.rect(M, y, CW, 7, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(12, 19, 38);
            doc.text(title, M + 3, y + 5); y += 10;
        };
        const row = (cols: string[], widths: number[], bold = false) => {
            if (y > 265) { doc.addPage(); y = 14; }
            doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(7); doc.setTextColor(bold ? 12 : 80, bold ? 19 : 80, bold ? 38 : 100);
            let x = M;
            cols.forEach((c, i) => { doc.text(String(c || '—'), x, y + 4); x += widths[i]; });
            y += 5;
        };

        // Product info
        section('DATI PRODOTTO');
        row([`Prodotto: ${data.productName}`, `Confezioni: ${data.nConf}`, `Peso netto: ${data.pesoNettoG} g`], [70, 60, 52], true);
        y += 2;

        // Ingredients
        section('INGREDIENTI / MATERIE PRIME');
        row(['Ingrediente', 'Fornitore', 'Lotto', 'g/conf', '€/kg', 'Resa%', '€/conf'], [40, 35, 25, 18, 18, 18, 22]);
        result.ingRows.forEach(r => row([r.name, r.supplier, r.lotNumber, r.gPerConf.toFixed(2), r.eurKg.toFixed(2), r.resa.toString(), r.costoPerConf.toFixed(4)], [40, 35, 25, 18, 18, 18, 22]));
        row(['', '', '', '', '', 'TOTALE', result.ingPerConf.toFixed(4)], [40, 35, 25, 18, 18, 18, 22], true);
        y += 2;

        // Imballi
        section('IMBALLI');
        row(['Descrizione', 'Costo unit €', 'Pz/conf', 'Resa%', 'Fabb/conf', '€/conf', 'Costo tot €'], [40, 25, 18, 18, 22, 22, 37]);
        result.imbRows.forEach(r => row([r.descrizione, r.costoUnit.toFixed(3), r.pzConf.toString(), r.resa.toString(), r.fabbPerConf.toFixed(3), r.costoPerConf.toFixed(4), r.costoTotale.toFixed(2)], [40, 25, 18, 18, 22, 22, 37]));
        row(['', '', '', '', '', 'TOTALE', result.imbPerConf.toFixed(4)], [40, 25, 18, 18, 22, 22, 37], true);
        y += 2;

        // Manodopera diretta
        section('MANODOPERA DIRETTA');
        row(['Postazione', '€/ora', 'N add.', 'Conf/8h', 'Ore/100conf', '€/conf', 'Costo tot €'], [40, 18, 18, 18, 24, 22, 40]);
        result.mdRows.forEach(r => row([r.nome, r.eurOra.toFixed(2), r.nAddetti.toString(), r.conf8h.toString(), r.ore100conf.toFixed(2), r.costoPerConf.toFixed(4), r.costoTotale.toFixed(2)], [40, 18, 18, 18, 24, 22, 40]));
        row(['', '', '', '', '', 'TOTALE', result.mdPerConf.toFixed(4)], [40, 18, 18, 18, 24, 22, 40], true);
        y += 2;

        // Manodopera indiretta
        section(`MANODOPERA INDIRETTA (kg/mese ripartizione: ${data.kgMese} kg)`);
        row(['Mansione', '€/mese', 'N add.', '€ mens tot', '€/conf', 'Costo tot €'], [40, 25, 18, 30, 25, 44]);
        result.miRows.forEach(r => row([r.mansione, r.costoMese.toFixed(2), r.nAddetti.toString(), r.costoMeseTot.toFixed(2), r.costoPerConf.toFixed(4), r.costoTotale.toFixed(2)], [40, 25, 18, 30, 25, 44]));
        row(['', '', '', '', 'TOTALE', result.miPerConf.toFixed(4)], [40, 25, 18, 30, 25, 44], true);
        y += 2;

        // Altri costi
        section(`ALTRI COSTI FISSI (kg/mese ripartizione: ${data.kgMese} kg)`);
        row(['Descrizione', '€/mese', '€/conf', 'Costo tot €'], [60, 35, 35, 52]);
        result.altriRows.forEach(r => row([r.descrizione, r.eurMese.toFixed(2), r.costoPerConf.toFixed(4), r.costoTotale.toFixed(2)], [60, 35, 35, 52]));
        row(['', '', 'TOTALE', result.altriPerConf.toFixed(4)], [60, 35, 35, 52], true);
        y += 4;

        // Riepilogo
        section('RIEPILOGO COSTI');
        const riep = [
            ['Ingredienti', result.ingPerConf, result.ingPerConf * g(data.nConf), result.pctIng],
            ['Imballi', result.imbPerConf, result.imbPerConf * g(data.nConf), result.pctImb],
            ['Manodopera diretta', result.mdPerConf, result.mdPerConf * g(data.nConf), result.pctMd],
            ['Manodopera indiretta', result.miPerConf, result.miPerConf * g(data.nConf), result.pctMi],
            ['Altri costi', result.altriPerConf, result.altriPerConf * g(data.nConf), result.pctAltri],
        ] as const;
        row(['Voce', '€/conf', '€/kg', 'Costo totale €', '% sul tot'], [50, 25, 25, 35, 22]);
        riep.forEach(([lbl, cpc, ctot, pct]) => row([lbl, cpc.toFixed(3), (g(data.pesoNettoG) > 0 ? (cpc / g(data.pesoNettoG) * 1000) : 0).toFixed(3), ctot.toFixed(2), pct.toFixed(1) + '%'], [50, 25, 25, 35, 22]));
        row(['TOTALE', result.totalePerConf.toFixed(3), result.totalePerKg.toFixed(3), result.totaleTot.toFixed(2), '100%'], [50, 25, 25, 35, 22], true);

        const safeName = (data.productName || 'prodotto').replace(/\s+/g, '_').toLowerCase();
        doc.save(`costi_${safeName}.pdf`);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div>
            {isArchiveOpen && (
                <ArchiveModal items={savedItems} currentId={currentId}
                    onClose={() => setIsArchiveOpen(false)} onLoad={handleLoad} onDelete={deleteItem}
                    renderItemDetails={(d: CostiData) => (
                        <><span><strong>Prodotto:</strong> {d.productName || '—'}</span><br />
                            <span><strong>Confezioni:</strong> {d.nConf || '—'} × {d.pesoNettoG || '—'} g</span></>
                    )} />
            )}

            {/* Page header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1>📦 Rintracciabilità & Costi</h1>
                    <p>Analisi costi di produzione completa: ingredienti, imballi, manodopera, costi fissi</p>
                    {currentId && <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,126,46,0.1)', color: 'var(--color-accent)', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, marginTop: 6 }}>✏️ In modifica: {currentName}</div>}
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
                    <span style={{ fontWeight: 700, fontSize: 14 }}>📖 Come usare il tool Costi — guida rapida</span>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={toggleGuide}>{guideOpen ? 'Nascondi guida' : 'Mostra guida'}</button>
                </div>
                <div style={{ maxHeight: guideOpen ? '900px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                    <div style={{ padding: '18px 18px 6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
                            <GuideCard n={1} icon="📦" title="Setup produzione" desc="Inserisci nome prodotto, n° confezioni e peso netto. Il totale kg si calcola in automatico." badge="dati base" badgeColor="gray" />
                            <GuideCard n={2} icon="🌿" title="Ingredienti" desc="Inserisci costo €/kg e resa % per ogni ingrediente. Fornitore e lotto servono per la rintracciabilità." badge="costo + lotto" badgeColor="green" />
                            <GuideCard n={3} icon="📦" title="Imballi" desc="Aggiungi ogni componente dell'imballaggio con costo unitario e pezzi per confezione." badge="imballi primari" badgeColor="gray" />
                            <GuideCard n={4} icon="👷" title="Manodopera diretta" desc="Per ogni postazione: costo orario, n° addetti e confezioni producibili in 8 ore." badge="€/ora" badgeColor="orange" />
                            <GuideCard n={5} icon="🏢" title="Costi fissi" desc="Inserisci manodopera indiretta e altri costi mensili. Indicare i kg totali prodotti al mese." badge="mensili" badgeColor="gray" />
                            <GuideCard n={6} icon="📊" title="Riepilogo" desc="Visualizza il breakdown completo con costo per confezione, per kg e % di ogni voce." badge="analisi" badgeColor="green" />
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 0 12px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingBottom: 16 }}>
                            {['💡 La resa % serve per ingredienti con scarti (es: verdure da pulire, carni da disossare — inserire la % di prodotto utilizzabile).',
                                '⚠️ I costi mensili fissi vengono ripartiti automaticamente sui kg totali prodotti al mese, non solo su questo prodotto.',
                                '📋 Salva ogni calcolo in archivio per confrontare i costi tra diversi prodotti o lotti.'].map((t, i) => (
                                    <div key={i} style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 8 }}>
                                        <span>{t.slice(0, 2)}</span><span>{t.slice(3)}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Dati produzione ── */}
            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🏭 Dati di Produzione</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">Nome prodotto</label>
                        <input className="form-input" type="text" value={data.productName} onChange={e => set('productName', e.target.value)} placeholder="es. Lasagna alla Bolognese" />
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">N° confezioni</label>
                        <input className="form-input" type="number" min={0} value={data.nConf} onChange={e => set('nConf', e.target.value)} placeholder="es. 1000" />
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">Peso netto UV (g)</label>
                        <input className="form-input" type="number" min={0} value={data.pesoNettoG} onChange={e => set('pesoNettoG', e.target.value)} placeholder="es. 500" />
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: 'var(--color-text-muted)' }}>Kg totali da produrre</label>
                        <input className="form-input" readOnly value={g(data.nConf) > 0 && g(data.pesoNettoG) > 0 ? ((g(data.nConf) * g(data.pesoNettoG)) / 1000).toFixed(2) + ' kg' : '—'} style={{ background: '#f5f5f5', color: 'var(--color-text-muted)' }} />
                    </div>
                </div>
            </div>

            {/* ── Ingredienti ── */}
            <div className="card" style={{ marginBottom: 20 }}>
                <SectionHeader title="🌿 Ingredienti / Materie Prime" onAdd={() => set('ingredients', [...data.ingredients, mkIng()])} addLabel="+ Aggiungi ingrediente" />
                <div style={{ overflowX: 'auto' }}>
                    <ColHeader labels={['Ingrediente', 'Fornitore', 'N° Lotto', 'g/conf', '€/kg', 'Resa %', 'Fabb. reale g', '€/conf', 'Costo tot €', '']} />
                    {data.ingredients.map(ing => {
                        const fabb = ing.gPerConf / ((ing.resa || 100) / 100);
                        const cpc = (ing.eurKg / 1000) * fabb;
                        return (
                            <div key={ing.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6 }}>
                                <Inp type="text" value={ing.name} onChange={v => updateIng(ing.id, 'name', v)} placeholder="Nome ingrediente" />
                                <Inp type="text" value={ing.supplier} onChange={v => updateIng(ing.id, 'supplier', v)} placeholder="Fornitore" />
                                <Inp type="text" value={ing.lotNumber} onChange={v => updateIng(ing.id, 'lotNumber', v)} placeholder="Lotto" />
                                <Inp value={ing.gPerConf || ''} onChange={v => updateIng(ing.id, 'gPerConf', v)} placeholder="g" />
                                <Inp value={ing.eurKg || ''} onChange={v => updateIng(ing.id, 'eurKg', v)} placeholder="€/kg" />
                                <Inp value={ing.resa || 100} onChange={v => updateIng(ing.id, 'resa', v)} placeholder="100" />
                                <input className="form-input" readOnly value={fabb.toFixed(3)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={cpc.toFixed(4)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={(cpc * g(data.nConf)).toFixed(2)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <DeleteBtn onClick={() => removeIng(ing.id)} />
                            </div>
                        );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, paddingTop: 8, borderTop: '2px solid var(--color-border)', fontSize: 13, fontWeight: 700 }}>
                        <span>Totale ingredienti: <strong style={{ color: 'var(--color-navy)' }}>{f2(result.ingPerConf)} €/conf</strong></span>
                        <span><strong>{result.ingPerConf > 0 && g(data.pesoNettoG) > 0 ? f2(result.ingPerConf / g(data.pesoNettoG) * 1000) : '—'} €/kg</strong></span>
                    </div>
                </div>
            </div>

            {/* ── Imballi ── */}
            <div className="card" style={{ marginBottom: 20 }}>
                <SectionHeader title="📦 Imballi" onAdd={() => set('imballaggi', [...data.imballaggi, mkImb()])} addLabel="+ Aggiungi imballo" />
                <div style={{ overflowX: 'auto' }}>
                    <ColHeader labels={['Descrizione', 'Costo unit. €', 'Pz/conf', 'Resa %', 'Fabb./conf', '€/conf', '€/kg', 'Fabb. tot.', 'Costo tot. €', '']} />
                    {data.imballaggi.map(im => {
                        const fabb = im.pzConf / ((im.resa || 100) / 100);
                        const cpc = im.costoUnit * fabb;
                        const ckg = g(data.pesoNettoG) > 0 ? (cpc / g(data.pesoNettoG)) * 1000 : 0;
                        return (
                            <div key={im.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 0.7fr 1fr 1fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6 }}>
                                <Inp type="text" value={im.descrizione} onChange={v => updateImb(im.id, 'descrizione', v)} placeholder="Nome imballo" />
                                <Inp value={im.costoUnit || ''} onChange={v => updateImb(im.id, 'costoUnit', v)} placeholder="€" />
                                <Inp value={im.pzConf || ''} onChange={v => updateImb(im.id, 'pzConf', v)} placeholder="1" />
                                <Inp value={im.resa || 100} onChange={v => updateImb(im.id, 'resa', v)} placeholder="100" />
                                <input className="form-input" readOnly value={fabb.toFixed(4)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={cpc.toFixed(4)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={ckg.toFixed(4)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={(fabb * g(data.nConf)).toFixed(0)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={(cpc * g(data.nConf)).toFixed(2)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <DeleteBtn onClick={() => removeImb(im.id)} />
                            </div>
                        );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, paddingTop: 8, borderTop: '2px solid var(--color-border)', fontSize: 13, fontWeight: 700 }}>
                        <span>Totale imballi: <strong style={{ color: 'var(--color-navy)' }}>{f2(result.imbPerConf)} €/conf</strong></span>
                    </div>
                </div>
            </div>

            {/* ── Manodopera Diretta ── */}
            <div className="card" style={{ marginBottom: 20 }}>
                <SectionHeader title="👷 Manodopera Diretta" onAdd={() => set('postazioni', [...data.postazioni, mkPost()])} addLabel="+ Aggiungi postazione" />
                <div style={{ overflowX: 'auto' }}>
                    <ColHeader labels={['Postazione', '€/ora', 'N° addetti', 'Conf./8h', 'Ore/100conf', '€/conf', '€/kg', 'Ore totali', 'Costo tot. €', '']} />
                    {data.postazioni.map(p => {
                        const ore100 = (8 * p.nAddetti / (p.conf8h || 1)) * 100;
                        const cpc = (p.eurOra * ore100) / 100;
                        const ckg = g(data.pesoNettoG) > 0 ? (cpc / g(data.pesoNettoG)) * 1000 : 0;
                        return (
                            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 0.8fr 1fr 1fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6 }}>
                                <Inp type="text" value={p.nome} onChange={v => updatePost(p.id, 'nome', v)} placeholder="Nome postazione" />
                                <Inp value={p.eurOra || ''} onChange={v => updatePost(p.id, 'eurOra', v)} placeholder="10" />
                                <Inp value={p.nAddetti || ''} onChange={v => updatePost(p.id, 'nAddetti', v)} placeholder="1" />
                                <Inp value={p.conf8h || ''} onChange={v => updatePost(p.id, 'conf8h', v)} placeholder="100" />
                                <input className="form-input" readOnly value={ore100.toFixed(4)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={cpc.toFixed(4)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={ckg.toFixed(4)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={((ore100 / 100) * g(data.nConf)).toFixed(2)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={(cpc * g(data.nConf)).toFixed(2)} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <DeleteBtn onClick={() => removePost(p.id)} />
                            </div>
                        );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, paddingTop: 8, borderTop: '2px solid var(--color-border)', fontSize: 13, fontWeight: 700 }}>
                        <span>Totale manodopera diretta: <strong style={{ color: 'var(--color-navy)' }}>{f2(result.mdPerConf)} €/conf</strong></span>
                    </div>
                </div>
            </div>

            {/* ── Costi fissi (shared kg/mese field) ── */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '12px 16px', background: 'rgba(255,126,46,0.06)', borderRadius: 8, border: '1px solid rgba(255,126,46,0.2)' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>⚙️ Kg totali prodotti / mese (tutti i prodotti):</span>
                    <div style={{ width: 140 }}>
                        <input className="form-input" type="number" value={data.kgMese} onChange={e => set('kgMese', e.target.value)} placeholder="es. 10000" />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Usato per ripartire manodopera indiretta e altri costi</span>
                </div>

                {/* Manodopera indiretta */}
                <SectionHeader title="🏢 Manodopera Indiretta" onAdd={() => set('mansioniIndirette', [...data.mansioniIndirette, mkMans()])} addLabel="+ Aggiungi mansione" />
                <div style={{ overflowX: 'auto', marginBottom: 24 }}>
                    <ColHeader labels={['Mansione', 'Costo/mese €', 'N° addetti', '€ mens. tot.', '€/conf', '€/kg', 'Costo tot. €', '']} />
                    {data.mansioniIndirette.map(m => {
                        const v = result.miRows.find(r => r.id === m.id);
                        return (
                            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1.2fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6 }}>
                                <Inp type="text" value={m.mansione} onChange={v2 => updateMans(m.id, 'mansione', v2)} placeholder="es. Responsabile produzione" />
                                <Inp value={m.costoMese || ''} onChange={v2 => updateMans(m.id, 'costoMese', v2)} placeholder="€/mese" />
                                <Inp value={m.nAddetti || ''} onChange={v2 => updateMans(m.id, 'nAddetti', v2)} placeholder="1" />
                                <input className="form-input" readOnly value={v ? (v.costoMeseTot).toFixed(2) : '0.00'} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={v ? v.costoPerConf.toFixed(4) : '0.0000'} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={v ? v.costoPerKg.toFixed(4) : '0.0000'} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={v ? v.costoTotale.toFixed(2) : '0.00'} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <DeleteBtn onClick={() => removeMans(m.id)} />
                            </div>
                        );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '2px solid var(--color-border)', fontSize: 13, fontWeight: 700 }}>
                        <span>Totale: <strong style={{ color: 'var(--color-navy)' }}>{f2(result.miPerConf)} €/conf</strong></span>
                    </div>
                </div>

                {/* Altri costi */}
                <SectionHeader title="💡 Altri Costi Fissi" onAdd={() => set('altriFissi', [...data.altriFissi, mkAltro()])} addLabel="+ Aggiungi voce" />
                <div style={{ overflowX: 'auto' }}>
                    <ColHeader labels={['Descrizione', '€/mese', '€/conf', '€/kg', 'Costo tot. €', '']} />
                    {data.altriFissi.map(a => {
                        const v = result.altriRows.find(r => r.id === a.id);
                        return (
                            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6 }}>
                                <Inp type="text" value={a.descrizione} onChange={v2 => updateAltro(a.id, 'descrizione', v2)} placeholder="es. Affitto, energia..." />
                                <Inp value={a.eurMese || ''} onChange={v2 => updateAltro(a.id, 'eurMese', v2)} placeholder="€/mese" />
                                <input className="form-input" readOnly value={v ? v.costoPerConf.toFixed(4) : '0.0000'} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={v ? v.costoPerKg.toFixed(4) : '0.0000'} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <input className="form-input" readOnly value={v ? v.costoTotale.toFixed(2) : '0.00'} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                <DeleteBtn onClick={() => removeAltro(a.id)} />
                            </div>
                        );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '2px solid var(--color-border)', fontSize: 13, fontWeight: 700 }}>
                        <span>Totale: <strong style={{ color: 'var(--color-navy)' }}>{f2(result.altriPerConf)} €/conf</strong></span>
                    </div>
                </div>
            </div>

            {/* ── Riepilogo finale ── */}
            <div className="card" style={{ marginBottom: 20, border: '2px solid var(--color-orange)', background: 'linear-gradient(135deg,rgba(255,126,46,0.04),rgba(12,19,38,0.02))' }}>
                <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>📊 Riepilogo Costi</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    {['Voce', '€/conf', '€/kg', 'Costo tot.', '% tot.'].map(h => (
                                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {([
                                    ['🌿 Ingredienti', result.ingPerConf, result.pctIng],
                                    ['📦 Imballi', result.imbPerConf, result.pctImb],
                                    ['👷 Manodopera diretta', result.mdPerConf, result.pctMd],
                                    ['🏢 Manodopera indiretta', result.miPerConf, result.pctMi],
                                    ['💡 Altri costi', result.altriPerConf, result.pctAltri],
                                ] as [string, number, number][]).map(([lbl, cpc, pct], i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? '#fafbfc' : 'white' }}>
                                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{lbl}</td>
                                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{f3(cpc)}</td>
                                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{g(data.pesoNettoG) > 0 ? f3(cpc / g(data.pesoNettoG) * 1000) : '—'}</td>
                                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{f3(cpc * g(data.nConf))}</td>
                                        <td style={{ padding: '8px 10px' }}>{pct.toFixed(1)}%</td>
                                    </tr>
                                ))}
                                <tr style={{ background: 'rgba(12,19,38,0.05)', borderTop: '2px solid var(--color-border)' }}>
                                    <td style={{ padding: '10px', fontWeight: 800 }}>TOTALE</td>
                                    <td style={{ padding: '10px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-orange)' }}>{f3(result.totalePerConf)}</td>
                                    <td style={{ padding: '10px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-orange)' }}>{f3(result.totalePerKg)}</td>
                                    <td style={{ padding: '10px', fontWeight: 800, fontFamily: 'monospace' }}>{f3(result.totaleTot)}</td>
                                    <td style={{ padding: '10px', fontWeight: 800 }}>100%</td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ background: 'linear-gradient(135deg,rgba(255,126,46,0.1),rgba(255,126,46,0.04))', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-orange)', textTransform: 'uppercase', marginBottom: 4 }}>€ per confezione</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-navy)' }}>{f3(result.totalePerConf)} €</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg,rgba(12,19,38,0.08),rgba(12,19,38,0.02))', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-navy)', textTransform: 'uppercase', marginBottom: 4 }}>€ per kg</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-navy)' }}>{f3(result.totalePerKg)} €</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Incidenza % su costo totale</div>
                        <ProgressBar color="#22c55e" pct={result.pctIng} label="🌿 Ingredienti" />
                        <ProgressBar color="#3b82f6" pct={result.pctImb} label="📦 Imballi" />
                        <ProgressBar color="#f59e0b" pct={result.pctMd} label="👷 Manodopera diretta" />
                        <ProgressBar color="#a855f7" pct={result.pctMi} label="🏢 Manodopera indiretta" />
                        <ProgressBar color="#ef4444" pct={result.pctAltri} label="💡 Altri costi" />
                    </div>
                </div>

                <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <button className="btn btn-accent" onClick={handlePDF}>📄 Scarica PDF completo</button>
                </div>
            </div>
        </div>
    );
}
