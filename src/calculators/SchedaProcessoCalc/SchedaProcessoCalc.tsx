import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import { useAuth } from '../../auth/AuthContext';
import { useArchive } from '../../hooks/useArchive';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ArchiveModal } from '../../components/ArchiveModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ComponenteFabbisogno {
    id: string; nome: string; pzUV: number;
    ingredienti: IngredienteFabb[];
}
interface IngredienteFabb {
    id: string; nome: string; fornitore: string; dataFornitura: string; lotto: string;
    gRicetta: number; fattoreCalo: number; // resa
}
interface Parametro { id: string; parametro: string; standard: string; riscontrato: string; }
interface Coadiuvante { id: string; descrizione: string; fornitore: string; dataFornitura: string; lotto: string; }
interface FaseLavorazione {
    id: string; nome: string; modalita: string; note: string;
    parametri: Parametro[]; coadiuvanti: Coadiuvante[];
}
interface SchedaData {
    nomeProdotto: string; dataProduzione: string; lotto: string;
    dataScadenza: string; nConfezioni: string; pesoNettoG: string;
    componenti: ComponenteFabbisogno[];
    fasi: FaseLavorazione[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
function uid() { return String(Date.now() + Math.random()); }
const mkIng = (): IngredienteFabb => ({ id: uid(), nome: '', fornitore: '', dataFornitura: '', lotto: '', gRicetta: 0, fattoreCalo: 1 });
const mkComp = (): ComponenteFabbisogno => ({ id: uid(), nome: '', pzUV: 1, ingredienti: [mkIng()] });
const mkParam = (): Parametro => ({ id: uid(), parametro: '', standard: '', riscontrato: '' });
const mkCoad = (): Coadiuvante => ({ id: uid(), descrizione: '', fornitore: '', dataFornitura: '', lotto: '' });
const mkFase = (): FaseLavorazione => ({ id: uid(), nome: '', modalita: '', note: '', parametri: [mkParam()], coadiuvanti: [mkCoad()] });

const DEFAULT: SchedaData = {
    nomeProdotto: '', dataProduzione: '', lotto: '',
    dataScadenza: '', nConfezioni: '', pesoNettoG: '',
    componenti: [mkComp()],
    fasi: [mkFase()],
};

// ─── Guide card ───────────────────────────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
export function SchedaProcessoCalc() {
    const { user } = useAuth();
    const [data, setData] = useState<SchedaData>(DEFAULT);
    const { items: savedItems, saveItem, deleteItem } = useArchive<SchedaData>('aea_archive_scheda_processo');
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [currentId, setCurrentId] = useState<string | undefined>(undefined);
    const [currentName, setCurrentName] = useState('');

    // Guide — persisted in localStorage with useLocalStorage hook
    const [guideOpen, setGuideOpen] = useLocalStorage<boolean>('processo_guide_open', true);
    const toggleGuide = () => setGuideOpen(prev => !prev);

    const g = (v: unknown) => { const n = parseFloat(String(v)); return isNaN(n) ? 0 : n; };
    const nConf = g(data.nConfezioni);
    const pesoNettoG = g(data.pesoNettoG);
    const kgTotali = (nConf * pesoNettoG) / 1000;

    // Computed fabbisogni
    const fabbisogni = useMemo(() => {
        return data.componenti.map(comp => {
            const totGRicetta = comp.ingredienti.reduce((s, i) => s + g(i.gRicetta), 0);
            return {
                ...comp,
                totGRicetta,
                ingredienti: comp.ingredienti.map(ing => {
                    const fabbKg = totGRicetta > 0
                        ? (g(ing.gRicetta) / totGRicetta) * kgTotali * g(ing.fattoreCalo)
                        : 0;
                    return { ...ing, fabbKg, pct: totGRicetta > 0 ? (g(ing.gRicetta) / totGRicetta) * 100 : 0 };
                })
            };
        });
    }, [data.componenti, nConf, pesoNettoG, kgTotali]);

    // Set helpers
    const setField = (field: keyof SchedaData, val: any) => setData(p => ({ ...p, [field]: val }));

    // Componente ops
    const addComp = () => { if (data.componenti.length < 4) setData(p => ({ ...p, componenti: [...p.componenti, mkComp()] })); };
    const removeComp = (id: string) => setField('componenti', data.componenti.filter(c => c.id !== id));
    const updateComp = (id: string, field: keyof ComponenteFabbisogno, val: any) =>
        setField('componenti', data.componenti.map(c => c.id !== id ? c : { ...c, [field]: val }));
    const addIng = (compId: string) =>
        setField('componenti', data.componenti.map(c => c.id !== compId ? c : { ...c, ingredienti: [...c.ingredienti, mkIng()] }));
    const removeIng = (compId: string, ingId: string) =>
        setField('componenti', data.componenti.map(c => c.id !== compId ? c : { ...c, ingredienti: c.ingredienti.filter(i => i.id !== ingId) }));
    const updateIng = (compId: string, ingId: string, field: keyof IngredienteFabb, val: any) =>
        setField('componenti', data.componenti.map(c => c.id !== compId ? c : {
            ...c, ingredienti: c.ingredienti.map(i => i.id !== ingId ? i : {
                ...i, [field]: ['gRicetta', 'fattoreCalo'].includes(field) ? g(val) : val
            })
        }));

    // Fase ops
    const addFase = () => setField('fasi', [...data.fasi, mkFase()]);
    const removeFase = (id: string) => setField('fasi', data.fasi.filter(f => f.id !== id));
    const updateFase = (id: string, field: keyof FaseLavorazione, val: any) =>
        setField('fasi', data.fasi.map(f => f.id !== id ? f : { ...f, [field]: val }));
    const addParam = (faseId: string) =>
        setField('fasi', data.fasi.map(f => f.id !== faseId ? f : { ...f, parametri: [...f.parametri, mkParam()] }));
    const removeParam = (faseId: string, paramId: string) =>
        setField('fasi', data.fasi.map(f => f.id !== faseId ? f : { ...f, parametri: f.parametri.filter(p => p.id !== paramId) }));
    const updateParam = (faseId: string, paramId: string, field: keyof Parametro, val: string) =>
        setField('fasi', data.fasi.map(f => f.id !== faseId ? f : {
            ...f, parametri: f.parametri.map(p => p.id !== paramId ? p : { ...p, [field]: val })
        }));
    const addCoad = (faseId: string) =>
        setField('fasi', data.fasi.map(f => f.id !== faseId ? f : { ...f, coadiuvanti: [...f.coadiuvanti, mkCoad()] }));
    const removeCoad = (faseId: string, coadId: string) =>
        setField('fasi', data.fasi.map(f => f.id !== faseId ? f : { ...f, coadiuvanti: f.coadiuvanti.filter(c => c.id !== coadId) }));
    const updateCoad = (faseId: string, coadId: string, field: keyof Coadiuvante, val: string) =>
        setField('fasi', data.fasi.map(f => f.id !== faseId ? f : {
            ...f, coadiuvanti: f.coadiuvanti.map(c => c.id !== coadId ? c : { ...c, [field]: val })
        }));

    // Archive
    const handleSave = () => {
        const name = currentName || prompt('Nome per questa scheda:', data.nomeProdotto || 'Scheda Processo') || '';
        if (!name) return;
        const id = saveItem(name, data, currentId);
        setCurrentId(id); setCurrentName(name);
        alert('Salvato!');
    };
    const handleLoad = (item: any) => {
        setData({ ...DEFAULT, ...(item.data as SchedaData) });
        setCurrentId(item.id); setCurrentName(item.name);
        setIsArchiveOpen(false);
    };
    const handleNew = () => {
        if (data.nomeProdotto && !confirm('Iniziare una nuova scheda? I dati non salvati andranno persi.')) return;
        setData(DEFAULT); setCurrentId(undefined); setCurrentName('');
    };

    // PDF
    const handlePDF = () => {
        if (!data.nomeProdotto) { alert('Inserisci almeno il nome del prodotto prima di scaricare il PDF.'); return; }
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const M = 14; const CW = 210 - M * 2; let y = 0;

        // Header
        doc.setFillColor(12, 19, 38); doc.rect(0, 0, 210, 36, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(17); doc.setFont('helvetica', 'bold'); doc.text('AEA Consulenze Alimentari', M, 14);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('Scheda Processo Produttivo', M, 23);
        doc.setFontSize(8); doc.text(`Utente: ${user?.name || ''} | ${user?.company || ''} | ${new Date().toLocaleDateString('it-IT')}`, M, 31);
        y = 44;

        const section = (title: string) => {
            if (y > 240) { doc.addPage(); y = 14; }
            doc.setFillColor(240, 243, 248); doc.rect(M, y, CW, 7, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(12, 19, 38);
            doc.text(title, M + 3, y + 5); y += 10;
        };
        const line = (lbl: string, val: string) => {
            if (y > 265) { doc.addPage(); y = 14; }
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 100);
            doc.text(lbl + ':', M + 2, y + 4);
            doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
            const w = doc.splitTextToSize(val || '—', CW - CW / 2 - 4);
            doc.text(w, M + CW / 2, y + 4);
            y += 6;
        };

        section('INTESTAZIONE SCHEDA');
        line('Prodotto', data.nomeProdotto);
        line('Data produzione', data.dataProduzione);
        line('Lotto', data.lotto);
        line('Data scadenza/TMC', data.dataScadenza);
        line('N° confezioni', data.nConfezioni);
        line('Peso netto UV', data.pesoNettoG + ' g');
        line('Kg totali da produrre', kgTotali.toFixed(2) + ' kg');
        y += 2;

        section('FABBISOGNI INGREDIENTI');
        fabbisogni.forEach(comp => {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(12, 19, 38);
            doc.text(`Componente: ${comp.nome || 'Senza nome'} (${comp.pzUV} pz/UV)`, M + 2, y + 4); y += 7;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 100);
            comp.ingredienti.forEach(ing => {
                if (y > 265) { doc.addPage(); y = 14; }
                doc.text(`${ing.nome}`, M + 4, y + 4);
                doc.text(`${ing.fabbKg.toFixed(3)} kg`, M + 80, y + 4);
                doc.text(`${ing.pct.toFixed(1)}%`, M + 105, y + 4);
                doc.text(`Forn: ${ing.fornitore}`, M + 120, y + 4);
                doc.text(`Lotto: ${ing.lotto}`, M + 155, y + 4);
                y += 5;
            });
            y += 2;
        });

        section('FASI DI LAVORAZIONE');
        data.fasi.forEach((fase, fi) => {
            if (y > 250) { doc.addPage(); y = 14; }
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(12, 19, 38);
            doc.text(`FASE ${fi + 1}: ${fase.nome}`, M + 2, y + 5); y += 8;
            if (fase.modalita) {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 100);
                const lines = doc.splitTextToSize(fase.modalita, CW - 6);
                doc.text(lines, M + 4, y + 4);
                y += lines.length * 4 + 3;
            }
            if (fase.parametri.some(p => p.parametro)) {
                doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(12, 19, 38);
                doc.text('Parametri:', M + 4, y + 4); y += 5;
                fase.parametri.filter(p => p.parametro).forEach(p => {
                    if (y > 265) { doc.addPage(); y = 14; }
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(80, 80, 100);
                    doc.text(`${p.parametro} | Standard: ${p.standard} | Riscontrato: ${p.riscontrato}`, M + 8, y + 4);
                    y += 4;
                });
            }
            if (fase.coadiuvanti.some(c => c.descrizione)) {
                doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(12, 19, 38);
                doc.text('Coadiuvanti/Imballi primari:', M + 4, y + 4); y += 5;
                fase.coadiuvanti.filter(c => c.descrizione).forEach(c => {
                    if (y > 265) { doc.addPage(); y = 14; }
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(80, 80, 100);
                    doc.text(`${c.descrizione} | Forn: ${c.fornitore} | Data: ${c.dataFornitura} | Lotto: ${c.lotto}`, M + 8, y + 4);
                    y += 4;
                });
            }
            y += 4;
        });

        const safeName = (data.nomeProdotto || 'prodotto').replace(/\s+/g, '_').toLowerCase();
        const safeLotto = (data.lotto || 'L000').replace(/\s+/g, '_');
        doc.save(`scheda_processo_${safeName}_${safeLotto}.pdf`);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div>
            {isArchiveOpen && (
                <ArchiveModal items={savedItems} currentId={currentId}
                    onClose={() => setIsArchiveOpen(false)} onLoad={handleLoad} onDelete={deleteItem}
                    renderItemDetails={(d: SchedaData) => (
                        <><span><strong>Prodotto:</strong> {d.nomeProdotto || '—'}</span><br />
                            <span><strong>Lotto:</strong> {d.lotto || '—'}</span><br />
                            <span><strong>Data:</strong> {d.dataProduzione || '—'}</span></>
                    )} />
            )}

            {/* Page header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1>⚙️ Scheda Processo</h1>
                    <p>Scheda processo produttivo con fabbisogni, fasi HACCP e rintracciabilità lotti</p>
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
                    <span style={{ fontWeight: 700, fontSize: 14 }}>📖 Come usare la Scheda Processo — guida rapida</span>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={toggleGuide}>{guideOpen ? 'Nascondi guida' : 'Mostra guida'}</button>
                </div>
                <div style={{ maxHeight: guideOpen ? '900px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                    <div style={{ padding: '18px 18px 6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
                            <GuideCard n={1} icon="📋" title="Dati produzione" desc="Inserisci nome prodotto, lotto, date e numero di confezioni da preparare." badge="identificazione" badgeColor="gray" />
                            <GuideCard n={2} icon="🏭" title="Fabbisogni" desc="I kg necessari di ogni ingrediente si calcolano automaticamente dal numero di confezioni." badge="calcolo auto" badgeColor="green" />
                            <GuideCard n={3} icon="⚙️" title="Fasi di lavorazione" desc="Descrivi ogni fase del processo con modalità operative e parametri da controllare." badge="HACCP" badgeColor="gray" />
                            <GuideCard n={4} icon="🔖" title="Registra i lotti" desc="Per ogni ingrediente registra fornitore, data fornitura e lotto — obbligatorio per la rintracciabilità." badge="rintracciabilità" badgeColor="orange" />
                            <GuideCard n={5} icon="📊" title="Parametri processo" desc="Inserisci i valori riscontrati per i CCP e i parametri critici di ogni fase." badge="CCP" badgeColor="gray" />
                            <GuideCard n={6} icon="📄" title="Esporta e archivia" desc="Stampa la scheda PDF e conservala con la documentazione del lotto per almeno 2 anni." badge="PDF + archivio" badgeColor="gray" />
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 0 12px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingBottom: 16 }}>
                            {['💡 Il calcolo del fabbisogno usa il peso crudo della ricetta — tiene conto del calo peso in cottura.',
                                '⚠️ Conserva una copia stampata firmata per ogni lotto prodotto (obbligo rintracciabilità Reg. CE 178/2002).',
                                '📋 Puoi caricare i dati della ricetta dall\'archivio del tool Valori Nutrizionali.'].map((t, i) => (
                                    <div key={i} style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 8 }}>
                                        <span>{t.slice(0, 2)}</span><span>{t.slice(3)}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Intestazione ── */}
            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📋 Intestazione Scheda</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {([
                        ['nomeProdotto', 'Nome prodotto', 'text', 'es. Lasagna alla Bolognese'],
                        ['dataProduzione', 'Data produzione', 'date', ''],
                        ['lotto', 'Lotto', 'text', 'es. L2024-001'],
                        ['dataScadenza', 'Data scadenza / TMC', 'date', ''],
                        ['nConfezioni', 'N° confezioni', 'number', 'es. 1000'],
                        ['pesoNettoG', 'Peso netto UV (g)', 'number', 'es. 500'],
                    ] as const).map(([field, label, type, placeholder]) => (
                        <div key={field} className="form-field" style={{ marginBottom: 0 }}>
                            <label className="form-label">{label}</label>
                            <input className="form-input" type={type} value={(data as any)[field]} onChange={e => setField(field as keyof SchedaData, e.target.value)} placeholder={placeholder} />
                        </div>
                    ))}
                </div>
                {nConf > 0 && pesoNettoG > 0 && (
                    <div style={{ marginTop: 16, background: 'linear-gradient(135deg,rgba(255,126,46,0.08),rgba(12,19,38,0.04))', borderRadius: 10, padding: '12px 20px', display: 'inline-block' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Kg totali da produrre: </span>
                        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-navy)', marginLeft: 8 }}>{kgTotali.toFixed(2)} kg</span>
                    </div>
                )}
            </div>

            {/* ── Fabbisogni Ingredienti ── */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontWeight: 700, margin: 0 }}>🏭 Fabbisogni Ingredienti per Componente</h3>
                    {data.componenti.length < 4 && <button className="btn btn-outline" onClick={addComp}>+ Componente</button>}
                </div>

                {fabbisogni.map((comp, ci) => (
                    <div key={comp.id} style={{ marginBottom: 24, border: '1.5px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(12,19,38,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontWeight: 800, color: 'var(--color-navy)' }}>Componente {ci + 1}</span>
                                <input className="form-input" type="text" value={comp.nome} onChange={e => updateComp(comp.id, 'nome', e.target.value)} placeholder="Nome componente" style={{ width: 180 }} />
                                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Pz/UV:</span>
                                <input className="form-input" type="number" min={1} value={comp.pzUV} onChange={e => updateComp(comp.id, 'pzUV', parseInt(e.target.value) || 1)} style={{ width: 60 }} />
                            </div>
                            {data.componenti.length > 1 && <button onClick={() => removeComp(comp.id)} style={{ background: 'transparent', border: 'none', color: '#c53030', cursor: 'pointer', fontSize: 18 }}>✕</button>}
                        </div>
                        <div style={{ padding: 16, overflowX: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 1.5fr 1fr auto', gap: 6, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}>
                                {['Ingrediente', 'g in ricetta', 'Fattore calo', '% comp.', 'Fabb. kg', 'Fornitore', 'Data fornitura / Lotto', ''].map((h, i) => (
                                    <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{h}</div>
                                ))}
                            </div>
                            {comp.ingredienti.map(ing => (
                                <div key={ing.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 1.5fr 1fr auto', gap: 6, marginBottom: 6 }}>
                                    <input className="form-input" type="text" value={ing.nome} onChange={e => updateIng(comp.id, ing.id, 'nome', e.target.value)} placeholder="Nome" />
                                    <input className="form-input" type="number" min={0} step={0.01} value={ing.gRicetta || ''} onChange={e => updateIng(comp.id, ing.id, 'gRicetta', e.target.value)} placeholder="g" />
                                    <input className="form-input" type="number" min={0.01} step={0.01} value={ing.fattoreCalo || 1} onChange={e => updateIng(comp.id, ing.id, 'fattoreCalo', e.target.value)} placeholder="1.0" title="Fattore calo peso (es: 1.2 = 20% calo cottura)" />
                                    <input className="form-input" readOnly value={ing.pct.toFixed(1) + '%'} style={{ background: '#f5f5f5', fontSize: 12 }} />
                                    <input className="form-input" readOnly value={ing.fabbKg.toFixed(3) + ' kg'} style={{ background: '#f5f5f5', fontWeight: 700, fontSize: 12, color: 'var(--color-navy)' }} />
                                    <input className="form-input" type="text" value={ing.fornitore} onChange={e => updateIng(comp.id, ing.id, 'fornitore', e.target.value)} placeholder="Fornitore" />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                                        <input className="form-input" type="date" value={ing.dataFornitura} onChange={e => updateIng(comp.id, ing.id, 'dataFornitura', e.target.value)} />
                                        <input className="form-input" type="text" value={ing.lotto} onChange={e => updateIng(comp.id, ing.id, 'lotto', e.target.value)} placeholder="Lotto" />
                                    </div>
                                    <button onClick={() => removeIng(comp.id, ing.id)} style={{ background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.25)', color: '#c53030', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>🗑</button>
                                </div>
                            ))}
                            <button className="btn btn-outline" onClick={() => addIng(comp.id)} style={{ fontSize: 12, marginTop: 8 }}>+ Ingrediente</button>
                            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(12,19,38,0.04)', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                                Tot. ricetta: {comp.totGRicetta.toFixed(1)} g/ricetta —
                                Fabb. tot. comp.: <span style={{ color: 'var(--color-orange)' }}>{comp.ingredienti.reduce((s, i) => s + i.fabbKg, 0).toFixed(3)} kg</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Fasi di lavorazione ── */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontWeight: 700, margin: 0 }}>⚙️ Fasi di Lavorazione</h3>
                    <button className="btn btn-outline" onClick={addFase}>+ Aggiungi fase</button>
                </div>

                {data.fasi.map((fase, fi) => (
                    <div key={fase.id} style={{ marginBottom: 24, border: '1.5px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
                        {/* Fase header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(12,19,38,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 28, height: 28, background: 'var(--color-orange)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 13 }}>{fi + 1}</div>
                                <input className="form-input" type="text" value={fase.nome} onChange={e => updateFase(fase.id, 'nome', e.target.value)} placeholder="Nome fase (es. PREPARAZIONE SUGO)" style={{ width: 280, fontWeight: 700 }} />
                            </div>
                            <button onClick={() => removeFase(fase.id)} style={{ background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.25)', color: '#c53030', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>🗑 Rimuovi fase</button>
                        </div>

                        <div style={{ padding: 16 }}>
                            {/* Modalità operative */}
                            <div className="form-field" style={{ marginBottom: 16 }}>
                                <label className="form-label">Modalità operative</label>
                                <textarea className="form-input" rows={3} value={fase.modalita} onChange={e => updateFase(fase.id, 'modalita', e.target.value)} placeholder="Descrivi le modalità operative per questa fase..." style={{ width: '100%', resize: 'vertical' }} />
                            </div>

                            {/* Parametri CCP */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <span style={{ fontWeight: 700, fontSize: 13 }}>📊 Parametri di processo / CCP</span>
                                    <button className="btn btn-outline" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => addParam(fase.id)}>+ Parametro</button>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr auto', gap: 6, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--color-border)' }}>
                                        {['Parametro', 'Standard di riferimento', 'Valore riscontrato', ''].map((h, i) => (
                                            <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{h}</div>
                                        ))}
                                    </div>
                                    {fase.parametri.map(param => (
                                        <div key={param.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr auto', gap: 6, marginBottom: 6 }}>
                                            <input className="form-input" type="text" value={param.parametro} onChange={e => updateParam(fase.id, param.id, 'parametro', e.target.value)} placeholder="es. Temperatura cottura" />
                                            <input className="form-input" type="text" value={param.standard} onChange={e => updateParam(fase.id, param.id, 'standard', e.target.value)} placeholder="es. ≥ 85°C per 15 min" />
                                            <input className="form-input" type="text" value={param.riscontrato} onChange={e => updateParam(fase.id, param.id, 'riscontrato', e.target.value)} placeholder="es. 90°C — 18 min" />
                                            <button onClick={() => removeParam(fase.id, param.id)} style={{ background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.25)', color: '#c53030', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>🗑</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Note */}
                            <div className="form-field" style={{ marginBottom: 16 }}>
                                <label className="form-label">Note</label>
                                <input className="form-input" type="text" value={fase.note} onChange={e => updateFase(fase.id, 'note', e.target.value)} placeholder="Note aggiuntive..." />
                            </div>

                            {/* Coadiuvanti */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <span style={{ fontWeight: 700, fontSize: 13 }}>🔖 Coadiuvanti tecnologici e imballi primari</span>
                                    <button className="btn btn-outline" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => addCoad(fase.id)}>+ Aggiungi</button>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr auto', gap: 6, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--color-border)' }}>
                                        {['Descrizione', 'Fornitore', 'Data fornitura', 'Lotto', ''].map((h, i) => (
                                            <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{h}</div>
                                        ))}
                                    </div>
                                    {fase.coadiuvanti.map(c => (
                                        <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr auto', gap: 6, marginBottom: 6 }}>
                                            <input className="form-input" type="text" value={c.descrizione} onChange={e => updateCoad(fase.id, c.id, 'descrizione', e.target.value)} placeholder="es. Film plastificato" />
                                            <input className="form-input" type="text" value={c.fornitore} onChange={e => updateCoad(fase.id, c.id, 'fornitore', e.target.value)} placeholder="Fornitore" />
                                            <input className="form-input" type="date" value={c.dataFornitura} onChange={e => updateCoad(fase.id, c.id, 'dataFornitura', e.target.value)} />
                                            <input className="form-input" type="text" value={c.lotto} onChange={e => updateCoad(fase.id, c.id, 'lotto', e.target.value)} placeholder="Lotto" />
                                            <button onClick={() => removeCoad(fase.id, c.id)} style={{ background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.25)', color: '#c53030', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>🗑</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Export */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-accent" onClick={handlePDF}>📄 Scarica PDF Scheda Processo</button>
            </div>
        </div>
    );
}
