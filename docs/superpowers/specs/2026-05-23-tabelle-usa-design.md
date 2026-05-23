# Design Spec — Tabella USA: fix visivo e varianti misura

**Data:** 2026-05-23  
**Progetto:** AEA Consulenze Alimentari  
**Blocco:** 2 di 5 (EU → USA → Canada → Australia → Arabi)  
**Standard di riferimento:** FDA 21 CFR 101.9

---

## 1. Obiettivo

Tre interventi sulla Tabella USA:
1. **Fix visivo** — layout FDA-compliant per verticale, orizzontale, lineare (font, spessori righe, gerarchia grassetti)
2. **Varianti misura** — pill-bar 2° livello: g / tazze / cucchiai / pezzi (numero calcolato automaticamente)
3. **Varianti riferimento** — pill-bar 1° livello: Serving / Confezione

---

## 2. File coinvolti

### Creati
- `src/calculators/NutrizionaleCalc/TabUSA.tsx`  
  Contiene: componente `TabUSA`, funzioni `rUSA_*`, logica scala e label serving, tutti e 3 i layout.

### Modificati
- `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`  
  Rimozione vecchio inline `TabUSA` e funzioni `rUSA_*`, aggiunta stati `usaServingRef` e `usaMeasure`, pill-bar a 2 livelli, importazione nuovo componente.

### Non toccati
- `src/calculators/NutrizionaleCalc/TabUE.tsx`
- `src/calculators/NutrizionaleCalc/NutrientSelectModal.tsx`
- `src/engines/nutritionalEngine.ts`
- `src/logic/localizationModule.ts`
- Tutti gli altri calcolatori

---

## 3. Stato aggiunto in `NutrizionaleCalc.tsx`

```typescript
type USAServingRef = 'serving' | 'confezione'
type USAMeasure = 'g' | 'tazze' | 'cucchiai' | 'pezzi'
const [usaServingRef, setUsaServingRef] = useState<USAServingRef>('serving')
const [usaMeasure, setUsaMeasure] = useState<USAMeasure>('g')
```

Pill-bar 1° livello (Serving / Confezione): visibile solo se `usa.confezione` è definito e > 0.  
Pill-bar 2° livello (g / tazze / cucchiai / pezzi): sempre visibile nella tab USA; tazze disabilitata se `usa.cup` non inserito, cucchiai se `usa.cucchiaio` non inserito, pezzi se `usa.pezzo` non inserito.

Reset: se `usaServingRef === 'confezione'` e `usa.confezione` viene azzerato → reset a `'serving'`. Se `usaMeasure` perde il campo di riferimento → reset a `'g'`. Implementare con `useEffect`.

---

## 4. Logica calcolo label serving size

I campi esistenti in `ServingSizesNation`:
- `cup?: number` — peso in grammi di 1 tazza (240ml USA)
- `cucchiaio?: number` — peso in grammi di 1 cucchiaio (15ml)
- `serving?: number` — grammi della serving size
- `confezione?: number` — grammi della confezione
- `pezzo?: number` — grammi di 1 pezzo

**Peso di riferimento** (`refGrams`):
- `usaServingRef === 'serving'` → `usa.serving ?? 0`
- `usaServingRef === 'confezione'` → `usa.confezione ?? 0`

**Label misura** (arrotondata a 1 decimale):
| `usaMeasure` | Serving label | Confezione label |
|---|---|---|
| `'g'` | `Serving size {refGrams} g` | `container {refGrams} g` |
| `'tazze'` | `Serving size {(refGrams/cup).toFixed(1)} cup ({refGrams}g)` | `container {(refGrams/cup).toFixed(1)} cup ({refGrams}g)` |
| `'cucchiai'` | `Serving size {(refGrams/cucchiaio).toFixed(1)} tablespoon ({refGrams}g)` | `container {(refGrams/cucchiaio).toFixed(1)} tablespoon ({refGrams}g)` |
| `'pezzi'` | `Serving size {(refGrams/pezzo).toFixed(1)} pieces ({refGrams}g)` | `container {(refGrams/pezzo).toFixed(1)} pieces ({refGrams}g)` |

**Servings per container** = `(usa.confezione ?? 0) / (usa.serving ?? 1)` arrotondato a 1 decimale.  
Se `usa.confezione` non è inserito → mostrare `"1 servings per container"`.

**Valori nutrizionali scalati** = `scaleResult(p, refGrams)` (usa `scaleResult` già presente in `NutrizionaleCalc.tsx`).

**"Amount per serving" vs "Amount per container"**:
- `usaServingRef === 'serving'` → `Amount per serving`
- `usaServingRef === 'confezione'` → `Amount per container`

---

## 5. Componente `TabUSA.tsx`

### Props
```typescript
interface TabUSAProps {
  p: CalcResult
  usa: ServingSizesNation
  specificGravity: number
  servingRef: USAServingRef
  measure: USAMeasure
  subTab: 'verticale' | 'orizzontale' | 'lineare'
  full: boolean
}
```

### Layout verticale — struttura HTML/CSS

```
┌─────────────────────────────────┐  border: 3px solid black
│ Nutrition Facts                 │  font: Arial Black ~36px bold
│ X servings per container        │  font: 11px
│ Serving size    [label] [grams] │  font: 13px, "Serving size" normal, label+grams bold
├═════════════════════════════════╡  border-top: 8px solid black
│ Amount per serving              │  font: 10px
│ Calories              NNN       │  "Calories" 20px, NNN 40px bold right
├─────────────────────────────────╡  border-top: 4px solid black
│                    % Daily Value│  11px right-aligned
│ Total Fat Xg              Y%    │  bold label, value left, % right
│   Saturated Fat Xg        Y%   │  indent 16px
│   Trans Fat Xg                 │  indent 16px, no %DV
│ Cholesterol Xmg           Y%   │  bold label
│ Sodium Xmg                Y%   │  bold label
│ Total Carbohydrate Xg     Y%   │  bold label
│   Dietary Fiber Xg        Y%  │  indent 16px
│   Total Sugars Xg              │  indent 16px, no %DV
│     Includes Xg Added Sugars 0%│  indent 24px
│ Protein Xg                     │  bold label, no %DV
├─────────────────────────────────╡  border-top: 1px solid black (thin)
│ Vit D Xmcg Y% · Calcium Xmg Y%│  11px, vitamins inline con ·
│ · Iron Xmg Y% · Potassium Xmg  │
├─────────────────────────────────╡  border-top: 1px solid black
│ *The % Daily Value (DV) tells   │  9px, multiline footnote
│ you how much a nutrient in a   │
│ serving of food contributes... │
└─────────────────────────────────┘
```

### Layout orizzontale

4 colonne in flexbox:
- **Col 1** (fixed ~130px): "Nutrition | Facts" stacked, servings, serving size, "Calories NNN"
- **Col 2** (flex): nutrienti colonna sinistra con Amount/serving + %DV
- **Col 3** (flex): nutrienti colonna destra con Amount/serving + %DV
- **Col 4** (fixed ~130px): footnote rotated o verticale

I nutrienti vengono distribuiti in 2 colonne: col sinistra (Fat, Sat, Trans, Cholesterol, Sodium, Total Carb) col destra (Fiber, Total Sugars, Added Sugars, Protein, vitamins).

### Layout lineare

4 righe di testo inline:
```
Riga 1: Nutrition Facts  Servings: X,  Serv.size: [label] ([grams]g),
Riga 2: Amount per Serving: Calories NNN,  Total Fat Xg ( Y% DV),  Sat.Fat Xg ( Y% DV),
Riga 3: Trans Fat Xg,  Cholest. Xmg ( Y% DV),  Sodium Xmg ( Y% DV),  Total Carb. Xg ( Y% DV),
Riga 4: Fiber Xg ( Y% DV),  Total Sugars Xg  (Incl. Xg Added Sugars, Y% DV),  Protein Xg,
Riga 5: Vit.D ( Y% DV),  Calcium ( Y% DV),  Iron ( Y% DV),  Potas. ( Y% DV).
```

"Nutrition Facts" in bold, valori in bold, label in normale.

---

## 6. Funzioni di arrotondamento (invariate, spostate in TabUSA.tsx)

```typescript
function rUSA_energy(v: number): number
  // <5 → 0; 5-50 → round to 5; >50 → round to 10

function rUSA_g(v: number): string
  // <0.5 → "0"; else Math.round(v)

function rUSA_mg5(v: number): string
  // <5 → "0"; else round to nearest 5

function rUSA_pct(v: number, dv: number): number
  // Math.round(v / dv * 100)
```

---

## 7. Modifiche UI in `NutrizionaleCalc.tsx`

Nella sezione USA (wizard Step 3 e vista avanzata):

**Pill-bar 1° livello** (visibile solo se `usa.confezione > 0`):
```
[ Serving ] [ Confezione ]
```

**Pill-bar 2° livello** (sempre visibile nella tab USA):
```
[ g/ml ]  [ Tazze ]  [ Cucchiai ]  [ Pezzi ]
```
Tazze disabilitata se `!usa.cup`, Cucchiai se `!usa.cucchiaio`, Pezzi se `!usa.pezzo`.

Entrambe le pill-bar precedono `<TabUSA>` in entrambe le occorrenze (wizard + vista avanzata).

---

## 8. Rischi e cautele

| Rischio | Mitigazione |
|---------|-------------|
| `TabUSA` usata in 2 posti (wizard + avanzata) | Aggiornare entrambe le occorrenze |
| `rUSA_*` usate altrove | Grep prima di rimuoverle |
| `DV_USA` usato altrove | Mantenere in `NutrizionaleCalc.tsx` o esportare da `TabUSA.tsx` |
| `full` prop esistente | Mantenere compatibilità — `full={showOptionals}` |
| `subTab` prop esistente | Mantenere — viene dal selettore verticale/orizzontale/lineare già presente |

---

## 9. Fuori scope (prossimi blocchi)

- Modal selezione nutrienti facoltativi per USA (da valutare nel blocco Canada/future iterazioni)
- Tabella Canada, Australia, Arabi
