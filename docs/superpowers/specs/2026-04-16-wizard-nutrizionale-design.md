# Design: Wizard Guidato — NutrizionaleCalc

**Data:** 2026-04-16  
**Scope:** Aggiunta modalità wizard step-by-step con toggle "Guidata / Avanzata" al tool Creazione Tabelle Nutrizionali.

---

## 1. Obiettivo

Introdurre una modalità guidata (wizard a 4 passi) nell'esistente `NutrizionaleCalc`, senza rimuovere il form avanzato. Un toggle in cima all'interfaccia permette di passare tra le due modalità. Lo stato della ricetta è condiviso: cambiare modalità non azzera i dati.

---

## 2. Architettura

### 2.1 Nessun nuovo file

L'implementazione avviene interamente dentro `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`. Non si aggiungono componenti file separati per il wizard (il file è già monolitico by design).

### 2.2 Nuovo stato (2 variabili)

```ts
const [wizardMode, setWizardMode] = useLocalStorage<boolean>('nutri_wizard_mode', true);
const [wizardStep, setWizardStep] = useState<0|1|2|3>(0);
```

- `wizardMode`: persiste tra sessioni. Default `true` (wizard attivo al primo accesso).
- `wizardStep`: locale, si resetta a 0 quando si passa alla modalità guidata o si crea una nuova ricetta.

### 2.3 Rendering condizionale

Il return della funzione `NutrizionaleCalc` mantiene:
1. **Header comune**: toggle + nome prodotto + bottoni archivio/nuovo
2. **Body**: branch su `wizardMode`
   - `true` → `<WizardView step={wizardStep} onStep={setWizardStep} {...allProps} />`
   - `false` → form avanzato esistente (invariato)

`WizardView` è una function component **inline** (non file separato), dichiarata subito sopra il return del componente principale.

---

## 3. Toggle UI

Posizione: in alto a destra nell'header, accanto ai bottoni "Nuovo" e "Archivio".

```
[ 🧭 Guidata  |  ⚙ Avanzata ]
```

- Pill a due stati con bordo arrotondato
- L'opzione attiva ha sfondo `var(--color-primary)` e testo bianco
- Cambio modalità: `setWizardMode(!wizardMode)` + `setWizardStep(0)`

---

## 4. I 4 passi del wizard

### Passo 1 — Prodotto
Campi: `productName`, `finishedWeight`, `specificGravity`, `components[0].pzUV`.  
Validazione prima di avanzare: `productName` non vuoto.

### Passo 2 — Ingredienti
Interfaccia identica all'attuale sezione componenti (ricerca DB, aggiunta righe, quantità g).  
Supporta tutti i componenti (fino a 4), con tab per passare tra di essi.  
Validazione prima di avanzare: almeno 1 ingrediente inserito.

### Passo 3 — Mercati & Serving size
Selezione mercati attivi (checkbox pill: UE, USA, Canada, Australia, Arabi).  
Per ogni mercato selezionato: form serving size collassabile inline (stesso UI attuale).  
Validazione: nessuna obbligatoria (serving size è facoltativo).

### Passo 4 — Anteprima & Export
Mostra la tabella nutrizionale (tab UE di default, con switcher nazione).  
Bottoni: PDF, PNG, Salva in archivio.  
Stessa logica export esistente (`handlePDF`, `handleDownloadPNG`, `handleDownloadEtichettaPDF`).

---

## 5. Progress bar & navigazione

```
● Prodotto ── ── ● Ingredienti ── ── ○ Mercati ── ── ○ Export
████████████████░░░░░░░░░░░░░░░░  Passo 2 di 4
```

- Step completati: cerchio pieno verde
- Step corrente: cerchio pieno blu con glow
- Step futuri: cerchio vuoto grigio
- Barra percentuale animata con `transition: width 0.4s ease`

Footer del wizard: `[← Indietro]` (disabilitato al passo 1) + contatore + `[Avanti →]` (diventa `[✅ Genera]` all'ultimo passo).

---

## 6. Validazione

Blocca l'avanzamento se:
- Passo 1: `productName.trim() === ''`
- Passo 2: `allRows.length === 0`
- Passo 3 e 4: nessun blocco

In caso di errore: mostra messaggio inline sotto il campo mancante (stesso sistema `fieldErrors` già in uso).

---

## 7. Comportamento "Nuova ricetta"

Il `handleNew` esistente viene esteso con `setWizardStep(0)` per riportare il wizard al primo passo.  
La modale `window.confirm` viene sostituita con un dialog custom (già pianificato in TODO) — **fuori scope** per questa feature.

---

## 8. Cosa NON cambia

- Tutto il motore di calcolo (`calcNutrients`, `per100g`, arrotondamenti per nazione)
- Le tabelle nutrizionali (UE/USA/Canada/Australia/Arabi) — identiche
- Il sistema di archivio (`useArchive`)
- Il modal "Aggiungi ingrediente custom" (`CustomIngredientModal`)
- Il modal "Tabelle salvate" (`SavedTablesModal`)
- I fattori energetici (EU Reg. 1169/2011)
- Nessuna nuova dipendenza npm

---

## 9. Stile

Nessun CSS framework esterno. Gli stili del wizard usano inline style (come il resto del componente), con le variabili CSS già definite (`--color-primary`, `--color-border`, ecc.).
