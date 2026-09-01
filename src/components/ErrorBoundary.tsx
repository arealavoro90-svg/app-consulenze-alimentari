import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

/** Boundary top-level: un throw in render mostra questa schermata invece di pagina bianca. */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // componentStack indica in quale componente/props è avvenuto il throw — senza,
        // il solo error.message spesso non basta a localizzare il bug (vedi bug ricetta
        // legacy in EtichetteCalc: il messaggio da solo non diceva quale campo mancasse).
        console.error('[ErrorBoundary]', error, errorInfo.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12, padding: 24, textAlign: 'center' }}>
                    <h1 style={{ fontSize: 20, fontWeight: 700 }}>Si è verificato un errore</h1>
                    <p style={{ color: 'var(--color-muted, #6b7280)' }}>
                        Ricarica la pagina. Se il problema persiste, contatta l'assistenza.
                    </p>
                    <button className="btn" onClick={() => window.location.reload()}>
                        Ricarica
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
