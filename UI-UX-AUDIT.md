# UI/UX AUDIT — Tool Valori Nutrizionali (Fase A)

**Data**: 2026-07-31 | **Metodo**: 4 agenti dispatchati in parallelo, ciascuno con una skill di design dedicata (`design:design-system`+`frontend-design`, `design:accessibility-review`, `design:design-critique`, `design:ux-copy`), sola lettura, nessuna modifica al codice. Perimetro: `src/calculators/NutrizionaleCalc/` (desktop) e la sua controparte mobile (`NutrizionaleCalcMobile.tsx` + `mobile/*.tsx`), più i componenti condivisi (Tab nazionali, `CustomIngredientModal`, `BrowseIngredientsModal`, `DownloadTableModal`, `NutrientSelectModal`, `SmartImportModal`, `SplitShell`).

**Scopo di questo file**: fotografia precisa dello stato attuale, da usare come base per la prossima fase (mockup navigabili + design system). **Non contiene soluzioni implementative** — solo osservazioni verificate nel codice, con file:riga per ogni finding.

---

## Stato interventi (aggiornato 2026-07-31, post Fase A + Fase A.2)

I 4 report sotto restano lo storico originale della Fase A (invariati). Dopo l'audit sono stati implementati alcuni fix — elenco qui, non retro-modificati nei report.

**Risolti:**
- Priorità trasversali #2 (QUID/additivi mobile) — `RiepilogoTab.tsx` mobile ora usa `calcQuid()` dell'engine (correzione acqua-cottura) e include il peso additivi nei totali, allineato al desktop.
- Priorità trasversali #4 (bottone "Analizza ricetta" finto-disabled) — `SmartImportModal.tsx`: `disabled` HTML reale + `title`.
- Priorità trasversali #6 (contrasto arancio) — `.btn-accent`, `.m-btn--accent`, `ConfirmDialog` (3 varianti): nuovi shade più scuri stessa tonalità, 4.73-6.29:1 (WCAG AA). Token `--color-orange`/`--m-orange` originali invariati per icone/accenti dove già conformi.
- Agente 2, Perceivable #10 / Operable #8 / Robust #1 (Critical) — `CustomIngredientModal.tsx`: `role="dialog"`, `aria-modal`, `aria-labelledby`, gestione Escape, `aria-label` sul bottone di chiusura.
- Agente 2, Operable #1/#2 (Critical, `ArchivioTab.tsx`) — riga archivio ora apribile da tastiera (`role="button"`/`tabIndex`/`onKeyDown`); bottone "Elimina" sempre visibile (touch+tastiera+mouse), non più solo via long-press.
- Agente 2, Operable #3 (Critical, `BrowseIngredientsModal.tsx`) — riga espandibile ora raggiungibile da tastiera; aggiunta gestione Escape (era assente, vedi anche Operable #6).
- Agente 2, Operable #13 (`mobile/CalcoloTab.tsx`) — bottone "Vai a Mercati" disabled ora con `title` esplicativo.
- Agente 1, divergenze fallback CSS (`--m-text-muted`, `--m-navy`, `--m-border` in `TabellaTab.tsx`/`CalcoloTab.tsx`) — fallback errati rimossi (la variabile è sempre definita, nessun fallback necessario).
- Agente 4, tabella "Stringhe duplicate" riga 1 e 2 (naming "tab Calcolo"/"scheda Tabella") — corretti in "scheda Ricetta"/"scheda Mercati" in `TabellaTab.tsx`/`ArchivioTab.tsx`.
- Agente 4, tabella "Stringhe duplicate" riga 7 (simbolo "*" su campo Fibre facoltativo) — cambiato in "○" in `CustomIngredientModal.tsx`.
- Agente 1, "Sistema di token condiviso" — i 4 `:root` sovrapposti (`unified-tokens.css`/`motion.css`/`mobile.css`/`index.css`) consolidati su `unified-tokens.css` come unica fonte: rimossi 17 duplicati confermati in `index.css`, block duplicato in `motion.css`, valori disallineati in `unified-tokens.css` riallineati a quelli vincenti (zero variazione visiva). `--color-bg-card` (index.css) tenuto deliberatamente distinto da `--surface` (valore diverso nonostante nome simile in mapping, vedi CONSOLIDAMENTO.md).
- Agente 3, Ricetta — additivi mobile ora pesabili: aggiunti campi grammi/resa/€kg in `mobile/CalcoloTab.tsx` (`AdditiveRowItem`, stesso pattern di `RecipeRowItem`), parità raggiunta col desktop.

**Non toccati (debito residuo, rischio/scope maggiore):**
- Agente 3, Guida/Database — funzioni assenti su mobile, non aggiunte (feature gap, non bug).
- Agente 2, focus trap ciclico assente sui 7 dialog, touch target sotto 44px vari, contrasto sidebar fly-out — non toccati.
- Agente 4, copy/tono (emoji "✨", blocco hero marketing, altre stringhe duplicate/errori generici non elencati sopra) — non toccati.

---

## Indice

1. [Agente 1 — Design token reali](#agente-1--design-token-reali)
2. [Agente 2 — Audit accessibilità WCAG 2.1 AA](#agente-2--audit-accessibilità-wcag-21-aa)
3. [Agente 3 — Parità struttura desktop/mobile](#agente-3--parità-struttura-desktopmobile)
4. [Agente 4 — Audit microcopy](#agente-4--audit-microcopy)
5. [Priorità trasversali](#priorità-trasversali)

---

## Agente 1 — Design token reali

Scope analizzato: `NutrizionaleCalc.tsx`, `NutrizionaleCalcMobile.tsx`, `mobile/{CalcoloTab,TabellaTab,RiepilogoTab,ArchivioTab,ToolsTab}.tsx`, `TabUE.tsx`, `TabUSA.tsx`, `TabCanada.tsx`, `TabAustralia.tsx`, `TabArabi.tsx`, `CustomIngredientModal.tsx`, `BrowseIngredientsModal.tsx`, `DownloadTableModal.tsx`, `NutrientSelectModal.tsx`, `SmartImportModal.tsx`, `SplitShell.tsx` (8.636 righe totali). Metodo: `grep` sistematico su hex/rgb, `fontSize:`, `borderRadius:`, `gap:`, `padding:` inline e su `className`.

**Osservazione preliminare rilevante**: questi componenti NON usano quasi mai classi utility Tailwind (0 classi tipo `p-4`, `text-sm`, `gap-2` trovate). Lo stile è per il 95% `style={{ ... }}` inline con valori numerici/hex letterali, più alcune classi CSS custom (`.card`, `.btn`, `.comp-card`, prefisso `m-*`) definite in `index.css`/`mobile.css`. Il "Tailwind è lo standard" dichiarato in CLAUDE.md non si riflette in questo tool: qui il vero token system, se esiste, è nelle CSS custom properties.

### Token reali rilevati

| Categoria | Valore | Occorrenze | File:riga (esempi) |
|---|---|---|---|
| Colore | `#000` (bordi tabelle nazionali) | 74 (tutte in Tab*.tsx) | TabArabi.tsx:113, TabCanada.tsx:113,165 |
| Colore | `#fff` / `#ffffff` | 29 + 2 | TabCanada.tsx:113, NutrizionaleCalc.tsx (vari) |
| Colore | `#ff7e2e` (arancio brand) | 25 | mobile/CalcoloTab.tsx:425,427,503,739 (12× dentro `var(--m-orange, #ff7e2e)`; resto hex puro senza var) |
| Colore | `#e5e7eb` (grigio bordo, Tailwind gray-200) | 14 | NutrizionaleCalc.tsx:1613,1615,1649 |
| Colore | `#999` | 11 (Tab*.tsx) | — |
| Colore | `#d1d5db` (Tailwind gray-300) | 9 | — |
| Colore | `#c53030` (rosso testo su danger) | 9 | NutrizionaleCalc.tsx:1707, CustomIngredientModal.tsx:353,362 |
| Colore | `#9ca3af` (Tailwind gray-400) | 9 | NutrizionaleCalc.tsx:1614, SmartImportModal.tsx:132,169 |
| Colore | `#6b7280` (Tailwind gray-500) | 9 | NutrizionaleCalc.tsx:1593, SmartImportModal.tsx:300,401 |
| Colore | `#dd5c0c` (hover arancio) | 8 | mobile/CalcoloTab.tsx:739,780,799 (dentro gradient, no var) |
| Colore | `#e53e3e` (rosso danger) | 6 | mobile/CalcoloTab.tsx:414,523; NutrizionaleCalc.tsx:1512 |
| Colore | `#c62828` / `#111827` / `#f9fafb` / `#f5f5f5` / `#e65100` / `#718096` / `#16a34a` | 6-5 ciascuno | NutrizionaleCalc.tsx:1590,1654; SmartImportModal.tsx:132,211,247,295,299 |
| Colore | `#f3f4f6`, `#333`, `#15803d`, `#374151`, `#2b6cb0`, `#fc8181`, `#b7791f`, ecc. | 4-2 ciascuno | vari modali |
| Font-size | `12` (unitless px, inline `fontSize:`) | 65 | mobile/CalcoloTab.tsx:308,321 (moltissimi altri) |
| Font-size | `11` | 57 | mobile/TabellaTab.tsx:427,481 |
| Font-size | `13` | 44 | — |
| Font-size | `10` | 30 | — |
| Font-size | `14` | 10 | — |
| Font-size | `17,22,20,16,15,9,18,11.5` | 1-4 ciascuno | valori isolati/eccezione |
| Spaziatura (gap) | `6` (px) | 37 | NutrizionaleCalc.tsx:277,301,348 |
| Spaziatura (gap) | `8` | 33 | NutrizionaleCalc.tsx:268; mobile/TabellaTab.tsx:407 |
| Spaziatura (gap) | `4` | 20 | mobile/TabellaTab.tsx:424,470 |
| Spaziatura (gap) | `10` | 12 | — |
| Spaziatura (gap) | `5,12,2,7,0,16,14,18` | 1-9 ciascuno | — |
| Spaziatura (padding stringa) | `'5px 7px'`, `'5px 6px'` | 15 ciascuno | — |
| Spaziatura (padding stringa) | `'8px 12px'`,`'10px 14px'`,`'10px 12px'`,ecc. | 4-6 ciascuno | valori quasi-scala ma non coerenti tra loro |
| Border-radius | `6` | 14 | NutrizionaleCalc.tsx:1707,1748,1777 |
| Border-radius | `8` | 13 | mobile/RiepilogoTab.tsx:89; DownloadTableModal.tsx:248 |
| Border-radius | `10` | 12 | mobile/RiepilogoTab.tsx:126,200,208 |
| Border-radius | `20` | 7 | — |
| Border-radius | `999` (pillole/badge) | 4 | BrowseIngredientsModal.tsx:268,274; SmartImportModal.tsx:142,217 |
| Border-radius | `50, 14, 16, 5, 2` | 1-3 ciascuno | — |

### Sistema di token condiviso trovato

**Attenzione**: esistono TRE dichiarazioni `:root` sovrapposte e in parte incoerenti tra loro, importate nell'ordine seguente in `src/index.css`:
```
@import './styles/unified-tokens.css';   /* riga 1 */
@import './styles/motion.css';           /* riga 2 */
@import './styles/mobile.css';           /* riga 3 */
:root { ... }                            /* riga 14, dichiarato DENTRO index.css stesso */
```
Per specificità CSS uguale, l'ultima dichiarazione nell'ordine di sorgente vince: **i valori dichiarati direttamente in `index.css` (righe 14-77) sovrascrivono quelli di `unified-tokens.css` e `motion.css`** per le variabili con lo stesso nome.

| File | Variabili dichiarate (valori effettivi cascata, dove in conflitto) |
|---|---|
| `src/styles/unified-tokens.css` (righe 16-146) | `--navy:#0c1326 --orange:#ff7e2e --green:#43821c --bg:#f4f6f9 --surface:#ffffff --border:#dde2ea --text:#1a1f2e --text-muted:#5e6b80 --text-dim:#9ba8bb --r-sm:4px --r-md:8px --r-lg:10px` + mapping legacy `--color-*`→`--radius-md:var(--r-md)=8px` `--radius-lg:var(--r-lg)=10px` `--m-muted:var(--text-muted)` |
| `src/styles/motion.css` (righe 20-90 ca.) | Ridichiara **di nuovo** `--radius-sm:4px --radius-md:8px --radius-lg:10px --radius-full:9999px`, `--space-1:4px --space-2:8px --space-3:12px --space-4:16px --space-5:20px --space-6:24px --space-8:32px --space-10:40px --space-12:48px` (scala di spaziatura reale, unica nel progetto), `--dur-*`, `--ease-*`, e ridichiara `--color-*` (border-focus come `rgba(255,126,46,0.4)`) |
| `src/styles/mobile.css` (righe 3-20) | Namespace separato `--m-*`: `--m-bg:#faf7f4 --m-surface:#ffffff --m-navy:#0c1326 --m-orange:#ff7e2e --m-orange-hover:#dd5c0c --m-border:#e8e0d8 --m-border-light:#f0ebe3 --m-text:#0c1326 --m-text-muted:rgba(12,19,38,0.45) --m-text-faint:rgba(12,19,38,0.25) --m-radius-sm:6px --m-radius-md:10px --m-radius-lg:14px` |
| `src/index.css` (righe 14-77, **vince la cascata**) | `--color-border-focus:#ff7e2e` (non rgba come in motion.css/unified-tokens.css) `--radius-sm:6px --radius-md:10px --radius-lg:16px` (diverso da unified-tokens.css e motion.css che dicono 4/8/10px) `--color-danger:#e53e3e --color-text-muted:#5e6b80 --color-text-dim:#9ba8bb --color-bg-input:#f8f9fb` |

Non esiste **nessuna scala tipografica** (`--fs-*` / `--text-*` come font-size) dichiarata in nessuno dei tre file: solo `--font`/`--font-sans` (famiglia) e `--font-mono`. La scala di spaziatura `--space-1..12` esiste solo in `motion.css` ed è l'unico vero "spacing scale" del progetto.

### Divergenze

| Valore hardcoded | File:riga | Token che avrebbe dovuto usare | Note |
|---|---|---|---|
| `#ff7e2e` (13 istanze pure, senza `var()`) | mobile/CalcoloTab.tsx:739,780,799 (gradient); NutrizionaleCalc.tsx e modali vari | `var(--color-orange)` / `var(--color-accent)` / `var(--m-orange)` | Match esatto col token in tutti e 3 i file di root; usato come hex letterale invece che var() |
| `#ff7e2e` (12 istanze come fallback di `var(--m-orange, #ff7e2e)`) | mobile/TabellaTab.tsx:427, mobile/CalcoloTab.tsx:425,427,503 | `var(--m-orange)` senza fallback | Il fallback duplica per caso il valore corretto (coincidenza, non garanzia — vedi righe sotto dove il fallback è sbagliato) |
| `#dd5c0c` | mobile/CalcoloTab.tsx:739,780,799 | `var(--color-orange-hover)` / `var(--m-orange-hover)` | Match esatto, usato hardcoded dentro `linear-gradient(...)` |
| `var(--m-text-muted, #5e6b80)` — **fallback sbagliato** | mobile/TabellaTab.tsx:116,470,481,497 | `var(--m-text-muted)` | Il valore reale di `--m-text-muted` (dichiarato in mobile.css:13) è `rgba(12,19,38,0.45)`, non `#5e6b80`. Il fallback nel codice riflette il valore di `--text-muted`/`--color-text-muted` di un file diverso (unified-tokens.css), non quello effettivamente attivo per `--m-text-muted` |
| `var(--m-navy, #1a2340)` — **fallback sbagliato** | mobile/TabellaTab.tsx:489 | `var(--m-navy)` | `--m-navy` reale (mobile.css:6) è `#0c1326`, non `#1a2340`. Fallback errato |
| `var(--m-border, #eee)` | mobile/CalcoloTab.tsx:304 | `var(--m-border)` | `--m-border` reale (mobile.css:10) è `#e8e0d8`. Fallback errato |
| `var(--m-border, #ddd)` | mobile/CalcoloTab.tsx:356 | `var(--m-border)` | Stesso problema, valore fallback diverso da riga precedente per lo stesso token — incoerenza interna |
| `var(--m-border, #e0e0e0)` | mobile/CalcoloTab.tsx:496 | `var(--m-border)` | Terzo fallback diverso ancora per lo stesso `--m-border` (3 fallback diversi: `#eee`, `#ddd`, `#e0e0e0`, nessuno pari al vero `#e8e0d8`) |
| `#c53030` | NutrizionaleCalc.tsx:1707; CustomIngredientModal.tsx:353,362 | nessun token esatto — vedi nota | Non corrisponde a `--color-danger` (`#e53e3e`, più acceso). `index.css` stesso usa `#c53030` hardcoded in `.login-error`/`.demo-account-btn` senza mai tokenizzarlo: il valore "rosso testo su sfondo danger" non ha mai avuto un token dedicato nel sistema |
| `borderRadius: 6` | NutrizionaleCalc.tsx:1707,1748,1777 (14 occorrenze) | `var(--radius-sm)` | Match esatto col valore *effettivo* di `--radius-sm` in `index.css` (6px) — ma diverge dal valore di `--radius-sm` dichiarato in `unified-tokens.css`/`motion.css` (4px). Ambiguo a quale dei tre sistemi il developer stesse pensando |
| `borderRadius: 10` | mobile/RiepilogoTab.tsx:126,200,208 (12 occorrenze) | `var(--radius-md)` (index.css, 10px) o `var(--r-lg)`/`var(--radius-lg)` (unified-tokens/motion.css, 10px) | Ambiguità strutturale: 10px è contemporaneamente "radius-md" in un sistema e "radius-lg" in un altro |
| `borderRadius: 999` | BrowseIngredientsModal.tsx:268,274; SmartImportModal.tsx:142,217 | `var(--radius-full)` | Il token dichiarato vale `9999px`, il codice usa `999` — valore vicino ma non identico (probabile refuso/scorciatoia, comunque visivamente equivalente per un badge piccolo, ma non è il token) |
| `#e5e7eb` | NutrizionaleCalc.tsx:1613,1615,1649 (14 occorrenze) | nessun token esatto — vedi "Non verificabile"/gap sotto | Tailwind gray-200 di default; non corrisponde a `--color-border` (`#dde2ea`) né a nessun altro token dichiarato |
| `#f9fafb` | BrowseIngredientsModal.tsx:336 (come fallback `var(--color-surface-hover, #f9fafb)`); SmartImportModal.tsx:211,247,295 | — | `--color-surface-hover` **non esiste in nessun file di token** (variabile mai dichiarata: il var() è sempre orfano, risolve sempre al fallback). Valore vicinissimo ma non identico a `--color-bg-input` (`#f8f9fb`, differisce di un carattere) |
| `gap: 8` (33 occorrenze) | NutrizionaleCalc.tsx:268; mobile/TabellaTab.tsx:407 | `var(--space-2)` (motion.css, 8px) | Match esatto con la scala spacing dichiarata ma mai riferita da nessun componente del tool |
| `gap: 4` (20 occorrenze) | mobile/TabellaTab.tsx:424,470 | `var(--space-1)` (motion.css, 4px) | Idem |
| `gap: 12` (6 occorrenze) | — | `var(--space-3)` (motion.css, 12px) | Idem |
| `gap: 6` (37 occorrenze, il valore più frequente in assoluto) | NutrizionaleCalc.tsx:277,301,348 | nessun token — valore "fuori scala" | `6` non è un multiplo della scala `--space-*` (4,8,12,16,20,24,32,40,48); è il valore più usato nell'intero scope e non ha equivalente dichiarato |

### Non verificabile da codice statico

- I colori dei badge/etichette calcolati dinamicamente (es. `b.bg`, `b.color` in `SmartImportModal.tsx:217`, mappe di stato "match/no-match" import Excel) sono oggetti JS costruiti a runtime da altre porzioni di codice non incluse nello scope di questo audit: non è stato possibile risolverne il valore statico finale.
- Il valore realmente applicato da `var(--nome, fallback)` quando esistono più dichiarazioni `:root` in conflitto (vedi tabella "Sistema di token condiviso") dipende dall'ordine di caricamento CSS effettivo nel bundle Vite/browser: l'analisi sopra assume l'ordine di `@import` dichiarato in `index.css` (unified-tokens → motion → mobile → root proprio), ma la conferma definitiva richiede ispezione DevTools a runtime (Computed Style), non eseguibile in sola lettura statica.
- Eventuali override via media query (`@media (max-width: 899px)` in `unified-tokens.css:74-79`, che ridefinisce `--r-md`) possono cambiare il valore risolto di alcuni token hardcoded confrontati sopra, a seconda della viewport — non verificato per ogni breakpoint.

---

## Agente 2 — Audit accessibilità WCAG 2.1 AA

**Standard:** WCAG 2.1 AA | **Date:** 2026-07-31 | **Metodo:** analisi statica del codice sorgente (nessun browser reale)

### Summary
**Issues found:** 24 | **Critical:** 6 | **Major:** 12 | **Minor:** 6

Le due criticità sistemiche più gravi sono: (1) il contrasto testo-bianco-su-arancio (`#ff7e2e`) usato su quasi tutti i bottoni primari (2.54:1, richiesto 4.5:1) e (2) tre pattern di interazione touch-only/click-only senza equivalente da tastiera in `ArchivioTab.tsx` e `BrowseIngredientsModal.tsx` che rendono intere funzioni (apertura, eliminazione, espansione riga) inaccessibili da tastiera/screen reader.

### Perceivable

| # | Issue | WCAG Criterion | Severity | file:riga |
|---|-------|-----------------|----------|-----------|
| 1 | Testo bianco su sfondo arancio `#ff7e2e` (bottoni primari `.btn-accent`, `.m-btn--accent`, `.sidebar-logo-mark`, `.comp-number-badge`, bottoni "Importa ricetta"/"Inizia l'import intelligente") — rapporto 2.54:1, richiesto 4.5:1 | 1.4.3 Contrast | 🔴 Critical | `src/index.css:1131-1136` (`.btn-accent`); `src/styles/mobile.css:191-203` (`.m-btn--accent`); `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx:729-750,793-806` (bottoni import) |
| 2 | `ConfirmDialog` — testo bianco su tutte e 3 le varianti di sfondo bottone conferma: warning `#d97706` (3.19:1), danger `#e53e3e` (4.13:1), info/default `#ff7e2e` (2.54:1) — tutte sotto 4.5:1 | 1.4.3 Contrast | 🔴 Critical | `src/components/ui/ConfirmDialog.tsx:15-37` (VARIANT_CONFIG); `src/index.css:2443-2448` (`.confirm-dialog-btn--confirm`) |
| 3 | Testo arancio `#ff7e2e` su sfondo bianco/chiaro (`.result-table .result-value`, `.form-section-title`, `.step-label.active`, span "resa %"/"€/kg" in riga ingrediente mobile) — 2.54:1, richiesto 4.5:1 (o 3:1 se icona/grafica, comunque sotto soglia) | 1.4.3 / 1.4.11 | 🟡 Major | `src/index.css:1083-1086` (`.result-table .result-value`), `:537-543` (`.form-section-title`), `:596` (`.step-label.active`); `src/calculators/NutrizionaleCalc/mobile/CalcoloTab.tsx:274-275` (span resa/eurKg) |
| 4 | `--m-text-muted` (`rgba(12,19,38,.45)`) su sfondo bianco/`--m-surface` ≈ 3.00:1 — usato pervasivamente in etichette mobile 10-11px (`.m-label`, `.m-section__title`, `.m-archive-meta`, `.m-serving-field__label`, ecc.), richiesto 4.5:1 per testo piccolo | 1.4.3 Contrast | 🟡 Major | `src/styles/mobile.css:13` (definizione token), usato in decine di punti es. `mobile/CalcoloTab.tsx:308,325`, `mobile/TabellaTab.tsx:481,497`, `mobile/RiepilogoTab.tsx:58` |
| 5 | `--m-text-faint` (`rgba(12,19,38,.25)`) su bianco ≈ 1.75:1 — molto sotto soglia | 1.4.3 Contrast | 🟡 Major | `src/styles/mobile.css:14`; usato in `mobile/CalcoloTab.tsx:212` ("Digita almeno 2 caratteri…") |
| 6 | Badge "Può contenere tracce di" — testo `#e65100` su sfondo `#fff3e0` = 3.46:1, richiesto 4.5:1 (testo 11px bold) | 1.4.3 Contrast | 🟡 Major | `mobile/TabellaTab.tsx:814-828`; `mobile/RiepilogoTab.tsx:246-260` |
| 7 | Sidebar fly-out: più combinazioni testo/icona sotto soglia su sfondo `#111d35` — `.sidebar-flyout-section-label` `rgba(255,255,255,.25)` = 2.27:1; `.sidebar-flyout-brand-sub` `rgba(255,255,255,.35)` = 3.18:1; `.sidebar-flyout-user-email` `rgba(255,255,255,.3)` = 2.69:1; icona `.sidebar-flyout-logout` `rgba(255,255,255,.3)` = 2.69:1 (icona, richiede 3:1) | 1.4.3 / 1.4.11 | 🟡 Major | `src/index.css:753-759` (section-label), `:742-751` (brand-sub), `:792-811` (user-email/logout) |
| 8 | Badge successo: testo `#43821c` su `rgba(67,130,28,.10)`+bianco ≈ 4.14:1, sotto 4.5:1 (borderline) | 1.4.3 Contrast | 🟢 Minor | `src/index.css:1200-1203` (`.badge-success`) |
| 9 | `--color-text-dim` (`#9ba8bb`) su bianco = 2.41:1 — usato per hint (`.form-field .hint`), frecce tool-card, step-dot pending | 1.4.3 Contrast | 🟢 Minor | `src/index.css:1013-1017`, `:944-951`, `:575-579` |
| 10 | `CustomIngredientModal.tsx` — bottone di chiusura contiene solo icona `<X size={14}/>`, nessun `aria-label`/testo visibile né elemento con nome accessibile | 1.1.1 Non-text Content | 🔴 Critical | `src/calculators/NutrizionaleCalc/CustomIngredientModal.tsx:348` |

### Operable

| # | Issue | WCAG Criterion | Severity | file:riga |
|---|-------|-----------------|----------|-----------|
| 1 | `ArchivioTab.tsx` — la riga d'archivio (`<div className="m-archive-item...">`) apre la ricetta solo via `onClick`/`onTouchStart`; nessun `role="button"`, `tabIndex`, `onKeyDown`. L'apertura di un calcolo salvato non è raggiungibile/attivabile da tastiera | 2.1.1 Keyboard | 🔴 Critical | `src/calculators/NutrizionaleCalc/mobile/ArchivioTab.tsx:131-151` |
| 2 | `ArchivioTab.tsx` — il menu contestuale (Apri/Elimina) si apre **solo** con long-press touch di 500ms (`onTouchStart`/`setTimeout`); non esiste alcun trigger da tastiera, screen reader o mouse (nessun `onContextMenu`/tasto dedicato). La funzione "Elimina" è interamente inaccessibile senza touch | 2.1.1 Keyboard | 🔴 Critical | `src/calculators/NutrizionaleCalc/mobile/ArchivioTab.tsx:51-66,157-184` |
| 3 | `BrowseIngredientsModal.tsx` — riga ingrediente espandibile (`<div onClick={() => toggleExpand(idx)}>`) senza `role="button"`, `tabIndex`, `onKeyDown`: i dettagli nutrizionali dell'ingrediente non sono espandibili da tastiera | 2.1.1 Keyboard | 🔴 Critical | `src/calculators/NutrizionaleCalc/BrowseIngredientsModal.tsx:332-340` |
| 4 | `SmartImportModal.tsx` — bottone "Analizza ricetta" quando vuoto: `onClick={!isEmpty ? onAnalyze : undefined}` invece di `disabled`. Resta focalizzabile/apparentemente attivo per screen reader (nessun `aria-disabled`), ma l'attivazione non fa nulla e non spiega perché | 2.1.1 / 4.1.2 | 🔴 Critical | `src/calculators/NutrizionaleCalc/SmartImportModal.tsx:362-383` |
| 5 | Nessuno dei 7 dialog/modal del tool implementa un vero **focus trap ciclico**: `ConfirmDialog`, `PromptDialog` e `IngredientPickerModal` impostano solo il focus iniziale + gestiscono `Escape`, ma `Tab`/`Shift+Tab` può far uscire il focus dal dialog verso la pagina sottostante | 2.4.3 Focus Order | 🟡 Major | `src/components/ui/ConfirmDialog.tsx:53-70`; `src/components/ui/PromptDialog.tsx:28-45`; `mobile/CalcoloTab.tsx:82-93` (IngredientPickerModal) |
| 6 | `BrowseIngredientsModal.tsx`, `SmartImportModal.tsx`, `NutrientSelectModal.tsx`, `DownloadTableModal.tsx` — **nessuna gestione del tasto Escape** per chiudere il modal (a differenza di `ConfirmDialog`/`PromptDialog`/`IngredientPickerModal` che la implementano) | 2.1.1 Keyboard | 🟡 Major | `BrowseIngredientsModal.tsx` (nessun `useEffect` Escape); `SmartImportModal.tsx` (idem); `NutrientSelectModal.tsx:61-138`; `DownloadTableModal.tsx:52-127` |
| 7 | `NutrientSelectModal.tsx` — nessun `role="dialog"`/`aria-modal`, nessuna gestione focus iniziale/Escape (il wrapper è un semplice `<div onClick={onClose}>`) | 2.1.1 / 4.1.2 | 🟡 Major | `src/calculators/NutrizionaleCalc/NutrientSelectModal.tsx:72-91` |
| 8 | `CustomIngredientModal.tsx` — il contenitore del modal non ha `role="dialog"`/`aria-modal`/`aria-labelledby`, nessuna gestione Escape, nessun focus iniziale impostato | 4.1.2 / 2.1.1 | 🔴 Critical | `src/calculators/NutrizionaleCalc/CustomIngredientModal.tsx:341-343` |
| 9 | Touch target sotto 44×44px in `mobile/CalcoloTab.tsx`: bottone chiudi `IngredientPickerModal` (padding 4 + icona 18 ≈ 26px), chevron espandi riga (padding 2 + icona 13 ≈ 17px), `.m-ing-row__remove` (padding 4 + icona 13 ≈ 21px, CSS in `index.css:2997-3008`), rimuovi additivo (padding 4 + icona 13 ≈ 21px), rimuovi componente (padding 2 + icona 14 ≈ 18px) | 2.5.5 Touch Target | 🟡 Major | `mobile/CalcoloTab.tsx:133-140,260-267,290-297,411-417,520-527` |
| 10 | Input grammi ingrediente (`.m-ing-row__input`) — altezza esplicita **32px**, sotto la soglia 44px richiesta per gli altri input mobile (`.m-input` usa correttamente `min-height:44px`) | 2.5.5 Touch Target | 🟡 Major | `src/index.css:2976-2989`; usato in `mobile/CalcoloTab.tsx:278-288` |
| 11 | Bottone "Nutrienti" (TabellaTab) e `.m-expand-btn`/`.m-fullscreen-overlay__close` — altezze reali ≈17-28px, sotto 44px | 2.5.5 Touch Target | 🟢 Minor | `mobile/TabellaTab.tsx:420-431`; `src/styles/mobile.css:527-542,511-519` |
| 12 | `.hamburger-btn` (AppShell, visibile solo nella finestra 768-899px poiché <768px monta `MobileShell`) — padding 4px + icona 18px ≈ 26x26px, sotto 44px | 2.5.5 Touch Target | 🟢 Minor | `src/components/AppShell.tsx:46-53`; CSS `src/index.css:1323-1331,1349-1350` |
| 13 | Bottone "Vai a Mercati" disabilitato (`disabled={!hasIngredients}`) senza `title`/testo/`aria-describedby` che spieghi il motivo — a differenza di altri controlli disabilitati nello stesso tool (es. `SegmentedControl`/`OptBtn` che usano `title`) | 3.3.1 Error Identification | 🟡 Major | `mobile/CalcoloTab.tsx:927-936` |

### Understandable

| # | Issue | WCAG Criterion | Severity | file:riga |
|---|-------|-----------------|----------|-----------|
| 1 | Bottone "Analizza ricetta" apparentemente disabilitato (grigio, `cursor:not-allowed`) ma senza attributo `disabled`/`aria-disabled`: l'utente (soprattutto con screen reader) non riceve alcuna indicazione dello stato o del motivo | 3.3.1 / 4.1.2 | 🔴 Critical | `src/calculators/NutrizionaleCalc/SmartImportModal.tsx:362-383` (stesso item di Operable #4, impatto anche su Understandable) |
| 2 | Etichette icon-only sidebar rail (`Sidebar.tsx`) si affidano solo all'attributo `title` per il nome accessibile (nessun `aria-label`): tecnicamente valido (fallback dell'algoritmo accname) ma fragile — non tutte le combinazioni browser/AT lo gestiscono in modo coerente, e `title` non è visibile su touch | 4.1.2 (best practice) | 🟢 Minor | `src/components/Sidebar.tsx:79-90` |

### Robust

| # | Issue | WCAG Criterion | Severity | file:riga |
|---|-------|-----------------|----------|-----------|
| 1 | `CustomIngredientModal.tsx` — bottone icon-only di chiusura senza nome accessibile (vedi Perceivable #10) | 4.1.2 Name, Role, Value | 🔴 Critical | `CustomIngredientModal.tsx:348` |
| 2 | `ArchivioTab.tsx`/`BrowseIngredientsModal.tsx` — `div` con `onClick` usati come controlli interattivi primari senza `role`, `tabIndex` o gestione tastiera (vedi Operable #1/#3): non espongono ruolo/valore a un AT | 4.1.2 Name, Role, Value | 🔴 Critical | vedi sopra |
| 3 | `sidebar-user-avatar` ha `cursor:pointer` via CSS ma nessun `onClick`/handler nel componente `Sidebar.tsx`: falsa affordance visiva senza funzione reale (né problema, né beneficio per AT, ma UX ingannevole) | 4.1.2 (nota UX) | 🟢 Minor | `src/components/Sidebar.tsx:94-96`; CSS `src/index.css:703-716` |

### Color Contrast Check

| Elemento | Foreground | Background | Ratio | Required | Pass? |
|---|---|---|---|---|---|
| Testo body (`--color-text`) su `--color-bg` | `#1a1f2e` | `#f4f6f9` | 15.16:1 | 4.5:1 | ✅ |
| Testo body su card bianca | `#1a1f2e` | `#ffffff` | 16.41:1 | 4.5:1 | ✅ |
| `--color-text-muted` su bianco | `#5e6b80` | `#ffffff` | 5.40:1 | 4.5:1 | ✅ |
| `--color-text-muted` su `--color-bg` | `#5e6b80` | `#f4f6f9` | 4.99:1 | 4.5:1 | ✅ |
| `--color-text-dim` su bianco (hint, frecce) | `#9ba8bb` | `#ffffff` | 2.41:1 | 4.5:1 | ❌ |
| `--color-orange` (testo) su bianco (`.result-value`, `.form-section-title`) | `#ff7e2e` | `#ffffff` | 2.54:1 | 4.5:1 (o 3:1 se grafica) | ❌ |
| `--color-orange` su `--color-navy` (icona sidebar attiva) | `#ff7e2e` | `#0c1326` | 7.28:1 | 3:1 (icona) | ✅ |
| Bianco su `--color-orange` (`.btn-accent`, `.m-btn--accent`) | `#ffffff` | `#ff7e2e` | 2.54:1 | 4.5:1 | ❌ |
| `--color-navy` su bianco | `#0c1326` | `#ffffff` | 18.47:1 | 4.5:1 | ✅ |
| ConfirmDialog confirm-btn, variant warning (default) | `#ffffff` | `#d97706` | 3.19:1 | 4.5:1 | ❌ |
| ConfirmDialog confirm-btn, variant danger | `#ffffff` | `#e53e3e` | 4.13:1 | 4.5:1 | ❌ |
| ConfirmDialog confirm-btn, variant info | `#ffffff` | `#ff7e2e` | 2.54:1 | 4.5:1 | ❌ |
| Allergene "Contiene" testo su badge | `#c62828` | `#ffebee` | 4.92:1 | 4.5:1 | ✅ |
| Allergene "Può contenere tracce" testo su badge | `#e65100` | `#fff3e0` | 3.46:1 | 4.5:1 | ❌ |
| `.badge-success` testo su sfondo | `#43821c` | `#ecf2e8` (blend) | 4.14:1 | 4.5:1 | ❌ (borderline) |
| `.badge-warning` testo su sfondo | `#92400e` | `#faefe1` (blend) | 6.25:1 | 4.5:1 | ✅ |
| `.badge-danger` testo su sfondo | `#c53030` | `#fcecec` (blend) | 4.78:1 | 4.5:1 | ✅ |
| Bianco su verde (`.m-btn--green`, badge) | `#ffffff` | `#43821c` | 4.72:1 | 4.5:1 | ✅ |
| Bianco su rosso pericolo | `#ffffff` | `#e53e3e` | 4.13:1 | 4.5:1 | ❌ |
| `--m-text` su `--m-surface`/`--m-bg` (mobile) | `#0c1326` | `#ffffff` / `#faf7f4` | 18.47:1 / 17.31:1 | 4.5:1 | ✅ |
| `--m-text-muted` (.45 alpha) su bianco (etichette mobile) | `rgba(12,19,38,.45)` → `#92959d` | `#ffffff` | 3.00:1 | 4.5:1 (testo piccolo) | ❌ |
| `--m-text-faint` (.25 alpha) su bianco | `rgba(12,19,38,.25)` → `#c2c4c9` | `#ffffff` | 1.75:1 | 4.5:1 | ❌ |
| `--m-orange` testo su `--m-bg` | `#ff7e2e` | `#faf7f4` | 2.38:1 | 4.5:1 | ❌ |
| `--m-orange` su `--m-navy` (topbar sub-label) | `#ff7e2e` | `#0c1326` | 7.28:1 | 4.5:1 | ✅ |
| Sidebar fly-out `sidebar-flyout-section-label` | `rgba(255,255,255,.25)` → `#4c5668` | `#111d35` | 2.27:1 | 4.5:1 | ❌ |
| Sidebar fly-out `sidebar-flyout-brand-sub` | `rgba(255,255,255,.35)` → `#646c7c` | `#111d35` | 3.18:1 | 4.5:1 | ❌ |
| Sidebar fly-out `sidebar-flyout-user-email` | `rgba(255,255,255,.3)` → `#586172` | `#111d35` | 2.69:1 | 4.5:1 | ❌ |
| Sidebar fly-out logout icon | `rgba(255,255,255,.3)` → `#586172` | `#111d35` | 2.69:1 | 3:1 (icona) | ❌ |
| `sidebar-flyout-item` (testo voce menu) | `rgba(255,255,255,.45)` → `#7c8390` | `#111d35` | 4.40:1 | 4.5:1 | ❌ (borderline) |
| Icona rail nav default (inattiva) | `rgba(255,255,255,.4)` → `#6d717d` | `#0c1326` | 3.79:1 | 3:1 (icona) | ✅ |
| TabUE `tdSub` (tabella ufficiale, non modificabile) | `#666666` | `#ffffff` | 5.74:1 | 4.5:1 | ✅ |
| TabUE bordi tabella (decorativi, non modificabili) | `#999999` | `#ffffff` | 2.85:1 | 3:1 (se percepiti come UI) | ⚠️ sotto soglia ma probabile decorativo — vedi nota |

Nota: i colori `--color-*` sono presi da `src/index.css` (vince sulla cascata perché caricato/dichiarato dopo `unified-tokens.css`, stessa specificità `:root`); i colori `--m-*` da `src/styles/mobile.css`. Le tabelle `TabUE/TabUSA/TabCanada/TabAustralia/TabArabi` sono contrassegnate in `CLAUDE.md`/memoria come "ufficiali, intoccabili" — i risultati sono riportati solo per completezza dell'audit, non come richiesta di modifica.

### Keyboard Navigation

| Elemento | Tab Order | Enter/Space | Escape | Note |
|---|---|---|---|---|
| `ConfirmDialog` | Focus iniziale sul bottone conferma ✅ | ✅ (bottoni nativi) | ✅ gestito | ❌ nessun focus trap ciclico (Tab può uscire dal dialog) |
| `PromptDialog` | Focus iniziale sull'input ✅ | ✅ (submit su Enter nell'input) | ✅ gestito | ❌ nessun focus trap ciclico |
| `IngredientPickerModal` (CalcoloTab) | Focus iniziale sull'input ricerca ✅ | ✅ (bottoni nativi) | ✅ gestito | ❌ nessun focus trap ciclico |
| `CustomIngredientModal` | Non impostato | Bottoni nativi ok, ma chiudi = icona senza nome | ❌ non gestito | ❌ nessun `role="dialog"`, nessun focus trap |
| `BrowseIngredientsModal` | Non impostato | Righe espandibili **non raggiungibili da tastiera** (`div onClick`) | ❌ non gestito | Ha `role="dialog"`/`aria-modal` ma manca gestione tastiera completa |
| `SmartImportModal` | Non impostato | Bottone "Analizza" resta attivabile ma no-op quando vuoto | ❌ non gestito | Ha `role="dialog"`/`aria-modal`; drag&drop area (`onClick={openDropdown}`) è un `<button>`, ok da tastiera |
| `NutrientSelectModal` | Non impostato | Checkbox/bottoni nativi ok | ❌ non gestito | Nessun `role="dialog"` |
| `DownloadTableModal` | Non impostato | Bottoni nativi ok, `OptBtn` disabilitati con `title` esplicativo ✅ | ❌ non gestito | Ha `role="dialog"`/`aria-modal` |
| `ComponentCard` header (CalcoloTab) | — | ✅ `onKeyDown` gestisce Enter/Space, `role="button" tabIndex={0}` | n/a | Pattern corretto, buon esempio da replicare |
| `ArchivioTab` item (apri/elimina) | ❌ non focalizzabile | ❌ nessun `onKeyDown`, nessun `tabIndex` | n/a | Apertura e cancellazione **irraggiungibili da tastiera** |
| `BrowseIngredientsModal` riga espandibile | ❌ non focalizzabile | ❌ nessun `onKeyDown`/`role` | n/a | Dettagli ingrediente irraggiungibili da tastiera |
| `ToolsTab` tile | ✅ `tabIndex={isLocked?-1:0}` | ✅ `onKeyDown` Enter/Space | n/a | Pattern corretto |
| `m-section-tabbar` (tab nav mobile) | Bottoni nativi, `role="tab"`/`aria-selected` | ✅ | n/a | Manca `role="tablist"` sul contenitore? Verificato presente (`role="tablist"` su `<nav>`), ok |

### Priority Fixes

1. **Rendere tastiera-operabili `ArchivioTab.tsx` (apertura + eliminazione voce archivio) e la riga espandibile di `BrowseIngredientsModal.tsx`** — Affects: utenti da tastiera e screen reader; blocca completamente due funzioni core del tool (apri/elimina ricetta salvata, consulta dettagli ingrediente). Aggiungere `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space) sulle righe, ed esporre "Elimina" anche fuori dal long-press touch (es. bottone visibile o menu raggiungibile da tastiera).
2. **Correggere il contrasto testo-bianco-su-arancio nei bottoni primari** (`.btn-accent`, `.m-btn--accent`, `ConfirmDialog` in tutte le varianti, `sidebar-logo-mark`) — Affects: tutti gli utenti ipovedenti; impatta le call-to-action più usate del prodotto (salva, importa, conferma/elimina). Il rapporto reale è 2.54-4.13:1 contro il minimo 4.5:1.
3. **Aggiungere `role="dialog"`/`aria-modal`, gestione `Escape` e nome accessibile al bottone di chiusura di `CustomIngredientModal.tsx`** — Affects: screen reader users sul modal più usato per aggiungere/modificare ingredienti nel database; attualmente il modal non è annunciato come tale e il bottone di chiusura è un'icona muta.

### Non verificabile da codice statico

- **Focus visibile dinamico**: `src/index.css:1049-1055` definisce `:focus-visible` con outline arancio per `button/a/[role="button"]` — l'effettiva resa (contrasto dell'outline sui vari sfondi, comportamento su Safari/iOS) richiede verifica in browser reale.
- **Comportamento reale dello screen reader** (VoiceOver/NVDA/TalkBack) sugli attributi `title` usati come nome accessibile (Sidebar rail, `sidebar-flyout-logout`): l'algoritmo di accessible name lo prevede come fallback, ma la resa pratica varia tra combinazioni browser/AT e non è verificabile senza test reale.
- **Focus trap effettivo**: la mancanza di gestione esplicita del wrap Tab/Shift+Tab è verificabile da codice, ma il comportamento risultante (dove finisce il focus, se "scappa" visibilmente dietro l'overlay) va confermato in browser.
- **Zoom al 200%**: nessun meccanismo di layout responsivo specifico per lo zoom testo è presente nel codice (solo media query per viewport width); la rottura o meno del layout a zoom 200% richiede verifica visiva in browser.
- **Contrasto negli stati `:hover`/`:active` calcolati via JS o transizioni CSS** (es. `.tool-card:hover`, `.btn-accent:hover` con `opacity:0.92`): il valore effettivo dipende dal blending renderizzato dal browser e non è calcolabile in modo affidabile da solo codice statico.
- **Ordine di lettura reale dello screen reader** attraverso il DOM del componente `SplitShell` (colonna sinistra/destra) e dello slide-track mobile (`m-slide-track` con `transform: translateX`): la struttura DOM è lineare nel codice, ma la resa "percepita" con AT reale (specialmente per i pannelli fuori viewport nello slide mobile, che restano nel DOM ma sono `overflow:hidden`) andrebbe testata con screen reader reale per confermare che i pannelli non attivi non vengano letti/messi a fuoco.
- **Percentuale di contrasto sulle icone SVG lucide-react** dove il colore deriva da `currentColor` ereditato in cascata attraverso più livelli di componenti: alcuni valori calcolati sopra assumono la risoluzione finale della variabile CSS, ma casi di override inline non individuati da grep potrebbero cambiare il risultato reale.

---

## Agente 3 — Parità struttura desktop/mobile

Confronto basato su lettura diretta del codice (sola lettura, nessuna modifica). File analizzati:
- Desktop: `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` (2181 righe)
- Mobile: `src/calculators/NutrizionaleCalc/NutrizionaleCalcMobile.tsx` + `mobile/{CalcoloTab,TabellaTab,RiepilogoTab,ArchivioTab,ToolsTab}.tsx`
- Engine condiviso: `src/engines/nutrizionaleCalcEngine.ts`

### Tabella principale

| Funzione | Desktop (file/sezione) | Mobile (file/sezione) | Divergenza osservata | Severità |
|---|---|---|---|---|
| **Ricetta** | `NutrizionaleCalc.tsx` — `expertTab==='ricetta'` (riga 1569+), tab di 1° livello nel pannello sinistro dello SplitShell | `mobile/CalcoloTab.tsx`, tab `'ricetta'` di 1° livello (1 di 4 tab bottom bar) | Stesso livello gerarchico. Ma: checkbox `postCottura`/`acquaAggiunta` per riga (alcol/acqua) presenti solo su desktop; UI additivi mobile priva di campi grammi/€/kg/resa (sempre 0/100 hardcoded) | 🔴 |
| **Riepilogo** | `NutrizionaleCalc.tsx` — `expertTab==='riepilogo'` (riga 2003+), tab di 1° livello, stesso pannello di Ricetta | `mobile/RiepilogoTab.tsx`, tab `'riepilogo'` di 1° livello | Stesso livello. Ma: QUID mobile non applica la correzione acqua persa in cottura (`calcQuid` mai importato); totali peso/QUID/costi mobile ignorano completamente gli additivi (mai sommati) | 🔴 |
| **Mercati** | `NutrizionaleCalc.tsx` — `renderTablePanel()`, pannello destro **sempre visibile** dello SplitShell, non un tab | `mobile/TabellaTab.tsx`, tab `'mercati'` di 1° livello, **richiede navigazione esplicita** | Livello gerarchico diverso: su desktop è un pannello persistente affiancato alla ricetta (aggiornamento live), su mobile è uno schermo separato da raggiungere con swipe/tap, con selezione regione obbligatoria (`selectedRegion` parte da `null`) | 🟡 |
| **Archivio** | `NutrizionaleCalc.tsx` riga 1361 — bottone in topbar → modal overlay (righe 1486-1519), raggiungibile da qualunque tab | `mobile/ArchivioTab.tsx`, tab `'archivio'` di 1° livello (schermo pieno) | Livello gerarchico diverso (overlay globale vs tab dedicato). Divergenza funzionale: desktop chiede conferma prima di eliminare (`ConfirmDialog`/`openConfirm`), mobile elimina subito dal menu contestuale long-press senza conferma. Mobile ha ricerca testuale nell'archivio, desktop no | 🟡 |
| **Guida** | `NutrizionaleCalc.tsx` riga 1369-1372 — bottone topbar "Guida" → `WelcomeModal` (auto-show al primo accesso via `aea_welcome_seen`), + 9 `InfoTooltip` inline nel resto del componente | **Assente**: nessun `WelcomeModal`, nessun `InfoTooltip`, nessuna occorrenza di "guida"/"help"/"onboarding" in tutta la cartella `mobile/` | Funzione completamente assente lato mobile, non solo spostata di livello | 🔴 |
| **Database** | `NutrizionaleCalc.tsx` riga 1373-1402 — bottone topbar "Database" con dropdown: "Nuovo ingrediente" (`CustomIngredientModal`) + "Sfoglia database" (`BrowseIngredientsModal`, con modifica ingredienti custom/DB) | **Assente come funzione dedicata**: `mobile/CalcoloTab.tsx` ha solo `IngredientPickerModal` (ricerca + aggiungi a riga ricetta), nessun `CustomIngredientModal`, nessun `BrowseIngredientsModal`, nessuna via per creare/modificare un ingrediente custom | Funzione di gestione/creazione ingredienti custom completamente assente lato mobile (solo ricerca inline nested dentro Ricetta) | 🔴 |

### Dettaglio per funzione

#### Ricetta
- Desktop: `expertTab` di tipo `'ricetta' | 'riepilogo'` (NutrizionaleCalc.tsx:417), tab bar dedicata righe 1528-1546.
- Mobile: `MobileTab` include `'ricetta'` come primo elemento di `TAB_ORDER` (NutrizionaleCalcMobile.tsx:115,126).
- **Divergenza logica reale — flag `postCottura`**: desktop espone checkbox per riga quando `n(row.ing.alcol) > 0` (NutrizionaleCalc.tsx:1889-1896), collegata a `updateRowFlag` (riga 719). Il flag è **consumato** dall'engine: `calcNutrients` esclude dall'evaporazione alcolica le righe con `postCottura=true` (`src/engines/nutrizionaleCalcEngine.ts:171-172`). Su mobile non esiste alcun controllo equivalente in `mobile/CalcoloTab.tsx` (verificato: 0 occorrenze di `postCottura`/`acquaAggiunta` in tutta `mobile/`) — il campo resta sempre `undefined`, quindi su mobile ogni ingrediente alcolico è trattato come "pre-cottura" senza possibilità di correggere.
- **Divergenza logica reale — additivi non pesati**: desktop espone per riga additivo i campi grammi/€kg/resa (NutrizionaleCalc.tsx:1961,1970,1978) che alimentano `totAdditiveGramsXpzuv` (riga 593-594) sommato al peso totale. Mobile (`mobile/CalcoloTab.tsx:372-419`, componente `AdditiveSection`) espone **solo** i select Categoria/Nome — nessun input peso/costo/resa; il valore `grams` viene creato a `0` fisso in `NutrizionaleCalcMobile.tsx:275` (commento ponytail esplicito: "mobile additivi non pesati → 0/100"). Poiché `calcNutrients` include il peso additivi nel denominatore `peso_totale_pz` (engine riga 117-119: "Additivi: contribuiscono al peso crudo ma non ai nutrienti"), su desktop un additivo pesante puo' effettivamente diluire il risultato per-100g; su mobile questo non accade mai perché il peso è sempre 0.
- `acquaAggiunta` (checkbox condizionale per ingredienti con acqua>90%, NutrizionaleCalc.tsx:1898-1906) è catturato dall'engine (riga 106,114) ma **non consumato** in nessun calcolo attuale — divergenza di superficie (solo desktop la mostra) ma senza impatto sul risultato numerico allo stato attuale del codice.

#### Riepilogo
- Desktop: sezione `expertTab==='riepilogo'` (NutrizionaleCalc.tsx:2003-2125), usa `mergedIngredients` (righe 574-591) e `calcQuid` importato da engine (riga 42, usato righe 2011, 2061).
- Mobile: `mobile/RiepilogoTab.tsx`, usa `buildMergedIngredients` locale (righe 14-37) — implementazione **duplicata**, non condivisa con desktop.
- **Divergenza QUID (nota, confermata)**: desktop calcola `caloAcqua = totGrammiXpzuv > pesoFinitoPzCalc ? totGrammiXpzuv - pesoFinitoPzCalc : 0` (NutrizionaleCalc.tsx:2007) e usa `calcQuid(grammiXpzuv, isAcqua, caloAcqua, pesoFinitoPz)` (engine `nutrizionaleCalcEngine.ts:261-265`) che per l'ingrediente "acqua" sottrae l'acqua persa in cottura prima di calcolare la percentuale. Mobile (`RiepilogoTab.tsx:154`): `quid = pesoFinitoPz > 0 ? row.grammiXpzuv / pesoFinitoPz * 100 : 0` — nessuna sottrazione, nessun import di `calcQuid` (verificato: assente dagli import di `NutrizionaleCalcMobile.tsx:15-32`, che pure re-esporta `calcNutrients`/`scaleResult` ma non `calcQuid`). Per ricette con acqua come ingrediente e calo peso in cottura, il QUID dell'acqua (e quindi il totale) risulta sovrastimato su mobile rispetto a desktop.
- **Divergenza pesi/costi additivi**: `buildMergedIngredients` (mobile, riga 16-34) itera solo `comp.rows`, mai `comp.additiveRows` — additivi assenti dalla tabella Riepilogo mobile e dai relativi totali di peso/QUID/costo. Su desktop `mergedIngredients` (riga 574-591) ha la stessa limitazione strutturale (itera solo `c.rows`), ma il totale `totGrammiXpzuv` desktop (riga 596) **aggiunge esplicitamente** `totAdditiveGramsXpzuv`, mentre il totale mobile equivalente (`RiepilogoTab.tsx:66`, `merged.reduce(...)`) non lo fa mai. Conseguenza: se `pesoFinito` non è impostato, il fallback `pesoFinitoPz` (usato come denominatore QUID) differisce tra le due piattaforme per la stessa identica ricetta con additivi pesati (impossibile comunque da riprodurre su mobile visto il punto precedente sugli additivi non pesabili).
- Costi: entrambe le piattaforme calcolano `costoUV`/`costoKg` con la stessa formula (`fabb = grammiXpzuv / (resa/100)`, poi `* eurKg`), verificata identica riga per riga (NutrizionaleCalc.tsx:2016-2020 vs RiepilogoTab.tsx:73-79) — nessuna divergenza qui a parte l'esclusione additivi già citata.

#### Mercati
- Desktop: `renderTablePanel()` (funzione interna, invocata come `right={renderTablePanel()}` in `SplitShell`, NutrizionaleCalc.tsx:2132) — pannello **sempre montato e visibile** in colonna destra, indipendentemente da quale `expertTab` (Ricetta/Riepilogo) sia attivo a sinistra. Selettore nazione (`activeTab`: UE/USA/Canada/Australia/Arabi) è un segmented control interno al pannello (righe 1116-1128), non un tab di navigazione dell'intera vista.
- Mobile: `mobile/TabellaTab.tsx`, montato come **pannello separato** nello slide-track a 4 pannelli (`NutrizionaleCalcMobile.tsx:377-402`), raggiungibile solo cambiando `activeTab` a `'mercati'`. All'interno, `selectedRegion` (TabellaTab.tsx:226) parte da `null` — l'utente deve scegliere esplicitamente una regione tra le 5 (`REGIONS`, righe 29-34) anche se arriva da un salvataggio precedente in cui la regione è nota (mitigato solo da `initialRegion` prop quando arriva dall'archivio).
- Divergenza di **gerarchia di navigazione**, non di componente: entrambe usano `TabUE`/`TabUSA`/`TabCanada`/`TabAustralia`/`TabArabi` condivisi (fuori scope di questo confronto, come da istruzioni — tabelle "intoccabili"), quindi il contenuto della singola tabella è identico; cambia solo il contesto (sempre visibile vs tab da raggiungere) in cui l'utente lo incontra.

#### Archivio
- Desktop: bottone topbar "Archivio" (riga 1361-1364) → `archiveOpen` → modal fixed-overlay (righe 1486-1519), sovrapposto a qualunque `expertTab` attivo; non è raggiungibile da bottom-bar mobile perché il layout desktop non ha bottom-bar.
- Mobile: tab dedicato `'archivio'` (NutrizionaleCalcMobile.tsx:404-411, componente `ArchivioTab`), stesso livello di Ricetta/Riepilogo/Mercati nella tab bar inferiore.
- **Divergenza eliminazione**: desktop apre `ConfirmDialog` con `variant:'danger'` e messaggio esplicito prima di cancellare (NutrizionaleCalc.tsx:1512, `openConfirm({...onConfirm: () => { closeConfirm(); deleteItem(item.id); }})`). Mobile: `handleDelete` (ArchivioTab.tsx:82-85) chiama `onDelete(id)` **immediatamente** al tap su "Elimina" nel context-menu long-press, senza alcuna conferma intermedia.
- **Divergenza ricerca**: mobile ha una barra di ricerca testuale sull'archivio (ArchivioTab.tsx:92-105, filtro su `item.name`); desktop non ha alcun filtro/ricerca nella lista archivio (righe 1486-1519, semplice `.map` su `archiveItems`).
- Interazione: mobile usa tap-per-aprire + long-press (500ms, righe 51-58) per menu contestuale Apri/Elimina; desktop usa due bottoni sempre visibili "Carica"/"Elimina" per riga (righe 1511-1512). Pattern di interazione diversi per la stessa azione.

#### Guida
- Desktop: bottone topbar dedicato (NutrizionaleCalc.tsx:1369-1372, icona `BookOpen`, label "Guida") che apre `WelcomeModal` (`src/components/WelcomeModal.tsx`, 3 slide di onboarding: come funziona il calcolatore, dove trovare i valori nutrizionali, ecc.). Il modal si apre automaticamente al primo accesso tramite `useLocalStorage('aea_welcome_seen', false)` (NutrizionaleCalc.tsx:414-415).
- Mobile: **nessuna occorrenza** di `WelcomeModal`, "guida", "help", "onboarding" in `NutrizionaleCalcMobile.tsx` o in `mobile/*.tsx` (grep su tutta la cartella: 0 risultati). `WelcomeModal.tsx` è importato in un solo punto di tutto il repo — `NutrizionaleCalc.tsx:21` — confermando che non esiste alcun consumer mobile.
- Aggravante: desktop ha anche 9 istanze di `InfoTooltip` sparse nel componente (contatore via grep) per spiegazioni contestuali puntuali (es. QUID, Cup, ecc. — vedi riga 2055); mobile ne ha 0. La funzione "Guida" non è solo spostata di livello gerarchico: è **assente sia come onboarding strutturato sia come aiuto contestuale diffuso**.

#### Database
- Desktop: bottone topbar "Database" con dropdown (righe 1373-1402) → due azioni: "Nuovo ingrediente" (`setShowCustomModal(true)`, apre `CustomIngredientModal` — form completo con nome, categoria, prezzo, tutti i macro/micronutrienti, fonte dati) e "Sfoglia database" (`setShowBrowseModal(true)`, apre `BrowseIngredientsModal` con possibilità di editare un ingrediente esistente tramite `onEditIngredient` → riapre `CustomIngredientModal` in modalità modifica, righe 1437-1452).
- Mobile: la sola funzionalità di ricerca ingredienti presente è `IngredientPickerModal` interno a `mobile/CalcoloTab.tsx` (righe 67-345), **nested dentro il tab Ricetta**, raggiungibile solo quando si aggiunge una riga a un componente. Permette esclusivamente ricerca (`searchDB`, righe 33-52) e selezione tra ingredienti esistenti nel DB — nessun form di creazione, nessuna vista di sfoglia/gestione, nessuna modifica.
- Verificato con grep su tutta `mobile/`: 0 occorrenze di `CustomIngredientModal`, `BrowseIngredientsModal`, `addCustomIngredient`, "nuovo ingrediente". La funzione "Database" come gestione/creazione ingredienti custom non esiste in nessuna forma sul mobile — non è nascosta più in profondità, è assente.

### Non verificabile da codice statico

- **Percezione reale della gerarchia visiva**: la co-presenza di Ricetta+Mercati in split-view desktop è strutturalmente "più in vista" della tabella nutrizionale rispetto al tab separato mobile, ma se l'utente *percepisce* effettivamente questa differenza di enfasi (o se su schermi desktop piccoli il pannello destro viene scrollato fuori vista comunque) richiede test visivo reale, non deducibile dal solo JSX/CSS inline letto.
- **Usabilità del long-press mobile per l'archivio**: se il gesto a 500ms per aprire il context-menu (Apri/Elimina) sia scopribile dall'utente medio senza affordance visiva esplicita (nessun'icona "..." visibile) è una domanda di usabilità che richiede test con utenti reali.
- **Impatto pratico della mancanza di "Database" su mobile**: quanto spesso gli utenti reali necessitano di inserire un ingrediente custom mentre sono su mobile (vs. rimandare al desktop) non è deducibile dal codice — è una domanda di frequenza d'uso reale.
- **Leggibilità/contrasto colori** dei badge regione in ArchivioTab (`m-archive-badge--{region}`) e dei chip allergeni: le classi CSS non sono state ispezionate in questo confronto (fuori scope, richiederebbe apertura dei fogli di stile mobile), quindi non è verificato se rispettano gli stessi contrasti minimi del desktop.
- **Percezione del gap "Guida"**: se l'assenza di onboarding su mobile sia effettivamente un problema per gli utenti (che magari arrivano già formati da desktop) o irrilevante, richiede dati d'uso reali, non deducibile staticamente.

---

## Agente 4 — Audit microcopy

Perimetro analizzato: `NutrizionaleCalcMobile.tsx`, `mobile/{CalcoloTab,TabellaTab,RiepilogoTab,ArchivioTab,ToolsTab}.tsx`, `Tab{UE,USA,Canada,Australia,Arabi}.tsx`, `CustomIngredientModal.tsx`, `BrowseIngredientsModal.tsx`, `DownloadTableModal.tsx`, `NutrientSelectModal.tsx`, `SmartImportModal.tsx`, `SplitShell.tsx` (nessun testo utente — solo layout).

Nota di metodo: le tabelle ufficiali `TabUE/USA/Canada/Australia/Arabi` riproducono formati normativi (EU 1169/2011, FDA, Health Canada, FSANZ, Gulf Standard) — le etichette dei nutrienti lì dentro non sono microcopy libera e non vengono messe in discussione, salvo un caso di stringa di fallback non normativa (vedi tabella "Coerenza del tono").

### Stringhe duplicate/incoerenti

| Concetto | Variante 1 (file:riga) | Variante 2 (file:riga) | Riscrittura unificata proposta |
|---|---|---|---|
| Nome del tab "Ricetta" nei messaggi di errore | `mobile/TabellaTab.tsx:281` — `'Inserisci la denominazione nel tab Calcolo.'` e `mobile/TabellaTab.tsx:378` — `'Aggiungi almeno un ingrediente nel tab Calcolo prima di generare la tabella.'` | `mobile/RiepilogoTab.tsx:59` — `'Aggiungi ingredienti nella scheda Ricetta per vedere il riepilogo.'` (corretto: la tab bar in `NutrizionaleCalcMobile.tsx:314` etichetta quella sezione **"Ricetta"**, non "Calcolo" — "Calcolo" è solo il nome del file `CalcoloTab.tsx`) | Sostituire ovunque con **"…nella scheda Ricetta…"**. Il nome interno del componente non deve trapelare nel copy utente. |
| Nome del tab "Mercati" nei messaggi di stato vuoto | `mobile/ArchivioTab.tsx:118` — `'Salva un calcolo dalla scheda Tabella per trovarlo qui.'` | Tab bar reale: `NutrizionaleCalcMobile.tsx:316` — `label: 'Mercati'` (il file si chiama `TabellaTab.tsx` ma l'utente non vede mai la parola "Tabella" come nome di sezione) | **"Salva un calcolo dalla scheda Mercati per trovarlo qui."** |
| Naming della funzione "import intelligente" | `mobile/CalcoloTab.tsx:747` — `Importa ricetta` (bottone strip) e `mobile/CalcoloTab.tsx:805` — `Inizia l'import intelligente` (bottone hero) | `SmartImportModal.tsx:670` — `Import intelligente ricetta` (titolo modale) | Uniformare su un solo termine, es. **"Importazione ricetta"** ovunque (bottoni + titolo modale), evitando l'alternanza italiano "Importa"/anglicismo "Import". |
| Messaggio di ricerca senza risultati — livello di aiuto diverso | `mobile/CalcoloTab.tsx:189` (IngredientPickerModal) — `Nessun risultato per "{q}"` (nessun suggerimento) e `BrowseIngredientsModal.tsx:322` — `Nessun ingrediente trovato.` (nessun suggerimento) | `mobile/ArchivioTab.tsx:114-119` — `'Nessun risultato per questa ricerca'` + `'Prova con un termine diverso.'` (pattern completo: cosa + come procedere) | Applicare lo stesso pattern a tutte le ricerche vuote: **"Nessun risultato per «{q}». Prova con un altro termine o aggiungi l'ingrediente al database personale."** |
| Verbosità degli stati di caricamento | `SmartImportModal.tsx:330` — `Caricamento…` (bottone import Excel) e `DownloadTableModal.tsx:258` — `Generazione…` (bottone download PNG) | `mobile/CalcoloTab.tsx:764` — `Caricamento database ingredienti…` (specifica cosa sta caricando) | Rendere specifico anche gli altri due: **"Lettura file…"** e **"Generazione immagine…"** — coerenza con il pattern "di' cosa sta succedendo", non solo "Caricamento". |
| Spiegazione del disabled sui formati (desktop vs mobile) | `mobile/TabellaTab.tsx:66` — messaggio generico unico: `'Inserisci prima il peso corrispondente nelle porzioni'` per qualunque opzione disabilitata | `DownloadTableModal.tsx:180,187,194,220,227,234` (desktop) — messaggio specifico per ogni campo, es. `"Inserisci il peso confezione nel pannello Porzioni (a destra) per abilitare"` | Portare sul mobile la stessa specificità desktop, es. **"Inserisci prima il peso Confezione qui sopra"** / **"…il peso Pezzo…"** invece del generico "il peso corrispondente". |
| Simbolo "obbligatorio" (*) usato su un campo dichiarato facoltativo | `CustomIngredientModal.tsx:353` — legenda: `* Obbligatorio` | `CustomIngredientModal.tsx:432` — label del campo Fibre: `"* Fibre alimentari (altamente consigliato, anche se non obbligatorio in base al Reg. UE 1169/2011)"` — usa il prefisso "*" (= obbligatorio per legenda) ma il testo dice esplicitamente il contrario; conferma nel codice: `handleSave` (righe 224-234) non include `fibre` tra i campi obbligatori | Cambiare prefisso da "*" a "○" (facoltativo) o "△" (condizionale), es. **"○ Fibre alimentari (altamente consigliata)"** — il simbolo deve essere coerente con la validazione reale, non solo col testo tra parentesi. |

### Errori assenti o generici

| file:riga | Situazione | Messaggio attuale (se esiste) | Messaggio proposto |
|---|---|---|---|
| `DownloadTableModal.tsx:96` | `previewRef.current` è null al momento del download (edge case tecnico) | `'Tabella non trovata.'` | "Impossibile trovare la tabella da esportare. Chiudi e riapri la finestra di download e riprova." |
| `DownloadTableModal.tsx:108` | `html2canvas` lancia eccezione durante l'export PNG | `"Errore durante l'esportazione della tabella in PNG."` | "Esportazione PNG non riuscita. Se il problema persiste, prova a ridurre le opzioni nutrienti selezionate o ricarica la pagina." (what+why+how) |
| `SmartImportModal.tsx:558` | `importFromExcel` lancia un'eccezione senza `message` utile | `'Errore durante la lettura del file.'` (fallback generico) | "File non leggibile. Verifica che sia un .xlsx generato dal Programma Excel AEA e riprova." |
| `mobile/CalcoloTab.tsx:187-190` (IngredientPickerModal) | Ricerca ingrediente senza risultati | `Nessun risultato per "{q}"` (nessuna azione suggerita) | 'Nessun risultato per "{q}". Prova un altro termine o aggiungi l'ingrediente dal database personale.' |
| `BrowseIngredientsModal.tsx:320-323` | Filtro "Sfoglia ingredienti" senza risultati | `Nessun ingrediente trovato.` | "Nessun ingrediente trovato. Modifica la ricerca o disattiva 'Solo personali'." |
| `SmartImportModal.tsx:362-383` (PhaseInput) | Bottone "Analizza ricetta" con textarea vuota: nessun `disabled` HTML, nessun tooltip — al click semplicemente non succede nulla (`onClick={!isEmpty ? onAnalyze : undefined}`) | Nessun messaggio — fallimento silenzioso | Aggiungere `disabled={isEmpty}` reale + `title="Incolla il testo della ricetta per continuare"`, così lo stato è comunicabile anche a screen reader/tooltip, non solo tramite colore. |

### Bottoni disabled senza spiegazione

| file:riga | Bottone | Condizione di disabled | Spiegazione proposta da mostrare |
|---|---|---|---|
| `mobile/CalcoloTab.tsx:927-935` | `"Vai a Mercati"` (CTA bar fondo schermo, tab Ricetta) | `disabled={!hasIngredients}` — nessun `title` né testo di supporto | Aggiungere `title="Aggiungi almeno un ingrediente per continuare"` (pattern già usato altrove nell'app, es. `SegmentedControl` in `mobile/TabellaTab.tsx:66`) |
| `mobile/ToolsTab.tsx:42-64` | Tile strumento non acquistato (`m-tool-tile--locked`, `tabIndex={-1}`) | `!purchasedTools.includes(tool.id)` — il tap non fa nulla (`handleTileTap` righe 32-36 esce silenziosamente), nessun testo/icona lucchetto spiega perché | Aggiungere un badge testuale visibile (non solo stile CSS), es. **"Da acquistare"**, più `aria-label="{tool.label} — strumento non acquistato"` e magari un link/CTA verso lo store invece del tap muto. |
| `SmartImportModal.tsx:362-383` | `"Analizza ricetta"` (fase input, textarea vuota) | Nessun attributo `disabled` reale, solo stile grigio + `cursor:not-allowed` via CSS inline; interazione bloccata via `onClick={undefined}` | `title="Incolla il testo della ricetta prima di analizzare"` + `disabled` HTML reale (anche per screen reader) |

### Coerenza del tono

Il pubblico dichiarato sono consulenti alimentari professionisti — tono atteso professionale/tecnico. Alcuni punti rompono il registro:

1. **Emoji decorativa in un CTA primario** — `mobile/CalcoloTab.tsx:748`: `<span style={{ fontSize: 12, opacity: 0.85 }}>✨</span>` accanto a "Importa ricetta". Per un tool regolatorio (etichette conformi Reg. 1169/2011) l'emoji "scintillio" comunica un tono da app consumer/gamification, non da strumento professionale. Rimuovere o sostituire con l'icona `Sparkles` già usata altrove (coerente, non emoji Unicode).

2. **Copy da landing page marketing dentro il flusso di lavoro** — `mobile/CalcoloTab.tsx:787-806`: blocco hero "Importazione intelligente" / "Incolla la ricetta — abbino gli ingredienti al database in automatico" / bottone "Inizia l'import intelligente" con gradiente arancione e shadow vistosa. Il tono "smart/automatico" ripetuto 3 volte in poche righe (intelligente × 2, automatico) è più da onboarding SaaS consumer che da tool per consulenti che già conoscono il dominio. Un consulente non ha bisogno di essere "venduto" sull'AI, ma di sapere cosa fa: es. **"Importa ricetta da testo o Excel — gli ingredienti vengono abbinati automaticamente al database."** (una sola menzione dell'automazione, tono descrittivo non promozionale).

3. **Mescolanza IT/EN in una stringa non normativa** — `TabAustralia.tsx:119`: `"Inserire il valore serving size sopra per calcolare le quantità per porzione."` — a differenza del resto della UI mobile (che per l'Australia usa il campo "Serving (g)" ma tutte le istruzioni sono in italiano puro, es. `mobile/TabellaTab.tsx:692` "Porzioni Australia"), qui il termine inglese "serving size" compare dentro una frase italiana di istruzione (non è testo della tabella ufficiale, che è in inglese per normativa — questo è un placeholder di stato applicativo). Riscrivere in italiano puro: **"Inserisci il peso della porzione (Serving) qui sopra per calcolare i valori."**

4. **Coerenza positiva da preservare** — il messaggio d'errore del database ingredienti (`NutrizionaleCalcMobile.tsx:141`: `'Impossibile caricare il database. Ricarica la pagina.'`) e i `disabledReason` di `DownloadTableModal.tsx` seguono correttamente il pattern "cosa è successo + come risolvere": vanno usati come modello per correggere gli altri casi elencati sopra, non riscritti.

---

## Priorità trasversali

Problemi che emergono da **più di un agente**, sullo stesso file o sullo stesso concetto, osservati da angolazioni diverse (token, accessibilità, struttura, copy). Un problema visto da 2+ prospettive indipendenti è più affidabile di un singolo finding isolato, e indica un punto dove un solo intervento risolve più categorie di debito insieme.

### 🔴 1. `mobile/CalcoloTab.tsx` — il file più problematico dell'intero tool, su tutti e 4 gli assi

Tutti e 4 gli agenti, indipendentemente, hanno trovato problemi in questo singolo file:
- **Token** (Agente 1): 13 istanze hex pure di `#ff7e2e`/`#dd5c0c` senza `var()`, più 3 fallback CSS diversi e tutti sbagliati per lo stesso token `--m-border` (`#eee`, `#ddd`, `#e0e0e0` — nessuno dei tre è il valore reale `#e8e0d8`).
- **Accessibilità** (Agente 2): 5 touch target sotto 44×44px (bottone chiudi picker, chevron riga, rimuovi ingrediente/additivo/componente), nessun focus trap nel modal ricerca ingredienti.
- **Struttura/dati** (Agente 3): additivi strutturalmente "non pesabili" (`grams` sempre 0) — bug di correttezza numerica, non solo UX, che rende i risultati nutrizionali potenzialmente diversi tra desktop e mobile per la stessa ricetta.
- **Copy** (Agente 4): emoji "✨" fuori registro nel CTA principale, blocco hero con tono da marketing consumer, bottone "Vai a Mercati" disabled senza spiegazione.

Non è un caso isolato di scarsa cura: è il componente dove più persone/momenti diversi hanno costruito senza riferirsi a un sistema condiviso (token, engine, pattern di accessibilità) già esistente altrove nel repo.

### 🔴 2. QUID e additivi su mobile — bug di correttezza dati, non solo di parità (Agente 3)

Trovato da un solo agente (parità struttura) ma di severità superiore alla maggior parte dei problemi trovati da più agenti, perché non è un problema di percezione/coerenza ma di **numeri diversi tra le due piattaforme per la stessa identica ricetta**:
- Mobile non importa mai `calcQuid` dall'engine → QUID dell'acqua sovrastimato ogni volta che c'è calo peso in cottura (stesso bug già corretto sul desktop in questa sessione, mai propagato al mobile).
- Additivi mobile sempre a peso 0 → non entrano nel denominatore del calcolo nutrizionale, a differenza del desktop dove un additivo pesante può diluire il risultato per-100g.

Questo tocca direttamente la Fascia 1 della roadmap in `CONSOLIDAMENTO.md` ("fiducia nei numeri, blocca la vendita se sbagliato") — è lo stesso tipo di rischio del bug QUID desktop già risolto, ma sul mobile, e più esteso (tocca anche gli additivi, non solo l'acqua).

### 🟡 3. `CustomIngredientModal.tsx` — il modal più usato, con problemi su 3 assi

Agente 1 (token: `#c53030` hardcoded, nessuna corrispondenza con `--color-danger`), Agente 2 (accessibilità: nessun `role="dialog"`, nessuna gestione Escape, bottone chiudi senza `aria-label` — 3 dei 6 finding "Critical" del report vengono da qui), Agente 4 (copy: simbolo "*" obbligatorio su un campo che il codice stesso tratta come facoltativo — incoerenza tra ciò che l'utente legge e ciò che l'app effettivamente richiede).

È il form dove un consulente inserisce dati nutrizionali a mano — l'incoerenza tra simbolo "*" e validazione reale (Agente 4) non è solo un dettaglio di copy: può far compilare all'utente un campo che l'app non richiede, o saltarne uno che invece serve, sulla base di un'informazione visiva sbagliata.

### 🟡 4. `SmartImportModal.tsx` / bottone "Analizza ricetta" — stesso bug, 2 skill diverse

Agente 2 (accessibilità) e Agente 4 (copy) hanno individuato, **indipendentemente e con framework diversi**, esattamente lo stesso problema sulla stessa riga di codice (`SmartImportModal.tsx:362-383`): il bottone non usa l'attributo HTML `disabled`, ma un `onClick={undefined}` condizionale — quindi appare visivamente disattivato (stile grigio) ma resta interattivo per tastiera/screen reader, e non spiega mai perché non risponde. Quando due skill indipendenti (WCAG e UX writing) arrivano alla stessa riga di codice per motivi diversi, è un segnale forte che il pattern usato lì (finto-disabled via `onClick` condizionale invece di `disabled` reale) è sbagliato strutturalmente, non solo in quel punto — vale la pena controllare se lo stesso pattern esiste altrove nel tool.

### 🟡 5. `mobile/TabellaTab.tsx` — token sbagliati + contrasto insufficiente sullo stesso testo

Agente 1 ha trovato che il fallback `var(--m-text-muted, #5e6b80)` usato qui è sbagliato (il valore reale è `rgba(12,19,38,.45)`, diverso). Agente 2, calcolando il contrasto sul valore *reale* (non sul fallback), ha trovato che **anche il valore corretto fallisce** il contrasto WCAG (3.00:1 contro 4.5:1 richiesto) sulle etichette 10-11px dove è usato. Questo significa che sistemare solo il fallback (problema di Agente 1) non basterebbe a risolvere il problema di leggibilità reale (problema di Agente 2): serve un valore diverso, non solo un riferimento corretto al token esistente. Stesso file ha anche 2 finding di copy indipendenti (Agente 4): nomi di sezione sbagliati nei messaggi di errore ("tab Calcolo"/"scheda Tabella" invece di "Ricetta"/"Mercati") e messaggio disabled generico rispetto all'equivalente desktop.

### 🟡 6. Il colore arancio brand (`#ff7e2e` / `--color-orange` / `--m-orange`) è insieme il più usato e il più fuori standard

Non è un singolo file ma un tema trasversale a tutto l'audit: è il valore più diffuso nel tool (25 occorrenze dirette, Agente 1), usato in modo incoerente (metà volte come hex puro, metà come `var()`, con fallback che a volte coincidono col valore vero e a volte no), **e** fallisce sistematicamente il contrasto WCAG ovunque sia usato come testo-su-bianco o bianco-su-arancio (2.54:1, Agente 2, su tutti i bottoni primari e su `ConfirmDialog`). È il singolo colore che, se rivisto, tocca contemporaneamente il finding più esteso di Agente 1 e la criticità più grave di Agente 2.

### Osservazioni a margine non ricorrenti tra agenti ma rilevanti per la prossima fase

- **Mobile duplica invece di condividere**: emerge trasversalmente dai report di Agente 1 (3 sistemi di token paralleli invece di uno) e Agente 3 (`buildMergedIngredients` reimplementato invece di riusare la logica desktop, `calcQuid` mai importato pur essendo disponibile) — non è un singolo bug ma un pattern: il mobile è stato costruito come implementazione parallela del desktop più che come sua estensione condivisa. Rilevante per decidere, nella prossima fase, se il design system e la logica di calcolo vadano unificati prima di ridisegnare la UI, non dopo.
- **"Guida" e "Database" assenti su mobile** (Agente 3) non si sovrappongono con altri agenti per costruzione (non c'è token, contrasto o copy da valutare su una funzione che non esiste), ma sono tra i finding di severità 🔴 più diretti dell'intero audit e vanno letti insieme al punto precedente: non è chiaro se l'assenza sia una scelta di scope mobile deliberata o un semplice gap di sviluppo mai colmato.
