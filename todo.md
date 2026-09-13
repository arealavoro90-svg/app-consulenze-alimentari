# TODO — AEA Consulenze Alimentari
> **Aggiorna dopo ogni sessione.** Inizio sessione: leggi CLAUDE.md + questo file.
> Audit storico: `AUDIT.md` · Audit 2026-09-03: `AUDIT-2026-09-03.md` (20/22 chiusi)
> Audit 360° Etichette+Nutrizionale: `docs/audit/AUDIT-2026-09-07-etichette-nutrizionale.md`
> **Sessione 2026-09-07: DEPLOY PROD live. Auth reale verificata. Quick wins audit implementati.**
> **Sessione 2026-09-09: UX-07, FEAT-TMPL, FEAT-SEARCH, DS-TYPO, DS-INLINE, DS-TABLET, DS-SIDEBAR, UX-EMPTY, GDPR-2 UI, GDPR-4 UI, S0-FINAL completati.**
> **Sessione 2026-09-10: Audit Opus 6-agenti. Fix security (stacktrace, migrate cold start, legacy tokens), normativa (DV-CA-01, CA-01 FR lineare, CLAIM-01 saturi+trans), UX (iOS input, toast save), infra (Python CI, xlsx chunk). 242/242 test verdi.**
> **Sessione 2026-09-10 (cont.): REDIS_URL Upstash attivo in prod + backend ridepployato. 9 test thermalEngine (DT-2). Endpoint GDPR-2/4 backend verificati già presenti. SEC-SEARCH /api/ingredients/search/?q= implementato e deployato. Push frontend+backend.**
> **Sessione 2026-09-10 (cont.2): FEAT-EXCEL (export Excel tabella nutrizionale), UX-MOBILE-ETI (scale preview etichetta su mobile), EXP-1 (export/import JSON archivi Nutrizionale+Etichette), fix lint. 251/251 test. Deploy prod.**
> **Sessione 2026-09-10 (cont.3): FEAT-GS1, P9-DASHBOARD, UX-OB, DOC-2. 251 test.**
> **Sessione 2026-09-10 (cont.4): TD-4/E2E-1 (auth.spec.ts + archive.spec.ts), +15 unit test EtichetteCalc (266 tot), DATA-1 (validazione CREA 20 ingredienti, 9 divergenze >10%).**
> **Sessione 2026-09-14: UserIngredient feature completa (backend + frontend). Admin crea ingredienti ufficiali, utenti salvano ingredienti privati (_custom), admin promuove _custom a ufficiale. Deploy prod frontend+backend.**
> Production URL: **https://app-consulenze-alimentari.vercel.app**

---

## 🧪 TEST DA ESEGUIRE (sessione 2026-09-14)

### UserIngredient — E2E manuale
- [ ] **ING-E2E-1** — Admin login → crea ingrediente → verifica visibile nel DB ufficiale per tutti gli utenti
- [ ] **ING-E2E-2** — Admin login → DB → tasto "Modifica" visibile su TUTTI gli ingredienti
- [ ] **ING-E2E-3** — User login → crea ingrediente → visibile solo a quell'utente (categoria `_custom`)
- [ ] **ING-E2E-4** — User login → DB → tasto "Modifica" visibile solo sui propri `_custom`
- [ ] **ING-E2E-5** — Admin login → ingrediente `_custom` di un user → "Promuovi a ufficiale"
- [ ] **ING-E2E-6** — Dopo promozione → sparisce da `_custom`, appare nel DB ufficiale

### UserIngredient — Security
- [ ] **ING-SEC-1** — User non autenticato → 401 su `GET /api/ingredients/user/`
- [ ] **ING-SEC-2** — User A non vede/modifica/elimina ingredienti di User B (IDOR)
- [ ] **ING-SEC-3** — User normale → 403 su `POST /api/ingredients/user/{id}/promote/`
- [ ] **ING-SEC-4** — User normale → 403 su `POST /api/ingredients/` (crea ingrediente ufficiale)

### UserIngredient — Infra
- [ ] **ING-DATA-1** — Migrazione `0008_user_ingredient` applicata in prod (tabella `ingredients_useringredient` esiste in Neon)
- [ ] **ING-PERF-1** — Cold start post-deploy: latenza prima chiamata `/api/ingredients/` accettabile
- [ ] **ING-UX-1** — Ingredienti custom del User A non compaiono nel selettore ricette di User B

---

## 🔴 BLOCCANTE (ancora aperto)

- [ ] **GDPR-1** 🔴 — Redigere e pubblicare (**solo tuo**):
  - Informativa privacy Art. 13 GDPR (titolare: AEA, finalità, base giuridica, conservazione, diritti)
  - Cookie policy — cookie httpOnly `aea_access`/`aea_refresh` sono tecnici/essenziali
  - DPA con Vercel (firma in pannello legal Vercel) + DPA con Neon (provider DB)
  - Procedura diritto cancellazione Art. 17 (anche manuale via Django admin)

- [x] **D3-BE** ✅ — `to_representation` in `serializers.py` già appiattisce `allergens` JSONField in campi `all_*`/`cross_*`. Confermato chiuso 2026-09-07.

- [x] **D2-DATA** ✅ — Falso `all_glutine:1` rimosso da 10 prodotti GF. ✅ 2026-09-07
  Era errore data entry Excel (col HM=glutine ingrediente, mai valorizzata correttamente). Verificato su Excel sorgente. ⚠️ Correggere anche Excel alla prossima revisione (col HM riga 120,625,629,632,830,832,833,834,936,630).

---

## 🟠 ALTA PRIORITÀ

### Sicurezza

- [x] **COD-07-LOGIN / SEC-11-CACHE** ✅ — `django-redis` in requirements + CACHES Redis graceful in `production.py`. `REDIS_URL` Upstash configurata su Vercel e attiva in prod. ✅ 2026-09-10

### Normativa

- [ ] **NORM-09** — Gulf/Arabi: verificare clausola small-package su fonte primaria SFDA/GSO (**solo tuo**).
  Confidenza normativa bassa nel codice. Verificare GSO 2233/2012 + SFDA prima di vendere a clienti Gulf.

- [ ] **GULF-ARABO** — Tabella nutrizionale Gulf solo in inglese — non conforme per export Golfo.
  GSO 2233/2012 richiede lingua araba. Da verificare prima di commercializzare verso clienti Gulf.

- [x] **CA-LINEAR-FR** ✅ — Formato lineare Canada bilingue EN/FR. ✅ 2026-09-10

- [x] **FG-DETAIL** ✅ — 8 sottovoci frutta a guscio ora distinguibili (mandorle, nocciole, noci, anacardi, pistacchi, pecan, noci Brasile, macadamia). ✅ 2026-09-07
  ALLERGEN_FIELDS + ALLERGEN_PARENT aggiornati in constants.ts; DBIngredient esteso; 35 ingredienti patchati in ingredientsDB.json. All. II p.8 Reg. 1169/2011.

- [x] **D4-ALLERGEN** ✅ — 153 ingredienti privi di flag all_* patchati da Excel (49 pesci, 30 soia, 35 frutta_guscio+subcategory, 14 molluschi, 6 crostacei, 3 arachidi, 2 senape, 2 sesamo). ✅ 2026-09-07
  Causa: import originale non mappava tutte le colonne "I" (dichiarato). Nessun unmatched dopo patch.

- [x] **VITAMINA-CLAIM** ✅ — 12 vitamine + zinco/magnesio/fosforo in `calcClaims()`. ✅ 2026-09-07

### UX

- [x] **UX-07** ✅ — Login: tagline + feature bullets + CTA "Richiedi accesso". ✅ 2026-09-09

- [ ] **UX-DEV** — Test fisici iOS Safari + Android Chrome (**solo tuo**). Input decimali, scroll tabelle, touch 44px, PDF.

- [x] **UX-EMPTY** ✅ — Sezioni non critiche EtichetteCalc collassate di default. ✅ 2026-09-09

- [x] **UX-MOBILE-ETI** ✅ — Preview etichetta auto-scala su mobile via CSS transform (ResizeObserver). Export/stampa invariati. ✅ 2026-09-10

### Feature consulenti

- [x] **FEAT-SEARCH** ✅ — Ricerca full-text estesa a produttore/ingredienti/allergeni (EtichetteCalc) e nome (NutrizionaleCalc). ✅ 2026-09-09

- [x] **FEAT-CLAIM** — Claim "senza" (grassi, zuccheri, sale, calorie) + claim saturi + vitamine. ✅ 2026-09-07
  Implementati: SENZA SALE/ZUCCHERI/GRASSI/GRASSI SATURI/CALORIE, MOLTO BASSO SODIO, BASSO CALORIE/GRASSI SATURI, 12 vitamine, zinco/magnesio/fosforo. Tutti con else-if (no claim doppi).

- [x] **FEAT-TMPL** ✅ — 7 template merceologici in EtichetteCalc (modal picker, filtro ruolo). ✅ 2026-09-09

### Dati

- [ ] **D1-EXCEL** — 4 celle errate Excel (colonna HO, righe 331, 485, 625, 824).
  ⚠️ Leggere trappola in `AUDIT-2026-09-03.md` prima di toccare.

---

## 🟡 MEDIA PRIORITÀ

### GDPR / Legale

- [x] **GDPR-2** ✅ — UI + backend `DELETE /api/auth/me/delete/` implementato e attivo in prod. ✅ 2026-09-10
- [ ] **GDPR-3** — Backup DB Neon: policy retention + log accesso ≤12 mesi.
- [x] **GDPR-4** ✅ — UI + backend `GET /api/auth/me/export/` implementato e attivo in prod. ✅ 2026-09-10

### Design system

- [x] **DS-TYPO** ✅ — 136 font-size hardcoded → token CSS (--text-micro … --text-8xl) in unified-tokens.css. ✅ 2026-09-09
- [x] **DS-TABLET** ✅ — Breakpoint 900-1279px aggiunto. ✅ 2026-09-09
- [x] **DS-SIDEBAR** ✅ — Flyout attivo su hover da 900px (era bloccato a ≥1280px). ✅ 2026-09-09
- [x] **DS-INLINE** ✅ — Classi estratte da Dashboard + AbbonamentoPage. ✅ 2026-09-09

### Tecnico

- [x] **S0-FINAL** ✅ — `public/data/ingredientsDB.json` rimosso. ✅ 2026-09-09
- [x] **DOC-2** ✅ — Workflow docs per i 6 calcolatori. `docs/workflow-calcolatori.md`. ✅ 2026-09-10
- [x] **SEC-SEARCH** ✅ — Endpoint `/api/ingredients/search/?q=` attivo in prod (max 50 risultati, auth required). ✅ 2026-09-10
- [x] **EXP-1** ✅ — Export/import archivi JSON in ArchiveModal (Nutrizionale + Etichette). Bottoni Esporta/Importa nell'header modal. ✅ 2026-09-10

---

## 🟢 ROADMAP POST-LAUNCH

### Feature differenzianti (competitività nazionale)

- [x] **FEAT-GS1** ✅ — Export JSON/XML GS1-like per GDO. Bottoni "GS1 JSON" e "GS1 XML" in EtichetteCalc footer. `src/utils/exportGS1.ts`. ✅ 2026-09-10
- [x] **FEAT-EXCEL** ✅ — Export Excel tabella nutrizionale (colonne: Nutriente/Unità/Per 100g/Per porzione/%VNR). Bottone accanto a "Scarica ufficiale". ✅ 2026-09-10
- [ ] **UX-12** — Versioning ricette/etichette (storico revisioni). Richiesto da consulenti + conformità HACCP.
- [ ] **TD-7** — Export vettoriale PDF 300dpi (sostituire `html2canvas` 96dpi non professionale per tipografia).
- [ ] **P7-MULTIUTENTE** — Multi-utente con ruoli (consulente + aziende clienti). Tutti i competitor ce l'hanno.
- [x] **P9-DASHBOARD** ✅ — Dashboard con 3 KPI: Strumenti / Ricette salvate / Etichette salvate. ✅ 2026-09-10
- [x] **P10-NOTIFICHE** ✅ — Campanella notifiche in topbar (AppShell). JSON statico `public/data/normative_updates.json`, badge unread, mark read via localStorage. ✅ 2026-09-10

### Debito tecnico

- [ ] **TD-1 / COD-02** — Estrazione engine da `EtichetteCalc.tsx` (3400+ righe). Prerequisito per refactor sicuro.
- [ ] **TD-2 / COD-05** — Ridurre duplicazione desktop/mobile NutrizionaleCalc (~2000 righe).
- [x] **TD-4 / E2E-1** ✅ — E2E test Playwright: `lasagna.spec.ts` + `auth.spec.ts` (login fallito/corretto/logout) + `archive.spec.ts` (salva/carica/elimina). ✅ 2026-09-10
- [ ] **A11Y-1** — Audit accessibilità completo.

### Dati

- [x] **DATA-1** ✅ — Validazione 20 ingredienti vs CREA (alimentinutrizione.it). 9/20 divergono >10% (aglio, farina 00, pollo). Report: `docs/data-validation-crea.md`. Fix: `sync_crea.py` su cat. 01/03/06/12. ✅ 2026-09-10
- [ ] **DATA-2/SYNC-CNF** — Canada Nutrient File
- [ ] **DATA-3/SYNC-AUSNUT** — Australia AUSNUT 2011-13

### Pagamenti / crescita

- [ ] **UX-PAY** — Integrazione pagamenti / gestione abbonamento.
- [ ] **EXP-1** — Export/import archivi ricette JSON.
- [x] **UX-OB** ✅ — Guida rapida floating button + WelcomeModal step-based già presente in Dashboard. ✅ 2026-09-10

---

## ✅ COMPLETATI SESSIONE 2026-09-07 (quick wins audit)

- ✅ **QW-1 / CLAIM-SALE** — già implementato via `relabelClaim()` in EtichetteCalc.tsx:602 (N/A)
- ✅ **QW-2 / DISCLAIMER** — footer legale globale in AppShell (copre tutti i tool)
- ✅ **QW-3 / EMPTY-STATE** — empty state dashed border in NutrizionaleCalc quando componente senza ingredienti
- ✅ **QW-4 / DEMO-RECIPE** — bottone "Carica ricetta demo" nell'ultimo slide WelcomeModal; carica pasta all'uovo (4 ingredienti) in NutrizionaleCalc
- ✅ **QW-5 / FEAT-DUP** — bottone "Duplica" (Copy icon) in ArchiveModal; attivo su NutrizionaleCalc + EtichetteCalc
- ✅ **QW-6 / TOOLTIP** — già implementato: InfoTooltip su Resa, Peso finito, Peso specifico, Pzuv (N/A)
- ✅ **QW-7 / REQUIRED-HIGHLIGHT** — bordo rosso su campi obbligatori mancanti in EtichetteCalc (et-nome, et-produttore, et-peso-netto, et-ingredienti)
- ✅ **QW-8 / SKELETON** — skeleton shimmer rows in NutrizionaleCalc mentre loadingDB=true + animazione CSS
- ✅ **QW-9 / SOCIAL-PROOF** — badge "100+" PMI alimentari nel pannello sinistro LoginPage
- ✅ **QW-10 / DS-SEVERITY** — banner overflow/taglio/barcode → rosso; esenzioni normative → arancione (EtichetteCalc)

## ✅ COMPLETATI SESSIONE 2026-09-07 (deploy + auth)

- ✅ **DEPLOY-1** — Deploy prod `https://app-consulenze-alimentari.vercel.app`
- ✅ **Django comandi** — `migrate` (0007 allergens già applicata) + `import_allergens_from_json` (366 aggiornati)
- ✅ **AUTH-1** — Account cliente `makegraphicidea@gmail.com` creato con tutti i tool
- ✅ **AUTH-2 + SEC-03** — Rimossi token localStorage (`getAccessToken`, `setTokens`, `clearTokens`) da `client.ts` + `AuthContext.tsx`
- ✅ **UX-02** — Verificato: campo `password` assente dal payload `/api/auth/me/`
- ✅ **SEC-05** — Cache utente migrata da `localStorage` a `sessionStorage`
- ✅ **SEC-07** — `ArchiveEntryViewSet` filtra per tool acquistato (submodule commit 1c3875f)
- ✅ **SEC-10** — `IngredientViewSet` throttle `ingredient_list: 10/min` configurato (submodule)
- ✅ **D3-FRONTEND** — N/A: `useAllergens` non esiste, frontend non consuma ancora il dict sparse
- ✅ **UX-04** — Pagina `/abbonamento` con account info, strumenti attivi e non acquistati
- ✅ **SEC-12-CSP** — Verificata: nessun font/CDN esterno, CSP corretta in prod

---

## ✅ COMPLETATI SESSIONE 2026-09-04

> Branch `fix/audit-2026-09-03` — 24 commit, 242 test (era 186).

- ✅ NORM-01/02/03/04/05/06/07/08 — fix normativi claim e NRV
- ✅ UX-01/03/05/06/08/09/10/11 — UX mobile, autosave, sidebar, contrasto
- ✅ SEC-04/11/12 — CSP rimosso unsafe-inline
- ✅ SEC-01/02/06/08/09 + LoginView throttle — sicurezza backend Django
- ✅ COD-03/04/07/08/09/10 + UI-FASE1 — qualità codice e test
- ✅ D3/COD-1 — campo `allergens` JSONField + migrazione 0007 + import command

---

## ⚠️ TRAPPOLE ATTIVE

1. **NON rigenerare `ingredientsDB.json` dall'Excel alla cieca.**
   342/1065 voci combaciano per nome — ~700 rinominate spaccano archivi esistenti.

2. **NON toccare `Tab{UE,USA,Canada,Australia,Arabi}.tsx` markup/stili.**
   Tabelle ufficiali protette — modifiche visive richiedono approvazione esplicita.

3. **`nutritionalEngine.ts` e `localizationModule.ts` NON ESISTONO.**
   Engine canonico: `src/engines/nutrizionaleCalcEngine.ts`.

4. **Django locale:** `cd Beck-end/backend && ../venv/bin/python manage.py runserver`.
   Python 3.9 — usare `Optional[X]` invece di `X | None`.

5. **`allergens` backend è dict sparse** — solo chiavi `true`. Frontend tratta chiavi mancanti come `false`.

6. **Throttling prod richiede Redis** — `LocMemCache` non persiste tra worker Gunicorn.

7. **Deploy prod:** `vercel deploy --prod --scope team_o6LXdelylqAyfa6pmdWBwa2m`
