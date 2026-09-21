import { X } from 'lucide-react';
import type { ProductTemplate } from '../../data/productTemplates';

interface Props {
    templates: ProductTemplate[];
    onSelect: (t: ProductTemplate) => void;
    onClose: () => void;
}

export function TemplatePickerModal({ templates, onSelect, onClose }: Props) {
    const base = templates.filter(t => t.audience === 'base');
    const advanced = templates.filter(t => t.audience === 'advanced');

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1100,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16,
            }}
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="template-picker-title"
                style={{
                    background: 'var(--color-bg)', borderRadius: 12,
                    padding: 24, maxWidth: 540, width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    maxHeight: '80vh', overflowY: 'auto',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h3 id="template-picker-title" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Inizia da un template</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                            Pre-compila i campi più comuni per la tua categoria
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}
                        aria-label="Chiudi"
                    >
                        <X size={18} />
                    </button>
                </div>

                <TemplateGroup label="Categorie principali" templates={base} onSelect={onSelect} />

                {advanced.length > 0 && (
                    <>
                        <div style={{ margin: '20px 0 12px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Avanzate
                        </div>
                        <TemplateGroup label="" templates={advanced} onSelect={onSelect} />
                    </>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 20, width: '100%', padding: '10px 0',
                        border: '1px solid var(--color-border)', borderRadius: 8,
                        background: 'none', color: 'var(--color-text-muted)',
                        fontSize: 13, cursor: 'pointer',
                    }}
                >
                    Inizia da zero
                </button>
            </div>
        </div>
    );
}

function TemplateGroup({ label, templates, onSelect }: { label: string; templates: ProductTemplate[]; onSelect: (t: ProductTemplate) => void }) {
    if (templates.length === 0) return null;
    return (
        <>
            {label && (
                <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {label}
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {templates.map(t => (
                    <button
                        key={t.id}
                        onClick={() => onSelect(t)}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                            gap: 6, padding: '12px 14px',
                            border: '1px solid var(--color-border)', borderRadius: 10,
                            background: 'var(--color-bg-secondary)',
                            cursor: 'pointer', textAlign: 'left',
                            transition: 'border-color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-orange)';
                            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent-bg)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-secondary)';
                        }}
                    >
                        <span style={{ fontSize: 22 }}>{t.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{t.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{t.description}</span>
                    </button>
                ))}
            </div>
        </>
    );
}
