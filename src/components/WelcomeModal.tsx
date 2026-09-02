import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Database, Layers, Scale, ExternalLink } from 'lucide-react';

interface Slide {
    icon: React.ReactNode;
    title: string;
    content: React.ReactNode;
}

interface WelcomeModalProps {
    onClose: () => void;
    onNeverShow: () => void;
    slides?: Slide[];
}

// eslint-disable-next-line react-refresh/only-export-components
export const NUTRIZIONALE_SLIDES: Slide[] = [
    {
        icon: <Layers size={28} strokeWidth={1.5} />,
        title: 'Come funziona il calcolatore',
        content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                    { step: '1', label: 'Ingredienti', desc: 'Cerca i valori nutrizionali nel database integrato o inseriscili manualmente.' },
                    { step: '2', label: 'Ricetta', desc: 'Assembla gli ingredienti con le quantità e imposta il peso finito dopo la lavorazione.' },
                    { step: '3', label: 'Tabella', desc: 'Genera l\'etichetta nutrizionale ufficiale per UE, USA, Canada, Australia o Paesi Arabi.' },
                ].map(s => (
                    <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{
                            minWidth: 28, height: 28, borderRadius: '50%',
                            background: 'var(--color-orange)', color: '#fff',
                            fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{s.step}</div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)', marginBottom: 2 }}>{s.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        icon: <Database size={28} strokeWidth={1.5} />,
        title: 'Dove trovare i valori nutrizionali?',
        content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    Cerca i valori per 100g di ogni ingrediente nei database ufficiali, poi inseriscili nel calcolatore.
                </p>
                {[
                    { name: 'CREA — Alimenti & Nutrizione', note: 'Database italiano ufficiale', url: 'https://www.alimentinutrizione.it/sezioni/tabelle-nutrizionali' },
                    { name: 'USDA FoodData Central', note: 'Database americano, il più completo', url: 'https://fdc.nal.usda.gov/' },
                    { name: 'ANSES Ciqual', note: 'Database francese (ANSES)', url: 'https://ciqual.anses.fr/' },
                ].map(db => (
                    <a key={db.name} href={db.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', textDecoration: 'none', background: 'var(--color-surface)' }}>
                        <ExternalLink size={12} style={{ flexShrink: 0, color: 'var(--color-orange)' }} />
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{db.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{db.note}</div>
                        </div>
                    </a>
                ))}
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    Trovi tutti i link nella sezione <strong>Risorse</strong> dell'app.
                </p>
            </div>
        ),
    },
    {
        icon: <Scale size={28} strokeWidth={1.5} />,
        title: 'Attenzione al peso finito',
        content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    Il <strong>peso finito</strong> è il peso del prodotto <em>dopo</em> la lavorazione (cottura, disidratazione, evaporazione).
                    Non inserirlo significa calcolare la tabella sul peso crudo degli ingredienti.
                </p>
                <div style={{ background: 'rgba(255,126,46,0.08)', border: '1px solid rgba(255,126,46,0.3)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-orange)', marginBottom: 8 }}>Esempio — pasta cotta</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>100g pasta cruda</span>
                        <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>220g pasta cotta</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                        → Peso finito da inserire: <strong style={{ color: 'var(--color-text)' }}>220g</strong>
                    </div>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    Per prodotti non cotti o che non perdono peso, lascia il campo vuoto.
                </p>
            </div>
        ),
    },
];

// eslint-disable-next-line react-refresh/only-export-components
export const ETICHETTE_SLIDES: Slide[] = [
    {
        icon: <Layers size={28} strokeWidth={1.5} />,
        title: 'Come funziona il generatore',
        content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                    { step: '1', label: 'Ricetta collegata', desc: 'Collega una ricetta salvata nel tool Valori Nutrizionali per compilare automaticamente ingredienti, QUID, allergeni e tabella nutrizionale.' },
                    { step: '2', label: 'Dati del prodotto', desc: 'Compila i campi obbligatori (denominazione, produttore, quantità netta, ingredienti) richiesti dal Reg. UE 1169/2011.' },
                    { step: '3', label: 'Grafica e anteprima', desc: 'Imposta dimensioni, sfondo e logo, poi genera l\'anteprima dell\'etichetta e scarica il report.' },
                ].map(s => (
                    <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{
                            minWidth: 28, height: 28, borderRadius: '50%',
                            background: 'var(--color-orange)', color: '#fff',
                            fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{s.step}</div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)', marginBottom: 2 }}>{s.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        icon: <Scale size={28} strokeWidth={1.5} />,
        title: 'Ingredienti e QUID',
        content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    Il <strong>QUID</strong> (QUantitative Ingredient Declaration) è la percentuale di un ingrediente
                    evidenziato in denominazione o immagine, obbligatoria per legge quando rilevante.
                </p>
                <div style={{ background: 'rgba(255,126,46,0.08)', border: '1px solid rgba(255,126,46,0.3)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-orange)', marginBottom: 8 }}>Con ricetta collegata</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                        Il generatore calcola automaticamente ordine ingredienti (per peso decrescente) e QUID%
                        dalla ricetta collegata — restano comunque editabili prima di pubblicare.
                    </div>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    Senza ricetta collegata, va compilato tutto manualmente: allergeni evidenziati in MAIUSCOLO,
                    percentuali degli ingredienti caratterizzanti.
                </p>
            </div>
        ),
    },
    {
        icon: <Database size={28} strokeWidth={1.5} />,
        title: 'Imballi e raccolta differenziata',
        content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    Dal 2023 (D.Lgs. 116/2020) ogni imballo va etichettato con materiale e indicazione
                    di conferimento alla raccolta differenziata (es. "ALU 41" per l'alluminio).
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    Aggiungi un imballo per ogni componente separabile della confezione (es. vaschetta, film,
                    etichetta). Il generatore aggiunge automaticamente la dicitura "Verifica le disposizioni
                    del tuo Comune".
                </p>
            </div>
        ),
    },
];

export function WelcomeModal({ onClose, onNeverShow, slides = NUTRIZIONALE_SLIDES }: WelcomeModalProps) {
    const [slide, setSlide] = useState(0);
    const isLast = slide === slides.length - 1;
    const current = slides[slide];

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
            <div style={{
                background: 'var(--color-bg-card)', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
                width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 14px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ color: 'var(--color-orange)', display: 'flex', alignItems: 'center' }}>
                        {current.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                            Guida rapida · Passo {slide + 1} di {slides.length}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-navy, #1a2e4a)', lineHeight: 1.2 }}>
                            {current.title}
                        </div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Chiudi guida rapida"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, display: 'flex', borderRadius: 4 }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Progress bar */}
                <div style={{ height: 3, background: 'var(--color-border)' }}>
                    <div style={{
                        height: '100%', background: 'var(--color-orange)',
                        width: `${((slide + 1) / slides.length) * 100}%`,
                        transition: 'width 0.25s ease',
                    }} />
                </div>

                {/* Content */}
                <div style={{ padding: '20px 20px 8px', flex: 1 }}>
                    {current.content}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px 16px' }}>
                    {slide > 0 && (
                        <button type="button" onClick={() => setSlide(s => s - 1)}
                            className="btn btn-outline"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '6px 12px' }}>
                            <ChevronLeft size={13} /> Indietro
                        </button>
                    )}
                    <div style={{ flex: 1 }} />
                    {!isLast ? (
                        <button type="button" onClick={() => setSlide(s => s + 1)}
                            className="btn btn-accent"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '6px 14px' }}>
                            Avanti <ChevronRight size={13} />
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={onNeverShow}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--color-text-muted)', padding: '6px 8px' }}>
                                Non mostrare più
                            </button>
                            <button type="button" onClick={onClose}
                                className="btn btn-accent"
                                style={{ fontSize: 12, padding: '6px 16px' }}>
                                Inizia
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
