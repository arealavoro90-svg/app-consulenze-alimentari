# TODO — AEA Consulenze Alimentari
> **Aggiorna dopo ogni sessione.** Inizio sessione: leggi CLAUDE.md + questo file.
> Audit storico: `AUDIT.md` · Audit 2026-09-03: `AUDIT-2026-09-03.md` (20/22 chiusi)
> **Sessione 2026-09-07: DEPLOY PROD live. Auth reale verificata. Vedi sezione ✅.**
> Production URL: **https://app-consulenze-alimentari.vercel.app**

---

## 🔴 BLOCCANTE (ancora aperto)

- [ ] **GDPR-1** 🔴 — Redigere e pubblicare (tuo):
  - Informativa privacy Art. 13 GDPR (titolare: AEA, finalità, base giuridica, conservazione, diritti)
  - Cookie policy — cookie httpOnly `aea_access`/`aea_refresh` sono tecnici/essenziali
  - DPA con Vercel (firma in pannello legal Vercel) + DPA con Neon (provider DB)
  - Procedura diritto cancellazione Art. 17 (anche manuale via Django admin)

---

## 🟠 ALTA PRIORITÀ

### Sicurezza

- [ ] **COD-07-LOGIN** — Rate limit login 3/min: `LocMemCache` non persiste tra worker Gunicorn.
  Aggiungere Redis in `production.py` per `CACHES`. Senza Redis il throttling è inefficace in prod.

- [ ] **SEC-12-CSP** — Verificare che nessun componente usi stili/script inline rotti dopo rimozione `unsafe-inline`.
  Test manuale su production: aprire devtools → console → cercare CSP violations.

### Normative

- [ ] **NORM-09** — Gulf/Arabi: verificare clausola small-package su fonte primaria SFDA/GSO.
  Confidenza normativa bassa nel codice. Verificare GSO 2233/2012 + SFDA prima di vendere a clienti Gulf.

- [ ] **NORM-10** — Scostamenti grassi/proteine Lasagna (ETI-6) — causa non isolata.
  Scope: NutrizionaleCalc, EtichetteCalc, TrattamentoTermicoCalc — almeno 3 ricette reali per tool.

### UX

- [ ] **UX-04** — Pagina "Il tuo abbonamento".
  Scope minimo: pagina statica con `purchased_tools` + email da Django.

- [ ] **UX-07** — Login page: proposta di valore. Tagline generica, nessun pricing/social proof.

- [ ] **UX-DEV** — Test fisici iOS Safari + Android Chrome. Input decimali, scroll tabelle, touch 44px, PDF.

### Dati

- [ ] **D1-EXCEL** — 4 celle errate Excel (colonna HO, righe 331, 485, 625, 824).
  ⚠️ Leggere trappola in `AUDIT-2026-09-03.md` prima di toccare.

- [ ] **D2-DATA** — 9 prodotti "senza glutine" con GLUTINE marcato presente.
  Necessaria scheda tecnica fornitore. Lista in `AUDIT-2026-09-03.md`.

---

## 🟡 MEDIA PRIORITÀ

- [ ] **SEC-11-CACHE** — Redis per throttling in produzione (vedi COD-07-LOGIN sopra).
- [ ] **GDPR-2** — Endpoint cancellazione dati `/api/users/me/delete/` (entro 30gg dal go-live).
- [ ] **GDPR-3** — Backup DB Neon: policy retention + log accesso ≤12 mesi.
- [ ] **DOC-2** — Workflow docs per i 6 calcolatori.
- [ ] **S0-FINAL** — Rimuovere `public/data/ingredientsDB.json` (dopo Redis + auth stabile).

---

## 🟢 ROADMAP POST-LAUNCH

- [ ] **DATA-1** — Validazione campione CREA BDA live (20+ ingredienti)
- [ ] **DATA-2/SYNC-CNF** — Canada Nutrient File
- [ ] **DATA-3/SYNC-AUSNUT** — Australia AUSNUT 2011-13
- [ ] **SEC-SEARCH** — Endpoint search `/api/ingredients/search?q=`
- [ ] **COD-02** — Estrazione engine da `EtichetteCalc.tsx` (3438 righe)
- [ ] **COD-05** — Ridurre duplicazione desktop/mobile (~2000 righe)
- [ ] **UX-12** — Versioning ricette
- [ ] **UX-OB** — Onboarding clienti per ogni tool
- [ ] **UX-14** — Ricetta demo per nuovi account
- [ ] **EXP-1** — Export/import archivi ricette JSON
- [ ] **A11Y-1** — Audit accessibilità completo
- [ ] **E2E-1** — Playwright E2E: login → ricetta → tabella → PDF
- [ ] **GDPR-4** — Portabilità dati `/api/users/export/` (Art. 20)
- [ ] **UX-PAY** — Integrazione pagamenti / gestione abbonamento

---

## ✅ COMPLETATI SESSIONE 2026-09-07

- ✅ **DEPLOY-1** — Merge `fix/audit-2026-09-03` → main (già fatto sessione precedente) + deploy prod
  Production: https://app-consulenze-alimentari.vercel.app
- ✅ **Django comandi** — `migrate` (0007 allergens già applicata) + `import_allergens_from_json` (366 aggiornati)
- ✅ **AUTH-1** — Account cliente `makegraphicidea@gmail.com` creato con tutti i tool
- ✅ **AUTH-2 + SEC-03** — Rimossi token localStorage (`getAccessToken`, `setTokens`, `clearTokens`) da `client.ts` + `AuthContext.tsx`
- ✅ **UX-02** — Verificato: campo `password` assente dal payload `/api/auth/me/`
- ✅ **SEC-05** — Cache utente migrata da `localStorage` a `sessionStorage` (sessione precedente)
- ✅ **SEC-07** — `ArchiveEntryViewSet` filtra per tool acquistato (submodule commit 1c3875f)
- ✅ **SEC-10** — `IngredientViewSet` throttle `ingredient_list: 10/min` configurato (submodule)
- ✅ **D3-FRONTEND** — N/A: `useAllergens` non esiste, il frontend non consuma ancora il dict sparse

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
