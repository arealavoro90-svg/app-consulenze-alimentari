# Design Spec — Tabella Europea: fix e nuove funzionalità

**Data:** 2026-05-23  
**Progetto:** AEA Consulenze Alimentari  
**Blocco:** 1 di 5 (EU → USA → Canada → Australia → Arabi)  
**Standard di riferimento:** EU Reg. 1169/2011

---

## 1. Obiettivo

Correggere il bug % AR fibre e aggiungere tre funzionalità alla Tabella Europea:
1. Selettore colonna di riferimento (100g / U.V. / porzione / pezzo)
2. Modal di selezione individuale nutrienti facoltativi (facoltativi base + minerali + vitamine)
3. Rimozione % AR per le fibre (non prevista dalla normativa EU)

---

## 2. File coinvolti

### Creati
- `src/calculators/NutrizionaleCalc/TabUE.tsx`  
  Contiene: componente `TabUE`, tutte le funzioni `rUE_*()`, rendering tabella EU completo.

- `src/calculators/NutrizionaleCalc/NutrientSelectModal.tsx`  
  Contiene: modal con checkbox organizzate in 3 sezioni (facoltativi base / sali minerali / vitamine).

### Modificati
- `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`  
  Rimozione di `TabUE()` e funzioni `rUE_*` (spostate), aggiunta nuovo stato `euSubTab` e `selectedOptionals`, importazione nuovi componenti.

### Non toccati
- `src/engines/nutritionalEngine.ts`
- `src/logic/localizationModule.ts`
- `src/utils/regionalFormats.ts`
- Tutti gli altri calcolatori e tabelle (USA, Canada, Australia, Arabi)

---

## 3. Stato aggiunto in `NutrizionaleCalc.tsx`

```typescript
// Selettore colonna di riferimento EU
type EUSubTab = '100g' | 'uv' | 'porzione' | 'pezzo'
const [euSubTab, setEuSubTab] = useState<EUSubTab>('100g')

// Selezione nutrienti facoltativi (tutti false di default)
interface SelectedOptionals {
  // Facoltativi base
  monoins: boolean; polins: boolean; polioli: boolean; amido: boolean;
  // Sali minerali
  potassio: boolean; calcio: boolean; fosforo: boolean; magnesio: boolean;
  ferro: boolean; zinco: boolean; rame: boolean; manganese: boolean;
  selenio: boolean; iodio: boolean;
  // Vitamine
  vitA: boolean; vitD: boolean; vitE: boolean; vitK: boolean; vitC: boolean;
  vitB1: boolean; vitB2: boolean; vitB3: boolean; vitB6: boolean;
  vitB9: boolean; vitB12: boolean; vitB5: boolean;
}
const [selectedOptionals, setSelectedOptionals] = useState<SelectedOptionals>({
  monoins: false, polins: false, polioli: false, amido: false,
  potassio: false, calcio: false, fosforo: false, magnesio: false,
  ferro: false, zinco: false, rame: false, manganese: false,
  selenio: false, iodio: false,
  vitA: false, vitD: false, vitE: false, vitK: false, vitC: false,
  vitB1: false, vitB2: false, vitB3: false, vitB6: false,
  vitB9: false, vitB12: false, vitB5: false,
})
```

Lo stato `ue: UEServing` esistente (`{ porzione, confezione, pezzo }`) rimane invariato.  
`euSubTab = 'uv'` corrisponde a `ue.confezione`.

---

## 4. Componente `TabUE.tsx`

### Props
```typescript
interface TabUEProps {
  p: CalcResult           // valori per 100g (da NutrizionaleCalc)
  ue: UEServing           // { porzione?, confezione?, pezzo? }
  specificGravity: number
  selectedOptionals: SelectedOptionals
  showOptionals: boolean  // toggle globale nutrienti facoltativi
  activeSubTab: EUSubTab
}
```

### Comportamento subtab
Il componente calcola internamente il `CalcResult` scalato:
- `'100g'` → usa `p` direttamente
- `'uv'` → `scaleResult(p, ue.confezione!)`
- `'porzione'` → `scaleResult(p, ue.porzione!)`
- `'pezzo'` → `scaleResult(p, ue.pezzo!)`

Il selettore subtab è **visibile solo se almeno uno** tra `ue.confezione`, `ue.porzione`, `ue.pezzo` è definito e > 0. Se tutti sono assenti, la tabella mostra solo "Per 100g" senza tab.

### Bug fix % AR fibre
La riga Fibre non mostra percentuale AR:
```tsx
<tr>
  <td>Fibre</td>
  <td>{rUE_macro(scaled.fibre)} g</td>
  <td>—</td>
</tr>
```

### Rendering nutrienti facoltativi
I nutrienti facoltativi vengono mostrati solo se `showOptionals === true` **e** il relativo campo in `selectedOptionals` è `true`.  
Se il valore calcolato è 0 e il nutriente è selezionato, la riga viene comunque mostrata (comportamento corretto — l'utente ha scelto esplicitamente di includerlo).

---

## 5. Componente `NutrientSelectModal.tsx`

### Struttura UI
Modal con 3 sezioni:

**Sezione 1 — Nutrienti facoltativi**
- Acidi grassi monoinsaturi, Acidi grassi polinsaturi, Polioli, Amido

**Sezione 2 — Sali minerali**
- Potassio, Calcio, Fosforo, Magnesio, Ferro, Zinco, Rame, Manganese, Selenio, Iodio

**Sezione 3 — Vitamine**
- Vitamina A, D, E, K, C, B1, B2, PP (B3), B6, Acido folico (B9), B12, Acido pantotenico (B5)

Ogni sezione ha un bottone "Seleziona tutti / Deseleziona tutti".  
Modal chiudibile con X o click fuori.

### Accesso
Bottone "⚙ Configura nutrienti" visibile **solo** quando `showOptionals === true`.  
Se `showOptionals` è disattivato, il bottone sparisce e la tabella torna a mostrare solo nutrienti obbligatori.

---

## 6. Modifiche UI in `NutrizionaleCalc.tsx`

Nella sezione EU (sia wizard Step 3/anteprima che Step 4/export):

1. **Tab selector** (pill bar): `Per 100g | Per U.V. | Per porzione | Per pezzo`  
   Visibile solo se almeno un valore `ue` è definito. Tab disabilitato se il relativo valore `ue` non è inserito.

2. **Bottone "⚙ Configura nutrienti"** (solo se `showOptionals = true`)  
   Apre `NutrientSelectModal`.

3. **Input U.V./porzione/pezzo**: verificare che gli input per `ue.confezione`, `ue.porzione`, `ue.pezzo` siano presenti nello Step Mercati. Se mancanti, aggiungerli con la stessa UI degli input analoghi già esistenti per USA/Canada.

---

## 7. Rischi e cautele

| Rischio | Mitigazione |
|---------|-------------|
| `TabUE` usata in 2 posti nel wizard | Aggiornare entrambe le occorrenze con le nuove props |
| Funzioni `rUE_*` spostate in nuovo file | Verificare che non siano usate altrove in `NutrizionaleCalc.tsx` con grep prima di rimuoverle |
| Micronutrienti a 0 se non inseriti negli ingredienti | Comportamento corretto: la riga compare se selezionata |
| `localizationModule.ts` impatta tutti i calcolatori | Non toccarlo — le funzioni EU rimangono inline in `TabUE.tsx` |

---

## 8. Fuori scope (prossimi blocchi)

- Tabella USA: fix formato + varianti tazze/cucchiai/pezzi per serving e confezione
- Tabella Canada: redesign completo + varianti bilingui
- Tabella Australia: redesign completo layout NUTRITION INFORMATION
- Tabella Paesi Arabi: redesign + varianti
