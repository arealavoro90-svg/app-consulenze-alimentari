# Workflow Calcolatori — AEA Consulenze Alimentari

> Aggiornato: 2026-09-10

---

## 1. Tabelle Valori Nutrizionali (`nutrizionale`)

**File principale:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`  
**Engine:** `src/engines/nutrizionaleCalcEngine.ts` (`calcNutrients`, `scaleResult`, `calcClaims`)  
**Archive key:** `nutrizionale-v3` / tool `nutrizionale`

### Flusso dati
1. L'utente inserisce gli ingredienti (nome + grammi) tramite UI.
2. `useIngredientsDB` recupera i valori dal backend (`/api/ingredients/`).
3. `calcNutrients(rows, resaPercent?)` calcola i nutrienti per 100g con precisione 10.000x interna.
4. `scaleResult(result, portionG)` scala per porzione se indicata.
5. `calcClaims(result, portionG?)` determina i claim nutrizionali automatici (EU Reg. 1169/2011 + Reg. 1924/2006).
6. I componenti `Tab{UE,USA,Canada,Australia,Arabi}.tsx` applicano l'arrotondamento regionale e rendono la tabella ufficiale.

### Export
- **PDF** via `html2canvas` → `jsPDF` (Report ufficiale EU, US, CA, AU, Arabi)
- **Excel** via `exportNutrizionaleExcel()` in `src/utils/exportExcel.ts` (colonne: Nutriente/Unità/Per 100g/Per porzione/%VNR)

### Archivio
- Salva/carica tramite `useArchive` → backend `/api/archives/` con fallback localStorage.
- Export/import JSON da `ArchiveModal` (bottoni Esporta/Importa).

---

## 2. Etichette Alimentari (`etichette`)

**File principale:** `src/calculators/EtichetteCalc/EtichetteCalc.tsx` (~3500 righe)  
**Archive key:** `aea_archive_etichette` / tool `etichette`  
**Interface dati:** `LabelData` (righe 271-374 di EtichetteCalc.tsx)

### Flusso dati
1. L'utente compila i campi: nome prodotto, denominazione legale, produttore, indirizzo, peso netto, ingredienti, allergeni, ecc.
2. La preview etichetta si aggiorna in tempo reale (fronte e retro opzionale).
3. Il collegamento opzionale a una ricetta nutrizionale (`recipeId`) inserisce automaticamente la tabella nutrizionale.
4. I claim selezionati (`claimsSelezionati`) vengono applicati dalla funzione `relabelClaim()`.
5. Barcode EAN-13/QR code renderizzati via `JsBarcode`/`qrcode`.

### Validazione obbligatoria
Campi required: `productName`, `producer`, `netWeight`, `ingredients` → bordo rosso se mancanti.

### Export
- **Report PDF** — scheda dati per consulente/archivio
- **Fronte per stampa** — PNG a 96dpi via `html2canvas` (pronto per Bartender/NiceLabel)
- **Retro per stampa** — idem per retro (se `hasBackLabel`)
- **Scheda per grafico** — PDF completo per tipografia
- **GS1 JSON** — `exportGS1Json()` in `src/utils/exportGS1.ts`
- **GS1 XML** — `exportGS1Xml()` idem

### Sezioni UI
Collassate di default (solo quelle non critiche): dimensioni fisiche, retro, codice scheda.

---

## 3. Etichette Vini (`etichette-vini`)

**File principale:** `src/calculators/EtichetteViniCalc/`  
**Normativa:** Reg. UE 2021/2117

### Flusso dati
- Inserimento dati vino (vitigno, annata, gradazione, allergeni, ecc.)
- Preview etichetta conforme al nuovo obbligo digital label (QR code con info nutrizionali e ingredienti)
- Export PDF/PNG

---

## 4. Rintracciabilità & Costi (`rintracciabilita`)

**File principale:** `src/calculators/RintracciabilitaCalc/`

### Flusso dati
1. Inserimento lotti materie prime con costo e fornitori.
2. Calcolo costo di produzione per unità/lotto.
3. Gestione giacenze magazzino.
4. Export report rintracciabilità (CSV/PDF).

---

## 5. Trattamento Termico F0 (`trattamento-termico`)

**File principale:** `src/calculators/TrattamentoTermicoCalc/`  
**Engine:** `src/engines/thermalEngine.ts` (`calculateF0`)

### Flusso dati
1. L'utente inserisce i dataPoint `{time, temperature}` (obbligatoriamente ordinati per tempo crescente).
2. `calculateF0(dataPoints, options?)` integra la letalità con il modello Bigelow (integrazione trapezoidale).
   - `tRef = 121.1°C`, `z = 10°C` default
   - Letale equivalente: `L(T) = 10^((T - tRef) / z)`
3. Il risultato mostra `f0` (minuti letali equivalenti), `isAdequate` (≥ `targetF0`), `maxTemperature`.
4. Export report PDF con grafico temperatura vs F0.

### Note critiche
- DataPoint devono essere ordinati per tempo crescente — il motore non li riordina.
- Modello Bigelow validato per sterilizzazione (F0≥3) e pastorizzazione (parametri diversi).

---

## 6. Schede Complete / Scheda Processo (`schede-complete`, `scheda-processo`)

**File principale:** `src/calculators/SchedeCompleteCalc/`, `src/calculators/SchedaProcessoCalc/`

### Schede Complete
- Scheda tecnica prodotto: ingredienti, allergeni, tabella nutrizionale, claims, packaging.
- Scheda costi: costo materie prime, lavorazione, margine.
- Export PDF unificato.

### Scheda Processo
- Fasi produttive con parametri HACCP (CCP, limiti critici, azioni correttive).
- Fabbisogni per lotto (materie prime, tempi, attrezzature).
- Rintracciabilità lotti materie prime → lotto finito.
- Export PDF scheda processo.

---

## Architettura comune

### Archivio
Tutti i calcolatori usano `useArchive(storageKey, toolId)` per salvare/caricare documenti:
- Salvataggio primario: backend Django `/api/archives/`
- Fallback: `localStorage`
- Ogni archivio ha una chiave unica per strumento

### Auth
- `useAuth()` fornisce `user` (ruolo, purchasedTools)
- Solo i tool in `user.purchasedTools` sono accessibili (admin vede tutto)
- Token httpOnly cookie (`aea_access`/`aea_refresh`)

### Design system
- CSS: Tailwind 4 + `src/styles/unified-tokens.css` (token CSS: `--text-*`, `--color-*`, ecc.)
- Breakpoint: 768px (mobile), 900px (tablet), 1280px (desktop)
- Sidebar flyout da 900px

### Test
- `npm test` → Vitest, 251 test (15 file)
- Engine: `src/engines/*.test.ts`
- Componenti: `src/calculators/**/*.test.tsx`
