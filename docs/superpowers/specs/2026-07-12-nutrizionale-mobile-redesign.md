# AEA — Nutrizionale Mobile Redesign

**Data:** 2026-07-12  
**Scope:** `NutrizionaleCalcMobile.tsx` + `MobileShell.tsx`  
**Stile approvato:** Bold/Branded (B)  
**Navigazione approvata:** Slide orizzontale (B) + tabbar interna sostituisce tabbar app (A)

---

## 1. Problema

L'esperienza mobile attuale non dà feedback positivo all'utente:

- `MobileShell` ha due tab bar in conflitto: quella app (aggiunta per la navigazione globale) e quella interna del tool Nutrizionale (Ricetta/Riepilogo/Mercati/Archivio), entrambe `position: fixed` in fondo.
- La navigazione tra sezioni è scroll continuo: nessun feedback visivo di "cambio schermata", nessuna sensazione nativa.
- Lo stile visivo è funzionale ma non dà percezione di strumento professionale.

**Obiettivo verificabile:** un cliente che usa il tool Nutrizionale su telefono non sente il bisogno di aprire il desktop per finire il lavoro.

---

## 2. Decisioni di design

| Decisione | Scelta |
|---|---|
| Conflitto tab bar | Dentro un tool, tabbar app sparisce. Resta solo la tabbar interna del tool. |
| Navigazione sezioni | Slide orizzontale con `transform: translateX` (pattern nativo) |
| Stile visivo | Bold/Branded: navy + orange più presente, card con accent, CTA bold |
| Scope implementazione | Solo tool Nutrizionale — pattern replicabile sugli altri tool in futuro |

---

## 3. Architettura

### 3.1 MobileShell — hide tabbar dentro i tool

`AppShell` passa `insideTool: boolean` a `MobileShell` basandosi su `location.pathname.startsWith('/tool/')`.

Quando `insideTool = true`:
- La tabbar app **non viene renderizzata**
- Il pulsante `‹ AEA` nella topbar porta a `/dashboard`
- Il padding-bottom di `m-page` si azzera (non c'è tabbar da evitare)

Quando `insideTool = false` (dashboard, risorse):
- La tabbar app è visibile normalmente

### 3.2 NutrizionaleCalcMobile — slide container

**Rimuovere:**
- `m-scroll-container` con 4 `m-section-anchor` affiancate verticalmente
- `IntersectionObserver` (non serve più)
- `sectionRefs` e `goToSection` via `scrollIntoView`

**Sostituire con:**
```
<div class="slide-container">          // overflow: hidden, position: relative
  <div class="slide-track">            // display: flex, transition: transform 0.28s cubic-bezier(0.4,0,0.2,1)
    <div class="slide-panel">CalcoloTab</div>
    <div class="slide-panel">RiepilogoTab</div>
    <div class="slide-panel">TabellaTab</div>
    <div class="slide-panel">ArchivioTab</div>
  </div>
</div>
```

`slide-track` width: 400%, ogni `slide-panel` width: 25%.  
Cambio tab → `transform: translateX(-N * 25%)`.

**State:** `activeTab: MobileTab` (tipo stringa esistente, invariato).  
L'indice per `translateX` si calcola con `TAB_ORDER.indexOf(activeTab)` dove `TAB_ORDER = ['ricetta','riepilogo','mercati','archivio']`.

I 4 sub-componenti (`CalcoloTab`, `RiepilogoTab`, `TabellaTab`, `ArchivioTab`) restano **invariati** nella loro API — cambia solo il container.

### 3.3 Tabbar interna — nuova struttura

La tabbar interna del Nutrizionale rimane nella stessa posizione (`position: fixed; bottom: 0`) ma viene restyled con il nuovo design.

Non usa più `<button>` anonimi ma la stessa struttura `.m-tabbar__item` esistente in `mobile.css` — con override visivo tramite nuove classi o variabili CSS inline.

---

## 4. Design visivo

### Token già disponibili in `mobile.css` (da usare, non ridefinire)
```
--m-navy:         #0c1326
--m-orange:       #ff7e2e
--m-bg:           #faf7f4
--m-surface:      #ffffff
--m-border:       #e8e0d8
--m-text:         #0c1326
--m-text-muted:   rgba(12,19,38,0.45)
```

### Nuove classi CSS (da aggiungere in `mobile.css`)

**Topbar Bold:**
```css
.m-topbar--tool        /* gradient 135deg da #0c1326 a #111d35 */
.m-topbar__back        /* color: var(--m-orange), font-weight: 800, con ‹ prefix */
.m-topbar__center      /* text-align: center */
.m-topbar__sub         /* color: rgba(255,126,46,0.6), font-size: 9px */
```

**Inner tab bar (sezioni tool):**
```css
.m-inner-tabs          /* display: flex, background: var(--m-navy) */
.m-inner-tab           /* flex: 1, color: rgba(255,255,255,0.3), uppercase */
.m-inner-tab--active   /* color: var(--m-orange), ::after underline arancio */
```

**Slide container:**
```css
.m-slide-container     /* overflow: hidden, height: calc(100dvh - topbar - inner-tabs - tabbar) */
.m-slide-track         /* display: flex, width: 400%, transition: transform 0.28s */
.m-slide-panel         /* width: 25%, overflow-y: auto */
```

**Componenti Bold/Branded:**
```css
.m-product-header      /* border-left: 3px solid var(--m-orange), box-shadow sottile */
.m-ing-row             /* card bianca con dot arancio a sinistra */
.m-energy-strip        /* gradient arancio, energia in evidenza */
.m-nut-card            /* card nutrienti con header navy */
.m-dot-indicator       /* dot row in fondo allo slide */
```

### Schermate approvate

**Tab Ricetta:**
- Header prodotto (nome + peso finito) con accent border arancio sinistro
- Lista ingredienti: card bianche con dot arancio, grammi in monospace arancio
- CTA bar sticky: "CALCOLA VALORI" (navy/arancio) + "Salva" (arancio)

**Tab Riepilogo:**
- Energy strip arancio full-width con kcal grande
- Card macronutrienti con header navy, valori proteine in arancio
- Fibre, sale, micronutrienti in card secondaria

**Tab Mercati:**
- Chip bar nazioni scrollabile orizzontalmente (UE selezionata di default)
- Tabella scalata con header navy, righe alternate
- Bottoni "Salva [NAZIONE]" + "PDF"

**Tab Archivio:**
- Lista prodotti salvati: badge colorato per nazione, nome, data
- Swipe-to-delete o context menu su long press (già esistente)

---

## 5. Cosa NON cambia

- I 4 sub-componenti in `mobile/` (`CalcoloTab`, `RiepilogoTab`, `TabellaTab`, `ArchivioTab`) — API invariata
- Tutta la logica di calcolo (`calcNutrients`, engine, bridge desktop→mobile)
- Autosave, archivio, SmartImport
- Il design degli altri 6 tool — questo redesign è pattern, non obbligatorio ora
- `index.css` — nessuna modifica

---

## 6. File da modificare

| File | Tipo modifica |
|---|---|
| `src/components/MobileShell.tsx` | Aggiunge prop `insideTool`, condiziona rendering tabbar |
| `src/components/AppShell.tsx` | Passa `insideTool` a `MobileShell` |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` | Sostituisce scroll con slide container, ridisegna topbar e tabbar interna |
| `src/styles/mobile.css` | Aggiunge nuove classi Bold/Branded |

**Non toccare:** engine, logic, sub-componenti mobile, altri tool.

---

## 7. Checklist di accettazione

- [ ] Su iPhone (reale o DevTools 390px), le 4 tab slittano orizzontalmente senza scroll verticale residuo
- [ ] La tabbar app non è visibile dentro `/tool/nutrizionale`
- [ ] Il pulsante `‹ AEA` porta a `/dashboard`
- [ ] La tabbar app torna visibile su `/dashboard` e `/risorse`
- [ ] `npm run build` verde (zero errori TS)
- [ ] Autosave e archivio continuano a funzionare dopo il refactor
