# TODO — Modulo Nutrizionale AEA

Aggiorna questo file dopo ogni sessione: spunta i task completati e aggiungi note.
Istruzione da usare all'inizio di ogni sessione Claude Code:
> "Leggi CLAUDE.md e PROMPTS/todo.md. Lavora sui task non ancora completati, in ordine."

---
# TASK: Refactoring Tool "Etichette Alimentari"

## Obiettivo Principale
Esiste già un tool per le etichette alimentari all'interno dell'app. L'obiettivo è analizzare il codice attuale, confrontarlo con la logica matematica e strutturale dei file Excel/PDF forniti come riferimento, e aggiornare l'app in modo che replichi ESATTAMENTE le stesse funzioni, calcoli e output (incluso il PDF).

## Fase 1: Discovery e Gap Analysis (Confronto)
- [ ] Analizza il codice sorgente attuale del tool "Etichette Alimentari" (cerca i componenti React/Next.js, i file di routing e il database schema relativi).
- [ ] Leggi la documentazione fornita: "Guida al programma per creare le etichette dei prodotti alimentari.pdf".
- [ ] Analizza la struttura dei file CSV forniti (in particolare `database.csv`, `ricette.csv`, `calcoli.csv` e `t. UE.csv`).
- [ ] Scrivi un report testuale riassuntivo (puoi aggiungerlo in fondo a questo file) in cui elenchi le differenze tra il codice attuale dell'app e la logica del file Excel originario. Quali campi mancano? Le formule matematiche attuali sono corrette rispetto all'Excel?

## Fase 2: Allineamento Database e UI
- [ ] Aggiorna lo schema del database (o i tipi TypeScript) per includere tutti i campi necessari presenti nel `database.csv` originale (es. Kcal, kJ, Grassi, Saturi, Carboidrati, Zuccheri, Fibre, Proteine, Sale/Sodio per 100g, allergeni).
- [ ] Aggiorna l'interfaccia utente (UI) della pagina di creazione/modifica Ricetta: assicurati che sia possibile inserire le quantità di ogni ingrediente e, soprattutto, il **"Calo Peso/Resa"** in cottura, esattamente come previsto dal modello Excel.

## Fase 3: Refactoring del Motore di Calcolo
- [ ] Riscrivi o aggiorna la logica di calcolo nutrizionale dell'app. Deve replicare le formule del file `calcoli.csv`.
- [ ] Requisito logico fondamentale: La somma dei nutrienti degli ingredienti deve essere divisa per il peso TOTALE cotto (peso a crudo meno la % di calo di lavorazione) per ricalcolare i valori esatti su 100g di prodotto finito.

## Fase 4: Generazione "Scheda Etichetta" in PDF
- [ ] Analizza il file "scheda etichetta.pdf" fornito come riferimento per l'output.
- [ ] Modifica o implementa la funzione di export PDF nell'app.
- [ ] Il PDF generato dall'app deve avere lo stesso layout del file di riferimento e includere: Intestazione prodotto, Tabella Nutrizionale UE (valori per 100g) e Lista Ingredienti in ordine decrescente di peso percentuale.
---

## TASK UI — MEDIA PRIORITÀ

- [ ] **UI-9** — Tooltip su ogni campo (passa mouse o click "?"):
      - "Peso specifico": spiega uso per bevande/100ml
      - "PZ/U.V.": spiega pezzi per unità di vendita
      - "Peso prodotto finito": spiega calo peso cottura

- [ ] **UI-10** — Campi Costo e Resa% più larghi per leggibilità

- [ ] **UI-11** — Tabella EU: aggiungere colonna "per porzione" (se serving size inserita)

- [ ] **UI-12** — Tabella EU: toggle mostra/nascondi valori facoltativi (monoinsaturi,
      polinsaturi, polioli, amido, vitamine, minerali) — sia globale che singolo

- [ ] **UI-13** — Peso specifico compilato → dicitura tabella diventa
      "Valori nutrizionali medi in 100 ml di prodotto"

---

## TASK DATI


---

## TASK USA COMPLIANCE



---

## COMPLETATI

- [x] **REFACTOR** — completato 2026-04-01: ottimizzati NutrizionaleCalc e EtichetteViniCalc, migliorato nutritionalEngine e localizationModule, sincronizzati ingredientsDB.json in src/ e public/.

- [x] **DEPLOY** — completato 2026-04-01: commit pushato a main, deployed su Vercel: https://app-consulenze-alimentari.vercel.app

- [x] **GOLDEN TEST** — completato 2026-04-01: validato engine nutritionalEngine.ts — arrotondamenti Allegato XV implementati correttamente, fattori energetici EU confermati.

- [x] **CLAIM NUTRIZIONALI** — completato 2026-04-01: implementato generateNutritionalClaims() in nutritionalEngine.ts, aggiunto rendering TabUE con logica FONTE/RICCO (≥15%/≥30% AR), low-content claims per zuccheri/grassi/sale.

- [x] **PDF EXPORT SCHEDA ETICHETTA** — completato 2026-04-01: implementato generateEtichettaPDF() con html2canvas, aggiunto "Scarica Scheda Etichetta PDF" button, supporta multi-page PDF.

- [x] **UI-13** — completato 2026-04-01: conditionally render "per 100 ml" instead of "per 100 g" when specificGravity > 0, passa parametro a TabUE.

---

## TASK RIMANENTI (MEDIA PRIORITÀ PER SUCCESSIVA SESSIONE):

- [ ] **UI-9** — Tooltip su campi (Peso specifico, PZ/U.V., Peso prodotto finito)
- [ ] **UI-10** — Campi Costo e Resa% larghezza aumentata
- [ ] **UI-11** — TabUE: aggiungere colonna "per porzione" se servingSize inserita
- [ ] **UI-12** — TabUE: toggle mostra/nascondi valori facoltativi (monoins, polins, polioli, amido, vitamine, minerali)



<!--
- [x] **REFACTOR** — completato 2026-04-01: ottimizzati NutrizionaleCalc e EtichetteViniCalc, migliorato nutritionalEngine e localizationModule, sincronizzati ingredientsDB.json in src/ e public/.

- [x] **DEPLOY** — completato 2026-04-01: commit pushato a main, deployed su Vercel: https://app-consulenze-alimentari.vercel.app

### EtichetteViniCalc — Task (Reg. UE 2021/2117) — SPOSTATI 2026-04-01

**Engine & Calcoli:**
- [x] Creare `src/engines/wineEngine.ts` con interfaccia `WineAnalysis` (12 campi in g/L + grado alcolico in % Vol)
- [x] Implementare `calculateWineEnergy()` con coefficienti specifici vino (alcol: 22.91 kJ/ml, 5.53 kcal/ml — NON i coefficienti standard)
- [x] Carboidrati = residualSugar + polyols + glycerol — campo calcolato, NON editabile dall'utente
- [x] Implementare arrotondamenti EU (Allegato XV Reg. 1169/2011) per valori per 100ml
- [x] **Golden test**: input riga 9 Excel → output atteso 374 kJ / 90 kcal, grassi 0.7g, carbo 1.2g, zuccheri 0.7g, proteine 0.5g, sale 0.1g

**Form Input:**
- [x] Verificare che `EtichetteViniCalc.tsx` abbia tutti e 12 i campi numerici (fat, saturatedFat, alcoholDegree, tartaricAcid, malicAcid, volatileAcidity, residualSugar, polyols, glycerol, fiber, proteins, salt)
- [x] Campo carboidrati: read-only, calcolato in tempo reale, con formula visibile in tooltip
- [x] Tutti i campi numerici in g/L tranne grado alcolico (% Vol) — etichettare correttamente le unità

**Campi Etichetta:**
- [x] Implementare interfaccia `WineLabel` completa con tutti i campi obbligatori/condizionali/facoltativi
- [x] Dropdown categoria vino (17 opzioni: VINO ROSSO, VINO BIANCO, VINO SPUMANTE, ecc.)
- [x] Dropdown denominazione origine (DOP, IGP, DOC, DOCG, IGT)
- [x] Dropdown classificazione spumanti — mostrare SOLO se categoria = spumante (DOSAGGIO ZERO → DOLCE)
- [x] Logica condizionale: campo "vintage" obbligatorio solo per DOP/IGP/DOC/DOCG/IGT
- [x] Logica condizionale: campo "best before" solo per dealcolizzati o < 10% vol
- [x] Logica condizionale: campo "integramente prodotto" solo per DOP/IGP/DOC/DOCG/IGT
- [x] Toggle QR Code vs dichiarazione diretta: se QR → campo `qrCodeUrl` required; se no QR → campo `ingredients` required
- [x] Dropdown codici smaltimento imballi per tipo materiale (Plastica/Carta/Metalli/Legno/Vetro/Composti/Tessili)

**Output & Export:**
- [x] Dichiarazione nutrizionale: formato testo EU standard ("Valori nutrizionali medi per 100 ml") con 7 righe obbligatorie
- [x] Export PNG etichetta standard
- [x] Export PNG etichetta personalizzata (canvas drag-and-drop)

**UI/UX:**
- [x] Anteprima dichiarazione nutrizionale in tempo reale mentre l'utente digita i valori
- [x] Colore-coding campi: arancione = sempre obbligatorio, giallo = obbligatorio in certi casi, verde = facoltativo
- [x] Pittogramma regione (campo opzionale per DOP/IGP/DOC/DOCG/IGT)
- [x] Campo testo libero "Menzioni facoltative"

**Verifica Finale:**
- [x] Confrontare output engine con Golden Test prima del deploy
- [x] Verificare che i coefficienti energetici del vino NON siano condivisi con `nutritionalEngine.ts` (sono diversi)
- [x] Verificare che QR code sia generato correttamente per Reg. UE 2021/2117


- [x] **UI-1** — verificato 2026-04-01: già implementato (header dice "Creazione tabelle valori nutrizionali").

- [x] **UI-2** — verificato 2026-04-01: già implementato (PRODOTTO label uppercase + fontSize 16 bold).

- [x] **UI-3** — verificato 2026-04-01: già implementato ("Fabbisogno per PZ/U.V." + step=0.001).

- [x] **UI-4** — verificato 2026-04-01: già implementato (validazione `if (v !== 0)` consente zero).

- [x] **UI-5** — verificato 2026-04-01: già implementato (Step 3 dice "Peso del prodotto finito (dopo eventuale calo peso dovuto ad evaporazione di acqua)").

- [x] **UI-6** — completato 2026-04-01: messaggio aggiornato a testo preciso in italiano con ${pesoGrezzo}g.

- [x] **UI-7** — completato 2026-04-01: TabUE ridisegnata con header nero "Dichiarazione Nutrizionale", riga nera "Valori nutrizionali medi per 100 g", colonna % AR sempre visibile, nota AR in footer.

- [x] **UI-8** — completato 2026-04-01: rimossa IngredientListSection dalla pagina (rimossa anche la funzione e il calcolo ingredientListStr).con data e note quando sono done - [x] **DB-1** — completato 2026-04-01: aggiunti misto per soffritto, lasagne all'uovo, formaggio grattugiato mix formaggi pasta dura in entrambi i file (sale era già presente).

- [x] **FIX-1** — verificato 2026-04-01: nutritionalEngine.ts non contiene `any`; già tipizzato correttamente.

- [x] **FIX-2** — verificato 2026-04-01: NutrizionaleCalc.tsx aveva già `dbError`/`dbLoading` con messaggio italiano.

- [x] **FIX-3** — completato 2026-04-01: corretto `UERules.roundNutrient` in localizationModule.ts — aggiunta soglia 10g per standard nutrients e fat_sub, corretta soglia sale/sodio per Allegato XV.

- [x] **FIX-4** — verificato 2026-04-01: nessun `console.log` presente nei file indicati (solo console.warn/error già presenti).

- [x] **USA-1** — completato 2026-04-01: TabUSA e TabCanada ora usano `d = sv || p` — quando serving size è inserita, tutti i valori (calorie + nutrienti) sono scalati alla porzione. TabArabi già mostrava entrambe le colonne (100g + porzione).
-->


<!-- Esempio: -->
<!-- - [x] **FIX-4** completato 2026-04-01 — rimossi 12 console.log -->

---

## FASE 1: REPORT GAP ANALYSIS — 2026-04-01

### Analisi comparativa: Codice attuale App vs. Specifica Excel + PDF

#### INFRASTRUTTURA GENERALE

**Codice attuale:**
- ✅ NutrizionaleCalc.tsx: componente UI per gestire ingredienti, ricette, calcoli
- ✅ nutritionalEngine.ts: logica di calcolo nutrizionale con supporto multiple regioni
- ✅ ingredientsDB.json: database con 40+ nutrienti per ingrediente
- ✅ localizationModule.ts: arrotondamenti per regione (EU, USA, Canada, Arabi, Australia)

**Specifica Excel + PDF:**
- ⚠️ **Scheda etichetta.pdf**: Layout di output con tabella nutrizionale, ingredienti, claim nutrizionali
- ⚠️ **Excel workbook (19 sheet)**: Logica di calcolo, ordinamento ingredienti, tabelle per multiple regioni

**GAP:**
- ❌ **CRITICO**: PDF export non esiste (l'app genera report testuale generico, NON layout "scheda etichetta.pdf")
- ❌ **CRITICO**: Logica claim nutrizionali (es. "FONTE DI CALCIO", "A BASSO CONTENUTO DI ZUCCHERI") non è implementata
- ⚠️ Ordine nutrienti nel PDF potrebbe non corrispondere all'app (controllare precisamente)

---

#### NUTRIENTI E UNITÀ DI MISURA

**Specifica PDF: Nutrienti obbligatori per dichiarazione EU (100g)**
```
Energia (kJ / kcal)  — % AR
Grassi (g)            — % AR
  di cui: Saturi (g)  — % AR
  Monoinsaturi (g)
  Polinsaturi (g)
Carboidrati (g)       — % AR
  di cui: Zuccheri (g) — % AR
  Polioli (g)
  Amido (g)
Fibre (g)
Proteine (g)          — % AR
Sale (g)              — % AR
[Minerali solo se ≥ 15% AR]
```

**Codice attuale (nutritionalEngine.ts + NutrizionaleCalc.tsx):**
- ✅ Supporta: grassi, saturi, monoins, polins, trans, carbs, zuccheri, fibre, proteine, sodio, sale
- ✅ Supporta minerali: calcio, fosforo, magnesio, ferro, zinco
- ✅ Supporta vitamine: A, D, E, C, B1-B12
- ✅ Supporta: polioli, amido, alcol, acidi organici
- ✅ Calcola energiaKcal e energiaKj con fattori EU Allegato XIV

**GAP:**
- ⚠️ **VERIFICARE**: I fattori energetici utilizzati nel calcolo corrispondono esattamente a Allegato XIV Reg. 1169/2011?
- ⚠️ **VERIFICARE**: L'arrotondamento dei nutrienti segue esattamente Allegato XV? (stato: localizationModule adatto ma non testato su golden test)
- ✅ **OK**: Database ingredientsDB.json contiene tutti i nutrienti necessari

---

#### ARROTONDAMENTI (Allegato XV Reg. 1169/2011)

**Specifica Allegato XV:**
- Grassi, Carboidrati, Zuccheri, Proteine, Fibre, Polioli, Amido: ≤0.5g → 0; <10g → 1dec; ≥10g → 0dec
- Acidi grassi saturi/mono/poli: ≤0.1g → 0; <10g → 1dec; ≥10g → 0dec
- Sale: ≤0.0125g → 0; <1g → 2dec; ≥1g → 1dec
- Sodio: ≤0.005g → 0; <1g → 2dec; ≥1g → 1dec
- Energia: 0 decimali (arrotonda all'unità)

**Codice attuale (localizationModule.ts):**
- ✅ Funzione `UERules.roundNutrient()` implementata con logica Allegato XV
- ✅ Distinzione tra fat_main, fat_subs, salt/sodio

**GAP:**
- ⚠️ **VERIFICARE GOLD TEST**: La tabella "LASAGNA ALLA BOLOGNESE (100g)" nel CLAUDE.md fornisce valori attesi. Fare golden test su app attuale per verificare correttezza arrotondamenti.

---

#### CALCOLO NUTRIZIONALE DA RICETTA

**Specifica Excel (logica ricette → etichetta):**
1. Utente seleziona ingredienti e quantità (g a crudo)
2. Utente specifica "Calo Peso/Resa%" (cottura/evaporazione)
3. Peso finale = peso crudo × (1 - calo%)
4. Nutrienti totali = Σ(ingrediente.nutrienti × quantità g)
5. Nutrienti per 100g = nutrienti totali / peso finale × 100
6. Arrotondare secondo Allegato XV

**Codice attuale (nutritionalEngine.ts):**
- ✅ `calculateFromRecipe()` implementa esattamente questa logica
- ✅ Supporta `finishedWeight` (peso finale esplicito) O `cookingLoss` (%)
- ✅ Calcola con precisione 4 decimali (PRECISION = 10000)
- ✅ Restituisce: totalNutrientsRaw, totalRecipeWeight, finalProductWeight, valuePer100gFinal (pre-arrotondamento), roundedValuePer100gFinal

**GAP:**
- ✅ **OK**: La logica di calcolo è corretta in teoria
- ⚠️ **VERIFICARE**: Verificare su una ricetta reale (Lasagna in CLAUDE.md) che i valori corrisppondono al golden test

---

#### INTERFACCIA UTENTE — Input Ingredienti

**Specifica Excel:**
- Ingredienti: nome, quantità (g), [optional: quantità cotte se diverse]
- Campo "Calo Peso/Resa %" in % (es. 25%)
- Output: tabella ingredienti con percentuali composizione

**Codice attuale (NutrizionaleCalc.tsx):**
- ✅ Form per aggiungere ingredienti con dropdown DB + input quantità (g)
- ✅ Campo "Calo Peso/Resa %"
- ✅ Tabella ingredienti dinamica
- ✅ Validazione quantità (numero positivo)

**GAP:**
- ✅ **OK**: Competenze UI corrette

---

#### TABELLE DI OUTPUT

**Specifica PDF:**
- **Tabella EU**: 3 colonne (Nutriente | Valore + Unità | % AR)
- **Orderline**: Energia → Grassi+sub → Carbo+sub → Fibre → Proteine → Sale → [Minerali alfabetici]
- **Menzioni**: "FONTE DI [nutriente]" + claims salutistici associati (per nutrienti ≥15% AR)

**Codice attuale (NutrizionaleCalc.tsx):**
- ✅ TabUE: visualizza tabella con nutrienti, % AR, colonna nascondibile facoltativi
- ✅ Supporta multiple regioni (USA, Canada, Arabi, Australia) con tabelle dedicate
- ✅ **MANCA**: Logica per generare claim tipo "FONTE DI X" in base a soglie % AR

**GAP:**
- ❌ **MANCA**: Claim nutrizionali automatici non implementati
- ⚠️ **VERIFICARE ORDINE**: Controllare ordine nutrienti in TabUE vs. specifica PDF

---

#### PDF EXPORT

**Specifica:**
- File "scheda etichetta.pdf" fornisce layout di riferimento con:
  - Intestazione (denominazione, peso netto, data, lotto)
  - Ingredienti in ordine decrescente di peso percentuale
  - Tabella nutrizionale EU (100g)
  - Allergen claims
  - Raccolta differenziata
  - Note obbligatorie

**Codice attuale:**
- ✅ `pdfGenerator.ts` esiste e genera report testuale generico
- ❌ **CRITICO MANCA**: Export PDF layout "scheda etichetta.pdf" con tabella grafica

**GAP:**
- ❌ **CRITICO**: Manca PDF export con layout matching scheda etichetta

---

#### SUMMARY — PRIORITÀ NEXT STEPS

| Categoria | Stato | Priorità | Action |
|-----------|-------|----------|--------|
| Logica calcolo | ✅ Done | — | Golden test per verificare |
| Arrotondamenti UE | ✅ Codice | 🔴 CRITICO | Golden test su Lasagna |
| Claim nutrizionali | ❌ Manca | 🔴 CRITICO | Implementare logica soglie 15% AR |
| Layout DB | ✅ OK | — | — |
| UI input | ✅ OK | — | — |
| Tabella EU ordine | ⚠️ Verificare | 🟡 ALTA | Verificare vs PDF |
| PDF export grafico | ❌ Manca | 🔴 CRITICO | Implementare html2canvas + jsPDF layout |
| UI Tooltip (UI-9) | ❌ Manca | 🟡 MEDIA | Implementare |
| UI Campo resize (UI-10) | ❌ Manca | 🟡 MEDIA | Implementare |

**Raccomandazione:** Fare golden test SU LASAGNA IMMEDIATAMENTE per validare engine attuale prima di qualsiasi refactor.

