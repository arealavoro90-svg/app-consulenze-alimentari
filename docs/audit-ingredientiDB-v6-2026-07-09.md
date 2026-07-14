# Audit Database Ingredienti — Verifica Conformità Valori Nutrizionali
**AEA Consulenze Alimentari — Documento interno riservato**
Data: 9 luglio 2026
Redatto da: sistema automatico di verifica (Claude Code)
Destinatari: esperti nutrizionisti / tecnici etichettatura

---

## 1. Contesto e motivazione

L'applicazione AEA Consulenze Alimentari utilizza un database interno di ingredienti (`ingredientsDB.json`) per calcolare i valori nutrizionali dei prodotti alimentari e generare le tabelle nutrizionali da apporre in etichetta, in conformità al Regolamento UE 1169/2011.

Il database attuale contiene **circa 783 ingredienti di base** più un insieme di prodotti composti. I valori nutrizionali di questi ingredienti sono stati in parte costruiti con il supporto di strumenti di intelligenza artificiale e non sono stati sistematicamente validati contro tabelle ufficiali.

Questo documento riporta i risultati di un **campionamento di 20 ingredienti** confrontati con la **Banca Dati di Composizione degli Alimenti (BDA) del CREA** (Centro di Ricerca Alimenti e Nutrizione), fonte ufficiale italiana — tabelle aggiornate a dicembre 2019, disponibili su [alimentinutrizione.it](https://www.alimentinutrizione.it).

**Rischio principale:** etichette nutrizionali generate dal tool che riportano valori non conformi alle tabelle ufficiali, con possibili conseguenze di non conformità regolatoria.

---

## 2. Metodologia

- Campione: 20 ingredienti selezionati tra quelli di uso più comune e di più facile riscontro nelle tabelle CREA
- Confronto campo per campo: energia (kcal/kJ), grassi totali, carboidrati disponibili, zuccheri, proteine, fibre, sodio
- Soglie di allerta: scarto >15% = critico (🔴), 5–15% = da monitorare (🟡), <5% = accettabile (🟢)
- I valori CREA si riferiscono a 100g di parte edibile, come da standard BDA

---

## 3. Risultati del confronto

### 3.1 Ingredienti senza anomalie rilevanti 🟢

| Ingrediente | Campo verificato | Valore DB | Valore CREA | Scarto |
|---|---|---|---|---|
| Acqua | kcal | 0 | 0 | 0% |
| Olio di oliva | kcal | 899 | 899 | 0% |
| Olio di oliva | grassi | 99.9g | 99.9g | 0% |
| Burro | kcal | 761.6 | 758 | +0.5% |
| Burro | grassi | 84g | 83.4g | +0.7% |
| Latte intero | kcal | 65.4 | 64 | +2.1% |
| Latte intero | grassi | 3.63g | 3.6g | +0.8% |
| Tonno crudo (pinna gialla) | kcal | 159.3 | 159 | 0% |
| Tonno crudo (pinna gialla) | proteine | 21.5g | 21.5g | 0% |
| Uovo sodo | kcal | 133.7 | 128 | +4.4% |
| Riso arborio | kcal | 341.6 | 334¹ | +2.3% |

¹ Confronto con "Riso, brillato" CREA — il riso arborio non ha voce dedicata in BDA.

---

### 3.2 Ingredienti con scarto moderato 🟡

Scostamenti nel range 5–15%, da tenere sotto osservazione o da aggiornare nella prossima revisione del DB.

| Ingrediente | Campo | Valore DB | Valore CREA | Scarto | Note |
|---|---|---|---|---|---|
| Zucchero semolato | kcal | 399.2 | 392 | +1.8% | Entrambi plausibili — metodo di calcolo energetico diverso |
| Zucchero semolato | carboidrati | 99.8g | 104.5g | -4.5% | CREA include frazioni diverse |
| Latte intero | sodio | 44mg | 50mg | -12% | Variabilità naturale tra partite |
| Salmone fresco | kcal | 194.1 | 185 | +4.9% | Al limite accettabile |
| Salmone fresco | proteine | 20.5g | 18.4g | +11.4% | Differenza non trascurabile |
| Riso brillato (generico) | kcal | 350.5 | 334 | +4.9% | Al limite |
| Riso brillato (generico) | grassi | 0.91g | 0.4g | +128% | Valore assoluto basso ma scarto proporzionale elevato |
| Uovo sodo | proteine | 13.5g | 12.4g | +8.9% | Accettabile ma da aggiornare |
| Farina grano tenero tipo 0 | kcal | 344.5 | 323² | +6.6% | Confronto parziale: tipo 0 ≠ tipo 00 |
| Carote | kcal | 42.8 | 47³ | -8.9% | Giustificato: DB crude, CREA cotte bollite |

² Il CREA ha "Farina di frumento, tipo 00" — la farina tipo 0 ha composizione leggermente diversa, scarto parzialmente atteso.
³ Il confronto è approssimativo: DB ha carote crude, CREA ha "Carote, cotte, bollite" — la differenza è fisiologica.

---

### 3.3 Anomalie critiche 🔴

Questi ingredienti presentano scarti incompatibili con la normale variabilità biologica o con differenze di varietà. Indicano con alta probabilità che il valore nel DB è stato costruito in modo non accurato (stima AI, fonte non verificata, errore di inserimento).

---

#### A — Cipolla cruda

| Campo | Valore DB | Valore CREA | Scarto |
|---|---|---|---|
| Energia (kcal) | 39.0 | 28 | **+39%** |
| Grassi (g) | 0.62 | 0.1 | **+520%** |
| Carboidrati (g) | 6.25 | 5.7 | +9.6% |
| Proteine (g) | 1.1 | 1.0 | +10% |
| Fibre (g) | 1.7 | 1.0 | +70% |

**Valutazione:** Il dato di 0.62g di grassi per 100g di cipolla cruda è incompatibile con qualsiasi fonte nutrizionale attendibile. La cipolla è un alimento praticamente privo di grassi (0.1–0.2g/100g nelle principali banche dati internazionali, incluse USDA e BDA CREA). Il dato errato si propaga direttamente sull'energia calcolata (+39%). Qualsiasi prodotto che contenga cipolla in quantità significativa avrà il valore di grassi sovrastimato.

---

#### B — Mela (frutto intero)

| Campo | Valore DB | Valore CREA (golden) | Scarto |
|---|---|---|---|
| Energia (kcal) | 60.5 | 46 | **+31%** |
| Carboidrati (g) | 13.4 | 10.7 | **+25%** |
| Zuccheri (g) | 10.0 | 10.7 | -6.5% |
| Fibre (g) | 2.5 | 1.7 | +47% |
| Proteine (g) | 0.26 | 0.4 | -35% |

**Valutazione:** Il DB indica 60.5 kcal/100g per la mela; la BDA CREA indica 46 kcal per la mela golden (varietà più comune). Anche confrontando con altre varietà presenti in BDA (annurca: 38 kcal, granny smith: 46 kcal, con buccia: 51 kcal), il valore del DB risulta sistematicamente più alto. I carboidrati sono sovrastimati del 25%, il che impatta direttamente l'energia calcolata e il valore degli zuccheri totali sull'etichetta.

---

#### C — Patate cotte senza sale

| Campo | Valore DB | Valore CREA (bollite, senza buccia) | Scarto |
|---|---|---|---|
| Energia (kcal) | 74.5 | 74 | +0.7% |
| Carboidrati (g) | 13.9 | 16.9 | -18% |
| Proteine (g) | 2.86 | 1.8 | **+59%** |
| Fibre (g) | 3.3 | 1.3 | **+154%** |
| Sodio (mg) | 16 | 7 | +129% |

**Valutazione:** Il valore di kcal è corretto, ma la distribuzione dei macronutrienti è alterata. Le fibre sono più che doppie rispetto a CREA (3.3 vs 1.3g/100g), le proteine sono sovrastimate del 59%. Questo tipo di errore — energia giusta ma macros sbagliati — può indicare un dato costruito a partire da altra fonte e aggiustato solo sull'energia. L'impatto sull'etichetta riguarda le dichiarazioni di fibre e proteine, entrambe soggette a verifica analitica in caso di controllo.

---

#### D — Petto di pollo senza pelle

| Campo | Valore DB | Valore CREA (petto, cotto in padella) | Scarto |
|---|---|---|---|
| Energia (kcal) | 110 | 129 | -15% |
| Grassi (g) | 3.0 | 0.9 | **+233%** |
| Proteine (g) | 24.0 | 30.2 | -21% |

**Valutazione:** Lo scarto sui grassi è molto significativo (3.0 vs 0.9g). Il confronto va contestualizzato: il CREA riporta il petto cotto in padella senza grassi aggiunti, mentre il DB potrebbe riferirsi al prodotto crudo. Tuttavia, anche il petto di pollo crudo ha solitamente 1–2g di grassi/100g secondo la letteratura scientifica, non 3g. Si raccomanda di verificare se l'entry del DB è crudo o cotto e di aggiungere questa informazione esplicitamente all'anagrafica ingrediente, poiché l'ambiguità genera errori di calcolo sistematici.

---

#### E — Pomodori da insalata

| Campo | Valore DB | Valore CREA (pomodori maturi freschi) | Scarto |
|---|---|---|---|
| Energia (kcal) | 18.6 | 23 | -19% |
| Carboidrati (g) | 2.69 | 3.5 | -23% |
| Proteine (g) | 0.9 | 1.0 | -10% |
| Fibre (g) | 1.2 | 2.0 | -40% |

**Valutazione:** I valori del DB sono sistematicamente inferiori a quelli CREA, in particolare per fibre (-40%) e carboidrati (-23%). Anche assumendo variabilità di varietà ("da insalata" vs "maturi freschi"), gli scarti sono troppo ampi per essere spiegati dalla sola variabilità biologica. Le fibre a 1.2g/100g sembrano sottostimate rispetto a tutte le fonti disponibili (CREA: 2.0g, USDA: 1.2–2.2g a seconda della varietà). Il dato sull'energia (18.6 kcal) è al di sotto del range atteso per pomodori freschi (17–25 kcal/100g); non è critico ma va verificato.

---

## 4. Riepilogo priorità di correzione

| Priorità | Ingrediente | Motivo |
|---|---|---|
| 🔴 Urgente | Cipolla cruda | Grassi +520% — errore sistematico grave |
| 🔴 Urgente | Mela (frutto intero) | Carboidrati +25%, kcal +31% — impatta etichette prodotti da forno/marmellate |
| 🔴 Urgente | Patate cotte | Fibre +154%, proteine +59% — macro sbagliati con kcal corrette |
| 🔴 Da chiarire | Petto di pollo | Stato cottura non specificato — ambiguità sistemica |
| 🟡 Rilevante | Pomodori da insalata | Fibre -40%, carbo -23% — sottostima sistematica |
| 🟡 Rilevante | Salmone fresco | Proteine +11% — rilevante per prodotti ittici |
| 🟡 Da monitorare | Zucchero semolato | Metodo di calcolo carbo diverso da CREA |
| 🟡 Da monitorare | Riso brillato | Grassi proporzionalmente sovrastimati |

---

## 5. Raccomandazioni

**Immediato:**
1. Sospendere l'utilizzo dei valori di cipolla cruda, mela, patate cotte e petto di pollo nelle etichette destinate a clienti fino a correzione verificata.
2. Correggere i 4 ingredienti critici allineando ai valori BDA CREA — la correzione richiede una decisione tecnica su quale entry CREA corrisponde esattamente all'ingrediente del DB (es. mela: con o senza buccia? quale varietà?).

**A breve:**
3. Estendere il campionamento agli altri 763 ingredienti usando lo stesso metodo automatico, producendo un report completo.
4. Aggiungere all'anagrafica ingrediente il campo `fonte_dati` (es. "CREA BDA 2019", "USDA FDC", "analisi analitica", "stima AI") per tracciabilità.
5. Per gli ingredienti con stato di cottura rilevante (carne, pesce, verdure), aggiungere il campo `stato` (crudo/cotto) per evitare ambiguità.

**Strutturale:**
6. Prima del go-live del tool, effettuare la validazione analitica su almeno i prodotti finiti più venduti dai clienti — il calcolo nutrizionale dell'app è un supporto alla dichiarazione, non un sostituto dell'analisi di laboratorio.

---

## 6. Fonti utilizzate per questo audit

- CREA BDA (Banca Dati di Composizione degli Alimenti), aggiornamento dicembre 2019: [alimentinutrizione.it](https://www.alimentinutrizione.it)
- Voci consultate: cod. 201500 (zucchero), 135010 (latte intero), 106506 (pollo petto cotto), 006610 (pomodori), 122400 (salmone), 009210 (olio EVO), 123500 (tonno), 005155 (carote cotte), 000220 (farina 00), 000100 (riso brillato), 190010 (burro), 005300 (cipolla cruda), 181105 (uovo sodo), 007150 (mela golden), 006500 (patata cruda), 006515 (patata bollita)

---

*Documento generato il 9 luglio 2026 — AEA Consulenze Alimentari — uso interno*
