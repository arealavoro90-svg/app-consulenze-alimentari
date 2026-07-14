# CLAUDE.md — AEA Consulenze Alimentari

## Metodo di lavoro (sostituisce il protocollo Swarm V5.1, archiviato in `docs/archive/agentsinloop.md`)
1. **Proponi prima di modificare**: NON modificare codice esistente senza proporre la variazione e ricevere approvazione esplicita. Leggere sempre il file prima di proporre modifiche.
2. **Pianifica** i task non banali (3+ passaggi) con una breve scaletta prima di eseguire.
3. **Verifica reale, non dichiarata**: prima di dichiarare completato un lavoro, eseguire e riportare l'esito di:
   - `npm test` (vitest) — obbligatorio se toccati engine o logic
   - `npx tsc -b` e `npm run lint` — obbligatori su ogni modifica TS/TSX
4. Se un task fallisce ripetutamente, fermarsi e chiedere input invece di iterare alla cieca.

## Contesto di sessione
- All'inizio di ogni sessione leggere anche `todo.md` (stato lavori, ID task tipo BUG-1, MOB-P5-1).
- Bug noti e debito tecnico tracciati in `AUDIT.md` — consultarlo prima di toccare aree già auditate.

## Documentazione di riferimento
- Stack, struttura, comandi: `README.md`
- Workflow calcolo nutrizionale: skill `nutritional-calc` (`.claude/skills/nutritional-calc/SKILL.md`)
- Aggiunta nuovo strumento: skill `add-tool` (`.claude/skills/add-tool/SKILL.md`)
- Permessi CLI preapprovati: `.claude/settings.local.json`

## Regole non derivabili dal codice

### Calcoli nutrizionali (FUNZIONANTI — priorità: non introdurre regressioni)
- Standard: EU Reg 1169/2011 — non cambiare fattori energetici senza fonte normativa
- Precisione interna: 10.000x → arrotondamento regionale via `localizationModule.ts`
- `localizationModule.ts` impatta tutti i calcolatori: massima cautela, sempre proporre
- Ogni modifica a `src/engines/` o `src/logic/` richiede `npm test` verde prima del completamento

### Trattamento termico (thermalEngine.ts)
- Modello Bigelow: tRef=121.1°C, integrazione trapezoidale
- I dataPoint devono essere ordinati per tempo crescente
- Engine esistente e tool attivo (vedi README) — stesse cautele anti-regressione degli altri engine

### Prospettiva di crescita dell'app
- Il tool dei valori nutrizionali è il fulcro; gli altri tool si consolidano gradualmente
- Obiettivo: gestionale completo per le PMI alimentari
- Ogni strumento ha un file Excel di riferimento per le logiche di calcolo

### Autenticazione
- Frontend: mock con localStorage key `aea_user` — non estendere questo pattern
- Backend Django in sviluppo in `Beck-end/` (spec: `docs/django-backend-spec.md`, API client: `src/api/`) — coordinare le modifiche auth con questo

## Workflow deploy (regola permanente)
Al termine di OGNI richiesta o modifica al codice, chiedere sempre:
> "Vuoi caricare le modifiche su Vercel per verificarne le funzionalità?"

Se sì: deploy preview con `vercel` dalla directory del progetto.

## Stile di sviluppo
Soluzione più semplice che funziona, YAGNI enforced (plugin **ponytail**, full mode).

## Vincoli fissi (non negoziabili senza discussione)
- CSS: **Tailwind 4** è lo standard del progetto — nessun altro framework CSS aggiuntivo
- Nessun nuovo state manager (Context API è sufficiente)
- Nessuna dipendenza nuova senza approvazione
- Validazione: usare sempre `src/utils/validation.ts`, non duplicare
- `ingredientsDB.json`: caricare da `/public/data/`, non modificare manualmente
- Zero `any` impliciti, zero `@ts-ignore`, zero `alert()`/`confirm()`
- Non committare `.env.local`
