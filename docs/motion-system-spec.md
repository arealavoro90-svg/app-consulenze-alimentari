# AEA Motion System — Specifiche Tecniche
**Versione:** 1.0 — 2026-06-30
**Progetto:** Portale Clienti AEA Consulenze Alimentari
**Stack:** React 19 + TypeScript + Vite, CSS puro (no motion library)

---

## Principi fondamentali

- **Motion comunica stato, non decora.** Ogni animazione deve rispondere alla domanda: "Quale informazione trasmette questo movimento all'utente?" Se la risposta è "nessuna", l'animazione va eliminata.
- **Compositors-only.** Animare esclusivamente `transform` e `opacity`. Mai animare `width`, `height`, `top`, `left`, `padding`, `margin` o qualsiasi proprietà che triggera layout reflow. L'unica eccezione documentata è `progress-fill` su `width`, accettabile perché l'elemento è isolato e piccolo.
- **Velocità percepita > velocità reale.** Le azioni utente (click, tap, hover) rispondono a 80–150ms. Le entrate di nuovi contenuti usano 250ms. Animazioni superiori a 500ms sono riservate esclusivamente ai toast e agli stati di successo post-calcolo.
- **Easing asimmetrico.** Le entrate usano ease-out (partono veloci, decelerano): sembrano immediate. Le uscite usano ease-in (partono lente, accelerano): sembrano intenzionali. Mai `ease-in-out` simmetrico per interazioni UI, solo per transizioni bidirezionali come il tab indicator.
- **Accessibilità come requisito zero.** Il blocco `@media (prefers-reduced-motion: reduce)` è parte del sistema, non un'aggiunta opzionale. Viene scritto in modo chirurgico: disabilita solo le animazioni, mantiene le transizioni di stato di colore a 1ms (quasi impercettibili ma non rotte).

---

## Timing scale

| Token | Valore | Uso |
|---|---|---|
| `--duration-instant` | 80ms | Feedback immediato: button press (`:active`), toggle, checkbox. Deve sembrare sincrono con il gesto fisico. |
| `--duration-fast` | 150ms | La velocità base dell'interfaccia. Hover su tool-card, sidebar-flyout-item, form input focus, rimozione ingredient row, apertura dropdown. |
| `--duration-normal` | 250ms | Cambi di stato significativi: tab indicator slide, modal entry, sidebar flyout open, slideDown nuova riga ingrediente. |
| `--duration-slow` | 400ms | Transizioni di contenuto: page route change, count-up valori nutrizionali, progress bar fill su calcola. |
| `--duration-entrance` | 500ms | Solo per stati di completamento: success flash post-calcolo, toast confirm. Durata massima consentita. |

---

## Easing curves

| Token | Curva bezier | Uso |
|---|---|---|
| `--ease-out-quart` | `cubic-bezier(0.25, 1, 0.5, 1)` | Default per entrate e hover. Risposta immediata percepita. Usare per: sidebar flyout, tool-card hover, modal open, slide-in elementi. |
| `--ease-out-quint` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrate più morbide per elementi grandi o importanti. Usare per: modal content principale, page transition, success state. |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Massima decelerazione. Per elementi che "arrivano" con forza. Usare per: toast/alert entry, error shake (solo l'ultimo frame). |
| `--ease-in-quart` | `cubic-bezier(0.5, 0, 0.75, 0)` | Uscite intenzionali. Usare per: modal dismiss, sidebar flyout close, ingredient row remove (fade-out). |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Transizioni bidirezionali in loop. Usare per: tab indicator slide (va sia a destra che a sinistra), progress fill intermediary. |

**Curve NON ammesse:**
- `ease-in-out` standard del browser (troppo simmetrico, sembra meccanico)
- `bounce` o qualsiasi curva con overshoot (valori >1 o <0 nel bezier) — sembrano datate e distraggono in un tool professionale
- `linear` per qualsiasi transizione utente-facing (accettabile solo per shimmer background-position)

---

## Inventario animazioni per componente

### 1. Sidebar Flyout (desktop, ≥1280px)

**Trigger:** `mouseenter` sulla sidebar rail → aggiunta classe `.open` al `.sidebar-flyout`; `mouseleave` → rimozione `.open`.

| Proprietà animata | Stato iniziale | Stato finale | Duration | Easing |
|---|---|---|---|---|
| `opacity` | `0` | `1` | `--duration-fast` (150ms) | `--ease-out-quart` |
| `transform: translateX(-8px)` | `-8px` | `0` | `--duration-fast` (150ms) | `--ease-out-quart` |

**Uscita:** Stessa durata, ma non serve cambiare easing perché l'utente ha già spostato il mouse — la sparizione deve essere rapida.

**Note:** La transizione attuale (`opacity 0.18s ease, transform 0.18s ease`) è già buona; si aggiorna il valore da `0.18s ease` ai token. Il `translateX(-8px)` crea profondità senza sacrificare spazio. Non usare `width` per il flyout: già corretto con `opacity + transform`.

---

### 2. Tab Bar Indicator (desktop nutrizionale — UE/USA/Canada/Australia/Arabi)

**Trigger:** Click su `.expert-tab-btn` o `.nation-tab-btn` → JS calcola `offsetLeft` e `offsetWidth` del tab attivo e aggiorna `left` e `width` dell'elemento `.tab-indicator`.

| Proprietà animata | Duration | Easing |
|---|---|---|
| `left` (posizione orizzontale) | `--duration-normal` (250ms) | `--ease-in-out` |
| `width` (larghezza del tab) | `--duration-normal` (250ms) | `--ease-in-out` |

**Implementazione:** L'indicatore è un elemento `position: absolute; bottom: 0; height: 2px` che segue il tab attivo. Lo stato attuale usa `border-bottom: 2.5px solid` per tab, che non permette animazione fluida. Il motion system richiede un elemento `.tab-indicator` separato.

**Note:** Usare `--ease-in-out` perché il cursore si muove bidirezionalmente. L'easing simmetrico qui è corretto: percepire la "distanza" percorsa è parte dell'affordance del tab.

---

### 3. Tab Switching (mobile bottom bar)

**Trigger:** Tap su `.m-tabbar__item` → cambio tab attivo.

| Elemento | Proprietà animata | Duration | Easing |
|---|---|---|---|
| `.m-tabbar__icon` color | `color` | `--duration-fast` (150ms) | `ease` |
| `.m-tabbar__label` color | `color` | `--duration-fast` (150ms) | `ease` |
| `.m-tabbar__dot` | `background-color` | `--duration-fast` (150ms) | `ease` |
| Contenuto tab | `opacity` (fade in) | `--duration-normal` (250ms) | `--ease-out-quart` |

**Note:** Su mobile non si usa un sliding indicator ma il sistema dot + colore esistente. Aggiungere un `fadeIn` sul contenuto del tab che entra: evita il cambio brusco tra sezioni molto diverse (es. Ricetta → Archivio).

**Feedback touch:** `.m-tabbar__item:active { opacity: 0.7 }` è già presente — corretto, non modificare. È il feedback tattile immediato.

---

### 4. Ingredient Row — Add / Remove

**Add (entrata):**
| Proprietà animata | Duration | Easing |
|---|---|---|
| `opacity: 0 → 1` | `--duration-fast` (150ms) | `--ease-out-quart` |
| `transform: translateY(-6px) → translateY(0)` | `--duration-fast` (150ms) | `--ease-out-quart` |

Implementazione: aggiungere `animation: slideDown var(--duration-fast) var(--ease-out-quart) backwards` all'elemento `.ingredient-row` e `.ing-card` appena montati nel DOM. La keyword `backwards` assicura che l'elemento parta dallo stato iniziale del keyframe anche prima che l'animazione inizi.

**Remove (uscita):**
| Proprietà animata | Duration | Easing |
|---|---|---|
| `opacity: 1 → 0` | `--duration-fast` (150ms) | `--ease-in-quart` |
| `transform: translateX(8px)` | `--duration-fast` (150ms) | `--ease-in-quart` |

Implementazione JS: aggiungere classe `.removing` → attendere `transitionend` → rimuovere dal DOM. Mai rimuovere dall'array React prima che l'animazione sia completata.

**Note mobile:** Su `.wizard-ing-table tbody tr`, usare `fadeOut` semplice (no translateX) perché le righe della tabella non reggono bene il transform orizzontale in layout grid.

---

### 5. Calcola Button — Click / Loading / Success

**Click (`:active`):**
| Proprietà | Valore |
|---|---|
| `transform` | `scale(0.97)` |
| `duration` | `--duration-instant` (80ms) |

**Loading state** (durante fetch/calcolo):
- Aggiungere attributo `data-state="loading"` al button
- Mostrare uno spinner SVG (rotazione `linear` 800ms) — non usare `@keyframes pulse` sul pulsante intero (troppo distraente)
- `pointer-events: none` durante il loading
- Il background rimane invariato (no dimming che suggerisce "disabilitato permanente")

**Success state** (calcolo completato):
- Classe `.is-success` per 1.5s → poi ritorno allo stato normale
- `background` transita verso `--color-success` in 150ms
- Un checkmark SVG sostituisce il label per 1.5s
- Keyframe `successFlash` su border-color: arancio → verde → arancio

---

### 6. Nutritional Values — Count-up su Calcola

**Trigger:** Completamento calcolo → aggiornamento dei valori nella tabella nutrizionale destra.

**Tecnica:** Non è un'animazione CSS ma una utility JS (`animateValue`). I valori nelle celle della tabella vengono interpolati numericamente da `0` (o dal valore precedente) al nuovo valore, usando `easeOutQuart` implementata in JS, su `--duration-slow` (400ms).

**Proprietà CSS coinvolte:** Solo `color` sui valori — durante il count-up i numeri prendono temporaneamente `color: var(--color-orange)` per 600ms, poi tornano al colore normale con `transition: color 300ms ease`.

**Note:** Non usare `@keyframes` per questo. Il count-up con `requestAnimationFrame` permette di formattare i numeri correttamente (`.toFixed(1)`, gestire i decimali regionali). Vedere snippet JS allegato.

---

### 7. Split Panel Divider — Drag

**Trigger:** `mousedown` sul `.split-divider` → drag.

**Durante drag:**
- `cursor: col-resize` già presente
- Aggiungere `user-select: none` su `body` durante drag (prevenire selezione testo accidentale)
- Il divider stesso: `background` transita da `var(--color-border)` a `var(--color-orange)` in `--duration-fast` (150ms) al `mousedown`

**Performance:** Non animare le `width` dei pannelli durante il drag. Il ridimensionamento avviene via JS su `mousemove` (già implementato). L'animazione è solo sul divider handle, non sui pannelli.

**Mouse up:** `background` torna a `var(--color-border)` in `--duration-fast`.

---

### 8. Modal — Open / Close (BrowseIngredientsModal, SavedTablesModal)

**Open:**
| Elemento | Proprietà | Stato iniziale → finale | Duration | Easing |
|---|---|---|---|---|
| `.modal-overlay` | `opacity` | `0 → 1` | `--duration-fast` (150ms) | `ease` |
| `.modal-content` | `opacity` | `0 → 1` | `--duration-normal` (250ms) | `--ease-out-quint` |
| `.modal-content` | `transform: translateY(16px) → translateY(0)` | — | `--duration-normal` (250ms) | `--ease-out-quint` |

**Close:**
| Elemento | Proprietà | Duration | Easing |
|---|---|---|---|
| `.modal-overlay` | `opacity: 1 → 0` | `--duration-fast` (150ms) | `ease` |
| `.modal-content` | `opacity: 1 → 0` + `translateY(8px)` | `--duration-fast` (150ms) | `--ease-in-quart` |

**Implementazione React:** Usare un pattern con stato `isClosing` boolean. Quando l'utente clicca close: `setIsClosing(true)` → setTimeout 150ms → `setIsOpen(false)`. La classe `.is-closing` triggerà i keyframe di uscita.

**Note:** L'overlay dimming (backdrop) deve sempre essere più rapido del modal content. Se si scurisce veloce e il modal appare lentamente, si crea la giusta gerarchia visiva: "il mondo si ferma, poi arriva il focus".

---

### 9. Tool Cards Dashboard — Page Load Stagger

**Trigger:** Mount del componente `Dashboard`.

**Pattern:** Le card ottengono `animation: fadeUp var(--duration-normal) var(--ease-out-quint) backwards` con delay scalonato via classe `.stagger-children` o data-attribute `--stagger-delay`.

| Card | Delay |
|---|---|
| 1ª | 0ms |
| 2ª | 40ms |
| 3ª | 80ms |
| 4ª | 120ms |
| 5ª | 160ms |
| 6ª | 200ms |
| 7ª | 240ms |
| 8ª | 280ms |

**Proprietà animate:** `opacity: 0 → 1` + `transform: translateY(12px) → translateY(0)`.

**Note critica:** Lo stagger si applica solo al primo load della pagina. Se l'utente naviga via e ritorna, le card appaiono senza animazione (usare un ref `hasAnimated` o `sessionStorage` flag per evitare la ri-animazione).

---

### 10. Link Hover (RisorseLinks)

**Trigger:** `:hover` sui link della pagina Risorse.

**Approccio attuale analizzato:** Non esiste una classe `.resource-link` dedicata — i link sono in linea nel componente `RisorseLinks.tsx`.

**Proprietà animate:**
| Proprietà | Duration | Easing | Note |
|---|---|---|---|
| `background` | `--duration-instant` (80ms) | `ease` | Highlight del box |
| `padding-left` | `--duration-fast` (150ms) | `--ease-out-quart` | Da 12px a 18px — effetto "indent" che suggerisce navigazione |
| `color` icona freccia | `--duration-fast` (150ms) | `ease` | Da muted a accent |

**ATTENZIONE:** Animare `padding-left` triggera layout. Usare invece `transform: translateX(6px)` sul testo interno (non sul link wrapper) per evitare reflow. Il box-sizing rimane invariato.

---

### 11. Alert / ValidationError — Show / Dismiss

**Componente:** `src/components/ValidationError.tsx`

**Entry:**
| Proprietà | Duration | Easing |
|---|---|---|
| `opacity: 0 → 1` | `--duration-fast` (150ms) | `--ease-out-expo` |
| `transform: translateY(-4px) → translateY(0)` | `--duration-fast` (150ms) | `--ease-out-expo` |
| `max-height: 0 → auto` | NON animare | — |

**Per max-height:** Non animare `max-height: 0 → auto` (non interpolabile correttamente). Usare `opacity + transform` e accettare che lo spazio sia già riservato, oppure usare `grid-template-rows: 0fr → 1fr` (tecnica moderna che non triggera layout costoso).

**Error shake** (input invalido):
| Keyframe | Duration | Easing |
|---|---|---|
| `errorShake` | 400ms | `--ease-out-expo` |

Il keyframe `errorShake` muove l'elemento orizzontalmente: `0% → -6px → 6px → -4px → 4px → -2px → 0`. Durata totale 400ms. Non ripetere: l'utente ha già capito.

**Dismiss:**
- `opacity: 1 → 0` in `--duration-fast` (150ms)
- Dopo `transitionend`: `display: none` o smontaggio React

---

### 12. Progress Bar (somma ingredienti %)

**Trigger:** Aggiornamento del peso totale degli ingredienti → cambio della percentuale sul totale 100%.

| Proprietà | Duration | Easing | Note |
|---|---|---|---|
| `width` (`.progress-fill`) | `--duration-normal` (250ms) | `--ease-out-quart` | Unica eccezione width-animation del sistema — elemento isolato |
| `background-color` | `--duration-fast` (150ms) | `ease` | Verde → arancio → rosso al superare soglie (100%) |

**Soglie di colore:**
- `< 95%`: `var(--color-green)` — ancora spazio
- `95–100%`: `var(--color-orange)` — quasi pieno
- `> 100%`: `var(--color-danger)` — overflow

**Note:** La progress bar è un elemento piccolo e semplice; `width` transition è accettabile qui perché l'elemento non influenza il layout circostante (è `position: absolute` o ha `overflow: hidden` sul wrapper).

---

### 13. Page Transition (route change)

**Trigger:** Navigazione React Router tra route diverse (Dashboard → NutrizionaleCalc → Risorse, etc.)

**Pattern consigliato:** Wrap del `<main>` content con un key che cambia sulla route. React smonta il vecchio, monta il nuovo. Il nuovo contenuto entra con `animation: fadeUp 250ms var(--ease-out-quint) backwards`.

**Non implementare:** Exit animation complessa sulla pagina uscente. Le page transition bidirezionali sono costose e quasi sempre sopravvalutate in un tool professionale. L'entrata è sufficiente.

**Duration:** `--duration-normal` (250ms) — abbastanza lenta da percepire il cambio contesto, abbastanza veloce da non rallentare il flusso di lavoro.

---

### 14. Form Input — Focus / Blur / Error

**Focus:**
| Proprietà | Duration | Easing |
|---|---|---|
| `border-color: var(--color-border) → var(--color-orange)` | `--duration-fast` (150ms) | `ease` |
| `box-shadow: none → 0 0 0 3px rgba(255,126,46,0.10)` | `--duration-fast` (150ms) | `ease` |

**Blur (ritorno allo stato normale):** Stessa transizione in reverse — CSS lo gestisce automaticamente.

**Error state (validazione fallita):**
| Proprietà | Duration | Easing |
|---|---|---|
| `border-color → var(--color-danger)` | `--duration-instant` (80ms) | `ease` |
| `box-shadow → 0 0 0 3px rgba(229,62,62,0.12)` | `--duration-instant` (80ms) | `ease` |
| `animation: errorShake` sull'input | 400ms | `--ease-out-expo` |

**Note:** La transizione attuale (`border-color 0.12s, box-shadow 0.12s`) è già corretta. Si sostituiscono solo i valori hardcoded con i token.

---

## Cosa NON animare — Lista esplicita e motivazioni

| Elemento | Perché non animarlo |
|---|---|
| `logoFloat` (logo login che oscilla) | Decorazione pura, nessuna informazione. Distrae durante l'autenticazione. **Da rimuovere** dal `@keyframes` esistente. |
| `width`, `height` dei pannelli durante resize | Triggera layout reflow su ogni frame: jank garantito su laptop medi. Il JS di resize è già più performante. |
| `left`, `top` in posizionamento assoluto | Stesso problema di layout reflow. Usare `transform: translate()` in tutti i casi. |
| Scroll position | Mai animare `scrollTop` con CSS `scroll-behavior: smooth` su contenitori di lavoro — interferisce con lo scroll utente e causa motion sickness. |
| Transizioni di colore su righe di tabella nutrizionale | Le tabelle hanno decine di celle. Animare `background-color` su hover di ogni cella è visivamente rumoroso e dispendioso. |
| Rotazione o trasformazione 3D (`rotateX`, `rotateY`, `perspective`) | Incompatibili con il tono professionale del tool. Sembrano demo, non strumenti di lavoro. |
| Skeleton loading shimmer su ogni caricamento | Solo per il caricamento iniziale del DB ingredienti (668KB). Non per ogni ricalcolo nutrizionale che è sincrono. |
| `filter: blur()` per transizioni | Costoso su GPU, non necessario per un tool professionale. |
| Animazioni su label e placeholder degli input | Distrae dall'inserimento dati, che è l'attività principale dell'utente. |
| `transition: all` | Mai usare `all`. Causa transizioni involontarie su proprietà non previste (es. `display`, `z-index`) e degrada le performance. Sostituire tutti i `transition: all var(--transition)` presenti nel CSS attuale. |

---

## Strategia prefers-reduced-motion

### Filosofia

Non usare il reset brutale `* { animation: none !important; transition: none !important }`. Questo approccio:
1. Rimuove anche le transizioni di stato che comunicano informazioni (es. colore del border su focus)
2. Non è più raccomandato nelle linee guida WCAG 2.2

### Approccio chirurgico

Distinguere tre categorie:

**Categoria A — Animazioni decorative o di ingresso:** Rimuovere completamente.
```css
/* Stagger, fadeUp, slideIn, shimmer, logoFloat */
animation: none !important;
```

**Categoria B — Transizioni di durata (non di stato):** Ridurre a 1ms (quasi zero, ma non zero per non rompere JS che ascolta `transitionend`).
```css
transition-duration: 0.01ms !important;
```

**Categoria C — Animazioni che comunicano stato critico:** Mantenere ma semplificare. L'`errorShake` può diventare un semplice cambio di `border-color` a rosso — l'errore è comunque percepito.

### Cosa mantenere anche con prefers-reduced-motion

- `border-color` e `box-shadow` su focus degli input (accessibilità del focus indicator)
- `color` e `background` su stati attivi dei tab
- Progress bar: mantenere la transizione di colore, rimuovere solo quella di `width`

---

## Appendice — Valori colore reali dal CSS esistente

Il sistema usa il tema chiaro come default (non dark come specificato nel prompt originale). I token corretti sono:

```
--color-navy:     #0c1326
--color-orange:   #ff7e2e      (brand accent, NON #e8631a)
--color-green:    #43821c
--color-danger:   #e53e3e
--color-warning:  #d97706
--color-bg:       #f4f6f9
--color-bg-card:  #ffffff
--color-border:   #dde2ea
--color-text:     #1a1f2e
--color-text-muted: #5e6b80
```

Mobile warm theme (da `mobile.css`):
```
--m-bg:       #faf7f4
--m-orange:   #ff7e2e
--m-navy:     #0c1326
--m-border:   #e8e0d8
--m-green:    #43821c
```
