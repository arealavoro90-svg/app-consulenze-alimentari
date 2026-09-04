# TODO — AEA Consulenze Alimentari
> **Aggiorna dopo ogni sessione.** Inizio sessione: leggi CLAUDE.md + questo file.
> Audit storico: `AUDIT.md` · Audit 2026-09-03: `AUDIT-2026-09-03.md` (20/22 chiusi)
> Branch attivo: **`fix/audit-2026-09-03`** (24 commit, 242/242 test, tsc clean — MAI deployato)
> Sessione 2026-09-04: 20+ task chiusi (NORM/UX/SEC/COD/D3). Vedi sezione ✅.

---

## 🔴 BLOCCANTE GO-LIVE — zero clienti reali senza questi

### ⚙️ COMANDI DJANGO DA ESEGUIRE (codice già scritto — solo run)

```bash
cd Beck-end/backend

# 1. Migrazione allergeni (D3/COD-1)
../venv/bin/python manage.py migrate

# 2. Dry-run import allergeni dal JSON
../venv/bin/python manage.py import_allergens_from_json --dry-run

# 3. Se dry-run ok → esegui reale
../venv/bin/python manage.py import_allergens_from_json

# 4. Verifica settings (rate limiting, password policy)
../venv/bin/python manage.py check
```

### Autenticazione reale

- [ ] **AUTH-1** 🔴 — Creare account clienti reali in Django admin.
  Auth attuale: mock frontend-only con password in chiaro in localStorage, ruolo `admin` manipolabile da console.
  A. Creare utenti reali via `apps/users/admin.py` (già pronto) con `purchased_tools`
  B. Verificare che il backend NON restituisca `password` nel payload `/api/auth/me/`
     (il tipo `User` frontend ha ancora `password: string` — rimuoverlo dopo verifica)

- [ ] **AUTH-2** 🔴 — Rimuovere fallback mock da `src/api/auth.ts`.
  Dipende da AUTH-1. Rimuovere: `apiLogin catch→MOCK_USERS`, `apiMe catch→aea_user cache`.
  Rimuovere anche le funzioni localStorage residue `getAccessToken`, `getRefreshToken`, `setTokens`
  da `src/api/client.ts` (ancora presenti e importate in `AuthContext.tsx:5,59`).

### GDPR — documenti legali obbligatori prima del go-live

- [ ] **GDPR-1** 🔴 — Redigere e pubblicare:
  - D1: Informativa privacy Art. 13 GDPR (titolare: AEA, finalità, base giuridica, conservazione, diritti)
  - D2: Cookie policy — `aea_access` + `aea_refresh` sono tecnici/essenziali, dichiararlo esplicitamente
  - D4: DPA con Vercel (firma in pannello legal Vercel) + DPA con Neon (provider DB)
  - Diritto cancellazione Art. 17: procedura documentata (anche manuale via Django admin) prima del go-live

### Primo deploy

- [ ] **DEPLOY-1** 🔴 — Merge `fix/audit-2026-09-03` → `main` + deploy Vercel.
  Il branch ha 24 commit, 242/242 test, tsc clean, lint 0 errori.
  Aggiornare Vercel CLI prima: `npm i -g vercel@latest` (attuale 50.38.1, disponibile 59.11.2).

---

## 🟠 ALTA PRIORITÀ — qualità commerciale reale

### Normative

- [ ] **NORM-09** — Gulf/Arabi: verificare clausola small-package su fonte primaria SFDA/GSO.
  La confidenza normativa è dichiarata bassa nel codice stesso. Prima di vendere a clienti con mercato Gulf,
  verificare GSO 2233/2012 + SFDA guidelines per confezioni < X cm².

- [ ] **NORM-10** — Verifica sistematica allineamento output app vs Excel di riferimento (tutti i tool, tutti i mercati).
  Identificati scostamenti grassi/proteine nella verifica Lasagna (ETI-6). Causa non isolata.
  Scope: NutrizionaleCalc, EtichetteCalc, TrattamentoTermicoCalc — almeno 3 ricette reali per tool.

### Sicurezza

- [ ] **SEC-03** — Funzioni JWT localStorage residue (`getAccessToken`, `setTokens`, `clearTokens`)
  ancora importate e usate in `AuthContext.tsx:5,59`. Rimuovere tutto dopo AUTH-2.

- [ ] **SEC-05** — Dati utente completi (email, azienda, `purchasedTools`) in `localStorage`.
  **File:** `src/auth/AuthContext.tsx:16,54,73` — chiave `aea_user`.
  **Fix:** migrare a `sessionStorage` o eliminare la cache (fare affidamento su `apiMe()` all'avvio).

- [ ] **SEC-07** — `ArchiveEntryViewSet` ha solo `IsAuthenticated`, nessun filtro per tool acquistato.
  Un utente con abbonamento tool A può leggere i propri archivi di tool B (non acquistato).
  **Fix:** in `get_queryset`, filtrare per `tool in request.user.purchased_tools.values_list('id', flat=True)`.
  **File:** `Beck-end/backend/apps/calculations/views.py:26`

- [ ] **SEC-10** — `IngredientViewSet` senza paginazione + senza throttling specifico.
  Qualsiasi utente autenticato scarica l'intero DB in una chiamata. Rischio DoS lento.

### UX

- [ ] **UX-02** — Verificare che il backend NON invii il campo `password` nel payload `/api/auth/me/`.
  Il tipo frontend `User` ha ancora `password: string`. Rimuovere il campo dal tipo dopo la verifica.

- [ ] **UX-04** — Pagina "Il tuo abbonamento" / "Piano e fatturazione".
  Scope minimo go-live: pagina statica con stato abbonamento da Django (`purchased_tools` + email).

- [ ] **UX-07** — Login page: aggiungere proposta di valore orientata al beneficio.
  Tagline "Consulenza Alimentare" è generica. Nessun pricing, social proof, screenshot.

- [ ] **UX-DEV** 🟠 — Test reali su dispositivi fisici prima del go-live.
  iOS Safari + Android Chrome — non simulatori. Verificare input decimali, scroll tabelle, touch 44px, PDF export.

### Code quality

- [ ] **COD-07-LOGIN** — Rate limit `login: 3/min` collegato ma serve verifica in staging.
  `ScopedRateThrottle` aggiunto su `LoginView`. Testare che Django Cache sia configurata (default LocMemCache
  non persiste tra worker — in produzione usare Redis/Memcached per throttling efficace).

- [ ] **D1-EXCEL** — Correggere 4 celle errate nella sorgente Excel (colonna HO, righe 331, 485, 625, 824).
  ⚠️ NON rigenerare `ingredientsDB.json` senza leggere prima la trappola in `AUDIT-2026-09-03.md`.

- [ ] **D2-DATA** — 9 prodotti "senza glutine" con `GLUTINE` marcato presente.
  Necessaria scheda tecnica fornitore per ciascuno. Lista prodotti: vedere `AUDIT-2026-09-03.md`.

---

## 🟡 MEDIA PRIORITÀ — professionalità e solidità

- [ ] **SEC-11-CACHE** — Throttling in produzione richiede cache backend non-locale.
  Aggiungere in `production.py` configurazione Redis per `CACHES` (Vercel KV o Upstash).

- [ ] **SEC-12-CSP** — CSP `script-src` e `style-src` senza `unsafe-inline` ora attivi.
  Verificare dopo deploy Vercel che nessun componente usi stili/script inline rotti.

- [ ] **UX-08-CHECK** — Sidebar rail labels: verifica visiva su dispositivo touch.
  Label abbreviate aggiunte ma altezza bottoni potrebbe essere cambiata — test su iPhone/Android fisico.

- [ ] **GDPR-2** — Endpoint cancellazione dati utente (Art. 17 GDPR).
  Minimo: endpoint Django `/api/users/me/delete/`. Da avere entro 30 giorni dal go-live.

- [ ] **GDPR-3** — Backup DB Neon: verificare policy retention + configurare log accesso ≤12 mesi.

- [ ] **DOC-2** — Workflow docs per i 6 calcolatori senza documentazione.
  `docs/workflows/{nutrizionale,etichette,termico,distillati,cosmetici,mangimi}.md`

- [ ] **D3-FRONTEND** — Verificare che `useAllergens` lato React gestisca sparse dict.
  Il campo `allergens` dal backend è un dict sparse (solo chiavi true presenti), non il dict completo
  a 28 chiavi — verificare che chiavi mancanti siano trattate come `false`.

---

## 🟢 ROADMAP — post-launch

- [ ] **DATA-1** — Validazione campione CREA BDA live (20+ ingredienti prima del go-live definitivo).
- [ ] **DATA-2/SYNC-CNF** — Canada Nutrient File: script `sync_cnf.py`
- [ ] **DATA-3/SYNC-AUSNUT** — Australia AUSNUT 2011-13
- [ ] **S0-FINAL** — Rimuovere `public/data/ingredientsDB.json` dopo AUTH-1/2 completati.
- [ ] **SEC-SEARCH** — Endpoint search `/api/ingredients/search?q=` invece del dataset completo.
- [ ] **COD-02** — Estrazione engine da `EtichetteCalc.tsx` (3438 righe).
- [ ] **COD-05** — Ridurre duplicazione desktop/mobile (~2000 righe parallele).
- [ ] **UX-12** — Versioning ricette (storico modifiche).
- [ ] **UX-OB** — Onboarding clienti: guida e landing per ogni tool.
- [ ] **UX-14** — Onboarding: pre-caricare una ricetta demo per nuovi account.
- [ ] **EXP-1** — Export/import archivi ricette come JSON.
- [ ] **A11Y-1** — Audit accessibilità completo.
- [ ] **E2E-1** — Playwright E2E su flussi critici: login → ricetta → tabella → export PDF.
- [ ] **GDPR-4** — Endpoint portabilità dati `/api/users/export/` (Art. 20 GDPR).
- [ ] **UX-PAY** — Integrazione pagamenti / gestione abbonamento.

---

## ✅ COMPLETATI SESSIONE 2026-09-04

> Branch `fix/audit-2026-09-03` — 24 commit, 242 test (era 186).

### Normative
- ✅ **NORM-01/02** — operatori `<=`→`<` su SENZA GRASSI e SENZA ZUCCHERI
- ✅ **NORM-03** — claim grassi saturi somma saturi+trans
- ✅ **NORM-04** — B12 NRV 2.4→2.5 μg (TabUE + EtichetteCalc)
- ✅ **NORM-05** — Canada DV grassi 78→75g
- ✅ **NORM-06** — Canada DV fibre 25→28g
- ✅ **NORM-07** — claim SENZA SODIO/SALE (<5mg)
- ✅ **NORM-08** — criteri fibre per 100kcal

### UX
- ✅ **UX-01** — `inputMode="decimal"` + `parseDecimalIT` su 7 campi porzione
- ✅ **UX-03** — `beforeunload` handler in `useAutosave`
- ✅ **UX-05** — già risolto (`:focus-visible` globale in `src/index.css:1083`)
- ✅ **UX-06** — spinner `animate-spin` in `ToolLoading` (App.tsx)
- ✅ **UX-08** — label abbreviate sotto icone sidebar collassata
- ✅ **UX-09** — `--text-muted` #5e6b80→#4a5568 (WCAG AA)
- ✅ **UX-10** — `onBlur` validation su campo grammi ingrediente
- ✅ **UX-11** — breadcrumb "Strumenti" → `<Link to="/dashboard">`

### Sicurezza frontend/infra
- ✅ **SEC-04** — rimosso `unsafe-inline` da `script-src` (CSP vercel.json)
- ✅ **SEC-11** — rimosso `unsafe-inline` da `style-src`
- ✅ **SEC-12** — `img-src` ristretto a `self data:`

### Sicurezza backend Django
- ✅ **SEC-01** — rate limiting Anon 5/min + User 60/min
- ✅ **SEC-02** — `AUTH_PASSWORD_VALIDATORS` min 10 chars
- ✅ **SEC-06** — HSTS 1y + preload + NOSNIFF (production.py)
- ✅ **SEC-08** — assert CORS HTTPS-only all'avvio
- ✅ **SEC-09** — CookieJWT Bearer fallback off in produzione
- ✅ **LoginView throttle** — `ScopedRateThrottle` scope=login (3/min)

### Code quality
- ✅ **COD-03** — 24 golden test tabelle USA/Canada/Australia/Arabi
- ✅ **COD-04** — `validate_recipe()` su serializer (id+grams obbligatori)
- ✅ **COD-07** — job `test-backend` Django in CI
- ✅ **COD-08** — 24 test per 5 hook custom
- ✅ **COD-09** — xlsx import dinamico (lazy al click)
- ✅ **COD-10** — resa=0 fallback a 100
- ✅ **D-RP1** — già rimosso in sessione precedente
- ✅ **UI-FASE1** — CollapsibleSection estratta, ArchiveModal+NutrizionaleCalc già ok

### Backend Django (D3)
- ✅ **D3/COD-1** — campo `allergens` JSONField + migrazione 0007 + serializer + import command
  ⚠️ **ESEGUIRE**: `migrate` + `import_allergens_from_json` (vedere comandi sopra)

---

## ⚠️ TRAPPOLE ATTIVE (leggere prima di toccare)

1. **NON rigenerare `ingredientsDB.json` dall'Excel alla cieca.**
   342/1065 voci combaciano per nome. ~700 verrebbero rinominate, spaccando tutte le ricette archiviate.

2. **NON toccare `Tab{UE,USA,Canada,Australia,Arabi}.tsx` markup/stili.**
   Sono le tabelle ufficiali protette — qualsiasi modifica visiva richiede approvazione esplicita.

3. **`nutritionalEngine.ts` e `localizationModule.ts` NON ESISTONO** (rimossi).
   L'engine canonico è `src/engines/nutrizionaleCalcEngine.ts`.

4. **Django locale:** avviare con `cd Beck-end/backend && ../venv/bin/python manage.py runserver`.
   Il venv ha Python 3.9 — usare `Optional[X]` invece di `X | None` per nuovi file.

5. **`allergens` nel backend è un dict sparse** — solo chiavi `true` presenti, non il dict completo.
   Il frontend deve trattare chiavi mancanti come `false`.

6. **Throttling produzione richiede Redis** — `LocMemCache` (default) non persiste tra worker Gunicorn.
