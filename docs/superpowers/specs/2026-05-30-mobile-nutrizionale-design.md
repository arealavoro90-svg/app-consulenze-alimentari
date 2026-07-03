# Design Spec — Interfaccia Mobile NutrizionaleCalc

**Data:** 2026-05-30  
**Scope:** Redesign interfaccia mobile per NutrizionaleCalc (tool prioritario)  
**Approccio:** MobileShell separato, desktop invariato  

---

## Contesto

L'app desktop AEA (React 19 + Vite, CSS custom) è usata principalmente su desktop. Su mobile è scarsamente utilizzabile. L'obiettivo è creare un'interfaccia mobile **completamente separata**, non un adattamento responsive di quella esistente.

Uso primario mobile: **inserimento dati attivo** (campo, laboratorio). Utenza esperta — nessuna modalità Guidato su mobile.

---

## Architettura

### Strategia: MobileShell separato

`AppShell.tsx` rileva il viewport (< 768px) e renderizza `MobileShell` al posto della Sidebar + topbar desktop. Gli engine (`nutritionalEngine.ts`, `localizationModule.ts`), gli hook (`useArchive`, `useSavedTables`, `useLocalStorage`) e la logica PDF restano invariati e condivisi.

```
AppShell.tsx
  ├── viewport >= 768px → layout esistente (Sidebar + topbar + Outlet)
  └── viewport < 768px  → MobileShell

MobileShell.tsx
  ├── MobileTopbar.tsx   (barra compatta navy: titolo + avatar utente)
  └── Outlet             (contenuto pagina)

NutrizionaleCalcMobile.tsx   ← nuova vista mobile del calcolatore
  ├── MobileBottomTabBar.tsx
  ├── CalcoloTab.tsx
  ├── TabellaTab.tsx
  ├── ArchivioTab.tsx
  └── ToolsTab.tsx
```

### Hook di rilevamento viewport

Nuovo hook `useMobile.ts`:
```ts
// restituisce true se window.innerWidth < 768
// usa ResizeObserver, cleanup su unmount
```

### Routing

Nessun cambio al routing. `AppShell` decide quale shell renderizzare in base al viewport. La route `/tool/nutrizionale` renderizza `NutrizionaleCalcMobile` su mobile, `NutrizionaleCalc` su desktop.

---

## Design System Mobile

### Palette

| Token | Valore | Uso |
|---|---|---|
| `--m-bg` | `#faf7f4` | Sfondo app (avorio caldo) |
| `--m-surface` | `#ffffff` | Card, input, tab bar |
| `--m-navy` | `#0c1326` | Header, topbar, icone primary |
| `--m-orange` | `#ff7e2e` | Accent, tab attivo, CTA |
| `--m-border` | `#e8e0d8` | Bordi card e separatori |
| `--m-text` | `#0c1326` | Testo principale |
| `--m-text-muted` | `rgba(12,19,38,0.45)` | Label, placeholder |
| `--m-green` | `#43821c` | Bottone Salva/PDF |

### Tipografia

- Titoli/label: **Outfit** (Google Fonts, già caricato o da aggiungere)
- Body: `system-ui`
- Numeri: `font-family: monospace` su tutti i valori nutrizionali

### Touch target

- Tutti gli input: `min-height: 44px`
- `font-size: 16px` su tutti gli `<input>` → previene zoom automatico iOS
- Tab bar height: `64px` (con safe area bottom via `env(safe-area-inset-bottom)`)

---

## Componenti

### MobileShell

- Header navy fisso (52px): logo AEA sinistra, avatar utente destra
- `min-height: 100dvh` (non `h-screen` — fix iOS Safari)
- Outlet con `padding-bottom: 64px` per non coprire il tab bar

### MobileBottomTabBar

- Posizione: `position: fixed; bottom: 0`
- Safe area: `padding-bottom: env(safe-area-inset-bottom)`
- Background `#ffffff`, border-top `1.5px solid #e8e0d8`
- 4 tab: Calcolo / Tabella / Archivio / Tools
- Tab attivo: dot arancio `#ff7e2e` + label arancio bold
- Tab inattivo: label grigia `rgba(12,19,38,0.35)`

### Tab 1 — Calcolo

Tutti i campi nutrizionali esposti direttamente (modalità Esperto, nessun wizard).

**Struttura:**
1. Barra ricerca DB ingredienti (cima, full width)
2. Sezione **PRODOTTO**: denominazione (input text), porzione (input number + unità)
3. Sezione **ENERGIA**: kcal + kJ (grid 2 colonne)
4. Sezione **MACRO**: grassi tot / saturi / carboidrati / zuccheri / proteine / sale (lista con indent per sub-voci)
5. Sezione **MICRO** (opzionale, collassata di default): fibre, vitamine, minerali

Ogni sezione ha un divisore con label uppercase. Le sezioni Macro e Micro sono collassabili (stato locale).

Il campo denominazione è il focus primario: ha `border: 1.5px solid #ff7e2e` quando attivo.

**Non presente su mobile:** toggle Guidato/Esperto, split panel, anteprima tabella inline.

### Tab 2 — Tabella

**Stato iniziale (nessuna regione selezionata):**
- Griglia 2 colonne × 2.5 righe con le 5 regioni
- Ogni tile: sigla grande (EU / USA / CA / AU / AR), nome standard sotto
- Colori badge per regione: EU navy, USA blu scuro `#1a3a6b`, CA verde `#43821c`, AU marrone `#b05a1a`, AR bordeaux `#6b1a1a`
- Tile selezionata: bordo arancio `1.5px` + dot indicatore

**Stato regione selezionata:**
- Preview tabella nutrizionale nel formato scelto (componente `TabUE`, `TabUSA`, ecc. esistenti, wrappati in scroll orizzontale se necessario)
- Bottoni sticky in fondo: **SALVA** (navy/arancio) + **PDF ↗** (verde)
- Possibile cambiare regione toccando un'altra tile (i dati restano)

### Tab 3 — Archivio

- Barra ricerca full width
- Lista voci: badge regione colorato (28×28px, border-radius 7px) + nome prodotto + data + kcal
- Tap su voce → apre il calcolo completo (ricarica Tab 1 con i dati salvati)
- Long press su voce → menu contestuale (Apri / Elimina). Nessuno swipe gesture — troppo complesso senza librerie.
- Stato vuoto: messaggio "Nessun calcolo salvato ancora" con CTA verso Tab 1

### Tab 4 — Tools

- Griglia 2 colonne, 7 tile (ultima riga con tile centrata o full-width)
- Ogni tile: icona colorata (colore univoco per tool) + nome breve su 2 righe
- Tool attivo (NutrizionaleCalc): background navy + badge "ATTIVO" arancio
- Tap → naviga alla rotta del tool (`/tool/<id>`)
- I tool non assegnati all'utente sono disabilitati (opacity 0.4, non cliccabili)

---

## Comportamenti

### Persistenza stato tab

Lo stato del tab attivo è mantenuto in `useState` locale a `NutrizionaleCalcMobile`. Navigare su Tab 4 e tornare non perde il calcolo in corso.

### Tastiera virtuale

Quando la tastiera virtuale è aperta su mobile, il Bottom Tab Bar resta visibile (non viene schiacciato). Il campo attivo scrolla in view automaticamente (`scrollIntoView` con `behavior: smooth`).

### Orientamento landscape

Su landscape mobile (< 768px altezza): il layout compresso rimane funzionale. Non viene bloccato l'orientamento.

---

## Cosa NON cambia

- Engine: `nutritionalEngine.ts`, `thermalEngine.ts`, `localizationModule.ts`
- Hook: `useArchive`, `useSavedTables`, `useLocalStorage`
- Routing: nessuna nuova rotta, nessun redirect
- Auth: `AuthContext`, `ProtectedRoute` — invariati
- Desktop: `AppShell`, `Sidebar`, tutti i calcolatori desktop — invariati
- Componenti tabella: `TabUE.tsx`, `TabUSA.tsx` — riusati dentro `TabellaTab`

---

## Fuori scope (per ora)

- Interfaccia mobile per gli altri 6 calcolatori
- Animazioni/transizioni (nessun Framer Motion — CSS transitions semplici)
- Swipe gesture avanzate
- PWA / offline support
- Dark mode mobile

---

## File da creare

| File | Descrizione |
|---|---|
| `src/hooks/useMobile.ts` | Hook viewport detection (< 768px) |
| `src/components/MobileShell.tsx` | Shell mobile con topbar |
| `src/components/MobileTopbar.tsx` | Header compatto navy |
| `src/components/MobileBottomTabBar.tsx` | Tab bar fissa |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` | Vista mobile principale |
| `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx` | Tab inserimento dati |
| `src/calculators/NutrizionaleCalc/mobile/TabellaTab.tsx` | Tab selezione regione + preview |
| `src/calculators/NutrizionaleCalc/mobile/ArchivioTab.tsx` | Tab archivio calcoli |
| `src/calculators/NutrizionaleCalc/mobile/ToolsTab.tsx` | Tab navigazione strumenti |
| `src/styles/mobile.css` | Token CSS mobile + override responsive |

## File da modificare

| File | Modifica |
|---|---|
| `src/components/AppShell.tsx` | Aggiungere rilevamento viewport + renderizzare MobileShell |
| `src/App.tsx` | Nessuna modifica alle rotte, ma verificare che NutrizionaleCalcMobile venga caricato correttamente |
