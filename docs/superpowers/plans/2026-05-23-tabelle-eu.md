# Tabella Europea — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correggere il bug % AR fibre, aggiungere selettore colonna di riferimento (100g / U.V. / porzione / pezzo) e modal selezione nutrienti facoltativi individuali (inclusi minerali e vitamine) nella Tabella Europea.

**Architecture:** Si estraggono `TabUE` e le funzioni di arrotondamento EU in un file dedicato `TabUE.tsx`; si crea `NutrientSelectModal.tsx` per la selezione nutrienti. `NutrizionaleCalc.tsx` viene alleggerito e aggiorna le due occorrenze di `<TabUE>` con le nuove props.

**Tech Stack:** React 19, TypeScript strict, nessuna nuova dipendenza, CSS inline (pattern esistente nel progetto).

**Nota test:** Il progetto non ha ancora infrastruttura di test (TEST-1 in todo.md è pendente e richiede approvazione dipendenza). Le istruzioni di test in questo piano si limitano a verifica manuale nel browser con `npm run dev`.

---

## File Map

| File | Azione | Responsabilità |
|------|--------|----------------|
| `src/calculators/NutrizionaleCalc/TabUE.tsx` | **Crea** | Componente `TabUE` + funzioni `rUE_*` + rendering tabella EU |
| `src/calculators/NutrizionaleCalc/NutrientSelectModal.tsx` | **Crea** | Modal checkbox selezione nutrienti facoltativi |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` | **Modifica** | Rimuovi codice spostato, aggiungi stato, aggiorna 2 occorrenze `<TabUE>` |

---

## Task 1: Crea `TabUE.tsx` — sposta codice esistente

**Files:**
- Create: `src/calculators/NutrizionaleCalc/TabUE.tsx`

Questo task sposta il codice esistente senza cambiare logica. Niente di nuovo, niente di rotto.

- [ ] **Step 1.1: Crea il file `TabUE.tsx` con imports e tipi**

```tsx
// src/calculators/NutrizionaleCalc/TabUE.tsx
import React from 'react';

// ── Tipi (copiati da NutrizionaleCalc.tsx) ──────────────────────────────────
export type EUSubTab = '100g' | 'uv' | 'porzione' | 'pezzo';

export interface SelectedOptionals {
  monoins: boolean; polins: boolean; polioli: boolean; amido: boolean;
  potassio: boolean; calcio: boolean; fosforo: boolean; magnesio: boolean;
  ferro: boolean; zinco: boolean; rame: boolean; manganese: boolean;
  selenio: boolean; iodio: boolean;
  vitA: boolean; vitD: boolean; vitE: boolean; vitK: boolean; vitC: boolean;
  vitB1: boolean; vitB2: boolean; vitB3: boolean; vitB6: boolean;
  vitB9: boolean; vitB12: boolean; vitB5: boolean;
}

export const DEFAULT_OPTIONALS: SelectedOptionals = {
  monoins: false, polins: false, polioli: false, amido: false,
  potassio: false, calcio: false, fosforo: false, magnesio: false,
  ferro: false, zinco: false, rame: false, manganese: false,
  selenio: false, iodio: false,
  vitA: false, vitD: false, vitE: false, vitK: false, vitC: false,
  vitB1: false, vitB2: false, vitB3: false, vitB6: false,
  vitB9: false, vitB12: false, vitB5: false,
};

// Questi tipi esistono già in NutrizionaleCalc.tsx — importarli da lì quando
// NutrizionaleCalc.tsx li esporterà, oppure ridefinirli qui localmente.
// Per ora li importiamo con un import relativo che verrà risolto al Task 3.
// TEMPORANEO: sostituire con import reale al Task 3.
```

- [ ] **Step 1.2: Aggiungi le funzioni di arrotondamento EU**

Copia le righe 159-194 di `NutrizionaleCalc.tsx` (funzioni `fUE`, `rUE_energy`, `rUE_macro`, `rUE_sat`, `rUE_sale`, `rUE_micro3sig`, `rUE_micro2sig`, `rUE_pct`) nel file `TabUE.tsx` dopo gli import, **senza modificarle**.

```tsx
// ── Formattazione ────────────────────────────────────────────────────────────
const fUE = (v: string | number) => v.toString().replace('.', ',');

function rUE_energy(v: number): string { return Math.round(v).toString(); }

function rUE_macro(v: number): string {
    if (v < 0.5) return fUE('0');
    if (v < 10) return fUE(Math.round(v * 10) / 10);
    return fUE(Math.round(v));
}

function rUE_sat(v: number): string {
    if (v <= 0.1) return '0';
    if (v < 10) return fUE(Math.round(v * 10) / 10);
    return fUE(Math.round(v));
}

function rUE_sale(v: number): string {
    if (v <= 0.0125) return '0';
    if (v < 1) return fUE(Math.round(v * 100) / 100);
    return fUE(Math.round(v * 10) / 10);
}

function rUE_micro3sig(v: number): string {
    if (v === 0) return '0';
    const mag = Math.floor(Math.log10(Math.abs(v)));
    const factor = Math.pow(10, 2 - mag);
    return fUE(Math.round(v * factor) / factor);
}

function rUE_micro2sig(v: number): string {
    if (v === 0) return '0';
    const mag = Math.floor(Math.log10(Math.abs(v)));
    const factor = Math.pow(10, 1 - mag);
    return fUE(Math.round(v * factor) / factor);
}

function rUE_pct(v: number, ref: number): number | null {
    const p = v / ref * 100;
    return p >= 1 ? Math.round(p) : null;
}
```

**Nota:** copia il corpo esatto leggendo le righe 160-194 del file originale. Se il corpo delle funzioni differisce da quello sopra (es. logica aggiuntiva), usa quello originale.

- [ ] **Step 1.3: Aggiungi la costante AR_UE e il shared table style TS**

Copia la costante `AR_UE` (righe 84-110 di `NutrizionaleCalc.tsx`) e il shared style object `TS` (righe 3115-3125) nel file `TabUE.tsx`.

```tsx
// ── AR Reference (EU Reg. 1169/2011 Annex XIII) ─────────────────────────────
const AR_UE = {
    energyKj: 8400, energyKcal: 2000, grassi: 70, saturi: 20, carboidrati: 260,
    zuccheri: 90, fibre: 25, proteine: 50, sale: 6, potassio: 2000, calcio: 800,
    fosforo: 700, magnesio: 375, ferro: 14, zinco: 10, rame: 1, manganese: 2,
    selenio: 0.055, iodio: 0.150,
    vitA_eq: 800, vitD: 5, vitE: 12, vitK: 0.075, vitC: 80,
    vitB1: 1.1, vitB2: 1.4, vitB3: 16, vitB6: 1.4, vitB9: 200, vitB12: 2.5, vitB5: 6,
};

// ── Shared table styles ──────────────────────────────────────────────────────
const TS = {
    table: { borderCollapse: 'collapse' as const, width: '100%', fontSize: 12 },
    th: { background: '#000', color: 'white', padding: '5px 8px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600 as const },
    thR: { background: '#000', color: 'white', padding: '5px 8px', textAlign: 'right' as const, fontSize: 11, fontWeight: 600 as const },
    td: { padding: '4px 8px', borderBottom: '1px solid #ddd', fontSize: 12 },
    tdR: { padding: '4px 8px', borderBottom: '1px solid #ddd', textAlign: 'right' as const, fontSize: 12 },
    tdB: { padding: '4px 8px', borderBottom: '1px solid #ddd', fontSize: 12, fontWeight: 700 as const },
    tdBR: { padding: '4px 8px', borderBottom: '1px solid #ddd', textAlign: 'right' as const, fontSize: 12, fontWeight: 700 as const },
    tdSub: { padding: '4px 8px 4px 20px', borderBottom: '1px solid #ddd', fontSize: 12, color: '#666' },
    tdSubR: { padding: '4px 8px 4px 20px', borderBottom: '1px solid #ddd', textAlign: 'right' as const, fontSize: 12, color: '#666' },
};
```

**Nota:** leggi le righe effettive di `NutrizionaleCalc.tsx` e copia il contenuto esatto di `AR_UE` e `TS` (inclusi tutti i campi vitamine/minerali).

- [ ] **Step 1.4: Aggiungi `scaleResult` — funzione helper**

`scaleResult` è definita in `NutrizionaleCalc.tsx`. Cerca la sua definizione con grep:
```bash
grep -n "function scaleResult\|scaleResult" /Users/novanta/Desktop/APP/App_prova/src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx | head -5
```
Poi importala o copiala in `TabUE.tsx` — usa `import { scaleResult }` se viene esportata, altrimenti copiala.

- [ ] **Step 1.5: Scrivi l'interfaccia props e il componente `TabUE`**

```tsx
// ── Props ────────────────────────────────────────────────────────────────────
interface UEServing { porzione?: number; confezione?: number; pezzo?: number; }

interface CalcResult {
  energyKcal: number; energyKj: number;
  grassi: number; saturi: number; monoins: number; polins: number; trans: number;
  colesterolo: number; carboidrati: number; carboidratiTot: number;
  zuccheri: number; zuccheri_agg: number; polioli: number; amido: number;
  fibre: number; proteine: number; sodio_mg: number; sale: number;
  potassio: number; calcio: number; fosforo: number; magnesio: number;
  ferro: number; zinco: number; rame: number; manganese: number;
  selenio: number; iodio: number;
  vitA_eq: number; vitD: number; vitE: number; vitK: number; vitC: number;
  vitB1: number; vitB2: number; vitB3: number; vitB6: number;
  vitB9: number; vitB12: number; vitB5: number;
}

interface TabUEProps {
  p: CalcResult;
  ue: UEServing;
  specificGravity?: number;
  selectedOptionals: SelectedOptionals;
  showOptionals: boolean;
  activeSubTab: EUSubTab;
}

export function TabUE({ p, ue, specificGravity, selectedOptionals, showOptionals, activeSubTab }: TabUEProps) {
  // Calcola il CalcResult scalato in base al subtab attivo
  const scaled: CalcResult = (() => {
    if (activeSubTab === 'uv' && ue.confezione) return scaleResult(p, ue.confezione);
    if (activeSubTab === 'porzione' && ue.porzione) return scaleResult(p, ue.porzione);
    if (activeSubTab === 'pezzo' && ue.pezzo) return scaleResult(p, ue.pezzo);
    return p;
  })();

  // Etichetta header (unità di misura)
  const unitLabel = (() => {
    const unit = specificGravity && specificGravity > 0 ? 'ml' : 'g';
    if (activeSubTab === 'uv' && ue.confezione) return `${ue.confezione} ${unit}`;
    if (activeSubTab === 'porzione' && ue.porzione) return `${ue.porzione} ${unit}`;
    if (activeSubTab === 'pezzo' && ue.pezzo) return `${ue.pezzo} ${unit}`;
    return `100 ${unit}`;
  })();

  // ── Righe obbligatorie ──────────────────────────────────────────────────
  interface UERow {
    label: string; indent?: boolean; bold?: boolean;
    value: string; arPct: string; isOptional?: boolean;
    optionalKey?: keyof SelectedOptionals;
  }

  const rows: UERow[] = [
    { label: 'Energia', bold: true, value: `${rUE_energy(scaled.energyKj)} kJ / ${rUE_energy(scaled.energyKcal)} kcal`, arPct: `${Math.round(p.energyKcal / AR_UE.energyKcal * 100)}%` },
    { label: 'Grassi', bold: true, value: `${rUE_macro(scaled.grassi)} g`, arPct: `${Math.round(p.grassi / AR_UE.grassi * 100)}%` },
    { label: 'di cui acidi grassi saturi', indent: true, value: `${rUE_sat(scaled.saturi)} g`, arPct: `${Math.round(p.saturi / AR_UE.saturi * 100)}%` },
    { label: 'di cui acidi grassi monoinsaturi', indent: true, value: `${rUE_sat(scaled.monoins)} g`, arPct: '—', isOptional: true, optionalKey: 'monoins' },
    { label: 'di cui acidi grassi polinsaturi', indent: true, value: `${rUE_sat(scaled.polins)} g`, arPct: '—', isOptional: true, optionalKey: 'polins' },
    { label: 'Carboidrati', bold: true, value: `${rUE_macro(scaled.carboidrati)} g`, arPct: `${Math.round(p.carboidrati / AR_UE.carboidrati * 100)}%` },
    { label: 'di cui zuccheri', indent: true, value: `${rUE_macro(scaled.zuccheri)} g`, arPct: `${Math.round(p.zuccheri / AR_UE.zuccheri * 100)}%` },
    { label: 'di cui polioli', indent: true, value: `${rUE_macro(scaled.polioli)} g`, arPct: '—', isOptional: true, optionalKey: 'polioli' },
    { label: 'di cui amido', indent: true, value: `${rUE_macro(scaled.amido)} g`, arPct: '—', isOptional: true, optionalKey: 'amido' },
    // BUG FIX: fibre non ha % AR (nessun valore normativo EU)
    { label: 'Fibre', bold: true, value: `${rUE_macro(scaled.fibre)} g`, arPct: '—' },
    { label: 'Proteine', bold: true, value: `${rUE_macro(scaled.proteine)} g`, arPct: `${Math.round(p.proteine / AR_UE.proteine * 100)}%` },
    { label: 'Sale', bold: true, value: `${rUE_sale(scaled.sale)} g`, arPct: `${Math.round(p.sale / AR_UE.sale * 100)}%` },
  ].filter(r => {
    if (!r.isOptional) return true;
    return showOptionals && r.optionalKey ? selectedOptionals[r.optionalKey] : false;
  });

  // ── Micronutrienti facoltativi ───────────────────────────────────────────
  interface MicroRow { label: string; val: number; ref: number; unit: string; fmt: (v: number) => string; key: keyof SelectedOptionals; }

  const microRows: MicroRow[] = [
    { label: 'Vitamina A', val: scaled.vitA_eq, ref: AR_UE.vitA_eq, unit: 'µg', fmt: rUE_micro3sig, key: 'vitA' },
    { label: 'Vitamina D', val: scaled.vitD, ref: AR_UE.vitD, unit: 'µg', fmt: rUE_micro3sig, key: 'vitD' },
    { label: 'Vitamina E', val: scaled.vitE, ref: AR_UE.vitE, unit: 'mg', fmt: rUE_micro3sig, key: 'vitE' },
    { label: 'Vitamina K', val: scaled.vitK, ref: AR_UE.vitK, unit: 'µg', fmt: rUE_micro3sig, key: 'vitK' },
    { label: 'Vitamina C', val: scaled.vitC, ref: AR_UE.vitC, unit: 'mg', fmt: rUE_micro3sig, key: 'vitC' },
    { label: 'Vitamina B1 (Tiamina)', val: scaled.vitB1, ref: AR_UE.vitB1, unit: 'mg', fmt: rUE_micro3sig, key: 'vitB1' },
    { label: 'Vitamina B2 (Riboflavina)', val: scaled.vitB2, ref: AR_UE.vitB2, unit: 'mg', fmt: rUE_micro3sig, key: 'vitB2' },
    { label: 'Vitamina B3 (Niacina/PP)', val: scaled.vitB3, ref: AR_UE.vitB3, unit: 'mg', fmt: rUE_micro3sig, key: 'vitB3' },
    { label: 'Vitamina B6', val: scaled.vitB6, ref: AR_UE.vitB6, unit: 'mg', fmt: rUE_micro3sig, key: 'vitB6' },
    { label: 'Acido folico (B9)', val: scaled.vitB9, ref: AR_UE.vitB9, unit: 'µg', fmt: rUE_micro3sig, key: 'vitB9' },
    { label: 'Vitamina B12', val: scaled.vitB12, ref: AR_UE.vitB12, unit: 'µg', fmt: rUE_micro3sig, key: 'vitB12' },
    { label: 'Acido pantotenico (B5)', val: scaled.vitB5, ref: AR_UE.vitB5, unit: 'mg', fmt: rUE_micro3sig, key: 'vitB5' },
    { label: 'Potassio', val: scaled.potassio, ref: AR_UE.potassio, unit: 'mg', fmt: rUE_micro3sig, key: 'potassio' },
    { label: 'Calcio', val: scaled.calcio, ref: AR_UE.calcio, unit: 'mg', fmt: rUE_micro3sig, key: 'calcio' },
    { label: 'Fosforo', val: scaled.fosforo, ref: AR_UE.fosforo, unit: 'mg', fmt: rUE_micro3sig, key: 'fosforo' },
    { label: 'Magnesio', val: scaled.magnesio, ref: AR_UE.magnesio, unit: 'mg', fmt: rUE_micro3sig, key: 'magnesio' },
    { label: 'Ferro', val: scaled.ferro, ref: AR_UE.ferro, unit: 'mg', fmt: rUE_micro2sig, key: 'ferro' },
    { label: 'Zinco', val: scaled.zinco, ref: AR_UE.zinco, unit: 'mg', fmt: rUE_micro2sig, key: 'zinco' },
    { label: 'Rame', val: scaled.rame, ref: AR_UE.rame, unit: 'mg', fmt: rUE_micro3sig, key: 'rame' },
    { label: 'Manganese', val: scaled.manganese, ref: AR_UE.manganese, unit: 'mg', fmt: rUE_micro3sig, key: 'manganese' },
    { label: 'Selenio', val: scaled.selenio, ref: AR_UE.selenio, unit: 'µg', fmt: rUE_micro3sig, key: 'selenio' },
    { label: 'Iodio', val: scaled.iodio, ref: AR_UE.iodio, unit: 'µg', fmt: rUE_micro3sig, key: 'iodio' },
  ].filter(m => showOptionals && selectedOptionals[m.key]);

  return (
    <div data-table-export style={{ background: 'white', padding: 12, borderRadius: 0 }}>
      <div style={{ maxWidth: 'min(500px, 100%)' }}>
        {/* Header */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #999' }}>
          <thead>
            <tr>
              <th style={{ background: '#f5f5f5', border: '1px solid #999', padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 14 }}>
                DICHIARAZIONE NUTRIZIONALE
              </th>
              <th style={{ background: '#f5f5f5', border: '1px solid #999', padding: '8px 10px', textAlign: 'center', fontWeight: 700, fontSize: 13, width: '100px' }}>
                % AR *
              </th>
            </tr>
            <tr>
              <td style={{ background: '#f5f5f5', border: '1px solid #999', padding: '5px 10px', fontSize: 11, fontWeight: 600 }}>
                Valori nutrizionali medi per {unitLabel} di prodotto
              </td>
              <td style={{ background: '#f5f5f5', border: '1px solid #999', padding: '5px 10px' }} />
            </tr>
          </thead>
        </table>

        {/* Corpo tabella */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ ...TS.table, border: '2px solid #999', borderTop: '1px solid #999', width: '100%' }}>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #999' }}>
                  <td style={{
                    padding: '10px 12px',
                    fontSize: r.bold ? 13 : 12,
                    fontWeight: r.bold ? 700 : 400,
                    paddingLeft: r.indent ? 28 : 12,
                    borderRight: '1px solid #999',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <span>{r.label}</span>
                      <span style={{ marginLeft: 20, fontWeight: 600 }}>{r.value}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: r.bold ? 700 : 400, textAlign: 'center', width: '100px' }}>
                    {r.arPct}
                  </td>
                </tr>
              ))}
              {/* Micronutrienti */}
              {microRows.map((m, i) => {
                const pct = rUE_pct(m.val, m.ref);
                return (
                  <tr key={`micro-${i}`} style={{ borderBottom: '1px solid #999' }}>
                    <td style={{ padding: '10px 12px', fontSize: 12, borderRight: '1px solid #999' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span>{m.label}</span>
                        <span style={{ marginLeft: 20, fontWeight: 600 }}>{m.fmt(m.val)} {m.unit}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'center', width: '100px' }}>
                      {pct !== null ? `${pct}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 10, color: '#666', marginTop: 8, lineHeight: 1.4, fontWeight: 500 }}>
          *Assunzioni di riferimento di un adulto medio (8400 kJ / 2000 kcal).
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 1.6: Verifica che `TabUE.tsx` compili**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npx tsc --noEmit 2>&1 | head -30
```

Atteso: errori solo su import mancanti da `NutrizionaleCalc.tsx` (`CalcResult`, `scaleResult`). Se ci sono errori di tipo nelle funzioni `rUE_*`, confronta con il codice originale e correggi.

- [ ] **Step 1.7: Commit checkpoint**

```bash
cd /Users/novanta/Desktop/APP/App_prova
git add src/calculators/NutrizionaleCalc/TabUE.tsx
git commit -m "feat: estrai TabUE in file dedicato con nuove props (EUSubTab, SelectedOptionals)"
```

---

## Task 2: Crea `NutrientSelectModal.tsx`

**Files:**
- Create: `src/calculators/NutrizionaleCalc/NutrientSelectModal.tsx`

- [ ] **Step 2.1: Crea il file `NutrientSelectModal.tsx`**

```tsx
// src/calculators/NutrizionaleCalc/NutrientSelectModal.tsx
import React from 'react';
import { SelectedOptionals, DEFAULT_OPTIONALS } from './TabUE';

interface NutrientSelectModalProps {
  open: boolean;
  onClose: () => void;
  selected: SelectedOptionals;
  onChange: (s: SelectedOptionals) => void;
}

type OptGroup = {
  title: string;
  items: { label: string; key: keyof SelectedOptionals }[];
};

const GROUPS: OptGroup[] = [
  {
    title: 'Nutrienti facoltativi',
    items: [
      { label: 'Acidi grassi monoinsaturi', key: 'monoins' },
      { label: 'Acidi grassi polinsaturi', key: 'polins' },
      { label: 'Polioli', key: 'polioli' },
      { label: 'Amido', key: 'amido' },
    ],
  },
  {
    title: 'Sali minerali',
    items: [
      { label: 'Potassio', key: 'potassio' },
      { label: 'Calcio', key: 'calcio' },
      { label: 'Fosforo', key: 'fosforo' },
      { label: 'Magnesio', key: 'magnesio' },
      { label: 'Ferro', key: 'ferro' },
      { label: 'Zinco', key: 'zinco' },
      { label: 'Rame', key: 'rame' },
      { label: 'Manganese', key: 'manganese' },
      { label: 'Selenio', key: 'selenio' },
      { label: 'Iodio', key: 'iodio' },
    ],
  },
  {
    title: 'Vitamine',
    items: [
      { label: 'Vitamina A', key: 'vitA' },
      { label: 'Vitamina D', key: 'vitD' },
      { label: 'Vitamina E', key: 'vitE' },
      { label: 'Vitamina K', key: 'vitK' },
      { label: 'Vitamina C', key: 'vitC' },
      { label: 'Vitamina B1 (Tiamina)', key: 'vitB1' },
      { label: 'Vitamina B2 (Riboflavina)', key: 'vitB2' },
      { label: 'Vitamina B3 (Niacina/PP)', key: 'vitB3' },
      { label: 'Vitamina B6', key: 'vitB6' },
      { label: 'Acido folico (B9)', key: 'vitB9' },
      { label: 'Vitamina B12', key: 'vitB12' },
      { label: 'Acido pantotenico (B5)', key: 'vitB5' },
    ],
  },
];

export function NutrientSelectModal({ open, onClose, selected, onChange }: NutrientSelectModalProps) {
  if (!open) return null;

  const toggleAll = (group: OptGroup, value: boolean) => {
    const patch: Partial<SelectedOptionals> = {};
    group.items.forEach(item => { patch[item.key] = value; });
    onChange({ ...selected, ...patch });
  };

  const allSelected = (group: OptGroup) => group.items.every(i => selected[i.key]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 10, padding: 24, width: 'min(480px, 90vw)', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-navy)' }}>
            Configura nutrienti facoltativi
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}
            aria-label="Chiudi"
          >×</button>
        </div>

        {/* Gruppi */}
        {GROUPS.map(group => (
          <div key={group.title} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-navy)', borderBottom: '1px solid var(--color-border)', paddingBottom: 4, flex: 1 }}>
                {group.title}
              </div>
              <button
                onClick={() => toggleAll(group, !allSelected(group))}
                style={{ fontSize: 11, color: 'var(--color-orange)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginLeft: 12, whiteSpace: 'nowrap' }}
              >
                {allSelected(group) ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
              {group.items.map(item => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selected[item.key]}
                    onChange={e => onChange({ ...selected, [item.key]: e.target.checked })}
                    style={{ width: 14, height: 14, accentColor: 'var(--color-orange)', cursor: 'pointer' }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={() => onChange({ ...DEFAULT_OPTIONALS })}
            style={{ fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Reset tutto
          </button>
          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: 13 }}>
            Conferma
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2.2: Verifica compilazione**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npx tsc --noEmit 2>&1 | grep "NutrientSelectModal"
```

Atteso: nessun errore relativo a `NutrientSelectModal.tsx`.

- [ ] **Step 2.3: Commit checkpoint**

```bash
cd /Users/novanta/Desktop/APP/App_prova
git add src/calculators/NutrizionaleCalc/NutrientSelectModal.tsx
git commit -m "feat: aggiungi NutrientSelectModal per selezione nutrienti facoltativi EU"
```

---

## Task 3: Aggiorna `NutrizionaleCalc.tsx` — stato, imports, rimozione vecchio codice

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

- [ ] **Step 3.1: Aggiungi imports in cima al file**

Trova la sezione imports esistente (prime ~50 righe) e aggiungi:

```tsx
import { TabUE, NutrientSelectModal } from './TabUE'; // aggiungi TabUE
import { NutrientSelectModal } from './NutrientSelectModal';
import type { EUSubTab, SelectedOptionals } from './TabUE';
```

Nota: `TabUE` è già definita inline — la rimuoveremo al Step 3.3. Per ora aggiungi solo gli import di tipo.

Struttura corretta degli import da aggiungere in cima, dopo gli import React esistenti:

```tsx
import { TabUE } from './TabUE';
import { NutrientSelectModal } from './NutrientSelectModal';
import type { EUSubTab, SelectedOptionals, DEFAULT_OPTIONALS } from './TabUE';
```

Correggi: `DEFAULT_OPTIONALS` è un valore, non un tipo:

```tsx
import { TabUE, DEFAULT_OPTIONALS } from './TabUE';
import { NutrientSelectModal } from './NutrientSelectModal';
import type { EUSubTab, SelectedOptionals } from './TabUE';
```

- [ ] **Step 3.2: Aggiungi i nuovi state nella funzione `NutrizionaleCalc()`**

Trova la riga 1218 (`const [showOptionals, setShowOptionals] = useState(false);`) e aggiungi subito dopo:

```tsx
const [euSubTab, setEuSubTab] = useState<EUSubTab>('100g');
const [selectedOptionals, setSelectedOptionals] = useState<SelectedOptionals>({ ...DEFAULT_OPTIONALS });
const [nutrModalOpen, setNutrModalOpen] = useState(false);
```

- [ ] **Step 3.3: Rimuovi il vecchio `TabUE` inline e le funzioni `rUE_*`**

Rimuovi dal file:
- Le funzioni `fUE`, `rUE_energy`, `rUE_macro`, `rUE_sat`, `rUE_sale`, `rUE_micro3sig`, `rUE_micro2sig`, `rUE_pct` (righe ~159-194)
- La costante `AR_UE` — **ATTENZIONE**: verifica prima con grep se `AR_UE` è usata anche altrove nel file oltre che in `TabUE`:
  ```bash
  grep -n "AR_UE" /Users/novanta/Desktop/APP/App_prova/src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
  ```
  Se è usata solo in `TabUE`, rimuovila. Se è usata altrove, lasciarla e importarla da `TabUE.tsx` esportandola.
- La definizione `function TabUE(...)` con tutto il corpo (righe 3127-3232)
- Il shared style `TS` — **ATTENZIONE**: verifica se `TS` è usato anche da altri componenti inline nel file (TabUSA, TabCanada, ecc.):
  ```bash
  grep -n "\bTS\." /Users/novanta/Desktop/APP/App_prova/src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
  ```
  Se `TS` è usato da TabUSA/TabCanada/ecc., non rimuoverlo — esportalo da `TabUE.tsx` e importalo in `NutrizionaleCalc.tsx`.

- [ ] **Step 3.4: Verifica compilazione dopo rimozioni**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npx tsc --noEmit 2>&1 | head -40
```

Risolvi tutti gli errori prima di procedere. Errori tipici attesi:
- `AR_UE` non trovata → esporta da `TabUE.tsx` e importa
- `TS` non trovata → esporta da `TabUE.tsx` e importa
- `scaleResult` non trovata in `TabUE.tsx` → cerca la definizione e aggiungila/importala

- [ ] **Step 3.5: Commit checkpoint**

```bash
cd /Users/novanta/Desktop/APP/App_prova
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "refactor: sposta TabUE e funzioni rUE_* in file dedicato"
```

---

## Task 4: Aggiorna le due occorrenze di `<TabUE>` con nuove props + UI subtab

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`

Le due occorrenze di `<TabUE>` sono a:
- Riga ~2371 (wizard Step 3 — anteprima)
- Riga ~3054 (vista avanzata non-wizard)

Per entrambe, la struttura da implementare è identica.

- [ ] **Step 4.1: Aggiorna la prima occorrenza `<TabUE>` (wizard Step 3, riga ~2371)**

Trova il blocco:
```tsx
{activeTab === 'UE' && <TabUE p={per100display} ue={ue} specificGravity={parseFloat(specificGravity) || 0} full={showOptionals} />}
```

Sostituisci con:
```tsx
{activeTab === 'UE' && (
  <>
    {/* Subtab selector — visibile solo se almeno un valore ue è definito */}
    {/* Nota: usare ternary, non &&, perché ue.porzione è number e React renderebbe "5" nel DOM */}
    {(ue.porzione != null || ue.confezione != null || ue.pezzo != null) ? (
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {([
          { key: '100g' as EUSubTab, label: 'Per 100g' },
          { key: 'uv' as EUSubTab, label: 'Per U.V.', disabled: !ue.confezione },
          { key: 'porzione' as EUSubTab, label: 'Per porzione', disabled: !ue.porzione },
          { key: 'pezzo' as EUSubTab, label: 'Per pezzo', disabled: !ue.pezzo },
        ]).map(t => (
          <button
            key={t.key}
            disabled={t.disabled}
            onClick={() => setEuSubTab(t.key)}
            className={`btn ${euSubTab === t.key ? 'btn-accent' : 'btn-outline'}`}
            style={{ fontSize: 11, padding: '4px 10px', opacity: t.disabled ? 0.4 : 1 }}
          >
            {t.label}
          </button>
        ))}
      </div>
    ) : null}
    <TabUE
      p={per100display}
      ue={ue}
      specificGravity={parseFloat(specificGravity) || 0}
      selectedOptionals={selectedOptionals}
      showOptionals={showOptionals}
      activeSubTab={euSubTab}
    />
  </>
)}
```

- [ ] **Step 4.2: Aggiorna anche il blocco "Mostra valori facoltativi" vicino alla prima occorrenza (riga ~2377)**

Trova il blocco con il checkbox `showOptionals` vicino alla prima occorrenza e sostituisci:

```tsx
{activeTab === 'UE' && (
  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-muted)' }}>
      <input
        type="checkbox"
        checked={showOptionals}
        onChange={e => setShowOptionals(e.target.checked)}
        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-orange)' }}
      />
      Mostra valori facoltativi
    </label>
    {showOptionals && (
      <button
        onClick={() => setNutrModalOpen(true)}
        className="btn btn-outline"
        style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
      >
        ⚙ Configura nutrienti
      </button>
    )}
  </div>
)}
```

- [ ] **Step 4.3: Aggiorna la seconda occorrenza `<TabUE>` (vista avanzata, riga ~3054)**

Trova il blocco analogo nella vista avanzata e applica la stessa sostituzione di Step 4.1 e 4.2.

- [ ] **Step 4.4: Aggiungi `<NutrientSelectModal>` una volta sola nel JSX del componente**

Subito prima del `return` finale di `NutrizionaleCalc()`, o subito dentro il `return` prima di tutto il resto, aggiungi:

```tsx
<NutrientSelectModal
  open={nutrModalOpen}
  onClose={() => setNutrModalOpen(false)}
  selected={selectedOptionals}
  onChange={setSelectedOptionals}
/>
```

Posizione suggerita: subito dopo `<SavedTablesModal .../>` esistente, oppure come primo figlio del fragment/div radice del return.

- [ ] **Step 4.5: Verifica compilazione completa**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npx tsc --noEmit 2>&1
```

Atteso: 0 errori. Risolvi qualsiasi errore prima di continuare.

- [ ] **Step 4.6: Avvia dev server e verifica manuale**

```bash
cd /Users/novanta/Desktop/APP/App_prova && npm run dev
```

Apri il browser, vai al calcolatore nutrizionale e verifica:

1. **Tabella EU base** — si visualizza correttamente (valori identici a prima)
2. **Bug fix fibre** — la riga "Fibre" mostra `—` nella colonna % AR (non una percentuale)
3. **Subtab selector** — compare solo se si inserisce almeno un valore (porzione/U.V./pezzo) nello Step Mercati
4. **Subtab funzionamento** — cliccando "Per U.V." i valori scalano correttamente
5. **Toggle facoltativi** — il checkbox "Mostra valori facoltativi" funziona come prima
6. **Bottone "⚙ Configura nutrienti"** — compare solo quando il toggle è attivo
7. **Modal** — si apre, le checkbox funzionano, "Seleziona tutti/Deseleziona tutti" per gruppo funziona
8. **Nutrienti selezionati** — compaiono in tabella dopo conferma
9. **Reset tutto** — azzera tutte le selezioni
10. **Chiusura modal** — X e click fuori chiudono il modal

- [ ] **Step 4.7: Commit finale**

```bash
cd /Users/novanta/Desktop/APP/App_prova
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "feat: tabella EU — subtab 100g/UV/porzione/pezzo + modal selezione nutrienti facoltativi"
```

---

## Task 5: Aggiorna input label UE nello Step Mercati (se necessario)

**Files:**
- Modify: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` (righe ~2257-2270 e ~2975-2990)

- [ ] **Step 5.1: Aggiorna label "Confezione" → "U.V. / Confezione"**

Le label attuali per i campi UE sono: `['Porzione (g/ml)', 'Confezione (g/ml)', 'Pezzo (g/ml)']`.

Aggiorna la label di `confezione` per renderla più chiara:

```tsx
const labels = ['Porzione (g/ml)', 'U.V. / Confezione (g/ml)', 'Pezzo (g/ml)'];
```

Questo cambiamento va applicato in **entrambe** le occorrenze dell'array labels nei blocchi UE (wizard e vista avanzata). Cerca con:

```bash
grep -n "Porzione (g/ml)" /Users/novanta/Desktop/APP/App_prova/src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
```

- [ ] **Step 5.2: Verifica visiva nel browser**

Con `npm run dev` aperto, vai allo Step Mercati (o sezione mercati nella vista avanzata) e verifica che i 3 campi UE mostrino le label aggiornate.

- [ ] **Step 5.3: Commit**

```bash
cd /Users/novanta/Desktop/APP/App_prova
git add src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx
git commit -m "fix: aggiorna label input UE 'Confezione' → 'U.V. / Confezione'"
```

---

## Checklist di verifica finale

Prima di dichiarare il blocco EU completato, verifica manualmente:

- [ ] Tabella EU per 100g: identica a prima (nessuna regressione)
- [ ] Fibre: colonna % AR mostra `—` (non una percentuale)
- [ ] Con valori U.V./porzione/pezzo inseriti: subtab bar compare
- [ ] Tab disabilitate se il valore corrispondente non è inserito
- [ ] Switching tab: i valori in tabella cambiano coerentemente
- [ ] Toggle "Mostra valori facoltativi": on/off funziona
- [ ] Con toggle off: bottone "⚙ Configura nutrienti" non compare
- [ ] Con toggle on: bottone "⚙ Configura nutrienti" compare
- [ ] Modal si apre e si chiude correttamente (X, click fuori, Conferma)
- [ ] Selezione/deselezione singola nutriente: funziona
- [ ] "Seleziona tutti" per gruppo: funziona
- [ ] "Deseleziona tutti" per gruppo: funziona
- [ ] "Reset tutto": azzera tutte le selezioni
- [ ] Nutrienti selezionati compaiono in tabella con valori corretti
- [ ] Verifica in ENTRAMBE le modalità: wizard Step 3 e vista avanzata
- [ ] Download PNG: funziona ancora correttamente
- [ ] TypeScript: `npx tsc --noEmit` → 0 errori
