# Validazione dati ingredienti vs CREA BDA

**Data:** 2026-09-10  
**Task:** DATA-1  
**Autore:** Claude (subagent)

---

## Fonte dati CREA

Il dominio `bdaiep.crea.gov.it` (menzionato nel task) **non è raggiungibile** (DNS non risolve).

La fonte ufficiale accessibile è **`https://www.alimentinutrizione.it`** — portale CREA/INN (Istituto Nazionale di Nutrizione) che espone:
- Un endpoint AJAX per elenco alimenti per categoria: `POST /index.php?option=com_ajax&plugin=Alicat&method=Alicat&format=json` con body `cat=XX`
- Pagine HTML per alimento: `/tabelle-nutrizionali/{ALI_ID}` — i nutrienti si trovano in una tabella HTML strutturata
- ~900 alimenti in 19 categorie

Questo è lo stesso endpoint usato dal command `sync_crea.py` del backend Django.

**Non esiste un'API REST JSON per i valori nutrizionali singoli.** L'unico modo programmatico è fare scraping HTML della pagina per alimento, esattamente come fa `sync_crea.py`.

---

## Sale: non presente in CREA BDA

Il sale da cucina (NaCl) **non è listato** nelle 19 categorie CREA. I valori del nostro DB (`kcal=0, prot=0, fat=0, carbs=0, fibre=0`) sono corretti per definizione (sale puro = solo sodio e cloro, zero macro). Nessuna discrepanza da segnalare.

---

## Risultati confronto (per 100g)

Soglia di discrepanza significativa: **>10%** su kcal, proteine, grassi, carboidrati, fibra.

### Legenda

- ✅ Allineato (differenze <10% su tutti i macro)
- ⚠️ Divergenza significativa (>10% su almeno un macro)
- ❌ Assenza nel DB / corrispondenza assente
- ℹ️ Nota metodologica

---

### 1. Pasta di semola

| Nutriente | DB (`pasta di semola di grano duro`) | CREA (ALI_ID 000800) | Δ% |
|-----------|--------------------------------------|----------------------|----|
| Energia (kcal) | 353.9 | 341 | +3.8% |
| Proteine (g) | 11.0 | 13.5 | **-18.5%** |
| Grassi (g) | 1.3 | 1.2 | +8.3% |
| Carboidrati (g) | 73.2 | 72.7 | +0.7% |
| Fibra (g) | 2.7 | 1.7 | **+58.8%** |

**⚠️ DIVERGENZA** — Le proteine del nostro DB (11.0 g) sono sottostimate rispetto a CREA (13.5 g, -18.5%). La fibra è sovrabbondante (+58.8%). Il nostro valore sembra allineato a dati di produttori specifici anziché alla BDA generica.

---

### 2. Farina di frumento tipo 00

| Nutriente | DB (`farina tipo '00' - 1`) | CREA (ALI_ID 000220) | Δ% |
|-----------|----------------------------|----------------------|----|
| Energia (kcal) | 346.5 | 323 | +7.3% |
| Proteine (g) | 11.0 | 11.0 | 0% |
| Grassi (g) | 2.5 | 0.7 | **+257%** |
| Carboidrati (g) | 69.0 | 71.6 | -3.6% |
| Fibra (g) | 2.0 | 2.2 | -9.1% |

**⚠️ DIVERGENZA CRITICA** — I grassi del nostro DB (2.5 g) sono 3.5× superiori a CREA (0.7 g). La farina tipo 00 dovrebbe avere ~0.7-1.0 g di grassi. Il valore 2.5 g appare errato — probabilmente deriva da una scheda fornitore specifica o da confusione con una farina rinforzata. Il DB ha **più voci** per la farina 00 con valori diversi (range 1.0–2.5 g grassi); la voce CREA è quella di riferimento normativo.

---

### 3. Uova di gallina (intero)

| Nutriente | DB (`uova`) | CREA (ALI_ID 181100) | Δ% |
|-----------|------------|----------------------|----|
| Energia (kcal) | 140.35 | 128 | +9.6% |
| Proteine (g) | 12.7 | 12.4 | +2.4% |
| Grassi (g) | 9.83 | 8.7 | **+13.0%** |
| Carboidrati (g) | 0.27 | n.d. (CREA non riporta carbs) | — |
| Fibra (g) | 0.0 | 0.0 | 0% |

**⚠️ DIVERGENZA MINORE** — I grassi risultano +13% rispetto a CREA. L'energia è +9.6% (appena sotto soglia). Le uova hanno variabilità naturale importante in base a razza e alimentazione della gallina; la differenza è plausibile ma da monitorare. CREA non riporta carboidrati (n.d.) mentre il DB ha 0.27 g.

---

### 4. Latte vaccino intero pastorizzato

| Nutriente | DB (`latte intero`) | CREA (ALI_ID 135010) | Δ% |
|-----------|---------------------|----------------------|----|
| Energia (kcal) | 65.35 | 64 | +2.1% |
| Proteine (g) | 3.32 | 3.3 | +0.6% |
| Grassi (g) | 3.63 | 3.6 | +0.8% |
| Carboidrati (g) | 4.85 | 4.9 | -1.0% |
| Fibra (g) | 0.0 | 0.0 | 0% |

**✅ ALLINEATO** — Differenze <3% su tutti i macro. Eccellente corrispondenza.

---

### 5. Burro

| Nutriente | DB (`burro`) | CREA (ALI_ID 190010) | Δ% |
|-----------|--------------|----------------------|----|
| Energia (kcal) | 761.6 | 758 | +0.5% |
| Proteine (g) | 0.7 | 0.8 | -12.5% |
| Grassi (g) | 84.0 | 83.4 | +0.7% |
| Carboidrati (g) | 0.7 | 1.1 | -36.4% |
| Fibra (g) | 0.0 | 0.0 | 0% |

**ℹ️ SOSTANZIALMENTE ALLINEATO** — Le differenze sui macro principali (grassi, kcal) sono <1%. I carboidrati (0.7 vs 1.1 g) divergono del 36% ma su valori assoluti trascurabili (<1 g). Le proteine divergono di -12.5% ma su valore assoluto di 0.1 g — irrilevante etichettatura.

---

### 6. Olio di oliva

| Nutriente | DB (`olio di oliva`) | CREA (ALI_ID 009200) | Δ% |
|-----------|----------------------|----------------------|----|
| Energia (kcal) | 899.1 | 899 | 0% |
| Proteine (g) | 0.0 | 0.0 | 0% |
| Grassi (g) | 99.9 | 99.9 | 0% |
| Carboidrati (g) | 0.0 | 0.0 | 0% |
| Fibra (g) | 0.0 | 0.0 | 0% |

**✅ PERFETTAMENTE ALLINEATO.**

---

### 7. Pomodori maturi freschi

| Nutriente | DB | CREA (ALI_ID 006610) | Δ% |
|-----------|-----|----------------------|----|
| Energia (kcal) | — | 23 | — |
| Proteine (g) | — | 1.0 | — |
| Grassi (g) | — | 0.2 | — |
| Carboidrati (g) | — | 3.5 | — |
| Fibra (g) | — | 2.0 | — |

**❌ ASSENZA DIRETTA** — Nel DB non esiste la voce "pomodori maturi freschi" come ingrediente semplice di base. Le voci disponibili sono: `polpa di pomodoro` (kcal=27.9), `pomodoro a pezzettoni` (kcal=25.6), `passata di pomodoro` (kcal=47.1), `pomodoro concentrato`, `pomodori secchi`. Il pomodoro fresco crudo non è presente come ingrediente di riferimento — lacuna da colmare.

---

### 8. Mozzarella di vacca

| Nutriente | DB (`mozzarella di vacca`) | CREA (ALI_ID 164820) | Δ% |
|-----------|---------------------------|----------------------|----|
| Energia (kcal) | 228.66 | 253 | **-9.6%** |
| Proteine (g) | 16.5 | 18.7 | **-11.8%** |
| Grassi (g) | 17.7 | 19.5 | **-9.2%** |
| Carboidrati (g) | 0.75 | 0.7 | +7.1% |
| Fibra (g) | 0.0 | 0.0 | 0% |

**⚠️ DIVERGENZA** — Il nostro DB sottostima sistematicamente energia (-9.6%), proteine (-11.8%) e grassi (-9.2%) rispetto a CREA. La mozzarella di vacca CREA è la versione standard da latte intero; il nostro valore potrebbe corrispondere a mozzarella a ridotto contenuto di grassi. Da aggiornare con i valori CREA.

---

### 9. Parmigiano Reggiano DOP

| Nutriente | DB (`formaggio parmigiano reggiano`) | CREA (ALI_ID 166000) | Δ% |
|-----------|--------------------------------------|----------------------|----|
| Energia (kcal) | 401.3 | 397 | +1.1% |
| Proteine (g) | 33.5 | 32.4 | +3.4% |
| Grassi (g) | 29.7 | 29.7 | 0% |
| Carboidrati (g) | 0.0 | n.d. | — |
| Fibra (g) | 0.0 | 0.0 | 0% |

**✅ ALLINEATO** — Differenze <5% su tutti i macro misurabili. Ottima corrispondenza.

---

### 10. Prosciutto crudo di Parma DOP

| Nutriente | DB (`prosciutto crudo`) | CREA (ALI_ID 110510) | Δ% |
|-----------|------------------------|----------------------|----|
| Energia (kcal) | 267.0 | 269 | -0.7% |
| Proteine (g) | 28.0 | 25.9 | +8.1% |
| Grassi (g) | 17.0 | 18.3 | -7.1% |
| Carboidrati (g) | 0.5 | 0.3 | +66.7% |
| Fibra (g) | 0.0 | 0.0 | 0% |

**ℹ️ SOSTANZIALMENTE ALLINEATO** — Kcal praticamente identici. Le proteine divergono +8.1% (sotto soglia). I carboidrati divergono del 66% ma su valore assoluto irrilevante (0.2 g di differenza). Nel complesso accettabile.

---

### 11. Tonno (crudo, pinna gialla)

| Nutriente | DB (`tonno crudo-pinna gialla`) | CREA (ALI_ID 123500) | Δ% |
|-----------|--------------------------------|----------------------|----|
| Energia (kcal) | 159.3 | 159 | +0.2% |
| Proteine (g) | 21.5 | 21.5 | 0% |
| Grassi (g) | 8.1 | 8.1 | 0% |
| Carboidrati (g) | 0.0 | 0.1 | — |
| Fibra (g) | 0.0 | 0.0 | 0% |

**✅ PERFETTAMENTE ALLINEATO** — Il DB contiene già la voce CREA `tonno crudo-pinna gialla`. Corrispondenza esatta: il sync_crea era già stato eseguito su questo ingrediente.

---

### 12. Salmone

| Nutriente | DB (`pesce salmone fresco`) | CREA (ALI_ID 122400) | Δ% |
|-----------|----------------------------|----------------------|----|
| Energia (kcal) | 194.1 | 185 | +4.9% |
| Proteine (g) | 20.5 | 18.4 | **+11.4%** |
| Grassi (g) | 12.4 | 12.0 | +3.3% |
| Carboidrati (g) | 0.0 | 1.0 | — |
| Fibra (g) | 0.25 | 0.0 | — |

**⚠️ DIVERGENZA MINORE** — Le proteine del nostro DB sono +11.4% rispetto a CREA (20.5 vs 18.4 g). CREA riporta 1.0 g carboidrati (insolito per il salmone crudo, probabilmente è traccia di glicogeno muscolare). Il nostro valore sembra da fonte USDA (più alta stima proteica); la fonte CREA è preferibile per normativa UE.

---

### 13. Pollo petto crudo

| Nutriente | DB (`petto di pollo senza pelle`) | CREA (ALI_ID 106500) | Δ% |
|-----------|----------------------------------|----------------------|----|
| Energia (kcal) | 110.0 | 100 | **+10.0%** |
| Proteine (g) | 24.0 | 23.3 | +3.0% |
| Grassi (g) | 1.9 | 0.8 | **+137.5%** |
| Carboidrati (g) | 0.0 | 0.0 | 0% |
| Fibra (g) | 0.0 | 0.0 | 0% |

**⚠️ DIVERGENZA SIGNIFICATIVA** — I grassi del nostro DB (1.9 g) sono 2.4× superiori a CREA (0.8 g). Questo impatta l'energia (+10%). Il petto di pollo senza pelle secondo CREA è molto magro (0.8 g grassi); i nostri 1.9 g sembrano riferirsi a una misura con una minima parte di pelle. Da aggiornare.

---

### 14. Riso brillato

| Nutriente | DB (`riso ribe`) | CREA (ALI_ID 000100) | Δ% |
|-----------|-----------------|----------------------|----|
| Energia (kcal) | 354.0 | 334 | **+6.0%** |
| Proteine (g) | 6.7 | 6.7 | 0% |
| Grassi (g) | 0.4 | 0.4 | 0% |
| Carboidrati (g) | 80.4 | 80.4 | 0% |
| Fibra (g) | 1.0 | 1.0 | 0% |

**ℹ️ QUASI ALLINEATO** — Proteine, grassi, carboidrati e fibra sono identici. La differenza di energia (354 vs 334 kcal, +6%) è spiegabile dal metodo di calcolo: CREA usa il metodo Southgate (fattori AT+D di Atwater modificati), mentre il nostro DB potrebbe usare i fattori Atwater standard (4/9/4). Per il riso brillato la differenza è nel fattore applicato all'amido. Non è un errore di dati grezzi.

---

### 15. Pane bianco

| Nutriente | DB | CREA (ALI_ID 000530) | Δ% |
|-----------|-----|----------------------|----|
| Energia (kcal) | — | 268 | — |
| Proteine (g) | — | 8.1 | — |
| Grassi (g) | — | 0.5 | — |
| Carboidrati (g) | — | 59.5 | — |
| Fibra (g) | — | 3.8 | — |

**❌ ASSENZA DIRETTA** — Nel DB non esiste "pane bianco" o "pane comune" come voce base. Presenti solo voci specializzate (pane con glutine di grano, crostini preconfezionati, pane varie ricette). Lacuna da colmare per ingrediente molto comune in etichettatura.

---

### 16. Pepe nero

| Nutriente | DB (`pepe nero`) | CREA (ALI_ID 006820) | Δ% |
|-----------|-----------------|----------------------|----|
| Energia (kcal) | 330.1 | 311 | **+6.1%** |
| Proteine (g) | 13.3 | 11.4 | **+16.7%** |
| Grassi (g) | 7.5 | 3.3 | **+127.3%** |
| Carboidrati (g) | 39.5 | 49.0 | **-19.4%** |
| Fibra (g) | 25.7 | 25.9 | -0.8% |

**⚠️ DIVERGENZA CRITICA** — Il pepe nero mostra divergenze importanti: i grassi del nostro DB (7.5 g) sono 2.3× superiori a CREA (3.3 g); i carboidrati sono -19.4% inferiori. La fibra è coerente. Il nostro dato sembra provenire da una fonte diversa (USDA riporta ~3.3 g grassi per il pepe nero essiccato, mentre alcune fonti di produttori riportano 6–8 g). Da allineare a CREA.

---

### 17. Aglio

| Nutriente | DB (`aglio fresco`) | CREA (ALI_ID 005000) | Δ% |
|-----------|---------------------|----------------------|----|
| Energia (kcal) | 113.13 | 53 | **+113.4%** |
| Proteine (g) | 5.31 | 8.4 | **-36.8%** |
| Grassi (g) | 0.5 | 0.8 | -37.5% |
| Carboidrati (g) | 18.6 | 1.0 | **+1760%** |
| Fibra (g) | 5.8 | 4.3 | +34.9% |

**⚠️ DIVERGENZA CRITICA** — L'aglio nel nostro DB ha valori completamente diversi da CREA:
- Kcal: 113 vs 53 (DB è +113%)
- Carboidrati: 18.6 vs 1.0 g (DB è 18× superiore)
- Proteine: 5.31 vs 8.4 g (DB è -37%)

Il valore CREA (ALI_ID 005000) indica: kcal=53, prot=8.4, fat=0.8, carbs=1.0, fibre=4.3. I valori del nostro DB (`aglio fresco`, kcal=113) sembrano derivare da una fonte che calcola l'aglio crudo con una quota maggiore di amido/carboidrati — plausibile per aglio secco o semidisidratato, non per aglio fresco. C'è anche `aglio (zolla)` nel DB con kcal=20.76 — ancora un altro set. **L'aglio nel nostro DB è incoerente e diverge fortemente da CREA.**

---

### 18. Zucchero

| Nutriente | DB (`zucchero semolato`) | CREA (ALI_ID 201500) | Δ% |
|-----------|-------------------------|----------------------|----|
| Energia (kcal) | 399.2 | 392 | +1.8% |
| Proteine (g) | 0.0 | 0.0 | 0% |
| Grassi (g) | 0.0 | 0.0 | 0% |
| Carboidrati (g) | 99.8 | 104.5 | -4.5% |
| Fibra (g) | 0.0 | 0.0 | 0% |

**✅ SOSTANZIALMENTE ALLINEATO** — La differenza in carboidrati (99.8 vs 104.5 g) è spiegata dalla metodologia CREA: il metodo Southgate per il saccarosio restituisce valori >100 g per 100 g perché include l'acqua di idrolisi. Il nostro valore (99.8 g) è corretto per etichettatura EU (valori "as-is").

---

### 19. Manzo (vitellone)

| Nutriente | DB | CREA (ALI_ID 101130 — tagli post.) | Δ% |
|-----------|----|------------------------------------|-----|
| Energia (kcal) | — | 117 | — |
| Proteine (g) | — | 21.5 | — |
| Grassi (g) | — | 3.4 | — |
| Carboidrati (g) | — | 0.0 | — |

**❌ ASSENZA PARZIALE** — Il DB non ha "manzo" crudo come ingrediente generico. Ha `carne di manzo cotta` (kcal=172, prot=34 — valori post-cottura non confrontabili con CREA crudo). Manca la voce "manzo/vitellone crudo" generica.

---

### 20. Sale

**✅ CORRETTO** — Sale (NaCl) non è in CREA BDA. DB: kcal=0, prot=0, fat=0, carbs=0. Corretto.

---

## Riepilogo valutazione qualità

| Ingrediente | Stato | Criticità principale |
|-------------|-------|---------------------|
| Pasta di semola | ⚠️ | Proteine -18.5%, Fibra +58.8% |
| Farina tipo 00 | ⚠️ | Grassi +257% (3.5× CREA) |
| Uova di gallina | ⚠️ | Grassi +13% |
| Latte vaccino intero | ✅ | — |
| Burro | ✅ | — |
| Olio di oliva | ✅ | Perfetta corrispondenza |
| Pomodori maturi freschi | ❌ | Voce assente nel DB |
| Mozzarella di vacca | ⚠️ | Energia -9.6%, Proteine -11.8%, Grassi -9.2% |
| Parmigiano Reggiano DOP | ✅ | — |
| Prosciutto crudo di Parma | ✅ | Micro-differenze tollerabili |
| Tonno (pinna gialla) | ✅ | Perfetta corrispondenza (già sync CREA) |
| Salmone | ⚠️ | Proteine +11.4% |
| Pollo petto crudo | ⚠️ | Grassi +137.5% (1.9 vs 0.8 g) |
| Riso brillato | ✅ | Solo diff. metodo calcolo kcal |
| Pane bianco | ❌ | Voce assente nel DB |
| Pepe nero | ⚠️ | Grassi +127%, Carbs -19% |
| Aglio | ⚠️ | Divergenza critica: Kcal +113%, Carbs ×18 |
| Zucchero | ✅ | Diff. metodologica normale |
| Manzo vitellone | ❌ | Voce cruda assente nel DB |
| Sale | ✅ | — |

**Conteggio:**
- ✅ Allineati: 8 (40%)
- ⚠️ Divergenti >10%: 9 (45%)
- ❌ Assenti/non confrontabili: 3 (15%)

---

## Valutazione qualità dati complessiva

**Qualità: MEDIA-BASSA per ingredienti semplici comuni.**

Il DB è ottimizzato per ingredienti industriali specifici (centinaia di voci per farine, oli, paste speciali con dati fornitore) ma **i valori degli ingredienti base generici divergono sistematicamente da CREA** — in molti casi perché i dati provengono da schede produttore o USDA invece di BDA italiana.

Problemi sistemici identificati:

1. **Grassi sovrastimati** per pasta (farina), pollo petto, pepe nero — probabilmente da fonte USDA che misura diverse varietà
2. **Aglio: dato errato** — 3 voci con valori incompatibili tra loro e con CREA; `aglio fresco` ha carboidrati 18.6 g vs CREA 1.0 g
3. **Voci base mancanti**: pomodoro fresco crudo, pane bianco comune, manzo crudo generico
4. **Mozzarella di vacca sottostimata** sistematicamente (~10% sotto CREA)

---

## Raccomandazioni

### Priorità 1 — Correzione dati errati

| Ingrediente | Azione | Fonte |
|-------------|--------|-------|
| Aglio fresco | Sostituire con CREA 005000: kcal=53, prot=8.4, fat=0.8, carbs=1.0, fibre=4.3 | CREA BDA |
| Pollo petto senza pelle | Aggiornare grassi a 0.8 g (da 1.9 g) | CREA 106500 |
| Farina tipo 00 (voce principale) | Verificare grassi — CREA indica 0.7 g, non 2.5 g | CREA 000220 |
| Pasta di semola | Allineare proteine a 13.5 g (da 11.0 g) | CREA 000800 |

### Priorità 2 — Voci base mancanti

Aggiungere al DB:
- `Pomodori freschi maturi` — CREA 006610: kcal=23, prot=1.0, fat=0.2, carbs=3.5, fibre=2.0
- `Pane bianco` — CREA 000530: kcal=268, prot=8.1, fat=0.5, carbs=59.5, fibre=3.8
- `Manzo/vitellone crudo` — CREA 101130: kcal=117, prot=21.5, fat=3.4, carbs=0.0

### Priorità 3 — Revisione con tolleranza

- Mozzarella di vacca: valutare se aggiornare a CREA (253 kcal) o mantenere valore attuale (alcuni clienti potrebbero usare versioni light)
- Salmone: proteine leggermente alte (+11.4%) — dentro la variabilità naturale del pesce; non urgente
- Pepe nero: da riallineare a CREA 006820 (grassi 3.3 g, carbs 49 g)

### Priorità 4 — Infrastruttura sync CREA

Il command `sync_crea.py` è già implementato. Si raccomanda:
- Eseguire `python manage.py sync_crea --category 03` (verdure, include aglio e pomodori)
- Eseguire `python manage.py sync_crea --category 01` (cereali, include pasta, riso, pane)
- Eseguire `python manage.py sync_crea --category 06` (carni, include pollo e vitellone)
- Eseguire `python manage.py sync_crea --category 12` (formaggi, include mozzarella)

Questo allineerebbe automaticamente tutti gli ingredienti che hanno un match CREA.

---

## Note metodologiche

- **Carbs zucchero CREA = 104.5 g**: Il metodo Southgate per il saccarosio restituisce valori >100 g/100 g (include acqua di idrolisi). Per etichettatura EU si usa il valore diretto (99.8 g del nostro DB) — corretto.
- **Kcal riso brillato**: differenza +6% tra DB e CREA spiegata da fattori Atwater diversi — non è errore sui dati grezzi.
- **Sale**: correttamente assente da CREA (non alimento).
- **Variabilità naturale**: pesce (salmone, tonno), latte, uova hanno variabilità intrinseca ±10–15% tra campioni; differenze in questo range sono fisiologiche.
