# Tabella USA — Fix Visivo e Varianti Misura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estrarre TabUSA in file dedicato, fixare il layout FDA-compliant per tutti e 3 i formati (verticale, orizzontale, lineare), e aggiungere pill-bar a 2 livelli per varianti serving/confezione × g/tazze/cucchiai/pezzi.

**Architecture:** Nuovo file `TabUSA.tsx` con tutta la logica di rendering USA (incluse funzioni `rUSA_*` estratte da `NutrizionaleCalc.tsx`). `NutrizionaleCalc.tsx` rimuove il vecchio inline `TabUSA` e le funzioni `rUSA_*`, aggiunge due stati (`usaServingRef`, `usaMeasure`) e pill-bar a 2 livelli sopra entrambe le occorrenze di `<TabUSA>`.

**Tech Stack:** React 19, TypeScript 5 (verbatimModuleSyntax), Vite 7, inline CSS.

---

## Contesto codebase (leggere prima di iniziare)

### Stato attuale `NutrizionaleCalc.tsx`

- **Riga 87-91**: `const DV_USA = { energyKcal: 2000, grassi: 78, saturi: 20, carboidratiTot: 275, fibre: 28, zuccheri_agg: 50, proteine: 50, sodio_mg: 2300, colesterolo: 300, potassio: 4700, calcio: 1300, ferro: 18, vitD: 20 }` — da spostare in `TabUSA.tsx` e rimuovere da qui
- **Righe 156-163**: funzioni `rUSA_energy`, `rUSA_g`, `rUSA_mg5`, `rUSA_pct` — da spostare in `TabUSA.tsx` e rimuovere da qui
- **Riga 1219**: `const [usa, setUSA] = useState<ServingSizesNation>({})` — già esistente, invariato
- **Righe 2237-2251**: form input USA nel wizard (invariato)
- **Righe 3179-3294**: `function TabUSA(...)` inline — da rimuovere completamente
- **Riga 2368**: `{activeTab === 'USA' && <TabUSA p={per100display} usa={usa} subTab={subTab} setSubTab={setSubTab} full={false} />}` — call site 1 (wizard)
- **Riga 3097**: `{activeTab === 'USA' && <TabUSA p={per100display} usa={usa} subTab={subTab} setSubTab={setSubTab} full={false} />}` — call site 2 (vista avanzata)
- **`ServingSizesNation`** interface (riga ~133): `{ cup?: number; cucchiaio?: number; serving?: number; confezione?: number; pezzo?: number }`
- **`specificGravity`**: stringa di stato, passata come `parseFloat(specificGravity) || 0` — vedi come è già usata per TabUE
- **`subTab`**: `useState<SubTab>('verticale')` a riga 1173 — già esistente, da continuare a passare
- **`showOptionals`**: stato boolean già esistente
- **Pattern pill-bar EU** (righe ~2333-2360): usa stessa struttura array → map → button className `btn btn-accent`/`btn-outline` — replicare per USA

### File `TabUE.tsx` (pattern da seguire)
- Interfacce locali `CalcResult`, `UEServing`, `ZERO_CALC`, `scaleResult` — replicare lo stesso pattern in `TabUSA.tsx`
- Import type per tipi esportati: `import type { EUSubTab, SelectedOptionals } from './TabUE'` — usare `import type` per i tipi

---

## Task 1: Crea `TabUSA.tsx` — layout completo

**Files:**
- Create: `src/calculators/NutrizionaleCalc/TabUSA.tsx`

- [ ] **Step 1.1: Crea il file con tutto il contenuto**

Crea `/Users/novanta/Desktop/APP/App_prova/src/calculators/NutrizionaleCalc/TabUSA.tsx` con il seguente contenuto completo:

```tsx
import React from 'react';

// ─── Exported types ────────────────────────────────────────────────────────────
export type USAServingRef = 'serving' | 'confezione';
export type USAMeasure = 'g' | 'tazze' | 'cucchiai' | 'pezzi';

// ─── Local interfaces (structural match con NutrizionaleCalc.tsx) ──────────────
interface CalcResult {
    energyKcal: number; energyKj: number; grassi: number; saturi: number;
    monoins: number; polins: number; trans: number; colesterolo: number;
    carboidrati: number; carboidratiTot: number; zuccheri: number;
    zuccheri_agg: number; polioli: number; amido: number; fibre: number;
    proteine: number; sodio_mg: number; sale: number; potassio: number;
    calcio: number; fosforo: number; magnesio: number; ferro: number;
    zinco: number; vitA_eq: number; vitD: number; vitE: number; vitC: number;
    vitB1: number; vitB2: number; vitB3: number; vitB6: number; vitB9: number; vitB12: number;
    vitK?: number; vitB5?: number; rame?: number; manganese?: number;
    selenio?: number; iodio?: number;
}

interface ServingSizesNation {
    cup?: number;
    cucchiaio?: number;
    serving?: number;
    confezione?: number;
    pezzo?: number;
}

// ─── FDA Daily Values (2020–2025) ─────────────────────────────────────────────
const DV_USA = {
    energyKcal: 2000, grassi: 78, saturi: 20, carboidratiTot: 275, fibre: 28,
    zuccheri_agg: 50, proteine: 50, sodio_mg: 2300, colesterolo: 300,
    potassio: 4700, calcio: 1300, ferro: 18, vitD: 20,
};

// ─── Scale helper ─────────────────────────────────────────────────────────────
const ZERO_CALC: CalcResult = {
    energyKcal: 0, energyKj: 0, grassi: 0, saturi: 0, monoins: 0, polins: 0,
    trans: 0, colesterolo: 0, carboidrati: 0, carboidratiTot: 0, zuccheri: 0,
    zuccheri_agg: 0, polioli: 0, amido: 0, fibre: 0, proteine: 0, sodio_mg: 0,
    sale: 0, potassio: 0, calcio: 0, fosforo: 0, magnesio: 0, ferro: 0, zinco: 0,
    vitA_eq: 0, vitD: 0, vitE: 0, vitC: 0, vitB1: 0, vitB2: 0, vitB3: 0, vitB6: 0,
    vitB9: 0, vitB12: 0,
};

function scaleResult(r: CalcResult, grams: number): CalcResult {
    const f = grams / 100;
    const s: CalcResult = { ...ZERO_CALC };
    for (const k of Object.keys(r) as (keyof CalcResult)[]) {
        const val = r[k];
        if (typeof val === 'number') {
            (s as unknown as Record<string, number>)[k] = val * f;
        }
    }
    return s;
}

// ─── Rounding helpers (FDA 21 CFR 101.9) ─────────────────────────────────────
function rUSA_energy(v: number): number {
    if (v < 5) return 0;
    if (v <= 50) return Math.round(v / 5) * 5;
    return Math.round(v / 10) * 10;
}
function rUSA_g(v: number): string { return v < 0.5 ? '0' : Math.round(v).toString(); }
function rUSA_mg(v: number): string { return v < 5 ? '0' : (Math.round(v / 5) * 5).toString(); }
function rUSA_pct(v: number, dv: number): number { return Math.round(v / dv * 100); }

// ─── Decimal separator: comma (Italian locale) ─────────────────────────────────
function fmtCount(n: number): string { return n.toFixed(1).replace('.', ','); }

// ─── Serving size row: returns [leftLabel, rightValue] ────────────────────────
function servingSizeRow(
    refGrams: number,
    servingRef: USAServingRef,
    measure: USAMeasure,
    usa: ServingSizesNation,
    unit: string
): [string, string] {
    const left = servingRef === 'confezione' ? 'container' : 'Serving size';
    let right: string;
    switch (measure) {
        case 'tazze':
            right = `${fmtCount(refGrams / (usa.cup ?? 1))} cup (${refGrams}${unit})`;
            break;
        case 'cucchiai':
            right = `${fmtCount(refGrams / (usa.cucchiaio ?? 1))} tablespoon (${refGrams}${unit})`;
            break;
        case 'pezzi':
            right = `${fmtCount(refGrams / (usa.pezzo ?? 1))} pieces (${refGrams}${unit})`;
            break;
        default:
            right = `${refGrams} ${unit}`;
    }
    return [left, right];
}

// ─── Local row interfaces ─────────────────────────────────────────────────────
interface USARow {
    label: string;
    val: number;
    dv: number;
    unit: 'g' | 'mg';
    bold: boolean;
    indent: 0 | 1;
}

interface VitRow {
    label: string;
    shortLabel: string;
    val: number;
    dv: number;
    unit: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface TabUSAProps {
    p: CalcResult;
    usa: ServingSizesNation;
    specificGravity: number;
    servingRef: USAServingRef;
    measure: USAMeasure;
    subTab: 'verticale' | 'orizzontale' | 'lineare';
}

// ─── TabUSA ───────────────────────────────────────────────────────────────────
export function TabUSA({ p, usa, specificGravity, servingRef, measure, subTab }: TabUSAProps) {
    const refGrams = servingRef === 'confezione' ? (usa.confezione ?? 0) : (usa.serving ?? 0);
    const d = refGrams > 0 ? scaleResult(p, refGrams) : p;
    const unit = specificGravity > 0 ? 'ml' : 'g';

    const servingsPerContainer = (usa.confezione && usa.serving && usa.serving > 0)
        ? fmtCount(usa.confezione / usa.serving)
        : '1';

    const amountLabel = servingRef === 'confezione' ? 'Amount per container' : 'Amount per serving';
    const [sizeLeft, sizeRight] = servingSizeRow(refGrams, servingRef, measure, usa, unit);

    const rows: USARow[] = [
        { label: 'Total Fat', val: d.grassi, dv: DV_USA.grassi, unit: 'g', bold: true, indent: 0 },
        { label: 'Saturated Fat', val: d.saturi, dv: DV_USA.saturi, unit: 'g', bold: false, indent: 1 },
        { label: 'Trans Fat', val: d.trans, dv: 0, unit: 'g', bold: false, indent: 1 },
        { label: 'Cholesterol', val: d.colesterolo, dv: DV_USA.colesterolo, unit: 'mg', bold: true, indent: 0 },
        { label: 'Sodium', val: d.sodio_mg, dv: DV_USA.sodio_mg, unit: 'mg', bold: true, indent: 0 },
        { label: 'Total Carbohydrate', val: d.carboidratiTot, dv: DV_USA.carboidratiTot, unit: 'g', bold: true, indent: 0 },
        { label: 'Dietary Fiber', val: d.fibre, dv: DV_USA.fibre, unit: 'g', bold: false, indent: 1 },
        { label: 'Total Sugars', val: d.zuccheri, dv: 0, unit: 'g', bold: false, indent: 1 },
        { label: 'Protein', val: d.proteine, dv: 0, unit: 'g', bold: true, indent: 0 },
    ];

    const addedSugarsG = rUSA_g(d.zuccheri_agg);
    const addedSugarsPct = rUSA_pct(d.zuccheri_agg, DV_USA.zuccheri_agg);

    const vitamins: VitRow[] = [
        { label: 'Vitamin D', shortLabel: 'Vit.D', val: d.vitD, dv: DV_USA.vitD, unit: 'mcg' },
        { label: 'Calcium', shortLabel: 'Calcium', val: d.calcio, dv: DV_USA.calcio, unit: 'mg' },
        { label: 'Iron', shortLabel: 'Iron', val: d.ferro, dv: DV_USA.ferro, unit: 'mg' },
        { label: 'Potassium', shortLabel: 'Potas.', val: d.potassio, dv: DV_USA.potassio, unit: 'mg' },
    ];

    function fmtVal(r: USARow): string {
        return r.unit === 'mg' ? `${rUSA_mg(r.val)}mg` : `${rUSA_g(r.val)}g`;
    }

    const footnote = '*The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.';

    // ── Vertical layout ───────────────────────────────────────────────────────
    if (subTab === 'verticale') {
        return (
            <div data-table-export style={{ background: 'white', padding: 12 }}>
                <div style={{ maxWidth: 310, border: '3px solid #000', padding: '8px 8px 4px 8px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, paddingBottom: 2 }}>Nutrition Facts</div>
                    <div style={{ fontSize: 11 }}>{servingsPerContainer} servings per container</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '8px solid #000', paddingTop: 2, paddingBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{sizeLeft}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{sizeRight}</span>
                    </div>
                    <div style={{ borderTop: '4px solid #000', paddingTop: 2 }}>
                        <div style={{ fontSize: 10, fontWeight: 700 }}>{amountLabel}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '4px solid #000', paddingBottom: 2 }}>
                            <span style={{ fontSize: 22, fontWeight: 900 }}>Calories</span>
                            <span style={{ fontSize: 40, fontWeight: 900 }}>{rUSA_energy(d.energyKcal)}</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 10, borderBottom: '1px solid #000', paddingBottom: 1 }}>% Daily Value*</div>
                    {rows.map((r, i) => {
                        const pct = r.dv > 0 ? rUSA_pct(r.val, r.dv) : null;
                        return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingLeft: r.indent * 16, paddingTop: 1, paddingBottom: 1 }}>
                                <span style={{ fontSize: r.bold ? 13 : 12, fontWeight: r.bold ? 700 : 400 }}>
                                    {r.label} {fmtVal(r)}
                                </span>
                                {pct !== null ? <span style={{ fontSize: 12, fontWeight: 700 }}>{pct}%</span> : <span />}
                            </div>
                        );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingLeft: 24, fontSize: 11, paddingTop: 1, paddingBottom: 1 }}>
                        <span>Includes {addedSugarsG}g Added Sugars</span>
                        <span style={{ fontWeight: 700 }}>{addedSugarsPct}%</span>
                    </div>
                    <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', paddingTop: 3, paddingBottom: 3, fontSize: 11 }}>
                        {vitamins.map((v, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <span> · </span>}
                                <span>{v.label} {rUSA_g(v.val)}{v.unit} {rUSA_pct(v.val, v.dv)}%</span>
                            </React.Fragment>
                        ))}
                    </div>
                    <div style={{ fontSize: 9, paddingTop: 3 }}>{footnote}</div>
                </div>
            </div>
        );
    }

    // ── Horizontal layout ─────────────────────────────────────────────────────
    if (subTab === 'orizzontale') {
        const leftRows = rows.filter(r => ['Total Fat', 'Saturated Fat', 'Trans Fat', 'Cholesterol', 'Sodium', 'Total Carbohydrate'].includes(r.label));
        const rightRows = rows.filter(r => ['Dietary Fiber', 'Total Sugars', 'Protein'].includes(r.label));

        return (
            <div data-table-export style={{ background: 'white', padding: 12 }}>
                <div style={{ border: '2px solid #000', fontFamily: 'Arial, Helvetica, sans-serif', maxWidth: 660, display: 'flex' }}>
                    {/* Col 1: brand + serving + calories */}
                    <div style={{ borderRight: '1px solid #000', padding: '6px 10px', minWidth: 140, flexShrink: 0 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>Nutrition</div>
                        <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>Facts</div>
                        <div style={{ fontSize: 10, marginTop: 4 }}>{servingsPerContainer} servings per container</div>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{sizeLeft}</div>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{sizeRight}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>{amountLabel}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 900 }}>Calories</span>
                            <span style={{ fontSize: 26, fontWeight: 900 }}>{rUSA_energy(d.energyKcal)}</span>
                        </div>
                        <div style={{ fontSize: 8, marginTop: 4 }}>* DV = Daily Value</div>
                        <div style={{ fontSize: 8 }}>* VQ = valeur quotidienne</div>
                    </div>
                    {/* Col 2: left nutrients */}
                    <div style={{ flex: 1, borderRight: '1px solid #ccc', padding: '4px 8px' }}>
                        <div style={{ textAlign: 'right', fontSize: 9, fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 1, marginBottom: 2 }}>%DV* / %VQ*</div>
                        {leftRows.map((r, i) => {
                            const pct = r.dv > 0 ? rUSA_pct(r.val, r.dv) : null;
                            return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: r.indent * 12, fontSize: r.bold ? 12 : 11, fontWeight: r.bold ? 700 : 400, borderBottom: '1px solid #eee', padding: `1px 0 1px ${r.indent * 12}px` }}>
                                    <span>{r.label} {fmtVal(r)}</span>
                                    {pct !== null ? <span style={{ fontWeight: 700 }}>{pct}%</span> : <span />}
                                </div>
                            );
                        })}
                    </div>
                    {/* Col 3: right nutrients */}
                    <div style={{ flex: 1, borderRight: '1px solid #ccc', padding: '4px 8px' }}>
                        <div style={{ textAlign: 'right', fontSize: 9, fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 1, marginBottom: 2 }}>%DV* / %VQ*</div>
                        {rightRows.map((r, i) => {
                            const pct = r.dv > 0 ? rUSA_pct(r.val, r.dv) : null;
                            return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: r.indent * 12, fontSize: r.bold ? 12 : 11, fontWeight: r.bold ? 700 : 400, borderBottom: '1px solid #eee', padding: `1px 0 1px ${r.indent * 12}px` }}>
                                    <span>{r.label} {fmtVal(r)}</span>
                                    {pct !== null ? <span style={{ fontWeight: 700 }}>{pct}%</span> : <span />}
                                </div>
                            );
                        })}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 20, fontSize: 10, borderBottom: '1px solid #eee', padding: '1px 0 1px 20px' }}>
                            <span>Incl. {addedSugarsG}g Added Sugars</span>
                            <span style={{ fontWeight: 700 }}>{addedSugarsPct}%</span>
                        </div>
                        <div style={{ fontSize: 10, borderTop: '1px solid #000', marginTop: 2, paddingTop: 2 }}>
                            {vitamins.map((v, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <span> - </span>}
                                    <span>{v.label} {rUSA_g(v.val)}{v.unit} {rUSA_pct(v.val, v.dv)}%</span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    {/* Col 4: footnote */}
                    <div style={{ width: 120, padding: '4px 6px', fontSize: 8, flexShrink: 0 }}>
                        {footnote}
                    </div>
                </div>
            </div>
        );
    }

    // ── Linear layout ─────────────────────────────────────────────────────────
    const kcal = rUSA_energy(d.energyKcal);
    const sizeCompact = `${sizeLeft} ${sizeRight}`;

    return (
        <div data-table-export style={{ background: 'white', padding: 12 }}>
            <div style={{ border: '2px solid #000', padding: '6px 8px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 11, maxWidth: 640 }}>
                <div>
                    <b style={{ fontSize: 14 }}>Nutrition Facts</b>
                    {'  '}Servings: {servingsPerContainer},{' '}
                    {sizeCompact},
                </div>
                <div>
                    {amountLabel}: <b>Calories {kcal},</b>
                    {'  '}<b>Total Fat</b> {rUSA_g(d.grassi)}g {'( '}{rUSA_pct(d.grassi, DV_USA.grassi)}% DV),
                    {' '}Sat.Fat {rUSA_g(d.saturi)}g {'( '}{rUSA_pct(d.saturi, DV_USA.saturi)}% DV),
                </div>
                <div>
                    <i>Trans</i> Fat {rUSA_g(d.trans)}g,{'  '}
                    <b>Cholest.</b> {rUSA_mg(d.colesterolo)}mg {'( '}{rUSA_pct(d.colesterolo, DV_USA.colesterolo)}% DV),{'  '}
                    <b>Sodium</b> {rUSA_mg(d.sodio_mg)}mg {'( '}{rUSA_pct(d.sodio_mg, DV_USA.sodio_mg)}% DV),{'  '}
                    <b>Total Carb.</b> {rUSA_g(d.carboidratiTot)}g {'( '}{rUSA_pct(d.carboidratiTot, DV_USA.carboidratiTot)}% DV),
                </div>
                <div>
                    Fiber {rUSA_g(d.fibre)}g {'( '}{rUSA_pct(d.fibre, DV_USA.fibre)}% DV),{'  '}
                    Total Sugars {rUSA_g(d.zuccheri)}g{' '}
                    (Incl. {addedSugarsG}g Added Sugars, {addedSugarsPct}% DV),{'  '}
                    <b>Protein</b> {rUSA_g(d.proteine)}g,
                </div>
                <div style={{ paddingLeft: 12 }}>
                    {vitamins.map((v, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span>{'  '}</span>}
                            <span>{v.shortLabel} {'( '}{rUSA_pct(v.val, v.dv)}% DV)</span>
                        </React.Fragment>
                    ))}.
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 1.2: Verifica compilazione**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build 2>&1 | tail -20
```

Atteso: `✓ built in` senza errori TypeScript. Se ci sono errori, correggerli prima di procedere.

- [ ] **Step 1.3: Commit**

```bash
cd /Users/novanta/Desktop/APP/App_prova
git add src/calculators/NutrizionaleCalc/TabUSA.tsx
git commit -m "feat: crea TabUSA.tsx con layout verticale, orizzontale, lineare e varianti misura"
```

---

## Task 2: Aggiorna `NutrizionaleCalc.tsx` — rimozione vecchio codice e integrazione

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

**Operazioni da eseguire in ordine:**

- [ ] **Step 2.1: Leggi il file per verificare le righe esatte**

```bash
cd /Users/novanta/Desktop/APP/App_prova
grep -n "rUSA_\|DV_USA\|function TabUSA\|TabUSA" src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx | head -40
```

Questo restituisce le righe esatte da modificare. Nota i numeri di riga prima di procedere.

- [ ] **Step 2.2: Aggiungi imports in cima al file**

Dopo gli import esistenti (prima della prima `const` o `interface`), aggiungi:

```tsx
import { TabUSA } from './TabUSA';
import type { USAServingRef, USAMeasure } from './TabUSA';
```

Nota: il progetto usa `verbatimModuleSyntax` — usare `import type` per i soli tipi.

- [ ] **Step 2.3: Rimuovi `DV_USA` (righe ~87-91)**

Rimuovi l'intero blocco:
```typescript
const DV_USA = {
    energyKcal: 2000, grassi: 78, saturi: 20, carboidratiTot: 275, fibre: 28,
    zuccheri_agg: 50, proteine: 50, sodio_mg: 2300, colesterolo: 300,
    potassio: 4700, calcio: 1300, ferro: 18, vitD: 20,
};
```

- [ ] **Step 2.4: Rimuovi le 4 funzioni `rUSA_*` (righe ~156-163)**

Rimuovi:
```typescript
function rUSA_energy(v: number): number {
    if (v < 5) return 0;
    if (v <= 50) return Math.round(v / 5) * 5;
    return Math.round(v / 10) * 10;
}
function rUSA_g(v: number): string { return v < 0.5 ? '0' : Math.round(v).toString(); }
function rUSA_mg5(v: number): string { return v < 5 ? '0' : (Math.round(v / 5) * 5).toString(); }
function rUSA_pct(v: number, dv: number): string { return Math.round(v / dv * 100).toString(); }
```

- [ ] **Step 2.5: Aggiungi stati `usaServingRef` e `usaMeasure`**

Dopo la riga `const [nutrModalOpen, setNutrModalOpen] = useState(false);` (~riga 1178), aggiungi:

```tsx
const [usaServingRef, setUsaServingRef] = useState<USAServingRef>('serving');
const [usaMeasure, setUsaMeasure] = useState<USAMeasure>('g');
```

- [ ] **Step 2.6: Aggiungi useEffect reset dopo la dichiarazione di `usa`**

La dichiarazione `const [usa, setUSA] = useState<ServingSizesNation>({})` è circa riga 1219. Subito dopo, aggiungi:

```tsx
useEffect(() => {
    if (usaServingRef === 'confezione' && (usa.confezione == null || usa.confezione === 0)) setUsaServingRef('serving');
    if (usaMeasure === 'tazze' && usa.cup == null) setUsaMeasure('g');
    if (usaMeasure === 'cucchiai' && usa.cucchiaio == null) setUsaMeasure('g');
    if (usaMeasure === 'pezzi' && usa.pezzo == null) setUsaMeasure('g');
}, [usaServingRef, usaMeasure, usa.confezione, usa.cup, usa.cucchiaio, usa.pezzo]);
```

- [ ] **Step 2.7: Rimuovi l'intera funzione `TabUSA` inline (righe ~3179-3294)**

Rimuovi tutto il blocco `function TabUSA({ p, usa, subTab, setSubTab, full }: ...) { ... }` compreso.

- [ ] **Step 2.8: Aggiorna il call site 1 (wizard, riga ~2368)**

Sostituisci:
```tsx
{activeTab === 'USA' && <TabUSA p={per100display} usa={usa} subTab={subTab} setSubTab={setSubTab} full={false} />}
```

Con:
```tsx
{activeTab === 'USA' && (
    <>
        {(usa.confezione != null && usa.confezione > 0) ? (
            <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                {(['serving', 'confezione'] as USAServingRef[]).map(ref => (
                    <button key={ref} onClick={() => setUsaServingRef(ref)}
                        className={`btn ${usaServingRef === ref ? 'btn-accent' : 'btn-outline'}`}
                        style={{ fontSize: 11, padding: '4px 10px' }}>
                        {ref === 'serving' ? 'Per Serving' : 'Per Confezione'}
                    </button>
                ))}
            </div>
        ) : null}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            {([
                { key: 'g' as USAMeasure, label: 'g / ml', disabled: false },
                { key: 'tazze' as USAMeasure, label: 'Tazze', disabled: usa.cup == null },
                { key: 'cucchiai' as USAMeasure, label: 'Cucchiai', disabled: usa.cucchiaio == null },
                { key: 'pezzi' as USAMeasure, label: 'Pezzi', disabled: usa.pezzo == null },
            ] as { key: USAMeasure; label: string; disabled: boolean }[]).map(t => (
                <button key={t.key} disabled={t.disabled} onClick={() => setUsaMeasure(t.key)}
                    className={`btn ${usaMeasure === t.key ? 'btn-accent' : 'btn-outline'}`}
                    style={{ fontSize: 11, padding: '4px 10px', opacity: t.disabled ? 0.4 : 1 }}>
                    {t.label}
                </button>
            ))}
        </div>
        <TabUSA p={per100display} usa={usa} specificGravity={parseFloat(specificGravity) || 0}
            servingRef={usaServingRef} measure={usaMeasure} subTab={subTab} />
    </>
)}
```

- [ ] **Step 2.9: Aggiorna il call site 2 (vista avanzata, riga ~3097)**

Stessa sostituzione del Step 2.8 (call site identico). Trova la seconda occorrenza di `{activeTab === 'USA' && <TabUSA ...` e applica lo stesso blocco JSX.

- [ ] **Step 2.10: Verifica build completa**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run build 2>&1 | tail -25
```

Atteso: `✓ built in` senza errori. Se ci sono errori TypeScript o di runtime, correggerli prima di procedere.

- [ ] **Step 2.11: Commit**

```bash
cd /Users/novanta/Desktop/APP/App_prova
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat: integra TabUSA estratto in NutrizionaleCalc — pill-bar varianti serving/misura"
```
