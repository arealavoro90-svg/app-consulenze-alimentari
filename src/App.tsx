
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './components/LoginPage';
import { AppShell } from './components/AppShell';
import { Dashboard } from './components/Dashboard';
import { useMobile } from './hooks/useMobile';
import { RisorseLinks } from './components/RisorseLinks';

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

function NutrizionaleCalcEntry() {
    const isMobile = useMobile();
    return isMobile ? <NutrizionaleCalcMobile /> : <NutrizionaleCalc />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
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
              <Route
                path="tool/nutrizionale"
                element={
                  <ProtectedRoute requiredTool="nutrizionale">
                    <NutrizionaleCalcEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/etichette"
                element={
                  <ProtectedRoute requiredTool="etichette">
                    <EtichetteCalc />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/etichette-vini"
                element={
                  <ProtectedRoute requiredTool="etichette-vini">
                    <EtichetteViniCalc />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/rintracciabilita"
                element={
                  <ProtectedRoute requiredTool="rintracciabilita">
                    <RintracciabilitaCalc />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/trattamento-termico"
                element={
                  <ProtectedRoute requiredTool="trattamento-termico">
                    <TrattamentoTermicoCalc />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/schede-complete"
                element={
                  <ProtectedRoute requiredTool="schede-complete">
                    <SchedeCompleteCalc />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tool/scheda-processo"
                element={
                  <ProtectedRoute requiredTool="scheda-processo">
                    <SchedaProcessoCalc />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
