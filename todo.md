# TODO — AEA Consulenze Alimentari

> Aggiorna dopo ogni sessione. All'inizio di ogni sessione: "Leggi CLAUDE.md e todo.md."
> ID univoci per riferimento in chat (es: "lavoriamo su BUG-1").

---

## MOB-PARITY — Parità Desktop/Mobile NutrizionaleCalc
### Fase 5 — Session Bridge desktop↔mobile (COMPLETATA — 2026-05-30)
- [x] **MOB-P5-1** — sessionBridge.ts: persistenza stato in localStorage (`nut_session_draft`)
- [x] **MOB-P5-2** — Desktop scrive bridge al load da archivio (`handleLoad`)
- [x] **MOB-P5-3** — Mobile legge bridge al mount (dopo DB load) e ricostruisce componenti

### Fase 4 — Ristrutturazione UI (COMPLETATA — 2026-05-30)
- [x] **MOB-P4-1** — Tab bar rinominata: Ricetta | Riepilogo | Mercati | Archivio (Tools rimosso)
- [x] **MOB-P4-2** — Logo AEA tappabile → naviga a /dashboard (accesso strumenti)
- [x] **MOB-P4-3** — Nuovo tab Riepilogo: tabella ingredienti (Quantità/Costi), card costi, allergenici
- [x] **MOB-P4-4** — Tab Mercati: chip region compatti (EU|US|CA|AU|AR) invece dei tile grandi


Spec: `docs/superpowers/specs/2026-05-30-mobile-parity-design.md`
Obiettivo: NutrizionaleCalcMobile = NutrizionaleCalc al 100%.

### Fase 1 — Fix TabellaTab + Tabelle CA/AU/Arabi (COMPLETATA — 2026-05-30)

- [x] **MOB-P1-0** — Ricerca ingredienti da DB → calcolo automatico in CalcoloTab
- [x] **MOB-P1-1** — Estrai `TabCanada.tsx` come file condiviso
- [x] **MOB-P1-2** — Estrai `TabAustralia.tsx` come file condiviso
- [x] **MOB-P1-3** — Estrai `TabArabi.tsx` come file condiviso
- [x] **MOB-P1-4** — Espandi `MobileNutForm` con serving sizes per tutte le 5 regioni + specificGravity
- [x] **MOB-P1-5** — Riscrivi `TabellaTab.tsx`: EU sub-tab selector, USA layout/measure/servingRef, CA/AU/Arabi tabelle + configuratori
- [x] **MOB-P1-6** — Build + verifica TypeScript pulito
- [x] **MOB-P1-7** — Deploy Vercel produzione (2026-05-30)

### Fase 2 — CalcoloTab avanzato (COMPLETATA — 2026-05-30)

- [x] **MOB-P2-1** — Multi-componente: `MobileComponent[]` con nome, pzUV, rows, additiveRows
- [x] **MOB-P2-2** — Campo resa % per ingrediente (default 100%, espandibile per riga)
- [x] **MOB-P2-3** — Campo peso finito prodotto (pesoFinito_g in MobileNutForm)
- [x] **MOB-P2-4** — Additivi: sezione collassabile per componente (categoria + nomeSpecifico)
- [x] **MOB-P2-5** — Campo costo EUR/kg per ingrediente (espandibile per riga)

### Fase 3 — Feature complete (COMPLETATA — 2026-05-30)

- [x] **MOB-P3-1** — Allergenici: calcolo automatico da ingredienti DB (presenti + tracce), chip colorati in TabellaTab
- [x] **MOB-P3-2** — Optional nutrients: NutrientSelectModal in TabellaTab mobile (pulsante "Nutrienti" nella vista EU)
- [x] **MOB-P3-3** — Peso specifico (SG): campo in CalcoloTab, passa a TabUE/TabUSA/TabArabi

---


## FIX AUDIT AGENTI — 2026-07-31

- [x] **FIX-U1** — Import PlusCircle inutilizzato in `NutrizionaleCalc.tsx` — già rimosso
- [x] **FIX-U3** — `.ing-delete-btn` touch target: aggiunto `min-width/min-height: 44px` in `index.css:2132`
- [x] **FIX-U4** — `DownloadTableModal` OptBtn: `padding: 3px 8px → 8px 10px`, `font: 11 → 13` in `DownloadTableModal.tsx:36`
- [x] **FIX-U5** — Logout avatar mobile senza conferma: aggiunto `ConfirmDialog` in `MobileShell.tsx`
- [x] **FIX-U6** — Pulsante "Vai a Mercati" muto su mobile: aggiunto notice inline in `CalcoloTab.tsx:810`
- [x] **FIX-CalcoloTab** — Input grammi: rimosso `width:58 / fontSize:12 / padding:3px` inline → `className="form-input ing-input"` + rimosso override `style={{width:24,height:24}}` su `.ing-delete-btn` in `CalcoloTab.tsx:89`
- [x] **TEST-2** — 16 test su `calcClaims` aggiunti a `nutrizionaleCalcEngine.test.ts`: fibre (3/6g), sodio (120mg ≤), zuccheri (5g/2.5g liquido), grassi (3g/1.5g liquido), proteine (12%/20% kcal), energyKcal=0 safe. 290/290 main verde.
- [x] **FIX-D1** — DB `petto di pollo senza pelle`: grassi 3→1.9g, saturi 0.8→0.5g, monoins 1.06→0.67g, polins 0.59→0.37g. Fonte CREA BDA 2019. kcal/kJ invariati (corretti).
- [x] **FIX-D2** — DB `stoccafisso ammollato`: kcal 114.22→92, kj 481.94→390 (allineati a macro dichiarati: 0.9g grassi + 0.3g carbo + 20.7g prot). DB `fragoline al naturale`: kcal 236.12→214, kj 998.64→907 (EU: 50*4+5*2+1*4).
- [x] **FIX-D3** — DB acidi organici: 15 ingredienti aggiornati in `ingredientsDB.json`. Aceti (aceto vino bianco/rosso 6%/8%, mele): 5–8g acido acetico. Balsamici (5 varianti 19–55%): 5g. Agrumi (limone intero 5.7g, lime 5g, ribes rosso 6.3g). Derivato da reverse engineering kcal precompilato vs macro.
- [x] **GUIDA-1** — Onboarding mobile: `WelcomeModal` (già mobile-ready: maxWidth 420, padding 16) aggiunto a `NutrizionaleCalcMobile.tsx`. Stessa chiave `aea_welcome_seen` del desktop — se visto su un device non riappare sull'altro. Opzione "Non mostrare più" funzionante.

---

## BUG — Da correggere (viola CLAUDE.md)

- [x] **BUG-1** — Sostituire `prompt()` / `alert()` / `confirm()` nativi con pattern
      UI coerenti (modale inline o notifica). Completato 2026-09-03:
      TrattamentoTermicoCalc + EtichetteViniCalc migrati a PromptDialog/ConfirmDialog/toast.
      EtichetteCalc + NutrizionaleCalc erano già migrati. ArchiveModal/SavedTablesModal
      non usano native dialog. Nessun residuo rimasto nel codebase.

---

## CRITICO — Decisione pre-commercializzazione

- [ ] **AUTH-1** — Pianificare backend reale (JWT/OAuth2) prima di uso commerciale.
      Auth attuale è mock frontend-only, password in chiaro in localStorage.
      Aggiornamento 2026-07-29: backend Django collegato e funzionante (vedi S0), ma
      esiste un solo utente reale (`admin@aea.it`) — mancano gli account clienti.
- [ ] **AUTH-2** — Go-live Django: rimuovere fallback mock in `src/api/auth.ts`
      (apiLogin catch→MOCK_USERS, apiMe catch→aea_user cache). aea_user è manipolabile
      da console → role admin lato client. Marcato con TODO go-live (audit 2026-07-17).
      Bloccato da AUTH-1 (senza account clienti reali, rimuovere il mock blocca tutti).

      **Piano pianificato 2026-07-29 (stima ~2,5-3h):**
      - A. Decisione: niente self-signup, account creati da staff via Django admin (già pronto in `apps/users/admin.py`) — 5 min
      - B. Migrare/creare utenti reali in Django con ruolo + `purchased_tools` — 25-45 min
      - C. Rimuovere fallback mock in `auth.ts`, decidere sorte bottone "Entra come Demo", tsc+lint+test — 45 min
      - D. Test end-to-end: login per ogni ruolo, gating strumenti, logout/sessione scaduta — 45 min
      - E. Deploy + verifica prod (stesso pattern S0) — 20 min
      - Escluso: reset password via email (+2-4h, serve provider email non configurato), S8 GDPR (separato), import massivo clienti reali (scoping a parte)
- [x] **TAB-UNIFY** — COMPLETATO 2026-07-17: tabelle Canada/Australia/Arabi unificate
      sui file condivisi Tab{Canada,Australia,Arabi}.tsx (sorgente normativa = versione
      desktop, come deciso). Inline desktop rimosse (~476 righe), snapshot di guardia
      in TabIntl.test.tsx. Prop `full`/`setSubTab` eliminate (header mobile era dead code).
- [x] **DOC-1** — Aggiornati CLAUDE.md e skill nutritional-calc (2026-09-03): rimossi
      riferimenti a `nutritionalEngine.ts` e `localizationModule.ts` (già non esistono
      nel filesystem). Engine canonico documentato correttamente.

---

## ALTA PRIORITÀ

- [x] **ETI-1** — Gap analysis EtichetteCalc + remediation (2026-08-24, report:
      `docs/superpowers/specs/2026-08-24-etichette-gap-report.md`). Fatto: A1-A7,
      fronte/retro configurabile, export PNG separati, EAN-13, tabella nutrizionale
      auto-scalata (ScaleToFit), dizionario materiali imballo, fix crash ricette legacy
      (schema `components`/`componenti`). Dal report, tutti i 5 punti alta priorità
      chiusi in sessione: sedano/senape/sesamo in `ALLERGEN_FIELDS` (shared/constants.ts,
      `npm test` verde — Nutrizionale intatto), claims + minerali/vitamine ≥15%AR ora
      renderizzati in etichetta/PDF, additivi non più scartati dalla lista ingredienti
      (M5), scheda PDF versionata per grafico/tipografia (M6, riusa `generateEtichettaPDF`
      mai usato prima), regex solfiti fix (B-e), ordinamento acqua su QUID non peso
      grezzo (B-d), hardening `Array.isArray` su `db`/`componenti` + `componentStack`
      nell'ErrorBoundary. `npx tsc -b` pulito, 290/290 test verdi (13 fail = worktree
      stale preesistenti, invariati).
      **Nota aperta**: senape/sesamo hanno **0 ingredienti taggati** in `ingredientsDB.json`
      — il meccanismo funziona ma serve un audit dati separato (non inventato qui).
      Rinviato dal report: M2 (cross-contaminazione stabilimento), M3/M4 (claim/health
      claim aggiuntivi, serve modulo separato per non toccare l'engine), multi-U.V.,
      QUID fuori lista — bassa priorità/nicchia.

- [x] **ETI-2** — Tabella nutrizionale non entrava nelle dimensioni etichetta (2026-08-24).
      Root cause: `ScaleToFit` scalava solo la larghezza, l'altezza esportata non era mai
      vincolata a `heightMm`. Fix: warning overflow altezza (fronte+retro, badge come quello
      leggibilità) + selezione automatica formato tabella quando supera ~55% dell'altezza
      etichetta (ratchet solo verso il compatto, non risale da sola nella sessione).
      USA/Canada: già avevano formato verticale/orizzontale/lineare testato, prima mai usato
      (hardcoded su verticale, il più alto) — ora step automatico fra i 3.
      UE: nuovo formato lineare (Art. 34(2) Reg. 1169/2011, citazione verificata via
      EUR-Lex) — richiesto `export` su 4 funzioni di arrotondamento pure in `TabUE.tsx`
      (approvato esplicitamente, zero cambi a markup/calcoli, `npm test` verde).
      Australia: nuovo formato lineare (Standard 1.2.8 FSANZ, packaging <100cm² non richiede
      il pannello NIP formale) — stessi arrotondamenti di `TabAustralia.tsx` via
      `nutritionalRounding.ts` (già condiviso, non toccato).
      Arabi/Gulf: nuovo formato lineare (GSO 2233/2012 adotta Codex CAC/GL 2-1985) —
      **confidenza normativa più bassa di UE/AU**: non ho trovato/verificato il testo esatto
      della clausola small-package specifica per il Golfo, solo il principio generale Codex.
      Da verificare con fonte primaria prima di considerarlo equivalente a UE/AU.
      "Scheda per grafico" (PDF) forza sempre la tabella piena (non vincolata a spazio fisico).
      `npx tsc -b` pulito, 290/290 test verdi, Nutrizionale intatto.

- [x] **ETI-3** — Skill `normativa-alimentare` creata (2026-08-25, `.claude/skills/normativa-alimentare/SKILL.md`)
      + chiusi tutti gli 8 gap ❌ verificati riga per riga sul codice: leggibilità dinamica
      su superficie (Art.13(2)/All.IV), esenzioni Art.16(2)/All.V, avviso origine ingrediente
      primario (2018/775), porzione volontaria (Art.33), esenzione lotto (Dir.2011/91),
      campo sede legale distinto da stabilimento (D.Lgs.145/2017), warning imballi vuoti
      (D.Lgs.116/2020), **health claim con testo verbatim** (Reg.432/2012 — Calcio 8
      indicazioni, Ferro 7, Potassio 1, Proteine 3, estratte dal PDF ufficiale fornito
      dall'utente; fibre/sodio confermato che non hanno indicazione generica nell'allegato).
      19 test totali in `EtichetteCalc.compliance.test.ts` (13+6), `npx tsc -b` pulito,
      309/309 verdi, Nutrizionale intatto. Tentativo di auto-login dev (bypass password per
      verifica browser autonoma) implementato ma non funzionante — cookie cross-origin nel
      redirect, da riprendere con approccio senza redirect se serve ancora.

- [x] **ETI-4** — Chiusi tutti gli 8 gap residui vs Excel originale (2026-08-25):
      1. Frase facoltativa MAIUSCOLO allergeni (riga 27 Excel) — checkbox, testo fisso.
      2. **Cross-contaminazione stabilimento utente (M2)** — checklist 14 allergeni,
         si somma (unione, no duplicati) a quella calcolata dal fornitore.
      3. Costing informativo (costo ricetta, costo/kg) — stessa formula di
         NutrizionaleCalc.tsx (`fabbReale = grams/(resa/100)`), sola lettura, non stampato
         in etichetta, non traccia gli additivi (limite dichiarato, non un dato inventato).
      4. QUID fuori lista ingredienti (es. confetture) — campo dedicato vicino a denominazione,
         pinnato fronte (non spostabile, come nome/peso).
      5. Multi-componente esplicito — riepilogo nomi/pz-UV/ingredienti in "Ricetta collegata",
         solo se la ricetta ne ha più di uno.
      6. Più formati di quantità netta (U.V.) — fino a 4 formati aggiuntivi con relativo
         sgocciolato, oltre al principale.
      7. Dichiarazioni complementari — dizionario controllato (8 voci, All. VI Parte A),
         non più testo libero.
      8. **Claim nutrizionali completati (M3)** — modulo separato `calcAdditionalClaims` in
         EtichetteCalc.tsx (engine `nutrizionaleCalcEngine.ts` MAI toccato): SENZA GRASSI,
         SENZA/BASSO GRASSI SATURI, SENZA ZUCCHERI, FONTE/RICCO DI fosforo/magnesio/zinco/
         rame/manganese/selenio/iodio (soglie 15%/30% AR, stessi valori già usati per gli
         optional in tabella). Bonus: bug noto B1 (claim etichettato "SODIO" invece di
         "SALE", AUDIT.md:9) corretto a livello display (`relabelClaim`) senza toccare
         l'engine — da ora l'archivio salva la dicitura corretta.
      13 nuovi test (32 totali in `EtichetteCalc.compliance.test.ts`), `npx tsc -b` pulito,
      313/313 verdi (326 totali), Nutrizionale intatto. Nessun gap noto residuo vs Excel
      tranne quanto già segnato "fuori standard app" nel report 2026-08-24 (prodotti
      specifici tipo vini/olio, MOCA — mai stati nello scope).

- [x] **ETI-5** — Export non rispettava le dimensioni impostate (2026-08-25, segnalato
      con etichetta 100×100mm che usciva più alta). Due bug distinti:
      1. **Strutturale**: `aspect-ratio` era sul figlio interno del riquadro etichetta, non
         sul contenitore radice catturato dall'export (`labelPreviewRef`/`labelBackPreviewRef`)
         — il contenuto aggiuntivo (tabella, imballi), fratello dopo quel figlio, allungava
         l'altezza totale oltre `heightMm` impostato. Fix: `aspect-ratio` + `overflow:hidden`
         spostati sul contenitore radice — l'export ora rispetta SEMPRE le dimensioni
         impostate, l'eccesso viene tagliato (con warning visibile, non in silenzio).
         Overflow detection aggiornata di conseguenza (`scrollHeight` vs `clientHeight`
         invece di `contentRect.height`, che ora vale sempre `heightMm` per costruzione).
      2. **Step formato bloccato**: per USA/Canada lo step verticale→orizzontale→lineare
         avanzava di un livello alla volta; se due formati consecutivi hanno la stessa
         larghezza (reale), `ResizeObserver` non rileva cambiamento e il passo successivo
         non scattava mai — tabella bloccata a metà, ancora troppo larga. Fix: quando c'è
         overflow, salta dritto al formato più compatto.
      Verificata prima la gerarchia legale (21 CFR 101.9(j)(13)(ii)(A) per USA, Directory of
      Nutrition Facts Table Formats per Canada — entrambe a step, tabellare preferito,
      lineare solo se necessario: il meccanismo implementato è coerente). `npx tsc -b`
      pulito, 313/313 verdi, Nutrizionale intatto.

- [x] **ETI-6** — Verifica end-to-end scheda "per grafico" vs PDF reale generato dall'Excel
      originale (Lasagna alla Bolognese), su richiesta esplicita utente "deve essere identico"
      (2026-08-31/09-01). Bug reali trovati e corretti:
      1. **Tabella nutrizionale vuota nel PDF esportato** — `schedaRef` era `position:absolute;
         left:-99999px` (fuori schermo estremo): html2canvas calcola male i bounding box delle
         tabelle ufficiali (flex+WebkitTextStroke) quando l'antenato è molto lontano dal
         viewport — stesso bug già documentato altrove nel file per un caso analogo. Fix:
         `position:fixed` a coordinate reali, `z-index:-1` + `pointer-events:none` (invisibile
         dietro la UI, ma "a schermo" per html2canvas). Sostituita anche la tabella con un
         renderer HTML `<table>` dedicato (`renderSchedaNutritionTable`) invece di riusare
         `TabUE` (componente protetto, stesso bug flex).
      2. **Mancavano acidi grassi mono/polinsaturi, polioli, amido** nella tabella scheda —
         campi presenti nell'engine (`CalcResult.monoins/polins/polioli/amido`), solo non
         mappati nel renderer. Aggiunte le 4 righe.
      3. **Indicazioni sulla salute coprivano solo 4 nutrienti** (calcio/ferro/potassio/
         proteine) su 9 richiesti dal riferimento — aggiunti fosforo/magnesio/zinco/rame/
         manganese/selenio/iodio con testi verbatim Reg. UE 432/2012 (⚠️ da fonte formativa,
         non verificati contro il testo ufficiale dell'allegato — vedi nota in
         `HEALTH_CLAIMS_432_2012`). Riordinati anche i testi esistenti: il riferimento sceglie
         UN testo specifico per nutriente (es. calcio→ossa, zinco/rame/selenio→stress
         ossidativo), non il primo della lista — riallineato `texts[0]` a quella scelta, e
         il rendering ora mostra un solo testo per nutriente (`texts[0]`) invece di tutti.
      4. **Campo avvertenze libere mancante** (es. "Contiene liquirizia — evitare il consumo
         eccessivo in caso di ipertensione", All. III Reg. 1169/2011) — dizionario chiuso
         `complementaryDeclarations` non lo copriva. Aggiunto `otherWarnings` (testo libero).
      5. **Denominazione legale estesa mancante** — riferimento distingue nome commerciale
         ("Lasagna alla Bolognese") da denominazione legale Art. 17 ("Preparazione
         gastronomica a base di..."). Aggiunto campo `legalDenomination`.
      6. **QUID come righe separate mancante** — riferimento mostra "grammi di X: Yg per 100g
         di prodotto" per ogni ingrediente caratterizzante, oltre al QUID% già inline nella
         lista ingredienti. Aggiunto `quidLines` (derivato da `characterizingIngredients` +
         `orderedIngredientsWithQuid`, nessun dato nuovo, stesso QUID già calcolato).
      7. **Crash reale in "Sfoglia database"**: `fmt()` in `BrowseIngredientsModal.tsx`
         chiamava `v.toFixed()` assumendo `v` sempre `number` — con un valore stringa
         (possibile su ingredienti custom da localStorage scritto/modificato a mano) lancia
         `TypeError`, ErrorBoundary intercetta. Fix: `Number(v)` + guard `Number.isFinite`.
      **Verifica numerica**: ricostruita la ricetta reale (13 ingredienti, percentuali esatte
      dal foglio Excel "ordinamento" colonna BX, valori nutrizionali esatti dal foglio
      "database" colonne JX-LJ) come ingredienti custom nell'app. Root cause del primo grosso
      scarto (171 vs 202 kcal): peso finito impostato quasi uguale al crudo, mentre l'Excel
      implica ~74% di perdita sull'acqua aggiunta (besciamella/ragù ridotti prima di
      assemblare) — corretto il peso finito, risultato **849 kJ / 202 kcal, identico al
      riferimento**; fibre 1,1g identiche; sale/carboidrati entro il 10%. Grassi/proteine
      restano scostati (6,6g vs 8g / 11g vs 9,5g) — causa non isolata con certezza nel tempo
      disponibile, ipotesi: differenze di arrotondamento nella conversione %→grammi.
      **Aperto**: mono/polinsaturi non compilati sui 13 ingredienti custom creati per la
      verifica (campi presenti nel modale, sezione "○ Valori di macronutrienti facoltativi"
      non espansa durante l'automazione — errore di sessione, non limite del prodotto);
      i 13 ingredienti custom erano solo in localStorage del browser di test, persi al
      riavvio del dev server — da rifare se serve la verifica numerica al 100%.
      **Corretto un claim precedente**: la "ricerca ingredienti non trova custom su mobile"
      segnalata in sessione precedente non è un bug — `IngSearch.tsx` è lo stesso componente
      condiviso desktop/mobile via `useIngredientsDB`, nessuna differenza di codice; il
      sintomo osservato era quasi certamente `db` non ancora ricaricato nella sessione già
      montata (si sarebbe visto anche su desktop nella stessa sequenza).
      **Corretto anche**: il dev-login (`create_dev_login_link`, bypassa la password per
      verifica automatizzata) segnato "non funzionante" in ETI-3 ora funziona — serviva
      passare dal proxy Vite (`localhost:5173/api/auth/dev-login/...`) e non dal backend
      diretto (`127.0.0.1:8000/...`), altrimenti il cookie va sul dominio sbagliato.
      `npx tsc -b` pulito, 166/166 test verdi.


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

- [x] **S0** — Backend Django collegato al frontend in produzione (2026-07-29). `VITE_API_URL`
      impostata in prod (mancava, root cause per cui il backend non veniva mai chiamato); trovato
      e corretto bug reale in `vercel.json`: `connect-src 'self'` nella CSP bloccava ogni fetch
      verso il backend prima ancora di CORS. Verificato end-to-end in Safari: `/api/auth/me/` e
      `/api/ingredients/` rispondono 401 dal backend reale (atteso, utente demo non esiste in
      Django). Postgres Neon già con 1065/1071 ingredienti. Resta aperto: `public/data/ingredientsDB.json`
      non rimovibile finché non esistono account clienti reali (vedi AUTH-1/2); endpoint di
      ricerca e rate limiting ancora da fare (vedi AUDIT.md S0).
- [x] **MOB-P1-0** — Ricerca ingredienti da DB → calcolo automatico in mobile CalcoloTab (2026-05-30).
      CalcoloTab riscritto: niente input manuali nutrienti. Ingredienti DB → calcNutrients() auto.
      File: NutrizionaleCalcMobile.tsx, CalcoloTab.tsx. Deploy produzione OK.
- [x] **MOB-1** — Interfaccia mobile NutrizionaleCalc (2026-05-30): MobileShell + useMobile hook + AppShell
      integrazione + NutrizionaleCalcMobile con 4 tab (Calcolo / Tabella / Archivio / Tools).
      Design system mobile in `src/styles/mobile.css`. Commit range: 8fb4438…40abc43.
      Nota: formati Canada/Australia/Arabi nella TabellaTab mostrano placeholder (TAB-CA/AU/AR non ancora implementati).
- [x] **TAB-UE** — TabUE.tsx estratto, layout completo EU Reg. 1169/2011 (2026-05-23, commit 710ee97)
- [x] **TAB-USA-VERT** — TabUSA.tsx riscritto: verticale con vitamine a righe separate, font FDA (2026-05-23)
- [x] **TAB-USA-PILL** — Aggiunti bottoni Verticale/Orizzontale/Lineare per tab USA in wizard e vista avanzata (2026-05-23)
