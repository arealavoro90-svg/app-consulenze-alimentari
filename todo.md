# TODO — AEA Consulenze Alimentari

> Aggiorna dopo ogni sessione. All'inizio di ogni sessione: "Leggi CLAUDE.md e todo.md."
> ID univoci per riferimento in chat (es: "lavoriamo su BUG-1").

---

## TABELLE ESTERE — In corso (riprendere alla prossima sessione)

Riferimento: `/Users/novanta/Desktop/APP/_materiale e modifiche_app AEA/Verifica del 20-05-26_tabelle.pdf`

- [ ] **TAB-USA-1** — USA Orizzontale: formattazione non conforme al PDF.
      Verificare con hard refresh (Cmd+Shift+R) se il fix del 23-05 è visibile.
      Se ancora sbagliata: rivedere font, spessori, posizionamento Calories block nel layout a 4 colonne.

- [ ] **TAB-USA-2** — USA Lineare: verificare conformità al PDF dopo fix del 23-05
      (Serv.size: abbreviato, Amount per serving: completo).

- [ ] **TAB-CA-1** — Canada Verticale: riscrivere completamente.
      Layout attuale (due colonne EN|FR affiancate) → layout richiesto (Nutrition Facts / Valeur nutritive
      sovrapposti, righe bilingue nella stessa cella, Saturated+Trans combinati).
      Varianti: g/tazze(250ml)/cucchiai/pezzi × serving/confezione + 100g.

- [ ] **TAB-CA-2** — Canada Orizzontale: riscrivere completamente.
      Colonna sx (NF/VN + serving + Calories) + 2 colonne nutrienti bilingui + footer.

- [ ] **TAB-CA-3** — Canada Lineare: correggere formato testo (vedi PDF pag. 13-14).

- [ ] **TAB-AU-1** — Australia: riscrivere layout.
      Titolo "NUTRITION INFORMATION" centrato grande, serving size dinamico,
      colonne: Nutriente | Avg Qty per Serving | %DI | Avg Qty per 100g.
      Rimuovere righe duplicate (Protein/Fat/Saturated appaiono 2 volte, bug).

- [ ] **TAB-AR-1** — Arabi: riscrivere con layout FDA-style verticale (come USA)
      con tutte le varianti misura (tazze/cucchiai/pezzi × serving/confezione).
      DV Gulf standard: 2000 kcal, grassi 65g, saturi 20g, sodio 2300mg, carb 300g, fibre 25g.

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

- [x] **MOB-1** — Interfaccia mobile NutrizionaleCalc (2026-05-30): MobileShell + useMobile hook + AppShell
      integrazione + NutrizionaleCalcMobile con 4 tab (Calcolo / Tabella / Archivio / Tools).
      Design system mobile in `src/styles/mobile.css`. Commit range: 8fb4438…40abc43.
      Nota: formati Canada/Australia/Arabi nella TabellaTab mostrano placeholder (TAB-CA/AU/AR non ancora implementati).
- [x] **TAB-UE** — TabUE.tsx estratto, layout completo EU Reg. 1169/2011 (2026-05-23, commit 710ee97)
- [x] **TAB-USA-VERT** — TabUSA.tsx riscritto: verticale con vitamine a righe separate, font FDA (2026-05-23)
- [x] **TAB-USA-PILL** — Aggiunti bottoni Verticale/Orizzontale/Lineare per tab USA in wizard e vista avanzata (2026-05-23)
