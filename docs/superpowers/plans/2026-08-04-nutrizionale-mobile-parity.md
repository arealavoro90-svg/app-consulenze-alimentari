# NutrizionaleCalc — Mobile Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allineare NutrizionaleCalcMobile al desktop (feature parity + CSS token unificati) per il lancio commerciale di settembre 2026.

**Architecture:** Mantieni i due componenti separati (NutrizionaleCalc.tsx + NutrizionaleCalcMobile.tsx). Estrai componenti condivisi (InfoTooltip, ExportOptionsModal), aggiungi i flag mancanti alle UI mobile, rimuovi i token CSS duplicati da mobile.css (già mappati in unified-tokens.css).

**Tech Stack:** React 19, TypeScript, Vite, Tailwind 4 (solo dove già usato), CSS custom properties, html2canvas, lucide-react

---

## File Map

| File | Azione | Responsabilità |
|---|---|---|
| `src/calculators/NutrizionaleCalc/InfoTooltip.tsx` | **CREA** | Componente InfoTooltip estratto da NutrizionaleCalc.tsx |
| `src/calculators/NutrizionaleCalc/ExportOptionsModal.tsx` | **CREA** | ExportOptionsModal estratto da TabellaTab.tsx |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` | **MODIFICA** | Rimuovi InfoTooltip locale, importa da InfoTooltip.tsx |
| `src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx` | **MODIFICA** | Rimuovi ExportOptionsModal inline, importa da ExportOptionsModal.tsx; aggiungi toggle isLiquid |
| `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx` | **MODIFICA** | Aggiungi postCottura/acquaAggiunta in RecipeRowItem; aggiungi InfoTooltip e ValidationError |
| `src/styles/mobile.css` | **MODIFICA** | Rimuovi token --m-* duplicati (già in unified-tokens.css) |
| `src/styles/unified-tokens.css` | **MODIFICA** | Aggiungi `--m-text-muted` al mapping |

---

## Task 1: Estrai InfoTooltip in file condiviso

**Files:**
- Create: `src/calculators/NutrizionaleCalc/InfoTooltip.tsx`
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 1.1: Crea InfoTooltip.tsx**

Copia il componente da `NutrizionaleCalc.tsx:94-171` in un file nuovo. Le costanti `TOOLTIP_W` e `TOOLTIP_MARGIN` sono interne al file.

```tsx
// src/calculators/NutrizionaleCalc/InfoTooltip.tsx
import React, { useState, useRef, useEffect } from 'react';

const TOOLTIP_W = 230;
const TOOLTIP_MARGIN = 8;

export function InfoTooltip({ text }: { text: string }) {
    const [visible, setVisible] = useState(false);
    const [pinned, setPinned] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    const computePos = () => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
        left = Math.max(TOOLTIP_MARGIN, Math.min(left, vw - TOOLTIP_W - TOOLTIP_MARGIN));
        const below = rect.top < 120;
        const top = below ? rect.bottom + 6 : rect.top - 8;
        setPos({ top, left, below });
    };

    const handleMouseEnter = () => { computePos(); setVisible(true); };
    const handleMouseLeave = () => { if (!pinned) setVisible(false); };
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (pinned) { setPinned(false); setVisible(false); }
        else { computePos(); setPinned(true); setVisible(true); }
    };

    useEffect(() => {
        if (!pinned) return;
        const close = () => { setPinned(false); setVisible(false); };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [pinned]);

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}>
            <button
                ref={btnRef}
                type="button"
                title={text}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                style={{
                    background: 'none', border: '2px solid var(--color-orange)', cursor: 'pointer', padding: 0,
                    width: 18, height: 18, borderRadius: '50%',
                    fontSize: 11, fontWeight: 700, color: 'var(--color-orange)', lineHeight: 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}
            >i</button>
            {visible && pos && (
                <span style={{
                    position: 'fixed',
                    top: pos.top,
                    left: pos.left,
                    transform: pos.below ? 'none' : 'translateY(-100%)',
                    background: 'var(--color-navy)', color: '#fff', fontSize: 11.5, lineHeight: 1.5,
                    padding: '7px 11px', borderRadius: 'var(--radius-sm)', whiteSpace: 'normal',
                    width: TOOLTIP_W, zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                }}>
                    {text}
                </span>
            )}
        </span>
    );
}
```

- [ ] **Step 1.2: Aggiorna NutrizionaleCalc.tsx — sostituisci local InfoTooltip con import**

In `NutrizionaleCalc.tsx`:
- Aggiungi import: `import { InfoTooltip } from './InfoTooltip';`
- Rimuovi la funzione locale `InfoTooltip` (righe 94-171) e le costanti `TOOLTIP_W`/`TOOLTIP_MARGIN` (righe 91-92)

- [ ] **Step 1.3: Verifica build**

```bash
cd /Users/novanta/Desktop/APP/App_prova
npx tsc -b && npm run lint
```

Expected: 0 errori, 0 warning nuovi.

- [ ] **Step 1.4: Commit**

```bash
git add src/calculators/NutrizionaleCalc/InfoTooltip.tsx \
        src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "refactor: extract InfoTooltip to shared file"
```

---

## Task 2: Estrai ExportOptionsModal in file condiviso

**Files:**
- Create: `src/calculators/NutrizionaleCalc/ExportOptionsModal.tsx`
- Modify: `src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx`

- [ ] **Step 2.1: Individua il blocco da estrarre in TabellaTab.tsx**

Cerca in `TabellaTab.tsx`:
- Interfaccia `ExportFormat` (locale) — da portare nel nuovo file
- Costante `DEFAULT_EXPORT_FORMAT` — da portare nel nuovo file  
- Funzione `SegmentedControl` — da portare nel nuovo file
- Funzione `ServingField` — rimane in TabellaTab (usata solo lì per le porzioni)
- Funzione `ExportOptionsModal` — da portare nel nuovo file

- [ ] **Step 2.2: Crea ExportOptionsModal.tsx**

Il file deve esportare: `ExportFormat`, `DEFAULT_EXPORT_FORMAT`, `ExportOptionsModal`.
`SegmentedControl` può essere locale al file (usata solo da ExportOptionsModal).

```tsx
// src/calculators/NutrizionaleCalc/ExportOptionsModal.tsx
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { TabUE } from './TabUE';
import { TabUSA } from './TabUSA';
import { TabCanada } from './TabCanada';
import { TabAustralia } from './TabAustralia';
import { TabArabi } from './TabArabi';
import type { EUSubTab } from './TabUE';
import type { USAServingRef, USAMeasure } from './TabUSA';

type Region = 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';
type SubTab = 'verticale' | 'orizzontale' | 'lineare';

export interface ExportFormat {
    subTab: SubTab;
    euSubTab: EUSubTab;
    servingRef: USAServingRef;
    measure: USAMeasure;
}

export const DEFAULT_EXPORT_FORMAT: ExportFormat = {
    subTab: 'verticale', euSubTab: '100g', servingRef: 'serving', measure: 'g',
};

// ─── SegmentedControl (locale a questo file) ──────────────────────────────────
function SegmentedControl<T extends string>({
    label, options, value, onChange, inline = false,
}: {
    label: string;
    options: { v: T; label: string; disabled?: boolean }[];
    value: T;
    onChange: (v: T) => void;
    inline?: boolean;
}) {
    return (
        <div style={inline
            ? { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
            : { marginBottom: 10 }}>
            <span className="m-segmented__label" style={inline ? { marginBottom: 0, flexShrink: 0 } : undefined}>{label}</span>
            <div className="m-segmented">
                {options.map(o => (
                    <button
                        key={o.v}
                        type="button"
                        disabled={o.disabled}
                        className={`m-segmented__btn${value === o.v ? ' m-segmented__btn--active' : ''}`}
                        title={o.disabled ? 'Inserisci prima il peso corrispondente nelle porzioni' : undefined}
                        onClick={() => onChange(o.v)}
                        aria-pressed={value === o.v}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

interface Props {
    region: Region;
    showLayout: boolean;
    showColonne: boolean;
    showRiferimento: boolean;
    showUnita: boolean;
    ue: { porzione?: number; confezione?: number; pezzo?: number };
    nation: { confezione?: number; cup?: number; cucchiaio?: number; pezzo?: number };
    productName: string;
    renderPreview: (format: ExportFormat) => React.ReactNode;
    onClose: () => void;
}

export function ExportOptionsModal({
    region, showLayout, showColonne, showRiferimento, showUnita,
    ue, nation, productName, renderPreview, onClose,
}: Props) {
    const [subTab, setSubTab] = useState<SubTab>('verticale');
    const [euSubTab, setEuSubTab] = useState<EUSubTab>('100g');
    const [servingRef, setServingRef] = useState<USAServingRef>('serving');
    const [measure, setMeasure] = useState<USAMeasure>('g');
    const [downloading, setDownloading] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        const container = previewRef.current;
        if (!container) return;
        const target = container.querySelector<HTMLElement>('[data-table-export]') ?? container;
        setDownloading(true);
        setExportError(null);

        const overflowFixes: { el: HTMLElement; overflowX: string; overflowY: string; scrollLeft: number }[] = [];
        let ancestor: HTMLElement | null = target.parentElement;
        while (ancestor && ancestor !== document.body) {
            const cs = getComputedStyle(ancestor);
            if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
                overflowFixes.push({ el: ancestor, overflowX: ancestor.style.overflowX, overflowY: ancestor.style.overflowY, scrollLeft: ancestor.scrollLeft });
                ancestor.style.overflowX = 'visible';
                ancestor.style.overflowY = 'visible';
                ancestor.scrollLeft = 0;
            }
            ancestor = ancestor.parentElement;
        }

        try {
            const canvas = await html2canvas(target, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                onclone: (clonedDoc: Document, el: HTMLElement) => {
                    const walker = clonedDoc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                    const nodes: Text[] = [];
                    let n: Node | null;
                    while ((n = walker.nextNode())) nodes.push(n as Text);
                    nodes.forEach(tn => {
                        const span = clonedDoc.createElement('span');
                        span.textContent = tn.textContent;
                        tn.parentNode?.replaceChild(span, tn);
                    });
                },
            });
            const layoutLabels: Record<SubTab, string> = { verticale: 'Verticale', orizzontale: 'Orizzontale', lineare: 'Lineare' };
            const euLabels: Record<EUSubTab, string> = { '100g': 'Per 100g', uv: 'UV', porzione: 'Porzione', pezzo: 'Pezzo' };
            const formato = (region === 'USA' || region === 'Canada') ? layoutLabels[subTab]
                : region === 'UE' ? euLabels[euSubTab]
                : '';
            const baseName = productName || 'tabella';
            const fileName = formato
                ? `${baseName} - tabella ${region} - ${formato}.png`
                : `${baseName} - tabella ${region}.png`;
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('PNG Export error:', e);
            setExportError("Errore durante l'esportazione della tabella in PNG.");
        } finally {
            overflowFixes.forEach(({ el, overflowX, overflowY, scrollLeft }) => {
                el.style.overflowX = overflowX;
                el.style.overflowY = overflowY;
                el.scrollLeft = scrollLeft;
            });
            setDownloading(false);
        }
    };

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Scarica tabella ${region}`}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(12,19,38,0.55)', zIndex: 9999,
                display: 'flex', alignItems: 'flex-end',
            }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                width: '100%', background: 'var(--m-surface, #fff)',
                borderRadius: '14px 14px 0 0', padding: '16px 16px 32px',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--m-text)' }}>Opzioni esportazione — {region}</span>
                    <button type="button" onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--m-text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                {showLayout && (
                    <SegmentedControl<SubTab>
                        label="Layout"
                        options={[
                            { v: 'verticale', label: 'Verticale' },
                            { v: 'orizzontale', label: 'Orizzontale' },
                            { v: 'lineare', label: 'Lineare' },
                        ]}
                        value={subTab} onChange={setSubTab}
                    />
                )}
                {showColonne && (
                    <SegmentedControl<EUSubTab>
                        label="Colonne"
                        options={[
                            { v: '100g', label: 'per 100g' },
                            { v: 'porzione', label: 'Porzione', disabled: ue.porzione == null },
                            { v: 'uv', label: 'Confezione', disabled: ue.confezione == null },
                            { v: 'pezzo', label: 'Pezzo', disabled: ue.pezzo == null },
                        ]}
                        value={euSubTab} onChange={setEuSubTab}
                    />
                )}
                {showRiferimento && (
                    <SegmentedControl<USAServingRef>
                        label="Riferimento"
                        options={[
                            { v: 'serving', label: 'Porzione' },
                            { v: 'confezione', label: 'Confezione', disabled: !nation.confezione },
                        ]}
                        value={servingRef} onChange={setServingRef}
                    />
                )}
                {showUnita && (
                    <SegmentedControl<USAMeasure>
                        label="Unità"
                        options={[
                            { v: 'g', label: 'g' },
                            { v: 'tazze', label: 'Tazze', disabled: !nation.cup },
                            { v: 'cucchiai', label: 'Cucchiai', disabled: !nation.cucchiaio },
                            { v: 'pezzi', label: 'Pezzi', disabled: !nation.pezzo },
                        ]}
                        value={measure} onChange={setMeasure}
                    />
                )}

                <div
                    ref={previewRef}
                    style={{
                        border: '1px solid var(--color-border)', borderRadius: 8,
                        padding: 12, marginTop: 8, overflowX: 'auto',
                        display: 'flex', justifyContent: 'center', background: '#fff',
                    }}
                >
                    {renderPreview({ subTab, euSubTab, servingRef, measure })}
                </div>

                {exportError && (
                    <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '8px 0 0' }}>{exportError}</p>
                )}

                <button
                    type="button"
                    className="m-btn m-btn--accent"
                    style={{ width: '100%', marginTop: 10 }}
                    disabled={downloading}
                    onClick={handleDownload}
                >
                    {downloading ? 'Generazione…' : 'Scarica PNG'}
                </button>
            </div>
        </div>,
        document.body
    );
}
```

- [ ] **Step 2.3: Aggiorna TabellaTab.tsx — rimuovi inline e importa**

In `TabellaTab.tsx`:
1. Aggiungi import: `import { ExportOptionsModal, DEFAULT_EXPORT_FORMAT, type ExportFormat } from '../ExportOptionsModal';`
2. Rimuovi dal file: la funzione `SegmentedControl`, l'interfaccia `ExportFormat` locale, la costante `DEFAULT_EXPORT_FORMAT`, la funzione `ExportOptionsModal` (tutto il blocco ~righe 41-401)
3. Verifica che l'import di `createPortal` da `react-dom` sia rimosso (ora in ExportOptionsModal.tsx)
4. Verifica che gli import di `X` e `html2canvas` siano rimossi (ora in ExportOptionsModal.tsx)

- [ ] **Step 2.4: Verifica build**

```bash
cd /Users/novanta/Desktop/APP/App_prova
npx tsc -b && npm run lint
```

Expected: 0 errori.

- [ ] **Step 2.5: Commit**

```bash
git add src/calculators/NutrizionaleCalc/ExportOptionsModal.tsx \
        src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx
git commit -m "refactor: extract ExportOptionsModal from TabellaTab to shared file"
```

---

## Task 3: isLiquid toggle in TabellaTab (mobile)

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx`

**Contesto:** `isLiquid` è già in `useState` a riga ~423 e passato a `calcClaims`. Manca solo il toggle UI.

- [ ] **Step 3.1: Aggiungi toggle isLiquid in TabellaTab.tsx**

Trova il blocco del chip-bar regioni (cerca `m-region-tabs` in TabellaTab.tsx). Subito DOPO la chip-bar e PRIMA del blocco `{!hasData && ...}`, aggiungi:

```tsx
{/* Toggle prodotto liquido — impatta soglie claim (EU Reg. 2006/1924 Allegato) */}
{hasData && (
    <label style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 16px', fontSize: 12, cursor: 'pointer',
        color: 'var(--m-text-muted)',
    }}>
        <input
            type="checkbox"
            checked={isLiquid}
            onChange={e => setIsLiquid(e.target.checked)}
            style={{ accentColor: 'var(--m-orange, #ff7e2e)', width: 15, height: 15 }}
        />
        Prodotto liquido <span style={{ color: 'var(--m-text-faint)', fontSize: 11 }}>(cambia soglie claim)</span>
    </label>
)}
```

- [ ] **Step 3.2: Verifica build**

```bash
npx tsc -b && npm run lint
```

- [ ] **Step 3.3: Commit**

```bash
git add src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx
git commit -m "feat(mobile): add isLiquid toggle in TabellaTab for claim thresholds"
```

---

## Task 4: postCottura + acquaAggiunta in CalcoloTab (mobile)

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx`

**Contesto:** `postCottura?: boolean` e `acquaAggiunta?: boolean` esistono già in `RecipeRow` (engine riga 47-48). `onUpdate(compId, row.id, patch)` li gestisce già. Mancano solo i checkbox nel blocco espanso di `RecipeRowItem`.

- [ ] **Step 4.1: Aggiungi checkbox nel blocco `{expanded && ...}` di RecipeRowItem**

In `CalcoloTab.tsx`, nella funzione `RecipeRowItem`, trova il blocco `{expanded && (...)` (il div con `grid-template-columns: '1fr 1fr'`). Alla fine del grid, prima della chiusura del div, aggiungi:

```tsx
{(row.ing.alcol != null && Number(row.ing.alcol) > 0) && (
    <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--color-text)' }}>
            <input
                type="checkbox"
                checked={!!row.postCottura}
                onChange={() => onUpdate(compId, row.id, { postCottura: !row.postCottura })}
                style={{ accentColor: 'var(--color-orange)' }}
            />
            <span>Post-cottura <span style={{ color: 'var(--color-text-muted)' }}>(alcol non evapora)</span></span>
        </label>
    </div>
)}
{(row.ing.acqua != null && Number(row.ing.acqua) > 90) && (
    <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--color-text)' }}>
            <input
                type="checkbox"
                checked={!!row.acquaAggiunta}
                onChange={() => onUpdate(compId, row.id, { acquaAggiunta: !row.acquaAggiunta })}
                style={{ accentColor: 'var(--color-orange)' }}
            />
            <span>Acqua aggiunta <span style={{ color: 'var(--color-text-muted)' }}>(evapora dopo alcol)</span></span>
        </label>
    </div>
)}
```

- [ ] **Step 4.2: Verifica build**

```bash
npx tsc -b && npm run lint
```

- [ ] **Step 4.3: Commit**

```bash
git add src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx
git commit -m "feat(mobile): add postCottura and acquaAggiunta flags in RecipeRowItem"
```

---

## Task 5: InfoTooltip e ValidationError in CalcoloTab

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx`

**Contesto:** `InfoTooltip` ora in `../InfoTooltip`. `ValidationError` in `../../../components/ValidationError`. `validateFinishedWeight` e `validateIngredientQuantity` già in `../../../utils/validation`.

- [ ] **Step 5.1: Aggiungi imports in CalcoloTab.tsx**

Nella sezione import di `CalcoloTab.tsx`, aggiungi:

```tsx
import { InfoTooltip } from '../InfoTooltip';
import { ValidationError } from '../../../components/ValidationError';
import { validateFinishedWeight, validateIngredientQuantity } from '../../../utils/validation';
```

- [ ] **Step 5.2: Aggiungi state validazione in CalcoloTab**

Nella funzione `CalcoloTab` (il componente principale), aggiungi state per errori:

```tsx
const [pesoErrors, setPesoErrors] = useState<string[]>([]);
```

- [ ] **Step 5.3: Aggiungi InfoTooltip ai campi in CalcoloTab**

Trova il campo `pesoFinito_g`. Aggiungi `<InfoTooltip>` accanto alla sua label:

```tsx
// Cerca la label "Peso finito" e modifica la sua riga in questo modo:
<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <span className="m-field-label">Peso finito (g)</span>
    <InfoTooltip text="Peso del prodotto finito dopo cottura o lavorazione, in grammi per pezzo/unità. Influisce sul calcolo del QUID e sulla resa energetica effettiva." />
</div>
```

Trova il campo `specificGravity`. Aggiungi `<InfoTooltip>` accanto alla sua label:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <span className="m-field-label">Peso specifico</span>
    <InfoTooltip text="Peso specifico per prodotti liquidi (g/ml). Usato per convertire ml in grammi nelle porzioni FDA/FSANZ. Lascia vuoto per prodotti solidi. Esempio: acqua = 1, latte ≈ 1.03, olio ≈ 0.92." />
</div>
```

In `RecipeRowItem`, nel blocco espanso `{expanded && ...}`, aggiungi `<InfoTooltip>` nelle label di €/kg e Resa:

```tsx
// label €/kg:
<label className="ing-field-label" htmlFor={`eur-${row.id}`}>€/kg <InfoTooltip text="Costo dell'ingrediente per kg, IVA esclusa. Opzionale: se omesso, il costo non viene calcolato." /></label>

// label Resa:
<label className="ing-field-label" htmlFor={`resa-${row.id}`}>Resa dopo cottura (%) <InfoTooltip text="Percentuale di peso rimanente dopo cottura. Es: 80% = 100g crudi → 80g cotti. Lascia 100 se non c'è perdita." /></label>
```

- [ ] **Step 5.4: Aggiungi ValidationError sotto pesoFinito_g**

Trova l'input `pesoFinito_g` in `CalcoloTab`. Subito dopo l'input, aggiungi:

```tsx
<ValidationError
    message={pesoErrors[0]}
    visible={pesoErrors.length > 0}
    type="warning"
/>
```

E sull'`onChange` dell'input `pesoFinito_g`:

```tsx
onChange={e => {
    onChange({ pesoFinito_g: e.target.value });
    const errs = validateFinishedWeight(e.target.value);
    setPesoErrors(errs);
}}
```

- [ ] **Step 5.5: Verifica build**

```bash
npx tsc -b && npm run lint
```

Se `validateFinishedWeight` restituisce `string[]` o `string | null`, adatta `pesoErrors` al tipo reale. Controlla la firma in `src/utils/validation.ts` e adatta di conseguenza.

- [ ] **Step 5.6: Commit**

```bash
git add src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx
git commit -m "feat(mobile): add InfoTooltip on key fields and ValidationError on pesoFinito"
```

---

## Task 6: Unifica CSS token in mobile.css

**Files:**
- Modify: `src/styles/unified-tokens.css`
- Modify: `src/styles/mobile.css`

**Contesto:** `unified-tokens.css` mappa già `--m-*` → token unificati (Section 4, righe 93-135). Ma `mobile.css` è importato DOPO in `index.css` (`@import './styles/mobile.css'` riga 3), quindi i suoi valori hardcoded sovrascrivono il mapping. Fix: aggiungi `--m-text-muted` al mapping in unified-tokens.css, poi rimuovi i token duplicati da mobile.css.

- [ ] **Step 6.1: Aggiungi --m-text-muted al mapping in unified-tokens.css**

In `unified-tokens.css`, nella sezione `/* Mapping --m-* (mobile legacy) */` (riga ~94), aggiungi dopo `--m-muted`:

```css
--m-text-muted: var(--text-muted);   /* alias di --m-muted usato dai componenti mobile */
--m-text-faint: rgba(12, 19, 38, 0.25);  /* non ha analogo desktop — manteniamo valore fisso */
```

- [ ] **Step 6.2: Rimuovi token duplicati da mobile.css**

In `mobile.css`, nel blocco `:root` iniziale, rimuovi le righe seguenti (già gestite da unified-tokens.css):

```css
/* RIMUOVERE queste righe da mobile.css :root: */
--m-bg:           #faf7f4;
--m-surface:      #ffffff;
--m-navy:         #0c1326;
--m-orange:       #ff7e2e;
--m-green:        #43821c;
--m-border:       #e8e0d8;
--m-text:         #0c1326;
--m-text-muted:   rgba(12, 19, 38, 0.45);
--m-text-faint:   rgba(12, 19, 38, 0.25);
```

**Mantenere** in mobile.css (token layout, colori derivati, specifici mobile):

```css
--m-orange-hover: #dd5c0c;
--m-orange-a11y:  #b25820;
--m-border-light: #f0ebe3;
--m-topbar-h:     52px;
--m-tabbar-h:     64px;
--m-section-tabbar-h: 60px;
--m-radius-sm:    6px;
--m-radius-md:    10px;
--m-radius-lg:    14px;
```

- [ ] **Step 6.3: Verifica visiva rapida**

```bash
npm run dev
```

Aprire app su desktop e mobile (resize a <768px). Verificare che:
- Colori orange/navy/border identici a prima
- Nessun elemento diventa trasparente o perde colore

- [ ] **Step 6.4: Verifica build**

```bash
npx tsc -b && npm run lint
```

- [ ] **Step 6.5: Commit**

```bash
git add src/styles/unified-tokens.css src/styles/mobile.css
git commit -m "style: remove duplicated --m-* tokens from mobile.css, unified-tokens already maps them"
```

---

## Self-Review

### Spec coverage
- GAP-1 (isLiquid) → Task 3 ✅
- GAP-2 (postCottura/acquaAggiunta) → Task 4 ✅
- GAP-3 (InfoTooltip condiviso) → Task 1 + Task 5 ✅
- GAP-4 (ValidationError) → Task 5 ✅
- GAP-5 (ExportOptionsModal estratto) → Task 2 ✅
- GAP-6 (CSS token) → Task 6 ✅
- mob-bottom-bar → fuori scope (non toccare) ✅

### Placeholder scan
- Task 5.5: nota su `validateFinishedWeight` — firma da verificare → step dice esplicitamente di controllare ✅

### Type consistency
- `ExportFormat` definita in Task 2 (ExportOptionsModal.tsx), importata in Task 2.3 (TabellaTab.tsx) ✅
- `InfoTooltip` definita in Task 1, importata in Task 5 ✅
- `RecipeRow.postCottura` / `.acquaAggiunta` già nel type engine, usati in Task 4 ✅
