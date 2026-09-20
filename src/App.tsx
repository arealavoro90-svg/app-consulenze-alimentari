
import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './components/LoginPage';
import { AppShell } from './components/AppShell';
import { Dashboard } from './components/Dashboard';
import { useMobile } from './hooks/useMobile';
import { RisorseLinks } from './components/RisorseLinks';
import { AbbonamentoPage } from './components/AbbonamentoPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const NutrizionaleCalc = lazy(() =>
    import('./calculators/NutrizionaleCalc/NutrizionaleCalc').then(m => ({ default: m.NutrizionaleCalc }))
);
const NutrizionaleCalcMobile = lazy(() =>
    import('./calculators/NutrizionaleCalc/NutrizionaleCalcMobile').then(m => ({ default: m.NutrizionaleCalcMobile }))
);
const EtichetteCalc = lazy(() =>
    import('./calculators/EtichetteCalc/EtichetteCalc').then(m => ({ default: m.EtichetteCalc }))
);
const EtichetteViniCalc = lazy(() =>
    import('./calculators/EtichetteViniCalc/EtichetteViniCalc').then(m => ({ default: m.EtichetteViniCalc }))
);
const RintracciabilitaCalc = lazy(() =>
    import('./calculators/RintracciabilitaCalc/RintracciabilitaCalc').then(m => ({ default: m.RintracciabilitaCalc }))
);
const TrattamentoTermicoCalc = lazy(() =>
    import('./calculators/TrattamentoTermicoCalc/TrattamentoTermicoCalc').then(m => ({ default: m.TrattamentoTermicoCalc }))
);
const SchedeCompleteCalc = lazy(() =>
    import('./calculators/SchedeCompleteCalc/SchedeCompleteCalc').then(m => ({ default: m.SchedeCompleteCalc }))
);
const SchedaProcessoCalc = lazy(() =>
    import('./calculators/SchedaProcessoCalc/SchedaProcessoCalc').then(m => ({ default: m.SchedaProcessoCalc }))
);

function ToolError() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, padding: 24, textAlign: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: 16 }}>Errore nel caricamento dello strumento.</p>
            <p style={{ color: 'var(--color-muted, #6b7280)', fontSize: 13 }}>
                Se il problema persiste, contatta l'assistenza.
            </p>
            <Link to="/dashboard" className="btn">Torna alla Dashboard</Link>
        </div>
    );
}

function ToolBoundary({ children }: { children: ReactNode }) {
    return <ErrorBoundary fallback={<ToolError />}>{children}</ErrorBoundary>;
}

function NutrizionaleCalcEntry() {
    const isMobile = useMobile();
    return isMobile ? <NutrizionaleCalcMobile /> : <NutrizionaleCalc />;
}

function ToolLoading() {
    return (
        <div role="status" aria-live="polite" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '60vh', gap: 10,
            color: 'var(--color-text-muted)', fontSize: 13,
        }}>
            <svg
                className="animate-spin"
                width="18" height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Caricamento strumento…
        </div>
    );
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        {/* AUDIT N9 — `fallback={null}` lasciava la pagina completamente bianca mentre
            il chunk del tool veniva scaricato: su connessione lenta sembra un crash.
            Un indicatore minimo basta: nessuna dipendenza, nessun layout shift. */}
        <Suspense fallback={<ToolLoading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="risorse" element={<RisorseLinks />} />
              <Route path="abbonamento" element={<AbbonamentoPage />} />
              <Route
                path="tool/nutrizionale"
                element={
                  <ProtectedRoute requiredTool="nutrizionale">
                    <ToolBoundary><NutrizionaleCalcEntry /></ToolBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/etichette"
                element={
                  <ProtectedRoute requiredTool="etichette">
                    <ToolBoundary><EtichetteCalc /></ToolBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/etichette-vini"
                element={
                  <ProtectedRoute requiredTool="etichette-vini">
                    <ToolBoundary><EtichetteViniCalc /></ToolBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/rintracciabilita"
                element={
                  <ProtectedRoute requiredTool="rintracciabilita">
                    <ToolBoundary><RintracciabilitaCalc /></ToolBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/trattamento-termico"
                element={
                  <ProtectedRoute requiredTool="trattamento-termico">
                    <ToolBoundary><TrattamentoTermicoCalc /></ToolBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/schede-complete"
                element={
                  <ProtectedRoute requiredTool="schede-complete">
                    <ToolBoundary><SchedeCompleteCalc /></ToolBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/scheda-processo"
                element={
                  <ProtectedRoute requiredTool="scheda-processo">
                    <ToolBoundary><SchedaProcessoCalc /></ToolBoundary>
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
