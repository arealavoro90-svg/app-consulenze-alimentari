# Mobile Nutrizionale Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactoring completo di `NutrizionaleCalcMobile.tsx` e cartella `mobile/` da 4 tab a 3 tab (Editor / Tabelle / Archivio) con Smart Import hero, accordion collapsibili, swipe navigator per componenti, e parità funzionale con il desktop.

**Architecture:** Root mantiene tutto lo state (form, components, calcResult, allergens). I 3 tab ricevono props + callback. EditorTab nasce dal refactoring di CalcoloTab (940 linee) con nuova struttura accordion; RiepilogoTab viene mergiato in coda all'EditorTab come sezione. TabelleTab nasce dal refactoring di TabellaTab con pill selector. Nessun componente Tab* (TabUE/USA/CA/AU/AR) viene toccato.

**Tech Stack:** React 18, TypeScript, Tailwind 4, Vite, Vitest — stesso stack esistente, zero nuove dipendenze.

---

## File Map

| File | Azione |
|---|---|
| `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` | Modifica — 4→3 tab, aggiunge `activeComponentIdx` |
| `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx` | **Rinomina + refactoring** → `EditorTab.tsx` |
| `src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx` | **Refactoring** — pill selector, serving inline, CSS aggiornato |
| `src/calculators/NutrizionaleCalc/mobile/ArchivioTab.tsx` | **Refactoring minore** — sezioni temporali |
| `src/calculators/NutrizionaleCalc/mobile/RiepilogoTab.tsx` | **Eliminato** — logica confluisce in EditorTab |
| `src/styles/mobile.css` | Modifica — slide track 4→3 pannelli, nuovi stili accordion |

---

## Task 1: Root — 4 tab → 3 tab e slide track

**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`

- [ ] **Step 1: Aggiorna il tipo MobileTab e TAB_ORDER**

Sostituisci riga 117:
```typescript
// PRIMA:
export type MobileTab = 'ricetta' | 'riepilogo' | 'mercati' | 'archivio';

// DOPO:
export type MobileTab = 'editor' | 'tabelle' | 'archivio';
```

E aggiorna nel body del componente (riga ~129):
```typescript
const TAB_ORDER: MobileTab[] = ['editor', 'tabelle', 'archivio'];
```

- [ ] **Step 2: Aggiorna l'array `tabs` con nuove icone**

Sostituisci il blocco `tabs` (righe ~339-344):
```typescript
import { PencilLine, BarChart2, Archive } from 'lucide-react';

const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'editor',   label: 'Editor',   icon: <PencilLine size={21} /> },
    { id: 'tabelle',  label: 'Tabelle',  icon: <BarChart2  size={21} /> },
    { id: 'archivio', label: 'Archivio', icon: <Archive    size={21} /> },
];
```

Rimuovi le import non più usate: `Salad`, `ClipboardList`, `Globe`.

- [ ] **Step 3: Aggiungi stato `activeComponentIdx` nel root**

Dopo la riga `const [currentRegion, ...` aggiungi:
```typescript
const [activeComponentIdx, setActiveComponentIdx] = useState(0);

// Reset idx quando si rimuove un componente
const removeComponent = (id: string) => {
    setComponents(prev => {
        if (prev.length <= 1) return prev;
        const next = prev.filter(c => c.id !== id);
        setActiveComponentIdx(i => Math.min(i, next.length - 1));
        return next;
    });
};
```

Nota: `removeComponent` esistente (riga 270) viene sostituita da questa versione.

- [ ] **Step 4: Aggiorna `loadFromArchive` per navigare su 'editor'**

Riga 318, cambia `goToSection('ricetta')` → `goToSection('editor')`.

- [ ] **Step 5: Aggiorna il JSX — slide track 3 pannelli**

Sostituisci il contenuto di `<div className="m-slide-container">` (righe ~360-438) con:
```tsx
<div className="m-slide-container">
    <div
        className="m-slide-track"
        style={{ transform: `translateX(-${tabIndex * 33.333}%)` }}
    >
        {/* Panel 0: Editor */}
        <div className="m-slide-panel">
            <EditorTab
                form={form}
                onChange={updateForm}
                db={db}
                loadingDB={loadingDB}
                dbError={dbError}
                components={components}
                activeComponentIdx={activeComponentIdx}
                onSetActiveComponentIdx={setActiveComponentIdx}
                onAddComponent={() => {
                    setComponents(prev => {
                        const next = [...prev, makeComponent()];
                        setActiveComponentIdx(next.length - 1);
                        return next;
                    });
                }}
                onRemoveComponent={removeComponent}
                onUpdateComponentName={updateComponentName}
                onUpdateComponentPzUV={updateComponentPzUV}
                onAddRow={addRow}
                onRemoveRow={removeRow}
                onUpdateRow={updateRow}
                onAddAdditiveRow={addAdditiveRow}
                onRemoveAdditiveRow={removeAdditiveRow}
                onUpdateAdditiveRow={updateAdditiveRow}
                onOpenSmartImport={() => setShowSmartImport(true)}
                onOpenArchive={() => goToSection('archivio')}
                hasExcelImport={hasExcelImport}
                calcResult={calcResult}
                presentAllergens={presentAllergens}
                crossAllergens={crossAllergens}
                pesoFinito={parseFloat(form.pesoFinito_g) || 0}
            />
        </div>

        {/* Panel 1: Tabelle */}
        <div className="m-slide-panel">
            <TabelleTab
                calcResult={calcResult}
                form={form}
                onChange={updateForm}
                onSave={(region) => {
                    archive.saveItem(
                        form.denominazione || 'Senza nome',
                        {
                            denominazione: form.denominazione,
                            porzione_g: parseFloat(form.porzione_g) || 100,
                            region,
                            calcResult,
                            form,
                            components,
                        }
                    );
                }}
                onExportPDF={handleExportPDF}
                hasIngredients={hasIngredients}
                presentAllergens={presentAllergens}
                crossAllergens={crossAllergens}
                initialRegion={currentRegion ?? undefined}
            />
        </div>

        {/* Panel 2: Archivio */}
        <div className="m-slide-panel">
            <ArchivioTab
                items={archive.items}
                onLoad={(entry) => loadFromArchive(entry)}
                onDelete={(id) => archive.deleteItem(id)}
            />
        </div>
    </div>
</div>
```

- [ ] **Step 6: Aggiorna gli import in cima al file**

```typescript
import { EditorTab } from './mobile/EditorTab';
import { TabelleTab } from './mobile/TabelleTab';
import { ArchivioTab } from './mobile/ArchivioTab';
// Rimuovi: CalcoloTab, TabellaTab, RiepilogoTab
```

- [ ] **Step 7: Aggiorna CSS — slide track 3 pannelli**

In `src/styles/mobile.css`, righe 682-691:
```css
/* PRIMA */
.m-slide-track { width: 400%; }
.m-slide-panel { width: 25%; }

/* DOPO */
.m-slide-track { width: 300%; }
.m-slide-panel { width: 33.333%; }
```

- [ ] **Step 8: Commit checkpoint**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx src/styles/mobile.css
git commit -m "refactor(mobile-nut): root 4→3 tab, activeComponentIdx, slide track 300%"
```

---

## Task 2: EditorTab — accordion shell + Prodotto & Componenti

**Fonte:** Refactoring di `mobile/CalcoloTab.tsx` → `mobile/EditorTab.tsx`

- [ ] **Step 1: Scrivi test smoke per EditorTab**

Crea `src/calculators/NutrizionaleCalc/mobile/__tests__/EditorTab.smoke.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { EditorTab } from '../EditorTab';
import { EMPTY_FORM, makeComponent, ZERO_CALC } from '../../NutrizionaleCalcMobile';

const noop = () => {};
const baseProps = {
    form: EMPTY_FORM,
    onChange: noop,
    db: [],
    loadingDB: false,
    dbError: null,
    components: [makeComponent()],
    activeComponentIdx: 0,
    onSetActiveComponentIdx: noop,
    onAddComponent: noop,
    onRemoveComponent: noop,
    onUpdateComponentName: noop,
    onUpdateComponentPzUV: noop,
    onAddRow: noop,
    onRemoveRow: noop,
    onUpdateRow: noop,
    onAddAdditiveRow: noop,
    onRemoveAdditiveRow: noop,
    onUpdateAdditiveRow: noop,
    onOpenSmartImport: noop,
    onOpenArchive: noop,
    hasExcelImport: false,
    calcResult: ZERO_CALC,
    presentAllergens: [],
    crossAllergens: [],
    pesoFinito: 0,
};

describe('EditorTab', () => {
    it('mostra Smart Import hero quando non ci sono ingredienti', () => {
        render(<EditorTab {...baseProps} />);
        expect(screen.getByText(/Smart Import/i)).toBeInTheDocument();
    });

    it('mostra accordion Prodotto & Pesi', () => {
        render(<EditorTab {...baseProps} />);
        expect(screen.getByText(/Prodotto & Pesi/i)).toBeInTheDocument();
    });

    it('mostra accordion Componenti', () => {
        render(<EditorTab {...baseProps} />);
        expect(screen.getByText(/Componenti/i)).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Verifica che il test fallisce**

```bash
npx vitest run src/calculators/NutrizionaleCalc/mobile/__tests__/EditorTab.smoke.test.tsx
```
Atteso: errore `Cannot find module '../EditorTab'`.

- [ ] **Step 3: Crea `mobile/EditorTab.tsx` — copia CalcoloTab e aggiorna la Props interface**

Copia `CalcoloTab.tsx` → `EditorTab.tsx`. In cima al file, aggiorna l'interfaccia Props aggiungendo i nuovi campi:

```typescript
// Rinomina il componente da CalcoloTab a EditorTab
// Aggiorna Props per aggiungere:
interface Props {
    // ... tutti i campi già presenti in CalcoloTab ...
    activeComponentIdx: number;
    onSetActiveComponentIdx: (idx: number) => void;
    presentAllergens: string[];
    crossAllergens: string[];
    pesoFinito: number;
}
```

Aggiorna l'export: `export function EditorTab(props: Props)`.

- [ ] **Step 4: Aggiungi helper MAccordion dentro EditorTab.tsx**

Prima del componente `EditorTab`, aggiungi:
```typescript
function MAccordion({
    title,
    children,
    defaultOpen = false,
    badge,
}: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: number | string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="m-accordion">
            <button
                type="button"
                className="m-accordion-header"
                onClick={() => setOpen(o => !o)}
            >
                <span className="m-accordion-title">{title}</span>
                {badge !== undefined && (
                    <span className="m-accordion-badge">{badge}</span>
                )}
                <span className="m-accordion-chevron">{open ? '▲' : '▼'}</span>
            </button>
            {open && <div className="m-accordion-body">{children}</div>}
        </div>
    );
}
```

- [ ] **Step 5: Aggiungi helper ComponentNav dentro EditorTab.tsx**

```typescript
function ComponentNav({
    components,
    activeIdx,
    onPrev,
    onNext,
    onAdd,
    onRemove,
}: {
    components: MobileComponent[];
    activeIdx: number;
    onPrev: () => void;
    onNext: () => void;
    onAdd: () => void;
    onRemove: () => void;
}) {
    const comp = components[activeIdx];
    const label = comp?.name || `Componente ${activeIdx + 1}`;
    return (
        <div className="m-comp-nav">
            <button type="button" className="m-comp-nav__btn" onClick={onPrev} disabled={activeIdx === 0}>‹</button>
            <span className="m-comp-nav__label">{activeIdx + 1} · {label}</span>
            <button type="button" className="m-comp-nav__btn" onClick={onNext} disabled={activeIdx === components.length - 1}>›</button>
            <button type="button" className="m-comp-nav__add" onClick={onAdd}>+</button>
            {components.length > 1 && (
                <button type="button" className="m-comp-nav__remove" onClick={onRemove}>🗑</button>
            )}
        </div>
    );
}
```

- [ ] **Step 6: Riscrivi il JSX return di EditorTab**

Sostituisci il blocco `return (...)` del componente con la nuova struttura accordion. Mantieni tutti i sub-componenti interni esistenti (ComponentCard, IngredientPickerModal, RecipeRowItem, AdditiveSection) invariati — cambia solo il layout esterno:

```tsx
return (
    <div className="m-editor-tab">
        {/* Smart Import Hero — solo se no ingredienti */}
        {!hasIngredients && (
            <div className="m-smart-import-hero">
                <div className="m-smart-import-hero__icon">✨</div>
                <div className="m-smart-import-hero__title">Smart Import</div>
                <div className="m-smart-import-hero__sub">
                    Incolla lista ingredienti · carica Excel · inserisci manualmente
                </div>
                <div className="m-smart-import-hero__btns">
                    <button
                        type="button"
                        className="m-btn m-btn--primary"
                        onClick={onOpenSmartImport}
                    >
                        ✨ Smart import
                    </button>
                    <button
                        type="button"
                        className="m-btn m-btn--ghost"
                        onClick={onOpenArchive}
                    >
                        📁 Archivio
                    </button>
                </div>
            </div>
        )}

        {/* Accordion: Prodotto & Pesi */}
        <MAccordion title="📦 Prodotto & Pesi" defaultOpen>
            {/* Campi denominazione, pesoFinito_g, specificGravity
                Copia il contenuto della "Sezione Prodotto" di CalcoloTab invariato */}
            <div className="m-field-grid">
                <div className="m-field">
                    <label className="m-label">Nome prodotto</label>
                    <input
                        className="m-input"
                        value={form.denominazione}
                        onChange={e => onChange({ denominazione: e.target.value })}
                        placeholder="Es. Biscotto Senza Glutine"
                    />
                </div>
                <div className="m-field">
                    <label className="m-label">Peso finito (g)</label>
                    <input
                        className="m-input"
                        type="number"
                        inputMode="decimal"
                        value={form.pesoFinito_g}
                        onChange={e => onChange({ pesoFinito_g: e.target.value })}
                        placeholder="Es. 250"
                    />
                </div>
            </div>
            {showLiquid && (
                <div className="m-field" style={{ marginTop: 8 }}>
                    <label className="m-label">Peso specifico (g/ml)</label>
                    <input
                        className="m-input"
                        type="number"
                        inputMode="decimal"
                        value={form.specificGravity}
                        onChange={e => onChange({ specificGravity: e.target.value })}
                        placeholder="Es. 1.05"
                    />
                </div>
            )}
            <button
                type="button"
                className="m-toggle-liquid"
                onClick={() => setShowLiquid(v => !v)}
            >
                {showLiquid ? '▼ Nascondi peso specifico' : '▶ Prodotto liquido (peso specifico)'}
            </button>
        </MAccordion>

        {/* Accordion: Componenti */}
        <MAccordion
            title="🧪 Componenti"
            defaultOpen
            badge={components.length > 1 ? components.length : undefined}
        >
            <ComponentNav
                components={components}
                activeIdx={activeComponentIdx}
                onPrev={() => onSetActiveComponentIdx(activeComponentIdx - 1)}
                onNext={() => onSetActiveComponentIdx(activeComponentIdx + 1)}
                onAdd={onAddComponent}
                onRemove={() => {
                    const comp = components[activeComponentIdx];
                    if (comp) onRemoveComponent(comp.id);
                }}
            />
            {/* Mostra solo il ComponentCard del componente attivo */}
            {components[activeComponentIdx] && (
                <ComponentCard
                    key={components[activeComponentIdx].id}
                    comp={components[activeComponentIdx]}
                    db={db}
                    loadingDB={loadingDB}
                    onUpdateName={name => onUpdateComponentName(components[activeComponentIdx].id, name)}
                    onUpdatePzUV={pz => onUpdateComponentPzUV(components[activeComponentIdx].id, pz)}
                    onAddRow={ing => onAddRow(components[activeComponentIdx].id, ing)}
                    onRemoveRow={rowId => onRemoveRow(components[activeComponentIdx].id, rowId)}
                    onUpdateRow={(rowId, patch) => onUpdateRow(components[activeComponentIdx].id, rowId, patch)}
                    onAddAdditiveRow={() => onAddAdditiveRow(components[activeComponentIdx].id)}
                    onRemoveAdditiveRow={rowId => onRemoveAdditiveRow(components[activeComponentIdx].id, rowId)}
                    onUpdateAdditiveRow={(rowId, patch) => onUpdateAdditiveRow(components[activeComponentIdx].id, rowId, patch)}
                />
            )}
        </MAccordion>

        {/* Accordion: Allergeni & Additivi */}
        <MAccordion
            title="⚠️ Allergeni & Additivi"
            badge={presentAllergens.length > 0 ? presentAllergens.length : undefined}
        >
            {presentAllergens.length === 0 && crossAllergens.length === 0 ? (
                <p className="m-empty-text">Nessun allergene rilevato dagli ingredienti.</p>
            ) : (
                <>
                    {presentAllergens.length > 0 && (
                        <div className="m-allergen-group">
                            <div className="m-allergen-group__label">Contiene</div>
                            <div className="m-allergen-chips">
                                {presentAllergens.map(a => (
                                    <span key={a} className="m-allergen-chip m-allergen-chip--present">{a}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {crossAllergens.length > 0 && (
                        <div className="m-allergen-group" style={{ marginTop: 8 }}>
                            <div className="m-allergen-group__label">Può contenere tracce di</div>
                            <div className="m-allergen-chips">
                                {crossAllergens.map(a => (
                                    <span key={a} className="m-allergen-chip m-allergen-chip--cross">{a}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </MAccordion>

        {/* Accordion: Porzioni per nazione */}
        <MAccordion title="📐 Porzioni per nazione">
            {/* UE */}
            <NazioneServing title="🇪🇺 UE (Reg. 1169/2011)">
                <div className="m-field-grid">
                    <ServingField label="Porzione (g)" value={form.ue_porzione} onChange={v => onChange({ ue_porzione: v })} />
                    <ServingField label="Confezione (g)" value={form.ue_confezione} onChange={v => onChange({ ue_confezione: v })} />
                    <ServingField label="Pezzo (1 UV)" value={form.ue_pezzo} onChange={v => onChange({ ue_pezzo: v })} />
                </div>
            </NazioneServing>
            {/* USA */}
            <NazioneServing title="🇺🇸 USA (FDA NFP)">
                <div className="m-field-grid">
                    <ServingField label="Serving (g)" value={form.usa_serving} onChange={v => onChange({ usa_serving: v })} />
                    <ServingField label="Confezione (g)" value={form.usa_confezione} onChange={v => onChange({ usa_confezione: v })} />
                    <ServingField label="Cup (ml)" value={form.usa_cup} onChange={v => onChange({ usa_cup: v })} />
                    <ServingField label="Cucchiaio (ml)" value={form.usa_cucchiaio} onChange={v => onChange({ usa_cucchiaio: v })} />
                    <ServingField label="Pezzo (1 UV)" value={form.usa_pezzo} onChange={v => onChange({ usa_pezzo: v })} />
                </div>
            </NazioneServing>
            {/* Canada */}
            <NazioneServing title="🇨🇦 Canada (Health Canada)">
                <div className="m-field-grid">
                    <ServingField label="Serving (g)" value={form.ca_serving} onChange={v => onChange({ ca_serving: v })} />
                    <ServingField label="Confezione (g)" value={form.ca_confezione} onChange={v => onChange({ ca_confezione: v })} />
                    <ServingField label="Cup (ml)" value={form.ca_cup} onChange={v => onChange({ ca_cup: v })} />
                    <ServingField label="Cucchiaio (ml)" value={form.ca_cucchiaio} onChange={v => onChange({ ca_cucchiaio: v })} />
                    <ServingField label="Pezzo (1 UV)" value={form.ca_pezzo} onChange={v => onChange({ ca_pezzo: v })} />
                </div>
            </NazioneServing>
            {/* Australia */}
            <NazioneServing title="🇦🇺 Australia (FSANZ)">
                <div className="m-field-grid">
                    <ServingField label="Serving (g)" value={form.au_serving} onChange={v => onChange({ au_serving: v })} />
                    <ServingField label="Confezione (g)" value={form.au_confezione} onChange={v => onChange({ au_confezione: v })} />
                    <ServingField label="Pezzo (1 UV)" value={form.au_pezzo} onChange={v => onChange({ au_pezzo: v })} />
                </div>
            </NazioneServing>
            {/* Arabi */}
            <NazioneServing title="🌙 Arabi (Gulf Standard)">
                <div className="m-field-grid">
                    <ServingField label="Serving (g)" value={form.arabi_serving} onChange={v => onChange({ arabi_serving: v })} />
                    <ServingField label="Confezione (g)" value={form.arabi_confezione} onChange={v => onChange({ arabi_confezione: v })} />
                    <ServingField label="Cup (ml)" value={form.arabi_cup} onChange={v => onChange({ arabi_cup: v })} />
                    <ServingField label="Cucchiaio (ml)" value={form.arabi_cucchiaio} onChange={v => onChange({ arabi_cucchiaio: v })} />
                    <ServingField label="Pezzo (1 UV)" value={form.arabi_pezzo} onChange={v => onChange({ arabi_pezzo: v })} />
                </div>
            </NazioneServing>
        </MAccordion>

        {/* Sezione Riepilogo (in fondo, non accordion) */}
        {hasIngredients && (
            <RiepilogoSection
                components={components}
                pesoFinito={pesoFinito}
                presentAllergens={presentAllergens}
                crossAllergens={crossAllergens}
            />
        )}

        {/* Padding bottom per la tab bar */}
        <div style={{ height: 80 }} />
    </div>
);
```

- [ ] **Step 7: Aggiungi i 3 helper mancanti in EditorTab.tsx (prima di EditorTab)**

```typescript
function NazioneServing({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="m-nazione-serving">
            <button type="button" className="m-nazione-serving__header" onClick={() => setOpen(o => !o)}>
                {title} {open ? '▲' : '▼'}
            </button>
            {open && <div className="m-nazione-serving__body">{children}</div>}
        </div>
    );
}

function ServingField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="m-field">
            <label className="m-label">{label}</label>
            <input
                className="m-input"
                type="number"
                inputMode="decimal"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="—"
            />
        </div>
    );
}

// Estratto da RiepilogoTab — mostra riepilogo ingredienti in coda all'Editor
function RiepilogoSection({
    components,
    pesoFinito,
    presentAllergens,
    crossAllergens,
}: {
    components: MobileComponent[];
    pesoFinito: number;
    presentAllergens: string[];
    crossAllergens: string[];
}) {
    const [rTab, setRTab] = useState<'q' | 'c'>('q');
    const merged = buildMergedIngredients(components);  // definita sopra — copia da RiepilogoTab
    const totGrams = merged.reduce((s, m) => s + m.grammiTotali, 0);
    const hasCosts = merged.some(m => m.eurKg > 0);
    const costoUV = merged.reduce((s, m) => s + (m.eurKg / 1000) * m.grammiTotali * (m.resa / 100), 0);
    const costoKg = pesoFinito > 0 ? (costoUV / pesoFinito) * 1000 : 0;

    return (
        <div className="m-riepilogo-section">
            <div className="m-archive-section-label" style={{ paddingTop: 14 }}>Riepilogo</div>
            {/* Toggle Quantità / Costi */}
            <div className="m-rtab-row">
                <button
                    type="button"
                    className={`m-rtab-btn${rTab === 'q' ? ' m-rtab-btn--active' : ''}`}
                    onClick={() => setRTab('q')}
                >
                    Quantità
                </button>
                <button
                    type="button"
                    className={`m-rtab-btn${rTab === 'c' ? ' m-rtab-btn--active' : ''}`}
                    onClick={() => setRTab('c')}
                >
                    Costi
                </button>
            </div>
            {/* Lista ingredienti mergiati */}
            {merged.map(m => (
                <div key={m.ing.nome} className="m-riep-row">
                    <span className="m-riep-row__name">{m.ing.nome}</span>
                    {rTab === 'q' ? (
                        <span className="m-riep-row__meta">
                            {m.grammiTotali.toFixed(1)} g
                            {pesoFinito > 0 && ` · ${((m.grammiTotali / pesoFinito) * 100).toFixed(1)}%`}
                        </span>
                    ) : (
                        <span className="m-riep-row__meta">
                            {m.eurKg > 0 ? `€${((m.eurKg / 1000) * m.grammiTotali * (m.resa / 100)).toFixed(3)}` : '—'}
                        </span>
                    )}
                </div>
            ))}
            {/* KPI costi */}
            {rTab === 'c' && hasCosts && (
                <div className="m-riep-kpi">
                    <div className="m-riep-kpi__item">
                        <div className="m-riep-kpi__label">Costo UV</div>
                        <div className="m-riep-kpi__value">€{costoUV.toFixed(3)}</div>
                    </div>
                    <div className="m-riep-kpi__item">
                        <div className="m-riep-kpi__label">Costo/kg</div>
                        <div className="m-riep-kpi__value">€{costoKg.toFixed(2)}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

Nota: `buildMergedIngredients` è già definita in `RiepilogoTab.tsx`. Copiala (con la sua implementazione completa) in `EditorTab.tsx` prima di `RiepilogoSection`.

- [ ] **Step 8: Rimuovi import e codice non più usato in EditorTab**

Rimuovi: il vecchio CTA bar "Vai a Mercati", la mini-riepilogo sticky, `onGoToTabella` prop.
Aggiungi `showLiquid` al local state: `const [showLiquid, setShowLiquid] = useState(false);`

- [ ] **Step 9: Verifica test**

```bash
npx vitest run src/calculators/NutrizionaleCalc/mobile/__tests__/EditorTab.smoke.test.tsx
```
Atteso: 3 test PASS.

- [ ] **Step 10: Commit**

```bash
git add src/calculators/NutrizionaleCalc/mobile/EditorTab.tsx \
        src/calculators/NutrizionaleCalc/mobile/__tests__/EditorTab.smoke.test.tsx
git commit -m "feat(mobile-nut): EditorTab con Smart Import hero e accordion (Prodotto/Componenti/Allergeni/Porzioni/Riepilogo)"
```

---

## Task 3: CSS — nuovi stili accordion e hero

**File:** `src/styles/mobile.css`

- [ ] **Step 1: Aggiungi stili accordion dopo i token esistenti**

Aggiungi in fondo a `mobile.css`:
```css
/* ── EditorTab — Accordion ──────────────────────────────────────────────────── */
.m-editor-tab {
  padding: 8px 0;
}

.m-accordion {
  margin: 0 10px 6px;
  border-radius: var(--m-radius-md, 10px);
  overflow: hidden;
  border: 1px solid rgba(12, 19, 38, 0.10);
}

.m-accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  background: #fff;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: var(--m-text, #0c1326);
  min-height: 44px;
}

.m-accordion-title { flex: 1; }

.m-accordion-badge {
  background: var(--m-orange, #ff7e2e);
  color: #fff;
  border-radius: 20px;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 700;
}

.m-accordion-chevron {
  font-size: 10px;
  color: var(--m-text-muted, rgba(12,19,38,0.45));
}

.m-accordion-body {
  background: #fff;
  border-top: 1px solid rgba(12,19,38,0.07);
  padding: 10px 12px;
}

/* ── Smart Import Hero ──────────────────────────────────────────────────────── */
.m-smart-import-hero {
  margin: 10px;
  background: linear-gradient(135deg, #0c1326 0%, #1e3a6e 100%);
  border-radius: var(--m-radius-md, 10px);
  padding: 16px;
  color: #fff;
  text-align: center;
}

.m-smart-import-hero__icon { font-size: 22px; margin-bottom: 4px; }
.m-smart-import-hero__title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
.m-smart-import-hero__sub { font-size: 11px; opacity: 0.7; margin-bottom: 12px; }

.m-smart-import-hero__btns {
  display: flex;
  gap: 8px;
}

/* ── Component Nav ──────────────────────────────────────────────────────────── */
.m-comp-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.m-comp-nav__btn {
  background: #f1f3f5;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 14px;
  min-height: 36px;
  cursor: pointer;
}

.m-comp-nav__btn:disabled { opacity: 0.35; cursor: not-allowed; }

.m-comp-nav__label {
  flex: 1;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 6px 8px;
}

.m-comp-nav__add {
  background: var(--m-orange, #ff7e2e);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 16px;
  font-weight: 700;
  min-height: 36px;
  cursor: pointer;
}

.m-comp-nav__remove {
  background: #fee2e2;
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 14px;
  min-height: 36px;
  cursor: pointer;
}

/* ── Allergeni chips ────────────────────────────────────────────────────────── */
.m-allergen-group__label {
  font-size: 10px;
  font-weight: 700;
  color: var(--m-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 5px;
}

.m-allergen-chips { display: flex; flex-wrap: wrap; gap: 5px; }

.m-allergen-chip {
  border-radius: 20px;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 600;
}

.m-allergen-chip--present { background: #fff3cd; color: #856404; }
.m-allergen-chip--cross   { background: #f1f3f5; color: #495057; }

/* ── Nazione Serving sub-accordion ─────────────────────────────────────────── */
.m-nazione-serving { margin-bottom: 4px; }

.m-nazione-serving__header {
  width: 100%;
  background: #f8f9fa;
  border: none;
  border-radius: 6px;
  padding: 8px 10px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  min-height: 40px;
}

.m-nazione-serving__body { padding: 8px 0 4px; }

/* ── Field grid ─────────────────────────────────────────────────────────────── */
.m-field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.m-field { display: flex; flex-direction: column; gap: 3px; }

.m-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--m-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.m-toggle-liquid {
  background: none;
  border: none;
  font-size: 11px;
  color: var(--m-text-muted);
  padding: 6px 0 0;
  cursor: pointer;
}

.m-empty-text {
  font-size: 12px;
  color: var(--m-text-muted);
  text-align: center;
  padding: 8px 0;
}

/* ── RiepilogoSection ───────────────────────────────────────────────────────── */
.m-riepilogo-section { padding: 0 10px; }

.m-rtab-row { display: flex; gap: 0; margin-bottom: 8px; border: 1px solid rgba(12,19,38,0.10); border-radius: 8px; overflow: hidden; }

.m-rtab-btn { flex: 1; background: #fff; border: none; padding: 8px; font-size: 12px; font-weight: 500; cursor: pointer; min-height: 36px; }

.m-rtab-btn--active { background: #0c1326; color: #fff; font-weight: 700; }

.m-riep-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid rgba(12,19,38,0.06); font-size: 12px; }

.m-riep-row__name { color: var(--m-text); }
.m-riep-row__meta { color: var(--m-text-muted); font-size: 11px; }

.m-riep-kpi { display: flex; gap: 8px; margin-top: 10px; }

.m-riep-kpi__item { flex: 1; background: #fff; border: 1px solid rgba(12,19,38,0.10); border-radius: 8px; padding: 8px; text-align: center; }

.m-riep-kpi__label { font-size: 9px; font-weight: 700; color: var(--m-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

.m-riep-kpi__value { font-size: 14px; font-weight: 700; color: var(--m-orange, #ff7e2e); margin-top: 2px; }
```

- [ ] **Step 2: Commit CSS**

```bash
git add src/styles/mobile.css
git commit -m "style(mobile-nut): accordion, smart import hero, comp-nav, allergen chips"
```

---

## Task 4: TabelleTab — pill selector e serving inline

**File:** `src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx` → rinominato in `TabelleTab.tsx`

- [ ] **Step 1: Copia TabellaTab.tsx → TabelleTab.tsx e aggiorna l'export**

```bash
cp src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx \
   src/calculators/NutrizionaleCalc/mobile/TabelleTab.tsx
```

Sostituisci `export function TabellaTab` con `export function TabelleTab` nel nuovo file.

- [ ] **Step 2: Sostituisci il region chip bar con pill selector**

Cerca il blocco della region chip bar (le 5 RegionChip/SegmentedControl per nazione). Sostituisci con:
```tsx
{/* Pill selector nazioni */}
<div className="m-pill-row">
    {(['UE', 'USA', 'Canada', 'Australia', 'Arabi'] as Region[]).map(r => (
        <button
            key={r}
            type="button"
            className={`m-pill${selectedRegion === r ? ' m-pill--active' : ''}`}
            onClick={() => setSelectedRegion(r)}
        >
            {r === 'UE' ? '🇪🇺 UE'
             : r === 'USA' ? '🇺🇸 USA'
             : r === 'Canada' ? '🇨🇦 CA'
             : r === 'Australia' ? '🇦🇺 AU'
             : '🌙 AR'}
        </button>
    ))}
</div>
```

- [ ] **Step 3: Rendi le serving size collapsibili inline**

Nel blocco di ogni nazione, wrappa la ServingSection con uno stato locale collapsibile. Esempio per UE:
```tsx
{/* Serving sizes collapsibili per UE */}
{servingOpen ? (
    <div className="m-serving-inline">
        <button type="button" className="m-serving-inline__toggle" onClick={() => setServingOpen(false)}>
            📐 Porzioni ▲
        </button>
        {/* <ServingSection ...> già esistente */}
    </div>
) : (
    <button type="button" className="m-serving-inline__toggle" onClick={() => setServingOpen(true)}>
        📐 Porzioni ▼
    </button>
)}
```

Nota: `servingOpen` è già nello state di TabellaTab — mantienilo, cambia solo il markup.

- [ ] **Step 4: Aggiungi CSS pill e serving inline in `mobile.css`**

```css
/* ── TabelleTab — Pill selector ─────────────────────────────────────────────── */
.m-pill-row {
  display: flex;
  gap: 6px;
  padding: 10px 10px 6px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.m-pill-row::-webkit-scrollbar { display: none; }

.m-pill {
  flex-shrink: 0;
  background: #f1f3f5;
  border: none;
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #555;
  cursor: pointer;
  min-height: 36px;
  white-space: nowrap;
}

.m-pill--active {
  background: #0c1326;
  color: #fff;
  font-weight: 700;
}

/* ── Serving inline ─────────────────────────────────────────────────────────── */
.m-serving-inline {
  margin: 0 10px 6px;
  background: #fff;
  border: 1px solid rgba(12,19,38,0.10);
  border-radius: var(--m-radius-md, 10px);
  padding: 10px 12px;
}

.m-serving-inline__toggle {
  width: 100%;
  background: none;
  border: 1px solid rgba(12,19,38,0.10);
  border-radius: 8px;
  margin: 0 10px 6px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  min-height: 40px;
  width: calc(100% - 20px);
}
```

- [ ] **Step 5: Commit TabelleTab**

```bash
git add src/calculators/NutrizionaleCalc/mobile/TabelleTab.tsx src/styles/mobile.css
git commit -m "feat(mobile-nut): TabelleTab con pill selector nazioni e serving collapsibili"
```

---

## Task 5: ArchivioTab — sezioni temporali

**File:** `src/calculators/NutrizionaleCalc/mobile/ArchivioTab.tsx`

- [ ] **Step 1: Aggiungi funzione di raggruppamento temporale**

Aggiungi prima del componente:
```typescript
type TimeGroup = 'oggi' | 'questo_mese' | 'piu_vecchi';

function getTimeGroup(isoDate: string): TimeGroup {
    const d = new Date(isoDate);
    const now = new Date();
    if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    ) return 'oggi';
    if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
    ) return 'questo_mese';
    return 'piu_vecchi';
}

const GROUP_LABELS: Record<TimeGroup, string> = {
    oggi: 'Recenti',
    questo_mese: 'Questo mese',
    piu_vecchi: 'Più vecchi',
};
```

- [ ] **Step 2: Scrivi test per `getTimeGroup`**

```typescript
// In fondo ad ArchivioTab.tsx (o file __tests__/getTimeGroup.test.ts):
if (import.meta.vitest) {
    const { describe, it, expect } = import.meta.vitest;
    describe('getTimeGroup', () => {
        it('oggi → oggi', () => {
            expect(getTimeGroup(new Date().toISOString())).toBe('oggi');
        });
        it('primo del mese corrente → questo_mese (se non oggi)', () => {
            const d = new Date();
            d.setDate(1);
            // se oggi è il 1, salta questo test
            if (d.getDate() !== new Date().getDate()) {
                expect(getTimeGroup(d.toISOString())).toBe('questo_mese');
            }
        });
        it('anno scorso → piu_vecchi', () => {
            const d = new Date();
            d.setFullYear(d.getFullYear() - 1);
            expect(getTimeGroup(d.toISOString())).toBe('piu_vecchi');
        });
    });
}
```

- [ ] **Step 3: Ragruppa e renderizza per sezione temporale**

Nel JSX, sostituisci il loop diretto degli items con raggruppamento:

```tsx
{/* Raggruppa per data */}
{(['oggi', 'questo_mese', 'piu_vecchi'] as TimeGroup[]).map(group => {
    const groupItems = filteredItems.filter(item => {
        const dateStr = (item as { createdAt?: string }).createdAt ?? '';
        return getTimeGroup(dateStr) === group;
    });
    if (groupItems.length === 0) return null;
    return (
        <React.Fragment key={group}>
            <div className="m-archive-section-label">{GROUP_LABELS[group]}</div>
            {groupItems.map(item => (
                /* card esistente per item — invariata */
                <div key={item.id} className="m-archive-card" /* ... */>
                    {/* ... markup esistente ... */}
                </div>
            ))}
        </React.Fragment>
    );
})}
```

Nota: `filteredItems` è l'array già filtrato per `query` (logica esistente).

- [ ] **Step 4: Aggiungi CSS section label**

```css
.m-archive-section-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--m-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 10px 3px;
}
```

- [ ] **Step 5: Commit ArchivioTab**

```bash
git add src/calculators/NutrizionaleCalc/mobile/ArchivioTab.tsx src/styles/mobile.css
git commit -m "feat(mobile-nut): ArchivioTab con sezioni temporali (Recenti/Questo mese/Più vecchi)"
```

---

## Task 6: Pulizia — elimina RiepilogoTab e aggiorna import

- [ ] **Step 1: Elimina `mobile/RiepilogoTab.tsx`**

```bash
git rm src/calculators/NutrizionaleCalc/mobile/RiepilogoTab.tsx
```

- [ ] **Step 2: Elimina `mobile/CalcoloTab.tsx`** (sostituita da EditorTab)

```bash
git rm src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx
```

- [ ] **Step 3: Elimina `mobile/TabellaTab.tsx`** (sostituita da TabelleTab)

```bash
git rm src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx
```

- [ ] **Step 4: Verifica che non rimangano import orfani**

```bash
grep -r "CalcoloTab\|TabellaTab\|RiepilogoTab" src/ --include="*.tsx" --include="*.ts"
```
Atteso: zero risultati.

- [ ] **Step 5: Commit pulizia**

```bash
git add -A
git commit -m "chore(mobile-nut): rimuovi CalcoloTab, TabellaTab, RiepilogoTab (sostituiti)"
```

---

## Task 7: Verifica finale

- [ ] **Step 1: TypeScript**

```bash
npx tsc -b
```
Atteso: zero errori.

- [ ] **Step 2: Lint**

```bash
npm run lint
```
Atteso: zero warning/errori.

- [ ] **Step 3: Test suite**

```bash
npm test
```
Atteso: tutti i test passano, nessuna regressione.

- [ ] **Step 4: Smoke test manuale**

Avvia il server: `npm run dev`

Verifica a mano su viewport 390px (iPhone 14):
1. Tab Editor: Smart Import hero visibile senza ingredienti → scompare dopo import
2. Accordion Prodotto & Pesi: si apre/chiude
3. Accordion Componenti: swipe navigator ‹/› funziona, + aggiunge componente
4. Accordion Porzioni: sub-sezione UE si apre con i 3 campi
5. Tab Tabelle: pill selector cambia nazione, tabella si aggiorna, serving collassabile
6. Tab Archivio: sezioni temporali visibili, carica/elimina funzionano
7. SmartImport modal si apre da hero e dall'EditorTab

- [ ] **Step 5: Commit finale**

```bash
git add -A
git commit -m "feat(mobile-nut): redesign completo 3-tab mobile (Editor/Tabelle/Archivio)"
```
