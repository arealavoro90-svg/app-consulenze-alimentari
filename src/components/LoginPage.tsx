import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    // Load demo credentials from environment
    const demoEmail = import.meta.env.VITE_DEMO_EMAIL || 'demo@aeaconsulenze.it';
    const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || 'Demo2024!';

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

    const fillDemo = (demoEmail: string, demoPass: string) => {
        setEmail(demoEmail);
        setPassword(demoPass);
        setError('');
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
                    <h2>Consulenza<br />Alimentare</h2>
                    <div className="login-panel-divider" />
                    <p>Strumenti professionali per etichettatura, nutrizione e conformità normativa.</p>
                </div>
                <div className="login-panel-features">
                    <div className="login-panel-feature">
                        <span className="login-panel-feature-dot" />
                        Calcolo nutrizionale EU Reg 1169/2011
                    </div>
                    <div className="login-panel-feature">
                        <span className="login-panel-feature-dot" />
                        Etichette vini e prodotti alimentari
                    </div>
                    <div className="login-panel-feature">
                        <span className="login-panel-feature-dot" />
                        Trattamento termico e rintracciabilità
                    </div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="login-panel-right">
                <div className="login-card">
                    <h2 className="login-title">Accedi al portale</h2>
                    <p className="login-subtitle">Inserisci le credenziali ricevute da AEA</p>

                    {/* Demo credentials banner */}
                    <div style={{
                        background: 'rgba(255, 126, 46, 0.06)',
                        border: '1px solid rgba(255, 126, 46, 0.22)',
                        borderRadius: 8,
                        padding: '12px 16px',
                        marginBottom: 24,
                        fontSize: 13,
                    }}>
                        <strong style={{ color: 'var(--color-navy)' }}>Accesso Demo</strong>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>
                            Usa il bottone per accedere con account demo
                        </span>
                        <button
                            type="button"
                            style={{
                                marginTop: 10,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'var(--color-navy)',
                                border: 'none',
                                borderRadius: 6,
                                padding: '6px 14px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 12,
                                color: '#fff',
                                letterSpacing: '0.02em',
                                fontFamily: 'inherit',
                            }}
                            onClick={() => fillDemo(demoEmail, demoPassword)}
                        >
                            Entra come Demo →
                        </button>
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Accesso in corso...' : 'Accedi →'}
                        </button>
                    </form>

                    <p style={{ fontSize: 12, color: 'var(--color-text-dim)', textAlign: 'center', marginTop: 24 }}>
                        Contatta AEA per ricevere le credenziali di accesso
                    </p>
                </div>
            </div>
        </div>
    );
}
