# Wizard Guidato — NutrizionaleCalc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere una modalità wizard a 4 passi con toggle "Guidata / Avanzata" al tool NutrizionaleCalc, senza modificare alcuna funzionalità esistente — solo UI layer.

**Architecture:** Un toggle pill persiste la modalità in localStorage (`nutri_wizard_mode`). In modalità Avanzata il form rimane invariato al 100%. In modalità Guidata, una funzione `renderWizard()` (dichiarata inline nel componente, non un componente React separato, per evitare re-mount e prop drilling) renderizza 4 step con progress bar condividendo tutto lo stato del componente padre tramite closure.

**Tech Stack:** React 18, TypeScript, inline styles (nessun CSS framework), useLocalStorage hook (già presente), Vite.

---

## File coinvolti

- **Modify:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`
  - Linea ~851: aggiungere 2 nuove variabili di stato
  - Linea ~1054: estendere `handleNew` con reset step
  - Linea ~1255: aggiungere `renderWizard()` prima del return
  - Linea ~1295: aggiungere toggle pill nell'header
  - Linea ~1308–1719: avvolgere il body esistente in `{!wizardMode && (...)}`
  - Linea ~1719: aggiungere `{wizardMode && renderWizard()}` prima della chiusura del div

---

## Task 1: Nuove variabili di stato + estensione handleNew

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx:851-853` (dopo `const [guideOpen, setGuideOpen]`)
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx:1054-1066` (handleNew)

- [ ] **Step 1: Aggiungere `wizardMode` e `wizardStep` dopo la riga del guideOpen (riga ~853)**

Trovare questo blocco:
```tsx
    // Quick-guide state — using useLocalStorage hook for persistence
    const [guideOpen, setGuideOpen] = useLocalStorage<boolean>('nutri_guide_open', true);
    const toggleGuide = () => setGuideOpen(prev => !prev);
```

Aggiungere subito dopo:
```tsx
    // Wizard mode state
    const [wizardMode, setWizardMode] = useLocalStorage<boolean>('nutri_wizard_mode', true);
    const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0);
    const toggleWizardMode = (mode: boolean) => { setWizardMode(mode); setWizardStep(0); };
```

- [ ] **Step 2: Estendere `handleNew` con reset dello step**

Trovare nel corpo di `handleNew` (riga ~1054) la riga:
```tsx
        setCurrentName('');
```

Aggiungere subito dopo:
```tsx
        setWizardStep(0);
```

- [ ] **Step 3: Verificare compilazione**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build 2>&1 | tail -20
```
Atteso: build senza errori TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat(wizard): aggiungi stato wizardMode e wizardStep"
```

---

## Task 2: Toggle pill nell'header

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx:1300-1305` (div azioni header)

- [ ] **Step 1: Inserire il toggle pill nel div delle azioni dell'header**

Trovare questo blocco (riga ~1300):
```tsx
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" onClick={() => setShowCustomModal(true)}>➕ Aggiungi ingrediente nel Data Base</button>
                    <button className="btn btn-outline" onClick={handleNew}>✨ Nuovo</button>
                    <button className="btn btn-outline" onClick={() => setArchiveOpen(true)}>📂 Archivio ({archiveItems.length})</button>
                    <button className="btn btn-accent" onClick={handleSave}>💾 {currentId ? 'Aggiorna in Archivio' : 'Salva in Archivio'}</button>
                </div>
```

Sostituire con:
```tsx
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Toggle Guidata / Avanzata */}
                    <div style={{ display: 'flex', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 8, padding: 3, gap: 2 }}>
                        <button
                            onClick={() => toggleWizardMode(true)}
                            style={{
                                padding: '6px 15px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontFamily: 'inherit', fontSize: 12, fontWeight: 700, transition: 'all .2s',
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: wizardMode ? 'linear-gradient(135deg, var(--color-orange), var(--color-orange-hover))' : 'transparent',
                                color: wizardMode ? 'white' : 'var(--color-text-muted)',
                                boxShadow: wizardMode ? '0 1px 6px rgba(255,126,46,.30)' : 'none',
                            }}>
                            🧭 Guidata
                        </button>
                        <button
                            onClick={() => toggleWizardMode(false)}
                            style={{
                                padding: '6px 15px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontFamily: 'inherit', fontSize: 12, fontWeight: 700, transition: 'all .2s',
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: !wizardMode ? 'linear-gradient(135deg, var(--color-orange), var(--color-orange-hover))' : 'transparent',
                                color: !wizardMode ? 'white' : 'var(--color-text-muted)',
                                boxShadow: !wizardMode ? '0 1px 6px rgba(255,126,46,.30)' : 'none',
                            }}>
                            ⚙ Avanzata
                        </button>
                    </div>
                    <button className="btn btn-outline" onClick={() => setShowCustomModal(true)}>➕ Aggiungi ingrediente nel Data Base</button>
                    <button className="btn btn-outline" onClick={handleNew}>✨ Nuovo</button>
                    <button className="btn btn-outline" onClick={() => setArchiveOpen(true)}>📂 Archivio ({archiveItems.length})</button>
                    <button className="btn btn-accent" onClick={handleSave}>💾 {currentId ? 'Aggiorna in Archivio' : 'Salva in Archivio'}</button>
                </div>
```

- [ ] **Step 2: Build e verifica visiva**

```bash
npm run build 2>&1 | tail -10
```
Atteso: build ok. Poi aprire in browser con `npm run dev` e verificare che il toggle appaia nell'header e cambi stato al click.

- [ ] **Step 3: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat(wizard): aggiungi toggle pill Guidata/Avanzata nell'header"
```

---

## Task 3: Avvolgere il body esistente in modalità Avanzata

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx:1308-1719`

- [ ] **Step 1: Trovare la riga della Quick Guide (riga ~1308) e racchiudere tutto il body in `{!wizardMode && (...)}`**

Trovare questo commento (riga ~1308):
```tsx
            {/* Quick Guide — mod 1 (Step 3 text updated) */}
            <div style={{ marginBottom: 20, border: '1.5px solid var(--color-border)', ...
```

E il blocco export alla fine (riga ~1711):
```tsx
            {allRows.length > 0 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" onClick={handleDownloadPNG}>🖼️ Scarica tabella PNG</button>
                    <button className="btn btn-primary" onClick={handleDownloadEtichettaPDF}>📋 Scarica Scheda Etichetta PDF</button>
                    <button className="btn btn-primary" onClick={handlePDF}>📄 Scarica PDF completo</button>
                    <button className="btn btn-primary" onClick={handleSave} style={{ background: 'var(--color-navy)' }}>💾 Salva in archivio</button>
                </div>
            )}
```

Avvolgere l'intero blocco dalla Quick Guide fino al blocco export incluso con:
```tsx
            {!wizardMode && (<>
                {/* Quick Guide */}
                ... (tutto il contenuto esistente invariato) ...
                {allRows.length > 0 && (
                    <div ...export buttons...>
                    </div>
                )}
            </>)}
```

- [ ] **Step 2: Build e verifica**

```bash
npm run build 2>&1 | tail -10
```
Atteso: build ok. Con `npm run dev`: passando a "Avanzata" si vede il form completo; passando a "Guidata" il form scompare (pagina bianca per ora).

- [ ] **Step 3: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat(wizard): nascondi form avanzato in modalità Guidata"
```

---

## Task 4: Funzione `renderWizard()` — shell con progress bar e navigazione

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx:1253` (prima del `return (`)

- [ ] **Step 1: Aggiungere la funzione `renderWizard` immediatamente prima del `return (` del componente**

```tsx
    // ─── Wizard renderer ──────────────────────────────────────────────────────
    const WIZ_STEPS: { label: string }[] = [
        { label: 'Prodotto' },
        { label: 'Ingredienti' },
        { label: 'Mercati' },
        { label: 'Export' },
    ];

    const wizNav = (dir: -1 | 1) => {
        if (dir === 1) {
            if (wizardStep === 0 && !productName.trim()) {
                setFieldErrors(prev => ({ ...prev, wizardNome: 'Inserisci il nome del prodotto per continuare.' }));
                return;
            }
            if (wizardStep === 1 && allRows.length === 0) {
                setFieldErrors(prev => ({ ...prev, wizardIng: 'Aggiungi almeno un ingrediente per continuare.' }));
                return;
            }
        }
        setFieldErrors({});
        setWizardStep(prev => Math.max(0, Math.min(3, prev + dir)) as 0 | 1 | 2 | 3);
    };

    const renderWizard = (): React.ReactNode => {
        const pct = ((wizardStep + 1) / 4 * 100).toFixed(0) + '%';

        return (
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>

                {/* ── Progress bar ── */}
                <div style={{ padding: '22px 28px 0', borderBottom: '1px solid var(--color-border)' }}>
                    {/* Step indicators */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                        {WIZ_STEPS.map((s, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && (
                                    <div style={{
                                        flex: 1, height: 2, margin: '0 6px',
                                        background: i <= wizardStep ? 'var(--color-green)' : 'var(--color-border)',
                                        transition: 'background .3s',
                                    }} />
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < WIZ_STEPS.length - 1 ? undefined : undefined }}>
                                    <div style={{
                                        width: 30, height: 30, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                                        transition: 'all .3s',
                                        background: i < wizardStep ? 'var(--color-green)'
                                            : i === wizardStep ? 'linear-gradient(135deg, var(--color-orange), var(--color-orange-hover))'
                                            : 'var(--color-surface)',
                                        border: `2px solid ${i < wizardStep ? 'var(--color-green)' : i === wizardStep ? 'var(--color-orange)' : 'var(--color-border)'}`,
                                        color: i <= wizardStep ? 'white' : 'var(--color-text-dim)',
                                        boxShadow: i === wizardStep ? '0 0 0 4px rgba(255,126,46,.18)' : 'none',
                                    }}>
                                        {i < wizardStep ? '✓' : i + 1}
                                    </div>
                                    <span style={{
                                        fontSize: 12, fontWeight: 700,
                                        color: i < wizardStep ? 'var(--color-green)' : i === wizardStep ? 'var(--color-navy)' : 'var(--color-text-dim)',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {s.label}
                                    </span>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                    {/* Bar + counter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--color-surface)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: 2,
                                background: 'linear-gradient(90deg, var(--color-orange), var(--color-orange-light))',
                                width: pct, transition: 'width .45s cubic-bezier(.4,0,.2,1)',
                            }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                            Passo {wizardStep + 1} di 4
                        </span>
                    </div>
                </div>

                {/* ── Step content (verrà aggiunto nei Task 5-8) ── */}
                <div style={{ padding: 28, minHeight: 340 }}>
                    {wizardStep === 0 && <div>Step 0 placeholder</div>}
                    {wizardStep === 1 && <div>Step 1 placeholder</div>}
                    {wizardStep === 2 && <div>Step 2 placeholder</div>}
                    {wizardStep === 3 && <div>Step 3 placeholder</div>}
                </div>

                {/* ── Footer navigazione ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 28px', borderTop: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                }}>
                    <button
                        className="btn btn-outline"
                        onClick={() => wizNav(-1)}
                        disabled={wizardStep === 0}
                        style={{ opacity: wizardStep === 0 ? 0.4 : 1 }}>
                        ← Indietro
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {fieldErrors.wizardNome && (
                            <span style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600 }}>
                                ⚠ {fieldErrors.wizardNome}
                            </span>
                        )}
                        {fieldErrors.wizardIng && (
                            <span style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600 }}>
                                ⚠ {fieldErrors.wizardIng}
                            </span>
                        )}
                        <button
                            className={wizardStep === 3 ? 'btn btn-accent' : 'btn btn-accent'}
                            onClick={() => wizardStep === 3 ? undefined : wizNav(1)}>
                            {wizardStep === 3 ? '✅ Torna al tool completo' : 'Avanti →'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };
```

- [ ] **Step 2: Aggiungere `{wizardMode && renderWizard()}` nel return**

Nel `return (...)`, subito prima della chiusura `</div>` finale (dopo il blocco `{!wizardMode && ...}`):
```tsx
            {wizardMode && renderWizard()}
```

- [ ] **Step 3: Verificare che React sia importato nel file (serve `React.Fragment`)**

Controllare la prima riga del file. Se l'import è:
```tsx
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
```
Aggiungere `React` come import default:
```tsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
```

- [ ] **Step 4: Build e verifica visiva**

```bash
npm run build 2>&1 | tail -10
```
Atteso: build ok. Con `npm run dev`: in modalità Guidata appare la card con progress bar, i 4 step indicators, e i placeholder. Avanti/Indietro funzionano, la barra avanza.

- [ ] **Step 5: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat(wizard): aggiungi shell renderWizard con progress bar e navigazione"
```

---

## Task 5: Wizard Step 0 — Prodotto

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` (dentro `renderWizard`, sezione `wizardStep === 0`)

- [ ] **Step 1: Sostituire il placeholder dello step 0**

Trovare dentro `renderWizard`:
```tsx
                    {wizardStep === 0 && <div>Step 0 placeholder</div>}
```

Sostituire con:
```tsx
                    {wizardStep === 0 && (
                        <div>
                            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: 'var(--color-navy)', marginBottom: 4 }}>
                                📦 Il tuo prodotto
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 22, lineHeight: 1.55 }}>
                                Inserisci le informazioni base. Il nome apparirà nella testata di ogni tabella nutrizionale generata.
                            </p>

                            {/* Nome prodotto */}
                            <div className="card" style={{ marginBottom: 16, background: 'rgba(255,126,46,0.04)', border: '2px solid var(--color-orange)', padding: '14px 18px' }}>
                                <label style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-orange)', display: 'block', marginBottom: 10 }}>
                                    PRODOTTO <span style={{ color: 'var(--color-danger)' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Nome prodotto (es. Torta di mele, Salsa al pomodoro…)"
                                    value={productName}
                                    onChange={e => { setProductName(e.target.value); setFieldErrors({}); }}
                                    style={{ fontSize: 15, fontWeight: 600, borderColor: fieldErrors.wizardNome ? 'var(--color-danger)' : undefined }}
                                />
                            </div>

                            {/* Peso finito + specificGravity */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                                <div className="form-field" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Peso finito (g/pz)</label>
                                    <input
                                        type="number" min={0} className="form-input"
                                        placeholder="es. 120"
                                        value={finishedWeight}
                                        onChange={e => setFinishedWeight(e.target.value)}
                                    />
                                    <span className="hint">Peso netto dopo lavorazione/cottura.</span>
                                </div>
                                <div className="form-field" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Peso specifico (g/ml)</label>
                                    <input
                                        type="number" min={0} className="form-input"
                                        placeholder="Solo per liquidi"
                                        value={specificGravity}
                                        onChange={e => setSpecificGravity(e.target.value)}
                                    />
                                    <span className="hint">Facoltativo.</span>
                                </div>
                            </div>

                            {/* Pz per UV del primo componente */}
                            <div className="form-field" style={{ maxWidth: 220 }}>
                                <label className="form-label">N. pezzi per UV (Componente 1)</label>
                                <input
                                    type="number" min={1} step={0.1} className="form-input"
                                    value={components[0]?.pzUV ?? 1}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value) || 1;
                                        const errKey = `${components[0].id}-pzuv`;
                                        const err = validatePieces(val);
                                        if (err) { setFieldErrors(prev => ({ ...prev, [errKey]: err })); return; }
                                        setFieldErrors(prev => { const n = { ...prev }; delete n[errKey]; return n; });
                                        updateCompPzUV(components[0].id, val);
                                    }}
                                />
                                <span className="hint">Pezzi contenuti nell'unità di vendita (1 = prodotto sfuso).</span>
                            </div>
                        </div>
                    )}
```

- [ ] **Step 2: Build e verifica**

```bash
npm run build 2>&1 | tail -10
```
Con `npm run dev`: in step 0 appare il form PRODOTTO con bordo arancione, i campi peso/specificGravity e pzUV. Modificare i valori e passare a Avanzata — i dati devono essere sincronizzati.

- [ ] **Step 3: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat(wizard): implementa step 0 Prodotto"
```

---

## Task 6: Wizard Step 1 — Ingredienti

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` (dentro `renderWizard`, sezione `wizardStep === 1`)

- [ ] **Step 1: Sostituire il placeholder dello step 1**

Trovare dentro `renderWizard`:
```tsx
                    {wizardStep === 1 && <div>Step 1 placeholder</div>}
```

Sostituire con:
```tsx
                    {wizardStep === 1 && (
                        <div>
                            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: 'var(--color-navy)', marginBottom: 4 }}>
                                🥗 Ingredienti della ricetta
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 22, lineHeight: 1.55 }}>
                                Cerca ogni ingrediente nel database e inserisci i grammi per l'intera ricetta. Puoi gestire fino a 4 componenti separati.
                            </p>
                            {fieldErrors.wizardIng && (
                                <div style={{ background: 'rgba(229,62,62,.07)', border: '1px solid rgba(229,62,62,.22)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--color-danger)', fontWeight: 600 }}>
                                    ⚠ {fieldErrors.wizardIng}
                                </div>
                            )}
                            {/* Rendering identico alla sezione componenti del form avanzato */}
                            <div style={{ background: 'var(--color-navy)', color: 'white', borderRadius: '10px 10px 0 0', padding: '10px 20px', fontWeight: 800, fontSize: 14, letterSpacing: '0.06em' }}>
                                📋 INSERIMENTO RICETTA
                            </div>
                            <div style={{ border: '2px solid var(--color-navy)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '16px 16px 4px', marginBottom: 16 }}>
                                {components.map((comp, ci) => {
                                    const isCompOpen = compOpen[comp.id] !== false;
                                    return (
                                        <div key={comp.id} className="card" style={{ marginBottom: 12 }}>
                                            <div
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                                                onClick={() => setCompOpen(prev => ({ ...prev, [comp.id]: !isCompOpen }))}
                                            >
                                                <h3 style={{ margin: 0 }}>🧾 Componente {ci + 1}{comp.name ? ` — ${comp.name}` : ''}</h3>
                                                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{isCompOpen ? '▲' : '▼'}</span>
                                            </div>
                                            {isCompOpen && (
                                                <div style={{ marginTop: 12 }}>
                                                    {/* Il contenuto del componente (nome, pzUV, ricerca, righe) è identico al form avanzato — vedi righe 1356-1540 del file originale */}
                                                    {/* Copiare verbatim il JSX interno del componente dal form avanzato */}
                                                    <ComponentBody comp={comp} ci={ci} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {components.length < 4 && (
                                    <button className="btn btn-outline" onClick={addComp} style={{ marginBottom: 12 }}>
                                        ➕ Aggiungi componente
                                    </button>
                                )}
                            </div>

                            {/* Sezione additivi */}
                            <div style={{ marginBottom: 12 }}>
                                {/* Copiare verbatim il JSX della sezione additivi dal form avanzato */}
                            </div>
                        </div>
                    )}
```

**NOTA:** La riga `<ComponentBody comp={comp} ci={ci} />` è un placeholder narrativo — va sostituita con il JSX effettivo presente nel form avanzato (righe ~1362–1540 del file). Lo stesso vale per la sezione additivi. **Non creare una nuova funzione ComponentBody** — incollare il JSX inline verbatim.

- [ ] **Step 2: Identificare il JSX esatto da copiare**

Nel file originale, dentro il `components.map((comp, ci) => {...})` del form avanzato (riga ~1357), copiare tutto il JSX del corpo del componente (la parte dopo `<h3>` che include: nome comp input, pzUV input, IngredientSearchBox, righe ingredienti, summary) e incollarlo al posto del placeholder `<ComponentBody />`.

- [ ] **Step 3: Copiare anche la sezione additivi**

La sezione additivi nel form avanzato si trova dopo il map dei componenti. Identificarla e copiarla verbatim dentro lo step 1 del wizard (al posto del commento `{/* Sezione additivi */}`).

- [ ] **Step 4: Build e verifica**

```bash
npm run build 2>&1 | tail -10
```
Con `npm run dev`: step 1 mostra i componenti con ricerca ingredienti funzionante. Aggiungendo ingredienti in wizard → passare ad Avanzata → verificare che gli stessi ingredienti siano presenti.

- [ ] **Step 5: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat(wizard): implementa step 1 Ingredienti"
```

---

## Task 7: Wizard Step 2 — Mercati & Serving size

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` (dentro `renderWizard`, sezione `wizardStep === 2`)

- [ ] **Step 1: Sostituire il placeholder dello step 2**

Trovare dentro `renderWizard`:
```tsx
                    {wizardStep === 2 && <div>Step 2 placeholder</div>}
```

Sostituire con:
```tsx
                    {wizardStep === 2 && (
                        <div>
                            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: 'var(--color-navy)', marginBottom: 4 }}>
                                🌍 Mercati & Serving size
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 22, lineHeight: 1.55 }}>
                                Seleziona il mercato di destinazione e configura le porzioni di riferimento (facoltativo).
                            </p>

                            {/* Selezione mercato — usa activeTab esistente */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                                {(['UE', 'USA', 'Canada', 'Australia', 'Arabi'] as NationTab[]).map(t => {
                                    const labels: Record<NationTab, string> = { UE: '🇪🇺 UE', USA: '🇺🇸 USA', Canada: '🇨🇦 Canada', Australia: '🇦🇺 Australia', Arabi: '🌍 Arabi' };
                                    return (
                                        <button
                                            key={t}
                                            className={`btn ${activeTab === t ? 'btn-primary' : 'btn-outline'}`}
                                            style={{ fontSize: 13, fontWeight: 600, padding: '9px 16px' }}
                                            onClick={() => setActiveTab(t)}>
                                            {labels[t]}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Serving size inputs — identici al form avanzato per il tab attivo */}
                            <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '16px 20px', marginBottom: 16 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-navy)', marginBottom: 12 }}>
                                    Serving size per {activeTab}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                                    {activeTab === 'UE' && (
                                        <>
                                            {(['porzione', 'confezione', 'pezzo'] as const).map((k, i) => {
                                                const labels = ['Porzione (g/ml)', 'Confezione (g/ml)', 'Pezzo (g/ml)'];
                                                return (
                                                    <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">{labels[i]}</label>
                                                        <input type="number" min={0} placeholder="—" value={ue[k] || ''}
                                                            onChange={e => setUE(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                            className="form-input" />
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                    {activeTab === 'USA' && (
                                        <>
                                            {(['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                                const labels = ['CUP 240ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                                return (
                                                    <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">{labels[i]}</label>
                                                        <input type="number" min={0} placeholder="—" value={usa[k] || ''}
                                                            onChange={e => setUSA(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                            className="form-input" />
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                    {activeTab === 'Canada' && (
                                        <>
                                            {(['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                                const labels = ['CUP 250ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                                return (
                                                    <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">{labels[i]}</label>
                                                        <input type="number" min={0} placeholder="—" value={ca[k] || ''}
                                                            onChange={e => setCA(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                            className="form-input" />
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                    {activeTab === 'Australia' && (
                                        <>
                                            {(['serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                                const labels = ['Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                                return (
                                                    <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">{labels[i]}</label>
                                                        <input type="number" min={0} placeholder="—" value={au[k] || ''}
                                                            onChange={e => setAU(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                            className="form-input" />
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                    {activeTab === 'Arabi' && (
                                        <>
                                            {(['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                                const labels = ['CUP 240ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                                return (
                                                    <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">{labels[i]}</label>
                                                        <input type="number" min={0} placeholder="—" value={arabi[k] || ''}
                                                            onChange={e => setArabi(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                            className="form-input" />
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div style={{ background: 'rgba(67,130,28,.06)', border: '1px solid rgba(67,130,28,.18)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 12, color: 'var(--color-green)', fontWeight: 600 }}>
                                ✅ Serving size facoltativo — se non specificato la tabella mostrerà solo i valori per 100 g.
                            </div>
                        </div>
                    )}
```

- [ ] **Step 2: Build e verifica**

```bash
npm run build 2>&1 | tail -10
```
Con `npm run dev`: step 2 mostra i pulsanti mercato (UE attivo per default, arancione), i campi serving size cambiano selezionando il mercato. Impostare una porzione → passare ad Avanzata → verificare che il valore sia sincronizzato.

- [ ] **Step 3: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat(wizard): implementa step 2 Mercati e Serving size"
```

---

## Task 8: Wizard Step 3 — Anteprima & Export

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` (dentro `renderWizard`, sezione `wizardStep === 3`)

- [ ] **Step 1: Sostituire il placeholder dello step 3**

Trovare dentro `renderWizard`:
```tsx
                    {wizardStep === 3 && <div>Step 3 placeholder</div>}
```

Sostituire con:
```tsx
                    {wizardStep === 3 && (
                        <div>
                            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: 'var(--color-navy)', marginBottom: 4 }}>
                                🎉 Tabella pronta!
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 18, lineHeight: 1.55 }}>
                                Anteprima calcolata · Normativa <strong>{activeTab}</strong>
                            </p>

                            {allRows.length === 0 && (
                                <div style={{ background: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.25)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: 13, color: 'var(--color-warning)', fontWeight: 600, marginBottom: 16 }}>
                                    ⚠ Nessun ingrediente inserito. Torna al passo precedente e aggiungi almeno un ingrediente.
                                </div>
                            )}

                            {/* Tab nazione */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
                                {(['UE', 'USA', 'Canada', 'Australia', 'Arabi'] as NationTab[]).map(t => {
                                    const labels: Record<NationTab, string> = { UE: '🇪🇺 UE', USA: '🇺🇸 USA', Canada: '🇨🇦 Canada', Australia: '🇦🇺 Australia', Arabi: '🌍 Arabi' };
                                    return (
                                        <button key={t}
                                            className={`btn ${activeTab === t ? 'btn-primary' : 'btn-outline'}`}
                                            style={{ fontSize: 14, fontWeight: 600, padding: '8px 0', flex: 1, textAlign: 'center', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                            onClick={() => setActiveTab(t)}>
                                            {labels[t]}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tabella nutrizionale — identica al form avanzato */}
                            <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '16px 20px', marginBottom: 16 }}>
                                <div ref={tableRef}>
                                    {activeTab === 'UE' && <TabUE p={per100g} ue={ue} specificGravity={parseFloat(specificGravity) || 0} full={showOptionals} />}
                                    {activeTab === 'USA' && <TabUSA p={per100g} usa={usa} subTab={subTab} setSubTab={setSubTab} full={false} />}
                                    {activeTab === 'Canada' && <TabCanada p={per100g} ca={ca} subTab={subTab} setSubTab={setSubTab} full={false} />}
                                    {activeTab === 'Australia' && <TabAustralia p={per100g} au={au} showDI={auShowDI} setShowDI={setAuShowDI} full={false} />}
                                    {activeTab === 'Arabi' && <TabArabi p={per100g} arabi={arabi} full={false} />}
                                </div>
                                {activeTab === 'UE' && (
                                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            className={`btn ${showOptionals ? 'btn-primary' : 'btn-outline'}`}
                                            style={{ fontSize: 13, fontWeight: 600, padding: '8px 14px' }}
                                            onClick={() => setShowOptionals(!showOptionals)}>
                                            {showOptionals ? '👁️ Nascondi facoltativi' : '👀 Mostra facoltativi'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Export buttons — identici al form avanzato */}
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <button className="btn btn-outline" onClick={handleDownloadPNG}>🖼️ Scarica tabella PNG</button>
                                <button className="btn btn-primary" onClick={handleDownloadEtichettaPDF}>📋 Scarica Scheda Etichetta PDF</button>
                                <button className="btn btn-primary" onClick={handlePDF}>📄 Scarica PDF completo</button>
                                <button className="btn btn-primary" onClick={handleSave} style={{ background: 'var(--color-navy)' }}>💾 Salva in archivio</button>
                            </div>
                        </div>
                    )}
```

- [ ] **Step 2: Aggiornare il pulsante "Avanti" dell'ultimo step nel footer del wizard**

Nel footer di `renderWizard`, il pulsante Next quando `wizardStep === 3` deve passare alla modalità Avanzata (per permettere accesso completo al tool). Trovare:
```tsx
                        <button
                            className={wizardStep === 3 ? 'btn btn-accent' : 'btn btn-accent'}
                            onClick={() => wizardStep === 3 ? undefined : wizNav(1)}>
                            {wizardStep === 3 ? '✅ Torna al tool completo' : 'Avanti →'}
                        </button>
```

Sostituire con:
```tsx
                        <button
                            className="btn btn-accent"
                            onClick={() => wizardStep === 3 ? toggleWizardMode(false) : wizNav(1)}>
                            {wizardStep === 3 ? '⚙ Apri modalità Avanzata' : 'Avanti →'}
                        </button>
```

- [ ] **Step 3: Build e verifica completa**

```bash
npm run build 2>&1 | tail -10
```
Con `npm run dev`:
1. Modalità Guidata step 3: tabella nutrizionale reale appare, bottoni export funzionano
2. Tab nazione cambia la tabella mostrata
3. "Apri modalità Avanzata" porta al form completo con tutti i dati sincronizzati
4. Toggle Avanzata → Guidata → il wizard riparte da step 0 ma i dati inseriti restano

- [ ] **Step 4: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat(wizard): implementa step 3 Anteprima ed Export"
```

---

## Task 9: Pulizia e deploy preview

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` (review finale)

- [ ] **Step 1: Rimuovere i file prototipo dalla cartella public**

I file HTML di prototipo non devono andare in produzione:
```bash
rm /Users/novanta/Desktop/APP/App_prova/public/ui-prototypes.html
rm /Users/novanta/Desktop/APP/App_prova/public/wizard-preview.html
```

- [ ] **Step 2: Build finale**

```bash
npm run build 2>&1
```
Atteso: zero errori TypeScript, zero warning critici.

- [ ] **Step 3: Commit finale**

```bash
git add -A
git commit -m "feat(wizard): rimuovi file prototipo HTML da public"
```

- [ ] **Step 4: Deploy preview Vercel**

```bash
vercel 2>&1
```
Visitare l'URL generato e verificare:
- Toggle Guidata/Avanzata visibile nell'header
- Wizard funziona end-to-end (tutti e 4 gli step)
- Modalità Avanzata identica a prima
- Export PDF/PNG funzionanti da entrambe le modalità

---

## Self-review checklist

**Spec coverage:**
- ✅ Toggle "Guidata / Avanzata" con persistenza localStorage → Task 1 + Task 2
- ✅ 4 step wizard: Prodotto, Ingredienti, Mercati, Export → Task 5-8
- ✅ Progress bar arancione con step indicators → Task 4
- ✅ Validazione step 0 (nome prodotto) e step 1 (almeno 1 ingrediente) → Task 4
- ✅ Stato condiviso tra wizard e modalità avanzata → tutto il piano (closure su stato padre)
- ✅ handleNew resetta wizardStep → Task 1
- ✅ Nessuna funzionalità cambia — tabelle, calcoli, export identici → Task 8
- ✅ Nessuna nuova dipendenza npm → confermato

**Placeholder scan:** Nessun TBD o TODO aperto eccetto la nota esplicita al Task 6 Step 1 (JSX verbatim da copiare dal file esistente — intenzionale, non omissione).

**Type consistency:** `NationTab`, `wizardStep: 0|1|2|3`, `toggleWizardMode(bool)` usati coerentemente in tutti i task.
