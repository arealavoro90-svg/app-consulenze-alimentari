import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { generatePDFReport } from '../../utils/pdfGenerator';
import { useArchive } from '../../hooks/useArchive';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ArchiveModal } from '../../components/ArchiveModal';

function Guide({ storageKey, title, steps, notes }: { storageKey: string; title: string; steps: { n: number; icon: string; title: string; desc: string; badge: string }[]; notes: string[] }) {
    const [open, setOpen] = useLocalStorage<boolean>(storageKey, true);
    const toggle = () => setOpen(p => !p);
    return (
        <div style={{ marginBottom: 20, border: '1.5px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--color-bg-secondary,#f8f9fb)', borderBottom: open ? '1px solid var(--color-border)' : 'none' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>📖 {title}</span>
                <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={toggle}>{open ? 'Nascondi guida' : 'Mostra guida'}</button>
            </div>
            <div style={{ maxHeight: open ? '900px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                <div style={{ padding: '18px 18px 6px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
                        {steps.map(s => (
                            <div key={s.n} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>STEP {s.n}</div>
                                <div style={{ fontSize: 18 }}>{s.icon}</div>
                                <div style={{ fontWeight: 700, fontSize: 12 }}>{s.title}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
                                <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 20, padding: '2px 8px', background: '#f0f0f0', color: '#555' }}>{s.badge}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 0 10px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 14 }}>
                        {notes.map((t, i) => (
                            <div key={i} style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', gap: 6 }}><span>{t.slice(0,2)}</span><span>{t.slice(3)}</span></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface SchedaCompleta {
    // Scheda tecnica
    productName: string;
    description: string;
    category: string;
    shelfLife: string;
    storageTemp: string;
    packaging: string;
    certifications: string;
    ogmChecked: boolean;
    // Packaging UV
    uvDescrizione: string; uvPesoNettoG: string; uvLmm: string; uvLargmm: string; uvHmm: string; uvPesoImb: string; uvEan: string;
    // Packaging Cartone
    ctDescrizione: string; ctNUV: string; ctLmm: string; ctLargmm: string; ctHmm: string; ctPesoVuoto: string;
    // Bancale
    bancStrato: string; bancStrati: string;
    // Produttore
    prodRagione: string; prodTel: string; prodEmail: string; prodSito: string;
    // Scheda processo
    processSteps: string[];
    criticalPoints: string;
    // Costi
    costPerKg: string;
    batchSize: string;
    packagingCost: string;
    laborCost: string;
    sellPrice: string;
}

const defaults: SchedaCompleta = {
    productName: '', description: '', category: '', shelfLife: '',
    storageTemp: '', packaging: '', certifications: '', ogmChecked: false,
    uvDescrizione: '', uvPesoNettoG: '', uvLmm: '', uvLargmm: '', uvHmm: '', uvPesoImb: '', uvEan: '',
    ctDescrizione: '', ctNUV: '', ctLmm: '', ctLargmm: '', ctHmm: '', ctPesoVuoto: '',
    bancStrato: '', bancStrati: '',
    prodRagione: '', prodTel: '', prodEmail: '', prodSito: '',
    processSteps: ['', '', '', ''], criticalPoints: '',
    costPerKg: '', batchSize: '', packagingCost: '', laborCost: '', sellPrice: '',
};

export function SchedeCompleteCalc() {
    const { user } = useAuth();
    const [data, setData] = useState<SchedaCompleta>(defaults);
    const [activeTab, setActiveTab] = useState<'tecnica' | 'processo' | 'costi'>('tecnica');

    // Archive state
    const { items: savedItems, saveItem, deleteItem } = useArchive<SchedaCompleta>('aea_archive_schede');
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [currentId, setCurrentId] = useState<string | undefined>(undefined);
    const [currentName, setCurrentName] = useState('');

    const set = (field: keyof SchedaCompleta, val: string | boolean) =>
        setData((prev) => ({ ...prev, [field]: val }));

    const setStep = (i: number, val: string) =>
        setData((prev) => {
            const steps = [...prev.processSteps];
            steps[i] = val;
            return { ...prev, processSteps: steps };
        });

    // Cost calculations
    const rawCost = parseFloat(data.costPerKg) || 0;
    const batch = parseFloat(data.batchSize) || 0;
    const packaging = parseFloat(data.packagingCost) || 0;
    const labor = parseFloat(data.laborCost) || 0;
    const sell = parseFloat(data.sellPrice) || 0;

    const totalCostKg = rawCost + (batch > 0 ? (packaging + labor) / batch : 0);
    const margin = sell > 0 && totalCostKg > 0 ? ((sell - totalCostKg) / sell) * 100 : 0;

    const handleSave = () => {
        const nameToSave = currentName || data.productName || prompt("Inserisci un nome per la scheda: ", 'Scheda ' + new Date().toLocaleDateString());
        if (!nameToSave) return; // User cancelled

        const id = saveItem(nameToSave, data, currentId);
        setCurrentId(id);
        setCurrentName(nameToSave);
        alert("Scheda salvata con successo nell'archivio!");
    };

    const handleLoad = (item: any) => {
        setData(item.data as SchedaCompleta);
        setCurrentId(item.id);
        setCurrentName(item.name);
        setIsArchiveOpen(false);
    };

    const handleNew = () => {
        if (data.productName || data.description) {
            if (!confirm('Vuoi iniziare una nuova scheda? I dati non salvati andranno persi.')) return;
        }
        setData(defaults);
        setCurrentId(undefined);
        setCurrentName('');
        setActiveTab('tecnica');
    };

    const handlePDF = () => {
        const date = new Date().toLocaleDateString('it-IT');
        const filledSteps = data.processSteps.filter((s) => s.trim());
        generatePDFReport({
            title: 'Scheda Completa',
            toolName: 'Schede Complete',
            userName: user?.name ?? '',
            company: user?.company ?? '',
            date,
            inputs: [
                { label: 'Prodotto', value: data.productName || '—' },
                { label: 'Categoria', value: data.category || '—' },
                { label: 'Shelf life', value: data.shelfLife || '—' },
                { label: 'T conservazione', value: data.storageTemp || '—' },
                { label: 'Imballaggio', value: data.packaging || '—' },
                { label: 'Certificazioni', value: data.certifications || '—' },
                ...filledSteps.map((s, i) => ({ label: `Fase ${i + 1}`, value: s })),
                { label: 'Punti CCP', value: data.criticalPoints || '—' },
            ],
            outputs: [
                { label: 'Costo totale/kg', value: totalCostKg > 0 ? `€ ${totalCostKg.toFixed(2)}/kg` : '—' },
                { label: 'Margine', value: totalCostKg > 0 ? `${margin.toFixed(1)}%` : '—' },
                { label: 'Prezzo vendita', value: sell > 0 ? `€ ${sell}/kg` : '—' },
                { label: 'Utile/kg', value: sell > 0 && totalCostKg > 0 ? `€ ${(sell - totalCostKg).toFixed(2)}` : '—' },
            ],
        });
    };

    const tabs = [
        { id: 'tecnica' as const, label: '📋 Scheda Tecnica' },
        { id: 'processo' as const, label: '⚙️ Scheda Processo' },
        { id: 'costi' as const, label: '💰 Scheda Costi' },
    ];

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
                            <span><strong>Prodotto:</strong> {d.productName || '-'}</span><br />
                            <span><strong>Categoria:</strong> {d.category || '-'}</span>
                        </>
                    )}
                />
            )}

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1>📋 Schede Complete</h1>
                    <p>Scheda tecnica + Scheda processo + Scheda costi in un unico strumento</p>
                    {currentId && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0,163,108,0.1)', color: 'var(--color-accent)', padding: '4px 12px', borderRadius: 16, fontSize: 13, fontWeight: 700, marginTop: 8 }}>
                            ✏️ Modifica in corso: {currentName}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn btn-outline" style={{ background: 'white', padding: '8px 16px' }} onClick={handleNew}>✨ Nuovo</button>
                    <button className="btn btn-outline" style={{ background: 'white', padding: '8px 16px' }} onClick={() => setIsArchiveOpen(true)}>📂 Apri Archivio ({savedItems.length})</button>
                    <button className="btn btn-accent" style={{ padding: '8px 16px' }} onClick={handleSave}>💾 {currentId ? 'Salva Modifiche' : 'Salva'}</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        className={`btn ${activeTab === t.id ? 'btn-accent' : 'btn-outline'}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'tecnica' && (
                <div>
                    <Guide storageKey="tecnica_guide_open" title="Guida Scheda Tecnica"
                        steps={[
                            { n:1, icon:'🏷️', title:'Dati prodotto', desc:'Codice, denominazione e descrizione del prodotto.', badge:'identificazione' },
                            { n:2, icon:'🔬', title:'Caratteristiche', desc:'Parametri chimico-fisici, microbiologici e organolettici con standard di riferimento.', badge:'spec. tecniche' },
                            { n:3, icon:'📊', title:'Valori nutrizionali', desc:'Si compilano automaticamente se hai salvato la ricetta nel tool Valori Nutrizionali.', badge:'auto' },
                            { n:4, icon:'⚠️', title:'Allergeni', desc:'Indica per tutti i 14 allergeni UE se presenti come ingredienti o per cross contamination.', badge:'obbligatorio' },
                            { n:5, icon:'📦', title:'Packaging', desc:'Specifiche imballo primario, secondario e bancale con calcoli automatici a cascata.', badge:'logistica' },
                            { n:6, icon:'📄', title:'Esporta', desc:'Scarica la scheda tecnica PDF pronta per i tuoi clienti B2B e distributori.', badge:'B2B' },
                        ]}
                        notes={['💡 Molti campi si compilano automaticamente dalla ricetta salvata in archivio.','⚠️ Aggiorna la scheda ogni volta che cambi ricetta, ingredienti o fornitori.','📋 Conserva sempre una copia firmata nella documentazione di prodotto.']}
                    />
                    <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: 18 }}>Scheda Tecnica del Prodotto</h3>
                        <div className="form-field">
                            <label>Nome prodotto *</label>
                            <input className="form-input" type="text" value={data.productName} onChange={(e) => set('productName', e.target.value)} placeholder="es. Crema di Peperoni Arrostiti" />
                        </div>
                        <div className="form-row">
                            <div className="form-field">
                                <label>Categoria merceologica</label>
                                <input className="form-input" type="text" value={data.category} onChange={(e) => set('category', e.target.value)} placeholder="es. Conserve vegetali" />
                            </div>
                            <div className="form-field">
                                <label>Shelf life</label>
                                <input className="form-input" type="text" value={data.shelfLife} onChange={(e) => set('shelfLife', e.target.value)} placeholder="es. 24 mesi dalla data produzione" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-field">
                                <label>Temperatura di conservazione</label>
                                <input className="form-input" type="text" value={data.storageTemp} onChange={(e) => set('storageTemp', e.target.value)} placeholder="es. +4°C / +20°C" />
                            </div>
                            <div className="form-field">
                                <label>Tipo di imballaggio</label>
                                <input className="form-input" type="text" value={data.packaging} onChange={(e) => set('packaging', e.target.value)} placeholder="es. Vasetto vetro 200g, tappo twist-off" />
                            </div>
                        </div>
                        <div className="form-field">
                            <label>Descrizione prodotto</label>
                            <textarea rows={3} value={data.description} onChange={(e) => set('description', e.target.value)}
                                placeholder="Descrizione organolettica, aspetto, colore, odore, sapore..."
                                style={{ width: '100%', background: 'var(--color-bg-input)', border: '1.5px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)', padding: '10px 14px', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', outline: 'none' }} />
                        </div>
                        <div className="form-field">
                            <label>Certificazioni / standard qualità</label>
                            <input className="form-input" type="text" value={data.certifications} onChange={(e) => set('certifications', e.target.value)} placeholder="es. BRC, IFS, Bio, DOP..." />
                        </div>

                        {/* OGM */}
                        <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
                                <input type="checkbox" checked={data.ogmChecked} onChange={e => set('ogmChecked', e.target.checked)} />
                                Dichiarazione OGM
                            </label>
                            {data.ogmChecked && (
                                <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic', lineHeight: 1.6 }}>
                                    "Il prodotto non consiste, non contiene e non deriva da Organismi Geneticamente Modificati. Pertanto, in ottemperanza ai regolamenti CE 1829/2003 e CE 1830/2003 non è richiesta la dichiarazione in merito ad essi."
                                </div>
                            )}
                        </div>

                        {/* Packaging UV */}
                        <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 14, fontSize: 14 }}>📦 Packaging — Unità di vendita</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
                            <div className="form-field" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                                <label className="form-label">Descrizione UV</label>
                                <input className="form-input" type="text" value={data.uvDescrizione} onChange={e => set('uvDescrizione', e.target.value)} placeholder="es. Vasetto vetro 200g con tappo" />
                            </div>
                            {([['uvPesoNettoG','Peso netto nominale (g)'], ['uvLmm','Lunghezza (mm)'], ['uvLargmm','Larghezza (mm)'], ['uvHmm','Altezza (mm)'], ['uvPesoImb','Peso imballo (g)'], ['uvEan','Codice EAN']] as const).map(([f, lbl]) => (
                                <div key={f} className="form-field" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11 }}>{lbl}</label>
                                    <input className="form-input" type={f === 'uvEan' ? 'text' : 'number'} value={(data as any)[f]} onChange={e => set(f, e.target.value)} />
                                </div>
                            ))}
                            <div className="form-field" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: 11 }}>Peso lordo (g) — auto</label>
                                <input className="form-input" readOnly value={((parseFloat(data.uvPesoNettoG)||0)+(parseFloat(data.uvPesoImb)||0)).toFixed(0)} style={{ background: '#f5f5f5' }} />
                            </div>
                        </div>

                        {/* Packaging Cartone */}
                        <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 14, fontSize: 14 }}>📦 Packaging — Imballo secondario (cartone)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
                            <div className="form-field" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                                <label className="form-label">Descrizione</label>
                                <input className="form-input" type="text" value={data.ctDescrizione} onChange={e => set('ctDescrizione', e.target.value)} placeholder="es. Cartone americano" />
                            </div>
                            {([['ctNUV','N° UV per cartone'],['ctLmm','Lun. mm'],['ctLargmm','Larg. mm'],['ctHmm','H mm'],['ctPesoVuoto','Peso vuoto (g)']] as const).map(([f,lbl]) => (
                                <div key={f} className="form-field" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11 }}>{lbl}</label>
                                    <input className="form-input" type="number" value={(data as any)[f]} onChange={e => set(f, e.target.value)} />
                                </div>
                            ))}
                            <div className="form-field" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: 11 }}>Peso netto cartone (kg) — auto</label>
                                <input className="form-input" readOnly value={((parseFloat(data.ctNUV)||0)*(parseFloat(data.uvPesoNettoG)||0)/1000).toFixed(3)} style={{ background: '#f5f5f5' }} />
                            </div>
                            <div className="form-field" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: 11 }}>Peso lordo cartone (kg) — auto</label>
                                <input className="form-input" readOnly value={((parseFloat(data.ctNUV)||0)*(parseFloat(data.uvPesoNettoG)||0)/1000+(parseFloat(data.ctPesoVuoto)||0)/1000).toFixed(3)} style={{ background: '#f5f5f5' }} />
                            </div>
                        </div>

                        {/* Bancale */}
                        <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 14, fontSize: 14 }}>🏗️ Packaging — Bancale</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
                            {([['bancStrato','N° cartoni per strato'],['bancStrati','N° strati']] as const).map(([f,lbl]) => (
                                <div key={f} className="form-field" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11 }}>{lbl}</label>
                                    <input className="form-input" type="number" value={(data as any)[f]} onChange={e => set(f, e.target.value)} />
                                </div>
                            ))}
                            {(() => {
                                const strato = parseFloat(data.bancStrato)||0;
                                const strati = parseFloat(data.bancStrati)||0;
                                const nUVPerCart = parseFloat(data.ctNUV)||0;
                                const altCart = parseFloat(data.ctHmm)||0;
                                const pesoLordoCart = nUVPerCart*(parseFloat(data.uvPesoNettoG)||0)/1000+(parseFloat(data.ctPesoVuoto)||0)/1000;
                                const cartBancale = strato*strati;
                                const uvBancale = cartBancale*nUVPerCart;
                                const altBancale = strati*altCart;
                                const pesoBancale = cartBancale*pesoLordoCart;
                                return [
                                    ['N° cartoni bancale', cartBancale.toFixed(0)],
                                    ['N° UV per bancale', uvBancale.toFixed(0)],
                                    ['Altezza bancale (mm)', altBancale.toFixed(0)],
                                    ['Peso bancale (kg)', pesoBancale.toFixed(2)],
                                ].map(([lbl,val]) => (
                                    <div key={lbl} className="form-field" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11 }}>{lbl} — auto</label>
                                        <input className="form-input" readOnly value={val} style={{ background: '#f5f5f5' }} />
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Produttore */}
                        <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 14, fontSize: 14 }}>🏢 Dati Produttore</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                            {([['prodRagione','Ragione sociale e sede'],['prodTel','Telefono'],['prodEmail','Email'],['prodSito','Sito web']] as const).map(([f,lbl]) => (
                                <div key={f} className="form-field" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11 }}>{lbl}</label>
                                    <input className="form-input" type="text" value={(data as any)[f]} onChange={e => set(f, e.target.value)} />
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 16, padding: '12px 16px', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 24 }}>Spazio firma e timbro:</div>
                            <div style={{ borderTop: '1px solid #ccc', width: 240, marginLeft: 20 }} />
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, marginLeft: 20 }}>Firma e timbro responsabile qualità</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'processo' && (
                <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: 18 }}>Scheda Processo Produttivo</h3>
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Fasi del Processo</div>
                        {data.processSteps.map((step, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                                <div style={{
                                    width: 28, height: 28, flexShrink: 0,
                                    background: 'rgba(0,163,108,0.15)',
                                    border: '1px solid rgba(0,163,108,0.3)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, fontWeight: 700, color: 'var(--color-accent)',
                                }}>
                                    {i + 1}
                                </div>
                                <input
                                    type="text"
                                    value={step}
                                    onChange={(e) => setStep(i, e.target.value)}
                                    placeholder={`Fase ${i + 1}: es. Lavaggio e cernita materie prime`}
                                    style={{ flex: 1, background: 'var(--color-bg-input)', border: '1.5px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)', padding: '10px 14px', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
                                />
                            </div>
                        ))}
                        <button className="btn btn-outline" onClick={() => setData((p) => ({ ...p, processSteps: [...p.processSteps, ''] }))}>
                            + Aggiungi fase
                        </button>
                    </div>
                    <div className="form-field">
                        <label>Punti critici di controllo (CCP / HACCP)</label>
                        <textarea
                            rows={4}
                            value={data.criticalPoints}
                            onChange={(e) => set('criticalPoints', e.target.value)}
                            placeholder="es. CCP1: Trattamento termico T>85°C per 15min. CCP2: Temperatura magazzino <4°C. CCP3: Rilevazione metalli con metal detector."
                            style={{ width: '100%', background: 'var(--color-bg-input)', border: '1.5px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)', padding: '10px 14px', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', outline: 'none' }}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'costi' && (
                <div className="card-grid-2" style={{ alignItems: 'start' }}>
                    <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: 18 }}>Voci di Costo</h3>
                        <div className="form-field">
                            <label>Costo materie prime (€/kg)</label>
                            <input type="number" min={0} step={0.01} value={data.costPerKg} onChange={(e) => set('costPerKg', e.target.value)} placeholder="es. 1.20" />
                        </div>
                        <div className="form-field">
                            <label>Dimensione lotto (kg)</label>
                            <input type="number" min={0} step={0.1} value={data.batchSize} onChange={(e) => set('batchSize', e.target.value)} placeholder="es. 100" />
                        </div>
                        <div className="form-field">
                            <label>Costo imballaggio per lotto (€)</label>
                            <input type="number" min={0} step={0.01} value={data.packagingCost} onChange={(e) => set('packagingCost', e.target.value)} placeholder="es. 80" />
                        </div>
                        <div className="form-field">
                            <label>Costo manodopera per lotto (€)</label>
                            <input type="number" min={0} step={0.01} value={data.laborCost} onChange={(e) => set('laborCost', e.target.value)} placeholder="es. 120" />
                        </div>
                        <div className="form-field">
                            <label>Prezzo di vendita (€/kg)</label>
                            <input type="number" min={0} step={0.01} value={data.sellPrice} onChange={(e) => set('sellPrice', e.target.value)} placeholder="es. 5.00" />
                        </div>
                    </div>

                    <div>
                        {totalCostKg > 0 && (
                            <div className="result-box">
                                <h3>💰 Analisi Costi</h3>
                                <div className="stat-grid">
                                    <div className="stat-card">
                                        <div className="stat-value">€ {totalCostKg.toFixed(2)}</div>
                                        <div className="stat-label">Costo totale/kg</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value" style={{ color: margin > 30 ? 'var(--color-success)' : margin > 15 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                                            {margin.toFixed(1)}%
                                        </div>
                                        <div className="stat-label">Margine lordo</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">€ {sell || '—'}</div>
                                        <div className="stat-label">Prezzo vendita</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">€ {(sell - totalCostKg).toFixed(2)}</div>
                                        <div className="stat-label">Utile/kg</div>
                                    </div>
                                </div>

                                <div className={`alert ${margin >= 30 ? 'alert-success' : margin >= 15 ? 'alert-info' : 'alert-danger'}`} style={{ marginTop: 16 }}>
                                    {margin >= 30
                                        ? `✓ Margine eccellente (${margin.toFixed(1)}%)`
                                        : margin >= 15
                                            ? `ℹ️ Margine accettabile (${margin.toFixed(1)}%) — considera ottimizzazioni`
                                            : `⚠️ Margine basso (${margin.toFixed(1)}%) — rivedi la struttura dei costi`}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="btn-group" style={{ marginTop: 20 }}>
                <button className="btn btn-accent" disabled={!data.productName} onClick={handlePDF}>
                    📄 Genera Report PDF Completo
                </button>
            </div>
        </div>
    );
}
