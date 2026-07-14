# Redesign pannello destro NutrizionaleCalc (desktop) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vista di lavoro pulita (tabella ufficiale verticale sempre live + colonna porzioni fissa) e modale download con scelta layout/riferimento/unità e anteprima esatta.

**Architecture:** Le tabelle ufficiali `Tab*.tsx` restano INTATTE e vengono renderizzate in due punti: nella vista (props di default forzate) e nel nuovo `DownloadTableModal` (props scelte dall'utente). Gli stati di formato migrano da NutrizionaleCalc al modale come stato locale. La griglia porzioni collassabile diventa una colonna fissa.

**Tech Stack:** React 18 + TS, Tailwind 4 / CSS custom (`index.css`, token `--color-*`), vitest + @testing-library/react (jsdom), html2canvas.

**Spec:** `docs/superpowers/specs/2026-07-14-desktop-right-panel-redesign.md`

## Vincoli assoluti (ripetuti dal cliente, non negoziabili)

1. `TabUE.tsx`, `TabUSA.tsx`, `TabCanada.tsx`, `TabAustralia.tsx`, `TabArabi.tsx`: **ZERO modifiche** (né markup né stili). Se un task sembra richiederne la modifica, fermarsi e chiedere.
2. Zero modifiche a `src/engines/`, `localizationModule.ts`.
3. PNG scaricato identico a oggi a parità di opzioni (stesso `html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true })`, stesso naming `${productName || 'tabella'}_nutrizionale.png`).
4. Nessuna dipendenza nuova. Niente `alert()`/`confirm()` nel codice nuovo. Zero `any`/`@ts-ignore`.

## Fatti verificati sul codice (riferimenti per l'esecutore)

- Stati formato in `NutrizionaleCalc.tsx`: `subTab`:1033, `auShowDI`:1034, `euSubTab`:1037, `usaServingRef`:1040, `usaMeasure`:1041, `caServingRef`:1152, `caMeasure`:1153, `arabiServingRef`:1162, `arabiMeasure`:1163, `servingsGridOpen`:1179
- Effetti di fallback disabilitazioni: righe 1146-1169 (USA/CA/Arabi), 1172-1175 (UE)
- `tableRef`:1176, `handleDownloadPNG`:1566-1580 (usa `[data-table-export]` come target)
- Render pannello destro: `renderTablePanel`:1740; tab regione `.right-seg`:1747-1756; griglia porzioni collassabile:1758-1830; chips UE:1838-1858; toolbar USA:1936-1969, Canada:1978-2004, Arabi:2017-2043; footer (Scarica PNG + Salva):2051-2060
- Tipi: `EUSubTab`, `SelectedOptionals` esportati da `./TabUE`; `USAServingRef`, `USAMeasure` da `./TabUSA`; `ServingSizesNation`:70, `UEServing`:73, `NationTab`:88, `SubTab`:89 locali (da esportare)
- Toast: `useToast` da `../../components/ui/Toast`; html2canvas import riga 17
- Pattern modale esistente: `SavedTablesModal.tsx` (overlay fixed inset-0, `rgba(0,0,0,0.5)`, zIndex 1000, card interna)
- Pattern test: `TabUE.test.tsx` (pragma `// @vitest-environment jsdom`, `render` da @testing-library/react, fixture `BASE_RESULT`)
- ATTENZIONE: `TabCanada` riceve `subTab`+`setSubTab` e `TabAustralia` riceve `showDI`+`setShowDI` → questi componenti hanno toggle INTERNI. Non toccarli: la vista continua a passare stato reale come oggi (vedi Task 5).

---

### Task 1: Esportare i tipi locali da NutrizionaleCalc

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx:70-89`

- [ ] **Step 1: Rendere esportati i 4 tipi locali**

Alle righe 70, 73, 88, 89 aggiungere `export`:

```ts
export interface ServingSizesNation {
    cup?: number; cucchiaio?: number; serving?: number; confezione?: number; pezzo?: number;
}
export interface UEServing { porzione?: number; confezione?: number; pezzo?: number; }
// ...
export type NationTab = 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';
export type SubTab = 'verticale' | 'orizzontale' | 'lineare';
```

- [ ] **Step 2: Verifica typecheck**

Run: `npx tsc -b`
Expected: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "refactor(nutrizionale): esporta tipi serving/nation per DownloadTableModal"
```

---

### Task 2: Test fallente per DownloadTableModal

**Files:**
- Test: `src/calculators/NutrizionaleCalc/DownloadTableModal.test.tsx` (nuovo)

- [ ] **Step 1: Scrivere il test**

Copiare la fixture `BASE_RESULT` da `TabUE.test.tsx:7-22` (stesso oggetto, non reimportarlo).

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DownloadTableModal } from './DownloadTableModal';
import { DEFAULT_OPTIONALS } from './TabUE';

const BASE_RESULT = { /* copia esatta da TabUE.test.tsx:7-22 */ };

const baseProps = {
    region: 'UE' as const,
    p: BASE_RESULT,
    ue: { porzione: 125, confezione: 250, pezzo: 125 },
    usa: {}, ca: {}, au: {}, arabi: {},
    specificGravity: 0,
    selectedOptionals: DEFAULT_OPTIONALS,
    showOptionals: false,
    productName: 'Mozzarella',
    onClose: vi.fn(),
};

describe('DownloadTableModal', () => {
    it('UE: mostra opzioni layout e anteprima tabella', () => {
        render(<DownloadTableModal {...baseProps} />);
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Verticale' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Orizzontale' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Lineare' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Scarica PNG/ })).toBeTruthy();
    });

    it('USA: unità Tazze disabilitata senza dato cup', () => {
        render(<DownloadTableModal {...baseProps} region="USA" usa={{ serving: 30, confezione: 250 }} />);
        const tazze = screen.getByRole('button', { name: 'Tazze' }) as HTMLButtonElement;
        expect(tazze.disabled).toBe(true);
    });
});
```

- [ ] **Step 2: Verificare che fallisca**

Run: `npx vitest run src/calculators/NutrizionaleCalc/DownloadTableModal.test.tsx`
Expected: FAIL — modulo `./DownloadTableModal` inesistente.

---

### Task 3: Implementare DownloadTableModal

**Files:**
- Create: `src/calculators/NutrizionaleCalc/DownloadTableModal.tsx`

- [ ] **Step 1: Implementazione**

Il modale possiede come stato LOCALE tutte le scelte di formato. Rende lo stesso componente `Tab*` della regione, con `[data-table-export]` già gestito dai Tab (il ref punta al wrapper anteprima). Struttura:

```tsx
import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '../../components/ui/Toast';
import { TabUE } from './TabUE';
import type { EUSubTab, SelectedOptionals } from './TabUE';
import { TabUSA } from './TabUSA';
import type { USAServingRef, USAMeasure } from './TabUSA';
import { TabCanada } from './TabCanada';
import { TabAustralia } from './TabAustralia';
import { TabArabi } from './TabArabi';
import type { NationTab, SubTab, ServingSizesNation, UEServing } from './NutrizionaleCalc';
import type { ComponentProps } from 'react';

interface Props {
    region: NationTab;
    p: ComponentProps<typeof TabUE>['p'];
    ue: UEServing;
    usa: ServingSizesNation;
    ca: ServingSizesNation;
    au: ServingSizesNation;
    arabi: ServingSizesNation;
    specificGravity: number;
    selectedOptionals: SelectedOptionals;
    showOptionals: boolean;
    productName: string;
    onClose: () => void;
}

export function DownloadTableModal({ region, p, ue, usa, ca, au, arabi, specificGravity, selectedOptionals, showOptionals, productName, onClose }: Props) {
    const toast = useToast();
    const previewRef = useRef<HTMLDivElement>(null);
    const [subTab, setSubTab] = useState<SubTab>('verticale');
    const [euSubTab, setEuSubTab] = useState<EUSubTab>('100g');
    const [servingRef, setServingRef] = useState<USAServingRef>('serving');
    const [measure, setMeasure] = useState<USAMeasure>('g');
    const [auShowDI, setAuShowDI] = useState(true);

    const nation: ServingSizesNation = region === 'USA' ? usa : region === 'Canada' ? ca : region === 'Arabi' ? arabi : au;

    // Fallback disabilitazioni — stessa logica di NutrizionaleCalc.tsx:1146-1175
    useEffect(() => {
        if (servingRef === 'confezione' && (nation.confezione == null || nation.confezione === 0)) setServingRef('serving');
        if (measure === 'tazze' && nation.cup == null) setMeasure('g');
        if (measure === 'cucchiai' && nation.cucchiaio == null) setMeasure('g');
        if (measure === 'pezzi' && nation.pezzo == null) setMeasure('g');
    }, [servingRef, measure, nation.confezione, nation.cup, nation.cucchiaio, nation.pezzo]);
    useEffect(() => {
        if (euSubTab === 'uv' && ue.confezione == null) setEuSubTab('100g');
        if (euSubTab === 'porzione' && ue.porzione == null) setEuSubTab('100g');
        if (euSubTab === 'pezzo' && ue.pezzo == null) setEuSubTab('100g');
    }, [euSubTab, ue.confezione, ue.porzione, ue.pezzo]);

    const handleDownload = async () => {
        if (!previewRef.current) { toast.error('Tabella non trovata.'); return; }
        try {
            const target = (previewRef.current.querySelector('[data-table-export]') as HTMLElement) ?? previewRef.current;
            const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const a = document.createElement('a');
            a.download = `${productName || 'tabella'}_nutrizionale.png`;
            a.href = canvas.toDataURL('image/png');
            a.click();
        } catch (e) {
            console.error('PNG Export error:', e);
            toast.error("Errore durante l'esportazione della tabella in PNG.");
        }
    };

    const optBtn = (active: boolean) => `btn ${active ? 'btn-accent' : 'btn-outline'}`;
    const optStyle = (disabled = false) => ({ fontSize: 11, padding: '3px 8px', opacity: disabled ? 0.4 : 1 } as const);

    return (
        <div role="dialog" aria-modal="true" aria-label={`Scarica tabella ufficiale ${region}`}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="card" style={{ width: '100%', maxWidth: 860, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h2 style={{ margin: 0, fontSize: 16 }}>Scarica tabella ufficiale — {region}</h2>
                    <button className="btn btn-outline" onClick={onClose} style={{ padding: '6px 12px' }}>✕ Annulla</button>
                </div>
                <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
                    {/* Colonna opzioni */}
                    <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(region === 'UE' || region === 'USA') && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Layout</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {(['verticale', 'orizzontale', 'lineare'] as SubTab[]).map(t => (
                                        <button key={t} type="button" className={optBtn(subTab === t)} style={optStyle()} onClick={() => setSubTab(t)}>
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {region === 'UE' && (ue.porzione != null || ue.confezione != null || ue.pezzo != null) && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Colonne</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {([
                                        { key: '100g' as EUSubTab, label: 'Per 100g', disabled: false },
                                        { key: 'uv' as EUSubTab, label: 'Per U.V.', disabled: ue.confezione == null },
                                        { key: 'porzione' as EUSubTab, label: 'Per porzione', disabled: ue.porzione == null },
                                        { key: 'pezzo' as EUSubTab, label: 'Per pezzo', disabled: ue.pezzo == null },
                                    ]).map(t => (
                                        <button key={t.key} type="button" disabled={t.disabled} className={optBtn(euSubTab === t.key)} style={optStyle(t.disabled)} onClick={() => setEuSubTab(t.key)}>{t.label}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(region === 'USA' || region === 'Canada' || region === 'Arabi') && (
                            <>
                                {(nation.confezione != null && nation.confezione > 0) && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Riferimento</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {(['serving', 'confezione'] as USAServingRef[]).map(r => (
                                                <button key={r} type="button" className={optBtn(servingRef === r)} style={optStyle()} onClick={() => setServingRef(r)}>
                                                    {r === 'serving' ? 'Per Serving' : 'Per Confezione'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Unità</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {([
                                            { key: 'g' as USAMeasure, label: 'g / ml', disabled: false },
                                            { key: 'tazze' as USAMeasure, label: 'Tazze', disabled: nation.cup == null },
                                            { key: 'cucchiai' as USAMeasure, label: 'Cucchiai', disabled: nation.cucchiaio == null },
                                            { key: 'pezzi' as USAMeasure, label: 'Pezzi', disabled: nation.pezzo == null },
                                        ]).map(t => (
                                            <button key={t.key} type="button" disabled={t.disabled} className={optBtn(measure === t.key)} style={optStyle(t.disabled)} onClick={() => setMeasure(t.key)}>{t.label}</button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    {/* Anteprima */}
                    <div ref={previewRef} style={{ flex: 1, overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                        {region === 'UE' && <TabUE p={p} ue={ue} specificGravity={specificGravity} selectedOptionals={selectedOptionals} showOptionals={showOptionals} activeSubTab={euSubTab} />}
                        {region === 'USA' && <TabUSA p={p} usa={usa} specificGravity={specificGravity} servingRef={servingRef} measure={measure} subTab={subTab} />}
                        {region === 'Canada' && <TabCanada p={p} ca={ca} servingRef={servingRef} measure={measure} subTab={subTab} setSubTab={setSubTab} full={false} />}
                        {region === 'Australia' && <TabAustralia p={p} au={au} showDI={auShowDI} setShowDI={setAuShowDI} full={false} />}
                        {region === 'Arabi' && <TabArabi p={p} arabi={arabi} servingRef={servingRef} measure={measure} specificGravity={specificGravity} full={false} />}
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                    <button type="button" className="btn btn-accent" style={{ padding: '8px 16px', fontSize: 12 }} onClick={handleDownload}>
                        Scarica PNG
                    </button>
                </div>
            </div>
        </div>
    );
}
```

NOTE per l'esecutore:
- Le firme props dei `Tab*` vanno verificate contro i file reali PRIMA di scrivere (leggere l'interfaccia Props di ciascun Tab). Il layout per Canada/Australia/Arabi è gestito internamente o non applicabile: il blocco "Layout" appare solo per UE/USA come da render attuale (la toolbar layout esiste solo nel ramo USA a :1937; per UE il layout è implicito nel componente — se `TabUE` non accetta `subTab`, il blocco Layout va mostrato SOLO per USA. Verificare e adeguare test+UI di conseguenza).
- Nessuna modifica ai Tab*: se un'opzione non è supportata dalle props esistenti, l'opzione NON si aggiunge (si mostra solo ciò che oggi è possibile).

- [ ] **Step 2: Test verdi**

Run: `npx vitest run src/calculators/NutrizionaleCalc/DownloadTableModal.test.tsx`
Expected: PASS (2 test). Adeguare il test se il blocco Layout risulta solo-USA (togliere l'assert su 'Verticale' nel caso UE e spostarlo nel caso USA).

- [ ] **Step 3: Commit**

```bash
git add src/calculators/NutrizionaleCalc/DownloadTableModal.tsx src/calculators/NutrizionaleCalc/DownloadTableModal.test.tsx
git commit -m "feat(nutrizionale): DownloadTableModal — opzioni formato + anteprima + PNG"
```

---

### Task 4: Wiring del modale nella vista

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` (header pannello destro ~1743-1756, footer 2051-2060)

- [ ] **Step 1: Stato e render del modale**

```tsx
const [downloadModalOpen, setDownloadModalOpen] = useState(false);
```

Import: `import { DownloadTableModal } from './DownloadTableModal';`

Nel JSX (accanto agli altri modali già renderizzati):

```tsx
{downloadModalOpen && (
    <DownloadTableModal
        region={activeTab}
        p={per100display}
        ue={ue} usa={usa} ca={ca} au={au} arabi={arabi}
        specificGravity={parseFloat(specificGravity) || 0}
        selectedOptionals={selectedOptionals}
        showOptionals={showOptionals}
        productName={productName}
        onClose={() => setDownloadModalOpen(false)}
    />
)}
```

- [ ] **Step 2: Bottone in header + footer semplificato**

Nella `table-panel-header`, dopo `.right-seg` (riga ~1756), aggiungere:

```tsx
<button type="button" onClick={() => setDownloadModalOpen(true)}
    className="btn btn-accent" style={{ fontSize: 12, padding: '5px 12px', marginLeft: 'auto' }}>
    <ImageDown size={13} /> Scarica ufficiale…
</button>
```

Nel footer (2051-2060): rimuovere il bottone "Scarica PNG" (2052-2056), lasciare solo "Salva in archivio" a piena larghezza. `handleDownloadPNG` resta usato? Verificare con grep: se il solo consumer era il bottone footer, eliminarlo insieme a `tableRef` SOLO se `_handlePDF` (1606) non lo usa — `_handlePDF` lo usa, quindi `tableRef` RESTA.

- [ ] **Step 3: Verifica**

Run: `npx tsc -b && npm run lint && npm test`
Expected: tutto verde (nessun test tocca il footer).

- [ ] **Step 4: Commit**

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat(nutrizionale): bottone Scarica ufficiale nel header, modale download al posto del PNG footer"
```

---

### Task 5: Rimuovere le toolbar di formato dalla vista (forzare verticale)

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx:1835-2048`

- [ ] **Step 1: UE — rimuovere chips sub-tab**

Eliminare il blocco chips 1838-1858 e passare valore fisso:

```tsx
<TabUE p={per100display} ue={ue} specificGravity={parseFloat(specificGravity) || 0}
    selectedOptionals={selectedOptionals} showOptionals={showOptionals} activeSubTab="100g" />
```

Lasciare INVARIATI: checkbox "Mostra valori facoltativi" (1868-1888), sezione claims (1889-1931) — sono contenuti, non formato.

- [ ] **Step 2: USA — rimuovere toolbar 1936-1969**

```tsx
<TabUSA p={per100display} usa={usa} specificGravity={parseFloat(specificGravity) || 0}
    servingRef="serving" measure="g" subTab="verticale" />
```

- [ ] **Step 3: Canada — rimuovere toolbar 1978-2004**

`TabCanada` ha toggle interni (riceve `subTab`/`setSubTab`): NON forzare con no-op. Mantenere `subTab={subTab} setSubTab={setSubTab}` come oggi; rimuovere solo la toolbar esterna serving/unità e passare `servingRef="serving" measure="g"`.

- [ ] **Step 4: Arabi — rimuovere toolbar 2017-2043**

```tsx
<TabArabi p={per100display} arabi={arabi} servingRef="serving" measure="g"
    specificGravity={parseFloat(specificGravity) || 0} full={false} />
```

- [ ] **Step 5: Pulizia stati orfani**

Per ciascuno di `euSubTab`, `usaServingRef`, `usaMeasure`, `caServingRef`, `caMeasure`, `arabiServingRef`, `arabiMeasure`: `grep -n` nel file. Se restano usati SOLO dagli effetti di fallback 1146-1175, eliminare stato + effetto (la logica vive già nel modale). `subTab`+`setSubTab` restano (Canada). `auShowDI` resta (Australia). Se uno stato è persistito in draft/archivio (grep `draft.` e payload di `handleSave`), NON eliminarlo: lasciarlo con commento `// ponytail: stato legacy solo per draft, UI nel DownloadTableModal`.

- [ ] **Step 6: Verifica + commit**

Run: `npx tsc -b && npm run lint && npm test`
Expected: verde.

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat(nutrizionale): vista tabella forzata verticale, toolbar formato rimosse (vivono nel modale)"
```

---

### Task 6: Colonna porzioni fissa

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx:1758-1834` (griglia collassabile → colonna)
- Modify: `src/index.css` (nuove classi)

- [ ] **Step 1: CSS**

In `index.css`, vicino alle classi `.table-panel-*` esistenti:

```css
/* Colonna porzioni fissa — redesign pannello destro 2026-07 */
.table-panel-body { display: flex; gap: 12px; align-items: flex-start; min-height: 0; }
.table-panel-body .table-scroll-area { flex: 1; min-width: 0; }
.portions-col {
    width: 170px; flex-shrink: 0;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-sm); padding: 12px;
    display: flex; flex-direction: column; gap: 10px;
    position: sticky; top: 8px;
}
.portions-col-title { font-size: 12px; font-weight: 700; color: var(--color-text); }
.portions-col .field-label { font-size: 11px; text-transform: none; letter-spacing: 0; }
@media (max-width: 1279px) {
    .table-panel-body { flex-direction: column; }
    .portions-col { width: 100%; position: static; flex-direction: row; flex-wrap: wrap; }
    .portions-col .field { flex: 1 1 140px; }
}
```

- [ ] **Step 2: Markup**

Rimuovere il bottone collassabile 1759-1771 e lo stato `servingsGridOpen` (1179). Spostare i 5 blocchi input per regione (1774-1828, INVARIATI nei loro onChange/value) dal `table-panel-header` a una colonna affiancata alla tabella:

```tsx
<div className="table-panel-body">
    <div ref={isMobileInline ? undefined : tableRef} className="table-scroll-area" style={{ overflowX: 'auto' }}>
        {/* ...blocchi activeTab === 'UE' | 'USA' | ... invariati... */}
    </div>
    <aside className="portions-col" aria-label={`Porzioni ${activeTab}`}>
        <div className="portions-col-title">Porzioni {activeTab}</div>
        {/* qui i map per-regione già esistenti (ex 1774-1828), senza wrapper grid:
            ogni .field va reso figlio diretto della colonna */}
    </aside>
</div>
```

Le label passano da `fontSize: 10` a `fontSize: 11` via classe `.portions-col .field-label` (già nel CSS sopra) — rimuovere lo style inline `{ fontSize: 10 }` dalle label spostate.

- [ ] **Step 3: Verifica + commit**

Run: `npx tsc -b && npm run lint && npm test`
Expected: verde.

```bash
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx src/index.css
git commit -m "feat(nutrizionale): colonna porzioni fissa al posto della griglia collassabile"
```

---

### Task 7: Verifica end-to-end e regression PNG

- [ ] **Step 1: Suite completa**

Run: `npm test && npx tsc -b && npm run lint`
Expected: tutto verde. In particolare gli snapshot di `TabUE.test.tsx` NON devono cambiare (se cambiano, un Tab* è stato toccato: violazione vincolo 1, revert immediato).

- [ ] **Step 2: Verifica manuale (dev server)**

Run: `npm run dev`, aprire il calcolatore nutrizionale desktop e verificare:
1. Per ogni regione: tabella verticale live, identica a prima
2. Colonna porzioni: inserire porzione UE=30 → colonna porzione appare in tabella (per U.V./porzione via modale)
3. Modale: ogni combinazione layout/riferimento/unità mostra l'anteprima corretta; Tazze/Cucchiai/Pezzi disabilitati senza dato
4. Download PNG dal modale: file scaricato identico a quello pre-redesign a parità di ricetta+opzioni (confronto visivo)
5. Salva in archivio + ricarica: invariati

- [ ] **Step 3: Chiudere**

Aggiornare `todo.md` se esistono task ID correlati. Proporre all'utente il deploy preview Vercel (regola CLAUDE.md).

---

## Self-review (fatto)

- Spec coverage: vista (T5), colonna porzioni (T6), modale (T2-T4), invarianti Tab* (vincoli + T7.1), stati riusati (T3/T5.5) ✓
- Nessun placeholder; punti di verifica esplicitati dove il codice reale va letto prima (firme Tab*, consumer stati) ✓
- Tipi coerenti: `ServingSizesNation`/`UEServing`/`NationTab`/`SubTab` esportati in T1, importati in T3 ✓
