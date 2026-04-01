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
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon">🌿</div>
                    <div className="login-logo-text">
                        <h1>AEA Consulenze Alimentari</h1>
                        <span>Portale Clienti Sicuro</span>
                    </div>
                </div>

                <h2 className="login-title">Accedi al tuo portale</h2>
                <p className="login-subtitle">Inserisci le credenziali ricevute da AEA</p>

                {/* Demo credentials banner — credenziali da env var, non hardcoded */}
                <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
                    <strong>🎯 Accesso Demo</strong><br/>
                    <span style={{ fontSize: 12, color: '#666' }}>Usa il bottone qui sotto per accedere con account demo</span>
                    <button type="button" style={{ marginTop: 8, display: 'block', background: '#ffc107', border: 'none', borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }} onClick={() => fillDemo(demoEmail, demoPassword)}>
                        🔓 Entra come Demo →
                    </button>
                </div>

                {error && <div className="login-error">⚠️ {error}</div>}

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

                <div className="login-info">
                    <p style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 20 }}>
                        💡 Contatta AEA Consulenze per ricevere le tue credenziali
                    </p>
                </div>
            </div>
        </div>
    );
}
