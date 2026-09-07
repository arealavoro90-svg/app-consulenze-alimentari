# AUDIT 360° — EtichetteCalc & NutrizionaleCalc
**Data:** 2026-09-07 | **Scope:** tool Etichette + Valori Nutrizionali | **Modello:** Claude Opus

> Questo documento consolida i report di 4 agenti specializzati:
> UX/Usabilità · Qualità Codice · Normativa · Design/Competitività

---

## VERDETTO EXECUTIVE

Il prodotto ha **fondamenta tecniche eccellenti** — conformità normativa EU 1169/2011 inline, anteprima etichetta con metriche fisiche reali, multi-mercato (5 regioni), calcolo nutrizionale preciso — che costituiscono differenziatori autentici rispetto ai competitor italiani.

I gap principali sono:
1. **Rischio legale immediato** (allergeni backend, claim "SALE" vs "SODIO")
2. **Feature mancanti per consulenti** (export Excel, confronto ricette, versioning, template)
3. **Prima impressione debole** (login/dashboard non comunicano la profondità del prodotto)
4. **Interoperabilità zero** (nessun export GS1/XML per la GDO)

---

## 🔴 CRITICI — Rischio legale / blocca commercializzazione

| ID | Problema | Rischio | Effort |
|----|----------|---------|--------|
| **D3-BE** | Backend Django senza campi allergene — etichette senza allergeni in silenzio al go-live | **MASSIMO** (violazione Art. 21 Reg. 1169/2011, rischio salute) | M |
| **D2-DATA** | 9 prodotti "senza glutine" con `all_glutine: 1` nel DB — falsa dichiarazione allergene | **ALTO** (revoca certificazione GF, danno commerciale) | S (verifica fornitore) |
| **CLAIM-SALE** | Claim nutrizionale etichettato "A BASSO CONTENUTO DI SODIO" invece di "SALE" | **MEDIO** (Reg. 1924/2006 usa "sale" verso il consumatore) | XS |
| **DISCLAIMER** | Nessun disclaimer legale che limiti responsabilità AEA per errori nelle etichette prodotte | **MEDIO** (esposizione legale per AEA in caso contestazione) | S |

---

## 🟠 ALTA PRIORITÀ — Qualità commerciale e competitività

### Feature mancanti critiche per consulenti

| ID | Feature | Note |
|----|---------|------|
| **FEAT-EXCEL** | Export Excel strutturato della tabella nutrizionale | I consulenti vivono in Excel; manca il percorso inverso all'import già esistente |
| **FEAT-GS1** | Export JSON/XML GS1-like | Prerequisito per PMI che vendono alla GDO (Alia e Agriware ce l'hanno) |
| **FEAT-DUP** | Duplica ricetta/etichetta dall'archivio | Workflow quotidiano per varianti prodotto |
| **FEAT-TMPL** | Template etichetta per categoria (pasta, conserve, bevande, surgelati) | Dimezza il tempo di compilazione |
| **FEAT-SEARCH** | Ricerca full-text nell'archivio | Necessario con 50+ ricette |
| **FEAT-CLAIM** | Claim "senza" (grassi, zuccheri, sale, calorie) + claim saturi | 8/16 claim Reg. 1924/2006 implementati, mancano i più usati commercialmente |
| **UX-12** | Versioning ricette/etichette (storico revisioni) | Richiesto da consulenti e da conformità HACCP |

### Architettura e debito tecnico

| ID | Problema | Effort |
|----|----------|--------|
| **TD-1** | `EtichetteCalc.tsx` monolite 3387 righe senza engine estratto | M |
| **TD-2** | Duplicazione desktop/mobile ~2000 righe (NutrizionaleCalc) | L |
| **TD-3** | `ingredientsDB.json` pubblico (478KB, IP esposto, payload mobile pesante) | M |
| **TD-4** | Zero E2E test, zero test UI — qualsiasi refactor è ad alto rischio | M |
| **TD-7** | `html2canvas` 96dpi per export — non professionale per stampa tipografia | L |

### UX / onboarding

| ID | Problema | Impatto |
|----|----------|---------|
| **UX-OB** | Nessun esempio precaricabile, nessun walkthrough interattivo | Time-to-first-value alto |
| **UX-EMPTY** | EtichetteCalc: form vuoto con 40+ campi senza priorità visiva | Abbandono al primo accesso |
| **UX-MOBILE-ETI** | Anteprima etichetta inutilizzabile su mobile (label 100x150mm su 375px) | Tablet in stabilimento non funzionano |

---

## 🟡 MEDIA PRIORITÀ — Professionalità e solidità

### Normativa

| ID | Gap | Rif. |
|----|-----|------|
| **GULF-ARABO** | Tabella nutrizionale Gulf solo in inglese — non conforme per export nei paesi del Golfo | GSO 2233/2012 |
| **CA-LINEAR-FR** | Formato lineare Canada solo in inglese — CFIA richiede bilinguismo in tutti i formati | CFIA |
| **FG-DETAIL** | Solo anacardi tracciato tra i frutti a guscio; 7 sottovoci (mandorle, nocciole, noci, pistacchi, pecan, noci Brasile, macadamia) non distinguibili | All. II p.8 Reg. 1169/2011 |
| **VITAMINA-CLAIM** | Nessun claim generato per vitamine (i valori AR_UE sono presenti ma non usati per claim) | Reg. 1924/2006 |

### Design e sistema visivo

| ID | Problema |
|----|----------|
| **DS-INLINE** | 80+ occorrenze di stili inline (`style={{...}}`) in Dashboard, AbbonamentoPage — bassa riutilizzabilità |
| **DS-TYPO** | Nessun token tipografia — 12+ font-size hardcoded sparsi (11px, 12px, 13px, 15px, 28px...) |
| **DS-SEVERITY** | Tutti i diagnostic banner arancioni — serve differenziazione rosso/giallo/grigio per severità |
| **DS-TABLET** | Nessun breakpoint tablet landscape (1024-1279px) — layout collassa a mobile |
| **DS-SIDEBAR** | Flyout sidebar disabilitato sotto 1280px — utenti su schermi medi vedono solo icone |

### GDPR e legale

| ID | Task |
|----|------|
| **GDPR-2** | Endpoint cancellazione dati Art. 17 (entro 30gg dal go-live) |
| **GDPR-4** | Portabilità dati Art. 20 |
| **GDPR-3** | Retention log DB Neon ≤12 mesi |

---

## 🟢 PUNTI DI FORZA — Da preservare

| Area | Livello | Note |
|------|---------|------|
| **Conformità normativa EU** | ECCELLENTE | Reg. 1169/2011 con riferimenti articolo-per-articolo, x-height All. IV, cascata formato, esenzioni superficie |
| **Multi-mercato** | ECCELLENTE | UE + USA + Canada + Australia + Arabi — pochi competitor italiani lo offrono |
| **Anteprima etichetta** | ECCELLENTE | Dimensioni mm reali, ResizeObserver, barcode GS1 con metriche reali, export 300dpi con chunk pHYs |
| **Engine nutrizionale** | OTTIMO | Pure functions, testato, fattori EU corretti, alcol, QUID, 5 mercati con arrotondamento specifico |
| **Collegamento ricetta → etichetta** | OTTIMO | Automatico da archivio — differenziatore vs competitor |
| **Motion system** | OTTIMO | 19+ keyframes, easing tokens, prefers-reduced-motion — sopra la media del settore |
| **Autosave + bridge mobile** | BUONO | Pattern robusto per persistenza e recovery |

---

## QUICK WINS — Alto impatto, basso costo

| ID | Azione | Costo stimato | Impatto |
|----|--------|--------------|---------|
| **QW-1** | Correggere claim "SODIO" → "SALE" in `calcClaims()` | 30min | Conformità normativa |
| **QW-2** | Aggiungere disclaimer legale (footer o modal) | 1h | Protezione legale AEA |
| **QW-3** | Empty state con CTA nel form ingredienti NutrizionaleCalc | 1h | Time-to-first-value |
| **QW-4** | Ricetta demo precaricabile dal WelcomeModal | 2h | Onboarding |
| **QW-5** | Bottone "Duplica" nell'archivio | 2h | Workflow consulenti |
| **QW-6** | InfoTooltip su campi critici (Resa, Pz/UV, Peso specifico, Cup) | 1h | Chiarezza |
| **QW-7** | Highlight bordo rosso su `requiredFields` mancanti fin dall'inizio | 30min | Orientamento utente |
| **QW-8** | Skeleton loading durante fetch DB ingredienti | 30min | Percezione performance |
| **QW-9** | Social proof nella login page ("100+ PMI alimentari italiane") | 1h | Conversione |
| **QW-10** | Severity visiva differenziata nei banner (rosso/giallo/grigio) | 1h | Professionalità percepita |

---

## COSA MANCA PER COMPETERE A LIVELLO NAZIONALE

### Feature decisive per il mercato PMI alimentari italiane

| Priorità | Feature | Chi ce l'ha | Effort |
|----------|---------|------------|--------|
| P1 | Export GS1/XML strutturato | Alia, Agriware | M — prerequisito GDO |
| P2 | Claim "senza" completi + vitamine | Software Etichette Pro | S |
| P3 | Endpoint search ingredienti (no download intero DB) | Tutti | M |
| P4 | E2E test Playwright | Standard settore | M — prerequisito refactor |
| P5 | Template etichette per categoria merceologica | Agriware | S |
| P6 | Versioning ricette | Alia | M |
| P7 | Multi-utente con ruoli (consulente + aziende clienti) | Tutti | L |
| P8 | Export vettoriale PDF 300dpi (no html2canvas) | Software Etichette Pro | L |
| P9 | Dashboard operativa con KPI e attività recente | Standard SaaS | M |
| P10 | Notifiche aggiornamenti normativi | Agriware | M |

### Cosa manca per sembrare un SaaS da 200+€/mese

- Dashboard con KPI e attività recente (ora: solo griglia tool)
- Storico revisioni etichette
- Collaborazione multi-utente
- Notifiche normative (aggiornamenti regolamentari)
- Pricing page pubblica con piani
- Help center integrata
- API/webhook per sistemi di stampa (Bartender, NiceLabel)

---

## ROADMAP CONSIGLIATA

### Immediata (1-2 settimane) — Blocchi legali + quick wins
1. **D3-BE** — allergeni backend Django
2. **D2-DATA** — pulizia 9 prodotti senza glutine
3. **CLAIM-SALE** — fix label claim "SODIO" → "SALE"
4. **DISCLAIMER** — footer/modal legale
5. QW-1 attraverso QW-10 (tutti fattibili in 1-2 giorni)

### Breve termine (1 mese) — Competitività core
1. **FEAT-CLAIM** — claim "senza" + vitamine
2. **FEAT-DUP** — duplica dall'archivio
3. **FEAT-SEARCH** — ricerca archivio
4. **FEAT-TMPL** — template per categoria
5. **TD-4** — E2E test Playwright (prerequisito per tutto il resto)
6. **DS-SEVERITY + DS-TYPO** — design system

### Medio termine (2-3 mesi) — Differenziazione di mercato
1. **FEAT-GS1** — export strutturato per GDO
2. **FEAT-EXCEL** — export Excel nutrizionale
3. **UX-12** — versioning ricette
4. **TD-1** — estrazione engine EtichetteCalc
5. **TD-7** — export vettoriale PDF
6. Dashboard operativa con KPI
7. Multi-utente con ruoli

---

*Report generato da team audit Opus 4.6 — 2026-09-07*
*Agenti: UX/Usabilità · Qualità Codice · Normativa · Design/Competitività*
