# Redesign UX Tool Nutrizionale — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare il pannello sinistro del calcolatore nutrizionale in un mini-wizard a 3 fasi (Prodotto → Ingredienti → Dettagli) con "Modalità esperta" che ripristina il layout attuale.

**Architecture:** Aggiunta additiva di `phase: 1|2|3` e `expertMode: boolean` in `NutrizionaleCalc.tsx`. Il contenuto del pannello sinistro viene condizionato dalla fase attiva. ExpertMode bypassa il wizard e mostra tutto simultaneamente. Calcoli, engine e Tab*.tsx invariati.

**Tech Stack:** React 18, TypeScript, Tailwind 4 (classi esistenti + inline styles per coerenza col codice esistente), Vitest, html2canvas, jsPDF.

**Spec:** `docs/superpowers/specs/2026-07-15-nutrizionale-ux-redesign-design.md`

---

## Mappa file

| File | Modifica |
|---|---|
| `src/calculators/NutrizionaleCalc/SavedTablesModal.tsx` | Fix BUG-1: `confirm()` → confirm inline |
| `src/calculators/NutrizionaleCalc/TabUE.tsx` | Tooltip `% AR` header (riga 209) |
| `src/calculators/NutrizionaleCalc/DownloadTableModal.tsx` | `title` sui bottoni disabilitati |
| `src/index.css` | CSS progress bar + nav fasi |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` | Phase state, expertMode, progress bar, fasi 1-3 |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` | Principi disclosure progressiva su mobile |

**File NON modificati:** `Tab{USA,Canada,Australia,Arabi}.tsx`, tutti gli engine, `localizationModule.ts`, `sessionBridge.ts`, `BrowseIngredientsModal.tsx`, `SmartImportModal.tsx`, `DownloadTableModal.tsx` (solo attributo title).

---

## Task 1: Fix BUG-1 — SavedTablesModal confirm() nativo

**File:** `src/calculators/NutrizionaleCalc/SavedTablesModal.tsx`

- [ ] **Step 1: Aggiungi state `pendingDeleteId` al componente**

  Sostituire la riga 1 del file con:

  ```tsx
  import { useState } from 'react';
  import type { SavedTableData } from '../../hooks/useSavedTables';

  interface Props {
      tables: SavedTableData[];
      currentTableId?: string;
      onClose: () => void;
      onLoad: (table: SavedTableData) => void;
      onDelete: (id: string) => void;
  }

  export function SavedTablesModal({ tables, currentTableId, onClose, onLoad, onDelete }: Props) {
      const [search, setSearch] = useState('');
      const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  ```

- [ ] **Step 2: Sostituire il bottone delete (riga 71-75) con inline confirm**

  Trovare il blocco:
  ```tsx
  <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }}
      onClick={() => {
          if (confirm(`Sei sicuro di voler eliminare la tabella "${table.name || 'Senza Nome'}"?`)) onDelete(table.id);
      }}
  >🗑️</button>
  ```

  Sostituire con:
  ```tsx
  {pendingDeleteId === table.id ? (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#c53030', fontWeight: 600 }}>Eliminare?</span>
          <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 11 }}
              onClick={() => { onDelete(table.id); setPendingDeleteId(null); }}>Sì</button>
          <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: 11 }}
              onClick={() => setPendingDeleteId(null)}>No</button>
      </div>
  ) : (
      <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }}
          onClick={() => setPendingDeleteId(table.id)}
          title="Elimina tabella">🗑️</button>
  )}
  ```

- [ ] **Step 3: Verifica TypeScript**

  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b
  ```
  Atteso: zero errori.

- [ ] **Step 4: Verifica visiva** — aprire Archivio Tabelle, cliccare 🗑️, verificare che appaia "Eliminare? Sì / No" senza dialog nativo del browser.

- [ ] **Step 5: Commit**
  ```bash
  git add src/calculators/NutrizionaleCalc/SavedTablesModal.tsx
  git commit -m "fix(nutrizionale): SavedTablesModal — confirm() nativo → inline confirm (BUG-1)"
  ```

---

## Task 2: Tooltip "% AR" in TabUE

**File:** `src/calculators/NutrizionaleCalc/TabUE.tsx` (riga 208-210)

- [ ] **Step 1: Aggiungere `title` all'intestazione `% AR *`**

  Trovare:
  ```tsx
  <th style={{ background: '#f5f5f5', border: '1px solid #999', padding: '5px 8px', textAlign: 'center', fontWeight: 700, fontSize: 11, width: '64px' }}>
      % AR *
  </th>
  ```

  Sostituire con:
  ```tsx
  <th
      style={{ background: '#f5f5f5', border: '1px solid #999', padding: '5px 8px', textAlign: 'center', fontWeight: 700, fontSize: 11, width: '64px', cursor: 'help' }}
      title="% AR = percentuale dell'Assunzione di Riferimento giornaliera per un adulto medio (8400 kJ / 2000 kcal). Fonte: Reg. UE 1169/2011."
  >
      % AR *
  </th>
  ```

- [ ] **Step 2: Verifica TypeScript**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b
  ```
  Atteso: zero errori.

- [ ] **Step 3: Commit**
  ```bash
  git add src/calculators/NutrizionaleCalc/TabUE.tsx
  git commit -m "fix(nutrizionale): tooltip % AR in TabUE — spiega Assunzione di Riferimento"
  ```

---

## Task 3: Tooltip opzioni disabilitate in DownloadTableModal

**File:** `src/calculators/NutrizionaleCalc/DownloadTableModal.tsx`

- [ ] **Step 1: Aggiungere prop `title` a `OptBtn`**

  Trovare la definizione del componente `OptBtn` (intorno alla riga 26):
  ```tsx
  function OptBtn({ label, active, disabled, onClick }: {
      label: string; active: boolean; disabled?: boolean; onClick: () => void;
  ```

  Sostituire con:
  ```tsx
  function OptBtn({ label, active, disabled, onClick, disabledReason }: {
      label: string; active: boolean; disabled?: boolean; onClick: () => void; disabledReason?: string;
  ```

- [ ] **Step 2: Aggiungere `title` al `<button>` interno di `OptBtn`**

  Trovare (nel corpo di OptBtn):
  ```tsx
  disabled={disabled}
  ```

  Sostituire con:
  ```tsx
  disabled={disabled}
  title={disabled && disabledReason ? disabledReason : undefined}
  ```

- [ ] **Step 3: Passare `disabledReason` agli OptBtn disabilitati**

  Trovare la riga con `disabled={ue.confezione == null}` (intorno alla riga 174):
  ```tsx
  disabled={ue.confezione == null}
  onClick={() => setEuSubTab('uv')}
  ```
  Aggiungere dopo `disabled`:
  ```tsx
  disabledReason="Inserisci il peso confezione nel pannello Porzioni (a destra) per abilitare"
  ```

  Trovare `disabled={ue.porzione == null}` (intorno alla riga 180):
  ```tsx
  disabled={ue.porzione == null}
  onClick={() => setEuSubTab('porzione')}
  ```
  Aggiungere:
  ```tsx
  disabledReason="Inserisci la porzione nel pannello Porzioni (a destra) per abilitare"
  ```

  Trovare `disabled={ue.pezzo == null}` (intorno alla riga 186):
  ```tsx
  disabled={ue.pezzo == null}
  ```
  Aggiungere:
  ```tsx
  disabledReason="Inserisci il peso pezzo nel pannello Porzioni (a destra) per abilitare"
  ```

  Trovare `disabled={nation.cup == null}` (intorno alla riga 211):
  ```tsx
  disabled={nation.cup == null}
  ```
  Aggiungere:
  ```tsx
  disabledReason="Inserisci la misura in tazze nel pannello Porzioni (a destra) per abilitare"
  ```

  Trovare `disabled={nation.cucchiaio == null}`:
  ```tsx
  disabled={nation.cucchiaio == null}
  ```
  Aggiungere:
  ```tsx
  disabledReason="Inserisci la misura in cucchiai nel pannello Porzioni (a destra) per abilitare"
  ```

  Trovare `disabled={nation.pezzo == null}` (nella sezione USA/Canada/Arabi):
  ```tsx
  disabled={nation.pezzo == null}
  ```
  Aggiungere:
  ```tsx
  disabledReason="Inserisci il peso pezzo nel pannello Porzioni (a destra) per abilitare"
  ```

- [ ] **Step 4: Verifica TypeScript**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b
  ```
  Atteso: zero errori.

- [ ] **Step 5: Commit**
  ```bash
  git add src/calculators/NutrizionaleCalc/DownloadTableModal.tsx
  git commit -m "fix(nutrizionale): tooltip opzioni disabilitate in DownloadTableModal"
  ```

---

## Task 4: CSS progress bar e navigazione fasi

**File:** `src/index.css`

- [ ] **Step 1: Aggiungere stili in fondo a `src/index.css`**

  ```css
  /* ── Wizard fasi NutrizionaleCalc ──────────────────────────────────── */
  .phase-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 10px 14px 0;
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-border);
    background: white;
  }

  .phase-step {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-muted);
    cursor: default;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
    user-select: none;
  }

  .phase-step.active {
    color: var(--color-orange);
    border-bottom-color: var(--color-orange);
  }

  .phase-step.done {
    color: #16a34a;
    cursor: pointer;
  }

  .phase-step.done:hover {
    color: #15803d;
  }

  .phase-step-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
    background: #e5e7eb;
    color: #6b7280;
    transition: background 0.15s, color 0.15s;
  }

  .phase-step.active .phase-step-dot {
    background: var(--color-orange);
    color: white;
  }

  .phase-step.done .phase-step-dot {
    background: #16a34a;
    color: white;
  }

  .phase-connector {
    flex: 1;
    height: 1px;
    background: var(--color-border);
    min-width: 12px;
    max-width: 32px;
  }

  .phase-nav-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
    background: white;
  }

  .expert-toggle-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 4px 8px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }

  .expert-toggle-btn:hover,
  .expert-toggle-btn.active {
    color: var(--color-orange);
    border-color: var(--color-orange);
  }

  .phase-content {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
  }

  .phase1-liquid-radio {
    display: flex;
    gap: 12px;
    margin-top: 10px;
  }

  .phase1-liquid-radio label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    color: var(--color-text);
  }
  /* ── Fine wizard fasi ───────────────────────────────────────────────── */
  ```

- [ ] **Step 2: Verifica build**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b
  ```
  Atteso: zero errori.

- [ ] **Step 3: Commit**
  ```bash
  git add src/index.css
  git commit -m "style(nutrizionale): CSS progress bar e navigazione fasi wizard"
  ```

---

## Task 5: Aggiungere phase + expertMode state a NutrizionaleCalc

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 1: Aggiungere i due nuovi state dopo `expertTab` (riga ~1063)**

  Trovare:
  ```tsx
  const [expertTab, setExpertTab] = useState<'ricetta' | 'riepilogo'>('ricetta');
  ```

  Aggiungere subito dopo:
  ```tsx
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [expertMode, setExpertMode] = useLocalStorage<boolean>('nutri_expert_mode', false);
  ```

  Nota: `useLocalStorage` è già importato (riga 19).

- [ ] **Step 2: Verifica TypeScript**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b
  ```
  Atteso: zero errori.

- [ ] **Step 3: Commit**
  ```bash
  git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
  git commit -m "feat(nutrizionale): aggiunge state phase + expertMode (wizard fasi)"
  ```

---

## Task 6: Progress bar e toggle esperto nel pannello sinistro

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

Il pannello sinistro attuale inizia con la tab bar `expert-desktop-tabbar` (riga ~2079). La progress bar va inserita **sopra** quella tab bar, nella stessa colonna flex.

- [ ] **Step 1: Trovare il punto di inserimento**

  Cercare la stringa `expert-desktop-tabbar` nel file (riga ~2079):
  ```tsx
  {/* Tab bar — hidden on mobile, replaced by bottom bar */}
  <div className="expert-desktop-tabbar" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'white', flexShrink: 0, height: 40 }}>
  ```

- [ ] **Step 2: Inserire la progress bar sopra la tab bar**

  Aggiungere questo blocco **prima** di `{/* Tab bar — hidden on mobile */}`:

  ```tsx
  {/* ── Progress bar fasi (hidden in expertMode) ── */}
  {!expertMode && (
      <div className="phase-bar">
          {([
              { n: 1 as const, label: 'Prodotto' },
              { n: 2 as const, label: 'Ingredienti' },
              { n: 3 as const, label: 'Dettagli' },
          ] as { n: 1 | 2 | 3; label: string }[]).map(({ n, label }, i) => {
              const isDone = phase > n;
              const isActive = phase === n;
              return (
                  <React.Fragment key={n}>
                      {i > 0 && <div className="phase-connector" />}
                      <div
                          className={`phase-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}
                          onClick={() => isDone && setPhase(n)}
                          title={isDone ? `Torna a ${label}` : undefined}
                      >
                          <div className="phase-step-dot">
                              {isDone ? '✓' : n}
                          </div>
                          {label}
                      </div>
                  </React.Fragment>
              );
          })}
          <div style={{ flex: 1 }} />
          <button
              type="button"
              className={`expert-toggle-btn${expertMode ? ' active' : ''}`}
              onClick={() => setExpertMode(!expertMode)}
              title={expertMode ? 'Torna alla guida passo-passo' : 'Mostra tutti i campi simultaneamente'}
          >
              <SlidersHorizontal size={12} />
              {expertMode ? 'Guidato' : 'Esperto'}
          </button>
      </div>
  )}
  {expertMode && (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <button
              type="button"
              className="expert-toggle-btn active"
              onClick={() => setExpertMode(false)}
              title="Torna alla guida passo-passo"
          >
              <SlidersHorizontal size={12} />
              Guidato
          </button>
      </div>
  )}
  ```

- [ ] **Step 3: Verifica TypeScript**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b
  ```
  Atteso: zero errori.

- [ ] **Step 4: Verifica visiva** — la progress bar deve apparire in cima al pannello sinistro. In expertMode deve mostrare solo il bottone "Guidato" in alto a destra.

- [ ] **Step 5: Commit**
  ```bash
  git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
  git commit -m "feat(nutrizionale): progress bar fasi + toggle Esperto/Guidato"
  ```

---

## Task 7: Fase 1 — "Prodotto"

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

La fase 1 mostra solo nome prodotto + tipo solido/liquido + azioni iniziali.

- [ ] **Step 1: Trovare il blocco `{expertTab === 'ricetta' && (<>` (riga ~2102)**

  L'intero contenuto `{expertTab === 'ricetta' && (<>...</>)}` va racchiuso in una condizione:
  - Se `expertMode` → mostra tutto come oggi (invariato)
  - Se `!expertMode && phase === 2` → mostra componenti
  - Se `!expertMode && phase === 3` → mostra dettagli
  - Se `!expertMode && phase === 1` → mostra fase 1

- [ ] **Step 2: Aggiungere il render di Fase 1**

  Trovare (riga ~2100):
  ```tsx
  <div className="expert-tab-content" style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

  {expertTab === 'ricetta' && (<>
  ```

  Aggiungere il render di fase 1 **prima** del blocco `{expertTab === 'ricetta' && (<>`:

  ```tsx
  <div className="expert-tab-content" style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

  {/* ── FASE 1: Prodotto ── */}
  {!expertMode && phase === 1 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                  Nome prodotto *
              </label>
              <input
                  type="text"
                  placeholder="Es. Torta di mele, Ragù bolognese..."
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  className="field-input"
                  style={{ fontWeight: 600, fontSize: 16, width: '100%', padding: '8px 10px' }}
                  autoFocus
              />
          </div>
          <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', display: 'block', marginBottom: 8 }}>
                  Tipo prodotto
              </label>
              <div className="phase1-liquid-radio">
                  <label>
                      <input type="radio" name="product-type" checked={!isLiquid} onChange={() => setIsLiquid(false)} />
                      Solido
                  </label>
                  <label>
                      <input type="radio" name="product-type" checked={isLiquid} onChange={() => setIsLiquid(true)} />
                      Liquido
                  </label>
              </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={() => setArchiveOpen(true)}
              >
                  <FolderOpen size={14} /> Carica da archivio
              </button>
              <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={!productName.trim()}
                  onClick={() => setPhase(2)}
              >
                  Avanti →
              </button>
          </div>
      </div>
  )}

  {expertTab === 'ricetta' && (<>
  ```

- [ ] **Step 3: Verifica TypeScript**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b
  ```
  Atteso: zero errori.

- [ ] **Step 4: Verifica visiva**
  - Aprire il tool: deve apparire fase 1 con nome prodotto + radio Solido/Liquido
  - "Avanti →" disabilitato se nome vuoto
  - Inserire un nome → "Avanti →" si abilita → click → passa a fase 2

- [ ] **Step 5: Commit**
  ```bash
  git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
  git commit -m "feat(nutrizionale): fase 1 — form Prodotto con nome e tipo solido/liquido"
  ```

---

## Task 8: Fase 2 — "Ingredienti" (con disclosure progressiva)

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 1: Racchiudere il contenuto Ricetta/Riepilogo nella condizione di fase**

  Trovare (riga ~2079):
  ```tsx
  {/* Tab bar — hidden on mobile, replaced by bottom bar */}
  <div className="expert-desktop-tabbar" style={{ display: 'flex', ...
  ```

  L'intera tab bar e il suo contenuto (`expert-desktop-tabbar` + `expert-tab-content`) devono essere visibili solo in expertMode O in fase 2. Avvolgerli:

  ```tsx
  {/* Tab bar e contenuto — visibile in expertMode o fase 2 */}
  {(expertMode || phase === 2) && (
      <>
      {/* Tab bar — hidden on mobile, replaced by bottom bar */}
      <div className="expert-desktop-tabbar" ...>
          ...
      </div>
      <div className="expert-tab-content" ...>
          ...
      </div>
      </>
  )}
  ```

  Attenzione: il blocco `expert-tab-content` contiene la fase 1 aggiunta nel Task 7 — quella è già protetta da `{!expertMode && phase === 1 && ...}` quindi non comparirà in fase 2.

- [ ] **Step 2: Aggiungere disclosure progressiva per "+ Secondo componente"**

  Trovare (riga ~2523):
  ```tsx
  <button className="btn btn-outline add-comp-btn" onClick={addComp}><Plus size={14} /> Aggiungi componente</button>
  ```

  Sostituire con:
  ```tsx
  {/* "+ Aggiungi componente" visibile solo dopo il primo ingrediente */}
  {allRows.length > 0 && (
      <button className="btn btn-outline add-comp-btn" onClick={addComp}>
          <Plus size={14} />
          {components.length === 1 ? '+ Secondo componente' : '+ Componente'}
      </button>
  )}
  ```

- [ ] **Step 3: Aggiungere footer di navigazione fase 2**

  Trovare la chiusura del blocco di contenuto fase 2 (dopo `{expertTab === 'riepilogo' && ...}` e prima della chiusura del `expert-tab-content`).

  Aggiungere prima della chiusura `</div>` del `expert-tab-content`:
  ```tsx
  {/* Footer navigazione fase 2 — solo in modalità guidata */}
  {!expertMode && phase === 2 && (
      <div className="phase-nav-footer">
          <button type="button" className="btn btn-outline" onClick={() => setPhase(1)}>
              ← Indietro
          </button>
          <button
              type="button"
              className="btn btn-primary"
              disabled={allRows.length === 0}
              title={allRows.length === 0 ? 'Aggiungi almeno un ingrediente per continuare' : undefined}
              onClick={() => setPhase(3)}
          >
              Avanti →
          </button>
      </div>
  )}
  ```

- [ ] **Step 4: Nascondere `pzUV` quando c'è un solo componente**

  Trovare (riga ~2282-2311) il blocco del campo `pz/UV`:
  ```tsx
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>pz/UV</span>
      <InfoTooltip text="Digitare il numero di PZ o di Unità di Vendita che si possono realizzare con la quantità di componente che scaturisce dalla ricetta." />
      <input ... />
  </div>
  ```

  Avvolgerlo con condizione:
  ```tsx
  {components.length > 1 && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Pezzi/conf.</span>
          <InfoTooltip text="Numero di pezzi o unità di vendita realizzabili con questo componente. Usato per scalare i valori per pezzo nel Riepilogo." />
          <input ... />
      </div>
  )}
  ```

  Nota: cambia anche `pz/UV` → `Pezzi/conf.` e aggiorna il testo del tooltip.

- [ ] **Step 5: Verifica TypeScript**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b
  ```
  Atteso: zero errori.

- [ ] **Step 6: Verifica visiva**
  - In fase 2: tab bar Ricetta/Riepilogo visibile, componenti visibili
  - "+ Secondo componente" non appare finché non c'è almeno un ingrediente
  - Con un solo componente: campo `pz/UV` nascosto
  - "Avanti →" disabilitato senza ingredienti
  - "← Indietro" porta a fase 1

- [ ] **Step 7: Commit**
  ```bash
  git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
  git commit -m "feat(nutrizionale): fase 2 — ingredienti con disclosure progressiva componente/pzUV"
  ```

---

## Task 9: Fase 3 — "Dettagli"

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 1: Aggiungere render fase 3 dopo il blocco fase 2**

  Trovare la chiusura `)}` del blocco `{(expertMode || phase === 2) && (...)}` aggiunto nel Task 8.

  Aggiungere subito dopo:

  ```tsx
  {/* ── FASE 3: Dettagli ── */}
  {!expertMode && phase === 3 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '14px' }}>
          {/* Peso finito */}
          <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                      Peso prodotto finito (g)
                  </label>
                  <InfoTooltip text="Peso del prodotto dopo cottura, disidratazione o lavorazione. Lascia vuoto se uguale alla somma degli ingredienti crudi." />
              </div>
              <input
                  type="number"
                  min={0}
                  placeholder={`max ${totalGramsRaw.toFixed(0)}g`}
                  value={finishedWeight}
                  onChange={e => handleFW(e.target.value)}
                  className="field-input"
                  style={{ width: '100%', ...(fwWarning ? { borderColor: '#e53e3e', background: 'rgba(229,62,62,.05)' } : {}) }}
              />
              {fwWarning && (
                  <div style={{ padding: '5px 8px', background: 'rgba(229,62,62,.10)', border: '2px solid #e53e3e', borderRadius: 6, fontSize: 11, color: '#c53030', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors['finished-weight'] || `Peso superiore al crudo. Max ${(totalGramsRaw / ((components[0]?.pzUV || 1))).toFixed(0)}g.`}</span>
                  </div>
              )}
          </div>

          {/* Peso specifico — solo se liquido */}
          {isLiquid && (
              <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                          Peso specifico (g/ml)
                      </label>
                      <InfoTooltip text="Solo per prodotti liquidi. Quando compilato, i valori nutrizionali vengono espressi su 100 ml invece di 100 g." />
                  </div>
                  <input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="es. 1.03"
                      value={specificGravity}
                      onChange={e => setSpecificGravity(e.target.value)}
                      className="field-input"
                      style={{ width: '100%' }}
                  />
              </div>
          )}

          {/* Additivi — collassati */}
          <details>
              <summary style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none', padding: '4px 0' }}>
                  Additivi (opzionale)
              </summary>
              <div style={{ marginTop: 8 }}>
                  {components.map(comp => (
                      <div key={comp.id} style={{ marginBottom: 8 }}>
                          {components.length > 1 && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-orange)', marginBottom: 4 }}>
                                  {comp.name || `Componente ${components.indexOf(comp) + 1}`}
                              </div>
                          )}
                          <AdditiveSearch
                              compId={comp.id}
                              additiveRows={comp.additiveRows}
                              onAddAdditive={addAdditiveRow}
                              onRemoveAdditive={removeAdditiveRow}
                              onUpdateAdditive={updateAdditiveRow}
                              db={db}
                          />
                      </div>
                  ))}
              </div>
          </details>

          {/* Footer navigazione */}
          <div className="phase-nav-footer" style={{ padding: '12px 0 0', border: 'none' }}>
              <button type="button" className="btn btn-outline" onClick={() => setPhase(2)}>
                  ← Indietro
              </button>
              <button
                  type="button"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 7 }}
                  disabled={allRows.length === 0}
                  onClick={() => setDownloadModalOpen(true)}
              >
                  <Download size={14} /> Scarica tabella
              </button>
          </div>
      </div>
  )}
  ```

  Nota: `AdditiveSearch` è il componente già esistente per la sezione additivi. Cerca il suo nome esatto nel file (può chiamarsi diversamente — cerca `addAdditiveRow` nel render per trovarlo).

- [ ] **Step 2: Verificare il nome esatto del componente additivi**

  ```bash
  grep -n "AdditiveSearch\|addAdditiveRow\|AdditiveRow\|additiveRows" /Users/novanta/Desktop/APP/App_prova/src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx | head -20
  ```

  Se il componente additivi è inline (non estratto), semplificare la sezione additivi in fase 3 mostrando solo un bottone che porta all'archivio o usando `<details>` con testo semplificato. Il dettaglio degli additivi rimane visibile in modalità esperta.

- [ ] **Step 3: Verifica TypeScript**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b
  ```
  Atteso: zero errori.

- [ ] **Step 4: Verifica visiva**
  - In fase 3: peso finito, peso specifico (solo se liquido), additivi (collassati), pulsante "Scarica tabella" primario
  - "← Indietro" porta a fase 2
  - "Scarica tabella" apre DownloadTableModal

- [ ] **Step 5: Commit**
  ```bash
  git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
  git commit -m "feat(nutrizionale): fase 3 — dettagli prodotto e accesso diretto al download"
  ```

---

## Task 10: ExpertMode — mostra tutto come oggi

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 1: Verificare che expertMode mostri il layout pre-esistente invariato**

  In expertMode, la struttura è:
  - Progress bar nascosta (già fatto in Task 6: `{!expertMode && (...)})`)
  - Toggle "Guidato" visibile (già fatto in Task 6)
  - Tab bar `expert-desktop-tabbar` visibile (già fatto in Task 8: `{(expertMode || phase === 2) && ...}`)
  - Contenuto fase 1 nascosto (`{!expertMode && phase === 1 && ...}`)
  - Contenuto fase 3 nascosto (`{!expertMode && phase === 3 && ...}`)

  In modalità esperta il layout pre-esistente è quindi automaticamente ripristinato senza modifiche aggiuntive.

  Verifica visiva manuale: attivare "Esperto" → la progress bar scompare, tutto il contenuto ricetta/riepilogo appare come prima del refactor.

- [ ] **Step 2: Aggiungere nome prodotto e peso finito nella modalità esperta**

  Il `productName` input nel layout originale è nella sezione "Prodotto / Pesi" (riga ~2208). In expertMode questo è già visibile perché fa parte del contenuto `{expertTab === 'ricetta' && ...}`. Verificare che in expertMode:
  - `productName` input sia visibile ✓ (era già nel blocco ricetta)
  - `finishedWeight` e `specificGravity` siano visibili ✓ (erano condizionati da `allRows.length > 0`, condizione invariata)
  - Checkbox `isLiquid` nel pannello destro rimane disponibile come prima

  Se in expertMode il `productName` non appare, significa che la ristrutturazione del Task 8 lo ha nascosto. In quel caso, aggiungere `productName` anche all'inizio del contenuto `{expertTab === 'ricetta' && (<>` o spostarlo fuori dalla condizione di fase.

- [ ] **Step 3: Verifica TypeScript + test**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b && npm test
  ```
  Atteso: zero errori TypeScript, tutti i test verdi.

- [ ] **Step 4: Commit**
  ```bash
  git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
  git commit -m "feat(nutrizionale): expertMode ripristina layout completo — wizard completo"
  ```

---

## Task 11: Terminologia — "Resa dopo cottura"

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 1: Trovare e aggiornare la label "Resa %"**

  Cercare nel file:
  ```bash
  grep -n "Resa\|resa\|yield" /Users/novanta/Desktop/APP/App_prova/src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx | grep -i "label\|title\|placeholder\|span\|text"
  ```

  Per ogni occorrenza di label UI che dice "Resa %" o "resa" aggiornare in "Resa dopo cottura (%)" con tooltip:
  ```tsx
  // Prima:
  <span>Resa %</span>
  // Dopo:
  <>
      <span>Resa dopo cottura (%)</span>
      <InfoTooltip text="Percentuale di peso che rimane dopo la cottura. Es: 100g di pasta cruda → 250g cotta = resa 250%. Lascia 100% se non c'è variazione di peso." />
  </>
  ```

- [ ] **Step 2: Verifica TypeScript**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
  git commit -m "fix(nutrizionale): terminologia — 'Resa dopo cottura (%)' + tooltip chiarificatore"
  ```

---

## Task 12: Mobile — disclosure progressiva in NutrizionaleCalcMobile

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`

Il mobile ha già 4 tab (Ricetta | Riepilogo | Mercati | Archivio). Non introduciamo una progress bar separata — applichiamo solo le 2 regole di disclosure che hanno il maggior impatto.

- [ ] **Step 1: Nascondere "+ Aggiungi componente" su mobile finché non c'è almeno un ingrediente**

  In `mobile/CalcoloTab.tsx`, trovare il bottone "Aggiungi componente" (o equivalente). Avvolgerlo:
  ```tsx
  {allRows.length > 0 && (
      <button ... onClick={onAddComp}>
          <Plus size={14} /> {components.length === 1 ? '+ Secondo componente' : '+ Componente'}
      </button>
  )}
  ```

  Verificare il prop name corretto con:
  ```bash
  grep -n "addComp\|onAddComp\|addComponent" /Users/novanta/Desktop/APP/App_prova/src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx
  ```

- [ ] **Step 2: Nascondere `pzUV` su mobile quando c'è un solo componente**

  In `mobile/CalcoloTab.tsx`, trovare il campo pz/UV e avvolgerlo:
  ```tsx
  {components.length > 1 && (
      <div>/* campo pzUV */</div>
  )}
  ```

- [ ] **Step 3: Verifica TypeScript**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b
  ```
  Atteso: zero errori.

- [ ] **Step 4: Commit**
  ```bash
  git add src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx
  git commit -m "feat(nutrizionale-mobile): disclosure progressiva componente e pzUV su mobile"
  ```

---

## Task 13: Verifica finale e test

- [ ] **Step 1: Eseguire tutti i test**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npm test
  ```
  Atteso: tutti i test verdi. Se fallisce qualcosa non legato a questo refactor, notare il nome del test e non toccare gli engine.

- [ ] **Step 2: TypeScript finale**
  ```bash
  cd /Users/novanta/Desktop/APP/App_prova && npx tsc -b && npm run lint
  ```
  Atteso: zero errori.

- [ ] **Step 3: Walkthrough manuale completo**

  Scenario A — Utente nuovo (percorso guidato):
  1. Aprire il tool → Fase 1 visibile
  2. Campo nome vuoto → "Avanti →" disabilitato
  3. Inserire "Torta di mele" → "Avanti →" abilitato
  4. Selezionare "Solido"
  5. Click "Avanti →" → Fase 2
  6. "+ Secondo componente" non visibile
  7. Aggiungere "Farina 00" → tabella destra si aggiorna
  8. "+ Secondo componente" compare
  9. Click "Avanti →" → Fase 3
  10. Inserire peso finito 300g
  11. Click "Scarica tabella" → DownloadTableModal si apre

  Scenario B — Consulente esperto:
  1. Click "Esperto" → layout pre-refactor visibile
  2. Tutto funziona come prima

  Scenario C — Carica da archivio in fase 1:
  1. Click "Carica da archivio" → modale archivio
  2. Caricare una ricetta → fase salta a 2

- [ ] **Step 4: Commit finale**
  ```bash
  git add -A
  git commit -m "feat(nutrizionale): redesign UX completato — wizard 3 fasi + modalità esperta"
  ```

---

## Self-review spec coverage

| Requisito spec | Task che lo implementa |
|---|---|
| Progress bar `[ 1 Prodotto ] ── [ 2 Ingredienti ] ── [ 3 Dettagli ]` | Task 4 (CSS) + Task 6 |
| Fase 1: nome + tipo solido/liquido + carica da archivio + avanti | Task 7 |
| Fase 2: sub-tab Ricetta/Riepilogo + componenti + disclosure progressiva | Task 8 |
| Fase 2: `pzUV` nascosto con 1 componente, `+ Secondo componente` dopo primo ing. | Task 8 |
| Fase 3: peso finito + specificGravity (solo liquidi) + additivi + download | Task 9 |
| ExpertMode: toggle, layout attuale intatto | Task 6 + Task 10 |
| BUG-1 SavedTablesModal `confirm()` | Task 1 |
| Tooltip `% AR` in TabUE | Task 2 |
| Tooltip opzioni disabilitate in DownloadTableModal | Task 3 |
| `pz/UV` → `Pezzi/conf.` + tooltip aggiornato | Task 8 |
| `Resa %` → `Resa dopo cottura (%)` + tooltip | Task 11 |
| Mobile: disclosure progressiva componente e pzUV | Task 12 |
| Tabella destra invariata (porzioni, claims, download secondario) | Nessuna modifica necessaria |
| Empty state tabella destra (placeholder con 0 ingredienti) | Esistente (già implementato pre-refactor) |
