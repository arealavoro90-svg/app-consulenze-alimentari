# Audit Remediation — AEA Consulenze Alimentari

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Risolvere tutti i problemi critici e strutturali identificati nell'audit del 2026-07-03, in ordine di priorità.

**Architecture:** 4 fasi indipendenti e ordinabili: (0) security fix immediato, (1) dead-code cleanup, (2) sistema dialog condiviso che sostituisce tutti i `alert/confirm/prompt` nativi, (3) type safety e Error Boundary. Il piano NON include la decomposizione di NutrizionaleCalc.tsx (3244 righe) né il setup test — entrambi meritano piani dedicati per complessità e rischio.

**Tech Stack:** React 19, TypeScript strict, Vite, CSS custom (no Tailwind), no dipendenze nuove.

---

## Scope

Questo piano copre le seguenti voci dell'audit:
- ✅ AUTH-1 (security)
- ✅ BUG-1 (alert/confirm/prompt)
- ✅ BUG-2 (any types) — parziale, file per file
- ✅ STRUCT-2 (dead files DB ingredienti)
- ✅ STRUCT-3 (Tailwind fantasma)
- ✅ STRUCT-4 (Error Boundary)
- ✅ IMP-2, IMP-3, IMP-4, IMP-5 (quick wins)

Non inclusi (piani separati raccomandati):
- ❌ STRUCT-1 — Decomposizione NutrizionaleCalc.tsx (piano ad alto rischio)
- ❌ STRUCT-5 — Setup Vitest (dipendenza nuova richiede approvazione)
- ❌ AUTH-1 backend — Integrazione Django già parzialmente fatta; completarla è un progetto separato

---

## File Map

### Nuovi file creati
- `src/utils/dialogs.tsx` — Context + hook unico per toast, confirm, prompt (sostituisce nativi)
- `src/components/ErrorBoundary.tsx` — Error boundary globale con UI di fallback

### File modificati
- `.env.local` — Rimuovere VITE_ADMIN_EMAIL, VITE_ADMIN_PASSWORD (non usati, sicurezza)
- `src/data/mockUsers.ts` — Rimuovere array MOCK_USERS con password in chiaro (dead code)
- `src/App.tsx` — Aggiungere DialogProvider + ErrorBoundary al root
- `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` — Replace 8 alert/confirm
- `src/calculators/NutrizionaleCalc/SavedTablesModal.tsx` — Replace 1 confirm
- `src/components/ArchiveModal.tsx` — Replace 1 confirm
- `src/calculators/EtichetteViniCalc/EtichetteViniCalc.tsx` — Replace 4 alert/confirm/prompt
- `src/calculators/RintracciabilitaCalc/RintracciabilitaCalc.tsx` — Replace 4 alert/confirm/prompt
- `src/calculators/SchedaProcessoCalc/SchedaProcessoCalc.tsx` — Replace 4 alert/confirm/prompt
- `src/calculators/SchedeCompleteCalc/SchedeCompleteCalc.tsx` — Replace 3 alert/confirm/prompt
- `src/calculators/TrattamentoTermicoCalc/TrattamentoTermicoCalc.tsx` — Replace 3 alert/confirm/prompt
- `src/calculators/EtichetteCalc/EtichetteCalc.tsx` — Replace 3 alert/confirm/prompt
- `package.json` — Rimuovere tailwindcss, @tailwindcss/vite, xlsx

### File eliminati
- `src/data/ingredientsDB.json` — duplicato non importato (dead weight 480 KB)
- `src/data/ingredientsDB.ts` — duplicato non importato (dead weight 668 KB)
- `3` (root) — file orfano senza estensione
- `inspection_results.json` (root) — 1 MB file audit, aggiungere a .gitignore

---

## FASE 0 — Security (fare prima di tutto, no commit in mezzo)

### Task 1: Rimuovere credenziali admin dal bundle

Il problema: `.env.local` contiene `VITE_ADMIN_PASSWORD=admin2024`. Vite include tutte le variabili `VITE_*` nel bundle client, quindi la password admin è leggibile da chiunque nel JS della build. `VITE_ADMIN_EMAIL` e `VITE_ADMIN_PASSWORD` non sono usate in nessun file `src/` (verificato con grep) — sono dead code pericoloso.

`VITE_DEMO_EMAIL` e `VITE_DEMO_PASSWORD` sono usate in `LoginPage.tsx` per il pulsante "Accesso Demo rapido". Questa è UX intenzionale (demo account), ma il fallback hardcoded `|| 'Demo2024!'` già garantisce il funzionamento senza env var. Le manteniamo per ora ma le marchiamo come "solo demo account".

**Files:** `.env.local`

- [ ] **Step 1: Aprire `.env.local` e rimuovere le 2 righe admin**

Stato attuale del file:
```
VITE_DEMO_EMAIL=demo@aeaconsulenze.it
VITE_DEMO_PASSWORD=Demo2024!

VITE_ADMIN_EMAIL=admin@aea.it
VITE_ADMIN_PASSWORD=admin2024
```

Stato dopo:
```
# Demo account credentials — prefill del pulsante login rapido (account demo pubblico)
VITE_DEMO_EMAIL=demo@aeaconsulenze.it
VITE_DEMO_PASSWORD=Demo2024!
```

- [ ] **Step 2: Verificare che VITE_ADMIN_* non siano usate altrove**

```bash
grep -rn "VITE_ADMIN" src/
```
Expected output: nessun risultato. Se ci sono risultati, rimuovere anche quelli prima di continuare.

---

### Task 2: Rimuovere MOCK_USERS con password in chiaro

`MOCK_USERS` è definito in `src/data/mockUsers.ts` ma **non è importato in nessun file** (verificato: solo `User`, `ToolId`, `TOOLS_CATALOG` sono importati). È dead code con 5 password in chiaro. Va eliminato. I tipi e `TOOLS_CATALOG` restano.

**Files:** `src/data/mockUsers.ts`

- [ ] **Step 1: Eliminare l'array MOCK_USERS da mockUsers.ts**

Rimuovere le righe 58–104 (tutto il blocco `export const MOCK_USERS: User[] = [...]`).

Il file finale deve contenere solo:
```typescript
export type ToolId =
  | 'nutrizionale'
  | 'etichette'
  | 'etichette-vini'
  | 'rintracciabilita'
  | 'trattamento-termico'
  | 'schede-complete'
  | 'scheda-processo';

export interface User {
  id: string;
  email: string;
  password: string; // campo presente per compatibilità interfaccia backend; mai popolato lato client
  name: string;
  company: string;
  purchasedTools: ToolId[];
  role: 'admin' | 'client' | 'demo';
}

export const TOOLS_CATALOG: Record<ToolId, { label: string; icon: string; description: string }> = {
  'nutrizionale': {
    label: 'Creazione tabelle valori nutrizionali',
    icon: '🥗',
    description: 'Calcolo tabella nutrizionale per etichetta (Reg. UE 1169/2011)',
  },
  'etichette': {
    label: 'Etichette Alimentari',
    icon: '🏷️',
    description: 'Generazione etichette per prodotti preconfezionati',
  },
  'etichette-vini': {
    label: 'Etichette Vini',
    icon: '🍷',
    description: 'Etichette vini secondo normativa EU 2021/2117',
  },
  'rintracciabilita': {
    label: 'Rintracciabilità & Costi',
    icon: '📦',
    description: 'Gestione costi produzione, rintracciabilità e giacenze magazzino',
  },
  'trattamento-termico': {
    label: 'Trattamento Termico F0',
    icon: '🌡️',
    description: 'Calcolo indice di letalità F0 per sterilizzazione e pastorizzazione',
  },
  'schede-complete': {
    label: 'Schede Complete',
    icon: '📋',
    description: 'Schede tecniche, schede processo e schede costi produzione',
  },
  'scheda-processo': {
    label: 'Scheda Processo',
    icon: '⚙️',
    description: 'Scheda processo produttivo con fabbisogni, fasi HACCP e rintracciabilità lotti',
  },
};
```

- [ ] **Step 2: Verificare che la build non si rompa**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build 2>&1 | tail -20
```

Expected: build OK senza errori TypeScript su mockUsers.

- [ ] **Step 3: Commit security fix**

```bash
git add .env.local src/data/mockUsers.ts
git commit -m "security: remove plaintext admin credentials from client bundle

- Remove VITE_ADMIN_EMAIL/VITE_ADMIN_PASSWORD from .env.local (unused, exposed in JS bundle)
- Remove MOCK_USERS array from mockUsers.ts (dead code with 5 plaintext passwords)"
```

---

## FASE 1 — Dead code cleanup (30 min)

### Task 3: Eliminare file duplicati e orfani

- [ ] **Step 1: Eliminare i DB ingredienti duplicati non usati**

```bash
rm /Users/novanta/Desktop/APP/App_prova/src/data/ingredientsDB.json
rm /Users/novanta/Desktop/APP/App_prova/src/data/ingredientsDB.ts
```

Verificare che non siano importati:
```bash
grep -rn "from.*ingredientsDB\|import.*ingredientsDB" src/
```
Expected: nessun risultato.

- [ ] **Step 2: Eliminare file orfani dalla root**

```bash
rm /Users/novanta/Desktop/APP/App_prova/3
```

- [ ] **Step 3: Aggiungere inspection_results.json a .gitignore**

Aprire `.gitignore` e aggiungere in fondo:
```
inspection_results.json
inspect_*.cjs
```

- [ ] **Step 4: Verificare build**

```bash
npm run build 2>&1 | tail -10
```

Expected: OK.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead code and orphan files (1.2 MB risparmio)"
```

---

### Task 4: Rimuovere dipendenze inutilizzate

Tailwind è in `dependencies` ma non usato (CLAUDE.md: "Nessun CSS framework esterno"). `xlsx` è in `devDependencies` ma non importato in nessun file `src/`.

**Files:** `package.json`

- [ ] **Step 1: Rimuovere le dipendenze**

```bash
cd /Users/novanta/Desktop/APP/App_prova
npm uninstall tailwindcss @tailwindcss/vite xlsx
```

- [ ] **Step 2: Verificare che vite.config.ts non importi tailwind**

```bash
cat vite.config.ts
```

Se contiene `@tailwindcss/vite`, rimuovere il plugin manualmente dal file.

- [ ] **Step 3: Build pulita**

```bash
npm run build 2>&1 | tail -10
```

Expected: OK, nessun errore su tailwind.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "chore: remove unused tailwindcss and xlsx dependencies"
```

---

## FASE 2 — Error Boundary globale (20 min)

### Task 5: Aggiungere ErrorBoundary

Nessuna dipendenza nuova — class component React puro.

**Files:** `src/components/ErrorBoundary.tsx` (nuovo), `src/App.tsx` (modifica)

- [ ] **Step 1: Creare src/components/ErrorBoundary.tsx**

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AEA] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        background: '#f8f9fa',
        color: '#333',
        gap: '1rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ margin: 0 }}>Qualcosa è andato storto</h2>
        <p style={{ color: '#666', maxWidth: 400, margin: 0 }}>
          Si è verificato un errore inatteso. Ricarica la pagina per riprendere il lavoro.
        </p>
        <pre style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          padding: '0.75rem 1rem',
          fontSize: 12,
          color: '#e53e3e',
          maxWidth: 600,
          overflow: 'auto',
          textAlign: 'left',
        }}>
          {this.state.error?.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#2b6cb0',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '0.6rem 1.5rem',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Ricarica pagina
        </button>
      </div>
    );
  }
}
```

- [ ] **Step 2: Trovare il root in App.tsx e wrappare**

Aprire `src/App.tsx`. Aggiungere import in cima:
```tsx
import { ErrorBoundary } from './components/ErrorBoundary';
```

Trovare il `return (` del componente App e wrappare il contenuto:
```tsx
return (
  <ErrorBoundary>
    {/* contenuto esistente invariato */}
  </ErrorBoundary>
);
```

- [ ] **Step 3: Build + type check**

```bash
npm run build 2>&1 | tail -10
```

Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/App.tsx
git commit -m "feat: add global ErrorBoundary — prevents blank page on crash"
```

---

## FASE 3 — Sistema dialog condiviso (sostituisce alert/confirm/prompt)

Questa fase crea un hook `useDialogs()` con API identica ai nativi del browser, poi li sostituisce in tutti e 9 i file.

### Task 6: Creare src/utils/dialogs.tsx

Il hook espone `toast(msg)`, `confirm(msg) → Promise<boolean>`, `prompt(msg, default) → Promise<string | null>`.
Il provider gestisce un toast queue e un singolo modal overlay (confirm / prompt) con CSS inline.

**Files:** `src/utils/dialogs.tsx` (nuovo)

- [ ] **Step 1: Creare il file**

```tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

type DialogMode =
  | { type: 'confirm'; message: string; resolve: (v: boolean) => void }
  | { type: 'prompt'; message: string; defaultValue: string; resolve: (v: string | null) => void }
  | null;

interface DialogsContext {
  toast: (message: string, type?: Toast['type']) => void;
  confirm: (message: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const Ctx = createContext<DialogsContext | null>(null);

export function useDialogs(): DialogsContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDialogs must be used inside <DialogProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

let _toastId = 0;

export function DialogProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const promptRef = useRef<HTMLInputElement>(null);

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> =>
    new Promise(resolve => {
      setDialog({ type: 'confirm', message, resolve });
    }), []);

  const prompt = useCallback((message: string, defaultValue = ''): Promise<string | null> =>
    new Promise(resolve => {
      setDialog({ type: 'prompt', message, defaultValue, resolve });
    }), []);

  const resolveConfirm = (value: boolean) => {
    if (dialog?.type === 'confirm') dialog.resolve(value);
    setDialog(null);
  };

  const resolvePrompt = (value: string | null) => {
    if (dialog?.type === 'prompt') dialog.resolve(value);
    setDialog(null);
  };

  const toastColor: Record<Toast['type'], string> = {
    success: '#276749',
    error:   '#c53030',
    info:    '#2b6cb0',
  };

  return (
    <Ctx.Provider value={{ toast, confirm, prompt }}>
      {children}

      {/* Toast stack */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: toastColor[t.type],
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            maxWidth: 360,
            animation: 'fadeInUp 0.2s ease',
          }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Modal overlay (confirm / prompt) */}
      {dialog && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => dialog.type === 'confirm' ? resolveConfirm(false) : resolvePrompt(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '28px 32px',
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ margin: 0, fontSize: 15, color: '#222', lineHeight: 1.5 }}>
              {dialog.message}
            </p>

            {dialog.type === 'prompt' && (
              <input
                ref={promptRef}
                type="text"
                defaultValue={dialog.defaultValue}
                autoFocus
                style={{
                  border: '1px solid #cbd5e0',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 14,
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') resolvePrompt(promptRef.current?.value ?? null);
                  if (e.key === 'Escape') resolvePrompt(null);
                }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => dialog.type === 'confirm' ? resolveConfirm(false) : resolvePrompt(null)}
                style={{
                  padding: '8px 18px', borderRadius: 6, border: '1px solid #cbd5e0',
                  background: '#fff', cursor: 'pointer', fontSize: 14,
                }}
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (dialog.type === 'confirm') resolveConfirm(true);
                  else resolvePrompt(promptRef.current?.value ?? '');
                }}
                style={{
                  padding: '8px 18px', borderRadius: 6, border: 'none',
                  background: '#2b6cb0', color: '#fff', cursor: 'pointer', fontSize: 14,
                }}
              >
                {dialog.type === 'confirm' ? 'Conferma' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Ctx.Provider>
  );
}
```

- [ ] **Step 2: Aggiungere DialogProvider in App.tsx**

In `src/App.tsx`, aggiungere l'import:
```tsx
import { DialogProvider } from './utils/dialogs';
```

Wrappare il contenuto del return dentro `<DialogProvider>` (all'interno di `<ErrorBoundary>` se già aggiunto):
```tsx
return (
  <ErrorBoundary>
    <DialogProvider>
      {/* contenuto esistente */}
    </DialogProvider>
  </ErrorBoundary>
);
```

- [ ] **Step 3: Build type check**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/dialogs.tsx src/App.tsx
git commit -m "feat: add shared DialogProvider (toast/confirm/prompt) — replaces native browser dialogs"
```

---

### Task 7: Replace alert/confirm/prompt in ArchiveModal + SavedTablesModal

Questi sono i più semplici: 1 `confirm` ciascuno.

**Files:** `src/components/ArchiveModal.tsx`, `src/calculators/NutrizionaleCalc/SavedTablesModal.tsx`

- [ ] **Step 1: Aggiornare ArchiveModal.tsx**

Aprire il file. La riga corrente (circa 78) è:
```tsx
if (confirm(`Sei sicuro di voler eliminare "${item.name || 'Senza Nome'}"?`)) onDelete(item.id);
```

Poiché `confirm` è ora asincrono, serve convertire l'handler in async. Il pattern per event handlers inline in JSX:

Prima aggiungere import in cima al file:
```tsx
import { useDialogs } from '../utils/dialogs';
```

Poi dentro il componente aggiungere:
```tsx
const { confirm } = useDialogs();
```

Cambiare il bottone "Elimina" da:
```tsx
onClick={() => { if (confirm(`Sei sicuro ...`)) onDelete(item.id); }}
```
a:
```tsx
onClick={async () => { if (await confirm(`Sei sicuro di voler eliminare "${item.name || 'Senza Nome'}"?`)) onDelete(item.id); }}
```

- [ ] **Step 2: Aggiornare SavedTablesModal.tsx**

Stessa identica procedura. Import da `'../../utils/dialogs'`. Trovare la riga con `confirm(...)` e aggiungere `await` + `async` all'handler.

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ArchiveModal.tsx src/calculators/NutrizionaleCalc/SavedTablesModal.tsx
git commit -m "fix(BUG-1): replace native confirm() in ArchiveModal and SavedTablesModal"
```

---

### Task 8: Replace in calcolatori minori (5 file, pattern identico)

I 5 calcolatori seguenti hanno tutti lo stesso pattern: `prompt` per nome salvataggio, `alert('Salvato!')`, `confirm` per "nuovo/reset". La sostituzione è meccanica.

**Files:**
- `src/calculators/EtichetteViniCalc/EtichetteViniCalc.tsx`
- `src/calculators/RintracciabilitaCalc/RintracciabilitaCalc.tsx`
- `src/calculators/SchedaProcessoCalc/SchedaProcessoCalc.tsx`
- `src/calculators/SchedeCompleteCalc/SchedeCompleteCalc.tsx`
- `src/calculators/TrattamentoTermicoCalc/TrattamentoTermicoCalc.tsx`
- `src/calculators/EtichetteCalc/EtichetteCalc.tsx`

Per ciascuno, applicare questo pattern (esempio su `EtichetteViniCalc.tsx`):

- [ ] **Step 1: Aggiungere import e hook in ciascun file**

In cima al file:
```tsx
import { useDialogs } from '../../utils/dialogs';
```
(Adattare il path relativo: `../../../utils/dialogs` per file con un livello in più)

All'interno del componente funzione, prima riga:
```tsx
const { toast, confirm, prompt } = useDialogs();
```

- [ ] **Step 2: Sostituire alert('Salvato!') con toast()**

Trovare ogni occorrenza del tipo:
```tsx
alert('Salvato!');
alert("Etichetta salvata con successo nell'archivio!");
alert('Salvato nell\'archivio!');
```

Sostituire con:
```tsx
toast('Salvato!');
```
(o messaggio equivalente — usa lo stesso testo già presente)

- [ ] **Step 3: Sostituire alert() per errori con toast('...', 'error')**

Trovare ogni occorrenza del tipo:
```tsx
alert('Errore esportazione PNG');
alert('Inserisci almeno il nome del prodotto prima di scaricare il PDF.');
```

Sostituire con:
```tsx
toast('Errore esportazione PNG', 'error');
toast('Inserisci almeno il nome del prodotto prima di scaricare il PDF.', 'error');
```

- [ ] **Step 4: Sostituire confirm() → await confirm()**

Le funzioni che contengono `confirm(...)` devono diventare `async`. Ogni handler del tipo:
```tsx
const handleNew = () => {
  if (data.productName && !confirm('Iniziare un nuovo calcolo? ...')) return;
  // ...
};
```
Diventa:
```tsx
const handleNew = async () => {
  if (data.productName && !await confirm('Iniziare un nuovo calcolo? ...')) return;
  // ...
};
```

- [ ] **Step 5: Sostituire prompt() → await prompt()**

Le funzioni che contengono `prompt(...)` devono diventare `async`. Dal pattern:
```tsx
const name = currentName || prompt('Nome per questa scheda:', data.nomeProdotto || 'Scheda') || '';
```
Diventa:
```tsx
const name = currentName || await prompt('Nome per questa scheda:', data.nomeProdotto || 'Scheda') || '';
```
(Nota: `useDialogs().prompt()` restituisce `string | null`, quindi `|| ''` funziona identicamente al nativo)

- [ ] **Step 6: Build check dopo ogni file modificato**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: 0 errori TypeScript.

- [ ] **Step 7: Commit**

```bash
git add src/calculators/
git commit -m "fix(BUG-1): replace native alert/confirm/prompt in 6 calcolatori minori"
```

---

### Task 9: Replace in NutrizionaleCalc.tsx (8 occorrenze)

`NutrizionaleCalc.tsx` è il file più grande (3244 righe). Non modificare struttura — solo sostituire le 8 occorrenze.

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 1: Aggiungere import e hook**

In cima al file, aggiungere tra gli import esistenti:
```tsx
import { useDialogs } from '../../utils/dialogs';
```

Dentro il componente principale (prima riga dopo i useState), aggiungere:
```tsx
const { toast, confirm } = useDialogs();
```

- [ ] **Step 2: Trovare e sostituire le 8 occorrenze**

Cercare con grep per avere i numeri di riga esatti:
```bash
grep -n "alert\|window\.confirm\|window\.alert" src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
```

Applicare le sostituzioni:
- `window.confirm(...)` → `await confirm(...)` (rendere async la funzione contenitore)
- `alert('Errore: tabella non trovata.')` → `toast('Errore: tabella non trovata.', 'error')`
- `alert('Errore durante l\'esportazione...')` → `toast('Errore durante l\'esportazione...', 'error')`
- `alert('Errore: tabella etichetta non trovata...')` → `toast('Errore: tabella etichetta non trovata...', 'error')`
- `alert('Errore durante l\'esportazione della scheda etichetta in PDF.')` → `toast('...', 'error')`
- `alert('Inserisci almeno il nome del prodotto e un ingrediente...')` → `toast('...', 'error')`
- `alert('Errore durante la generazione del PDF.')` → `toast('...', 'error')`
- Bottone inline con `window.confirm(...)` nel JSX (riga ~2179) → convertire a handler async separato

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: 0 errori TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "fix(BUG-1): replace native dialogs in NutrizionaleCalc (8 occorrenze)"
```

- [ ] **Step 5: Verifica finale — zero occorrenze rimaste**

```bash
grep -rn "window\.alert\|window\.confirm\|window\.prompt\b\|[^w]alert(\|[^w]confirm(\|[^w]prompt(" src/ 2>/dev/null | grep -v "//\|\.d\.ts\|node_modules"
```

Expected: nessun risultato (o solo eventuale testo dentro stringhe).

---

## FASE 4 — Type safety (BUG-2: 17 occorrenze di `: any`)

### Task 10: Fix any types — file per file

Principio: sostituire `: any` con il tipo minimo corretto. Nella maggior parte dei casi si tratta di deserializzazione da `JSON.parse()` (usa `unknown`) o helper `setField`/`update` (usa generic o tipo concreto).

- [ ] **Step 1: Ottenere lista completa con numeri di riga**

```bash
grep -n ": any" src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
grep -n ": any" src/calculators/SchedaProcessoCalc/SchedaProcessoCalc.tsx
grep -n ": any" src/calculators/EtichetteViniCalc/EtichetteViniCalc.tsx
grep -n ": any" src/calculators/RintracciabilitaCalc/RintracciabilitaCalc.tsx
grep -n ": any" src/calculators/TrattamentoTermicoCalc/TrattamentoTermicoCalc.tsx
grep -n ": any" src/calculators/SchedeCompleteCalc/SchedeCompleteCalc.tsx
```

- [ ] **Step 2: Fixare NutrizionaleCalc.tsx (4 occorrenze — deserializzazione archivio)**

Pattern tipico:
```tsx
// Prima
const saved: any = JSON.parse(raw);
// Dopo
const saved = JSON.parse(raw) as Record<string, unknown>;
```

Se il tipo è una interfaccia definita nello stesso file (es. `NutForm`), usare quella:
```tsx
const saved = JSON.parse(raw) as NutForm;
```

- [ ] **Step 3: Fixare SchedaProcessoCalc.tsx (5 occorrenze — setField/update helpers)**

Pattern tipico per helpers generici:
```tsx
// Prima
const setField = (key: string, value: any) => ...
// Dopo
const setField = <K extends keyof SchedaData>(key: K, value: SchedaData[K]) => ...
```

Se il tipo di stato è già definito nell'interfaccia del file, usare quello. Se non esiste, estrarre inline:
```tsx
type UpdateFn = (prev: SchedaData) => SchedaData;
const update = (fn: UpdateFn) => setData(fn);
```

- [ ] **Step 4: Fixare i restanti 4 file (2 occorrenze ciascuno)**

Stesso approccio: leggere la riga, capire il contesto, usare il tipo concreto o `unknown` per JSON.parse.

- [ ] **Step 5: Build senza errori**

```bash
npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: 0 errori TypeScript. (Se compaiono errori sui fix, preferire `unknown` con type guard a `any`)

- [ ] **Step 6: Verificare zero any rimasti**

```bash
grep -rn ": any" src/calculators/ | grep -v "//\|\.d\.ts"
```

- [ ] **Step 7: Commit**

```bash
git add src/calculators/
git commit -m "fix(BUG-2): eliminate explicit :any types across all 6 calculators"
```

---

## FASE 5 — Cleanup console e commit finale

### Task 11: Gating console.log/warn/error in produzione

18 `console.error/warn/log` attivi in produzione. Vite supporta tree-shaking tramite `import.meta.env.DEV`. Non rimuovere — gating.

- [ ] **Step 1: Cercare i file con console.*

```bash
grep -rn "console\." src/ | grep -v "\.d\.ts\|node_modules" | wc -l
```

- [ ] **Step 2: Aggiungere guard nei punti critici**

Per ogni `console.log` non di errore, wrappare:
```tsx
// Prima
console.log('debug:', value);
// Dopo
if (import.meta.env.DEV) console.log('debug:', value);
```

Per `console.error` che loggano errori utente (non debug), lasciarli — sono utili anche in produzione per diagnostica.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "chore: gate console.log behind DEV flag"
```

---

## Verifica finale

- [ ] **Build pulita end-to-end**

```bash
npm run build 2>&1
```

Expected: 0 errori, 0 warning TypeScript.

- [ ] **Zero alert/confirm/prompt nativi**

```bash
grep -rn "\balert(\|\bconfirm(\|\bprompt(" src/ | grep -v "//\|string\|dialogs\."
```

Expected: nessun risultato.

- [ ] **Zero :any**

```bash
grep -rn ": any" src/ | grep -v "//\|\.d\.ts\|node_modules"
```

Expected: nessun risultato.

- [ ] **Tag e commit summary**

```bash
git log --oneline -10
```

---

## Note per piani futuri

- **STRUCT-1 (NutrizionaleCalc.tsx 3244 righe)**: piano separato ad alto rischio. Approccio raccomandato: estrazione progressiva per dominio (export PDF, archivio, tabelle regionali) in sessioni con test visivi dopo ogni estrazione.
- **STRUCT-5 (Vitest)**: richiede approvazione per aggiungere dipendenza. Setup stimato: 2 ore + prioritizzare nutritionalEngine.ts (calcoli EU normativi).
- **AUTH-1 backend**: il layer API è già pronto (`src/api/auth.ts`, `src/api/client.ts`). Manca solo il backend Django live. Piano separato per deploy Django su Render/Railway + configurazione `VITE_API_URL` su Vercel.
