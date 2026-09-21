import { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { apiFetch } from '../api/client';

export function RequestAccessModal({ onClose }: { onClose: () => void }) {
    const trapRef = useFocusTrap<HTMLDivElement>(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus('sending');
        try {
            await apiFetch('/api/v1/contact/request-access/', {
                method: 'POST',
                body: JSON.stringify({ name, email, company, message }),
            });
            setStatus('ok');
        } catch {
            setStatus('error');
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="req-access-title"
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
        >
            <div ref={trapRef} className="card" style={{ width: '100%', maxWidth: 440 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 id="req-access-title" style={{ margin: 0, fontSize: 18 }}>Richiedi accesso</h2>
                    <button className="btn btn-outline" onClick={onClose} aria-label="Chiudi" style={{ padding: '6px 10px' }}>
                        <X size={14} />
                    </button>
                </div>

                {status === 'ok' ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <CheckCircle size={40} style={{ color: 'var(--color-accent)', marginBottom: 12 }} />
                        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Richiesta inviata!</p>
                        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                            Ti contatteremo entro 24 ore all'indirizzo indicato.
                        </p>
                        <button className="btn btn-primary" onClick={onClose}>Chiudi</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="form-field">
                            <label htmlFor="req-name">Nome e cognome *</label>
                            <input
                                id="req-name"
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                placeholder="Mario Rossi"
                            />
                        </div>
                        <div className="form-field">
                            <label htmlFor="req-email">Email aziendale *</label>
                            <input
                                id="req-email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="mario@azienda.it"
                            />
                        </div>
                        <div className="form-field">
                            <label htmlFor="req-company">Azienda</label>
                            <input
                                id="req-company"
                                type="text"
                                value={company}
                                onChange={e => setCompany(e.target.value)}
                                placeholder="Nome azienda"
                            />
                        </div>
                        <div className="form-field">
                            <label htmlFor="req-message">Messaggio</label>
                            <textarea
                                id="req-message"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Breve descrizione della tua attività…"
                                rows={3}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        {status === 'error' && (
                            <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>
                                Invio fallito. Riprova o scrivici a info@aeaconsulenze.it
                            </p>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={status === 'sending'}
                            style={{ marginTop: 4 }}
                        >
                            {status === 'sending' ? 'Invio in corso…' : 'Invia richiesta →'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
