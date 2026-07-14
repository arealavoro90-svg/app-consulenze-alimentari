---
name: add-tool
description: Pattern obbligatorio per aggiungere un nuovo strumento/calcolatore all'app AEA. Usare quando si crea un nuovo tool, una nuova route protetta o una nuova voce nel catalogo strumenti.
---

# Aggiungere un nuovo strumento — AEA

Tre file obbligatori, sempre nello stesso ordine. Saltarne uno = tool invisibile o route non protetta.

## 1. `src/data/mockUsers.ts`
- Aggiungere il nuovo `ToolId` al type.
- Aggiungere la voce in `TOOLS_CATALOG` (nome, descrizione, icona).
- Assegnare il tool agli utenti demo che devono vederlo.

## 2. `src/App.tsx`
- Aggiungere la `Route` avvolta in `ProtectedRoute` con `requiredTool={<toolId>}`.
- Lazy-load del componente calcolatore se gli altri tool fanno lo stesso (verificare il pattern esistente).

## 3. `src/components/Sidebar.tsx`
- Verificare che la nav includa il nuovo tool (di norma deriva da TOOLS_CATALOG — controllare che compaia davvero).

## Struttura del calcolatore
- Directory dedicata: `src/calculators/<NomeCalc>/` (seguire lo stile dei 7 esistenti).
- Logica di calcolo in `src/engines/` (mai dentro i componenti).
- Validazione input: `src/utils/validation.ts` — non duplicare.
- Se il tool ha logiche da file Excel di riferimento, replicarle fedelmente e citare il file nei commenti di modulo.

## Checklist finale
- [ ] `npx tsc -b` pulito
- [ ] `npm run lint` pulito
- [ ] Login demo → tool visibile in Sidebar → route raggiungibile → utente senza permesso viene bloccato
- [ ] Proporre deploy preview Vercel (regola CLAUDE.md)
