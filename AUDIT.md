# AUDIT.md — AEA Consulenze Alimentari App
**Data:** 2026-07-07 | **Stack:** React 19 + TypeScript + Vite (+ backend Django per auth) | **Versione analizzata:** branch `main`
**Revisione:** v1.1 — integrata con findings aggiuntivi (sezioni marcate 🆕) e sezione 6 "Da verificare"

---

## 1. Bug reali e logica di calcolo errata

### B1 — CRITICO · Etichetta "sodium" non tradotta nei claim nutrizionali
**File:** `src/engines/nutritionalEngine.ts:256-285`

`sourceThresholds` include la chiave `'sodium'`, ma l'oggetto `nutrientNames` (riga 234) non ha la voce `sodium`. Il fallback `|| nutrient` restituisce la stringa inglese.

**Effetto:** il claim generato in italiano recita letteralmente **"A BASSO CONTENUTO DI sodium"**.

```ts
// nutrientNames (riga 234): manca 'sodium'
const nutrientNames = { ..., salt: 'SALE', calcium: 'CALCIO', ... };
//                                                 ↑ 'sodium' è assente

// risultato a runtime:
const name = nutrientNames['sodium'] || 'sodium'; // → "sodium" (inglese)
claims.push(`A BASSO CONTENUTO DI ${name}`);       // → "A BASSO CONTENUTO DI sodium"
```

**Fix:** aggiungere `sodium: 'SODIO'` a `nutrientNames`.

---

### B2 — MEDIO · Soglia claim "basso contenuto di sodio": `<` invece di `<=`
**File:** `src/engines/nutritionalEngine.ts:273`

```ts
if (value < 0.12) {   // ← sbagliato
```

EU Reg 2006/1924 Allegato: "basso contenuto di sodio/sale" si applica a prodotti con **≤ 120 mg/100g** (≤ 0.12 g/100g). Un prodotto esattamente a 120 mg/100g non ottiene il claim.

**Fix:** `if (value <= 0.12)`

🆕 **Nota estensiva:** trovati due errori su soglie claim in un controllo a campione. È prudente assumere che possano essercene altri. Vedi azione V1 in sezione 6: verifica sistematica di **tutte** le soglie implementate contro l'Allegato del Reg. 2006/1924 (senza grassi, senza zuccheri, fonte di fibre, ad alto contenuto di fibre, fonte di proteine, fonte di [vitamina/minerale], ecc.), incluso l'operatore di confronto (≤ vs <) per ciascuna.

---

### B3 — MEDIO · Nessuna distinzione solido/liquido nei claim "basso contenuto di"
**File:** `src/engines/nutritionalEngine.ts:288-295`

| Claim | Soglia usata | Soglia corretta per liquidi (EU 2006/1924) |
|---|---|---|
| `A BASSO CONTENUTO DI ZUCCHERI` | ≤ 5 g/100g | ≤ 2,5 g/100 ml |
| `A BASSO CONTENUTO DI GRASSI` | ≤ 3 g/100g | ≤ 1,5 g/100 ml |

Un succo di frutta a 3 g di grassi/100 ml otterrebbe il claim "basso contenuto di grassi" anche se la soglia EU per i liquidi è 1,5 g. **Falso claim su etichetta = non conformità normativa.**

La funzione non riceve informazioni su stato fisico del prodotto (solido/liquido) — questo è il limite strutturale.

**Fix:** aggiungere parametro `isLiquid: boolean` a `generateNutritionalClaims` con doppia tabella soglie. Nella UI: toggle "Prodotto liquido" nella scheda prodotto.

---

### B4 — MEDIO · Input decimale mobile: virgola italiana non convertita
**File:** `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx:338-351`

Il desktop converte esplicitamente la virgola nel `NumericInput`:
```ts
// NutrizionaleCalc.tsx:802 — DESKTOP ✅
onChange?.(v.replace(',', '.'));
```

Il mobile usa `parseFloat` diretto senza sostituzione:
```ts
// CalcoloTab.tsx:340 — MOBILE ✗
const handleGrams = (v: string) => {
    const num = parseFloat(v);   // parseFloat("1,5") → 1 (tronca alla virgola)
    if (!isNaN(num) && num >= 0) onUpdate(compId, row.id, { grams: num });
};
```

Su Android con locale italiano alcuni campi `type="number"` restituiscono valori con virgola. L'errore è **silenzioso**: l'ingrediente viene aggiunto con grammi troncati senza nessun messaggio di errore.

**Fix:** `.replace(',', '.')` in `handleGrams`, `handleResa`, `handleEur` — idealmente centralizzando il parsing in una utility `parseDecimalIT()` condivisa desktop/mobile, così il bug non può ripresentarsi in nuovi campi.

---

### ✅ B5 — BASSO · Due motori di calcolo paralleli con schemi dati divergibili
**Stato:** MARCATO — 2026-07-07

`nutritionalEngine.ts` confermato non chiamato da nessun file. Aggiunto commento esplicito in testa al file: non usare in nuovi feature, tenuto come riferimento per Q4 (unificazione schemi). Il calculator reale usa `nutrizionaleCalcEngine.ts`.
**File:** `src/engines/nutritionalEngine.ts` vs `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx:200-285`

Esistono due implementazioni separate del calcolo nutrizionale:

| | Engine condiviso | Engine locale |
|---|---|---|
| File | `nutritionalEngine.ts` | `NutrizionaleCalc.tsx:calcNutrients()` |
| Schema ingredienti | `IngredientDB` (nomi inglesi: `fat`, `carbs`) | `DBIngredient` (nomi italiani: `grassi`, `carboidrati`) |
| DB sorgente | `ingredientsDB.ts` (non usato a runtime) | `ingredientsDB.json` via fetch |

Il tool principale usa esclusivamente l'engine locale. `nutritionalEngine.ts:calculateFromRecipe()` non è chiamato da nessun calculator. Modifiche alle regole di calcolo in uno dei due non si propagano all'altro.

🆕 **Rischio aggravante:** i claim (B1–B3) vivono in `nutritionalEngine.ts`. Chiarire quale percorso di codice genera effettivamente i claim mostrati all'utente: se i fix B1/B2 vengono applicati all'engine sbagliato, il bug resta in produzione. Prima azione del fix: tracciare la call-chain reale dal bottone "Genera claim" della UI.

---

## 2. Sicurezza

### 🆕 S0 — CRITICO · ingredientsDB.json pubblicamente scaricabile: esposizione dell'asset core
**File:** `public/data/ingredientsDB.json` (478 KB, 1071 ingredienti)

Tutto ciò che sta in `public/` viene servito da Vercel senza alcun controllo: chiunque può scaricare l'intero database nutrizionale con una singola richiesta GET all'URL diretto, senza login, senza rate limit. Il DB è l'asset di valore dell'app e la base del modello ad abbonamento per gli ~800 clienti: **al momento è un download gratuito per chiunque, concorrenti inclusi.**

Combinato con S4 (credenziali mock nel bundle), il perimetro effettivo dell'app è zero: dati e accesso admin sono entrambi pubblici.

**Azione (in ordine di robustezza crescente):**
1. *Minimo (subito):* spostare il file fuori da `public/` e servirlo tramite endpoint autenticato del backend Django già esistente (`/api/ingredients/`), con il JWT già in uso.
2. *Meglio:* endpoint di **ricerca** (`/api/ingredients/search?q=`) che restituisce solo i match, mai il dataset intero — protegge il DB anche dagli utenti autenticati e riduce drasticamente il payload mobile (vedi P3).
3. In entrambi i casi: rate limiting sull'endpoint (Django REST Framework throttling).

---

### S1 — CRITICO · jsPDF: PDF Object Injection
**CVE:** GHSA-7x6v-j9x4-qf24, GHSA-wfv2-pwc8-crg5

jsPDF ha due vulnerabilità aperte: iniezione di oggetti PDF via colori FreeText annotation e HTML injection nei percorsi "open in new window". Se testo utente (nome prodotto, nome ingrediente) finisce in un'annotazione FreeText senza sanitizzazione, il PDF generato può contenere oggetti malevoli.

**Azione:** `npm ls jspdf` per verificare la versione esatta; aggiornare se < 2.5.0. Verificare se l'app usa FreeText annotations nel `pdfGenerator.ts`.

---

### S2 — ALTO · react-router: 7 CVE HIGH (open redirect applicabile)
**CVE principali:** GHSA-2j2x-hqr9-3h42, GHSA-49rj-9fvp-4h2h, GHSA-8646-j5j9-6r62

La maggior parte richiede SSR/RSC non usato in questa SPA. **Eccezione:** GHSA-2j2x-hqr9-3h42 (open redirect via URL protocol-relative `//`) è applicabile anche a SPA.

**Azione:** aggiornare `react-router-dom` all'ultima versione stabile.

---

### S3 — ALTO · Vite: path traversal nel dev server
**CVE:** GHSA-4w7w-66w2-5vf9, GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583

Impatta solo il dev server, non i build di produzione. Tuttavia chi accede al dev server sulla rete locale (CI/CD, colleghi) è esposto.

**Azione:** `npm update vite` — non richiede modifiche al codice.

---

### S4 — MEDIO · Credenziali demo nel bundle di produzione
**File:** `.env.local`

```
VITE_DEMO_PASSWORD=Demo2024!
VITE_ADMIN_PASSWORD=admin2024
```

Le variabili `VITE_*` vengono embed nel bundle JavaScript e sono visibili a chiunque apra il devtools del browser. Sono credenziali mock, ma un utente curioso può autenticarsi come admin senza registrazione.

**Azione:** per il build di produzione, o rimuovere le variabili o aggiungere un flag `VITE_MOCK_AUTH=false` che disabilita il fallback mock. 🆕 In prospettiva: eliminare del tutto il percorso mock dal bundle di produzione con dead-code elimination (`import.meta.env.PROD` guard), non solo con un flag runtime — un flag può essere manipolato da console.

---

### S5 — MEDIO · Token JWT in localStorage (XSS-readable)
**File:** `src/api/client.ts`

Token di accesso e refresh salvati in `localStorage`. Un attacco XSS può esfiltrarli. La best practice è usare httpOnly cookies (richiede cambio backend Django).

🆕 **Mitigazione ponte** (se il passaggio a httpOnly cookies non è immediato): access token a vita breve (≤ 15 min) + refresh token con rotazione lato Django; riduce la finestra utile di un token esfiltrato. Da combinare con S8 (CSP), che riduce la probabilità stessa dell'XSS.

---

### ✅ S6 — BASSO · JSON.parse da localStorage senza validazione schema
**Stato:** RISOLTO — 2026-07-07

Aggiunta `isValidDBIngredient()` in `src/utils/validation.ts` — type guard sui 10 campi obbligatori di `DBIngredient`. Applicata in tutti e 4 i punti che leggono `custom_ingredients` dal localStorage: `loadDB`, `importCustomIngredients`, `exportCustomIngredients`, `CustomIngredientModal` save. Record invalidi vengono silenziosamente scartati (comportamento safe: l'utente non perde i dati validi).

---

### 🆕 S7 — MEDIO · Nessun security header configurato su Vercel
**File:** `vercel.json` (assente o senza sezione `headers`)

Mancano gli header standard: `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. In particolare la **CSP è la mitigazione strutturale del rischio S5**: senza script esterni non autorizzati, la superficie XSS crolla.

**Azione:** aggiungere blocco `headers` in `vercel.json`. Partire con CSP in modalità `report-only` per una settimana, poi enforcing.

---

### 🆕 S8 — BASSO/DA VALUTARE · GDPR: dati clienti nel backend auth
Con auth Django e ~800 clienti reali previsti: verificare che esistano privacy policy, base giuridica del trattamento, e che le ricette/schede prodotto salvate (se il backend le persiste) siano considerate dati potenzialmente riservati dei clienti di AEA (segreto industriale delle loro formulazioni). Non è un finding tecnico ma un requisito prima del go-live commerciale.

---

## 3. Usabilità mobile

### M1 — ALTO · (vedi B4) Virgola decimale mobile non gestita

### M2 — MEDIO · Tabelle nutrizionali non responsive
**File:** `src/calculators/NutrizionaleCalc/TabUE.tsx`, `TabUSA.tsx`, `TabCanada.tsx`, `TabAustralia.tsx`, `TabArabi.tsx`

Le tabelle nutrizionali desktop sono a più colonne dense. Su viewport 360 px (Android comune) senza scrolling orizzontale esplicito, le colonne si sovrappongono o vengono troncate. Il layout mobile separato (`NutrizionaleCalcMobile`) le aggira, ma se `useMobile()` non scatta correttamente (es. tablet in portrait) l'utente vede la versione desktop non adattata.

🆕 **Raccomandazione strutturale:** la strategia "due alberi di componenti separati desktop/mobile" duplica la logica (è la causa diretta di B4: il fix della virgola esisteva sul desktop ma non sul mobile). Direzione a medio termine: componenti unici responsive con CSS (container queries / media queries) e logica condivisa; il branching JS `useMobile()` va limitato ai soli casi di UX radicalmente diversa. Riduce di ~metà la superficie di manutenzione del tool principale.

### M3 — BASSO · Touch target sidebar potenzialmente sotto i 44 px
**File:** `src/components/Sidebar.tsx`

La sidebar collassata è una rail di icone. Non è stato verificato se ogni bottone rispetti il minimo 44×44 px (Apple HIG) o 48×48 dp (Material Design). Da misurare con DevTools.

### 🆕 M4 — MEDIO · Nessuna gestione visibile del fallimento fetch del DB
**File:** fetch in `NutrizionaleCalc.tsx:1393`

Se il fetch di `ingredientsDB.json` fallisce (rete assente/instabile — scenario reale per consulenti in stabilimento o in campagna), da verificare cosa vede l'utente: ricerca ingredienti vuota senza spiegazione? Spinner infinito? Serve uno stato di errore esplicito con retry, e in prospettiva caching offline (vedi M6).

### ✅ M5 — MEDIO · Ingredienti custom solo in localStorage: rischio perdita dati
**Stato:** RISOLTO (bridge) — 2026-07-07

Aggiunti due bottoni in topbar: **Esporta Custom** (scarica `ingredienti_custom.json`) e **Importa Custom** (legge un JSON e fa merge deduplicato per nome). L'import è idempotente: ingredienti già presenti vengono ignorati con conteggio nel toast.

Rimane: sincronizzazione backend Django per portabilità cross-device (roadmap S0).

### 🆕 M6 — BASSO (roadmap) · PWA / offline
Manifest + service worker con caching di app shell e DB ingredienti renderebbero l'app installabile e utilizzabile con rete scarsa — plus concreto per il target (stabilimenti, celle, campagne). Da pianificare dopo S0, perché la strategia di caching dipende da come verrà servito il DB.

---

## 4. Performance

### P1 — ALTO · Nessun lazy loading dei componenti calculator
**File:** `src/App.tsx:8-16`

Tutti e 9 i componenti (7 calculator + 2 varianti mobile) sono static import:

```ts
import { NutrizionaleCalc } from './calculators/NutrizionaleCalc/NutrizionaleCalc';      // 3457 righe
import { NutrizionaleCalcMobile } from './calculators/NutrizionaleCalc/NutrizionaleCalcMobile';
import { EtichetteCalc } from './calculators/EtichetteCalc/EtichetteCalc';
// ... altri 6
```

La `manualChunks` in `vite.config.ts` divide solo le vendor library; i componenti app finiscono nello stesso chunk principale. **Un utente che usa solo il Trattamento Termico scarica anche tutto il codice del Nutrizionale.**

**Fix minimo:** `React.lazy()` + `<Suspense>` su ogni route in App.tsx.

---

### P2 — MEDIO · ingredientsDB.ts: 667 KB di dati mai usati a runtime
**File:** `src/data/ingredientsDB.ts`

Il file contiene sia l'interfaccia `IngredientDB` (usata come type-only import) sia l'array `INGREDIENTS_DB` (31.080 righe, mai importato). Tree-shaking dovrebbe eliminarlo dal bundle, ma:
- il file occupa 667 KB su disco con uno schema (nomi inglesi) diverso dal JSON runtime (nomi italiani)
- se qualcuno aggiunge accidentalmente un import dell'array, 667 KB entrano nel bundle
- i dati nei due file possono divergere silenziosamente

**Fix:** separare l'interfaccia in `src/types/ingredient.ts` ed eliminare l'array `.ts`.

---

### P3 — BASSO · ingredientsDB.json (478 KB) senza hint di caching
**File:** fetch in `NutrizionaleCalc.tsx:1393`

Nessun `Cache-Control` esplicito per `/data/ingredientsDB.json`. Vite serve file statici con cache di default in dev, ma in produzione (Vercel CDN) il comportamento dipende dalla configurazione. Aggiungere un header `Cache-Control: public, max-age=31536000, immutable` in `vercel.json` per questo file.

🆕 **Nota:** questo item si fonde con S0. Se il DB passa dietro un endpoint di ricerca autenticato, il problema del payload da 478 KB al primo load sparisce alla radice (si scaricano solo i risultati). La cache immutable resta rilevante solo nello scenario intermedio.

---

## 5. Qualità del codice

### ✅ Q1 — ALTO · NutrizionaleCalc.tsx monolitico: 3.457 righe
**File:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`
**Stato:** RISOLTO (parziale) — 2026-07-07

`calcNutrients()` e `scaleResult()` estratti in `src/engines/nutrizionaleCalcEngine.ts` (pure functions, zero dipendenze React). Il componente ora importa da lì. `tsc --noEmit` passa zero errori.

Rimane: `CustomIngredientModal` ancora inline — da estrarre in secondo momento.

### ✅ Q2 — ALTO · Zero test
**Stato:** RISOLTO — 2026-07-07

Aggiunto Vitest (`npm test` → `vitest run`). 17 test in `src/engines/nutrizionaleCalcEngine.test.ts`:
- Golden tests: `calcNutrients` su olio puro, concentrazione per cottura, pzUV
- Evaporazione alcol (pre/postCottura), additivi peso-only
- `sale` da `sodio_mg`, `carboidratiTot`
- `scaleResult`: 50g, 0g
- `parseDecimalIT`: punto, virgola, intero, stringa non numerica, stringa vuota

CI aggiornato con `npm test` step (aggiungere manualmente a `.github/workflows/ci.yml` se necessario).

### Q3 — MEDIO · `noUnusedLocals: false` in tsconfig
**File:** `tsconfig.app.json`

Permette variabili locali non usate (dead code silenzioso). Da impostare a `true` e correggere i warning prima del prossimo rilascio.

### Q4 — BASSO · Duplicazione DB: due schemi incompatibili per lo stesso dominio
Vedi B5. `IngredientDB` (nomi inglesi) e `DBIngredient` (nomi italiani) rappresentano lo stesso concetto. Due schemi vivono in due file con nomi diversi, senza relazione TypeScript tra loro.

### Q5 — BASSO · `rollup` e `xlsx` in devDependencies ma con CVE HIGH
**File:** `package.json`

`rollup` (path traversal, GHSA-mw96-cpmx-2vgc) è una devDependency usata solo a build-time: nessun impatto produzione. `xlsx` (CVE high) è anch'essa devDependency — verificare se è usata nel codice o solo come import accidentale.

### 🆕 Q6 — MEDIO · Nessuna pipeline CI
Nessun workflow che esegua `tsc --noEmit`, lint e test a ogni push. Dato che il codice viene generato/modificato con strumenti AI (Antigravity, Claude Code), un guardrail automatico è particolarmente importante: gli errori del tipo B1/B4 sono esattamente ciò che una CI con test intercetta.

**Azione:** GitHub Actions minimale (o Vercel build checks): `npm ci && tsc --noEmit && npm test`. 15 minuti di setup, valore permanente.

---

## 🆕 6. Da verificare (non coperti da questo audit)

Punti con impatto potenzialmente critico che l'audit non ha esaminato. Da eseguire come **seconda passata** con Claude Code prima di considerare il tool Nutrizionale "definito":

| ID | Verifica | Perché conta |
|---|---|---|
| V1 | **Tutte** le soglie claim vs Allegato Reg. 2006/1924 (valore + operatore ≤/<) | Due errori trovati a campione (B1, B2) → probabile ce ne siano altri |
| V2 | Fattori di conversione energetica vs Reg. 1169/2011 Allegato XIV (grassi 37 kJ/9 kcal, carboidrati e proteine 17/4, fibre 8/2, polioli 10/2.4, etanolo 29/7) | Un fattore sbagliato falsa ogni etichetta prodotta |
| V3 | Regole di arrotondamento dei valori in etichetta vs linee guida UE sulle tolleranze (es. grassi < 0,5 g → "0 g"; cifre decimali per fascia di valore) | L'etichetta legale richiede arrotondamenti specifici, non `toFixed(1)` generico |
| V4 | Conversione sale = sodio × 2,5: applicata una sola volta e nel verso giusto? I dati del DB sono espressi in sodio o in sale? | Errore classico: doppia conversione o unità DB ambigua → valore sale ×2,5 o ÷2,5 errato |
| V5 | Ricalcolo per 100 g dopo resa di cottura (perdita acqua): i nutrienti si concentrano correttamente? | Il campo `resa` esiste (handleResa) ma la correttezza del ricalcolo non è stata verificata |
| V6 | Coerenza dati tra `ingredientsDB.json` e le tabelle di riferimento ufficiali (CREA/BDA) per un campione di 20 ingredienti | Il DB è stato costruito/convertito con AI: serve validazione a campione della sorgente dati |
| V7 | Accessibilità base del tool principale: label sugli input, contrasto, navigazione tastiera, focus visibile | Non toccata dall'audit; requisito di qualità minima per utenti professionali |
| V8 | Comportamento `pdfGenerator.ts` con input utente contenenti caratteri speciali (`<`, `"`, parentesi) | Collegato a S1; test pratico oltre alla verifica versione |

---

## Riepilogo priorità d'azione (v1.1)

| Priorità | ID | Cosa fare |
|---|---|---|
| ✅ Done | B1 | Aggiunto `sodium: 'SODIO'` a `nutrientNames` in `nutritionalEngine.ts:243` |
| ✅ Done | B2 | Cambiato `< 0.12` in `<= 0.12` in `nutritionalEngine.ts:273` |
| 🟡 Pianificare | 🆕 S0 | Togliere `ingredientsDB.json` da `public/` → endpoint autenticato Django (richiede backend attivo) |
| ✅ N/A | S1 | jsPDF 4.2.1 installato — fix range era ≤4.2.0, già patched |
| ✅ Done | 🆕 V1–V4 | V1: corretti potassium NRV 3500→2000 mg (era US DV) e claim proteine da RI-based a energy-based (≥12%/≥20% kcal). V2/V3/V4: nessun errore trovato |
| ✅ Done | B3 | Parametro `isLiquid` aggiunto a `generateNutritionalClaims` — soglie zuccheri (5/2,5 g) e grassi (3/1,5 g) ora differenziate. ⚠️ La funzione risulta non chiamata da nessun componente (B5 confermato): il fix è in standby fino al collegamento UI. |
| ✅ Done | B4 | `parseDecimalIT()` aggiunto a `validation.ts`; sostituisce tutti e 4 i `parseFloat` in `CalcoloTab.tsx` |
| ✅ N/A | S2, S3 | react-router 7.18.1 e vite 7.3.6 già oltre la soglia di fix (7.15.0 e 7.3.3). Vulnerabilità residue in dipendenze transitive senza fix upstream disponibile |
| ✅ Done | 🆕 S7 | Security headers aggiunti in `vercel.json`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP enforcing (era report-only — 2026-07-07). Bonus: `Cache-Control: immutable` su `ingredientsDB.json` (chiude P3) |
| ✅ Done | P1 | `React.lazy()` + `Suspense` su tutti e 9 i calculator in `App.tsx`; named export gestiti con `.then(m => ({ default: m.X }))` |
| ✅ Done | 🆕 M4 | Fetch DB estratto in `loadDB` (richiamabile); bottone "Riprova" in `IngSearch` quando `dbError` è set |
| ✅ Done | Q1 | `calcNutrients()` e `scaleResult()` estratti in `src/engines/nutrizionaleCalcEngine.ts`; mobile ora usa lo stesso engine del desktop |
| ✅ Done | Q2 | 17 test in `src/engines/nutrizionaleCalcEngine.test.ts` — golden tests ricette, soglie claim, parsing IT, resa |
| ✅ Done | 🆕 Q6 | `.github/workflows/ci.yml` — type-check + lint + build su push/PR a `main` |
| ✅ Done | S4 | `IS_PROD` → `import.meta.env.PROD` (compile-time); `MOCK_USERS` spostato in dynamic import nel ramo dev — eliminato dal bundle di produzione via tree-shaking |
| ✅ Done | 🆕 M5 | Export/import JSON ingredienti custom in topbar (bridge; sync backend = roadmap) |
| ✅ Done | P2 | `ingredientsDB.ts` ridotto da 667 KB a 769 B — rimossa `INGREDIENTS_DB` e `searchIngredients` (mai importate esternamente); rimane solo l'interfaccia `IngredientDB` |
| ✅ Done | S6 | `isValidDBIngredient()` guard su tutti i JSON.parse da localStorage |
| 🟡 Pianificare | 🆕 V5–V8 | Verifiche resa, dati sorgente, a11y, PDF injection pratica |
| ✅ Done | Q3 | `noUnusedLocals: true` + `noUnusedParameters: true` in tsconfig — zero errori generati |
| ✅ Done | P3 | Cache-Control immutable su `ingredientsDB.json` (fatto insieme a S7) |
| ✅ Done | M3 | `.sidebar-nav-icon-btn` portato da 40×40 px a 44×44 px in `index.css:668-669` |
| ✅ Done | V5 | Bug confermato e corretto: `resa` ignorata in `peso_totale_pz`. Fix in `nutrizionaleCalcEngine.ts`: usa `g_cooked = g_raw × (resa/100)` nel denominatore, nutrienti restano su `g_raw`. Aggiunto golden test (125g crudi resa 80% → 1000 kcal/100g). 18/18 test passano. |
| ✅ Done | V6 | Campione 10 ingredienti vs USDA/INRAN — 3 errori critici trovati (vedi sezione 7) |
| 🔴 Ora | V7 | Accessibilità: label input, contrasto, focus, navigazione tastiera |
| ✅ Done | V8 | Analisi completa: no FreeText annotations, no "open in new window" → CVE S1 non applicabili. Fix UX: filename sanitizzato in `NutrizionaleCalc.tsx:1701` e `pdfGenerator.ts:140` (rimozione `<>"` dal nome file). |
| 🟡 Pianificare | S0 | Togliere `ingredientsDB.json` da `public/` → endpoint autenticato Django |
| 🟡 Pianificare | S5 | Token JWT in localStorage → httpOnly cookies (cambio backend Django) |
| ✅ Done | M2-nota | Costanti e logica unificate: `shared/constants.ts` per ALLERGEN/CROSS/ADDITIVI, engine per DBIngredient/CalcResult/RecipeRow/AdditiveRow/calcNutrients. ~750 righe duplicate rimosse. Archivio differito (schemi ArchiveData vs MobileArchiveEntry incompatibili — design separato). |
| 🟡 Pianificare | Q4 | Unificare `IngredientDB` e `DBIngredient` (due schemi stesso dominio) — roadmap Q4 |
| 🟢 Quando comodo | 🆕 S8 | Checklist GDPR/privacy prima del go-live commerciale |
| 🟢 Roadmap | 🆕 M6 | PWA/offline (pianificare dopo S0) |

---

---

## 7. Errori dati — DB ingredienti (V6, 2026-07-08)

Campione 10 ingredienti verificati vs USDA FoodData Central / INRAN (CREA BDA offline durante verifica).

### CRITICO — Petto di pollo
**DB: kcal=157, grassi=8.08g** vs USDA petto senza pelle crudo: kcal=106, grassi=1.93g

Scarto +48% kcal, +319% grassi. Incompatibile con petto di pollo senza pelle. Probabile causa: voce importata con pelle o cotta con condimento. I saturi (2.32g vs 0.35g) confermano.

**Fix:** verificare sorgente del dato e correggere con voce INRAN "Pollo, petto, senza pelle, crudo" (kcal 110, grassi 3.0g, prot 24g).

### CRITICO — Lenticchie rosse (farina)
**DB: carboidrati=41.9g, fibre=20.2g** vs lenticchie secche USDA: carbo=62.2g, fibre=10.8g

Carboidrati -33%, fibre quasi doppi. Plausibile solo se è una farina con amido parzialmente rimosso (concentrato proteico). Non è generalizzabile come "lenticchie".

**Fix:** aggiungere nota in etichetta che specifica il fornitore, oppure sostituire con valore INRAN lenticchie secche standard.

### MEDIA — Mozzarella di bufala (sodio)
**DB: sodio=196mg** vs valore DOP atteso: 390–450mg

Circa la metà del valore tipico. Probabile errore data entry (dato da mozzarella vaccina invece di bufala).

**Fix:** correggere sodio_mg a ~400mg.

### MEDIA — Burro (acidi grassi saturi)
**DB: saturi=62g** vs INRAN burro italiano: ~51–55g

Sovrastimato di ~15%. Impatta i claim "ad alto contenuto di grassi saturi".

### OK (allineati a valori italiani) — Acqua, latte intero, carne bovina, fagioli borlotti, pasta semola

---

**Ordine di lavoro consigliato (sprint):**
1. **Sprint "correttezza"** — B5 (tracciare engine reale) → B1, B2, B4 → V1–V5 → Q1 (estrazione engine) → Q2 (test che congelano i fix)
2. **Sprint "sicurezza"** — S0 → S1–S3 → S7 → S4
3. **Sprint "mobile & UX"** — M4, M2, M3 → P1 → M5
4. **Sprint "consolidamento"** — Q6 (CI), P2, Q3, poi roadmap M6/PWA

Razionale: prima che i numeri siano giusti e blindati dai test, ogni lavoro di UI rischia di lucidare risultati sbagliati.
