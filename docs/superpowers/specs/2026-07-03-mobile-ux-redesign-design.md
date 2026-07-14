# Mobile UX Redesign — Tabelle Nutrizionali
**Data:** 2026-07-03  
**Scope:** `NutrizionaleCalcMobile.tsx` + file in `mobile/` + `src/styles/mobile.css`  
**Stato:** Approvato dall'utente — pronto per implementazione

---

## Contesto

La versione mobile del calcolatore nutrizionale AEA è **funzionalmente completa** (feature parity con il desktop verificata da audit). Il problema è la **qualità UX**: touch target troppo piccoli, controlli nascosti, preview tabelle non leggibili su schermi ≤390px.

Il desktop rimane invariato (Vista Avanzata + SplitShell). Questo redesign è **mobile-only**.

---

## Decisioni di design approvate

### 1. Struttura navigazione: chip bar per mercati (nessun wizard)

Il tab "Mercati" (`TabellaTab.tsx`) mantiene la chip bar orizzontale per selezionare la regione (EU / USA / CA / AU / AR). Nessun wizard step-by-step: l'utente vuole accedere a qualsiasi mercato in qualsiasi momento.

**Miglioramenti richiesti:**
- Chip bar **sticky** (top: 0, z-index elevato) — sempre visibile durante lo scroll
- Touch target minimo **44px di altezza** per ogni chip (attuale: ~28px)
- Chip attivo con colore pieno, non solo bordo

### 2. Layout interno di ogni regione

Ordine verticale fisso per ogni pannello regione:

```
1. [Sezione: Porzioni]       ← input serving sizes, collassabile, aperta di default
2. [Sezione: Controlli]      ← layout V/O/L + serving ref + misura
3. [Sezione: Tabella]        ← preview scalata + bottone fullscreen
4. [Sezione: Allergeni]      ← (se presenti, invariato)
5. [CTA sticky bottom]       ← Salva | PDF ↗
```

### 3. Input porzioni — redesign

**Attuale:** `SField` con `minWidth: 80px`, label a 10px, input compresso  
**Nuovo:** Grid a 2-3 colonne con label leggibili (12px), input touch-friendly (min-height 44px)

Ogni regione ha i propri input mostrati in una griglia:
- EU: Porzione (g) · Confezione (g) · Pezzo (g)
- USA/CA/Arabi: Serving · Conf · Cup · Cucchiaio · Pezzo → **5 campi in 2 righe** (prima riga: 3 campi, seconda: 2)
- AU: Serving · Conf · Pezzo

### 4. Controlli layout — redesign

**Attuale:** 3 righe di pill a 11px con padding 3px — touch target ~24px, difficili da toccare  
**Nuovo:** Segmented control a **44px di altezza**, font 13px bold

Per USA/Canada: 3 segmented control separati con label chiara sopra:
- "Layout" → [Verticale] [Orizzontale] [Lineare]
- "Riferimento" → [Porzione] [Confezione]  
- "Unità" → [g] [Tazze] [Cucchiai] [Pezzi]

Ogni segmented control è una riga distinta con titolo, non pill mescolate.

### 5. Preview tabella — approccio ibrido scale + fullscreen

**Problema principale: le tabelle orizzontali** (USA orizzontale, Canada orizzontale) hanno colonne affiancate che superano 375px.

**Soluzione delegata all'implementer con questi criteri:**

```
Default (preview in-page):
  - Contenitore: overflow-x: auto, -webkit-overflow-scrolling: touch
  - La tabella viene scalata: transform: scale(0.82), transform-origin: top left
  - Il contenitore si allarga di conseguenza: width = tabella_width * 0.82
  - Indicatore visivo "← scorri →" se la tabella supera lo schermo dopo lo scale

Fullscreen (tap su bottone "↔ Espandi" o "🔍"):
  - Overlay position: fixed, inset: 0, background: white, z-index: 100
  - Tabella a dimensione originale (nessun scale) dentro un div: overflow: auto
  - Pinch-zoom nativo (touch-action: pan-x pan-y, nessun blocco)
  - Bottone × per chiudere
```

**Priorità per tipo di tabella:**
- EU verticale → si adatta bene, scale leggero (0.9) sufficiente
- USA verticale → scale 0.85
- USA/Canada orizzontale → caso critico: scale 0.75 + scroll-x + fullscreen prominente
- Canada verticale → bilingue EN|FR, larga: scale 0.78
- Australia, Arabi → scale 0.85

L'implementer deve testare ogni caso e calibrare il valore di scale per ogni regione/layout.

### 6. CTA — sticky bottom

**Attuale:** bottoni `Salva` e `PDF ↗` in fondo alla pagina, scrollabili fuori schermo  
**Nuovo:** barra sticky `position: fixed; bottom: calc(var(--m-tabbar-h) + env(safe-area-inset-bottom))` sempre visibile sopra la tab bar

Contenuto barra CTA:
```
[  Salva in archivio  ]  [  Esporta PDF ↗  ]
```

### 7. Animazioni — Agente Motion

File base: `src/styles/motion.css` (già esistente)  
**Vincolo:** solo CSS (`@keyframes`, `transition`, `transform`) — nessuna libreria nuova

Animazioni richieste:
- **Cambio chip mercato**: fade-out + slide-left del pannello uscente, fade-in + slide-right del pannello entrante (durata 200ms, `ease-out`)
- **Apertura fullscreen tabella**: slide-up dall'80% + fade-in (durata 250ms)
- **Chiusura fullscreen**: slide-down + fade-out (durata 200ms)
- **Collasso/espansione sezione Porzioni**: max-height transition (300ms ease-in-out)
- **Chip attivo**: background fill animato (150ms ease)
- **Card ingredienti in CalcoloTab**: staggered fade-in all'aggiunta (100ms delay progressivo)

---

## File coinvolti

| File | Tipo modifica |
|------|--------------|
| `src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx` | Refactor completo UI |
| `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx` | Touch target + stagger animation |
| `src/styles/mobile.css` | Segmented control, chip bar sticky, CTA sticky, scale container |
| `src/styles/motion.css` | Tutte le animazioni mobile |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` | Eventuale passaggio key per triggering animazioni |

**File NON coinvolti:** TabUE, TabUSA, TabCanada, TabAustralia, TabArabi, NutrizionaleCalc.tsx (desktop), localizationModule.ts

---

## Regola critica CLAUDE.md applicata

> "Ogni modifica al NutrizionaleCalc DEVE essere applicata a ENTRAMBE le modalità: Wizard e Vista Avanzata."

**Non si applica qui**: questo redesign tocca solo `NutrizionaleCalcMobile.tsx` e i file `mobile/`. Il desktop (`NutrizionaleCalc.tsx`) NON viene modificato.

---

## Vincoli fissi da CLAUDE.md

- Nessun CSS framework esterno
- Nessuna nuova dipendenza npm
- Zero `any` impliciti, zero `@ts-ignore`
- Usare `import type` per tipi puri
- Build: `npm run build` per verifica finale

---

## Criteri di completamento

1. Chip bar sticky con touch target 44px su tutti i 5 mercati
2. Input porzioni leggibili e toccabili senza errori su iPhone SE (375px)
3. Tabelle verticali: visibili senza scroll orizzontale su 375px
4. Tabelle orizzontali: bottone fullscreen funzionante con pinch-zoom
5. CTA Salva/PDF sempre visibile senza scroll
6. Animazioni fluide a 60fps (testare su iPhone con throttling)
7. `npm run build` senza errori TypeScript
