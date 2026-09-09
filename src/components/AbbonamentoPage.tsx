import { useState } from 'react';
import { CreditCard, CheckCircle2, Mail, Building2, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { apiDeleteAccount } from '../api/auth';
import { TOOLS_CATALOG } from '../data/mockUsers';
import type { ToolId } from '../data/mockUsers';

export function AbbonamentoPage() {
    const { user, logout } = useAuth();
    const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'loading'>('idle');
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleDeleteAccount = async () => {
        setDeleteStep('loading');
        setDeleteError(null);
        try {
            await apiDeleteAccount();
            logout();
        } catch {
            setDeleteError('Errore durante la cancellazione. Riprova o contatta il supporto.');
            setDeleteStep('confirm');
        }
    };

    const purchasedTools: ToolId[] = user?.role === 'admin'
        ? (Object.keys(TOOLS_CATALOG) as ToolId[])
        : (user?.purchasedTools ?? []);

    const notPurchased = (Object.keys(TOOLS_CATALOG) as ToolId[]).filter(
        (id) => !purchasedTools.includes(id),
    );

    return (
        <div>
            <div className="page-header">
                <h1>Il tuo abbonamento</h1>
                <p>Stato account e strumenti attivi</p>
            </div>

            {/* Account info */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <ShieldCheck size={20} color="var(--color-orange)" />
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Informazioni account</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                        <Mail size={15} color="var(--color-text-muted)" />
                        <span style={{ color: 'var(--color-text-muted)', minWidth: 80 }}>Email</span>
                        <span>{user?.email}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                        <Building2 size={15} color="var(--color-text-muted)" />
                        <span style={{ color: 'var(--color-text-muted)', minWidth: 80 }}>Azienda</span>
                        <span>{user?.company || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                        <CreditCard size={15} color="var(--color-text-muted)" />
                        <span style={{ color: 'var(--color-text-muted)', minWidth: 80 }}>Piano</span>
                        <span style={{
                            background: 'var(--color-accent-bg)',
                            color: 'var(--color-orange)',
                            borderRadius: 6,
                            padding: '2px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            border: '1px solid rgba(255,126,46,0.25)',
                        }}>
                            {user?.role === 'admin' ? 'Admin' : 'Cliente'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Strumenti attivi */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <CheckCircle2 size={20} color="var(--color-orange)" />
                    <span style={{ fontWeight: 700, fontSize: 15 }}>
                        Strumenti attivi ({purchasedTools.length})
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {purchasedTools.map((id) => (
                        <div key={id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: 8, fontSize: 14,
                        }}>
                            <CheckCircle2 size={14} color="var(--color-orange)" />
                            {TOOLS_CATALOG[id].label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Strumenti non acquistati */}
            {notPurchased.length > 0 && user?.role !== 'admin' && (
                <div className="card">
                    <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 15, color: 'var(--color-text-muted)' }}>
                        Strumenti non inclusi nel piano
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {notPurchased.map((id) => (
                            <div key={id} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 12px',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 8, fontSize: 14,
                                opacity: 0.5,
                            }}>
                                <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--color-text-muted)', display: 'inline-block' }} />
                                {TOOLS_CATALOG[id].label}
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        Per aggiungere strumenti al tuo piano contatta{' '}
                        <a href="mailto:info@aeaconsulenze.it" style={{ color: 'var(--color-orange)' }}>
                            info@aeaconsulenze.it
                        </a>
                    </div>
                </div>
            )}
            {/* GDPR Art.17 — Cancellazione account */}
            <div className="card" style={{ marginTop: 20, borderColor: 'rgba(220,38,38,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Trash2 size={18} color="#dc2626" />
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#dc2626' }}>Zona pericolosa</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                    La cancellazione è irreversibile. Tutti i dati (ricette, etichette, archivi) verranno eliminati definitivamente.
                </p>

                {deleteStep === 'idle' && (
                    <button
                        onClick={() => setDeleteStep('confirm')}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: '1px solid #dc2626',
                            background: 'transparent', color: '#dc2626', fontSize: 13,
                            fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Cancella il mio account
                    </button>
                )}

                {(deleteStep === 'confirm' || deleteStep === 'loading') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: 0 }}>
                            Sei sicuro? Questa azione non può essere annullata.
                        </p>
                        {deleteError && (
                            <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{deleteError}</p>
                        )}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteStep === 'loading'}
                                style={{
                                    padding: '8px 16px', borderRadius: 8, border: 'none',
                                    background: '#dc2626', color: '#fff', fontSize: 13,
                                    fontWeight: 600, cursor: deleteStep === 'loading' ? 'not-allowed' : 'pointer',
                                    opacity: deleteStep === 'loading' ? 0.7 : 1,
                                }}
                            >
                                {deleteStep === 'loading' ? 'Cancellazione…' : 'Sì, cancella definitivamente'}
                            </button>
                            <button
                                onClick={() => { setDeleteStep('idle'); setDeleteError(null); }}
                                disabled={deleteStep === 'loading'}
                                style={{
                                    padding: '8px 16px', borderRadius: 8,
                                    border: '1px solid var(--color-border)',
                                    background: 'transparent', color: 'var(--color-text-muted)',
                                    fontSize: 13, cursor: 'pointer',
                                }}
                            >
                                Annulla
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
