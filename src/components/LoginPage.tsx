import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
    useEffect(() => { document.title = 'Accedi — AEA Consulenze'; }, []);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const ok = await login(email, password);
        setLoading(false);
        if (ok) {
            navigate('/dashboard');
        } else {
            setError('Email o password non corretti. Controlla le credenziali.');
        }
    };

    return (
        <div className="login-page">
            {/* Left brand panel */}
            <div className="login-panel-left">
                <img
                    src="/aea-logo.png"
                    alt="AEA Consulenze Alimentari"
                    className="login-panel-logo"
                />
                <div className="login-panel-tagline">
                    <h2>Etichette conformi.<br />In minuti.</h2>
                    <div className="login-panel-divider" />
                    <p>Il gestionale per consulenti e PMI alimentari. Calcolo nutrizionale, etichette multi-mercato e claim normativi — tutto in un posto.</p>
                </div>
                <div className="login-panel-features">
                    <div className="login-panel-feature">
                        <span className="login-panel-feature-dot" />
                        Tabelle nutrizionali EU, USA, Canada, Australia, Gulf
                    </div>
                    <div className="login-panel-feature">
                        <span className="login-panel-feature-dot" />
                        Etichette conformi Reg. 1169/2011 con claim automatici
                    </div>
                    <div className="login-panel-feature">
                        <span className="login-panel-feature-dot" />
                        Trattamento termico, costi ricetta, rintracciabilità
                    </div>
                </div>
                <div className="login-panel-social-proof">
                    <span className="login-panel-social-proof-badge">100+</span>
                    PMI alimentari italiane già attive
                </div>
            </div>

            {/* Right form panel */}
            <div className="login-panel-right">
                <div className="login-card">
                    <h2 className="login-title">Accedi al portale</h2>
                    <p className="login-subtitle">Inserisci le credenziali ricevute da AEA</p>

                    {error && <div className="login-error" role="alert" aria-live="polite">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                placeholder="tuaemail@azienda.it"
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {loading && (
                                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            )}
                            {loading ? 'Accesso in corso…' : 'Accedi →'}
                        </button>
                    </form>

                    <div style={{
                        marginTop: 28,
                        paddingTop: 20,
                        borderTop: '1px solid var(--color-border)',
                        textAlign: 'center',
                    }}>
                        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', marginBottom: 8 }}>
                            Non hai ancora un account?
                        </p>
                        <a
                            href="mailto:info@aeaconsulenze.it?subject=Richiesta%20accesso%20portale%20AEA"
                            style={{
                                display: 'inline-block',
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--color-orange)',
                                textDecoration: 'none',
                            }}
                        >
                            Richiedi accesso →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
