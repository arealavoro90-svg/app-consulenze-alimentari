# AEA Motion System
**Portale AEA Consulenze Alimentari — Motion Design Spec v1.0**
*React 19 + TypeScript + Vite — CSS-only, no motion libraries*

---

## 1. Principi

### P1 — Motion conveys state, not decoration
Ogni animazione deve comunicare un cambiamento di stato dell'interfaccia (loading, success, error, expansion, transition). Se rimuovendo l'animazione l'utente non perde informazioni contestuali, va eliminata.

### P2 — Speed respects professional context
I consulenti alimentari lavorano sotto pressione temporale. Le interazioni frequenti (inserimento ingredienti, switching tab, calcoli) usano durate brevi (80–150ms). Le animazioni di entrata e modal usano durate più lunghe (250–500ms) perché avvengono meno spesso e portano contesto visivo importante.

### P3 — Transform and opacity only
Solo `transform` e `opacity` attivano il compositor thread del browser, garantendo 60fps senza layout reflow. Nessuna animazione deve modificare `width`, `height`, `top`, `left`, `margin`, `padding` in modo animato.

### P4 — Accessibility is non-negotiable
`@media (prefers-reduced-motion: reduce)` viene gestito in modo granulare: si disabilitano le animazioni di entrata decorative, si mantengono le transizioni di stato (ridotte a quasi-zero) per preservare l'indicazione di cambiamento per utenti con disabilità cognitive che beneficiano del feedback visivo.

### P5 — Consistent easing language
Ogni tipo di interazione usa sempre la stessa curva di easing. Gli elementi che appaiono usano `ease-out` (decelerano verso la posizione finale, senso di "atterraggio"). Gli elementi che spariscono usano `ease-in` (accelerano verso l'uscita, senso di "via"). Le transizioni bidirezionali usano `ease-in-out`.

---

## 2. Timing Scale

| Token | Valore | Use case |
|-------|--------|----------|
| `--dur-instant` | 80ms | Microinterazioni tattili: button press/active state, checkbox click, hover su icone sidebar. Deve sembrare immediato. |
| `--dur-fast` | 150ms | Transizioni frequenti: sidebar flyout open/close, tab bar icon color change, form input focus ring, ingredient row add, tooltip appear/disappear. |
| `--dur-normal` | 250ms | Transizioni di contenuto: tab indicator sliding, modal overlay fade, progress bar update dopo calcolo, error shake. Percepibile ma non invasivo. |
| `--dur-slow` | 400ms | Animazioni di significato: count-up valori nutrizionali, progress bar fill iniziale, cambio di sezione principale. Durata sufficiente per essere letta. |
| `--dur-entrance` | 500ms | Entrate di pagina/tool cards stagger, modal content scale-up. Solo per elementi che entrano nella viewport per la prima volta o dopo navigazione. |

**Regola generale:** nessuna animazione interattiva supera 250ms. Le animazioni oltre 400ms sono riservate a feedback post-azione (es. dopo aver premuto "Calcola").

---

## 3. Easing Curves

| Token | Valore bezier | Quando usarla |
|-------|---------------|---------------|
| `--ease-out-quart` | `cubic-bezier(0.25, 1, 0.5, 1)` | **Default per entrate e hover.** Elementi che appaiono o si posizionano. Partenza veloce, rallentamento pulito. Usata per flyout, tooltip, fade-in utilities. |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | **Entrate enfatiche.** Modal content scale-up, notifiche di successo. Accelerazione iniziale molto marcata, settling molto morbido — senso di "snap" professionale. |
| `--ease-in-quart` | `cubic-bezier(0.5, 0, 0.75, 0)` | **Uscite.** Elementi che lasciano il viewport (modal close, flyout hide). Accelerano verso l'uscita. |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | **Transizioni continue.** Tab indicator che scorre da un tab all'altro, split panel divider drag, progress bar. Elementi che vanno da A a B senza entrare né uscire dallo schermo. |

**Nota:** nessuna curva bounce o elastica. Il portale è uno strumento professionale, non un'app consumer.

---

## 4. Inventario Animazioni

### 4.1 Sidebar Flyout (Desktop)

| Parametro | Valore |
|-----------|--------|
| **Trigger** | `mouseenter` sul rail icon / `mouseleave` |
| **Proprietà animate** | `opacity`, `transform: translateX()`, `visibility` |
| **Duration** | `--dur-fast` (150ms) |
| **Easing** | `--ease-out-quart` (entrata), immediato (uscita) |
| **Note** | `transform-origin: left center`. Visibility usata per accessibilità (hidden = non raggiungibile da screen reader). Il flyout non oscilla: appare da sinistra con offset -8px, si posiziona a 0. |

### 4.2 Tab Indicator (Desktop — Mercati UE/USA/Canada/Australia/Arabi)

| Parametro | Valore |
|-----------|--------|
| **Trigger** | Click su tab button |
| **Proprietà animate** | `left`, `width` (entrambe via JS che imposta CSS custom property) |
| **Duration** | `--dur-normal` (250ms) |
| **Easing** | `--ease-out-quart` |
| **Note** | La barra arancione sotto i tab si sposta orizzontalmente. `left` e `width` vengono calcolati in JS (`getBoundingClientRect`) e applicati come inline style. Usare `will-change: left, width` solo durante la transizione, poi rimuoverlo. |

### 4.3 Tab Switching (Mobile — Ricetta/Riepilogo/Mercati/Archivio)

| Parametro | Valore |
|-----------|--------|
| **Trigger** | Tap su bottom tab bar |
| **Proprietà animate** | Icon color (`--m-orange` / muted), dot `transform: scale()`, dot `background` |
| **Duration** | `--dur-fast` (150ms) |
| **Easing** | `ease` |
| **Note** | Il contenuto della pagina fa un semplice fade (opacity). NO slide orizzontale tra pagine mobile: troppo costoso su dispositivi mid-range e confusivo con i tab verticali. |

### 4.4 Ingredient Row — Add

| Parametro | Valore |
|-----------|--------|
| **Trigger** | Aggiunta ingrediente alla lista |
| **Proprietà animate** | `opacity` (0→1), `transform: translateY(-4px→0)` |
| **Duration** | `--dur-fast` (150ms) |
| **Easing** | `--ease-out-quart` |
| **Note** | `animation: slideDown` con `animation-fill-mode: backwards`. Solo la nuova riga si anima: usare classe CSS aggiunta via JS, non stagger. |

### 4.5 Ingredient Row — Remove

| Parametro | Valore |
|-----------|--------|
| **Trigger** | Click su pulsante rimozione ingrediente |
| **Proprietà animate** | `opacity` (1→0) |
| **Duration** | `--dur-fast` (150ms) |
| **Easing** | `ease` |
| **Note** | Classe `.removing` aggiunta via JS. `pointer-events: none` durante l'animazione. Rimozione dal DOM dopo `animationend`. NO `height` collapse: evita layout shift. |

### 4.6 Calcola Button — Click

| Parametro | Valore |
|-----------|--------|
| **Trigger** | `mousedown` / `touchstart` |
| **Proprietà animate** | `transform: scale(0.97)` |
| **Duration** | `--dur-instant` (80ms) |
| **Easing** | `ease` |
| **Note** | Feedback tattile immediato. Nessuna animazione di "loading spinner" inline: se il calcolo è sincrono (JS puro) non serve. |

### 4.7 Calcola Button — Success

| Parametro | Valore |
|-----------|--------|
| **Trigger** | Calcolo completato con successo |
| **Proprietà animate** | `background-color` → verde, `color` → bianco |
| **Duration** | `--dur-fast` (150ms) → ritorno dopo 1.5s con `--dur-slow` (400ms) |
| **Easing** | `ease` |
| **Note** | Classe `.btn--success` aggiunta via JS, rimossa con `setTimeout(1500)`. `successFlash` keyframe per brevissimo lampo bianco al momento del successo. |

### 4.8 Nutritional Value Count-Up

| Parametro | Valore |
|-----------|--------|
| **Trigger** | Dopo completamento calcolo (post-success del button) |
| **Proprietà animate** | `textContent` aggiornato via `requestAnimationFrame` |
| **Duration** | `--dur-slow` (400ms) |
| **Easing** | `easeOutQuart` (implementata in JS: `t => 1 - Math.pow(1-t, 4)`) |
| **Note** | Non è CSS: è JS vanilla (`animateValue` utility). Agisce su tutti gli elementi `.nutrient-value` nella tabella. Partenza dal valore precedente (o 0 al primo calcolo). |

### 4.9 Split Panel Divider (Desktop)

| Parametro | Valore |
|-----------|--------|
| **Trigger** | `mouseenter` / `mouseleave` sul divider |
| **Proprietà animate** | `background`, `box-shadow` |
| **Duration** | `--dur-fast` (150ms) |
| **Easing** | `ease` |
| **Note** | Il drag del divider NON usa animazioni CSS: il resize è immediato via JS `mousemove`. Solo hover state ha transizione. |

### 4.10 Modal Open/Close

| Parametro | Valore |
|-----------|--------|
| **Trigger** | Apertura/chiusura dialog (es. dettaglio ingrediente, export) |
| **Proprietà animate** | Overlay: `opacity`. Content: `opacity` + `transform: translateY(20px) scale(0.98)` |
| **Duration** | Apertura: `--dur-normal` (250ms) per content, `--dur-fast` per overlay. Chiusura: `--dur-fast` (150ms) totale. |
| **Easing** | Apertura: `--ease-out-expo`. Chiusura: `ease` |
| **Note** | La chiusura è sempre più rapida dell'apertura. `pointer-events: none` sull'overlay quando non aperto. Usare `dialog` HTML element nativo quando possibile. |

### 4.11 Tool Cards Stagger (Dashboard)

| Parametro | Valore |
|-----------|--------|
| **Trigger** | Mount del componente dashboard / prima visualizzazione |
| **Proprietà animate** | `opacity` (0→1), `transform: translateY(8px→0)` |
| **Duration** | `--dur-entrance` (500ms) per la prima card |
| **Easing** | `--ease-out-quart` |
| **Note** | `.stagger-children` + delay progressivo da 0 a 280ms (8 livelli × 40ms). Solo al primo mount: dopo navigazione back non si rianima. Usare `sessionStorage` flag. |

### 4.12 Progress Bar (Valori nutrizionali vs. RDA)

| Parametro | Valore |
|-----------|--------|
| **Trigger** | Aggiornamento valore nutrizionale dopo calcolo |
| **Proprietà animate** | `width` della `.progress-fill` (via JS che imposta inline style) |
| **Duration** | `--dur-normal` (250ms) |
| **Easing** | `--ease-out-quart` |
| **Note** | `background-color` cambia da verde (ok) a rosso (over RDA) con `--dur-fast`. La larghezza è cappata al 100% visivamente ma il dato numerico può superarlo. |

---

## 5. Anti-Pattern — Cosa NON Animare

**Animare `height` o `width` per collapse/expand:**
Causa layout reflow su tutto il DOM. Alternativa: `clip-path` o `transform: scaleY()` con `transform-origin: top`.

**Animare colori di testo durante la digitazione:**
L'utente sta già processando input cognitivo. Cambiamenti cromatici in tempo reale durante `keydown` sono distrazione pura.

**Spinner di loading per calcoli sincroni:**
Se il calcolo JS termina in <16ms (un frame), mostrare e nascondere uno spinner peggiora la UX — l'utente vede solo un flash confusivo.

**Animare righe della tabella nutrizionale al re-render:**
La tabella può avere 40+ celle. Animare ogni aggiornamento crea visual noise e degrada le performance su mobile mid-range.

**Loop di animazione su elementi informativi:**
`pulseGlow` e animazioni loop vanno usate solo su stati di sistema (es. loading globale), mai su dati statici.

**Transition su `transform` del divider durante il drag:**
Durante il resize attivo del split panel, qualsiasi `transition` sulla `transform` introduce lag percepibile. Rimuovere la transizione via classe JS durante `mousedown`, ripristinarla a `mouseup`.

**Stagger su liste con >12 elementi:**
Con molti ingredienti, lo stagger risulta in code vizibili e UX lenta. Massimo 8 elementi staggerati; oltre, tutti appaiono insieme.

**Animare `z-index`:**
Non è animabile dal compositor. Cambiamenti di z-index sono sempre istantanei.

---

## 6. Strategia `prefers-reduced-motion`

### Approccio granulare (non wildcard)

Il progetto NON usa:
```css
/* VIETATO */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

Questo approccio wildcard rimuove anche i feedback visivi utili per utenti con disabilità cognitive (es. il cambio di colore del button quando si clicca).

### Approccio adottato

**Tier 1 — Animazioni decorative/entrata:** disabilitate completamente.
Esempi: `fadeIn`, `fadeUp`, `slideInRight`, `stagger-children`, `ingredient-row` (solo entrata), `tool-card` (animazione di mount).

**Tier 2 — Transizioni di stato:** ridotte a `0.01ms` (quasi-zero), non rimosse.
Motivazione: una transizione da 150ms a 0.01ms è impercettibile come movimento, ma il cambio di stato (colore, opacità) avviene comunque, fornendo feedback. Screen reader e utenti sensibili al movimento sono soddisfatti.

**Tier 3 — Count-up JS:** interrotto, il valore finale viene mostrato direttamente.
La funzione `animateValue` deve controllare `window.matchMedia('(prefers-reduced-motion: reduce)').matches` e in caso positivo settare `el.textContent` direttamente senza RAF loop.

### Implementazione

```typescript
// hooks/useReducedMotion.ts
export function useReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

```typescript
// engines/animateValue.ts
export function animateValue(
  el: HTMLElement,
  from: number,
  to: number,
  duration = 400
): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = to.toFixed(1);
    return;
  }
  const start = performance.now();
  const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
  const tick = (now: number) => {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = (from + (to - from) * easeOutQuart(t)).toFixed(1);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
```

---

## 7. Checklist Performance

- [ ] Nessuna animazione usa proprietà che causano layout: `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`
- [ ] `will-change: transform, opacity` applicato solo durante animazioni attive, rimosso dopo
- [ ] Animazioni su liste cappate a 8 elementi per stagger
- [ ] `@keyframes` testati a 60fps su Chrome DevTools Performance panel (no frame drops)
- [ ] `prefers-reduced-motion` verificato su macOS: Impostazioni di Sistema → Accessibilità → Display → Riduci movimento
- [ ] Count-up JS testato con `performance.mark()` — deve completare in <5ms la prima frame
- [ ] Modal testato con Lighthouse: nessun CLS (Cumulative Layout Shift) durante apertura
