import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { generatePDFReport } from '../../utils/pdfGenerator';
import { useArchive } from '../../hooks/useArchive';
import { ArchiveModal } from '../../components/ArchiveModal';

interface LabelData {
    productName: string;
    producer: string;
    address: string;
    netWeight: string;
    ingredients: string;
    allergens: string;
    storageConditions: string;
    bestBefore: string;
    lotNumber: string;
    countryOrigin: string;
    widthMm: string;
    heightMm: string;
    bgImageUrl: string;
    logoUrl: string;
    theme: 'light' | 'dark';
    // Parametri trasformazione immagini
    bgScale: number;
    bgPosX: number;
    bgPosY: number;
    logoScale: number;
    logoPosX: number;
    logoPosY: number;
}

const defaults: LabelData = {
    productName: '',
    producer: '',
    address: '',
    netWeight: '',
    ingredients: '',
    allergens: '',
    storageConditions: '',
    bestBefore: '',
    lotNumber: '',
    countryOrigin: 'Italia',
    widthMm: '100',
    heightMm: '150',
    bgImageUrl: '',
    logoUrl: '',
    theme: 'light',
    bgScale: 100,
    bgPosX: 50,
    bgPosY: 50,
    logoScale: 100,
    logoPosX: 50,
    logoPosY: 10,
};

function SliderControl({ label, value, min, max, onChange, unit = '%' }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void, unit?: string }) {
    return (
        <div className="form-field" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ margin: 0, fontSize: 12 }}>{label}</label>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>{value}{unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{ width: '100%', height: 4, background: '#eee', borderRadius: 2, appearance: 'none', cursor: 'pointer' }}
            />
        </div>
    );
}

export function EtichetteCalc() {
    const { user } = useAuth();
    const [data, setData] = useState<LabelData>(defaults);
    const [generated, setGenerated] = useState(false);

    // Archive state
    const { items: savedLabels, saveItem, deleteItem } = useArchive<LabelData>('aea_archive_etichette');
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [currentId, setCurrentId] = useState<string | undefined>(undefined);
    const [currentName, setCurrentName] = useState('');

    const set = <K extends keyof LabelData>(field: K, val: LabelData[K]) =>
        setData((prev) => ({ ...prev, [field]: val }));

    const handleFileUpload = (field: 'bgImageUrl' | 'logoUrl', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                set(field, reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const isComplete = data.productName && data.producer && data.ingredients && data.netWeight;

    const handleGenerate = () => setGenerated(true);

    const handleSave = () => {
        const nameToSave = currentName || data.productName || prompt("Inserisci un nome per l'etichetta salvata: ", 'Etichetta ' + new Date().toLocaleDateString());
        if (!nameToSave) return;

        const id = saveItem(nameToSave, data, currentId);
        setCurrentId(id);
        setCurrentName(nameToSave);
        alert("Etichetta salvata con successo nell'archivio!");
    };

    const handleLoad = (item: { data: LabelData; id: string; name: string }) => {
        setData(item.data);
        setCurrentId(item.id);
        setCurrentName(item.name);
        setGenerated(false);
        setIsArchiveOpen(false);
    };

    const handleNew = () => {
        if (data.productName || data.producer) {
            if (!confirm('Vuoi iniziare una nuova etichetta? I dati non salvati andranno persi.')) return;
        }
        setData(defaults);
        setCurrentId(undefined);
        setCurrentName('');
        setGenerated(false);
    };

    const handlePDF = () => {
        const date = new Date().toLocaleDateString('it-IT');
        generatePDFReport({
            title: 'Etichetta Alimentare',
            toolName: 'Generatore Etichette Alimentari',
            userName: user?.name ?? '',
            company: user?.company ?? '',
            date,
            inputs: [
                { label: 'Prodotto', value: data.productName },
                { label: 'Produttore', value: data.producer },
                { label: 'Indirizzo', value: data.address },
                { label: 'Peso netto', value: data.netWeight },
                { label: 'Paese origine', value: data.countryOrigin },
            ],
            outputs: [
                { label: 'Denominazione', value: data.productName },
                { label: 'Ingredienti', value: data.ingredients.length > 60 ? data.ingredients.slice(0, 60) + '...' : data.ingredients },
                { label: 'Allergeni', value: data.allergens || 'Nessuno dichiarato' },
                { label: 'Conservazione', value: data.storageConditions },
                { label: 'TMC/Scadenza', value: data.bestBefore },
                { label: 'Lotto', value: data.lotNumber },
            ],
        });
    };

    // Calcolo scala font dinamica basata sulla dimensione dell'etichetta
    // Usiamo la dimensione minima (width o height) come riferimento per la base
    const baseDim = Math.min(Number(data.widthMm), Number(data.heightMm));
    const fontScale = baseDim / 100; // Normalizzato su 100mm

    return (
        <div>
            {isArchiveOpen && (
                <ArchiveModal
                    items={savedLabels}
                    currentId={currentId}
                    onClose={() => setIsArchiveOpen(false)}
                    onLoad={handleLoad}
                    onDelete={deleteItem}
                    renderItemDetails={(d) => (
                        <>
                            <span><strong>Prodotto:</strong> {d.productName || '-'}</span><br />
                            <span><strong>Produttore:</strong> {d.producer || '-'}</span>
                        </>
                    )}
                />
            )}

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1>🏷️ Etichette Alimentari</h1>
                    <p>Generazione etichette conformi Reg. UE 1169/2011 per prodotti preconfezionati</p>
                    {currentId && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0,163,108,0.1)', color: 'var(--color-accent)', padding: '4px 12px', borderRadius: 16, fontSize: 13, fontWeight: 700, marginTop: 8 }}>
                            ✏️ Modifica in corso: {currentName}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn btn-outline" style={{ background: 'white', padding: '8px 16px' }} onClick={handleNew}>✨ Nuovo</button>
                    <button className="btn btn-outline" style={{ background: 'white', padding: '8px 16px' }} onClick={() => setIsArchiveOpen(true)}>📂 Apri Archivio ({savedLabels.length})</button>
                    <button className="btn btn-accent" style={{ padding: '8px 16px' }} onClick={handleSave}>💾 {currentId ? 'Salva Modifiche' : 'Salva'}</button>
                </div>
            </div>

            <div className="card-grid-2" style={{ alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Dati del Prodotto</h3>

                        <div className="form-field">
                            <label>Denominazione del prodotto *</label>
                            <input type="text" value={data.productName} onChange={(e) => set('productName', e.target.value)} placeholder="es. Pomodori pelati in succo di pomodoro" />
                        </div>
                        <div className="form-row">
                            <div className="form-field">
                                <label>Produttore / Responsabile *</label>
                                <input type="text" value={data.producer} onChange={(e) => set('producer', e.target.value)} placeholder="Ragione sociale" />
                            </div>
                            <div className="form-field">
                                <label>Indirizzo stabilimento</label>
                                <input type="text" value={data.address} onChange={(e) => set('address', e.target.value)} placeholder="Via, CAP, Città" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-field">
                                <label>Quantità netta *</label>
                                <input type="text" value={data.netWeight} onChange={(e) => set('netWeight', e.target.value)} placeholder="es. 400 g" />
                            </div>
                            <div className="form-field">
                                <label>Paese di origine</label>
                                <input type="text" value={data.countryOrigin} onChange={(e) => set('countryOrigin', e.target.value)} />
                            </div>
                        </div>

                        <div className="form-field">
                            <label>Elenco ingredienti * (in ordine decrescente di peso)</label>
                            <textarea
                                rows={3}
                                value={data.ingredients}
                                onChange={(e) => set('ingredients', e.target.value)}
                                placeholder="es. Pomodori 85%, succo di pomodoro, sale marino"
                                style={{ width: '100%', background: 'var(--color-bg-input)', border: '1.5px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)', padding: '10px 14px', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', outline: 'none' }}
                            />
                            <span className="hint">Gli allergeni devono essere evidenziati (es. in MAIUSCOLO o corsivo)</span>
                        </div>

                        <div className="form-field">
                            <label>Dichiarazione allergeni (Art. 21 Reg. 1169/2011)</label>
                            <input type="text" value={data.allergens} onChange={(e) => set('allergens', e.target.value)} placeholder="es. Contiene: Glutine. Può contenere tracce di: Latte, Uova" />
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label>Modalità di conservazione</label>
                                <input type="text" value={data.storageConditions} onChange={(e) => set('storageConditions', e.target.value)} placeholder="es. Conservare in luogo fresco e asciutto" />
                            </div>
                            <div className="form-field">
                                <label>TMC / Data scadenza</label>
                                <input type="text" value={data.bestBefore} onChange={(e) => set('bestBefore', e.target.value)} placeholder="es. Da consumarsi preferibilmente entro: fine" />
                            </div>
                        </div>

                        <div className="form-field">
                            <label>Numero di lotto</label>
                            <input type="text" value={data.lotNumber} onChange={(e) => set('lotNumber', e.target.value)} placeholder="es. L001234" />
                        </div>

                        <div className="btn-group">
                            <button className="btn btn-accent" disabled={!isComplete} onClick={handleGenerate}>
                                👁️ Aggiorna Anteprima Dati
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📏 Dimensioni & 🎨 Grafica Personalizzata</h3>

                        <div className="form-row">
                            <div className="form-field">
                                <label>Base (mm)</label>
                                <input type="number" value={data.widthMm} onChange={(e) => set('widthMm', e.target.value)} min="10" />
                            </div>
                            <div className="form-field">
                                <label>Altezza (mm)</label>
                                <input type="number" value={data.heightMm} onChange={(e) => set('heightMm', e.target.value)} min="10" />
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, marginTop: 10 }}>
                            <div className="form-field">
                                <label>🖼️ Immagine di Sfondo</label>
                                <input type="file" accept="image/*" onChange={(e) => handleFileUpload('bgImageUrl', e)} style={{ fontSize: 13, marginBottom: 12 }} />
                                {data.bgImageUrl && (
                                    <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8 }}>
                                        <SliderControl label="Scala Sfondo" value={data.bgScale} min={10} max={300} onChange={(v) => set('bgScale', v)} />
                                        <div className="form-row">
                                            <SliderControl label="Pos. Orizzontale" value={data.bgPosX} min={0} max={100} onChange={(v) => set('bgPosX', v)} />
                                            <SliderControl label="Pos. Verticale" value={data.bgPosY} min={0} max={100} onChange={(v) => set('bgPosY', v)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, marginTop: 10 }}>
                            <div className="form-field">
                                <label>🏢 Logo Aziendale</label>
                                <input type="file" accept="image/*" onChange={(e) => handleFileUpload('logoUrl', e)} style={{ fontSize: 13, marginBottom: 12 }} />
                                {data.logoUrl && (
                                    <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8 }}>
                                        <SliderControl label="Dimensione Logo" value={data.logoScale} min={10} max={200} onChange={(v) => set('logoScale', v)} />
                                        <div className="form-row">
                                            <SliderControl label="Pos. Orizzontale" value={data.logoPosX} min={0} max={100} onChange={(v) => set('logoPosX', v)} />
                                            <SliderControl label="Pos. Verticale" value={data.logoPosY} min={0} max={100} onChange={(v) => set('logoPosY', v)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-field" style={{ marginTop: 20 }}>
                            <label>Tema Testo (per contrasto)</label>
                            <select
                                value={data.theme}
                                onChange={(e) => set('theme', e.target.value as 'light' | 'dark')}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
                            >
                                <option value="light">Testo Scuro (su sfondo chiaro)</option>
                                <option value="dark">Testo Chiaro (su sfondo scuro)</option>
                            </select>
                        </div>

                        {(data.bgImageUrl || data.logoUrl) && (
                            <button className="btn btn-outline btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={() => {
                                set('bgImageUrl', '');
                                set('logoUrl', '');
                                set('bgScale', 100);
                                set('bgPosX', 50);
                                set('bgPosY', 50);
                                set('logoScale', 100);
                                set('logoPosX', 50);
                                set('logoPosY', 10);
                            }}>
                                Rimuovi Immagini & Reset Trasformazioni
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    {(generated || data.bgImageUrl || data.logoUrl) && isComplete ? (
                        <>
                            <div className="result-box">
                                <h3>🏷️ Anteprima Etichetta</h3>
                                <div style={{
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    background: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 20px 20px',
                                    padding: 20, borderRadius: 8, border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{
                                        position: 'relative',
                                        width: '100%',
                                        maxWidth: `${data.widthMm}mm`,
                                        aspectRatio: `${data.widthMm} / ${data.heightMm}`,
                                        background: data.bgImageUrl
                                            ? `url(${data.bgImageUrl}) ${data.bgPosX}% ${data.bgPosY}% / ${data.bgScale}% no-repeat`
                                            : (data.theme === 'dark' ? '#222' : '#fff'),
                                        backgroundColor: data.theme === 'dark' ? '#222' : '#fff',
                                        color: data.theme === 'dark' ? '#fff' : '#111',
                                        borderRadius: 4,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        border: '1px solid #ccc',
                                        overflow: 'hidden',
                                        display: 'flex', flexDirection: 'column',
                                    }}>
                                        {/* Logo posizionato in modo assoluto */}
                                        {data.logoUrl && (
                                            <div style={{
                                                position: 'absolute',
                                                left: `${data.logoPosX}%`,
                                                top: `${data.logoPosY}%`,
                                                transform: `translate(-50%, -10%)`, // Centra rispetto alla posizione X
                                                zIndex: 10,
                                                width: `${40 * fontScale * (data.logoScale / 100)}mm`,
                                                maxWidth: '90%',
                                                textAlign: 'center'
                                            }}>
                                                <img
                                                    src={data.logoUrl}
                                                    alt="Logo"
                                                    style={{
                                                        width: '100%',
                                                        maxHeight: `${60 * fontScale}mm`,
                                                        objectFit: 'contain'
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Overlay testuale adattivo */}
                                        <div style={{
                                            background: data.bgImageUrl ? (data.theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)') : 'transparent',
                                            padding: `${12 * fontScale}px`,
                                            margin: `${10 * fontScale}px`,
                                            borderRadius: 4,
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-end', // Porta il testo verso il basso per lasciare spazio al logo se posizionato in alto
                                            overflow: 'hidden',
                                            fontFamily: 'Arial, sans-serif',
                                            fontSize: `${11 * fontScale}px`,
                                            lineHeight: 1.4,
                                            zIndex: 5
                                        }}>
                                            <div style={{
                                                fontSize: `${16 * fontScale}px`,
                                                fontWeight: 800,
                                                marginBottom: `${8 * fontScale}px`,
                                                borderBottom: `2px solid ${data.theme === 'dark' ? '#fff' : '#000'}`,
                                                paddingBottom: `${6 * fontScale}px`,
                                                textAlign: 'center',
                                                textTransform: 'uppercase'
                                            }}>
                                                {data.productName}
                                            </div>

                                            <div style={{ overflowY: 'auto', maxHeight: '60%' }}>
                                                <div style={{ marginBottom: `${6 * fontScale}px` }}><strong>Ingredienti:</strong> {data.ingredients}</div>
                                                {data.allergens && <div style={{ marginBottom: `${6 * fontScale}px`, fontWeight: 700 }}>{data.allergens}</div>}
                                                <div style={{ marginBottom: `${6 * fontScale}px` }}>
                                                    <strong>Prodotto da:</strong> {data.producer}
                                                    {data.address && <><br />{data.address}</>}
                                                </div>
                                                {data.countryOrigin && <div style={{ marginBottom: `${6 * fontScale}px` }}><strong>Origine:</strong> {data.countryOrigin}</div>}
                                                {data.storageConditions && <div style={{ marginBottom: `${6 * fontScale}px` }}><strong>Conservazione:</strong> {data.storageConditions}</div>}
                                            </div>

                                            <div style={{
                                                marginTop: 'auto',
                                                borderTop: `1px solid ${data.theme === 'dark' ? '#777' : '#ccc'}`,
                                                paddingTop: `${8 * fontScale}px`,
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: `${8 * fontScale}px`,
                                                fontSize: `${10 * fontScale}px`
                                            }}>
                                                <div>
                                                    <strong>Peso netto:</strong><br />
                                                    <span style={{ fontSize: `${14 * fontScale}px`, fontWeight: 700 }}>{data.netWeight}</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    {data.lotNumber && <><strong>Lotto:</strong> {data.lotNumber}<br /></>}
                                                    {data.bestBefore && <strong>{data.bestBefore}</strong>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="btn-group">
                                <button className="btn btn-accent" onClick={handlePDF}>📄 Genera Report PDF</button>
                            </div>
                        </>
                    ) : (
                        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🏷️</div>
                            <p>Compila i campi obbligatori (*) e clicca su "Anteprima Etichetta" per visualizzare il risultato.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
