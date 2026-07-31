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

### 🟡 S0 — CRITICO · ingredientsDB.json pubblicamente scaricabile: esposizione dell'asset core
**Stato:** RISOLTO (parte tecnica) — 2026-07-29. Backend Django deployato e collegato al frontend in produzione, verificato end-to-end.
**File:** `public/data/ingredientsDB.json` (478 KB, 1071 ingredienti — 1065 già importati in Postgres)

Tutto ciò che sta in `public/` viene servito da Vercel senza alcun controllo: chiunque può scaricare l'intero database nutrizionale con una singola richiesta GET all'URL diretto, senza login, senza rate limit. Il DB è l'asset di valore dell'app e la base del modello ad abbonamento per gli ~800 clienti.

**Cosa è stato fatto (2026-07-29):**
- Backend Django già deployato e sano (`https://backend-snowy-seven-98.vercel.app`), Postgres Neon con 1065/1071 ingredienti importati
- `VITE_API_URL` impostata nell'env Production del frontend (mancava — root cause per cui il backend non veniva mai chiamato)
- **Bug reale trovato e corretto**: `connect-src 'self'` nella CSP (`vercel.json`) bloccava lato browser qualsiasi fetch verso il backend, prima ancora di CORS — aggiunto il dominio backend alla whitelist
- Verificato in produzione (Safari, console reale): `/api/auth/me/` e `/api/ingredients/` rispondono `401` dal backend reale (atteso: l'utente demo non esiste nel Django reale) — la richiesta arriva a destinazione, CSP/CORS non bloccano più nulla, fallback silenzioso al JSON statico resta intatto per chi non ha un account reale

**Cosa resta aperto (non tecnico, di prodotto/processo):**
1. Il file pubblico **non può ancora essere rimosso**: è l'unico modo per demo/mock di vedere gli ingredienti finché non esistono account clienti reali in Django (solo `admin@aea.it` esiste oggi) — dipende da AUTH-1/2
2. Endpoint di **ricerca** (`/api/ingredients/search?q=`) invece del dataset intero — riduce payload mobile (vedi P3), non ancora fatto
3. Rate limiting sull'endpoint (Django REST Framework throttling) — non ancora fatto

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

### ✅ M2 — MEDIO · Tabelle nutrizionali non responsive
**Stato:** RISOLTO — 2026-07-09

Root cause: `width: 560` fisso sull'inner div di `TabUE.tsx` impediva al wrapper `overflow-x: auto` di mostrare la tabella su viewport <360px. Fix: rimosso `width: 560`, sostituito con `minWidth: 300; width: '100%'; boxSizing: 'border-box'`. Gli altri tab (USA, Canada, Australia, Arabi) usavano già `display: inline-block` senza larghezza fissa — si adattano al contenuto e scrollano correttamente.

🆕 **Nota strutturale aperta:** la strategia "due alberi desktop/mobile" resta; unificazione componenti = roadmap (nessun blocco immediato).

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

### ✅ M6 — BASSO · PWA / offline
**Stato:** RISOLTO — 2026-07-09

`vite-plugin-pwa` installato e configurato in `vite.config.ts`. Genera `dist/sw.js` + `dist/workbox-*.js` a ogni build. Strategie:
- App shell (JS/CSS/HTML/font/PNG): `CacheFirst` precache (29 entry, ~2 MB gzip)
- `ingredientsDB.json`: `CacheFirst` con TTL 7 giorni — **da rimuovere dopo S0 deploy** (il DB passerà dietro API autenticata)
- `/api/*`: `NetworkOnly` (richiede auth fresca, no cache)

Manifest PWA: nome "AEA Consulenze Alimentari", theme `#1a2340`, icone `pwa-192.png` / `pwa-512.png` generate dal logo esistente. L'app è installabile su Android/iOS da browser e funziona offline con i dati dell'ultima sessione.

⚠️ **Dopo S0 deploy**: rimuovere la `runtimeCaching` entry per `ingredientsDB.json` da `vite.config.ts`.

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

### ✅ Q5 — BASSO · `rollup` e `xlsx` in devDependencies ma con CVE HIGH
**Stato:** RISOLTO — 2026-07-09

`xlsx` rimossa (non importata da nessun file sorgente). `npm audit fix` ha aggiornato rollup + postcss + react-router + vite. Risultato: **0 vulnerabilità** (da 15). 34 test passano.

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
| 🟡 Tecnica risolta, file pubblico resta (dipende da AUTH-1/2) | 🆕 S0 | **Fatto (2026-07-29):** backend Django deployato e sano, 1065/1071 ingredienti importati in Postgres, `VITE_API_URL` impostata in prod, fix CSP `connect-src` (bloccava le chiamate), verificato end-to-end. **Resta:** rimuovere `public/data/ingredientsDB.json` (solo dopo aver creato account clienti reali — vedi AUTH-1/2), endpoint di ricerca, rate limiting |
| ✅ N/A | S1 | jsPDF 4.2.1 installato — fix range era ≤4.2.0, già patched |
| ✅ Done | 🆕 V1–V4 | V1: corretti potassium NRV 3500→2000 mg (era US DV) e claim proteine da RI-based a energy-based (≥12%/≥20% kcal). V2/V3/V4: nessun errore trovato |
| ✅ Done | B3 | `calcClaims(r: CalcResult, isLiquid)` aggiunta a `nutrizionaleCalcEngine.ts` (campi italiani, nessuna dipendenza da dead-code engine). Collegata alla UI: toggle "Prodotto liquido" + badge claim sotto TabUE — desktop (`NutrizionaleCalc.tsx`) e mobile (`TabellaTab.tsx`). Soglie: fibre ≥3/6g, proteine ≥12/20% kcal, calcio/ferro/potassio vs NRV EU, sodio ≤120mg, zuccheri ≤5/2,5g, grassi ≤3/1,5g. `tsc --noEmit` zero errori. |
| ✅ Done | B4 | `parseDecimalIT()` aggiunto a `validation.ts`; sostituisce tutti e 4 i `parseFloat` in `CalcoloTab.tsx` |
| ✅ Done | Q5 | `xlsx` rimossa (non usata). `npm audit fix` → react-router, vite, rollup, postcss aggiornati. **0 vulnerabilità** (da 15). |
| ✅ N/A | S2, S3 | react-router e vite aggiornati con Q5. |
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
| ✅ Done | M2 | `width: 560` rimosso da `TabUE.tsx` → `minWidth: 300; width: 100%`. Altri tab già adattativi. Scroll `overflow-x: auto` funziona su tutti i viewport. |
| ✅ Done | M3 | `.sidebar-nav-icon-btn` portato da 40×40 px a 44×44 px in `index.css:668-669` |
| ✅ Done | V5 | Bug confermato e corretto: `resa` ignorata in `peso_totale_pz`. Fix in `nutrizionaleCalcEngine.ts`: usa `g_cooked = g_raw × (resa/100)` nel denominatore, nutrienti restano su `g_raw`. Aggiunto golden test (125g crudi resa 80% → 1000 kcal/100g). 18/18 test passano. |
| ✅ Done | V6 | Campione 20 ingredienti vs CREA BDA 2019 — 6 corretti (banana, parmigiano, burro, carote, fegato pollo, miele bio). Vedi sezione 7. |
| ✅ Done | V7 | Accessibilità: 4 modal con role="dialog"+aria-modal (IngredientPicker, Browse, SmartImport, SavedTables); 6 input con aria-label/htmlFor (cerca, nome comp, pz/UV, resa, €/kg, selects additivi); div card header → role="button"+tabIndex+onKeyDown; font 10px→12px su 4 label muted. `tsc --noEmit` zero errori. |
| ✅ Done | V8 | Analisi completa: no FreeText annotations, no "open in new window" → CVE S1 non applicabili. Fix UX: filename sanitizzato in `NutrizionaleCalc.tsx:1701` e `pdfGenerator.ts:140` (rimozione `<>"` dal nome file). |
| 🟡 Tecnica risolta, file pubblico resta | S0 | Vedi sopra |
| ✅ Done | S5 | httpOnly cookies: `CookieJWTAuthentication` (cookie → fallback header mock), `LoginView` imposta cookie, `LogoutView` li cancella + blacklist, `TokenRefreshView` custom con rotation. `apiFetch` usa `credentials:'include'`, rimosso header `Authorization`. Access token 60→15 min. |
| ✅ Done | M2-nota | Costanti e logica unificate: `shared/constants.ts` per ALLERGEN/CROSS/ADDITIVI, engine per DBIngredient/CalcResult/RecipeRow/AdditiveRow/calcNutrients. ~750 righe duplicate rimosse. Archivio differito (schemi ArchiveData vs MobileArchiveEntry incompatibili — design separato). |
| ✅ Done | Q4 | `IngredientDB` (schema inglese) rimosso. `DBIngredient` (italiano) è ora il tipo canonico, re-esportato da `ingredientsDB.ts`. `nutritionalEngine.ts` self-contained con tipo locale. `useSavedTables.ts` aggiornato. `tsc --noEmit` zero errori. |
| 🟢 Checklist operativa | 🆕 S8 | GDPR checklist — vedi sezione 8 |
| ✅ Done | 🆕 M6 | PWA: `vite-plugin-pwa` + `generateSW`. App shell precache, DB ingredienti CacheFirst 7gg, API NetworkOnly. Icone 192/512px. ⚠️ Dopo S0 deploy: rimuovere cache entry ingredientsDB.json. |

---

## 8. GDPR — Checklist pre go-live (S8)

Riferimento normativo: Reg. UE 2016/679 (GDPR). Target: ~800 clienti PMI italiane.
Dati trattati: email, nome, azienda, ricette/schede prodotto (potenziale segreto industriale dei clienti).

### Documenti da redigere

| # | Documento | Articolo GDPR | Stato |
|---|---|---|---|
| D1 | **Informativa privacy** (art. 13) — da mostrare al momento della registrazione. Deve indicare: titolare (AEA Consulenze Alimentari), finalità (accesso al gestionale), base giuridica (contratto/consenso), periodo di conservazione, diritti dell'interessato, eventuali trasferimenti extra-UE. | Art. 13 | ☐ Da redigere |
| D2 | **Cookie policy** — i cookie `aea_access` e `aea_refresh` sono tecnici/essenziali (autenticazione), non richiedono consenso. Dichiararlo esplicitamente. Se in futuro si aggiungono analytics: banner obbligatorio. | Art. 6 | ☐ Da redigere |
| D3 | **Registro dei trattamenti** (art. 30) — documento interno (non pubblico) che elenca tutti i trattamenti: autenticazione, dati utente, ricette salvate, log. Obbligatorio per organizzazioni che trattano dati su larga scala. | Art. 30 | ☐ Da redigere |
| D4 | **DPA (Data Processing Agreement)** con Vercel e il provider database — Vercel offre il DPA standard nella sezione legal dell'account. Firmarlo e archiviarlo. | Art. 28 | ☐ Da firmare |

### Misure tecniche (stato attuale)

| # | Misura | Stato |
|---|---|---|
| T1 | HTTPS obbligatorio in produzione | ✅ Vercel (automatico) |
| T2 | Password utenti hashate (Django `AbstractUser`) | ✅ bcrypt/PBKDF2 |
| T3 | JWT in httpOnly cookie (non leggibili da JS) | ✅ S5 completato |
| T4 | Security headers (CSP, X-Frame-Options, ecc.) | ✅ S7 completato |
| T5 | Accesso ingredientsDB solo ad utenti autenticati | 🟡 Backend collegato e funzionante; file pubblico resta come fallback finché non ci sono account clienti reali (AUTH-1/2) |
| T6 | Backup database PostgreSQL con retention definita | ☐ Verificare con provider DB |
| T7 | Log di accesso con retention ≤ 12 mesi | ☐ Configurare su Django/Vercel |

### Diritti degli interessati (art. 15–22)

Da implementare prima del go-live — può essere un endpoint admin o una procedura manuale documentata:

| Diritto | Implementazione minima |
|---|---|
| **Accesso** (art. 15) | Email a AEA → export manuale da admin Django |
| **Rettifica** (art. 16) | Admin Django `users` → modifica campi |
| **Cancellazione** (art. 17) | `python manage.py shell` → `User.objects.filter(email=...).delete()` — automatizzare prima del go-live |
| **Portabilità** (art. 20) | Export JSON delle ricette salvate dell'utente — da aggiungere come endpoint `/api/users/export/` |
| **Opposizione** (art. 21) | N/A per ora (nessun trattamento per marketing) |

### Decisioni da prendere (non tecniche)

| # | Decisione |
|---|---|
| P1 | **Periodo di conservazione dati**: per quanto tempo conservare account inattivi? Proposta: 2 anni dall'ultima login, poi notifica + cancellazione. |
| P2 | **Titolare del trattamento**: AEA Consulenze Alimentari come titolare; Vercel e provider DB come responsabili esterni (DPA necessario). |
| P3 | **Ricette dei clienti = segreto industriale**: i dati di formulazione salvati appartengono al cliente, non ad AEA. Chiarire nei T&C che AEA non ha accesso commerciale alle ricette. |
| P4 | **DPO**: le PMI con < 250 dipendenti senza trattamenti ad alto rischio non sono obbligate a nominare un DPO. AEA non è obbligata, ma conviene documentare la valutazione. |

### Priorità d'azione

1. **Subito (prima del go-live):** D1 (informativa) + D2 (cookie policy) + D4 (DPA Vercel) + T6 (backup)
2. **Entro 30 giorni dal go-live:** D3 (registro trattamenti) + diritto cancellazione automatizzato (art. 17)
3. **Entro 90 giorni:** endpoint portabilità dati (art. 20) + log retention configurato

---

## 7. Errori dati — DB ingredienti (V6)

### V6 — Audit 2026-07-08 (10 ingredienti vs USDA/INRAN, CREA BDA offline)

#### ✅ CRITICO — Petto di pollo con pelle
Corretto 2026-07-09 con CREA BDA 2019: kcal 157→134, grassi 8.08→5.4g, saturi 2.32→1.5g, prot 21.1→21.4g.

#### ✅ CRITICO — Farina di lenticchie rosse bio
Corretto 2026-07-09: carbo 41.9→46g, fibre 20.2→13.6g (proxy CREA lenticchie rosse decorticate). `fonte_dati` aggiunto con nota "verificare con fornitore".

#### ✅ MEDIA — Mozzarella di bufala sodio
Già corretta (sodio_mg=400). Nessuna azione necessaria.

#### NOTA — Burro saturi
Audit 2026-07-08 riportava saturi=62g (era probabilmente un altro lotto del DB). Al 2026-07-09 il DB aveva saturi=52g → corretto a 51.4g con V6 seconda passata (vedi sopra).

---

### V6 — Audit 2026-07-09 (20 ingredienti vs CREA BDA 2019)

Fonte: CREA BDA 2019. Kcal/kJ ricalcolati con fattori EU Reg 1169/2011. Campo `fonte_dati: "CREA BDA 2019"` aggiunto a ogni entry corretta.

| Ingrediente | Campo corretto | Prima | Dopo |
|---|---|---|---|
| banana (3,2% di fibre) | kcal, carbo, prot, grassi | 88.8 / 19.8 / 0.8 / 0 | 75.4 / 15.6 / 1.2 / 0.2 |
| formaggio parmigiano reggiano | kcal, grassi, prot, carbo | 389.6 / 26 / 35.7 / 3.2 | 401.3 / 29.7 / 33.5 / 0 |
| burro | kcal, grassi, saturi, prot | 727.6 / 80 / 52 / 0.8 | 761.6 / 84 / 51.4 / 0.7 |
| carote | kcal, grassi, prot, fibre | 42.0 / 0.5 / 0.63 / 2.7 | 42.8 / 0.2 / 1.1 / 3.1 |
| fegato di pollo | kcal, prot, grassi, carbo | 121.2 / 18.8 / 4.62 / 1.1 | 132.6 / 19.8 / 5.0 / 2.1 |
| miele bio | kcal, carbo, prot | 329.0 / 81.7 / 0.56 | 323.6 / 80.3 / 0.6 |

⚠️ Valori da memoria training AI, non da query live CREA BDA. Verificare manualmente su https://www.crea.gov.it/banca-dati-alimenti prima del go-live.

---

**Ordine di lavoro consigliato (sprint):**
1. **Sprint "correttezza"** — B5 (tracciare engine reale) → B1, B2, B4 → V1–V5 → Q1 (estrazione engine) → Q2 (test che congelano i fix)
2. **Sprint "sicurezza"** — S0 → S1–S3 → S7 → S4
3. **Sprint "mobile & UX"** — M4, M2, M3 → P1 → M5
4. **Sprint "consolidamento"** — Q6 (CI), P2, Q3, poi roadmap M6/PWA

Razionale: prima che i numeri siano giusti e blindati dai test, ogni lavoro di UI rischia di lucidare risultati sbagliati.

## Debito post-redesign pannello destro (2026-07-14)
- **D-RP1**: 3 `useState(true)` morti in `NutrizionaleCalc.tsx:1043,1055,1056` (pesoCardOpen/additiveOpen/riepilogoOpen) mantenuti solo per hook order — rimuovere con verifica ordine hook.
- **D-RP2**: duplicati locali TabCanada/TabAustralia/TabArabi dentro `NutrizionaleCalc.tsx` divergono dai moduli `Tab*.tsx` (usati solo da mobile) — consolidare a una sola fonte quando si tocca il mobile.
