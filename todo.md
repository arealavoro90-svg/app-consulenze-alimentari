# TODO — AEA Consulenze Alimentari

> Aggiorna dopo ogni sessione. All'inizio di ogni sessione: "Leggi CLAUDE.md e todo.md."
> ID univoci per riferimento in chat (es: "lavoriamo su BUG-1").

---

## MOB-PARITY — Parità Desktop/Mobile NutrizionaleCalc
### Fase 5 — Session Bridge desktop↔mobile (COMPLETATA — 2026-05-30)
- [x] **MOB-P5-1** — sessionBridge.ts: persistenza stato in localStorage (`nut_session_draft`)
- [x] **MOB-P5-2** — Desktop scrive bridge al load da archivio (`handleLoad`)
- [x] **MOB-P5-3** — Mobile legge bridge al mount (dopo DB load) e ricostruisce componenti

### Fase 4 — Ristrutturazione UI (COMPLETATA — 2026-05-30)
- [x] **MOB-P4-1** — Tab bar rinominata: Ricetta | Riepilogo | Mercati | Archivio (Tools rimosso)
- [x] **MOB-P4-2** — Logo AEA tappabile → naviga a /dashboard (accesso strumenti)
- [x] **MOB-P4-3** — Nuovo tab Riepilogo: tabella ingredienti (Quantità/Costi), card costi, allergenici
- [x] **MOB-P4-4** — Tab Mercati: chip region compatti (EU|US|CA|AU|AR) invece dei tile grandi


Spec: `docs/superpowers/specs/2026-05-30-mobile-parity-design.md`
Obiettivo: NutrizionaleCalcMobile = NutrizionaleCalc al 100%.

### Fase 1 — Fix TabellaTab + Tabelle CA/AU/Arabi (COMPLETATA — 2026-05-30)

- [x] **MOB-P1-0** — Ricerca ingredienti da DB → calcolo automatico in CalcoloTab
- [x] **MOB-P1-1** — Estrai `TabCanada.tsx` come file condiviso
- [x] **MOB-P1-2** — Estrai `TabAustralia.tsx` come file condiviso
- [x] **MOB-P1-3** — Estrai `TabArabi.tsx` come file condiviso
- [x] **MOB-P1-4** — Espandi `MobileNutForm` con serving sizes per tutte le 5 regioni + specificGravity
- [x] **MOB-P1-5** — Riscrivi `TabellaTab.tsx`: EU sub-tab selector, USA layout/measure/servingRef, CA/AU/Arabi tabelle + configuratori
- [x] **MOB-P1-6** — Build + verifica TypeScript pulito
- [x] **MOB-P1-7** — Deploy Vercel produzione (2026-05-30)

### Fase 2 — CalcoloTab avanzato (COMPLETATA — 2026-05-30)

- [x] **MOB-P2-1** — Multi-componente: `MobileComponent[]` con nome, pzUV, rows, additiveRows
- [x] **MOB-P2-2** — Campo resa % per ingrediente (default 100%, espandibile per riga)
- [x] **MOB-P2-3** — Campo peso finito prodotto (pesoFinito_g in MobileNutForm)
- [x] **MOB-P2-4** — Additivi: sezione collassabile per componente (categoria + nomeSpecifico)
- [x] **MOB-P2-5** — Campo costo EUR/kg per ingrediente (espandibile per riga)

### Fase 3 — Feature complete (COMPLETATA — 2026-05-30)

- [x] **MOB-P3-1** — Allergenici: calcolo automatico da ingredienti DB (presenti + tracce), chip colorati in TabellaTab
- [x] **MOB-P3-2** — Optional nutrients: NutrientSelectModal in TabellaTab mobile (pulsante "Nutrienti" nella vista EU)
- [x] **MOB-P3-3** — Peso specifico (SG): campo in CalcoloTab, passa a TabUE/TabUSA/TabArabi

---


## BUG — Da correggere (viola CLAUDE.md)

- [ ] **BUG-1** — Sostituire `prompt()` / `alert()` / `confirm()` nativi con pattern
      UI coerenti (modale inline o notifica). Impatta tutti i calcolatori + ArchiveModal
      + SavedTablesModal. Refactor trasversale — procedere un calcolatore alla volta.

---

## CRITICO — Decisione pre-commercializzazione

- [ ] **AUTH-1** — Pianificare backend reale (JWT/OAuth2) prima di uso commerciale.
      Auth attuale è mock frontend-only, password in chiaro in localStorage.
- [ ] **AUTH-2** — Go-live Django: rimuovere fallback mock in `src/api/auth.ts`
      (apiLogin catch→MOCK_USERS, apiMe catch→aea_user cache). aea_user è manipolabile
      da console → role admin lato client. Marcato con TODO go-live (audit 2026-07-17).
- [x] **TAB-UNIFY** — COMPLETATO 2026-07-17: tabelle Canada/Australia/Arabi unificate
      sui file condivisi Tab{Canada,Australia,Arabi}.tsx (sorgente normativa = versione
      desktop, come deciso). Inline desktop rimosse (~476 righe), snapshot di guardia
      in TabIntl.test.tsx. Prop `full`/`setSubTab` eliminate (header mobile era dead code).
- [ ] **DOC-1** — CLAUDE.md e skill nutritional-calc descrivono `nutritionalEngine.ts`
      e `localizationModule.ts` come canonici ma sono CODICE MORTO (nessun import runtime).
      Engine vivo: `nutrizionaleCalcEngine.calcNutrients`; arrotondamenti dentro i Tab.
      Decidere: aggiornare doc + eliminare i file morti, o riattivarli.

---

## ALTA PRIORITÀ

- [ ] **ETI-1** — Gap analysis EtichetteCalc: verificare se campi e PDF output
      coprono la specifica originale. Decidere se integrarla con nutritionalEngine
      o mantenerla standalone come generatore etichette grafiche.

---

## MEDIA PRIORITÀ

- [ ] **TEST-1** — Setup Vitest (richiede approvazione dipendenza) + unit test per
      `nutritionalEngine.ts` e `localizationModule.ts`. Zero copertura su logica EU critica.

- [ ] **UX-1** — Error boundary globale React (nessun fallback su crash componente).

- [ ] **DOC-1** — Workflow docs in `.agents/workflows/` per i 6 calcolatori senza
      documentazione. Migliora il contesto disponibile nelle sessioni Claude.

---

## BASSA PRIORITÀ

- [ ] **EXP-1** — Import/export archivi localStorage come JSON (backup tra dispositivi).

- [ ] **PERF-1** — `React.lazy` per calcolatori pesanti solo se si riscontrano
      problemi di caricamento reali.

- [ ] **A11Y-1** — Accessibilità base: aria-labels, navigazione da tastiera.

---

## COMPLETATI

- [x] **MOB-P1-0** — Ricerca ingredienti da DB → calcolo automatico in mobile CalcoloTab (2026-05-30).
      CalcoloTab riscritto: niente input manuali nutrienti. Ingredienti DB → calcNutrients() auto.
      File: NutrizionaleCalcMobile.tsx, CalcoloTab.tsx. Deploy produzione OK.
- [x] **MOB-1** — Interfaccia mobile NutrizionaleCalc (2026-05-30): MobileShell + useMobile hook + AppShell
      integrazione + NutrizionaleCalcMobile con 4 tab (Calcolo / Tabella / Archivio / Tools).
      Design system mobile in `src/styles/mobile.css`. Commit range: 8fb4438…40abc43.
      Nota: formati Canada/Australia/Arabi nella TabellaTab mostrano placeholder (TAB-CA/AU/AR non ancora implementati).
- [x] **TAB-UE** — TabUE.tsx estratto, layout completo EU Reg. 1169/2011 (2026-05-23, commit 710ee97)
- [x] **TAB-USA-VERT** — TabUSA.tsx riscritto: verticale con vitamine a righe separate, font FDA (2026-05-23)
- [x] **TAB-USA-PILL** — Aggiunti bottoni Verticale/Orizzontale/Lineare per tab USA in wizard e vista avanzata (2026-05-23)
