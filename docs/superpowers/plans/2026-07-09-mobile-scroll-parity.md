# Mobile Scroll + Desktop Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Trasformare la navigazione mobile da tab-switch a scroll continuo, e colmare i principali gap funzionali con il desktop.

**Architecture:** Render di tutte le sezioni in sequenza in un unico container scrollabile. Il tab bar in fondo usa `IntersectionObserver` per aggiornare la sezione attiva. Click su tab → `scrollIntoView`. Nessun nuovo file: tutto in `NutrizionaleCalcMobile.tsx` + `mobile.css`.

**Tech Stack:** React 18, TypeScript, CSS custom properties, IntersectionObserver API (nativo browser)

---

## Gap Desktop → Mobile (audit completo)

| Feature | Desktop | Mobile | Piano |
|---------|---------|--------|-------|
| Autosave | ✅ `useAutosave` | ❌ | Task 3 |
| Validazione save | ✅ ValidationError | ❌ | Task 3 |
| PDF qualità | ✅ `generateEtichettaPDF` | ⚠️ html2canvas | Task 4 |
| Browse ingredienti | ✅ `BrowseIngredientsModal` | ⚠️ search-only | fuori scope |
| Ingredient custom creation | ✅ form completo | ❌ | fuori scope |
| Scroll continuo tra sezioni | ❌ (split panel) | ❌ | Task 1 |
| Tab highlights su scroll | ❌ | ❌ | Task 1 |
| Serving sizes complete | ✅ tutte le regioni | ✅ | già ok |
| SmartImport | ✅ | ✅ | già ok |

---

## Files coinvolti

| File | Ruolo modifica |
|------|---------------|
| `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` | Architettura scroll: da `renderTab()` switch a sezioni sequenziali + refs + IntersectionObserver |
| `src/styles/mobile.css` | `.m-scroll-container`, `.m-section-anchor`, stili transizione sezione |
| `src/hooks/useAutosave.ts` | Già esiste — solo import nel mobile |

---

## Task 1: Scroll container + IntersectionObserver tab tracking

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`
- Modify: `src/styles/mobile.css`

- [ ] **Step 1.1: Aggiungi refs per ogni sezione in `NutrizionaleCalcMobile`**

Dentro `NutrizionaleCalcMobile`, dopo `const [activeTab, setActiveTab]`:

```tsx
const sectionRefs: Record<MobileTab, React.RefObject<HTMLDivElement>> = {
    ricetta:   React.useRef<HTMLDivElement>(null),
    riepilogo: React.useRef<HTMLDivElement>(null),
    mercati:   React.useRef<HTMLDivElement>(null),
    archivio:  React.useRef<HTMLDivElement>(null),
};
```

- [ ] **Step 1.2: Sostituisci `renderTab()` con render sequenziale**

Rimuovi la funzione `renderTab()` e la `key={activeTab}` div. Sostituisci il body del return con:

```tsx
return (
    <div style={{ minHeight: '100%', background: 'var(--m-bg)' }}>
        <div className="m-scroll-container">

            {/* ── Sezione 1: Ricetta ──────────────────────────── */}
            <div ref={sectionRefs.ricetta} data-section="ricetta" className="m-section-anchor">
                <CalcoloTab
                    form={form}
                    onChange={updateForm}
                    onGoToTabella={() => goToSection('mercati')}
                    db={db}
                    loadingDB={loadingDB}
                    dbError={dbError}
                    components={components}
                    onAddComponent={addComponent}
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
                />
            </div>

            {/* ── Sezione 2: Riepilogo ────────────────────────── */}
            <div ref={sectionRefs.riepilogo} data-section="riepilogo" className="m-section-anchor">
                <RiepilogoTab
                    components={components}
                    pesoFinito={parseFloat(form.pesoFinito_g) || 0}
                    presentAllergens={presentAllergens}
                    crossAllergens={crossAllergens}
                />
            </div>

            {/* ── Sezione 3: Mercati ──────────────────────────── */}
            <div ref={sectionRefs.mercati} data-section="mercati" className="m-section-anchor">
                <TabellaTab
                    calcResult={calcResult}
                    form={form}
                    onChange={updateForm}
                    onSave={(region) => {
                        archive.saveItem(
                            form.denominazione || 'Senza nome',
                            { denominazione: form.denominazione, porzione_g: parseFloat(form.porzione_g) || 100, region, calcResult, form, components }
                        );
                    }}
                    onExportPDF={handleExportPDF}
                    hasIngredients={hasIngredients}
                    presentAllergens={presentAllergens}
                    crossAllergens={crossAllergens}
                />
            </div>

            {/* ── Sezione 4: Archivio ─────────────────────────── */}
            <div ref={sectionRefs.archivio} data-section="archivio" className="m-section-anchor">
                <ArchivioTab
                    items={archive.items}
                    onLoad={(entry) => { loadFromArchive(entry); goToSection('ricetta'); }}
                    onDelete={(id) => archive.deleteItem(id)}
                />
            </div>

        </div>

        {showSmartImport && (
            <SmartImportModal
                db={db}
                onClose={() => setShowSmartImport(false)}
                onImport={handleSmartImportMobile}
            />
        )}

        {/* Bottom Tab Bar */}
        <nav className="m-tabbar" aria-label="Navigazione principale">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    className="m-tabbar__item"
                    onClick={() => goToSection(tab.id)}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                    <span className={`m-tabbar__icon${activeTab === tab.id ? ' m-tabbar__icon--active' : ''}`}>
                        {tab.icon}
                    </span>
                    <span className={`m-tabbar__label${activeTab === tab.id ? ' m-tabbar__label--active' : ''}`}>
                        {tab.label}
                    </span>
                </button>
            ))}
        </nav>
    </div>
);
```

- [ ] **Step 1.3: Aggiungi `goToSection` e IntersectionObserver**

Prima del return, aggiungi:

```tsx
const goToSection = (tab: MobileTab) => {
    setActiveTab(tab);
    sectionRefs[tab].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            // Prendi l'entry con il maggiore intersection ratio
            const visible = entries
                .filter(e => e.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible) {
                const section = visible.target.getAttribute('data-section') as MobileTab;
                if (section) setActiveTab(section);
            }
        },
        {
            threshold: [0.2, 0.5],
            rootMargin: '0px 0px -30% 0px',
        }
    );
    Object.values(sectionRefs).forEach(ref => {
        if (ref.current) observer.observe(ref.current);
    });
    return () => observer.disconnect();
// ponytail: sectionRefs object stable (defined outside useEffect scope), no deps needed
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 1.4: Rimuovi `key={activeTab}` e animazione m-tab-enter**

Il render sequenziale non ha bisogno di re-mount animato. Rimuovi `key={activeTab}` e `className="m-tab-content m-tab-enter"` dal container.

- [ ] **Step 1.5: Aggiungi CSS per scroll container**

In `src/styles/mobile.css`:

```css
/* ── Scroll container (one-page navigation) ─────────────────────────────── */
.m-scroll-container {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* lascia spazio per tabbar + safe area */
  padding-bottom: calc(var(--m-tabbar-h) + env(safe-area-inset-bottom, 0px) + 16px);
  scroll-behavior: smooth;
}

/* Ogni sezione ha altezza minima per essere "visibile" all'observer */
.m-section-anchor {
  min-height: 40vh;
  /* separatore visivo tra sezioni */
  border-top: 3px solid var(--m-border);
  padding-top: 4px;
}
/* Prima sezione senza bordo top */
.m-section-anchor:first-child {
  border-top: none;
  padding-top: 0;
}
```

- [ ] **Step 1.6: Verifica che `m-cta-bar` (CalcoloTab "Vai a Mercati") usi `goToSection`**

In `CalcoloTab.tsx`, il prop `onGoToTabella` ora chiama `goToSection('mercati')` — già corretto dal wiring in step 1.2.

**Verifica manuale:** Scroll da Ricetta verso il basso → il tab "Riepilogo" si attiva → continua → "Mercati". Click "Archivio" → scroll animato all'ultima sezione.

- [ ] **Step 1.7: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx src/styles/mobile.css
git commit -m "feat(mobile): scroll continuo tra sezioni + IntersectionObserver tab tracking"
```

---

## Task 2: Separatori visivi tra sezioni + scroll hint

**Problema:** Nell'approccio one-page, l'utente deve capire che le sezioni sono scorrevoli e dove finisce una e inizia l'altra.

**Files:**
- Modify: `src/styles/mobile.css`
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`

- [ ] **Step 2.1: Intestazione sezione sticky per ogni sezione**

Aggiungi un header sticky a ogni sezione in `NutrizionaleCalcMobile` (dentro il div `.m-section-anchor`):

```tsx
// Esempio per Ricetta — ripeti per ogni sezione
<div ref={sectionRefs.ricetta} data-section="ricetta" className="m-section-anchor">
    <div className="m-section-header-sticky">
        <Salad size={14} style={{ color: 'var(--m-orange)' }} />
        <span>Ricetta</span>
    </div>
    <CalcoloTab ... />
</div>
```

I 4 header usano le stesse icone del tab bar: `Salad`, `ClipboardList`, `Globe`, `Archive`.

- [ ] **Step 2.2: CSS header sticky**

```css
/* ── Section sticky header ───────────────────────────────────────────────── */
.m-section-header-sticky {
  position: sticky;
  top: 0;
  z-index: 9;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: var(--m-bg);
  border-bottom: 1px solid var(--m-border-light);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--m-text-muted);
}
```

- [ ] **Step 2.3: Scroll hint sul primo caricamento (una sola volta)**

In `NutrizionaleCalcMobile`, dopo il DB loading, se `!loadingDB && !hasIngredients`:

```tsx
// nessun hint extra — l'intestazione sticky e il bordo sezione sono hint sufficienti
// ponytail: skip scroll-hint animato, il pattern è già chiaro
```

- [ ] **Step 2.4: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx src/styles/mobile.css
git commit -m "feat(mobile): sticky section headers per navigazione one-page"
```

---

## Task 3: Autosave mobile (parity con desktop)

**Problema:** Il desktop ha `useAutosave` — su mobile si perde tutto se si chiude il browser.

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`

- [ ] **Step 3.1: Verifica che `useAutosave` esista**

```bash
cat src/hooks/useAutosave.ts | head -20
```

Deve esistere ed essere compatibile con il tipo `{ form, components }`.

- [ ] **Step 3.2: Aggiungi autosave in `NutrizionaleCalcMobile`**

```tsx
import { useAutosave } from '../../hooks/useAutosave';

// Dentro NutrizionaleCalcMobile, dopo i useState:
const AUTOSAVE_KEY = 'nut_mobile_autosave_v1';
useAutosave(AUTOSAVE_KEY, { form, components }, 2000); // salva ogni 2s di inattività
```

- [ ] **Step 3.3: Ripristino al mount (se draft autosave presente)**

Prima del return, dopo il `useEffect` del DB:

```tsx
// Ripristino autosave (solo se non c'è già un bridge desktop)
useEffect(() => {
    const draft = readBridge();
    if (draft?.source === 'desktop') return; // bridge ha precedenza
    try {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (!saved) return;
        const { form: savedForm, components: savedComps } = JSON.parse(saved);
        if (savedComps?.some((c: MobileComponent) => c.rows.length > 0)) {
            setForm(savedForm);
            setComponents(savedComps);
            toast.success('Bozza ripristinata automaticamente.');
        }
    } catch {}
// ponytail: esegui solo al mount
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 3.4: Verifica che `useAutosave` non abbia dipendenza da `useToast`**

```bash
grep -n "useToast\|import" src/hooks/useAutosave.ts
```

Se non ha toast, il log in step 3.3 è solo `console.info('Draft ripristinata')`.

- [ ] **Step 3.5: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx
git commit -m "feat(mobile): autosave bozza su localStorage, ripristino al mount"
```

---

## Task 4: PDF qualità (sostituisci html2canvas con generateEtichettaPDF)

**Problema:** Mobile usa `html2canvas` per il PDF — qualità bassa, dipende dal DOM. Desktop usa `generateEtichettaPDF` (jsPDF diretto).

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx`

- [ ] **Step 4.1: Verifica firma di `generateEtichettaPDF`**

```bash
grep -n "export function generateEtichettaPDF\|export async" src/utils/pdfGenerator.ts | head -5
```

Annota la firma: parametri attesi (region, calcResult, form, ...).

- [ ] **Step 4.2: Sostituisci `handleExportPDF` in `NutrizionaleCalcMobile`**

Rimuovi l'import `html2canvas` e sostituisci `handleExportPDF`:

```tsx
import { generateEtichettaPDF } from '../../utils/pdfGenerator';

// Rimuovi: import html2canvas from 'html2canvas';
// Rimuovi: import jsPDF from 'jspdf'; (se usato solo qui)

const handleExportPDF = useCallback(async (region: string) => {
    try {
        await generateEtichettaPDF(region, calcResult, form, components);
    } catch (e) {
        console.error('PDF export failed', e);
        toast.error('Errore durante l\'esportazione.');
    }
}, [calcResult, form, components, toast]);
```

⚠️ **Adatta la firma al tipo reale** trovato in step 4.1.

- [ ] **Step 4.3: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx
git commit -m "feat(mobile): usa generateEtichettaPDF al posto di html2canvas"
```

---

## Task 5: Validazione al salvataggio (parity desktop)

**Problema:** Su mobile si può salvare senza denominazione o ingredienti senza errori visivi.

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx`

- [ ] **Step 5.1: Aggiungi check in `handleSave` (già esiste logica parziale)**

Nella funzione `handleSave` in `TabellaTab.tsx` (attuale):

```tsx
const handleSave = () => {
    if (!selectedRegion) { showNotice('error', 'Seleziona prima una regione.'); return; }
    if (!form.denominazione.trim()) { showNotice('error', 'Inserisci la denominazione nel tab Calcolo.'); return; }
    onSave(selectedRegion);
    showNotice('success', 'Calcolo salvato in archivio.');
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 450);
};
```

Aggiungere PRIMA di `onSave`:

```tsx
if (!hasIngredients) { showNotice('error', 'Aggiungi almeno un ingrediente prima di salvare.'); return; }
const porzione = nf(form.ue_porzione || form.porzione_g);
if (porzione <= 0) { showNotice('error', 'Imposta una porzione valida (> 0 g).'); return; }
```

- [ ] **Step 5.2: Commit**

```bash
git add src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx
git commit -m "fix(mobile): validazione save — ingredienti e porzione obbligatori"
```

---

## Scope fuori piano (YAGNI)

- `BrowseIngredientsModal` mobile: il modal di ricerca esistente è sufficiente per mobile
- Custom ingredient creation su mobile: form complesso, fuori scope
- Animazioni scroll (parallax, fade): tool professionale, sobrietà > effetti
- Split-panel su tablet: nessuna richiesta esplicita

---

## Ordine consigliato di esecuzione

```
Task 1 → Task 2 → Task 5 → Task 3 → Task 4
```

Task 3 e 4 dipendono da hook/utility esistenti — verificare le firme prima di implementare.
