
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './components/LoginPage';
import { AppShell } from './components/AppShell';
import { Dashboard } from './components/Dashboard';
import { NutrizionaleCalc } from './calculators/NutrizionaleCalc/NutrizionaleCalc';
import { EtichetteCalc } from './calculators/EtichetteCalc/EtichetteCalc';
import { EtichetteViniCalc } from './calculators/EtichetteViniCalc/EtichetteViniCalc';
import { RintracciabilitaCalc } from './calculators/RintracciabilitaCalc/RintracciabilitaCalc';
import { TrattamentoTermicoCalc } from './calculators/TrattamentoTermicoCalc/TrattamentoTermicoCalc';
import { SchedeCompleteCalc } from './calculators/SchedeCompleteCalc/SchedeCompleteCalc';
import { SchedaProcessoCalc } from './calculators/SchedaProcessoCalc/SchedaProcessoCalc';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
            <Route
              path="tool/nutrizionale"
              element={
                <ProtectedRoute requiredTool="nutrizionale">
                  <NutrizionaleCalc />
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
      </BrowserRouter>
    </AuthProvider>
  );
}
