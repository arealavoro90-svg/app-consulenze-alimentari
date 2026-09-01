# Etichette — Gap report vs Excel originale e Guida PDF

Data: 2026-08-24 · Analisi di sola lettura, nessun file di codice modificato.

Fonti verificate direttamente:
- `Programma etichette con calcolo.xlsx` — fogli `MENU`, `pagina iniziale`, `ricette`, `ordinamento`, `e. UE`, `etichetta standard` (letti con openpyxl, formule incluse).
- `Guida al programma per creare le etichette dei prodotti alimentari.pdf` — 63 pagine, estratte e lette integralmente (cap. 1-16).
- `src/calculators/EtichetteCalc/EtichetteCalc.tsx` (1615 righe), `packagingMaterials.ts`, `src/engines/nutrizionaleCalcEngine.ts`, `src/calculators/NutrizionaleCalc/shared/constants.ts`, `TabUE/TabUSA/TabCanada/TabAustralia/TabArabi.tsx`, `src/hooks/useArchive.ts`, `useIngredientsDB.ts`, `src/api/client.ts`, `Beck-end/backend/apps/ingredients/`.
- `public/data/ingredientsDB.json` (1065 voci) — ispezione delle chiavi allergeni realmente popolate.

`npx tsc -b` → **verde**, nessun errore di tipo.

---

## 1. Recap: cosa fa oggi lo strumento vs cosa faceva l'Excel

### 1.1 Struttura dell'Excel (verificata riga per riga)

Il programma Excel è una catena di 5 fogli:

| Foglio | Ruolo reale (da formule) |
|---|---|
| `database` | ~1065 ingredienti. Colonna `E` = DESCRIZIONE (nome interno), colonna `F` = **DICHIARAZIONE IN ETICHETTA** (testo curato a mano, allergeni già in MAIUSCOLO, sotto-ingredienti tra parentesi). Colonne `HM…` = flag allergeni + cross-contaminazione presso il fornitore. Colonna costo/kg. |
| `ricette` | Fino a **4 componenti** (colonne `BN`, `BR`, `BV`, `BZ` = "RICETTA COMPONENTE 1..4"). Colonne `D:H` = **additivi** selezionati per ciascun ingrediente da liste esterne. `CB` = peso post-cottura, `CD` = `% in ricetta` (`CC29/CC$24*100`), `CF` = `QUID` (`CC30/CC$12*100`). Colonne `CG:CK` = costo/kg grezzo, **resa di lavorazione %**, costo/UV, costo/kg. `CG20:CK24` = serving size (porzione, confezione, pezzo, cup 240/250 ml, cucchiaio 15 ml). |
| `ordinamento` | Riga 9-2001. `BX` = `% in ricetta`, `BY` = `QUID`, `BZ` = flag `X` "ingrediente caratterizzante". **L'ordinamento NON è automatico**: la nota in `BX4` istruisce l'utente a cliccare il filtro, "Ordina dal più grande al più piccolo" e togliere la spunta a 0,00 (confermato anche dalla Guida, cap. 13a punti 1-3). La riga di testo per ingrediente è `D:S` = `[, ] nome ( QUID %) , additivo1, additivo2, additivo3, additivo4, additivo5`. La regola **acqua < 5%** esiste in **una sola cella**, `F10`: `=IF(BX10=0,"",IF(BY10<5,"",ricette!I29))` — hardcoded sulla riga dell'acqua, non generalizzata. |
| `e. UE` | La "scheda etichetta". Vedi mappatura sotto. |
| `etichetta standard` / `etichetta personalizzata` | Rendering: menù a spunta delle informazioni classificate in OBBLIGATORIE (rosso) / OBBLIGATORIE SE PREVISTE (giallo) / VOLONTARIE (verde); l'etichetta si costruisce con copia-incolla di caselle di testo (Guida cap. 15a: 14 passaggi manuali). QR/barcode vengono da **generatori online esterni** (`etichetta standard` D37/D41 = solo link). |

### 1.2 Mappatura `e. UE` → stato nell'app

| Riga Excel | Contenuto | Stato in `EtichetteCalc.tsx` |
|---|---|---|
| 8-10 | Codice scheda / n° revisione / data revisione + logo | ❌ **assente** |
| 12-13 | Denominazione + **dichiarazione complementare** (`Decongelato`, `20 mg di caffeina/100 ml`) | ⚠️ solo `productName` libero (`:841`), nessun elenco controllato |
| 14-16 | **QUID fuori lista ingredienti** (`28 g per 100 g di prodotto`, es. confetture) | ❌ assente |
| 17 | Lista ingredienti = `CONCAT(ordinamento!E7:S2002)` | ✅ `generatedIngredientsText` `:454-464`, **ma senza additivi** |
| 19-21 | Dichiarazioni complementari sotto la lista (`Confezionato in atmosfera protettiva`, `Contiene liquirizia…`, `Prodotto a cottura parziale…`) + testo libero | ❌ assente |
| 22-26 | `Può contenere:` — unione di cross-contaminazione **fornitore** (da database) **+ stabilimento dell'utente** (selezione manuale, 20 allergeni) | ⚠️ solo fornitore (`crossAllergensList` `:378-384`); manca la parte stabilimento |
| 27 | Frase facoltativa "Gli ingredienti in MAIUSCOLO possono provocare…" | ❌ assente |
| 28-49 | **Claims nutrizionali automatici** (16 regole) | ⚠️ parziale — vedi §3/M4 |
| 51 | **Indicazioni sulla salute** (12 health claims Reg. 1924/2006) | ❌ **completamente assenti** |
| 52-53 | Quantità netta per **più formati di U.V.** (500 g / 250 g / 100 g) + peso sgocciolato per ciascuno | ⚠️ un solo `netWeight` + un solo `drainedWeight` (`:855`, `:870`) |
| 54 | Lotto + TMC | ✅ `:959-981`, TMC guidato (tipo/data/granularità) — **migliore** dell'Excel |
| 55 | Titolo alcolometrico | ✅ `:877` con avviso >1,2% vol |
| 56-57 | Conservazione + istruzioni per il consumo | ✅ `:942`, `:950` |
| 59-63 | Smaltimento imballi: descrizione / codice / raccolta × 5 + "VERIFICA LE DISPOSIZIONI DEL TUO COMUNE" | ✅ `:983-1017` (max 6) + dizionario `packagingMaterials.ts` — **migliore** (l'Excel è testo libero) |
| 60-85 | Dichiarazione nutrizionale + **10 minerali mostrati automaticamente se ≥ 15 % AR** | ⚠️ tabella sì, **minerali mai** — vedi §3/B |
| 88-89 | Produttore (ragione sociale, sede legale, **stabilimento di produzione**) | ⚠️ `producer` + `address` generici, nessuna distinzione sede/stabilimento |

### 1.3 Dove l'app è già superiore all'Excel

- Ordinamento ingredienti **automatico** per peso grezzo (`:411-420`) contro il filtro manuale dell'Excel.
- Regola acqua < 5 % **generalizzata** a qualsiasi riga acqua (`:419`), non hardcoded su una cella.
- Denominazione da campo `etichetta` del DB (`:414`) — stesso comportamento dell'Excel ma senza copia-incolla.
- Controllo leggibilità in mm reali (1,2 mm, `:686-708`) — **non esiste nell'Excel**.
- Fronte/retro con dimensioni indipendenti e checklist campi (`:1054-1081`) — non esiste.
- QR / Code128 / EAN-13 generati in-app (`:212-263`) contro i generatori online esterni dell'Excel.
- Export PNG a 300 dpi in dimensione fisica reale (`:634-665`) contro il copia-incolla-come-immagine dell'Excel.
- `ScaleToFit` (`:179-209`) per far entrare la tabella nutrizionale nella larghezza fisica.

### 1.4 Dove l'Excel è ancora avanti

1. **Additivi in lista ingredienti** (`ricette D:H` → `ordinamento J:R`) — nell'app gli `additiveRows` vengono **scartati** (`EtichetteCalc.tsx:343` `additiveRows: []`) e non entrano mai nella lista.
2. **Health claims** (12 frasi, `e. UE` colonna T righe 30-48).
3. **Claims nutrizionali completi** (16 regole vs 8 dell'engine).
4. **Minerali in tabella** se ≥ 15 % AR.
5. **Cross-contaminazione presso lo stabilimento dell'utente**.
6. **Scheda etichetta versionata** (codice/revisione/data) esportabile in PDF per grafico/tipografia.
7. **Più formati di U.V.** sulla stessa scheda.
8. **Multi-componente esplicito** (4 ricette con pz/UV separati): l'app lo legge dall'archivio ma non lo espone né lo dichiara.
9. **Costing** (costo/kg, resa di lavorazione, costo/UV) — presente in `ricette CG:CK`, assente sia in Etichette sia nel bridge.

---

## 2. Cosa manca rispetto alla Guida PDF

Letta integralmente. Elementi funzionali citati e non coperti:

- **Cap. 13** ("dovrai aggiungere MANUALMENTE le altre informazioni previste dalla normativa"): la scheda Excel è esplicitamente un **documento da trasmettere al grafico/tipografia**, con "prescrizioni riguardanti la grandezza dei caratteri, il posizionamento delle diciture" e link normativi nelle celle verdi. L'app non produce questo documento: `handlePDF` (`:593-620`) genera un report generico a 5 input / 9 output, **senza lista ingredienti completa, senza tabella nutrizionale, senza imballi, senza claims, senza codice/revisione**.
- **Cap. 13a punto 4**: codice scheda, numero e data revisione. Assente.
- **Cap. 13a punto 9**: selezione allergeni per cross-contaminazione **presso il proprio laboratorio**. Assente.
- **Cap. 14**: classificazione tri-colore delle informazioni (sempre obbligatorie / obbligatorie se previste / volontarie) con toggle di visibilità. L'app ha solo la checklist fronte/retro e 4 campi obbligatori (`:528-533`).
- **Cap. 5 sez. 4 / cap. 5a punto 8**: valori nutrizionali riferiti a porzione / confezione / pezzo oltre che a 100 g. In etichetta l'app forza sempre `activeSubTab="100g"` (`:1220`) — corretto come base obbligatoria, ma la dichiarazione volontaria per porzione (Art. 33 Reg. 1169/2011) non è selezionabile.
- **Cap. 5a nota 3**: vincolo "peso finito ≤ peso crudo" con blocco all'inserimento. Nel bridge Etichette non c'è alcun controllo: `finishedWeight` arriva grezzo dall'archivio (`:356`).
- **Cap. 4 nota 8**: il DB ufficiale distingue *carboidrati fibre escluse* / *fibre comprese* (USA/Canada). Gestito nell'engine (`carboidratiTot`), ok.
- **Cap. 15**: etichetta personalizzata con font/colori/immagini libere. L'app ha sfondo + logo + tema chiaro/scuro, non font né colori per singola dichiarazione. Gap accettabile (l'Excel stesso dichiara di non sostituire un grafico).
- **Pagina iniziale**: link ai database istituzionali (CREA, USDA, Svizzera, IEO, ANSES) e alle normative EU/USA/CA/AU/Paesi Arabi. Non replicati nell'app.

---

## 3. Backlog M1-M6 / B1-B6 — stato reale nel codice

I ticket provengono da una sessione persa; sotto lo stato **verificato leggendo il codice**, non dichiarato.

| ID | Descrizione | Stato reale | Riferimenti | Sforzo |
|---|---|---|---|---|
| **M1** | Dizionari controllati imballi + TMC | ⚠️ **parziale**. Imballi: fatto, 19 codici Dec. 97/129/CE con autocompletamento raccolta (`packagingMaterials.ts`, UI `:994-1016`). TMC: fatto come **composizione guidata** (`:505-515`, `:958-975`), non come dizionario. **Manca** il dizionario per "modalità di conservazione" e per le dichiarazioni complementari (`e. UE` righe 12-13, 19-21). | `packagingMaterials.ts:13-33`, `EtichetteCalc.tsx:505-515` | **Basso** (residuo) |
| **M2** | Cross-contaminazione presso lo **stabilimento dell'utente** | ❌ **non iniziato**. Oggi `crossAllergensList` (`:378-384`) deriva solo dai flag `cross_*` degli ingredienti = contaminazione **presso il fornitore**. L'Excel somma le due sorgenti (`e. UE` T22 = `CONCAT(T24:DB26)`, dove righe 24-25 sono la selezione manuale dell'utente e riga 26 è la parte automatica). | `EtichetteCalc.tsx:378-384`, `e. UE!T22/CC24:DB25` | **Basso** (lista di checkbox + concat nella stringa allergeni) |
| **M3** | Claims nutrizionali mancanti | ⚠️ **parziale**. `calcClaims` (engine, protetto) genera **8** claim; l'Excel ne genera **16**. Mancano: `SENZA GRASSI` (≤0,5), `A BASSO CONTENUTO DI GRASSI SATURI` (≤1,5), `SENZA GRASSI SATURI` (≤0,1), `SENZA ZUCCHERI` (≤0,5), `A BASSO CONTENUTO DI SALE` (sale ≤0,3 — l'app usa `sodio ≤120 mg`, soglia equivalente ma **etichetta sbagliata**: dichiara "SODIO" dove il Reg. UE vuole "SALE"), `FONTE DI` fosforo/magnesio/zinco/rame/manganese/selenio/iodio (≥15 % AR). ⚠️ **Non toccare `nutrizionaleCalcEngine.ts`**: i claim aggiuntivi vanno in un modulo separato lato Etichette. | engine `:208-244`, Excel `e. UE!D28:D48` | **Medio** |
| **M4** | **Health claims** (Reg. 1924/2006) | ❌ **non iniziato**, zero copertura. L'Excel ne emette 12, condizionati al claim nutrizionale corrispondente (`e. UE` colonna T righe 30-48): saturi→colesterolo, sale→pressione, proteine→massa muscolare, potassio→funzione muscolare, calcio→ossa, fosforo→metabolismo energetico, magnesio→stanchezza, ferro→globuli rossi, zinco/rame/selenio→stress ossidativo, iodio→tiroide. | `e. UE!T30:T48` | **Medio** |
| **M5** | **Additivi in etichetta** | ❌ **non iniziato**. `EtichetteCalc.tsx:343` scarta esplicitamente gli additivi (`additiveRows: []`) e `orderedIngredientsWithQuid` (`:396-421`) non li considera. Nell'Excel ogni ingrediente porta con sé fino a 5 additivi che finiscono inline nella lista (`ordinamento` J:R). I dati esistono già nell'archivio (`ArchiveData.componenti[].additiveRows`) e i dizionari pure (`ADDITIVI_CATEGORIE` / `ADDITIVI_SPECIFICI` in `shared/constants.ts`). **Impatto normativo diretto** (Art. 18 + All. VII Parte C: categoria + nome o numero E). | `EtichetteCalc.tsx:343`, `:396-421`, `shared/constants.ts` | **Medio** |
| **M6** | Scheda PDF trasmissibile | ⚠️ **parziale/inadeguato**. `handlePDF` (`:593-620`) produce un report generico; manca tutto ciò che rende la scheda utile a grafico/tipografia: codice/revisione/data, lista ingredienti integrale, tabella nutrizionale, claims, imballi, prescrizioni corpo carattere. | `EtichetteCalc.tsx:593-620` | **Medio-alto** |
| **B1-B6** | "Voci minori" | ⚠️ **non ricostruibili**: non esistono in `todo.md` né in `AUDIT.md` (in `AUDIT.md` "B1" è un ticket diverso, sui claim del tool nutrizionale). Il solo ticket etichette tracciato è `todo.md:107` **ETI-1** (gap analysis), che questo documento chiude. Sostituirei B1-B6 con i bug concreti elencati sotto. |  | — |

### Bug concreti trovati durante l'analisi (candidati a sostituire B1-B6)

| # | Problema | file:riga | Gravità |
|---|---|---|---|
| **B-a** | **SEDANO, SENAPE e SESAMO non vengono mai dichiarati come allergeni presenti.** `ALLERGEN_FIELDS` contiene 13 voci e omette `all_sedano`, `all_senape`, `all_sesamo` — che invece esistono in `DBIngredient` e sono presenti in `CROSS_FIELDS`. Risultato: 3 dei 14 allergeni dell'All. II Reg. 1169/2011 finiscono solo come "può contenere tracce", mai come "Contiene:". Nel DB reale `all_sedano` è valorizzato su 1 ingrediente e viene ignorato. Il difetto è **condiviso con il tool Nutrizionale**. | `shared/constants.ts:6-15` | **CRITICO** |
| **B-b** | **I claim nutrizionali selezionati non compaiono mai in etichetta.** `claimsSelezionati` è calcolato, mostrato con checkbox, salvato in archivio… e poi non renderizzato né nell'anteprima fronte, né nel retro, né nel PDF. Dato morto. | UI `:915-938` vs preview `:1339-1409` / `:1450-1481`, PDF `:601-618` | **Alto** |
| **B-c** | **Minerali e vitamine mai visibili nella tabella in etichetta.** La tabella viene montata con `selectedOptionals={DEFAULT_OPTIONALS}` (tutti `false`) e `showOptionals={false}`: nessun minerale può comparire. L'Excel li aggiunge automaticamente se ≥ 15 % AR (`e. UE` righe 76-85). | `:1219`, `TabUE.tsx:14-22` | **Alto** |
| **B-d** | **L'acqua è ordinata sul peso grezzo ma dichiarata sul QUID.** `sort` usa `pctGrezzo` (`:420`) mentre l'esclusione < 5 % usa `quid` (`:419`). All. VII Parte A p.5 Reg. 1169/2011 vuole l'acqua aggiunta ordinata secondo il peso **nel prodotto finito**: su un prodotto con forte calo cottura l'acqua risulta posizionata troppo in alto. | `:411-420` | **Medio** |
| **B-e** | **I solfiti non vengono mai evidenziati né segnalati.** La label è `'SOLFITI (>10 ppm)'`; `highlightAllergens` / `allergenIssues` costruiscono `new RegExp('\\bsolfiti (>10 ppm)\\b','gi')`, che non può mai combaciare con la parola "solfiti" nel testo dell'etichetta. | `:425-432`, `:437-448`, `shared/constants.ts:13` | **Medio** |
| **B-f** | **Soglia leggibilità fissa a 1,2 mm.** L'All. IV Reg. 1169/2011 ammette 0,9 mm quando la superficie maggiore è < 80 cm², e sotto i 25 cm² decade l'obbligo di dichiarazione nutrizionale (All. V p.18). L'app non calcola la superficie e non modula la soglia. | `:686-689` | **Medio** |
| **B-g** | **Il lotto è trattato come sempre necessario.** Dir. 2011/91/UE (e nota Excel `e. UE!CD54`): il lotto non è obbligatorio se il TMC è espresso con giorno e mese. Nessuna logica collegata fra `tmcGranularity` e `lotNumber`. | `:978-981`, `:505-515` | **Basso** |

---

## 4. Candidati per il crash "Si è verificato un errore" al collegamento ricetta

`ErrorBoundary` è montato a livello di `App` (`src/App.tsx:45`), quindi qualunque throw in render di `EtichetteCalc` produce esattamente quella schermata (`src/components/ErrorBoundary.tsx:22`). Non riproducibile qui (serve un archivio `nutrizionale-v3` reale). Ipotesi ordinate per plausibilità:

**1) `db` non è un array — crash che scatta SOLO con una ricetta collegata.** ⭐ candidato più forte
```
EtichetteCalc.tsx:325   if (!linkedRecipe || db.length === 0) return [];
EtichetteCalc.tsx:338       const found = db.find(dbi => dbi.nome === srNome);
EtichetteCalc.tsx:350       const dbNames = new Set(db.map(d => d.nome));
```
`useIngredientsDB` (`src/hooks/useIngredientsDB.ts:15-27`) fa `setDb(data)` **senza validare la forma**: qualunque payload non-array (risposta paginata, errore JSON, `{detail: …}` con HTTP 200, `ingredientsDB.json` servito come oggetto) passa. Con un oggetto, `db.length` è `undefined`, la guardia `=== 0` è falsa e si arriva a `db.find` / `db.map` → **`TypeError: db.find is not a function`**. Il punto chiave: in `EtichetteCalc` **entrambe** le `useMemo` toccano `db` solo se `linkedRecipe` esiste — quindi il tool si apre bene e crasha **esattamente** quando si seleziona la ricetta. Nota: il ViewSet Django ha `pagination_class = None` (`Beck-end/backend/apps/ingredients/views.py:19`), ma il serializer usa `DecimalField`, che DRF serializza come **stringa** — se qualcuno ha rimosso `pagination_class` o attivato una paginazione globale, il sintomo è esattamente questo.

**2) Optional chaining che si ferma su `linkedRecipe` e non su `.data`.**
```
EtichetteCalc.tsx:356   const finishedWeight = linkedRecipe?.data.peso_finito_pz || 0;
EtichetteCalc.tsx:357   const specificGravityVal = parseFloat(linkedRecipe?.data.specificGravity || '') || 0;
EtichetteCalc.tsx:479   linkedRecipe.data.nome_prodotto
EtichetteCalc.tsx:1217  ue={linkedRecipe?.data.serving_sizes?.UE ?? {}}   (idem 1223, 1228, 1232, 1235)
```
Se una voce d'archivio ha `data` assente/null (voce troncata, migrazione mobile fallita a metà — `archiveCompat.ts:66-72` cattura l'errore e lascia dati parziali, oppure JSON scritto a mano), `.data.peso_finito_pz` throwa. Correzione a costo zero: `linkedRecipe?.data?.…`.

**3) `componenti` presente ma non array.**
```
EtichetteCalc.tsx:321   return raw.componenti || raw.components || [];
EtichetteCalc.tsx:326   ...readComponenti(linkedRecipe.data).map(sc => {
EtichetteCalc.tsx:333       rows: rows.flatMap(sr => {
```
La guardia è di sola verità (`||`): un `componenti: {}` o `ingredienti: {}` la supera e poi `.map` / `.flatMap` non è una funzione. Idem per un elemento `null` dentro l'array (`sc.nome` su null).

**4) Loop di render su `ScaleToFit` (codice nuovo di questa sessione).**
```
EtichetteCalc.tsx:184-200   useEffect(..., [children])   → measure() → setBox({scale, height})
```
`setBox` crea sempre un **oggetto nuovo**, quindi ogni `measure()` forza un re-render; `children` è un elemento JSX nuovo a ogni render del padre, quindi l'effect si ri-registra a ogni render del padre. Da solo converge, ma se un qualsiasi cambio di altezza della tabella retroagisce sul `ResizeObserver` esterno (`:677-685`, osserva `labelPreviewRef`) si ottiene un ciclo `Maximum update depth exceeded`, che React rilancia come errore → ErrorBoundary. È l'unico candidato **introdotto in questa sessione** e attivo **solo con `per100 != null`**, cioè solo con ricetta collegata. Mitigazione lazy: `setBox(prev => prev.scale === scale && prev.height === h ? prev : {scale, height: h})` e deps `[]` invece di `[children]`.

**5) Meno probabile ma da escludere:** `nutritionalRecipes` non-array (`useArchive.ts:17` fa `setItems(JSON.parse(stored))` senza `Array.isArray`) — ma in quel caso il crash sarebbe all'**apertura** del tool (`:306 .find`), non al collegamento.

Per chiudere in fretta: aggiungere `console.error` completo nell'ErrorBoundary con `errorInfo.componentStack` (oggi `ErrorBoundary.tsx:15` logga solo `error`) e chiedere all'utente lo stack.

---

## 5. Rischi normativi residui

**Reg. (UE) 1169/2011**
- **Art. 21 + All. II** — 3 allergeni su 14 (sedano, senape, sesamo) non dichiarabili come presenti (B-a). È il rischio più grave del tool.
- **Art. 18(1) + All. VII Parte C** — additivi assenti dalla lista ingredienti (M5). Un'etichetta generata su una ricetta con conservanti/emulsionanti è **incompleta per legge**.
- **All. VII Parte A p.5** — ordinamento dell'acqua aggiunta (B-d).
- **Art. 13(2) + All. IV** — soglia leggibilità non modulata su superficie (B-f); inoltre la stima è sul `font-size`, non sull'x-height reale (già dichiarato nel commento a `:672-675`, corretto ma da non spacciare per conformità).
- **Art. 22 + All. VIII** — QUID: l'app lo stampa solo sugli ingredienti "caratterizzanti" scelti a mano. Corretto, ma **nessun controllo** avverte se la denominazione contiene un ingrediente non spuntato (es. "Pizza al prosciutto" senza prosciutto fra i caratterizzanti) → QUID omesso per distrazione.
- **Art. 26 + Reg. (UE) 2018/775** — `countryOrigin` è testo libero con default "Italia" (`:103`, `:860`). Se l'origine è indicata e l'ingrediente primario ha origine diversa, scatta l'obbligo di dichiarare l'origine dell'ingrediente primario: non gestito, e il default precompilato è un invito all'errore.
- **Art. 9(1)(h)** + **D.Lgs. 145/2017** — obbligo (IT) di indicare la **sede dello stabilimento** di produzione/confezionamento, distinta dalla sede legale. L'app ha un solo campo `address`; l'Excel esplicita entrambe (`e. UE!CD88`).
- **Art. 33 / All. XV** — dichiarazione volontaria per porzione non disponibile in etichetta (sempre 100 g).
- **All. VI Parte A** — menzioni obbligatorie da aggiungere alla denominazione ("decongelato", "irradiato", "ricomposto", trattamenti specifici): nessun elenco guidato.
- **Art. 44 / D.Lgs. 231/2017** — prodotti non preimballati e vendita a distanza: fuori copertura, valutare se dichiararlo esplicitamente come non supportato.

**Reg. (CE) 1924/2006**
- **Health claims**: zero copertura (M4). Un utente che scriva a mano una frase salutistica non riceve alcun controllo.
- **Claim nutrizionali**: 8 su 16, con l'etichetta "A BASSO CONTENUTO DI SODIO" al posto della dicitura ammessa in UE ("a basso contenuto di sale") — la voce **B1 già aperta in `AUDIT.md:9`** riguarda la stessa famiglia di claim.
- **Falsi positivi**: `calcClaims` valuta i valori calcolati anche quando gli ingredienti hanno campi mancanti (l'engine tratta i mancanti come 0, `nutrizionaleCalcEngine.ts:93`). Un DB incompleto produce quindi `A BASSO CONTENUTO DI GRASSI` / `DI ZUCCHERI` **sempre veri**, che è un claim mendace. Nessun avviso di completezza dati (la Guida PDF, cap. 4, avverte esplicitamente di questo problema per i semilavorati).

**D.Lgs. 116/2020**
- Coperto nella sostanza (codice materiale + raccolta + dicitura Comune). Residuo: nessun obbligo forzato — l'etichetta si esporta anche con `imballi: []`, senza alcun blocco né warning; e non è gestito il caso di imballo multi-componente separabile/non separabile.

---

## 6. Priorità consigliate per la prossima sessione (max 5)

1. **Chiudere il crash del collegamento ricetta.** Fix difensivi a costo quasi nullo, tutti nella stessa direzione: `Array.isArray(db)` in `useIngredientsDB.ts:24-26`, `linkedRecipe?.data?.` nelle 6 occorrenze, `Array.isArray` in `readComponenti` (`:319-322`), `setBox` idempotente in `ScaleToFit` (`:193`). Aggiungere `componentStack` all'`ErrorBoundary` per chiudere il caso con certezza.
2. **B-a: aggiungere SEDANO / SENAPE / SESAMO ad `ALLERGEN_FIELDS`** (`shared/constants.ts:6-15`). Tre righe, ma tocca anche il tool Nutrizionale → `npm test` obbligatorio, e verificare che il DB `ingredientsDB.json` popoli davvero i tre campi (oggi solo `all_sedano` su 1 voce: serve anche un intervento dati).
3. **B-b + B-c: rendere visibile in etichetta ciò che è già calcolato.** Stampare `claimsSelezionati` nell'anteprima fronte/retro e nel PDF; mostrare i minerali ≥ 15 % AR nella tabella (derivare `selectedOptionals` da `per100` invece di `DEFAULT_OPTIONALS`, `:1219`). Alto valore percepito, diff piccolo, nessun rischio sull'engine.
4. **M5: additivi nella lista ingredienti.** I dati e i dizionari esistono già; serve smettere di scartarli (`:343`) e inserirli inline come fa l'Excel. È l'unico gap con impatto normativo diretto sull'output principale del tool.
5. **M6: scheda etichetta PDF versionata.** Codice scheda / revisione / data + lista ingredienti integrale + tabella + claims + imballi. È il deliverable che l'Excel produce e che il consulente trasmette a grafico/tipografia: senza, l'app non sostituisce ancora l'Excel nel flusso di lavoro reale.

Rinviabili: M2 (cross-contaminazione stabilimento, basso costo ma basso impatto finché mancano gli additivi), M3/M4 (claim/health claim aggiuntivi — richiedono un modulo separato per non toccare `nutrizionaleCalcEngine.ts`), multi-U.V. e QUID fuori lista (casi d'uso di nicchia).
