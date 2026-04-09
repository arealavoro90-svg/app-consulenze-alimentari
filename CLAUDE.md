# CLAUDE.md — AEA Consulenze Alimentari

## Regola operativa principale
NON modificare codice esistente senza proporre prima la variazione e ricevere
approvazione esplicita. Leggere sempre il file prima di proporre modifiche.

---

## Documentazione di riferimento
- Stack, struttura, comandi: `README.md`
- Workflow calcolo nutrizionale: `.agents/workflows/nutritional-calculation.md`
- Permessi CLI preapprovati: `.claude/settings.local.json`

---

## Regole non derivabili dal codice

### Calcoli nutrizionali
- Standard: EU Reg 1169/2011 — non cambiare fattori energetici senza fonte normativa
- Precisione interna: 10.000x → arrotondamento regionale via `localizationModule.ts`
- `localizationModule.ts` impatta tutti i calcolatori: massima cautela, sempre proporre

### Trattamento termico (thermalEngine.ts)
- Modello Bigelow: tRef=121.1°C, integrazione trapezoidale
- I dataPoint devono essere ordinati per tempo crescente

### Autenticazione
- Mock frontend-only — non estendere questo pattern
- localStorage key: `aea_user`

---

## Pattern per aggiungere un nuovo strumento (3 file obbligatori)
1. `src/data/mockUsers.ts` — aggiungere ToolId e voce in TOOLS_CATALOG
2. `src/App.tsx` — aggiungere Route con ProtectedRoute + requiredTool
3. `src/components/Sidebar.tsx` — verificare che il nav lo includa

---

## Vincoli fissi (non negoziabili senza discussione)
- Nessun CSS framework esterno
- Nessun nuovo state manager (Context API è sufficiente)
- Nessuna dipendenza nuova senza approvazione
- Validazione: usare sempre `src/utils/validation.ts`, non duplicare
- `ingredientsDB.json`: caricare da `/public/data/`, non modificare manualmente
- Zero `any` impliciti, zero `@ts-ignore`, zero `alert()`/`confirm()`
- Non committare `.env.local`
