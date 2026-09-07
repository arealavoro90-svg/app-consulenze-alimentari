# TODO — AEA Consulenze Alimentari
> **Aggiorna dopo ogni sessione.** Inizio sessione: leggi CLAUDE.md + questo file.
> Audit storico: `AUDIT.md` · Audit 2026-09-03: `AUDIT-2026-09-03.md` (20/22 chiusi)
> Audit 360° Etichette+Nutrizionale: `docs/audit/AUDIT-2026-09-07-etichette-nutrizionale.md`
> **Sessione 2026-09-07: DEPLOY PROD live. Auth reale verificata. Quick wins audit implementati.**
> Production URL: **https://app-consulenze-alimentari.vercel.app**

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

- [x] **COD-07-LOGIN / SEC-11-CACHE** ✅ — `django-redis` in requirements + CACHES Redis graceful in `production.py`. Attivo solo se `REDIS_URL` impostata. ⚠️ Impostare `REDIS_URL` (Upstash) nelle env Vercel per attivare.

### Normativa

- [ ] **NORM-09** — Gulf/Arabi: verificare clausola small-package su fonte primaria SFDA/GSO (**solo tuo**).
  Confidenza normativa bassa nel codice. Verificare GSO 2233/2012 + SFDA prima di vendere a clienti Gulf.

- [ ] **GULF-ARABO** — Tabella nutrizionale Gulf solo in inglese — non conforme per export Golfo.
  GSO 2233/2012 richiede lingua araba. Da verificare prima di commercializzare verso clienti Gulf.

- [ ] **CA-LINEAR-FR** — Formato lineare Canada solo in inglese. CFIA richiede bilinguismo in tutti i formati.

- [x] **FG-DETAIL** ✅ — 8 sottovoci frutta a guscio ora distinguibili (mandorle, nocciole, noci, anacardi, pistacchi, pecan, noci Brasile, macadamia). ✅ 2026-09-07
  ALLERGEN_FIELDS + ALLERGEN_PARENT aggiornati in constants.ts; DBIngredient esteso; 35 ingredienti patchati in ingredientsDB.json. All. II p.8 Reg. 1169/2011.

- [x] **D4-ALLERGEN** ✅ — 153 ingredienti privi di flag all_* patchati da Excel (49 pesci, 30 soia, 35 frutta_guscio+subcategory, 14 molluschi, 6 crostacei, 3 arachidi, 2 senape, 2 sesamo). ✅ 2026-09-07
  Causa: import originale non mappava tutte le colonne "I" (dichiarato). Nessun unmatched dopo patch.

- [x] **VITAMINA-CLAIM** ✅ — 12 vitamine + zinco/magnesio/fosforo in `calcClaims()`. ✅ 2026-09-07

### UX

- [ ] **UX-07** — Login page: proposta di valore. Social proof aggiunta (QW-9 ✅), manca pricing/tagline forte.

- [ ] **UX-DEV** — Test fisici iOS Safari + Android Chrome (**solo tuo**). Input decimali, scroll tabelle, touch 44px, PDF.

- [ ] **UX-EMPTY** — EtichetteCalc: form vuoto con 40+ campi senza priorità visiva. Abbandono al primo accesso.
  Aggiungere wizard/sezioni guidate o highlight dei campi critici da compilare per primi.

- [ ] **UX-MOBILE-ETI** — Anteprima etichetta inutilizzabile su mobile (label 100x150mm su 375px).
  Tablet in stabilimento non funzionano. FASE 2 mobile EtichetteCalc.

### Feature consulenti

- [ ] **FEAT-SEARCH** — Ricerca full-text nell'archivio (NutrizionaleCalc + EtichetteCalc).
  ArchiveModal ha già campo cerca per nome — estendere a ricerca per ingredienti/produttore.

- [x] **FEAT-CLAIM** — Claim "senza" (grassi, zuccheri, sale, calorie) + claim saturi + vitamine. ✅ 2026-09-07
  Implementati: SENZA SALE/ZUCCHERI/GRASSI/GRASSI SATURI/CALORIE, MOLTO BASSO SODIO, BASSO CALORIE/GRASSI SATURI, 12 vitamine, zinco/magnesio/fosforo. Tutti con else-if (no claim doppi).

- [ ] **FEAT-TMPL** — Template etichetta per categoria merceologica (pasta, conserve, bevande, surgelati).
  Dimezza tempo compilazione per nuovi clienti. Competitor Agriware ce l'ha.

### Dati

- [ ] **D1-EXCEL** — 4 celle errate Excel (colonna HO, righe 331, 485, 625, 824).
  ⚠️ Leggere trappola in `AUDIT-2026-09-03.md` prima di toccare.

---

## 🟡 MEDIA PRIORITÀ

### GDPR / Legale

- [ ] **GDPR-2** — Endpoint cancellazione dati `/api/users/me/delete/` Art. 17 (entro 30gg dal go-live).
- [ ] **GDPR-3** — Backup DB Neon: policy retention + log accesso ≤12 mesi.
- [ ] **GDPR-4** — Portabilità dati `/api/users/export/` Art. 20.

### Design system

- [ ] **DS-TYPO** — Nessun token tipografia — 12+ font-size hardcoded (11px, 12px, 13px, 15px, 28px...).
  Definire scale CSS in `index.css` e sostituire gli hardcoded.

- [ ] **DS-TABLET** — Nessun breakpoint tablet landscape (1024-1279px) — layout collassa a mobile.

- [ ] **DS-SIDEBAR** — Flyout sidebar disabilitato sotto 1280px — utenti su schermi medi vedono solo icone.

- [ ] **DS-INLINE** — 80+ stili inline in Dashboard + AbbonamentoPage. Bassa riutilizzabilità.

### Tecnico

- [ ] **S0-FINAL** — Rimuovere `public/data/ingredientsDB.json` (dopo Redis + auth stabile).
- [ ] **DOC-2** — Workflow docs per i 6 calcolatori.
- [ ] **SEC-SEARCH** — Endpoint search `/api/ingredients/search?q=` (evita download 478KB su mobile).

---

## 🟢 ROADMAP POST-LAUNCH

### Feature differenzianti (competitività nazionale)

- [ ] **FEAT-GS1** — Export JSON/XML GS1-like per GDO. Prerequisito per PMI che vendono a catene. Competitor Alia/Agriware ce l'hanno.
- [ ] **FEAT-EXCEL** — Export Excel strutturato tabella nutrizionale (i consulenti vivono in Excel).
- [ ] **UX-12** — Versioning ricette/etichette (storico revisioni). Richiesto da consulenti + conformità HACCP.
- [ ] **TD-7** — Export vettoriale PDF 300dpi (sostituire `html2canvas` 96dpi non professionale per tipografia).
- [ ] **P7-MULTIUTENTE** — Multi-utente con ruoli (consulente + aziende clienti). Tutti i competitor ce l'hanno.
- [ ] **P9-DASHBOARD** — Dashboard operativa con KPI e attività recente (ora solo griglia tool).
- [ ] **P10-NOTIFICHE** — Notifiche aggiornamenti normativi. Competitor Agriware ce l'ha.

### Debito tecnico

- [ ] **TD-1 / COD-02** — Estrazione engine da `EtichetteCalc.tsx` (3400+ righe). Prerequisito per refactor sicuro.
- [ ] **TD-2 / COD-05** — Ridurre duplicazione desktop/mobile NutrizionaleCalc (~2000 righe).
- [ ] **TD-4 / E2E-1** — E2E test Playwright: login → ricetta → tabella → PDF. Prerequisito per ogni refactor.
- [ ] **A11Y-1** — Audit accessibilità completo.

### Dati

- [ ] **DATA-1** — Validazione campione CREA BDA live (20+ ingredienti)
- [ ] **DATA-2/SYNC-CNF** — Canada Nutrient File
- [ ] **DATA-3/SYNC-AUSNUT** — Australia AUSNUT 2011-13

### Pagamenti / crescita

- [ ] **UX-PAY** — Integrazione pagamenti / gestione abbonamento.
- [ ] **EXP-1** — Export/import archivi ricette JSON.
- [ ] **UX-OB** — Onboarding guidato per ogni tool (walkthrough interattivo).

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
