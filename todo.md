# TODO — AEA Consulenze Alimentari

> Aggiorna dopo ogni sessione. All'inizio di ogni sessione: "Leggi CLAUDE.md e todo.md."
> ID univoci per riferimento in chat (es: "lavoriamo su BUG-1").

---

## BUG — Da correggere (viola CLAUDE.md)

- [ ] **BUG-1** — Sostituire `prompt()` / `alert()` / `confirm()` nativi con pattern
      UI coerenti (modale inline o notifica). Impatta tutti i calcolatori + ArchiveModal
      + SavedTablesModal. Refactor trasversale — procedere un calcolatore alla volta.

---

## CRITICO — Decisione pre-commercializzazione

- [ ] **AUTH-1** — Pianificare backend reale (JWT/OAuth2) prima di uso commerciale.
      Auth attuale è mock frontend-only, password in chiaro in localStorage.

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

<!-- Sposta qui i task completati con data -->
