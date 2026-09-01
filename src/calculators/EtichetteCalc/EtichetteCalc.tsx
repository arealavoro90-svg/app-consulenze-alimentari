import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus, Archive, BookOpen, Save, Sparkles, ImageDown,
    RefreshCw, X, Image, Building2, CheckCircle2, AlertTriangle, FileText,
} from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import { useAuth } from '../../auth/AuthContext';
import { useMobile } from '../../hooks/useMobile';
import { generatePDFReport, generateEtichettaPDF } from '../../utils/pdfGenerator';
import { useArchive, type ArchiveItem } from '../../hooks/useArchive';
import { useIngredientsDB } from '../../hooks/useIngredientsDB';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ArchiveModal } from '../../components/ArchiveModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PromptDialog } from '../../components/ui/PromptDialog';
import { useToast } from '../../components/ui/Toast';
import { WelcomeModal, ETICHETTE_SLIDES } from '../../components/WelcomeModal';
import { ValidationError } from '../../components/ValidationError';
import { InfoTooltip } from '../NutrizionaleCalc/InfoTooltip';
import { SplitShell } from '../NutrizionaleCalc/SplitShell';
import {
    type DBIngredient, type Component, type CalcResult,
    calcNutrients, calcClaims, calcQuid, scaleResult,
} from '../../engines/nutrizionaleCalcEngine';
import { ALLERGEN_FIELDS, CROSS_FIELDS } from '../NutrizionaleCalc/shared/constants';
import type { ArchiveData, NationTab } from '../NutrizionaleCalc/NutrizionaleCalc';
import { TabUE, DEFAULT_OPTIONALS, type SelectedOptionals, rUE_energy, rUE_macro, rUE_sat, rUE_sale } from '../NutrizionaleCalc/TabUE';
import { TabUSA } from '../NutrizionaleCalc/TabUSA';
import { TabCanada } from '../NutrizionaleCalc/TabCanada';
import { TabAustralia } from '../NutrizionaleCalc/TabAustralia';
import { TabArabi } from '../NutrizionaleCalc/TabArabi';
import { rAU_kj, rAU_kcal, rAU_g1, rAU_mg, rArabi_energy, rArabi_g, rArabi_mg } from '../../utils/nutritionalRounding';
import { PACKAGING_MATERIALS } from './packagingMaterials';

/** Placeholder discreto per campo vuoto nell'anteprima live (mai più gated da un bottone). */
function ph(val: string, placeholder: string) {
    return val ? val : <span style={{ opacity: 0.45, fontStyle: 'italic' }}>{placeholder}</span>;
}

// La tabella nutrizionale scende di formato (pieno→compatto) fino a NATION_MAX_STEP, ma se anche
// il formato più compatto continua a sforare (bug reale trovato 2026-08-25 su USA: tabella
// "lineare" tagliata a destra su etichetta 100x100mm) non esiste altro step: va segnalato invece
// di restare silenzioso, perché l'export taglia il contenuto in eccesso senza avvisare.
export function shouldFlagNutritionOverflow(current: number, maxStep: number, overflowsHeight: boolean, overflowsWidth: boolean): boolean {
    return current >= maxStep && (overflowsHeight || overflowsWidth);
}

// 1mm in CSS px (96dpi standard, non dipende dallo zoom del browser: è la conversione fissa
// usata da tutti i motori CSS per l'unità `mm`).
export const CSS_PX_PER_MM = 96 / 25.4;

// fontScale in origine era baseDim/100 (baseDim = min(widthMm, heightMm)) — cresceva senza
// limite con le dimensioni dichiarate, ma il riquadro anteprima è clampato a schermo da
// `maxWidth: min(widthMm mm, 100%)`: sopra la soglia di clamping del pannello i due valori
// divergono e il testo (in px assoluti scalati da fontScale) sfora il riquadro (bug reale
// trovato 2026-08-25, analisi architetturale: box clampato ma font continua a crescere dai mm
// dichiarati). Fix: la scala nasce dai px REALMENTE renderizzati (renderedWidthPx/HeightPx via
// ResizeObserver), mai dai mm dichiarati — sotto la soglia di clamping è algebricamente
// identica alla formula originale (nessuna regressione sui formati che già funzionavano).
// Fallback a baseDim/100 solo al primo render, quando il ResizeObserver non ha ancora misurato
// nulla (renderedWidthPx/HeightPx a 0) — altrimenti flash a font-size 0.
export function visualFontScale(renderedWidthPx: number, renderedHeightPx: number, baseDimMmFallback: number): number {
    if (renderedWidthPx <= 0 || renderedHeightPx <= 0) return baseDimMmFallback / 100;
    return Math.min(renderedWidthPx, renderedHeightPx) / (100 * CSS_PX_PER_MM);
}

// GS1 General Specifications — EAN-13: X-dimension nominale 0,330mm a magnificazione 100%,
// intervallo di magnificazione ammesso 80%-200% (sotto 80% il simbolo non è più garantito
// scansionabile da uno scanner reale). Simbolo = 95 moduli di barre + quiet zone 11X sinistra/7X
// destra = 113 moduli di larghezza totale; altezza barre nominale 22,85mm. Confidenza alta
// (coerenza interna verificata: 113 × 0,33mm = 37,29mm, dimensione nominale nota del simbolo).
// Stessi numeri riusati anche per CODE128 come floor pratico (non-GS1, nessun minimo normativo
// stringente noto con la stessa confidenza — vedi analisi 2026-08-25) invece di duplicare la
// formula: la differenza pratica è trascurabile.
export const EAN13_MODULE_MM = 0.330;
export const EAN13_QUIET_MODULES = 11 + 7;
export const EAN13_BAR_MODULES = 95;
export const EAN13_HEIGHT_MM = 22.85;
export const BARCODE_MIN_MAGNIFICATION = 0.80;
export const BARCODE_MAX_MAGNIFICATION = 2.00;
// Altezza barre "troncata" (ridotta rispetto al nominale 22,85mm per occupare meno spazio
// verticale): GS1 vieta di scendere sotto l'altezza corrispondente all'80% di magnificazione,
// qualunque sia la magnificazione orizzontale usata — 22,85 × 0,80 = 18,28mm, comunemente
// citato come 18,29mm. Fonte: GS1 UK / GS1 General Specifications (verificato via ricerca web
// 2026-08-25, convergente su più fonti secondarie, coerente col calcolo). Sotto questo valore
// l'affidabilità di scansione peggiora sensibilmente — GS1 la sconsiglia comunque, qui è il
// pavimento assoluto, mai il default.
export const EAN13_TRUNCATED_MIN_HEIGHT_MM = 18.29;

export interface BarcodeMetrics {
    modulePx: number;
    symbolWidthPx: number;
    barHeightPx: number;
    magnification: number;
    clampedToMin: boolean;
}

// CodeCanvas disegnava il barcode a px fissi derivati solo dallo slider utente (`scale`),
// scollegati dalla dimensione reale del riquadro etichetta — su formati piccoli il canvas
// restava più largo del box e veniva tagliato dall'overflow:hidden dell'antenato (bug reale
// 2026-08-25). Qui la dimensione nasce dai mm fisici reali (pxPerMm, stesso principio di
// visualFontScale) invece che da px arbitrari — ma con un CLAMP che il testo non ha: sotto
// l'80% di magnificazione GS1 un EAN-13 rischia di non essere scansionabile, quindi la
// LARGHEZZA/modulo non si rimpicciolisce oltre quella soglia (si taglierà comunque se il box è
// troppo piccolo, ma un banner lo segnala esplicitamente invece di lasciarlo silenzioso).
// L'ALTEZZA invece è sempre "troncata" al minimo GS1 (18,29mm), indipendente dalla
// magnificazione orizzontale — su richiesta esplicita 2026-08-25: il barcode risultava troppo
// dominante verticalmente su etichette piccole; l'altezza più bassa lo fa "integrare" meglio
// col resto del contenuto senza intaccare la leggibilità del pattern di barre (che dipende
// dalla larghezza del modulo, non dall'altezza).
export function barcodeMetrics(userScalePercent: number, pxPerMm: number): BarcodeMetrics {
    const requestedMag = userScalePercent / 100;
    const magnification = Math.min(Math.max(requestedMag, BARCODE_MIN_MAGNIFICATION), BARCODE_MAX_MAGNIFICATION);
    const modulePx = EAN13_MODULE_MM * magnification * pxPerMm;
    const symbolWidthPx = (EAN13_BAR_MODULES + EAN13_QUIET_MODULES) * modulePx;
    const barHeightPx = EAN13_TRUNCATED_MIN_HEIGHT_MM * pxPerMm;
    return { modulePx, symbolWidthPx, barHeightPx, magnification, clampedToMin: requestedMag < BARCODE_MIN_MAGNIFICATION };
}

// Impaginazione responsive (analisi 2026-08-25, framework "colonna unica di zone, riflusso
// interno alla zona" — stessa gerarchia/ordine su etichette quadrate/verticali/orizzontali,
// cambia solo se una zona ha riga propria o condivide riga con la vicina): fontScale è isotropo
// (min(W,H)) ma barcodeMetrics è ancorato ai mm fisici assoluti GS1 — su un'etichetta stretta il
// barcode occupa per costruzione una quota enorme della larghezza e nessuna scala del testo può
// compensarlo (il barcode non va MAI rimpicciolito sotto l'80% GS1). L'unica leva è lo SLOT: se
// il barcode da solo supererebbe questa quota della larghezza etichetta, condivide la riga con
// peso/lotto invece di avere una riga centrata tutta sua (che lo farebbe sembrare ancora più
// dominante). Soglia 0,55 = punto in cui, in pratica, il barcode inizia a "schiacciare" il resto
// della riga legale se ci stesse assieme — sopra quella quota va isolato in coda, sotto entra.
export const BARCODE_SHARED_ROW_THRESHOLD = 0.55;
export function shouldShareBarcodeRow(symbolWidthPx: number, availableWidthPx: number): boolean {
    return availableWidthPx > 0 && (symbolWidthPx / availableWidthPx) > BARCODE_SHARED_ROW_THRESHOLD;
}

// Stesso framework, per la zona CORPO (ingredienti/allergeni/produttore/…) vs TABELLA+IMBALLI:
// su formati orizzontali larghi (aspect ratio > soglia) le due zone si affiancano invece di
// impilarsi, per non sprecare la larghezza extra — su quadrata/verticale restano impilate come
// oggi. Soglia scelta sull'aspect ratio (non sulla larghezza assoluta): più prevedibile, non
// dipende dall'unità di misura del formato.
export const HORIZONTAL_TWO_COLUMN_ASPECT_THRESHOLD = 1.25;
export function shouldUseTwoColumnLayout(widthMm: number, heightMm: number): boolean {
    return heightMm > 0 && (widthMm / heightMm) > HORIZONTAL_TWO_COLUMN_ASPECT_THRESHOLD;
}

// Ricette salvate prima della rinomina campi IT (nutrizionale-v3 può contenere entrambi gli
// schemi in localStorage) non hanno `componenti`/`ingredienti` — stessa tolleranza di
// NutrizionaleCalc.tsx:589-598 per la stessa chiave archivio, riscritta qui in sola lettura.
// Senza questo, una ricetta legacy fa crashare l'intero tool (TypeError su `.componenti.map`
// di undefined). Funzioni pure a livello di modulo: nessuna dipendenza da chiudere negli hook.
export type LegacyRow = { nome?: string; name?: string; grammi?: number; grams?: number; resa?: number; eurKg?: number };
export type LegacyAdditive = { categoria?: string; nomeSpecifico?: string };
export type LegacyComponent = { nome?: string; name?: string; pz_uv?: number; pzUV?: number; ingredienti?: LegacyRow[]; rows?: LegacyRow[]; additiveRows?: LegacyAdditive[] };
export function readComponenti(d: ArchiveData): LegacyComponent[] {
    const raw = d as unknown as { componenti?: unknown; components?: unknown };
    if (Array.isArray(raw.componenti)) return raw.componenti as LegacyComponent[];
    if (Array.isArray(raw.components)) return raw.components as LegacyComponent[];
    return [];
}
export function readRows(sc: LegacyComponent): LegacyRow[] {
    if (Array.isArray(sc.ingredienti)) return sc.ingredienti;
    if (Array.isArray(sc.rows)) return sc.rows;
    return [];
}

// Formato lineare compatto per etichette con poco spazio — stessi nutrienti/ordine/arrotondamenti
// delle rispettive tabelle piene (funzioni importate dai file ufficiali, mai duplicate a mano),
// solo su una riga invece che in tabella.
// UE: Art. 34(2) Reg. 1169/2011 — "Dove lo spazio non lo consente, la dichiarazione figura in
// formato lineare" — stesso set di nutrienti sempre mostrati in TabUE.tsx (non gli opzionali).
export function buildEULinear(p: CalcResult): string {
    return [
        `Energia: ${rUE_energy(p.energyKj)} kJ / ${rUE_energy(p.energyKcal)} kcal`,
        `Grassi: ${rUE_macro(p.grassi)} g`,
        `di cui acidi grassi saturi: ${rUE_sat(p.saturi)} g`,
        `Carboidrati: ${rUE_macro(p.carboidrati)} g`,
        `di cui zuccheri: ${rUE_macro(p.zuccheri)} g`,
        `Fibre: ${rUE_macro(p.fibre)} g`,
        `Proteine: ${rUE_macro(p.proteine)} g`,
        `Sale: ${rUE_sale(p.sale)} g`,
    ].join(', ');
}
// Australia: Standard 1.2.8 FSANZ — packaging con superficie <100cm² non richiede il pannello
// NIP formale, gli stessi nutrienti possono essere dichiarati senza il box. Stesso set/ordine
// di TabAustralia.tsx.
export function buildAULinear(p: CalcResult): string {
    return [
        `Energy: ${rAU_kj(p.energyKj)} kJ (${rAU_kcal(p.energyKcal)} Cal)`,
        `Protein: ${rAU_g1(p.proteine)} g`,
        `Fat, total: ${rAU_g1(p.grassi)} g`,
        `- saturated: ${rAU_g1(p.saturi)} g`,
        `Carbohydrate: ${rAU_g1(p.carboidrati)} g`,
        `- sugars: ${rAU_g1(p.zuccheri)} g`,
        `Dietary fibre: ${rAU_g1(p.fibre)} g`,
        `Sodium: ${rAU_mg(p.sodio_mg)} mg`,
    ].join(', ');
}
// Gulf/GSO: GSO 2233/2012 adotta Codex CAC/GL 2-1985 (principio analogo, testo della clausola
// small-package non verificato con la stessa certezza di UE/AU — vedi nota nel report). Stesso
// set/ordine di TabArabi.tsx.
export function buildArabiLinear(p: CalcResult): string {
    return [
        `Calories: ${rArabi_energy(p.energyKcal)}`,
        `Total Fat: ${rArabi_g(p.grassi)} g`,
        `Saturated Fat: ${rArabi_g(p.saturi)} g`,
        `Trans Fat: ${rArabi_g(p.trans)} g`,
        `Cholesterol: ${rArabi_mg(p.colesterolo)} mg`,
        `Sodium: ${rArabi_mg(p.sodio_mg)} mg`,
        `Total Carbohydrate: ${rArabi_g(p.carboidratiTot)} g`,
        `Dietary Fiber: ${rArabi_g(p.fibre)} g`,
        `Total Sugars: ${rArabi_g(p.zuccheri)} g`,
        `Protein: ${rArabi_g(p.proteine)} g`,
    ].join(', ');
}

// Alcune label ALLERGEN_FIELDS portano una qualifica tra parentesi (es. "SOLFITI
// (>10 ppm)", soglia Reg. 1169/2011 Art. 21 par.1 lett.c) — è testo informativo per la
// UI, non parte della parola da cercare/evidenziare: usata cruda, "(" e ")" diventano
// gruppi regex e la label letterale non compare mai nel testo ingredienti (B-e), quindi
// il match falliva sempre per SOLFITI. matchWord isola la parola pulita. Pura, nessuno
// stato di componente: a livello di modulo per essere testabile in isolamento.
export function matchWord(label: string): string {
    return label.replace(/\s*\(.*$/, '').trim();
}

// Evidenziazione MAIUSCOLO allergeni nel nome ingrediente: euristica per
// match di sottostringa — bozza da rivedere manualmente, non output finale.
export function highlightAllergens(nome: string): string {
    let out = nome;
    for (const { label } of ALLERGEN_FIELDS) {
        const word = matchWord(label);
        const re = new RegExp(`\\b${word.toLowerCase()}\\b`, 'gi');
        out = out.replace(re, word.toUpperCase());
    }
    return out;
}

interface LabelData {
    productName: string;
    // Denominazione legale estesa (Art. 17 Reg. 1169/2011) quando diversa dal nome commerciale
    // — es. Excel "e. UE" riga 12: "PREPARAZIONE GASTRONOMICA A BASE DI PASTA ALL'UOVO CON
    // RAGU' DI CARNE DI MAIALE E CARNE BOVINA" per un prodotto commercializzato come "Lasagna
    // alla Bolognese". Vuoto = productName vale anche come denominazione legale (caso comune).
    legalDenomination: string;
    producer: string;
    address: string;
    // D.Lgs. 145/2017 — sede legale, distinta dall'indirizzo di stabilimento (`address`)
    // quando i due non coincidono. Facoltativo: se vuoto, si assume coincidano.
    legalAddress: string;
    netWeight: string;
    // Più formati di quantità netta sulla stessa scheda (es. Excel: 500g/250g/100g, ognuno
    // col proprio peso sgocciolato) — ADDIZIONALI a netWeight/drainedWeight sopra, che restano
    // il formato principale/obbligatorio. Vuoto = nessun formato aggiuntivo (caso comune).
    additionalNetWeights: { netWeight: string; drainedWeight: string }[];
    ingredients: string;
    allergens: string;
    // Dicitura facoltativa (foglio Excel "e. UE" riga 27): non obbligatoria, spiega
    // all'utente finale il senso del MAIUSCOLO nell'elenco ingredienti.
    includeAllergenNote: boolean;
    // QUID fuori lista ingredienti — Art.22+All.VIII: quando l'ingrediente caratterizzante
    // non compare (o non basta) nell'elenco ingredienti stesso (es. confetture: "28g di frutta
    // per 100g di prodotto" accanto alla denominazione, non dentro la lista).
    quidOutsideList: string;
    // Dichiarazioni complementari (All. VI Parte A Reg. 1169/2011 + prassi Excel righe 12-13/19-21)
    // — dizionario controllato invece di testo libero, per non far inventare diciture all'utente.
    complementaryDeclarations: string[];
    // Avvertenze non codificabili in un dizionario chiuso (All. III Reg. 1169/2011: liquirizia,
    // caffeina, fitosteroli, ecc. — testo varia per soglia/prodotto, es. Excel riga 20 "Contiene
    // liquirizia-evitare il consumo eccessivo in caso di ipertensione"). Testo libero deliberato.
    otherWarnings: string;
    // M2 — allergeni gestiti nello stabilimento dell'utente (linee condivise, stesso ambiente
    // di lavorazione), selezione manuale: il DB copre solo la cross-contaminazione dal
    // fornitore (`cross_*` sull'ingrediente), non quella del proprio stabilimento.
    facilityAllergens: string[];
    storageConditions: string;
    bestBefore: string;
    lotNumber: string;
    countryOrigin: string;
    // A6 — campi obbligatori "condizionati" (e. UE righe 53/55/57 dell'Excel): non sempre
    // richiesti, ma se il caso si applica lo diventano per legge. Vuoti = non mostrati.
    drainedWeight: string;
    alcoholPercent: string;
    consumptionInstructions: string;
    widthMm: string;
    heightMm: string;
    bgImageUrl: string;
    logoUrl: string;
    theme: 'light' | 'dark';
    // Parametri trasformazione immagini
    bgScale: number;
    bgPosX: number;
    bgPosY: number;
    logoScale: number;
    logoPosX: number;
    logoPosY: number;
    // Collegamento a una ricetta del tool nutrizionale (sola lettura, mai snapshot statico)
    recipeId?: string;
    claimsSelezionati: string[];
    imballi: { descrizione: string; codice: string; raccolta: string }[];
    showNutritionTable: boolean;
    // Art. 33 Reg. 1169/2011 — dichiarazione per porzione, sempre AGGIUNTIVA alla 100g
    // obbligatoria, mai sostitutiva. Solo UE: USA/Canada hanno già il per-porzione come
    // formato primario nelle rispettive tabelle.
    showPerServing: boolean;
    // Ingredienti "caratterizzanti" (evidenziati in denominazione/immagine): solo per questi
    // va stampato il QUID% in etichetta — come foglio "ordinamento" dell'Excel (colonna BZ).
    characterizingIngredients: string[];
    // Codice a barre / QR in etichetta
    codeType: 'none' | 'qr' | 'barcode' | 'ean13';
    codeValue: string;
    codeScale: number;
    // Retro etichetta — opzionale, solo se il fronte non basta (Art. 13(5) Reg. 1169/2011:
    // denominazione e peso netto restano SEMPRE sul fronte, non spostabili). Dimensioni fisiche
    // indipendenti dal fronte (spesso uguali, ma il retro può essere più grande per la tabella).
    hasBackLabel: boolean;
    backWidthMm: string;
    backHeightMm: string;
    // Chiavi campo spostate sul retro (vedi BACK_MOVABLE_FIELDS) — default vuoto: tutto sul
    // fronte finché l'utente non sposta esplicitamente qualcosa per mancanza di spazio.
    backFields: string[];
    // M6 — identificativi della scheda etichetta trasmessa a grafico/tipografia (Guida PDF
    // cap. 13a punto 4: codice scheda, n° e data revisione). Non compaiono sull'etichetta
    // stampata, solo sul documento di lavoro per chi la impagina.
    schedaCodice: string;
    schedaRevisione: string;
    schedaDataRevisione: string;
}

const defaults: LabelData = {
    productName: '',
    legalDenomination: '',
    producer: '',
    address: '',
    legalAddress: '',
    netWeight: '',
    additionalNetWeights: [],
    ingredients: '',
    allergens: '',
    includeAllergenNote: false,
    quidOutsideList: '',
    complementaryDeclarations: [],
    otherWarnings: '',
    facilityAllergens: [],
    storageConditions: '',
    bestBefore: '',
    lotNumber: '',
    countryOrigin: 'Italia',
    drainedWeight: '',
    alcoholPercent: '',
    consumptionInstructions: '',
    widthMm: '100',
    heightMm: '150',
    bgImageUrl: '',
    logoUrl: '',
    theme: 'light',
    bgScale: 100,
    bgPosX: 50,
    bgPosY: 50,
    logoScale: 100,
    logoPosX: 50,
    logoPosY: 10,
    recipeId: undefined,
    claimsSelezionati: [],
    imballi: [],
    showNutritionTable: true,
    showPerServing: false,
    characterizingIngredients: [],
    codeType: 'none',
    codeValue: '',
    codeScale: 100,
    hasBackLabel: false,
    backWidthMm: '100',
    backHeightMm: '150',
    backFields: [],
    schedaCodice: '',
    schedaRevisione: '',
    schedaDataRevisione: '',
};

// Campi spostabili sul retro tramite checklist — productName e netWeight NON compaiono qui:
// restano sempre sul fronte per legge (Art. 13(5) Reg. 1169/2011, stesso campo visivo).
// Reg. UE 432/2012, allegato — testo VERBATIM delle indicazioni sulla salute ammesse,
// estratto dal testo consolidato ufficiale (PDF fornito dall'utente il 2026-08-25, non da
// ricerca web: la prima verifica via EUR-Lex/WebFetch non aveva restituito l'allegato
// leggibile). Ogni indicazione richiede che l'alimento sia "fonte di" quel nutriente
// (soglia già verificata dal claim nutrizionale corrispondente in nutrizionaleCalcEngine.ts).
// FIBRE e SODIO volutamente assenti: l'allegato non ha un'indicazione generica per le fibre
// (solo per fonti specifiche come fibra di avena/frumento/orzo/segale, non tracciate qui) né
// per il sodio (coerente: è un nutriente da ridurre, non un "fonte di" da promuovere).
export const HEALTH_CLAIMS_432_2012: { claim: string; texts: string[] }[] = [
    {
        claim: 'RICCO DI CALCIO', texts: [
            'Il calcio è necessario per il mantenimento di ossa normali',
            'Il calcio è necessario per il mantenimento di denti normali',
            'Il calcio contribuisce alla normale coagulazione del sangue',
            'Il calcio contribuisce al normale metabolismo energetico',
            'Il calcio contribuisce alla normale funzione muscolare',
            'Il calcio contribuisce alla normale neurotrasmissione',
            'Il calcio contribuisce alla normale funzione degli enzimi digestivi',
            'Il calcio interviene nel processo di divisione e di specializzazione delle cellule',
        ],
    },
    {
        claim: 'RICCO DI FERRO', texts: [
            'Il ferro contribuisce alla normale formazione dei globuli rossi e dell’emoglobina',
            'Il ferro contribuisce al normale trasporto di ossigeno nell’organismo',
            'Il ferro contribuisce alla normale funzione cognitiva',
            'Il ferro contribuisce al normale metabolismo energetico',
            'Il ferro contribuisce alla normale funzione del sistema immunitario',
            'Il ferro contribuisce alla riduzione della stanchezza e dell’affaticamento',
            'Il ferro interviene nel processo di divisione delle cellule',
        ],
    },
    {
        claim: 'RICCO DI POTASSIO', texts: [
            'Il potassio contribuisce al mantenimento di una normale pressione sanguigna',
        ],
    },
    {
        claim: 'AD ALTO CONTENUTO DI PROTEINE', texts: [
            'Le proteine contribuiscono alla crescita della massa muscolare',
            'Le proteine contribuiscono al mantenimento della massa muscolare',
            'Le proteine contribuiscono al mantenimento di ossa normali',
        ],
    },
    {
        claim: 'RICCO DI FOSFORO', texts: [
            'Il fosforo contribuisce al normale metabolismo energetico',
            'Il fosforo contribuisce alla normale funzione delle membrane cellulari',
            'Il fosforo è necessario per il mantenimento di ossa normali',
            'Il fosforo è necessario per il mantenimento di denti normali',
        ],
    },
    {
        claim: 'RICCO DI MAGNESIO', texts: [
            "Il magnesio contribuisce alla riduzione della stanchezza e dell'affaticamento",
            "Il magnesio contribuisce all'equilibrio elettrolitico",
            'Il magnesio contribuisce al normale metabolismo energetico',
            'Il magnesio contribuisce alla normale funzione del sistema nervoso',
            'Il magnesio contribuisce alla normale funzione muscolare',
            'Il magnesio contribuisce alla normale sintesi proteica',
            'Il magnesio contribuisce alla normale funzione psicologica',
            'Il magnesio contribuisce al mantenimento di ossa normali',
            'Il magnesio contribuisce al mantenimento di denti normali',
            'Il magnesio interviene nel processo di divisione cellulare',
        ],
    },
    {
        claim: 'RICCO DI ZINCO', texts: [
            'Lo zinco contribuisce alla protezione delle cellule dallo stress ossidativo',
            'Lo zinco contribuisce al normale metabolismo acido-base',
            'Lo zinco contribuisce al normale metabolismo dei carboidrati',
            'Lo zinco contribuisce alla normale sintesi del DNA',
            'Lo zinco contribuisce alla normale fertilità e riproduzione',
            'Lo zinco contribuisce al mantenimento di ossa normali',
            'Lo zinco contribuisce al mantenimento di capelli normali',
            'Lo zinco contribuisce al mantenimento di unghie normali',
            'Lo zinco contribuisce al mantenimento della pelle normale',
            'Lo zinco contribuisce al normale metabolismo degli acidi grassi',
            'Lo zinco contribuisce alla normale sintesi proteica',
            'Lo zinco contribuisce alla normale funzione cognitiva',
            'Lo zinco contribuisce alla normale funzione del sistema immunitario',
            'Lo zinco contribuisce al mantenimento della vista normale',
        ],
    },
    {
        claim: 'RICCO DI RAME', texts: [
            'Il rame contribuisce alla protezione delle cellule dallo stress ossidativo',
            'Il rame contribuisce al mantenimento di tessuti connettivi normali',
            'Il rame contribuisce alla normale produzione di energia',
            'Il rame contribuisce alla normale funzione del sistema nervoso',
            'Il rame contribuisce alla normale pigmentazione di pelle e capelli',
            "Il rame contribuisce al normale trasporto del ferro nell'organismo",
            'Il rame contribuisce alla normale funzione del sistema immunitario',
        ],
    },
    {
        claim: 'RICCO DI MANGANESE', texts: [
            'Il manganese contribuisce alla normale formazione dei tessuti connettivi',
            'Il manganese contribuisce al normale metabolismo energetico',
            'Il manganese contribuisce al mantenimento di ossa normali',
            'Il manganese contribuisce alla protezione delle cellule dallo stress ossidativo',
        ],
    },
    {
        claim: 'RICCO DI SELENIO', texts: [
            'Il selenio contribuisce alla protezione delle cellule dallo stress ossidativo',
            'Il selenio contribuisce alla normale spermatogenesi',
            'Il selenio contribuisce al mantenimento di capelli normali',
            'Il selenio contribuisce al mantenimento di unghie normali',
            'Il selenio contribuisce alla normale funzione del sistema immunitario',
            'Il selenio contribuisce alla normale funzione della tiroide',
        ],
    },
    {
        claim: 'RICCO DI IODIO', texts: [
            'Lo iodio contribuisce alla normale produzione di ormoni della tiroide ed alla normale funzione tiroidea',
            'Lo iodio contribuisce alla normale funzione del sistema nervoso',
            'Lo iodio contribuisce al mantenimento della normale funzione cognitiva',
            'Lo iodio contribuisce al mantenimento della pelle normale',
        ],
    },
];
// FONTE DI X ammette le stesse indicazioni di RICCO DI X (soglia "fonte" più bassa di "ricco",
// ma l'allegato non distingue il testo dell'indicazione in base a quale delle due sia soddisfatta).
// ⚠️ Testi da fonte formativa (Reg. UE 432/2012 All.) — verificare a campione contro il testo
// ufficiale dell'allegato prima di un uso in produzione su larga scala (skill normativa-alimentare).
for (const nutrient of ['CALCIO', 'FERRO', 'POTASSIO', 'PROTEINE', 'FOSFORO', 'MAGNESIO', 'ZINCO', 'RAME', 'MANGANESE', 'SELENIO', 'IODIO']) {
    const ricco = HEALTH_CLAIMS_432_2012.find(h => h.claim.endsWith(nutrient));
    if (ricco) HEALTH_CLAIMS_432_2012.push({ claim: `FONTE DI ${nutrient}`, texts: ricco.texts });
}

// Reg. (CE) 1924/2006 All. — claim nutrizionali aggiuntivi non presenti in
// nutrizionaleCalcEngine.ts (protetto, 8/16 già implementati lì, mai toccato qui). Modulo
// separato lato Etichette come indicato nel report gap-analysis 2026-08-24. AR minerali:
// stessi valori di Reg. 1169/2011 All. XIII già usati per selectedOptionals in questo file.
export function calcAdditionalClaims(p: CalcResult, isLiquid: boolean): string[] {
    const claims: string[] = [];
    if (p.grassi <= 0.5) claims.push('SENZA GRASSI');
    if (p.saturi <= (isLiquid ? 0.75 : 1.5)) claims.push('A BASSO CONTENUTO DI GRASSI SATURI');
    if (p.saturi <= 0.1) claims.push('SENZA GRASSI SATURI');
    if (p.zuccheri <= 0.5) claims.push('SENZA ZUCCHERI');
    const microAR: { field: keyof CalcResult; label: string; ar: number }[] = [
        { field: 'fosforo', label: 'FOSFORO', ar: 700 },
        { field: 'magnesio', label: 'MAGNESIO', ar: 375 },
        { field: 'zinco', label: 'ZINCO', ar: 10 },
        { field: 'rame', label: 'RAME', ar: 1 },
        { field: 'manganese', label: 'MANGANESE', ar: 2 },
        { field: 'selenio', label: 'SELENIO', ar: 55 },
        { field: 'iodio', label: 'IODIO', ar: 150 },
    ];
    for (const m of microAR) {
        const pct = ((p[m.field] as number) / m.ar) * 100;
        if (pct >= 30) claims.push(`RICCO DI ${m.label}`);
        else if (pct >= 15) claims.push(`FONTE DI ${m.label}`);
    }
    return claims;
}
// Bug noto (AUDIT.md B1): l'engine protetto etichetta il claim sodio come "SODIO", ma il
// Reg. 1924/2006 ammette la dicitura in "SALE" — non tocchiamo l'engine, rietichettiamo qui
// in display, così anche l'archivio salvato da ora in poi ha la dicitura corretta.
export function relabelClaim(c: string): string {
    return c === 'A BASSO CONTENUTO DI SODIO' ? 'A BASSO CONTENUTO DI SALE' : c;
}

// Dichiarazioni complementari — dizionario controllato (All. VI Parte A Reg. 1169/2011:
// menzioni particolari obbligatorie SE il trattamento si applica; Excel righe 12-13/19-21).
// Non genera nulla da solo: obbligatorio solo se il caso descritto è reale per il prodotto.
const COMPLEMENTARY_DECLARATIONS = [
    'Decongelato',
    'Confezionato in atmosfera protettiva',
    'Prodotto a cottura parziale — completare la cottura prima del consumo',
    'Trattato con radiazioni ionizzanti',
    'Ricomposto da parti di carne diverse',
    'Ricomposto da parti di pesce diverse',
    'Con proteine aggiunte di origine animale diversa',
    'Con aggiunta di acqua superiore al 5% del peso del prodotto finito',
];

// Foglio Excel "e. UE" riga 27 — dicitura facoltativa, mai obbligatoria, spiega il senso
// del MAIUSCOLO nella lista ingredienti a chi legge l'etichetta.
const ALLERGEN_NOTE_TEXT = 'Gli ingredienti evidenziati in MAIUSCOLO possono provocare allergie o intolleranze.';

// Foglio Excel "e. UE" — box "NOTE PER IL GRAFICO" (Art. 13(2)-(3) + All. IV Reg. UE
// 1169/2011): prescrizioni statiche per chi impagina la stampa, non derivano da dati
// utente. Testo verbatim dal foglio originale.
const GRAPHIC_NOTE_LINES = [
    'Facendo riferimento alla lettera "x", essa deve avere un\'altezza minima di 1,2 mm; nel caso in cui la superficie disponibile sia inferiore ad 80 cmq, l\'altezza della "x" può avere un\'altezza minima di 0,9 mm.',
    'L\'altezza dei caratteri della quantità netta deve essere: > minimo 6 mm se la quantità è superiore a 1000 (g o ml) · > minimo 4 mm se la quantità è superiore a 200 fino a 1000 (g o ml) · > minimo 3 mm se la quantità è superiore a 50 fino a 200 (g o ml) · > minimo 2 mm se la quantità è inferiore o uguale a 50 (g o ml).',
    'La denominazione del prodotto e il peso netto devono comparire nello stesso campo visivo.',
    'Se lo spazio dedicato alla data di scadenza ed al lotto di produzione non si trova nello stesso campo visivo, bisogna specificare: "vedi.....(lato, coperchio, fondo, ecc.)".',
];

const BACK_MOVABLE_FIELDS: { key: string; label: string }[] = [
    { key: 'ingredients', label: 'Elenco ingredienti' },
    { key: 'allergens', label: 'Dichiarazione allergeni' },
    { key: 'producerAddress', label: 'Produttore / indirizzo' },
    { key: 'countryOrigin', label: 'Paese di origine' },
    { key: 'storageConditions', label: 'Modalità di conservazione' },
    { key: 'consumptionInstructions', label: 'Istruzioni per il consumo' },
    { key: 'alcoholPercent', label: 'Titolo alcolometrico' },
    { key: 'claims', label: 'Claims nutrizionali' },
    { key: 'lotDate', label: 'Lotto / TMC' },
    { key: 'code', label: 'Codice a barre / QR' },
    { key: 'nutritionTable', label: 'Tabella valori nutrizionali' },
    { key: 'imballi', label: 'Raccolta differenziata imballi' },
];

let sliderUid = 0;
function SliderControl({ label, value, min, max, onChange, unit = '%' }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void, unit?: string }) {
    const [id] = useState(() => `slider-${++sliderUid}`);
    return (
        <div className="form-field" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label htmlFor={id} style={{ margin: 0, fontSize: 12 }}>{label}</label>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>{value}{unit}</span>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                value={value}
                aria-valuenow={value}
                aria-valuemin={min}
                aria-valuemax={max}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{ width: '100%', height: 4, background: '#eee', borderRadius: 2, appearance: 'none', cursor: 'pointer' }}
            />
        </div>
    );
}

/**
 * Scala il contenuto (larghezza fissa, es. tabelle valori nutrizionali ~800px pensate per
 * desktop) alla larghezza reale disponibile nell'etichetta — mai sopra il 100%. Senza questo,
 * su un formato mm piccolo la tabella viene tagliata sia a schermo che nell'export PNG
 * (html2canvas cattura solo il bounding box del contenitore, non lo scroll orizzontale).
 */
/**
 * Disegna QR code, barcode Code128 o EAN-13 su un canvas — usato in anteprima ed export.
 * `pxPerMm` è il rapporto px/mm REALE del riquadro etichetta che lo ospita (via ResizeObserver
 * nel componente padre): il canvas era prima dimensionato solo dallo slider `scale` in px
 * arbitrari, scollegato dalla dimensione fisica reale del box — su formati piccoli restava più
 * grande del contenitore e veniva tagliato dall'overflow:hidden dell'antenato (bug reale
 * 2026-08-25). Per EAN-13/CODE128 la dimensione rispetta comunque il floor di magnificazione
 * GS1 (80%) — vedi `barcodeMetrics` — quindi può restare più grande del box invece di sforare
 * sotto la soglia di leggibilità: il chiamante mostra un banner in quel caso, il canvas non lo
 * fa da solo.
 */
function CodeCanvas({ type, value, scale, pxPerMm }: { type: 'qr' | 'barcode' | 'ean13'; value: string; scale: number; pxPerMm: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !value) return;
        setError('');
        if (type === 'qr') {
            // Nessun vincolo GS1 stringente per QR (a differenza di EAN-13/CODE128) — scala
            // liberamente coi mm reali, lato nominale 20mm a scale=100.
            const sidePx = Math.round(20 * (scale / 100) * pxPerMm);
            QRCode.toCanvas(canvas, value, { width: sidePx, margin: 0 })
                .catch(() => setError('Valore non valido per QR'));
        } else if (type === 'ean13') {
            if (!/^\d{12,13}$/.test(value)) {
                setError('EAN-13 richiede 12 o 13 cifre numeriche');
                return;
            }
            const m = barcodeMetrics(scale, pxPerMm);
            try {
                JsBarcode(canvas, value, {
                    format: 'EAN13',
                    width: m.modulePx,
                    height: m.barHeightPx,
                    displayValue: true,
                    fontSize: 9,
                    marginTop: 0,
                    marginBottom: 0,
                    marginLeft: 11 * m.modulePx,
                    marginRight: 7 * m.modulePx,
                });
            } catch {
                setError('Codice EAN-13 non valido (check digit errato)');
            }
        } else {
            const m = barcodeMetrics(scale, pxPerMm);
            try {
                JsBarcode(canvas, value, {
                    format: 'CODE128',
                    width: m.modulePx,
                    height: m.barHeightPx,
                    displayValue: true,
                    fontSize: 9,
                    marginTop: 0,
                    marginBottom: 0,
                    marginLeft: 11 * m.modulePx,
                    marginRight: 7 * m.modulePx,
                });
            } catch {
                setError('Valore non valido per barcode');
            }
        }
    }, [type, value, scale, pxPerMm]);

    if (!value) return null;
    return (
        <div style={{ display: 'inline-block' }}>
            <canvas ref={canvasRef} />
            {error && <div style={{ fontSize: 9, color: '#c53030' }}>{error}</div>}
        </div>
    );
}

export function EtichetteCalc() {
    const { user } = useAuth();
    const isMobile = useMobile();
    const [data, setData] = useState<LabelData>(defaults);
    const [leftTab, setLeftTab] = useState<'dati' | 'grafica'>('dati');

    // Archive state
    const { items: savedLabels, saveItem, deleteItem } = useArchive<LabelData>('aea_archive_etichette');
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [currentId, setCurrentId] = useState<string | undefined>(undefined);
    const [currentName, setCurrentName] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    // A4 — TMC guidato: stato solo UI, il testo finale composto va sempre in data.bestBefore
    // (nessuna modifica allo schema salvato — compatibile con etichette già archiviate).
    const [tmcType, setTmcType] = useState<'preferibilmente' | 'entro'>('preferibilmente');
    const [tmcDate, setTmcDate] = useState('');
    const [tmcGranularity, setTmcGranularity] = useState<'giorno' | 'mese' | 'anno'>('giorno');

    // Guida rapida — stessa UX del tool Nutrizionale (WelcomeModal, slide dedicate)
    const [welcomeSeen, setWelcomeSeen] = useLocalStorage<boolean>('aea_welcome_seen_etichette', false);
    const [showWelcome, setShowWelcome] = useState(!welcomeSeen);

    // Toast + ConfirmDialog + PromptDialog state (replaces native alert/confirm/prompt)
    const toast = useToast();
    const [promptOpen, setPromptOpen] = useState(false);
    const [confirmState, setConfirmState] = useState<{
        open: boolean; title: string; message: string; variant?: 'danger' | 'warning' | 'info';
        confirmLabel?: string; onConfirm: () => void;
    }>({ open: false, title: '', message: '', onConfirm: () => {} });
    const openConfirm = (opts: Omit<typeof confirmState, 'open'>) => setConfirmState({ ...opts, open: true });
    const closeConfirm = () => setConfirmState(prev => ({ ...prev, open: false }));

    // ── Collegamento a una ricetta salvata del tool nutrizionale ──────────────
    // Sola lettura: nessun tocco a NutrizionaleCalc.tsx. Si rilegge sempre
    // dall'archivio al link/cambio ricetta, mai snapshot statico salvato qui.
    const { db, loadingDB, dbError } = useIngredientsDB();
    const { items: nutritionalRecipes } = useArchive<ArchiveData>('nutrizionale-v3');
    const [nationTab, setNationTab] = useState<NationTab>('UE');

    const linkedRecipe: ArchiveItem<ArchiveData> | undefined =
        nutritionalRecipes.find(r => r.id === data.recipeId);

    // Ricostruzione locale ArchiveData → Component[] (stesso schema di
    // NutrizionaleCalc.handleLoad, riscritta qui — nessun modulo condiviso:
    // unico consumatore, estrarlo ora sarebbe astrazione prematura).

    const loadedComponents: Component[] = useMemo(() => {
        if (!linkedRecipe || db.length === 0) return [];
        return readComponenti(linkedRecipe.data).map(sc => {
            const nome = sc.nome || sc.name || '';
            const rows = readRows(sc);
            return {
                id: nome,
                name: nome,
                pzUV: sc.pz_uv || sc.pzUV || 1,
                rows: rows.flatMap(sr => {
                    const srNome = sr.nome || sr.name || '';
                    const found = db.find(dbi => dbi.nome === srNome);
                    if (!found) return [];
                    const grams = typeof sr.grammi === 'number' ? sr.grammi : (sr.grams || 0);
                    return [{
                        id: srNome, ing: found, grams,
                        eurKg: sr.eurKg ?? 0, resa: sr.resa ?? 100,
                    }];
                }),
                // M5: additivi non più scartati — servono per la dichiarazione in etichetta
                // (Art. 18(1) + All. VII Parte C: categoria + nome specifico o numero E).
                additiveRows: (Array.isArray(sc.additiveRows) ? sc.additiveRows : [])
                    .filter(a => a.categoria && a.nomeSpecifico)
                    .map(a => ({ id: `${a.categoria}-${a.nomeSpecifico}`, categoria: a.categoria!, nomeSpecifico: a.nomeSpecifico!, grams: 0, eurKg: 0, resa: 100 })),
            };
        });
    }, [linkedRecipe, db]);

    // Additivi unici di tutta la ricetta (dedup per categoria+nome) — l'app non ha il
    // posizionamento per-ingrediente dell'Excel (i dati salvati li legano al componente, non
    // alla riga), quindi vengono dichiarati in coda alla lista invece che inline: comunque
    // conforme (Art. 18 richiede ordine decrescente di peso e categoria+nome, non la posizione).
    const recipeAdditives = useMemo(() => {
        const seen = new Set<string>();
        const out: { categoria: string; nomeSpecifico: string }[] = [];
        for (const c of loadedComponents) {
            for (const a of c.additiveRows) {
                const key = `${a.categoria}|${a.nomeSpecifico}`;
                if (!seen.has(key)) { seen.add(key); out.push({ categoria: a.categoria, nomeSpecifico: a.nomeSpecifico }); }
            }
        }
        return out;
    }, [loadedComponents]);

    const skippedIngredients = useMemo(() => {
        if (!linkedRecipe) return [];
        const dbNames = new Set(db.map(d => d.nome));
        return readComponenti(linkedRecipe.data)
            .flatMap(sc => readRows(sc).map(sr => sr.nome || sr.name || ''))
            .filter(nome => nome && !dbNames.has(nome));
    }, [linkedRecipe, db]);

    const finishedWeight = linkedRecipe?.data.peso_finito_pz || 0;
    const specificGravityVal = parseFloat(linkedRecipe?.data.specificGravity || '') || 0;
    const isLiquid = specificGravityVal > 0;

    const per100: CalcResult | null = useMemo(
        () => loadedComponents.length ? calcNutrients(loadedComponents, finishedWeight) : null,
        [loadedComponents, finishedWeight]
    );

    const allClaims = useMemo(() => {
        if (!per100) return [];
        return [...calcClaims(per100, isLiquid), ...calcAdditionalClaims(per100, isLiquid)].map(relabelClaim);
    }, [per100, isLiquid]);

    // Costing (Excel ricette!CG:CK) — costo totale ricetta + costo/kg sul peso finito, stessa
    // formula usata in NutrizionaleCalc.tsx (fabbReale = grams/(resa/100), costo = eurKg/1000*fabbReale).
    // Solo lettura/informativo qui: non traccia gli additivi (costo sempre 0 su quelli, per
    // com'è costruito loadedComponents — coerente, non un dato inventato).
    const recipeCost = useMemo(() => {
        if (!linkedRecipe || loadedComponents.length === 0) return null;
        let total = 0;
        for (const c of loadedComponents) {
            for (const r of c.rows) total += (r.eurKg / 1000) * (r.grams / ((r.resa || 100) / 100));
        }
        if (total <= 0) return null;
        return { total, perKg: finishedWeight > 0 ? total / (finishedWeight / 1000) : 0 };
    }, [loadedComponents, finishedWeight, linkedRecipe]);

    // B-c: minerali/vitamine vanno mostrati in etichetta quando ≥15% dell'Assunzione di
    // Riferimento (Reg. UE 1169/2011 All. XIII Parte A) — stessi valori di riferimento già
    // usati in TabUE.tsx (file protetto, non toccato: qui solo lettura di per100, i valori
    // AR sono duplicati dalla stessa fonte normativa, non un nuovo dato inventato).
    const MINERAL_VITAMIN_AR: Partial<Record<keyof SelectedOptionals, { field: keyof CalcResult; ar: number }>> = {
        potassio: { field: 'potassio', ar: 2000 }, calcio: { field: 'calcio', ar: 800 },
        fosforo: { field: 'fosforo', ar: 700 }, magnesio: { field: 'magnesio', ar: 375 },
        ferro: { field: 'ferro', ar: 14 }, zinco: { field: 'zinco', ar: 10 },
        rame: { field: 'rame', ar: 1 }, manganese: { field: 'manganese', ar: 2 },
        selenio: { field: 'selenio', ar: 55 }, iodio: { field: 'iodio', ar: 150 },
        vitA: { field: 'vitA_eq', ar: 800 }, vitD: { field: 'vitD', ar: 5 },
        vitE: { field: 'vitE', ar: 12 }, vitK: { field: 'vitK', ar: 75 },
        vitC: { field: 'vitC', ar: 80 }, vitB1: { field: 'vitB1', ar: 1.1 },
        vitB2: { field: 'vitB2', ar: 1.4 }, vitB3: { field: 'vitB3', ar: 16 },
        vitB5: { field: 'vitB5', ar: 6 }, vitB6: { field: 'vitB6', ar: 1.4 },
        vitB9: { field: 'vitB9', ar: 200 }, vitB12: { field: 'vitB12', ar: 2.4 },
    };
    const autoSelectedOptionals: SelectedOptionals = useMemo(() => {
        if (!per100) return DEFAULT_OPTIONALS;
        const out = { ...DEFAULT_OPTIONALS };
        for (const key in MINERAL_VITAMIN_AR) {
            const k = key as keyof SelectedOptionals;
            const ref = MINERAL_VITAMIN_AR[k]!;
            out[k] = ((per100[ref.field] as number) / ref.ar) * 100 >= 15;
        }
        return out;
    }, [per100]);

    // Allergeni: stessa logica di NutrizionaleCalc.tsx (presentAllergens/crossAllergens),
    // riscritta qui in loco — 10 righe, non vale un modulo condiviso per un solo consumatore.
    const allRowsForAllergens = useMemo(
        () => loadedComponents.flatMap(c => c.rows.map(r => ({ ing: r.ing }))),
        [loadedComponents]
    );
    const presentAllergens = useMemo(() => {
        const set2 = new Set<string>();
        allRowsForAllergens.forEach(({ ing }) => ALLERGEN_FIELDS.forEach(({ key, label }) => { if (ing[key]) set2.add(label); }));
        return [...set2];
    }, [allRowsForAllergens]);
    const crossAllergensList = useMemo(() => {
        const set2 = new Set<string>();
        allRowsForAllergens.forEach(({ ing }) => CROSS_FIELDS.forEach(({ key, label }) => {
            if (ing[key] && !presentAllergens.includes(label)) set2.add(label);
        }));
        return [...set2];
    }, [allRowsForAllergens, presentAllergens]);
    // M2 — unione fornitore (calcolato) + stabilimento utente (selezione manuale in
    // data.facilityAllergens), come fa l'Excel (`e. UE!T22 = CONCAT(T24:DB26)`). Mai un
    // allergene già dichiarato "presente" (sarebbe ridondante/fuorviante come traccia).
    const combinedCrossAllergens = useMemo(() => {
        const set2 = new Set(crossAllergensList);
        data.facilityAllergens.forEach(a => { if (!presentAllergens.includes(a)) set2.add(a); });
        return [...set2];
    }, [crossAllergensList, data.facilityAllergens, presentAllergens]);

    // Lista ingredienti ordinata secondo la logica del foglio Excel "ordinamento":
    // - nome: colonna "DICHIARAZIONE IN ETICHETTA" del database (ing.etichetta), non il
    //   nome interno — l'Excel non genera mai il testo di etichetta, lo legge già pronto
    //   (allergeni MAIUSCOLO e sotto-ingredienti tra parentesi curati a monte nel DB);
    // - ordinamento: per peso grezzo al momento dell'uso (% in ricetta, Art. 18(1) Reg.
    //   1169/2011), NON per QUID post-calo-cottura — sono chiavi diverse nell'Excel
    //   (ordinamento!BX = % in ricetta grezza, BY = QUID) e possono invertire l'ordine
    //   su prodotti con calo peso in cottura;
    // - acqua: esclusa dalla dichiarazione se il QUID è sotto il 5% (ordinamento!F10,
    //   Reg. 1169/2011 All. VII Parte A p.5 — calo per evaporazione, non da dichiarare).
    const orderedIngredientsWithQuid = useMemo(() => {
        const map = new Map<string, { ing: DBIngredient; grammiXpzuv: number }>();
        for (const c of loadedComponents) {
            const pzUV = c.pzUV || 1;
            for (const r of c.rows) {
                const ex = map.get(r.ing.nome);
                if (ex) ex.grammiXpzuv += r.grams / pzUV;
                else map.set(r.ing.nome, { ing: r.ing, grammiXpzuv: r.grams / pzUV });
            }
        }
        const rows = [...map.values()];
        const totGrammiXpzuv = rows.reduce((s, r) => s + r.grammiXpzuv, 0);
        const pesoFinitoPzCalc = finishedWeight > 0 ? finishedWeight : totGrammiXpzuv;
        const caloAcqua = totGrammiXpzuv > pesoFinitoPzCalc ? totGrammiXpzuv - pesoFinitoPzCalc : 0;
        const isAcqua = (nome: string) => (nome || '').trim().toLowerCase() === 'acqua';
        return rows
            .map(r => ({
                nome: r.ing.nome,
                etichetta: r.ing.etichetta || r.ing.nome,
                quid: calcQuid(r.grammiXpzuv, isAcqua(r.ing.nome), caloAcqua, pesoFinitoPzCalc),
                pctGrezzo: totGrammiXpzuv > 0 ? (r.grammiXpzuv / totGrammiXpzuv) * 100 : 0,
                ing: r.ing,
            }))
            .filter(r => !(isAcqua(r.nome) && r.quid < 5))
            // B-d: l'acqua aggiunta va ordinata sul peso nel PRODOTTO FINITO (quid, post-calo
            // cottura), non sul peso in ricetta come tutti gli altri ingredienti (All. VII
            // Parte A p.5 Reg. 1169/2011) — su un forte calo peso finiva troppo in alto.
            .sort((a, b) => (isAcqua(b.nome) ? b.quid : b.pctGrezzo) - (isAcqua(a.nome) ? a.quid : a.pctGrezzo));
    }, [loadedComponents, finishedWeight]);

    // Foglio Excel "e. UE" righe 14-16 — QUID degli ingredienti caratterizzanti ripetuto come
    // riga dedicata "grammi di X: Yg per 100g di prodotto", oltre alla % già inline nella lista
    // ingredienti. Stesso dato (QUID = g per 100g di prodotto per definizione, Art. 22 Reg.
    // 1169/2011), solo un secondo formato di visualizzazione richiesto dal documento di lavoro.
    const quidLines = useMemo(() => {
        return data.characterizingIngredients
            .map(nome => orderedIngredientsWithQuid.find(r => r.nome === nome))
            .filter((r): r is NonNullable<typeof r> => !!r)
            .map(r => `grammi di ${r.etichetta}: ${r.quid.toFixed(1).replace('.', ',')} g per 100 g di prodotto`);
    }, [data.characterizingIngredients, orderedIngredientsWithQuid]);

    // A3 — verifica allergeni MAIUSCOLO sul testo REALE (non solo alla generazione
    // automatica): se un allergene compare nel testo ma non esattamente in MAIUSCOLO,
    // l'Art. 21 Reg. 1169/2011 non è rispettato (deve essere distinguibile dal resto).
    const allergenIssues = useMemo(() => {
        if (!data.ingredients) return [];
        const issues: string[] = [];
        for (const { label } of ALLERGEN_FIELDS) {
            const word = matchWord(label);
            const re = new RegExp(`\\b${word.toLowerCase()}\\b`, 'gi');
            const matches = data.ingredients.match(re);
            if (matches && matches.some(m => m !== word)) {
                issues.push(word);
            }
        }
        return issues;
    }, [data.ingredients]);

    // QUID% stampato solo sugli ingredienti "caratterizzanti" selezionati dall'utente
    // (ordinamento!H9/BZ nell'Excel) — non su tutti, come richiesto da Art. 22 + All. VIII
    // Reg. 1169/2011 (il QUID è dovuto solo per ingredienti evidenziati in denominazione
    // o immagine, non genericamente su tutta la lista).
    const generatedIngredientsText = useMemo(() => {
        if (orderedIngredientsWithQuid.length === 0) return '';
        const ingredientsPart = orderedIngredientsWithQuid
            .map(r => {
                const testo = highlightAllergens(r.etichetta);
                return data.characterizingIngredients.includes(r.nome)
                    ? `${testo} (${r.quid.toFixed(1).replace('.', ',')}%)`
                    : testo;
            })
            .join(', ');
        // M5: additivi in coda, "categoria (nome specifico)" — Art. 18(1) + All. VII Parte C.
        const additivesPart = recipeAdditives.map(a => `${a.categoria} (${a.nomeSpecifico})`).join(', ');
        return additivesPart ? `${ingredientsPart}, ${additivesPart}` : ingredientsPart;
    }, [orderedIngredientsWithQuid, data.characterizingIngredients, recipeAdditives]);

    // Aggiornamento automatico del testo ingredienti a ogni toggle QUID/cambio ricetta —
    // prima si aggiornava SOLO cliccando "Rigenera ingredienti/allergeni/claims dalla ricetta":
    // spuntare un ingrediente caratterizzante non si rifletteva subito in anteprima (richiesta
    // esplicita 2026-08-25, risposta "deve aggiornarsi da solo" senza protezione aggiuntiva per
    // edit manuali — un edit manuale del campo resta visibile finché non arriva un nuovo
    // toggle/cambio ricetta, poi viene sovrascritto). Allergeni/claim restano manuali via
    // "Rigenera" — non richiesto, evita di ampliare lo scope oltre quanto chiesto.
    useEffect(() => {
        if (!data.recipeId || !linkedRecipe || !generatedIngredientsText) return;
        setData(prev => prev.ingredients === generatedIngredientsText ? prev : { ...prev, ingredients: generatedIngredientsText });
    }, [data.recipeId, generatedIngredientsText]);

    const linkRecipe = (id: string) => set('recipeId', id || undefined);

    const toggleCharacterizing = (nome: string) => {
        const has = data.characterizingIngredients.includes(nome);
        set('characterizingIngredients', has
            ? data.characterizingIngredients.filter(n => n !== nome)
            : [...data.characterizingIngredients, nome]);
    };

    const regenerateFromRecipe = () => {
        if (!linkedRecipe) return;
        setData(prev => ({
            ...prev,
            productName: prev.productName || linkedRecipe.data.nome_prodotto || (linkedRecipe.data as unknown as { productName?: string }).productName || '',
            ingredients: generatedIngredientsText,
            allergens: [
                presentAllergens.length ? `Contiene: ${presentAllergens.join(', ')}.` : '',
                combinedCrossAllergens.length ? `Può contenere tracce di: ${combinedCrossAllergens.join(', ')}.` : '',
            ].filter(Boolean).join(' '),
            claimsSelezionati: allClaims,
        }));
        toast.success('Campi rigenerati dalla ricetta collegata — verifica e correggi prima di pubblicare.');
    };

    const set = <K extends keyof LabelData>(field: K, val: LabelData[K]) => {
        setData((prev) => ({ ...prev, [field]: val }));
        setIsDirty(true);
    };

    // Fronte/retro: un campo è sul fronte finché il retro non è attivo E il campo non è stato
    // spostato esplicitamente. productName/netWeight non passano mai da qui — sempre onFront.
    const toggleBackField = (key: string) => {
        const has = data.backFields.includes(key);
        set('backFields', has ? data.backFields.filter(k => k !== key) : [...data.backFields, key]);
    };
    const onFront = (key: string) => !data.hasBackLabel || !data.backFields.includes(key);
    const onBack = (key: string) => data.hasBackLabel && data.backFields.includes(key);

    // A4 — compone il testo TMC finale dai 3 controlli guidati e lo scrive in data.bestBefore.
    const applyTmc = (type: typeof tmcType, dateStr: string, gran: typeof tmcGranularity) => {
        if (!dateStr) return;
        const d = new Date(`${dateStr}T00:00:00`);
        if (Number.isNaN(d.getTime())) return;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const dateFmt = gran === 'giorno' ? `${dd}/${mm}/${yyyy}` : gran === 'mese' ? `${mm}/${yyyy}` : `${yyyy}`;
        const label = type === 'preferibilmente' ? 'Da consumarsi preferibilmente entro' : 'Da consumarsi entro';
        set('bestBefore', `${label}: ${dateFmt}`);
    };

    const handleFileUpload = (field: 'bgImageUrl' | 'logoUrl', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                set(field, reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const requiredFields: { id: string; label: string; ok: boolean }[] = [
        { id: 'et-nome', label: 'Denominazione del prodotto', ok: !!data.productName },
        { id: 'et-produttore', label: 'Produttore / Responsabile', ok: !!data.producer },
        { id: 'et-peso-netto', label: 'Quantità netta', ok: !!data.netWeight },
        { id: 'et-ingredienti', label: 'Elenco ingredienti', ok: !!data.ingredients },
    ];
    const missingFieldDefs = requiredFields.filter(f => !f.ok);
    const missingFields = missingFieldDefs.map(f => f.label);
    const isComplete = missingFields.length === 0;

    const focusField = (id: string) => {
        setLeftTab('dati');
        // setTimeout invece di requestAnimationFrame: rAF non scatta su tab in background,
        // setTimeout(0) sì (dopo il render del cambio tab).
        setTimeout(() => {
            const el = document.getElementById(id);
            el?.focus();
            el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 0);
    };

    const doSaveWithName = (nameToSave: string) => {
        if (!nameToSave) return;
        const id = saveItem(nameToSave, data, currentId);
        setCurrentId(id);
        setCurrentName(nameToSave);
        setIsDirty(false);
        toast.success("Etichetta salvata con successo nell'archivio!");
    };
    const handleSave = () => {
        const readyName = currentName || data.productName;
        if (readyName) { doSaveWithName(readyName); return; }
        setPromptOpen(true);
    };

    const handleLoad = (item: { data: LabelData; id: string; name: string }) => {
        // Merge coi default: etichette salvate prima dell'introduzione di codeType/codeValue/codeScale
        // non hanno questi campi — senza merge risulterebbero undefined invece che 'none'/''/100.
        setData({ ...defaults, ...item.data });
        setCurrentId(item.id);
        setCurrentName(item.name);
        setIsArchiveOpen(false);
        setIsDirty(false);
    };

    const resetLabel = () => {
        setData(defaults);
        setCurrentId(undefined);
        setCurrentName('');
        setIsDirty(false);
    };
    const handleNew = () => {
        if (data.productName || data.producer) {
            openConfirm({
                title: 'Nuova etichetta',
                message: 'Vuoi iniziare una nuova etichetta? I dati non salvati andranno persi.',
                variant: 'warning',
                confirmLabel: 'Continua',
                onConfirm: () => { closeConfirm(); resetLabel(); },
            });
            return;
        }
        resetLabel();
    };

    const handlePDF = () => {
        const date = new Date().toLocaleDateString('it-IT');
        generatePDFReport({
            title: 'Etichetta Alimentare',
            toolName: 'Generatore Etichette Alimentari',
            userName: user?.name ?? '',
            company: user?.company ?? '',
            date,
            inputs: [
                { label: 'Prodotto', value: data.productName },
                { label: 'Produttore', value: data.producer },
                { label: 'Indirizzo stabilimento', value: data.address },
                ...(data.legalAddress ? [{ label: 'Sede legale', value: data.legalAddress }] : []),
                { label: 'Peso netto', value: data.netWeight },
                { label: 'Paese origine', value: data.countryOrigin },
            ],
            outputs: [
                { label: 'Denominazione', value: data.productName },
                { label: 'Ingredienti', value: data.ingredients.length > 60 ? data.ingredients.slice(0, 60) + '...' : data.ingredients },
                { label: 'Allergeni', value: data.allergens || 'Nessuno dichiarato' },
                { label: 'Conservazione', value: data.storageConditions },
                { label: 'TMC/Scadenza', value: data.bestBefore },
                { label: 'Lotto', value: data.lotNumber },
                ...(data.drainedWeight ? [{ label: 'Peso sgocciolato', value: data.drainedWeight }] : []),
                ...(data.alcoholPercent ? [{ label: 'Titolo alcolometrico', value: data.alcoholPercent }] : []),
                ...(data.consumptionInstructions ? [{ label: 'Istruzioni per il consumo', value: data.consumptionInstructions }] : []),
                ...(data.claimsSelezionati.length ? [{ label: 'Claims nutrizionali', value: (() => {
                    const v = data.claimsSelezionati.join(', ');
                    return v.length > 60 ? v.slice(0, 60) + '...' : v;
                })() }] : []),
            ],
        });
    };

    // Export etichetta come immagine 1:1 alle dimensioni reali (per Bartender/NiceLabel
    // o importazione diretta in software di stampa etichette) — scala calcolata sul
    // rapporto tra larghezza renderizzata a schermo e larghezza fisica a 300dpi, così
    // l'immagine esportata corrisponde esattamente alle dimensioni mm impostate.
    const labelPreviewRef = useRef<HTMLDivElement>(null);
    const labelBackPreviewRef = useRef<HTMLDivElement>(null);
    const [exportingLabel, setExportingLabel] = useState<'front' | 'back' | null>(null);
    const PRINT_DPI = 300;
    const mmToPx = (mm: number, dpi: number) => (mm * dpi) / 25.4;

    // Esporta un lato (fronte o retro) come PNG a dimensione fisica reale — usata da entrambi
    // i bottoni, unica differenza è quale ref/dimensioni/suffisso passare.
    const exportFace = async (
        ref: React.RefObject<HTMLDivElement | null>,
        widthMm: string,
        face: 'front' | 'back',
        suffix: string,
    ) => {
        const el = ref.current;
        if (!el) return;
        setExportingLabel(face);
        try {
            const renderedWidthPx = el.getBoundingClientRect().width;
            const targetWidthPx = mmToPx(Number(widthMm) || 100, PRINT_DPI);
            const scale = targetWidthPx / renderedWidthPx;
            const canvas = await html2canvas(el, {
                scale,
                useCORS: true,
                backgroundColor: face === 'front' && data.bgImageUrl ? null : (data.theme === 'dark' ? '#222222' : '#ffffff'),
                ignoreElements: (node) => node.classList.contains('print-ignore'),
            });
            const fileName = `${(data.productName || 'etichetta').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_${suffix}.png`;
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success(`Etichetta ${face === 'front' ? 'fronte' : 'retro'} esportata — dimensione reale, pronta per software di stampa.`);
        } catch {
            toast.error("Errore durante l'esportazione dell'etichetta.");
        } finally {
            setExportingLabel(null);
        }
    };
    const handleExportFront = () => exportFace(labelPreviewRef, data.widthMm, 'front', `fronte_${data.widthMm}x${data.heightMm}mm`);
    const handleExportBack = () => exportFace(labelBackPreviewRef, data.backWidthMm, 'back', `retro_${data.backWidthMm}mm`);

    // M6 — scheda etichetta completa per grafico/tipografia (Guida PDF cap. 13): a differenza
    // dell'export fronte/retro (dimensione fisica reale, solo ciò che va in stampa), qui va
    // TUTTO — lista ingredienti integrale, tabella, claims, imballi, identificativi scheda —
    // così come l'Excel produce la scheda "e. UE" da trasmettere. Renderizzata fuori schermo,
    // catturata da generateEtichettaPDF (già scritto, mai usato prima d'ora).
    const schedaRef = useRef<HTMLDivElement>(null);
    const [exportingScheda, setExportingScheda] = useState(false);
    const handleSchedaPDF = async () => {
        if (!schedaRef.current) return;
        setExportingScheda(true);
        try {
            const fileName = `scheda_${(data.productName || 'etichetta').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}${data.schedaRevisione ? `_rev${data.schedaRevisione}` : ''}.pdf`;
            await generateEtichettaPDF(schedaRef.current, fileName);
            toast.success('Scheda etichetta esportata — pronta per grafico/tipografia.');
        } catch {
            toast.error('Errore durante la generazione della scheda.');
        } finally {
            setExportingScheda(false);
        }
    };

    // Base di fallback per fontScale/visualFontScale finché il ResizeObserver non ha ancora
    // misurato nulla (primo render, renderedWidthPx/HeightPx a 0).
    const baseDim = Math.min(Number(data.widthMm), Number(data.heightMm));

    // A5 — controllo leggibilità: converte il corpo testo da px CSS a mm fisici usando
    // lo stesso rapporto larghezza-renderizzata/larghezza-mm già usato per l'export.
    // Soglia 1,2mm da Reg. UE 1169/2011 Art. 13(2) (x-height minima) — approssimazione
    // diagnostica sul font-size, non una misura esatta dell'x-height del font Arial.
    const [labelRenderedWidthPx, setLabelRenderedWidthPx] = useState(0);
    const [labelRenderedHeightPx, setLabelRenderedHeightPx] = useState(0);
    // scrollHeight = altezza vera del contenuto (anche quello tagliato dall'overflow:hidden
    // del riquadro a dimensione fissa); clientHeight (qui offsetHeight, border-box) è quanto si
    // vede davvero. La differenza tra i due è il segnale di overflow reale, ora che il riquadro
    // fisico non cresce più oltre heightMm (vedi labelPreviewRef sotto).
    const [labelScrollHeightPx, setLabelScrollHeightPx] = useState(0);
    useEffect(() => {
        const el = labelPreviewRef.current;
        if (!el) return;
        // offsetWidth/offsetHeight (border-box) invece di entry.contentRect (content-box):
        // contentRect esclude il padding, ma fontScale/visualFontScale determina proprio le
        // dimensioni del padding interno (vedi overlay testuale più sotto) — misurare il
        // content-box creerebbe un ciclo scala→padding→misura→scala. Il border-box non dipende
        // dal padding interno, spezza il ciclo (analisi architetturale 2026-08-25).
        const ro = new ResizeObserver(() => {
            setLabelRenderedWidthPx(el.offsetWidth);
            setLabelRenderedHeightPx(el.offsetHeight);
            setLabelScrollHeightPx(el.scrollHeight);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    // fontScale nasce dai px REALMENTE renderizzati, non dai mm dichiarati: il riquadro
    // anteprima è clampato a schermo da `maxWidth: min(widthMm mm, 100%)`, quindi sopra la
    // soglia di clamping del pannello i mm dichiarati e i px reali divergono — usare i mm
    // dichiarati faceva crescere il font oltre lo spazio disponibile nel riquadro visibile,
    // portandolo a sforare/uscire dal campo visivo (bug reale 2026-08-25). Sotto la soglia di
    // clamping è algebricamente identica alla vecchia formula baseDim/100 — zero regressioni
    // sui formati che già funzionavano.
    const fontScale = visualFontScale(labelRenderedWidthPx, labelRenderedHeightPx, baseDim);
    // Soglia leggibilità e esenzioni modulate sulla superficie maggiore dell'etichetta
    // (Art. 13(2)+All.IV: 0,9mm invece di 1,2mm se <80cm²; All.V p.18: dichiarazione
    // nutrizionale non obbligatoria se <25cm²; Art.16(2): quasi tutto facoltativo se <10cm²,
    // restano solo denominazione/allergeni/quantità netta/TMC).
    const frontSurfaceCm2 = (Number(data.widthMm) * Number(data.heightMm)) / 100;
    const MIN_READABLE_MM = frontSurfaceCm2 < 80 ? 0.9 : 1.2;
    const isNutritionDeclarationExempt = frontSurfaceCm2 > 0 && frontSurfaceCm2 < 25;
    const isMostFieldsExempt = frontSurfaceCm2 > 0 && frontSurfaceCm2 < 10;
    const mmPerPx = labelRenderedWidthPx > 0 ? Number(data.widthMm) / labelRenderedWidthPx : 0;
    const bodyFontSizeMm = mmPerPx * (11 * fontScale);
    const isBodyTextReadable = bodyFontSizeMm >= MIN_READABLE_MM;
    // Il rapporto mm/px è uniforme in entrambi gli assi (nessuno stretch indipendente in X/Y
    // nel contenitore) — stesso mmPerPx converte correttamente anche l'altezza renderizzata.
    // contentHeightMm ora usa scrollHeight (contenuto vero, anche la parte tagliata) — con
    // aspectRatio sul contenitore fisso, contentRect.height da sola varrebbe sempre heightMm,
    // nascondendo l'overflow invece di segnalarlo.
    const contentHeightMm = mmPerPx > 0 ? labelScrollHeightPx * mmPerPx : 0;
    const isFrontHeightOverflowing = contentHeightMm > Number(data.heightMm) * 1.02;

    // Stesso controllo applicato al retro (se attivo): il corpo testo obbligatorio sposta lì
    // resta comunque soggetto all'Art. 13(2) — la leggibilità va garantita su entrambi i lati.
    const backBaseDim = Math.min(Number(data.backWidthMm) || 100, Number(data.backHeightMm) || 150);
    const [backRenderedWidthPx, setBackRenderedWidthPx] = useState(0);
    const [backRenderedHeightPx, setBackRenderedHeightPx] = useState(0);
    const [backScrollHeightPx, setBackScrollHeightPx] = useState(0);
    useEffect(() => {
        if (!data.hasBackLabel) return;
        const el = labelBackPreviewRef.current;
        if (!el) return;
        // offsetWidth/offsetHeight (border-box), stesso motivo del fronte: qui il padding del
        // riquadro osservato dipende direttamente da backFontScale — misurare il content-box
        // (contentRect) creerebbe un ciclo scala→padding→misura→scala.
        const ro = new ResizeObserver(() => {
            setBackRenderedWidthPx(el.offsetWidth);
            setBackRenderedHeightPx(el.offsetHeight);
            setBackScrollHeightPx(el.scrollHeight);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [data.hasBackLabel]);
    // Stesso principio del fronte: scala dai px reali renderizzati, non dai mm dichiarati.
    const backFontScale = visualFontScale(backRenderedWidthPx, backRenderedHeightPx, backBaseDim);
    const backSurfaceCm2 = (Number(data.backWidthMm) * Number(data.backHeightMm)) / 100;
    const BACK_MIN_READABLE_MM = backSurfaceCm2 < 80 ? 0.9 : 1.2;
    const backMmPerPx = backRenderedWidthPx > 0 ? Number(data.backWidthMm) / backRenderedWidthPx : 0;
    const backBodyFontSizeMm = backMmPerPx * (11 * backFontScale);
    const isBackBodyTextReadable = backBodyFontSizeMm >= BACK_MIN_READABLE_MM;
    // scrollHeight (vero, anche tagliato) invece di contentRect.height (ora fissa a
    // backHeightMm per l'aspect-ratio sul contenitore) — stesso motivo del fronte.
    const backContentHeightMm = backMmPerPx > 0 ? backScrollHeightPx * backMmPerPx : 0;
    const isBackHeightOverflowing = data.hasBackLabel && backContentHeightMm > Number(data.backHeightMm) * 1.02;

    // Selezione automatica del formato tabella nutrizionale per farla rientrare nell'altezza
    // impostata: 0 = tabella piena, via via più compatto. USA/Canada hanno già 3 varianti
    // testate (verticale/orizzontale/lineare); UE/Australia/Arabi hanno tabella + un formato
    // lineare nuovo (Art. 34(2) Reg. 1169/2011 per UE; stesso principio per AU/Arabi).
    // Ratchet in una direzione sola: scende di formato, non risale da sola nella sessione.
    const NATION_MAX_STEP: Record<NationTab, number> = { UE: 1, USA: 2, Canada: 2, Australia: 1, Arabi: 1 };
    const [nutritionFormatStep, setNutritionFormatStep] = useState<Partial<Record<NationTab, number>>>({});
    // Vero solo quando siamo già al formato più compatto disponibile per il mercato E continua a
    // sforare: a differenza di nutritionFormatStep (che scala automaticamente), qui non c'è più
    // nulla da ridurre via formato — serve intervento umano (etichetta più grande o retro).
    const [nutritionOverflowsAtMax, setNutritionOverflowsAtMax] = useState<Partial<Record<NationTab, boolean>>>({});
    // Specchio sincrono di nutritionFormatStep: measure() è la stessa closure per tutta la vita
    // dell'effetto (le deps non includono nutritionFormatStep), quindi leggere lo state React
    // dentro measure() darebbe un valore stantio dopo il primo salto di formato. Il ref è sempre
    // aggiornato nello stesso punto in cui si decide il nuovo step.
    const nutritionFormatStepRef = useRef<Partial<Record<NationTab, number>>>({});
    const nutritionMeasureRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!per100) return;
        const el = nutritionMeasureRef.current;
        if (!el) return;
        const measure = () => {
            if (mmPerPx <= 0 || labelRenderedWidthPx <= 0) return;
            // Sia larghezza che altezza: le tabelle ufficiali hanno larghezza fissa in px
            // (es. TabUSA 740px) e non si adattano da sole a un'etichetta stretta — senza il
            // controllo larghezza sforavano lateralmente restando sul formato pieno.
            const heightBudgetMm = Number(data.heightMm) * 0.55; // euristica: la tabella non dovrebbe occupare oltre metà circa dell'etichetta
            const overflowsHeight = (el.scrollHeight * mmPerPx) > heightBudgetMm;
            const overflowsWidth = el.scrollWidth > labelRenderedWidthPx + 2;
            const maxStep = NATION_MAX_STEP[nationTab] ?? 0;
            const current = Math.min(nutritionFormatStepRef.current[nationTab] ?? 0, maxStep);
            // Salta dritto al formato più compatto (non +1 alla volta): se verticale e
            // orizzontale hanno la stessa larghezza (caso reale, USA/Canada), passare da
            // uno all'altro non cambia le dimensioni renderizzate — ResizeObserver non
            // rileva alcun cambiamento e il passo successivo non scatta mai, restando
            // bloccato a metà con la tabella ancora fuori misura (bug trovato 2026-08-25).
            const nextStep = (overflowsHeight || overflowsWidth) && current < maxStep ? maxStep : current;
            if (nextStep !== nutritionFormatStepRef.current[nationTab]) {
                nutritionFormatStepRef.current = { ...nutritionFormatStepRef.current, [nationTab]: nextStep };
                setNutritionFormatStep(prev => ({ ...prev, [nationTab]: nextStep }));
            }
            const flag = shouldFlagNutritionOverflow(nextStep, maxStep, overflowsHeight, overflowsWidth);
            setNutritionOverflowsAtMax(prev => (prev[nationTab] === flag ? prev : { ...prev, [nationTab]: flag }));
        };
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        measure();
        return () => ro.disconnect();
    }, [per100, nationTab, mmPerPx, data.heightMm, labelRenderedWidthPx]);
    const isNutritionTableOversized = !!nutritionOverflowsAtMax[nationTab];
    // 21 CFR 101.9(j)(13)(i)(A): sotto 12 sq in (~77,4cm²) di superficie disponibile per
    // l'etichettatura, la FDA ammette di omettere la Nutrition Facts indicando indirizzo/telefono
    // per richiederla — unica alternativa oltre a tabulare/lineare compatto. Nessuna soglia
    // equivalente verificata con fonte primaria per Canada/UE/Australia/Arabi: per quei mercati
    // il banner resta generico (aumenta etichetta o sposta sul retro), senza citare un numero.
    const FDA_SMALL_PACKAGE_CM2 = 12 * 6.4516;
    const canCiteFdaSmallPackage = nationTab === 'USA' && frontSurfaceCm2 > 0 && frontSurfaceCm2 < FDA_SMALL_PACKAGE_CM2;

    // px/mm reale del riquadro (inverso di mmPerPx) — fallback a CSS_PX_PER_MM (1:1 fisico)
    // prima che il ResizeObserver misuri, stesso criterio di visualFontScale.
    const pxPerMmFront = labelRenderedWidthPx > 0 ? labelRenderedWidthPx / Number(data.widthMm) : CSS_PX_PER_MM;
    const pxPerMmBack = backRenderedWidthPx > 0 ? backRenderedWidthPx / Number(data.backWidthMm) : CSS_PX_PER_MM;
    const codeMetricsFront = barcodeMetrics(data.codeScale, pxPerMmFront);
    const codeMetricsBack = barcodeMetrics(data.codeScale, pxPerMmBack);
    // Confronto approssimato con l'intera larghezza del riquadro (non con lo slot esatto del
    // footer, che dipende da altri elementi in flex accanto) — sufficiente a intercettare il
    // caso reale segnalato (barcode più largo dell'intera etichetta), non un fit pixel-perfect.
    const isCodeTooSmallFront = data.codeType !== 'qr' && labelRenderedWidthPx > 0 && codeMetricsFront.symbolWidthPx > labelRenderedWidthPx;
    const isCodeTooSmallBack = data.codeType !== 'qr' && backRenderedWidthPx > 0 && codeMetricsBack.symbolWidthPx > backRenderedWidthPx;
    const showCodeFront = onFront('code') && data.codeType !== 'none' && !!data.codeValue;
    const showCodeBack = onBack('code') && data.codeType !== 'none' && !!data.codeValue;
    // Framework responsive 2026-08-25 — Opzione A: su etichette strette il barcode condivide la
    // riga con peso/lotto invece di avere una riga centrata tutta sua (che lo farebbe sembrare
    // ancora più dominante). Solo un layout diverso, non tocca la dimensione legale del codice.
    const shareBarcodeRowFront = showCodeFront && shouldShareBarcodeRow(codeMetricsFront.symbolWidthPx, labelRenderedWidthPx);
    const shareBarcodeRowBack = showCodeBack && shouldShareBarcodeRow(codeMetricsBack.symbolWidthPx, backRenderedWidthPx);
    // Opzione B — formati orizzontali larghi: corpo testo e tabella+imballi si affiancano invece
    // di impilarsi, per non sprecare la larghezza extra (stessa gerarchia, solo due colonne).
    const useTwoColumnFront = shouldUseTwoColumnLayout(Number(data.widthMm), Number(data.heightMm));
    const useTwoColumnBack = data.hasBackLabel && shouldUseTwoColumnLayout(Number(data.backWidthMm), Number(data.backHeightMm));

    const leftPanel = (
        <>
            <div className="expert-desktop-tabbar" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'white', flexShrink: 0, height: 40 }}>
                {([
                    { key: 'dati', label: 'Dati Etichetta' },
                    { key: 'grafica', label: 'Grafica' },
                ] as { key: 'dati' | 'grafica'; label: string }[]).map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setLeftTab(tab.key)}
                        className={`expert-tab-btn${leftTab === tab.key ? ' active' : ''}`}
                        style={{ marginBottom: -1 }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div key={leftTab} className="expert-tab-content animate-fade-up" style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {leftTab === 'dati' && (
                    <>
                        <div className="card" style={{ marginBottom: 20 }}>
                        {!linkedRecipe && !isDirty ? (
                            <div className="et-hero">
                                <div className="et-hero-icon"><Sparkles size={22} color="#fff" /></div>
                                <h3 style={{ margin: '0 0 4px' }}>Parti da una ricetta già calcolata</h3>
                                <p className="hint" style={{ margin: '0 0 14px', maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>
                                    Compilo io ingredienti in ordine di peso, percentuali QUID, allergeni e tabella
                                    nutrizionale — tu correggi solo quello che serve.
                                </p>
                                <select
                                    id="et-ricetta"
                                    value={data.recipeId || ''}
                                    onChange={(e) => linkRecipe(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontWeight: 600 }}
                                >
                                    <option value="">— Seleziona una ricetta —</option>
                                    {nutritionalRecipes.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                                {nutritionalRecipes.length === 0 && (
                                    <p className="hint" style={{ marginTop: 8 }}>
                                        Nessuna ricetta salvata nel tool Valori Nutrizionali — puoi comunque compilare a mano.
                                    </p>
                                )}
                                <div className="et-hero-divider"><span>oppure</span></div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsArchiveOpen(true)}>
                                        Carica da archivio
                                    </button>
                                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsDirty(true)}>
                                        Compila da zero
                                    </button>
                                </div>
                            </div>
                        ) : (
                        <>
                            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Ricetta collegata</h3>
                            <p className="hint" style={{ marginTop: -8, marginBottom: 12 }}>
                                Collega una ricetta salvata nel tool Valori Nutrizionali per generare automaticamente
                                ingredienti, QUID, allergeni e tabella nutrizionale. Restano tutti editabili.
                            </p>
                            <div className="form-field">
                                <label htmlFor="et-ricetta">Ricetta</label>
                                <select
                                    id="et-ricetta"
                                    value={data.recipeId || ''}
                                    onChange={(e) => linkRecipe(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
                                >
                                    <option value="">— Nessuna (compilazione manuale) —</option>
                                    {nutritionalRecipes.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                        )}
                        {loadingDB && <span className="hint">Caricamento database ingredienti…</span>}
                        {dbError && <span className="hint" style={{ color: 'var(--color-danger)' }}>{dbError}</span>}
                        {data.recipeId && !linkedRecipe && !loadingDB && (
                            <div className="hint" style={{ color: 'var(--color-danger)' }}>
                                Ricetta collegata non trovata nell'archivio (cancellata?). Ricollega o scollega.
                            </div>
                        )}
                        {linkedRecipe && (
                            <>
                                {skippedIngredients.length > 0 && (
                                    <div className="hint" style={{ color: 'var(--color-danger)', marginBottom: 8 }}>
                                        Ingredienti non trovati nel DB (esclusi dal calcolo): {skippedIngredients.join(', ')}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                                    <span><strong>Peso finito:</strong> {finishedWeight || '—'} g</span>
                                    <span><strong>Ingredienti:</strong> {orderedIngredientsWithQuid.length}</span>
                                    <span><strong>Energia/100g:</strong> {per100 ? `${Math.round(per100.energyKcal)} kcal` : '—'}</span>
                                    {recipeCost && (
                                        <span title="Costo materie prime, non traccia gli additivi. Solo informativo — non stampato in etichetta.">
                                            <strong>Costo ricetta:</strong> €{recipeCost.total.toFixed(2)} ({recipeCost.perKg > 0 ? `€${recipeCost.perKg.toFixed(2)}/kg` : '—'})
                                        </span>
                                    )}
                                </div>
                                {loadedComponents.length > 1 && (
                                    <div className="hint" style={{ marginBottom: 12 }}>
                                        <strong>Componenti ({loadedComponents.length}):</strong> {loadedComponents.map(c => `${c.name || '—'} (${c.rows.length} ingr., pz/UV ${c.pzUV || 1})`).join(' · ')}
                                    </div>
                                )}

                                {orderedIngredientsWithQuid.length > 0 && (
                                    <div className="form-field">
                                        <label style={{ display: 'flex', alignItems: 'center' }}>
                                            Ingredienti caratterizzanti (con QUID% in etichetta)
                                            <InfoTooltip text="Seleziona solo gli ingredienti evidenziati nella denominazione o nell'immagine del prodotto (es. 'Pizza al PROSCIUTTO' → solo prosciutto). Il QUID% va dichiarato solo per questi, non per l'intera lista (Art. 22 + All. VIII Reg. 1169/2011)." />
                                        </label>
                                        <div style={{ maxHeight: 160, overflowY: 'auto', border: '1.5px solid var(--color-border)', borderRadius: 6, padding: 8 }}>
                                            {orderedIngredientsWithQuid.map(r => (
                                                <label key={r.nome} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, cursor: 'pointer', padding: '3px 0' }}>
                                                    <input type="checkbox" style={{ flexShrink: 0, width: 14, height: 14, marginTop: 2 }}
                                                        checked={data.characterizingIngredients.includes(r.nome)}
                                                        onChange={() => toggleCharacterizing(r.nome)} />
                                                    <span>{r.etichetta} <span style={{ color: 'var(--color-text-muted)' }}>({r.quid.toFixed(1).replace('.', ',')}%)</span></span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button className="btn btn-outline" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={regenerateFromRecipe}>
                                    <RefreshCw size={13} /> Rigenera ingredienti/allergeni/claims dalla ricetta
                                </button>
                            </>
                        )}
                    </div>

                        <div className="card">
                            <h3 style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                                Scheda etichetta
                                <InfoTooltip text="Identificativi del documento di lavoro trasmesso a grafico/tipografia (non compaiono sull'etichetta stampata) — utili per tracciare le revisioni nel tempo." />
                            </h3>
                            <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>Facoltativi, compaiono solo nella "Scheda per grafico" (PDF).</p>
                            <div className="form-row">
                                <div className="form-field">
                                    <label htmlFor="et-scheda-codice">Codice scheda</label>
                                    <input id="et-scheda-codice" type="text" value={data.schedaCodice} onChange={(e) => set('schedaCodice', e.target.value)} placeholder="es. ET-001" />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="et-scheda-rev">N° revisione</label>
                                    <input id="et-scheda-rev" type="text" value={data.schedaRevisione} onChange={(e) => set('schedaRevisione', e.target.value)} placeholder="es. 02" />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="et-scheda-data">Data revisione</label>
                                    <input id="et-scheda-data" type="date" value={data.schedaDataRevisione} onChange={(e) => set('schedaDataRevisione', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Dati del Prodotto</h3>

                        <div className="form-field">
                            <label htmlFor="et-nome">Denominazione del prodotto *</label>
                            <input id="et-nome" type="text" value={data.productName} onChange={(e) => set('productName', e.target.value)} placeholder="es. Pomodori pelati in succo di pomodoro" />
                        </div>
                        <div className="form-field">
                            <label htmlFor="et-denom-legale" style={{ display: 'flex', alignItems: 'center' }}>
                                Denominazione legale estesa (facoltativo)
                                <InfoTooltip text="Art. 17 Reg. 1169/2011: usa questo campo quando la denominazione legale è più descrittiva del nome commerciale sopra — es. nome commerciale «Lasagna alla Bolognese», denominazione legale «Preparazione gastronomica a base di pasta all'uovo con ragù di carne di maiale e carne bovina». Lascia vuoto se il nome sopra basta anche come denominazione legale." />
                            </label>
                            <input id="et-denom-legale" type="text" value={data.legalDenomination} onChange={(e) => set('legalDenomination', e.target.value)} placeholder="es. Preparazione gastronomica a base di pasta all'uovo con ragù di carne di maiale e carne bovina" />
                        </div>
                        <div className="form-field">
                            <label htmlFor="et-quid-fuori" style={{ display: 'flex', alignItems: 'center' }}>
                                QUID fuori lista ingredienti (facoltativo)
                                <InfoTooltip text="Per prodotti dove il QUID va evidenziato vicino alla denominazione invece che dentro la lista ingredienti (es. confetture: «28g di frutta per 100g di prodotto»). Lascia vuoto se il QUID basta nella lista ingredienti (caso più comune, già gestito dagli ingredienti caratterizzanti)." />
                            </label>
                            <input id="et-quid-fuori" type="text" value={data.quidOutsideList} onChange={(e) => set('quidOutsideList', e.target.value)} placeholder="es. 28g di frutta per 100g di prodotto finito" />
                        </div>
                        <div className="form-field">
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                Dichiarazioni complementari
                                <InfoTooltip text="Menzioni particolari obbligatorie SOLO se il caso si applica davvero al prodotto (All. VI Parte A Reg. 1169/2011) — es. se hai scongelato il prodotto prima della vendita, «Decongelato» è obbligatorio, non facoltativo. Seleziona solo quelle vere per questo prodotto." />
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {COMPLEMENTARY_DECLARATIONS.map(d => (
                                    <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 400, cursor: 'pointer', padding: '3px 8px', border: '1px solid var(--color-border)', borderRadius: 12 }}>
                                        <input type="checkbox" style={{ width: 12, height: 12 }} checked={data.complementaryDeclarations.includes(d)}
                                            onChange={(e) => set('complementaryDeclarations', e.target.checked
                                                ? [...data.complementaryDeclarations, d]
                                                : data.complementaryDeclarations.filter(x => x !== d))} />
                                        {d}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="form-field">
                            <label htmlFor="et-other-warnings" style={{ display: 'flex', alignItems: 'center' }}>
                                Altre avvertenze (facoltativo)
                                <InfoTooltip text="Avvertenze specifiche non coperte dall'elenco sopra (All. III Reg. 1169/2011): liquirizia, caffeina oltre soglia, fitosteroli, polioli lassativi, ecc. Testo libero, compare in etichetta e nella scheda." />
                            </label>
                            <input id="et-other-warnings" type="text" value={data.otherWarnings} onChange={(e) => set('otherWarnings', e.target.value)} placeholder="es. Contiene liquirizia — evitare il consumo eccessivo in caso di ipertensione" />
                        </div>
                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="et-produttore">Produttore / Responsabile *</label>
                                <input id="et-produttore" type="text" value={data.producer} onChange={(e) => set('producer', e.target.value)} placeholder="Ragione sociale" />
                            </div>
                            <div className="form-field">
                                <label htmlFor="et-indirizzo">Indirizzo stabilimento</label>
                                <input id="et-indirizzo" type="text" value={data.address} onChange={(e) => set('address', e.target.value)} placeholder="Via, CAP, Città" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="et-sede-legale" style={{ display: 'flex', alignItems: 'center' }}>
                                    Sede legale (se diversa dallo stabilimento)
                                    <InfoTooltip text="D.Lgs. 145/2017: se la sede legale dell'operatore è diversa dall'indirizzo dello stabilimento di produzione/confezionamento, vanno indicate entrambe. Lascia vuoto se coincidono." />
                                </label>
                                <input id="et-sede-legale" type="text" value={data.legalAddress} onChange={(e) => set('legalAddress', e.target.value)} placeholder="Via, CAP, Città (solo se diversa)" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="et-peso-netto">Quantità netta *</label>
                                <input id="et-peso-netto" type="text" value={data.netWeight} onChange={(e) => set('netWeight', e.target.value)} placeholder="es. 400 g" />
                                {data.additionalNetWeights.map((v, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                        <input type="text" value={v.netWeight} placeholder="es. 250 g" aria-label={`Quantità netta aggiuntiva ${i + 1}`}
                                            onChange={(e) => set('additionalNetWeights', data.additionalNetWeights.map((x, xi) => xi !== i ? x : { ...x, netWeight: e.target.value }))} />
                                        <input type="text" value={v.drainedWeight} placeholder="sgocciolato (facoltativo)" aria-label={`Peso sgocciolato aggiuntivo ${i + 1}`}
                                            onChange={(e) => set('additionalNetWeights', data.additionalNetWeights.map((x, xi) => xi !== i ? x : { ...x, drainedWeight: e.target.value }))} />
                                        <button type="button" className="btn btn-outline" aria-label={`Rimuovi formato ${i + 1}`}
                                            onClick={() => set('additionalNetWeights', data.additionalNetWeights.filter((_, xi) => xi !== i))}><X size={13} /></button>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-outline" style={{ fontSize: 11, marginTop: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                                    onClick={() => set('additionalNetWeights', [...data.additionalNetWeights, { netWeight: '', drainedWeight: '' }])}
                                    disabled={data.additionalNetWeights.length >= 4}
                                ><Plus size={12} /> Altro formato (U.V.)</button>
                            </div>
                            <div className="form-field">
                                <label htmlFor="et-origine" style={{ display: 'flex', alignItems: 'center' }}>
                                    Paese di origine
                                    <InfoTooltip text="Reg. UE 2018/775: se dichiari l'origine del prodotto e l'ingrediente caratterizzante (evidenziato in denominazione/immagine) ha un'origine diversa, va dichiarata anche quella dell'ingrediente. Il DB non ha ancora l'origine per singolo ingrediente — verifica manualmente." />
                                </label>
                                <input id="et-origine" type="text" value={data.countryOrigin} onChange={(e) => set('countryOrigin', e.target.value)} />
                                {data.countryOrigin && data.characterizingIngredients.length > 0 && (
                                    <ValidationError type="info" message={`Verifica: se l'origine di "${data.characterizingIngredients[0]}" è diversa da "${data.countryOrigin}", va dichiarata separatamente (Reg. UE 2018/775).`} />
                                )}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="et-sgocciolato" style={{ display: 'flex', alignItems: 'center' }}>
                                    Peso sgocciolato
                                    <InfoTooltip text="Obbligatorio quando il prodotto è immerso in un liquido di governo (acqua, olio, salamoia, sciroppo...) — es. tonno in olio, olive in salamoia. Lascia vuoto se non applicabile." />
                                </label>
                                <input id="et-sgocciolato" type="text" value={data.drainedWeight} onChange={(e) => set('drainedWeight', e.target.value)} placeholder="es. 240 g (se in liquido di governo)" />
                            </div>
                            <div className="form-field">
                                <label htmlFor="et-alcol" style={{ display: 'flex', alignItems: 'center' }}>
                                    Titolo alcolometrico
                                    <InfoTooltip text="Obbligatorio per legge se il prodotto supera 1,2% vol di alcol (Art. 9(1)(k) Reg. 1169/2011). Lascia vuoto per prodotti non alcolici." />
                                </label>
                                <input id="et-alcol" type="text" value={data.alcoholPercent} onChange={(e) => set('alcoholPercent', e.target.value)} placeholder="es. 12% vol" />
                                {Number(String(data.alcoholPercent).replace(',', '.').replace(/[^\d.]/g, '')) > 1.2 && (
                                    <ValidationError type="info" message="Sopra 1,2% vol il titolo alcolometrico è obbligatorio in etichetta — verrà incluso nell'anteprima." />
                                )}
                            </div>
                        </div>

                        <div className="form-field">
                            <label htmlFor="et-ingredienti" style={{ display: 'flex', alignItems: 'center' }}>
                                Elenco ingredienti * (in ordine decrescente di peso)
                                <InfoTooltip text="Il QUID (QUantitative Ingredient Declaration) è la percentuale degli ingredienti evidenziati in denominazione o immagine, obbligatoria quando rilevante. Con una ricetta collegata viene calcolato automaticamente." />
                            </label>
                            <textarea
                                id="et-ingredienti"
                                rows={3}
                                value={data.ingredients}
                                onChange={(e) => set('ingredients', e.target.value)}
                                placeholder="es. Pomodori 85%, succo di pomodoro, sale marino"
                                className="et-textarea"
                            />
                            <span className="hint">Gli allergeni devono essere evidenziati (es. in MAIUSCOLO o corsivo)</span>
                            {allergenIssues.length > 0 && (
                                <>
                                    <ValidationError type="warning"
                                        message={`«${allergenIssues.join('», «')}» non ${allergenIssues.length > 1 ? 'sono evidenziati' : 'è evidenziato'} — l'Art. 21 Reg. 1169/2011 richiede che gli allergeni siano distinguibili dal resto dell'elenco (es. MAIUSCOLO).`}
                                    />
                                    <button type="button" className="btn btn-outline" style={{ fontSize: 11, marginTop: 6, padding: '4px 10px' }}
                                        onClick={() => set('ingredients', highlightAllergens(data.ingredients))}
                                    >Evidenzia automaticamente</button>
                                </>
                            )}
                        </div>

                        <div className="form-field">
                            <label htmlFor="et-allergeni">Dichiarazione allergeni (Art. 21 Reg. 1169/2011)</label>
                            <input id="et-allergeni" type="text" value={data.allergens} onChange={(e) => set('allergens', e.target.value)} placeholder="es. Contiene: Glutine. Può contenere tracce di: Latte, Uova" />
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 400, cursor: 'pointer', marginTop: 8 }}>
                                <input type="checkbox" style={{ width: 16, height: 16 }} checked={data.includeAllergenNote}
                                    onChange={(e) => set('includeAllergenNote', e.target.checked)} />
                                <span>Aggiungi dicitura facoltativa: "{ALLERGEN_NOTE_TEXT}"</span>
                            </label>
                            <div style={{ marginTop: 10 }}>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: 12, marginBottom: 4 }}>
                                    Allergeni gestiti nel tuo stabilimento (linee condivise)
                                    <InfoTooltip text="Il calcolo automatico copre solo la cross-contaminazione dichiarata dal fornitore sull'ingrediente. Se nel tuo stabilimento lavori anche altri allergeni sulle stesse linee/attrezzature, selezionali qui: si sommano a «può contenere tracce di» — stessa logica dell'Excel (colonna cross-contaminazione stabilimento)." />
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {ALLERGEN_FIELDS.map(f => (
                                        <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 400, cursor: 'pointer', padding: '3px 8px', border: '1px solid var(--color-border)', borderRadius: 12 }}>
                                            <input type="checkbox" style={{ width: 12, height: 12 }} checked={data.facilityAllergens.includes(f.label)}
                                                onChange={(e) => set('facilityAllergens', e.target.checked
                                                    ? [...data.facilityAllergens, f.label]
                                                    : data.facilityAllergens.filter(a => a !== f.label))} />
                                            {f.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {allClaims.length > 0 && (
                            <div className="form-field">
                                <label style={{ display: 'flex', alignItems: 'center' }}>
                                    Claims nutrizionali (Reg. 1924/2006) — seleziona quelli applicabili
                                    <InfoTooltip text="I claim (es. 'a basso contenuto di sale') sono affermazioni volontarie ammesse solo se i valori nutrizionali della ricetta soddisfano le soglie del Reg. 1924/2006. Selezionane solo se applicabili al prodotto reale." />
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {allClaims.map(c => (
                                        <label key={c} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, cursor: 'pointer', fontWeight: 400 }}>
                                            <input
                                                type="checkbox"
                                                style={{ flexShrink: 0, width: 16, height: 16, marginTop: 2 }}
                                                checked={data.claimsSelezionati.includes(c)}
                                                onChange={(e) => set('claimsSelezionati',
                                                    e.target.checked
                                                        ? [...data.claimsSelezionati, c]
                                                        : data.claimsSelezionati.filter(x => x !== c))}
                                            />
                                            <span>{c}</span>
                                        </label>
                                    ))}
                                </div>
                                {HEALTH_CLAIMS_432_2012.filter(h => data.claimsSelezionati.includes(h.claim)).map(h => (
                                    <div key={h.claim} style={{ marginTop: 8, padding: 8, borderRadius: 6, background: 'var(--color-bg-secondary)', fontSize: 11 }}>
                                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Indicazioni sulla salute ammesse per "{h.claim}" (Reg. UE 432/2012, testo esatto dall'allegato):</div>
                                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                                            {h.texts.map(t => <li key={t}>{t}</li>)}
                                        </ul>
                                        <span className="hint">Scegli solo quelle pertinenti al tuo prodotto — non sono inserite automaticamente in etichetta, copiale a mano se vuoi usarle.</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="form-field">
                            <label htmlFor="et-conservazione">Modalità di conservazione</label>
                            <input id="et-conservazione" type="text" value={data.storageConditions} onChange={(e) => set('storageConditions', e.target.value)} placeholder="es. Conservare in luogo fresco e asciutto" />
                        </div>

                        <div className="form-field">
                            <label htmlFor="et-istruzioni" style={{ display: 'flex', alignItems: 'center' }}>
                                Istruzioni per il consumo/preparazione
                                <InfoTooltip text="Obbligatorio quando, senza queste indicazioni, sarebbe difficile un uso adeguato del prodotto (Art. 9(1)(j) Reg. 1169/2011) — es. tempi/modalità di cottura, diluizione, scongelamento." />
                            </label>
                            <input id="et-istruzioni" type="text" value={data.consumptionInstructions} onChange={(e) => set('consumptionInstructions', e.target.value)} placeholder="es. Cuocere in acqua bollente per 8 minuti" />
                        </div>

                        <div className="form-field">
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                TMC / Data di scadenza
                                <InfoTooltip text="«Da consumarsi preferibilmente entro» indica solo un calo di qualità dopo la data — per prodotti stabili. «Da consumarsi entro» è obbligatorio per prodotti molto deperibili (freschi/refrigerati): dopo quella data il prodotto non è più vendibile." />
                            </label>
                            <div className="form-row-3" style={{ display: 'grid', gap: 8 }}>
                                <select value={tmcType} onChange={(e) => { const v = e.target.value as typeof tmcType; setTmcType(v); applyTmc(v, tmcDate, tmcGranularity); }}
                                    style={{ padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 12 }}>
                                    <option value="preferibilmente">Preferibilmente entro</option>
                                    <option value="entro">Da consumarsi entro</option>
                                </select>
                                <input id="et-tmc-date" type="date" value={tmcDate}
                                    onChange={(e) => { setTmcDate(e.target.value); applyTmc(tmcType, e.target.value, tmcGranularity); }} />
                                <select value={tmcGranularity} onChange={(e) => { const v = e.target.value as typeof tmcGranularity; setTmcGranularity(v); applyTmc(tmcType, tmcDate, v); }}
                                    style={{ padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 12 }}>
                                    <option value="giorno">Giorno</option>
                                    <option value="mese">Mese</option>
                                    <option value="anno">Anno</option>
                                </select>
                            </div>
                            <input id="et-scadenza" type="text" value={data.bestBefore} onChange={(e) => set('bestBefore', e.target.value)}
                                placeholder="Generato dai controlli sopra — puoi correggerlo a mano" style={{ marginTop: 8 }} />
                            <span className="hint">Testo finale in etichetta: modificabile direttamente se serve una dicitura diversa.</span>
                        </div>

                        <div className="form-field">
                            <label htmlFor="et-lotto">Numero di lotto</label>
                            <input id="et-lotto" type="text" value={data.lotNumber} onChange={(e) => set('lotNumber', e.target.value)} placeholder="es. L001234" />
                            {tmcGranularity === 'giorno' && data.bestBefore && (
                                <ValidationError type="info" message="TMC con giorno e mese: il lotto non è obbligatorio per legge (Dir. 2011/91/UE Art. 1(3)) — resta consigliato per rintracciabilità interna." />
                            )}
                        </div>

                        <div className="form-field">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <label style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                                    Raccolta differenziata imballi (D.Lgs. 116/2020)
                                    <InfoTooltip text={"Dal 2023 ogni imballo (vaschetta, film, etichetta...) va etichettato con materiale e indicazione di conferimento alla raccolta differenziata, es. \"ALU 41\" per l'alluminio."} />
                                </label>
                                <button type="button" className="btn btn-outline" style={{ fontSize: 12, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                                    onClick={() => set('imballi', [...data.imballi, { descrizione: '', codice: '', raccolta: '' }])}
                                    disabled={data.imballi.length >= 6}
                                ><Plus size={12} /> Imballo</button>
                            </div>
                            {data.imballi.length === 0 && (
                                <ValidationError type="warning" message="Nessun imballo dichiarato — se il prodotto è imballato, D.Lgs. 116/2020 richiede materiale + indicazione di raccolta per ogni componente (vaschetta, film, etichetta...). Se il prodotto è venduto sfuso, ignora." />
                            )}
                            <datalist id="et-imballo-codici">
                                {PACKAGING_MATERIALS.map(m => <option key={m.codice} value={m.codice}>{m.materiale}</option>)}
                            </datalist>
                            {data.imballi.map((imb, i) => (
                                <div key={i} className="et-imballo-row">
                                    <input type="text" value={imb.descrizione} placeholder="es. Teglia" aria-label={`Descrizione imballo ${i + 1}`}
                                        onChange={(e) => set('imballi', data.imballi.map((x, xi) => xi !== i ? x : { ...x, descrizione: e.target.value }))} />
                                    <input type="text" value={imb.codice} placeholder="es. ALU 41" aria-label={`Codice materiale imballo ${i + 1}`}
                                        list="et-imballo-codici"
                                        onChange={(e) => {
                                            const codice = e.target.value;
                                            const match = PACKAGING_MATERIALS.find(m => m.codice === codice);
                                            set('imballi', data.imballi.map((x, xi) => xi !== i ? x : {
                                                ...x, codice, raccolta: match ? match.raccolta : x.raccolta,
                                            }));
                                        }} />
                                    <input type="text" value={imb.raccolta} placeholder="es. Raccolta metallo" aria-label={`Tipo raccolta imballo ${i + 1}`}
                                        onChange={(e) => set('imballi', data.imballi.map((x, xi) => xi !== i ? x : { ...x, raccolta: e.target.value }))} />
                                    <button type="button" className="btn btn-outline et-imballo-remove" aria-label={`Rimuovi imballo ${i + 1}`}
                                        onClick={() => set('imballi', data.imballi.filter((_, xi) => xi !== i))}><X size={13} /></button>
                                </div>
                            ))}
                            {data.imballi.length > 0 && <span className="hint">Codice materiale suggerito dall'elenco (Decisione 97/129/CE) — scegli dal menu per compilare in automatico la raccolta corretta. Dicitura fissa in etichetta: "Verifica le disposizioni del tuo Comune".</span>}
                        </div>

                        {per100 && (
                            <div className="form-field">
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, fontWeight: 400, cursor: 'pointer', width: '100%' }}>
                                    <input type="checkbox" style={{ flexShrink: 0, width: 16, height: 16, marginTop: 2 }} checked={data.showNutritionTable}
                                        onChange={(e) => set('showNutritionTable', e.target.checked)} />
                                    <span>Mostra tabella valori nutrizionali in etichetta</span>
                                </label>
                                {data.showNutritionTable && nationTab === 'UE' && linkedRecipe?.data.serving_sizes?.UE?.porzione && (
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, fontWeight: 400, cursor: 'pointer', width: '100%', marginTop: 8 }}>
                                        <input type="checkbox" style={{ flexShrink: 0, width: 16, height: 16, marginTop: 2 }} checked={data.showPerServing}
                                            onChange={(e) => set('showPerServing', e.target.checked)} />
                                        <span style={{ display: 'flex', alignItems: 'center' }}>
                                            Aggiungi anche per porzione (volontario)
                                            <InfoTooltip text="Art. 33 Reg. 1169/2011: la dichiarazione per porzione è sempre AGGIUNTIVA a quella per 100g/100ml obbligatoria, mai sostitutiva. Qui aggiunge una seconda tabella sotto quella per 100g." />
                                        </span>
                                    </label>
                                )}
                            </div>
                        )}
                        </div>

                        <div className="card">
                            <h3 style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                                Fronte / Retro etichetta
                                <InfoTooltip text="Per legge (Art. 13(5) Reg. 1169/2011) denominazione e peso netto devono restare sempre nello stesso campo visivo — per questo non sono spostabili. Usa il retro solo se il fronte non ha spazio per tutto il resto." />
                            </h3>
                            <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
                                Di norma tutto sta sul fronte. Se lo spazio non basta, attiva un retro e sposta lì
                                solo i campi che ti servono.
                            </p>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
                                <input type="checkbox" style={{ width: 16, height: 16 }} checked={data.hasBackLabel}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setData(prev => ({
                                            ...prev,
                                            hasBackLabel: checked,
                                            backWidthMm: prev.backWidthMm || prev.widthMm,
                                            backHeightMm: prev.backHeightMm || prev.heightMm,
                                        }));
                                        setIsDirty(true);
                                    }} />
                                Crea etichetta retro
                            </label>

                            {data.hasBackLabel && (
                                <>
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="et-back-width">Base retro (mm)</label>
                                            <input id="et-back-width" type="number" value={data.backWidthMm} onChange={(e) => set('backWidthMm', e.target.value)} min="10" />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="et-back-height">Altezza retro (mm)</label>
                                            <input id="et-back-height" type="number" value={data.backHeightMm} onChange={(e) => set('backHeightMm', e.target.value)} min="10" />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label>Campi sul retro</label>
                                        <div style={{ maxHeight: 200, overflowY: 'auto', border: '1.5px solid var(--color-border)', borderRadius: 6, padding: 8 }}>
                                            {BACK_MOVABLE_FIELDS.map(f => (
                                                <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', padding: '3px 0' }}>
                                                    <input type="checkbox" style={{ flexShrink: 0, width: 14, height: 14 }}
                                                        checked={data.backFields.includes(f.key)}
                                                        onChange={() => toggleBackField(f.key)} />
                                                    <span>{f.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <span className="hint">Denominazione e peso netto restano sempre sul fronte, non spostabili.</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}

                {leftTab === 'grafica' && (
                    <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Dimensioni &amp; Grafica Personalizzata</h3>

                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="et-width">Base (mm)</label>
                                <input id="et-width" type="number" value={data.widthMm} onChange={(e) => set('widthMm', e.target.value)} min="10" />
                            </div>
                            <div className="form-field">
                                <label htmlFor="et-height">Altezza (mm)</label>
                                <input id="et-height" type="number" value={data.heightMm} onChange={(e) => set('heightMm', e.target.value)} min="10" />
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, marginTop: 10 }}>
                            <div className="form-field">
                                <label htmlFor="et-bg-img" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Image size={14} /> Immagine di Sfondo</label>
                                <input id="et-bg-img" type="file" accept="image/*" onChange={(e) => handleFileUpload('bgImageUrl', e)} style={{ fontSize: 13, marginBottom: 12 }} />
                                {data.bgImageUrl && (
                                    <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8 }}>
                                        <SliderControl label="Scala Sfondo" value={data.bgScale} min={10} max={300} onChange={(v) => set('bgScale', v)} />
                                        <div className="form-row">
                                            <SliderControl label="Pos. Orizzontale" value={data.bgPosX} min={0} max={100} onChange={(v) => set('bgPosX', v)} />
                                            <SliderControl label="Pos. Verticale" value={data.bgPosY} min={0} max={100} onChange={(v) => set('bgPosY', v)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, marginTop: 10 }}>
                            <div className="form-field">
                                <label htmlFor="et-logo-img" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={14} /> Logo Aziendale</label>
                                <input id="et-logo-img" type="file" accept="image/*" onChange={(e) => handleFileUpload('logoUrl', e)} style={{ fontSize: 13, marginBottom: 12 }} />
                                {data.logoUrl && (
                                    <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8 }}>
                                        <SliderControl label="Dimensione Logo" value={data.logoScale} min={10} max={200} onChange={(v) => set('logoScale', v)} />
                                        <div className="form-row">
                                            <SliderControl label="Pos. Orizzontale" value={data.logoPosX} min={0} max={100} onChange={(v) => set('logoPosX', v)} />
                                            <SliderControl label="Pos. Verticale" value={data.logoPosY} min={0} max={100} onChange={(v) => set('logoPosY', v)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, marginTop: 10 }}>
                            <div className="form-field">
                                <label htmlFor="et-code-type" style={{ display: 'flex', alignItems: 'center' }}>
                                    Codice a barre / QR
                                    <InfoTooltip text="QR code: nessun vincolo, ci puoi mettere un link (es. scheda prodotto, ricetta, sito aziendale) o testo libero. Barcode Code128: qualunque testo/numero, non richiede un codice EAN ufficiale. EAN-13: per la vendita al dettaglio serve il codice ufficiale assegnato da GS1/Indicod-Ecr — non generarlo a caso." />
                                </label>
                                <select
                                    id="et-code-type"
                                    value={data.codeType}
                                    onChange={(e) => set('codeType', e.target.value as LabelData['codeType'])}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
                                >
                                    <option value="none">Nessuno</option>
                                    <option value="qr">QR Code</option>
                                    <option value="barcode">Barcode (Code128)</option>
                                    <option value="ean13">EAN-13 (codice a barre prodotto)</option>
                                </select>
                            </div>
                            {data.codeType !== 'none' && (
                                <>
                                    <div className="form-field">
                                        <label htmlFor="et-code-value">
                                            {data.codeType === 'qr' ? 'Contenuto QR (link o testo)' : data.codeType === 'ean13' ? 'Codice EAN-13 (12 o 13 cifre)' : 'Contenuto barcode'}
                                        </label>
                                        <input id="et-code-value" type="text" value={data.codeValue}
                                            onChange={(e) => set('codeValue', data.codeType === 'ean13' ? e.target.value.replace(/\D/g, '').slice(0, 13) : e.target.value)}
                                            inputMode={data.codeType === 'ean13' ? 'numeric' : undefined}
                                            placeholder={data.codeType === 'qr' ? 'es. https://tuosito.it/prodotto' : data.codeType === 'ean13' ? 'es. 8001234567890' : 'es. LOTTO2024-001'} />
                                        {data.codeType === 'ean13' && data.codeValue && !/^\d{12,13}$/.test(data.codeValue) && (
                                            <ValidationError type="warning" message="Servono 12 o 13 cifre numeriche per un EAN-13 valido." />
                                        )}
                                    </div>
                                    <SliderControl label="Dimensione codice" value={data.codeScale} min={50} max={200} onChange={(v) => set('codeScale', v)} />
                                </>
                            )}
                        </div>

                        <div className="form-field" style={{ marginTop: 20 }}>
                            <label htmlFor="et-theme">Tema Testo (per contrasto)</label>
                            <select
                                id="et-theme"
                                value={data.theme}
                                onChange={(e) => set('theme', e.target.value as 'light' | 'dark')}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
                            >
                                <option value="light">Testo Scuro (su sfondo chiaro)</option>
                                <option value="dark">Testo Chiaro (su sfondo scuro)</option>
                            </select>
                        </div>

                        {(data.bgImageUrl || data.logoUrl) && (
                            <button className="btn btn-outline btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={() => {
                                set('bgImageUrl', '');
                                set('logoUrl', '');
                                set('bgScale', 100);
                                set('bgPosX', 50);
                                set('bgPosY', 50);
                                set('logoScale', 100);
                                set('logoPosX', 50);
                                set('logoPosY', 10);
                            }}>
                                Rimuovi Immagini & Reset Trasformazioni
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );

    // Tabella nutrizionale e lista imballi — condivise fra fronte e retro (qualunque lato le
    // ospiti), unica sorgente per evitare di duplicare il markup dei 5 componenti Tab*.
    // full=true forza sempre la tabella piena (usata dalla "Scheda per grafico", non vincolata
    // a spazio fisico). measure=true collega il ref di misurazione altezza (solo l'istanza sul
    // fronte guida la selezione automatica del formato — vedi effect sopra).
    const renderNutritionTable = (opts: { full?: boolean; measure?: boolean } = {}) => {
        const step = opts.full ? 0 : Math.min(nutritionFormatStep[nationTab] ?? 0, NATION_MAX_STEP[nationTab]);
        const usaSubTab = step === 0 ? 'verticale' : step === 1 ? 'orizzontale' : 'lineare';
        return (
            <div>
                {/* Il selettore mercato NON vive più qui (era dentro il riquadro fisico
                    fronte/retro, stipato nell'anteprima anche se già escluso dall'export via
                    print-ignore — bug di impaginazione reale, analisi 2026-08-25): ora è un
                    controllo editor unico, sopra i box, in `rightPanel`. */}
                {/* NIENTE transform:scale() qui — le tabelle ufficiali (TabUSA/TabArabi) usano
                    WebkitTextStroke + flex annidati, e html2canvas calcola male i bounding box
                    dei figli flex dentro un antenato trasformato: testo ed etichette sparivano
                    nell'export (PNG/PDF), pur essendo corretti a schermo. Il fit reale viene solo
                    dallo step di formato sotto (DOM vero, nessun trucco CSS, sicuro per l'export). */}
                <div ref={opts.measure ? nutritionMeasureRef : undefined} style={{ overflowX: 'auto' }}>
                    {nationTab === 'UE' && per100 && (
                        step === 0 ? (
                            <TabUE p={per100} ue={linkedRecipe?.data.serving_sizes?.UE ?? {}}
                                specificGravity={specificGravityVal}
                                selectedOptionals={autoSelectedOptionals} showOptionals={true}
                                activeSubTab="100g" />
                        ) : <div>{buildEULinear(per100)}</div>
                    )}
                    {/* Art. 33 — porzione, SEMPRE aggiuntiva alla 100g sopra, mai da sola */}
                    {nationTab === 'UE' && per100 && data.showPerServing && linkedRecipe?.data.serving_sizes?.UE?.porzione && (
                        <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, marginBottom: 4 }}>PER PORZIONE (facoltativo, Art. 33)</div>
                            {step === 0 ? (
                                <TabUE p={per100} ue={linkedRecipe.data.serving_sizes.UE}
                                    specificGravity={specificGravityVal}
                                    selectedOptionals={autoSelectedOptionals} showOptionals={true}
                                    activeSubTab="porzione" />
                            ) : <div>{buildEULinear(scaleResult(per100, linkedRecipe.data.serving_sizes.UE.porzione!))}</div>}
                        </div>
                    )}
                    {nationTab === 'USA' && per100 && (
                        <TabUSA p={per100} usa={linkedRecipe?.data.serving_sizes?.USA ?? {}}
                            specificGravity={specificGravityVal}
                            servingRef="serving" measure="g" subTab={usaSubTab} />
                    )}
                    {nationTab === 'Canada' && per100 && (
                        <TabCanada p={per100} ca={linkedRecipe?.data.serving_sizes?.Canada ?? {}}
                            servingRef="serving" measure="g" subTab={usaSubTab} />
                    )}
                    {nationTab === 'Australia' && per100 && (
                        step === 0 ? (
                            <TabAustralia p={per100} au={linkedRecipe?.data.serving_sizes?.Australia ?? {}} />
                        ) : <div>{buildAULinear(per100)}</div>
                    )}
                    {nationTab === 'Arabi' && per100 && (
                        step === 0 ? (
                            <TabArabi p={per100} arabi={linkedRecipe?.data.serving_sizes?.Arabi ?? {}}
                                servingRef="serving" measure="g" specificGravity={specificGravityVal} />
                        ) : <div>{buildArabiLinear(per100)}</div>
                    )}
                </div>
            </div>
        );
    };
    const renderImballiList = () => (
        <div>
            <strong>Imballi:</strong> {data.imballi
                .map(i => `${i.descrizione || '—'} (${i.codice || '—'}) — ${i.raccolta || '—'}`)
                .join('; ')}. Verifica le disposizioni del tuo Comune.
        </div>
    );

    // M6 — tabella nutrizionale dedicata alla scheda per grafico/tipografia, in tabella HTML
    // semplice (bordi reali, no flex/WebkitTextStroke): TabUE è un componente ufficiale
    // protetto, non toccarlo, ma i suoi flex annidati non catturano in modo affidabile con
    // html2canvas dentro il pannello offscreen della scheda (stesso problema già noto per
    // transform:scale, vedi commento su renderNutritionTable). Stessi arrotondamenti
    // ufficiali (rUE_energy/rUE_macro/rUE_sat/rUE_sale, importati da TabUE.tsx, funzioni
    // pure) e stessa soglia 15% AR minerali/vitamine di autoSelectedOptionals — solo il
    // markup della tabella è nuovo, nessun dato/calcolo reinventato.
    const SCHEDA_TD: React.CSSProperties = { padding: '3px 6px', borderBottom: '1px solid #ddd', fontSize: 11 };
    const SCHEDA_TD_R: React.CSSProperties = { ...SCHEDA_TD, textAlign: 'right' };
    const renderSchedaNutritionTable = () => {
        if (!per100) return null;
        const rows: { label: string; value: string; ar?: string; sub?: boolean }[] = [
            { label: 'Energia', value: `${rUE_energy(per100.energyKj)} kJ / ${rUE_energy(per100.energyKcal)} kcal`, ar: `${Math.round(per100.energyKj / 8400 * 100)}%` },
            { label: 'Grassi', value: `${rUE_macro(per100.grassi)} g`, ar: `${Math.round(per100.grassi / 70 * 100)}%` },
            { label: 'di cui acidi grassi saturi', value: `${rUE_sat(per100.saturi)} g`, ar: `${Math.round(per100.saturi / 20 * 100)}%`, sub: true },
            { label: 'acidi grassi monoinsaturi', value: `${rUE_macro(per100.monoins)} g`, sub: true },
            { label: 'acidi grassi polinsaturi', value: `${rUE_macro(per100.polins)} g`, sub: true },
            { label: 'Carboidrati', value: `${rUE_macro(per100.carboidrati)} g`, ar: `${Math.round(per100.carboidrati / 260 * 100)}%` },
            { label: 'di cui zuccheri', value: `${rUE_macro(per100.zuccheri)} g`, ar: `${Math.round(per100.zuccheri / 90 * 100)}%`, sub: true },
            { label: 'polioli', value: `${rUE_macro(per100.polioli)} g`, sub: true },
            { label: 'amido', value: `${rUE_macro(per100.amido)} g`, sub: true },
            { label: 'Fibre', value: `${rUE_macro(per100.fibre)} g` },
            { label: 'Proteine', value: `${rUE_macro(per100.proteine)} g`, ar: `${Math.round(per100.proteine / 50 * 100)}%` },
            { label: 'Sale', value: `${rUE_sale(per100.sale)} g`, ar: `${Math.round(per100.sale / 6 * 100)}%` },
        ];
        for (const key in MINERAL_VITAMIN_AR) {
            const k = key as keyof SelectedOptionals;
            if (!autoSelectedOptionals[k]) continue;
            const ref = MINERAL_VITAMIN_AR[k]!;
            const v = per100[ref.field] as number;
            rows.push({ label: k, value: `${rUE_macro(v)} mg`, ar: `${Math.round(v / ref.ar * 100)}%` });
        }
        return (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ ...SCHEDA_TD, background: '#000', color: '#fff', textAlign: 'left' }}>Valori medi per 100 g</th>
                        <th style={{ ...SCHEDA_TD_R, background: '#000', color: '#fff' }}></th>
                        <th style={{ ...SCHEDA_TD_R, background: '#000', color: '#fff' }}>% AR*</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.label}>
                            <td style={{ ...SCHEDA_TD, paddingLeft: r.sub ? 16 : 6, color: r.sub ? '#666' : '#111', fontWeight: r.sub ? 400 : 600 }}>{r.label}</td>
                            <td style={SCHEDA_TD_R}>{r.value}</td>
                            <td style={SCHEDA_TD_R}>{r.ar ?? '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const rightPanel = (
        <div className="table-panel-inner">
            <div className="table-panel-header">
                <div className="table-panel-header-title">Anteprima Etichetta</div>
                {isComplete ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0 8px', fontSize: 12, color: 'var(--color-accent)' }}>
                        <CheckCircle2 size={14} /> Tutti i campi obbligatori compilati
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '2px 0 8px' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Mancano:</span>
                        {missingFieldDefs.map(f => (
                            <button key={f.id} type="button" className="btn btn-outline"
                                style={{ fontSize: 11, padding: '3px 9px' }}
                                onClick={() => focusField(f.id)}
                            >{f.label}</button>
                        ))}
                    </div>
                )}
            </div>
            {per100 && data.showNutritionTable && (
                <div className="nation-tab-bar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '2px 0 10px' }}>
                    {(['UE', 'USA', 'Canada', 'Australia', 'Arabi'] as NationTab[]).map(t => (
                        <button key={t} type="button"
                            className={`btn nation-tab-btn ${nationTab === t ? 'btn-accent' : 'btn-outline'}`}
                            onClick={() => setNationTab(t)}
                        >{t}</button>
                    ))}
                </div>
            )}
            <div className="table-scroll-area">
                <>
                    <div className="result-box">
                                <div style={{
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    background: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 20px 20px',
                                    padding: 20, borderRadius: 8, border: '1px solid var(--color-border)'
                                }}>
                                    {/* labelPreviewRef è il vero riquadro fisico widthMm×heightMm — aspectRatio +
                                        overflow:hidden QUI, non sul figlio: prima la tabella/imballi aggiuntivi
                                        (sibling sotto) allungavano l'export oltre le dimensioni impostate, perché
                                        solo il figlio interno aveva l'aspect-ratio fisso, non questo contenitore
                                        catturato per intero da html2canvas. Ora qualunque contenuto extra viene
                                        tagliato all'interno del riquadro reale, mai fatto crescere oltre. */}
                                    <div ref={labelPreviewRef} style={{
                                        width: '100%',
                                        maxWidth: `min(${data.widthMm}mm, 100%)`,
                                        aspectRatio: `${data.widthMm} / ${data.heightMm}`,
                                        backgroundColor: data.theme === 'dark' ? '#222' : '#fff',
                                        color: data.theme === 'dark' ? '#fff' : '#111',
                                        borderRadius: 4,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        border: '1px solid #ccc',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        // Opzione B (framework responsive 2026-08-25): su formati orizzontali
                                        // larghi (aspect ratio > soglia) testo e tabella+imballi si affiancano
                                        // invece di impilarsi, per non sprecare la larghezza extra — su
                                        // quadrata/verticale resta impilato come oggi (column).
                                        flexDirection: useTwoColumnFront ? 'row' : 'column',
                                    }}>
                                    {/* FRONTE etichetta — testo/logo/sfondo, riempie lo spazio disponibile nel
                                        riquadro fisico sopra (flex, non più il proprio aspect-ratio). minWidth:0
                                        serve solo in modalità riga (useTwoColumnFront), innocuo in colonna. */}
                                    <div style={{
                                        position: 'relative',
                                        width: '100%',
                                        flex: useTwoColumnFront ? '1 1 55%' : '1 1 auto',
                                        minHeight: 0,
                                        minWidth: 0,
                                        background: data.bgImageUrl
                                            ? `url(${data.bgImageUrl}) ${data.bgPosX}% ${data.bgPosY}% / ${data.bgScale}% no-repeat`
                                            : 'transparent',
                                        overflow: 'hidden',
                                        display: 'flex', flexDirection: 'column',
                                    }}>
                                        {/* Logo posizionato in modo assoluto */}
                                        {data.logoUrl && (
                                            <div style={{
                                                position: 'absolute',
                                                left: `${data.logoPosX}%`,
                                                top: `${data.logoPosY}%`,
                                                transform: `translate(-50%, -10%)`, // Centra rispetto alla posizione X
                                                zIndex: 10,
                                                width: `${40 * fontScale * (data.logoScale / 100)}mm`,
                                                maxWidth: '90%',
                                                textAlign: 'center'
                                            }}>
                                                <img
                                                    src={data.logoUrl}
                                                    alt="Logo"
                                                    style={{
                                                        width: '100%',
                                                        maxHeight: `${60 * fontScale}mm`,
                                                        objectFit: 'contain'
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Overlay testuale adattivo */}
                                        <div style={{
                                            background: data.bgImageUrl ? (data.theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)') : 'transparent',
                                            padding: `${12 * fontScale}px`,
                                            margin: `${10 * fontScale}px`,
                                            borderRadius: 4,
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-end', // Porta il testo verso il basso per lasciare spazio al logo se posizionato in alto
                                            overflow: 'hidden',
                                            fontFamily: 'Arial, sans-serif',
                                            fontSize: `${11 * fontScale}px`,
                                            lineHeight: 1.4,
                                            zIndex: 5
                                        }}>
                                            <div style={{
                                                fontSize: `${16 * fontScale}px`,
                                                fontWeight: 800,
                                                marginBottom: `${8 * fontScale}px`,
                                                borderBottom: `2px solid ${data.theme === 'dark' ? '#fff' : '#000'}`,
                                                paddingBottom: `${6 * fontScale}px`,
                                                textAlign: 'center',
                                                textTransform: 'uppercase'
                                            }}>
                                                {ph(data.productName, 'DENOMINAZIONE PRODOTTO')}
                                            </div>
                                            {data.quidOutsideList && (
                                                <div style={{ fontSize: `${12 * fontScale}px`, fontWeight: 700, textAlign: 'center', marginBottom: `${6 * fontScale}px` }}>
                                                    {data.quidOutsideList}
                                                </div>
                                            )}
                                            {data.complementaryDeclarations.length > 0 && (
                                                <div style={{ fontSize: `${9 * fontScale}px`, textAlign: 'center', marginBottom: `${6 * fontScale}px` }}>
                                                    {data.complementaryDeclarations.join(' · ')}
                                                </div>
                                            )}
                                            {data.otherWarnings && (
                                                <div style={{ fontSize: `${9 * fontScale}px`, textAlign: 'center', marginBottom: `${6 * fontScale}px` }}>
                                                    {data.otherWarnings}
                                                </div>
                                            )}

                                            {/* Niente scroll interno (era overflowY:auto+maxHeight:60% — nascondeva
                                                contenuto in editing che nell'export c'è sempre per intero, e falsava
                                                la misura di overflow generale). Il blocco ora scorre nel flusso
                                                naturale: se non entra, il banner di overflow sotto lo segnala come
                                                per il resto dell'etichetta (richiesta esplicita 2026-08-25). */}
                                            <div>
                                                {onFront('ingredients') && <div style={{ marginBottom: `${6 * fontScale}px` }}><strong>Ingredienti:</strong> {ph(data.ingredients, 'elenco ingredienti…')}</div>}
                                                {onFront('allergens') && data.allergens && <div style={{ marginBottom: `${6 * fontScale}px`, fontWeight: 700 }}>{data.allergens}</div>}
                                                {onFront('allergens') && data.includeAllergenNote && <div style={{ marginBottom: `${6 * fontScale}px`, fontSize: `${9 * fontScale}px`, fontStyle: 'italic' }}>{ALLERGEN_NOTE_TEXT}</div>}
                                                {onFront('producerAddress') && (
                                                    <div style={{ marginBottom: `${6 * fontScale}px` }}>
                                                        <strong>Prodotto da:</strong> {ph(data.producer, 'produttore')}
                                                        {data.address && <><br />{data.address}</>}
                                                        {data.legalAddress && <><br /><span style={{ fontSize: '0.9em', opacity: 0.8 }}>Sede legale: {data.legalAddress}</span></>}
                                                    </div>
                                                )}
                                                {onFront('countryOrigin') && data.countryOrigin && <div style={{ marginBottom: `${6 * fontScale}px` }}><strong>Origine:</strong> {data.countryOrigin}</div>}
                                                {onFront('storageConditions') && data.storageConditions && <div style={{ marginBottom: `${6 * fontScale}px` }}><strong>Conservazione:</strong> {data.storageConditions}</div>}
                                                {onFront('consumptionInstructions') && data.consumptionInstructions && <div style={{ marginBottom: `${6 * fontScale}px` }}><strong>Preparazione:</strong> {data.consumptionInstructions}</div>}
                                                {onFront('alcoholPercent') && data.alcoholPercent && <div style={{ marginBottom: `${6 * fontScale}px` }}>{data.alcoholPercent}</div>}
                                                {onFront('claims') && data.claimsSelezionati.length > 0 && (
                                                    <div style={{ marginBottom: `${6 * fontScale}px` }}>{data.claimsSelezionati.join(' · ')}</div>
                                                )}
                                            </div>

                                            <div style={{
                                                marginTop: 'auto',
                                                borderTop: `1px solid ${data.theme === 'dark' ? '#777' : '#ccc'}`,
                                                paddingTop: `${8 * fontScale}px`,
                                                display: 'grid',
                                                gridTemplateColumns: shareBarcodeRowFront ? '1fr 1fr auto' : '1fr 1fr',
                                                gap: `${8 * fontScale}px`,
                                                alignItems: 'center',
                                                fontSize: `${10 * fontScale}px`
                                            }}>
                                                <div>
                                                    <strong>Peso netto:</strong><br />
                                                    <span style={{ fontSize: `${14 * fontScale}px`, fontWeight: 700 }}>{ph(data.netWeight, '—')}</span>
                                                    {data.drainedWeight && (
                                                        <div style={{ marginTop: 2 }}><strong>Peso sgocciolato:</strong> {data.drainedWeight}</div>
                                                    )}
                                                    {data.additionalNetWeights.filter(v => v.netWeight).map((v, i) => (
                                                        <div key={i} style={{ marginTop: 2 }}>
                                                            <strong>{v.netWeight}</strong>{v.drainedWeight && ` (sgoc. ${v.drainedWeight})`}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    {onFront('lotDate') && data.lotNumber && <><strong>Lotto:</strong> {data.lotNumber}<br /></>}
                                                    {onFront('lotDate') && data.bestBefore && <strong>{data.bestBefore}</strong>}
                                                </div>
                                                {/* Barcode qui SOLO se condivide riga (etichetta stretta, share col
                                                    peso/lotto invece di dominare una riga tutta sua — framework
                                                    responsive 2026-08-25). Altrimenti resta sotto, riga propria. */}
                                                {shareBarcodeRowFront && data.codeType !== 'none' && (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <CodeCanvas type={data.codeType} value={data.codeValue} scale={data.codeScale} pxPerMm={pxPerMmFront} />
                                                    </div>
                                                )}
                                            </div>
                                            {showCodeFront && !shareBarcodeRowFront && data.codeType !== 'none' && (
                                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: `${6 * fontScale}px` }}>
                                                    <CodeCanvas type={data.codeType} value={data.codeValue} scale={data.codeScale} pxPerMm={pxPerMmFront} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Contenuto aggiuntivo fronte — tabella nutrizionale + raccolta differenziata imballi,
                                        di default sul fronte insieme al resto. Spostabile sul retro dalla checklist. */}
                                    {((onFront('nutritionTable') && per100 && data.showNutritionTable) || (onFront('imballi') && data.imballi.length > 0)) && (
                                        <div style={{
                                            padding: `${12 * fontScale}px`,
                                            fontSize: `${10 * fontScale}px`,
                                            flex: useTwoColumnFront ? '1 1 45%' : undefined,
                                            minWidth: useTwoColumnFront ? 0 : undefined,
                                        }}>
                                            {onFront('nutritionTable') && per100 && data.showNutritionTable && (
                                                <div style={{ marginBottom: (onFront('imballi') && data.imballi.length > 0) ? `${10 * fontScale}px` : 0 }}>
                                                    {renderNutritionTable({ measure: true })}
                                                </div>
                                            )}
                                            {onFront('imballi') && data.imballi.length > 0 && renderImballiList()}
                                        </div>
                                    )}
                                </div>
                                </div>
                        {labelRenderedWidthPx > 0 && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
                                padding: '6px 10px', borderRadius: 6, fontSize: 11,
                                background: isBodyTextReadable ? 'rgba(0,163,108,0.08)' : 'rgba(230,126,34,0.12)',
                                color: isBodyTextReadable ? 'var(--color-accent)' : '#b7791f',
                            }}>
                                {isBodyTextReadable ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} Corpo testo (fronte) ≈ {bodyFontSizeMm.toFixed(2)}mm — {isBodyTextReadable
                                    ? 'leggibile secondo Reg. UE 1169/2011'
                                    : `sotto la soglia minima leggibile (${MIN_READABLE_MM}mm): aumenta le dimensioni etichetta o riduci il testo`}
                                <InfoTooltip text={`Soglia ${MIN_READABLE_MM}mm — All. IV Reg. 1169/2011: 0,9mm sotto gli 80cm² di superficie, 1,2mm sopra. Stima diagnostica sul corpo carattere, non sostituisce una verifica di stampa.`} />
                            </div>
                        )}
                        {isNutritionDeclarationExempt && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '6px 10px', borderRadius: 6, fontSize: 11, background: 'rgba(0,163,108,0.08)', color: 'var(--color-accent)' }}>
                                <CheckCircle2 size={13} /> Superficie ≈{frontSurfaceCm2.toFixed(0)}cm² &lt;25cm²: dichiarazione nutrizionale non obbligatoria (All. V p.18 Reg. 1169/2011) — puoi ometterla.
                            </div>
                        )}
                        {isMostFieldsExempt && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '6px 10px', borderRadius: 6, fontSize: 11, background: 'rgba(0,163,108,0.08)', color: 'var(--color-accent)' }}>
                                <CheckCircle2 size={13} /> Superficie ≈{frontSurfaceCm2.toFixed(0)}cm² &lt;10cm²: solo denominazione, allergeni, quantità netta e TMC restano obbligatori (Art. 16(2) Reg. 1169/2011) — il resto è facoltativo.
                            </div>
                        )}
                        {isFrontHeightOverflowing && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
                                padding: '6px 10px', borderRadius: 6, fontSize: 11,
                                background: 'rgba(230,126,34,0.12)', color: '#b7791f',
                            }}>
                                <AlertTriangle size={13} /> Contenuto più alto di quanto impostato (≈{contentHeightMm.toFixed(0)}mm vs {data.heightMm}mm) — l'export rispetta le dimensioni impostate, quindi la parte in eccesso viene tagliata e non compare nel file. Sposta qualcosa sul retro, riduci il testo o aumenta l'altezza etichetta.
                            </div>
                        )}
                        {isNutritionTableOversized && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
                                padding: '6px 10px', borderRadius: 6, fontSize: 11,
                                background: 'rgba(230,126,34,0.12)', color: '#b7791f',
                            }}>
                                <AlertTriangle size={13} /> Tabella valori nutrizionali {nationTab} troppo grande anche nel formato più compatto disponibile — nell'export viene tagliata ai bordi dell'etichetta. {canCiteFdaSmallPackage
                                    ? `Sotto i 12 sq in (~77cm²) la FDA (21 CFR 101.9(j)(13)(i)(A)) ammette di indicare indirizzo/telefono al posto della tabella; in alternativa aumenta le dimensioni dell'etichetta o sposta la tabella sul retro.`
                                    : `Aumenta le dimensioni dell'etichetta, sposta la tabella sul retro (se non già lì) o stampa i valori nutrizionali su un'etichetta aggiuntiva dedicata.`}
                                <InfoTooltip text="La tabella nutrizionale ha già scalato al formato più compatto previsto per questo mercato (lineare per USA/Canada, lineare Art. 34(2) per UE/AU/Arabi) — non c'è ulteriore riduzione automatica possibile senza compromettere la leggibilità (Art. 13(2) Reg. 1169/2011)." />
                            </div>
                        )}
                        {isCodeTooSmallFront && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
                                padding: '6px 10px', borderRadius: 6, fontSize: 11,
                                background: 'rgba(230,126,34,0.12)', color: '#b7791f',
                            }}>
                                <AlertTriangle size={13} /> Codice a barre più largo dell'etichetta a magnificazione minima (80% GS1) — nell'export rischia di essere tagliato o non scansionabile. Aumenta le dimensioni dell'etichetta o sposta il codice sul retro.
                                <InfoTooltip text="Sotto l'80% di magnificazione (GS1 General Specifications) un EAN-13/CODE128 non è garantito leggibile da uno scanner reale, quindi il codice non si rimpicciolisce oltre quella soglia anche se il riquadro è più piccolo." />
                            </div>
                        )}
                    </div>

                    {data.hasBackLabel && (
                        <div className="result-box" style={{ marginTop: 24 }}>
                            {/* Didascalia + hint editor: fuori dal riquadro fisico (stessa regola
                                del selettore mercato sopra) — prima erano dentro labelBackPreviewRef,
                                gonfiando il contenuto misurato e finendo persino nell'export PNG. */}
                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, marginBottom: 6 }}>
                                Retro etichetta
                            </div>
                            {data.backFields.length === 0 && (
                                <div className="hint" style={{ marginBottom: 8 }}>Nessun campo spostato sul retro — usa la checklist "Campi sul retro" nella scheda Dati.</div>
                            )}
                            <div style={{
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                background: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 20px 20px',
                                padding: 20, borderRadius: 8, border: '1px solid var(--color-border)'
                            }}>
                                <div ref={labelBackPreviewRef} style={{
                                    width: '100%',
                                    maxWidth: `min(${data.backWidthMm}mm, 100%)`,
                                    aspectRatio: `${data.backWidthMm} / ${data.backHeightMm}`,
                                    overflow: 'hidden',
                                    backgroundColor: data.theme === 'dark' ? '#222' : '#fff',
                                    color: data.theme === 'dark' ? '#fff' : '#111',
                                    borderRadius: 4,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    border: '1px solid #ccc',
                                    padding: `${12 * backFontScale}px`,
                                    fontFamily: 'Arial, sans-serif',
                                    fontSize: `${11 * backFontScale}px`,
                                    lineHeight: 1.4,
                                    display: 'flex',
                                    // Opzione B — stesso principio del fronte: su formati orizzontali larghi
                                    // corpo testo e tabella+imballi si affiancano invece di impilarsi.
                                    flexDirection: useTwoColumnBack ? 'row' : 'column',
                                    gap: useTwoColumnBack ? `${12 * backFontScale}px` : 0,
                                }}>
                                    <div style={{ flex: useTwoColumnBack ? '1 1 55%' : '1 1 auto', minWidth: useTwoColumnBack ? 0 : undefined }}>
                                        {onBack('ingredients') && <div style={{ marginBottom: `${6 * backFontScale}px` }}><strong>Ingredienti:</strong> {data.ingredients}</div>}
                                        {onBack('allergens') && data.allergens && <div style={{ marginBottom: `${6 * backFontScale}px`, fontWeight: 700 }}>{data.allergens}</div>}
                                        {onBack('allergens') && data.includeAllergenNote && <div style={{ marginBottom: `${6 * backFontScale}px`, fontSize: `${9 * backFontScale}px`, fontStyle: 'italic' }}>{ALLERGEN_NOTE_TEXT}</div>}
                                        {onBack('producerAddress') && (
                                            <div style={{ marginBottom: `${6 * backFontScale}px` }}>
                                                <strong>Prodotto da:</strong> {data.producer}
                                                {data.address && <><br />{data.address}</>}
                                                {data.legalAddress && <><br /><span style={{ fontSize: '0.9em', opacity: 0.8 }}>Sede legale: {data.legalAddress}</span></>}
                                            </div>
                                        )}
                                        {onBack('countryOrigin') && data.countryOrigin && <div style={{ marginBottom: `${6 * backFontScale}px` }}><strong>Origine:</strong> {data.countryOrigin}</div>}
                                        {onBack('storageConditions') && data.storageConditions && <div style={{ marginBottom: `${6 * backFontScale}px` }}><strong>Conservazione:</strong> {data.storageConditions}</div>}
                                        {onBack('consumptionInstructions') && data.consumptionInstructions && <div style={{ marginBottom: `${6 * backFontScale}px` }}><strong>Preparazione:</strong> {data.consumptionInstructions}</div>}
                                        {onBack('alcoholPercent') && data.alcoholPercent && <div style={{ marginBottom: `${6 * backFontScale}px` }}>{data.alcoholPercent}</div>}
                                        {onBack('claims') && data.claimsSelezionati.length > 0 && (
                                            <div style={{ marginBottom: `${6 * backFontScale}px` }}>{data.claimsSelezionati.join(' · ')}</div>
                                        )}
                                        {/* Barcode affiancato al lotto (invece che sotto, riga propria) quando
                                            domina la larghezza del retro — stesso principio del fronte
                                            (framework responsive 2026-08-25). */}
                                        {shareBarcodeRowBack && data.codeType !== 'none' ? (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: `${8 * backFontScale}px`, marginBottom: `${6 * backFontScale}px` }}>
                                                <div>
                                                    {onBack('lotDate') && data.lotNumber && <><strong>Lotto:</strong> {data.lotNumber}<br /></>}
                                                    {onBack('lotDate') && data.bestBefore && <strong>{data.bestBefore}</strong>}
                                                </div>
                                                <CodeCanvas type={data.codeType} value={data.codeValue} scale={data.codeScale} pxPerMm={pxPerMmBack} />
                                            </div>
                                        ) : (
                                            <>
                                                {onBack('lotDate') && (data.lotNumber || data.bestBefore) && (
                                                    <div style={{ marginBottom: `${6 * backFontScale}px` }}>
                                                        {data.lotNumber && <><strong>Lotto:</strong> {data.lotNumber}<br /></>}
                                                        {data.bestBefore && <strong>{data.bestBefore}</strong>}
                                                    </div>
                                                )}
                                                {showCodeBack && data.codeType !== 'none' && (
                                                    <div style={{ display: 'flex', justifyContent: 'center', margin: `${6 * backFontScale}px 0` }}>
                                                        <CodeCanvas type={data.codeType} value={data.codeValue} scale={data.codeScale} pxPerMm={pxPerMmBack} />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {((onBack('nutritionTable') && per100 && data.showNutritionTable) || (onBack('imballi') && data.imballi.length > 0)) && (
                                        <div style={{ flex: useTwoColumnBack ? '1 1 45%' : undefined, minWidth: useTwoColumnBack ? 0 : undefined }}>
                                            {onBack('nutritionTable') && per100 && data.showNutritionTable && (
                                                <div style={{ marginTop: useTwoColumnBack ? 0 : `${8 * backFontScale}px` }}>{renderNutritionTable()}</div>
                                            )}
                                            {onBack('imballi') && data.imballi.length > 0 && (
                                                <div style={{ marginTop: `${8 * backFontScale}px`, fontSize: `${10 * backFontScale}px` }}>{renderImballiList()}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {backRenderedWidthPx > 0 && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
                                    padding: '6px 10px', borderRadius: 6, fontSize: 11,
                                    background: isBackBodyTextReadable ? 'rgba(0,163,108,0.08)' : 'rgba(230,126,34,0.12)',
                                    color: isBackBodyTextReadable ? 'var(--color-accent)' : '#b7791f',
                                }}>
                                    {isBackBodyTextReadable ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} Corpo testo (retro) ≈ {backBodyFontSizeMm.toFixed(2)}mm — {isBackBodyTextReadable
                                        ? 'leggibile secondo Reg. UE 1169/2011'
                                        : `sotto la soglia minima leggibile (${BACK_MIN_READABLE_MM}mm): aumenta le dimensioni del retro o riduci il testo`}
                                </div>
                            )}
                            {isBackHeightOverflowing && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
                                    padding: '6px 10px', borderRadius: 6, fontSize: 11,
                                    background: 'rgba(230,126,34,0.12)', color: '#b7791f',
                                }}>
                                    <AlertTriangle size={13} /> Contenuto più alto di quanto impostato (≈{backContentHeightMm.toFixed(0)}mm vs {data.backHeightMm}mm) — l'export taglia la parte in eccesso. Aumenta l'altezza del retro o riduci il testo.
                                </div>
                            )}
                            {isCodeTooSmallBack && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
                                    padding: '6px 10px', borderRadius: 6, fontSize: 11,
                                    background: 'rgba(230,126,34,0.12)', color: '#b7791f',
                                }}>
                                    <AlertTriangle size={13} /> Codice a barre più largo del retro a magnificazione minima (80% GS1) — rischia di essere tagliato o non scansionabile. Aumenta le dimensioni del retro.
                                </div>
                            )}
                        </div>
                    )}
                </>
            </div>
            <div className="table-panel-footer">
                <button type="button" className="btn btn-outline" disabled={!isComplete} onClick={handlePDF}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    title={isComplete ? 'Riepilogo dati per consulente/archivio' : `Campi mancanti: ${missingFields.join(', ')}`}
                ><FileText size={13} aria-hidden="true" /> Report PDF</button>
                <button type="button" className="btn btn-accent" disabled={!isComplete || exportingLabel !== null} onClick={handleExportFront}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    title={isComplete ? `Immagine PNG ${data.widthMm}×${data.heightMm}mm a ${PRINT_DPI}dpi — pronta per Bartender/NiceLabel` : `Campi mancanti: ${missingFields.join(', ')}`}
                ><ImageDown size={13} aria-hidden="true" /> {exportingLabel === 'front' ? 'Esportazione…' : 'Fronte per stampa'}</button>
                {data.hasBackLabel && (
                    <button type="button" className="btn btn-accent" disabled={!isComplete || exportingLabel !== null} onClick={handleExportBack}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        title={`Immagine PNG retro, base ${data.backWidthMm}mm a ${PRINT_DPI}dpi`}
                    ><ImageDown size={13} aria-hidden="true" /> {exportingLabel === 'back' ? 'Esportazione…' : 'Retro per stampa'}</button>
                )}
                <button type="button" className="btn btn-outline" disabled={!isComplete || exportingScheda} onClick={handleSchedaPDF}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    title={isComplete ? 'Scheda completa (ingredienti integrali, tabella, claims, imballi) per grafico/tipografia' : `Campi mancanti: ${missingFields.join(', ')}`}
                ><FileText size={13} aria-hidden="true" /> {exportingScheda ? 'Esportazione…' : 'Scheda per grafico'}</button>
            </div>
        </div>
    );

    return (
        <>
            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                variant={confirmState.variant}
                confirmLabel={confirmState.confirmLabel}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
            />
            <PromptDialog
                open={promptOpen}
                title="Nome per questa etichetta"
                defaultValue={data.productName || 'Etichetta ' + new Date().toLocaleDateString()}
                confirmLabel="Salva"
                onConfirm={(name) => { setPromptOpen(false); doSaveWithName(name); }}
                onCancel={() => setPromptOpen(false)}
            />

            {/* M6 — scheda completa, catturata da handleSchedaPDF. Sempre montata (non solo
                quando l'utente clicca) così html2canvas trova contenuto già misurato. */}
            {/* position:fixed a coordinate reali (non left:-99999) e z-index sotto l'app: le
                tabelle ufficiali (TabUE ecc.) usano flex annidati + WebkitTextStroke, e
                html2canvas calcola male i bounding box quando l'antenato è molto fuori dal
                viewport — testo/celle sparivano nell'export (bug reale, verificato: la
                dichiarazione nutrizionale risultava vuota nel PDF). Restando a coordinate
                reali ma dietro il resto della UI (z-index negativo, pointer-events:none)
                l'utente non la vede mai, ma html2canvas la tratta come contenuto a schermo. */}
            <div style={{ position: 'fixed', left: 0, top: 0, width: 780, background: '#fff', color: '#111', zIndex: -1, pointerEvents: 'none' }}>
                <div ref={schedaRef} style={{ padding: 32, fontFamily: 'Arial, sans-serif', fontSize: 13, lineHeight: 1.5 }}>
                    <div style={{ borderBottom: '3px solid #111', paddingBottom: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            {data.legalDenomination && <div style={{ fontSize: 14, fontWeight: 700 }}>{data.legalDenomination}</div>}
                            <div style={{ fontSize: 22, fontWeight: 800 }}>{data.productName || 'Denominazione prodotto'}</div>
                            {data.quidOutsideList && <div style={{ fontSize: 13, fontWeight: 700 }}>{data.quidOutsideList}</div>}
                            {quidLines.map(line => <div key={line} style={{ fontSize: 12, fontWeight: 700 }}>{line}</div>)}
                            {data.complementaryDeclarations.length > 0 && <div style={{ fontSize: 11 }}>{data.complementaryDeclarations.join(' · ')}</div>}
                            {data.otherWarnings && <div style={{ fontSize: 11 }}>{data.otherWarnings}</div>}
                            <div style={{ fontSize: 11, color: '#555' }}>Scheda etichetta — documento di lavoro per grafico/tipografia</div>
                        </div>
                        <div style={{ fontSize: 10, color: '#555', textAlign: 'right' }}>
                            {data.schedaCodice && <div>Codice scheda: <strong>{data.schedaCodice}</strong></div>}
                            {data.schedaRevisione && <div>Revisione: <strong>{data.schedaRevisione}</strong></div>}
                            {data.schedaDataRevisione && <div>Data: <strong>{data.schedaDataRevisione}</strong></div>}
                        </div>
                    </div>

                    <p style={{ fontSize: 10, color: '#900', margin: '0 0 16px', fontStyle: 'italic' }}>
                        Documento di lavoro: verificare corpo carattere, posizionamento e conformità finale prima della stampa (Reg. UE 1169/2011 Art. 13).
                    </p>

                    <div style={{ border: '1px solid #999', marginBottom: 16 }}>
                        {data.legalDenomination && (
                            <div style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontWeight: 700 }}>
                                {data.legalDenomination}
                            </div>
                        )}
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid #ccc' }}>
                            <span style={{ fontWeight: 700 }}>Ingredienti</span>: {data.ingredients || '—'}
                        </div>
                        {data.allergens && (
                            <div style={{ padding: '6px 8px', borderBottom: data.includeAllergenNote ? 'none' : '1px solid #ccc' }}>
                                {data.allergens}
                            </div>
                        )}
                        {data.includeAllergenNote && (
                            <div style={{ padding: '6px 8px', fontSize: 10, fontStyle: 'italic', color: '#555', borderBottom: '1px solid #ccc' }}>
                                {ALLERGEN_NOTE_TEXT}
                            </div>
                        )}
                        {quidLines.length > 0 && (
                            <div style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: 12 }}>
                                {quidLines.map(line => <div key={line} style={{ fontWeight: 700 }}>{line}</div>)}
                            </div>
                        )}
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr><td style={{ ...SCHEDA_TD, fontWeight: 700, width: 170 }}>Produttore</td><td style={SCHEDA_TD}>{data.producer || '—'}{data.address && ` — ${data.address}`}</td></tr>
                                {data.legalAddress && <tr><td style={{ ...SCHEDA_TD, fontWeight: 700 }}>Sede legale</td><td style={SCHEDA_TD}>{data.legalAddress}</td></tr>}
                                <tr><td style={{ ...SCHEDA_TD, fontWeight: 700 }}>Paese di origine</td><td style={SCHEDA_TD}>{data.countryOrigin || '—'}</td></tr>
                                <tr><td style={{ ...SCHEDA_TD, fontWeight: 700 }}>Quantità netta nominale</td><td style={SCHEDA_TD}>
                                    {data.netWeight || '—'}
                                    {data.additionalNetWeights.filter(v => v.netWeight).map((v, i) => (
                                        <span key={i}> / {v.netWeight}</span>
                                    ))}
                                </td></tr>
                                {(data.drainedWeight || data.additionalNetWeights.some(v => v.drainedWeight)) && (
                                    <tr><td style={{ ...SCHEDA_TD, fontWeight: 700 }}>Peso sgocciolato</td><td style={SCHEDA_TD}>
                                        {data.drainedWeight || '—'}
                                        {data.additionalNetWeights.filter(v => v.drainedWeight).map((v, i) => (
                                            <span key={i}> / {v.drainedWeight}</span>
                                        ))}
                                    </td></tr>
                                )}
                                {data.alcoholPercent && <tr><td style={{ ...SCHEDA_TD, fontWeight: 700 }}>Titolo alcolometrico</td><td style={SCHEDA_TD}>{data.alcoholPercent}</td></tr>}
                                {data.lotNumber && <tr><td style={{ ...SCHEDA_TD, fontWeight: 700 }}>N° lotto</td><td style={SCHEDA_TD}>{data.lotNumber}</td></tr>}
                                {data.bestBefore && <tr><td style={{ ...SCHEDA_TD, fontWeight: 700 }}>Da consumare preferibilmente entro il</td><td style={SCHEDA_TD}>{data.bestBefore}</td></tr>}
                                {data.storageConditions && <tr><td style={{ ...SCHEDA_TD, fontWeight: 700 }}>Conservazione</td><td style={SCHEDA_TD}>{data.storageConditions}</td></tr>}
                                {data.consumptionInstructions && <tr><td style={{ ...SCHEDA_TD, fontWeight: 700, borderBottom: 'none' }}>Istruzioni per il consumo</td><td style={{ ...SCHEDA_TD, borderBottom: 'none' }}>{data.consumptionInstructions}</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {data.claimsSelezionati.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555', marginBottom: 4 }}>Claims nutrizionali (Reg. 1924/2006)</div>
                            <div style={{ color: '#c1440e', fontWeight: 600 }}>{data.claimsSelezionati.join(' · ')}</div>
                        </div>
                    )}

                    {(() => {
                        // Foglio Excel "e. UE" riga 51 — paragrafo unico con le indicazioni sulla
                        // salute verbatim (Reg. UE 432/2012): UNA sola indicazione per nutriente
                        // (la prima dell'elenco ammesso), non tutte quelle disponibili — così fa
                        // il documento originale. Deduplicata (FONTE DI X riusa lo stesso testo
                        // di RICCO DI X, stesso nutriente non va ripetuto due volte).
                        const texts = Array.from(new Set(
                            HEALTH_CLAIMS_432_2012
                                .filter(h => data.claimsSelezionati.includes(h.claim))
                                .map(h => h.texts[0])
                        ));
                        if (texts.length === 0) return null;
                        return (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555', marginBottom: 4 }}>Indicazioni sulla salute (Reg. UE 432/2012)</div>
                                <div style={{ fontSize: 11 }}>{texts.join(' - ')}</div>
                            </div>
                        );
                    })()}

                    {/* Layout a due colonne (tabella HTML, non flex) — ricalca l'impaginazione
                        della scheda Excel originale: dichiarazione nutrizionale a sinistra,
                        raccolta differenziata + note per il grafico a destra. */}
                    {(per100 && data.showNutritionTable) || data.imballi.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: 16 }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '55%', verticalAlign: 'top', border: '1px solid #999', padding: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Dichiarazione nutrizionale</div>
                                        {per100 && data.showNutritionTable ? renderSchedaNutritionTable() : <div style={{ fontSize: 11, color: '#999' }}>—</div>}
                                        <div style={{ fontSize: 9, color: '#777', marginTop: 6 }}>*AR = Assunzioni di riferimento di un adulto medio (8400 kJ / 2000 kcal).</div>
                                    </td>
                                    <td style={{ width: '45%', verticalAlign: 'top', border: '1px solid #999', padding: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Raccolta differenziata imballi</div>
                                        {data.imballi.length > 0 ? renderImballiList() : <div style={{ fontSize: 11, color: '#999' }}>Nessun imballo dichiarato</div>}

                                        <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 14, marginBottom: 6 }}>Note per il grafico</div>
                                        <ul style={{ margin: 0, paddingLeft: 14, fontSize: 9, color: '#555' }}>
                                            {GRAPHIC_NOTE_LINES.map(line => <li key={line} style={{ marginBottom: 3 }}>{line}</li>)}
                                        </ul>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ) : null}

                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #ccc', fontSize: 9, color: '#777' }}>
                        Generato da AEA Consulenze Alimentari il {new Date().toLocaleDateString('it-IT')}.
                    </div>
                </div>
            </div>

            {showWelcome && (
                <WelcomeModal
                    slides={ETICHETTE_SLIDES}
                    onClose={() => setShowWelcome(false)}
                    onNeverShow={() => { setWelcomeSeen(true); setShowWelcome(false); }}
                />
            )}

            {isArchiveOpen && (
                <ArchiveModal
                    items={savedLabels}
                    currentId={currentId}
                    onClose={() => setIsArchiveOpen(false)}
                    onLoad={handleLoad}
                    onDelete={deleteItem}
                    renderItemDetails={(d) => (
                        <>
                            <span><strong>Prodotto:</strong> {d.productName || '-'}</span><br />
                            <span><strong>Produttore:</strong> {d.producer || '-'}</span>
                        </>
                    )}
                />
            )}

            {!isMobile && createPortal(
                <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                    {data.productName ? (
                        <span style={{ color: 'var(--color-orange)' }}>{data.productName}</span>
                    ) : (
                        <span style={{ color: 'var(--color-text)' }}>Generatore Etichette</span>
                    )}
                </div>,
                document.getElementById('topbar-title-slot') ?? document.body
            )}
            {!isMobile && createPortal(
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="topbar-btn-primary" onClick={handleNew}>
                        <Plus size={13} /> Nuovo
                    </button>
                    <button type="button" className="topbar-btn-ghost" onClick={() => setIsArchiveOpen(true)}>
                        <Archive size={13} /> Archivio ({savedLabels.length})
                    </button>
                    <button type="button" className="topbar-btn-ghost" onClick={() => setShowWelcome(true)} title="Apri guida rapida">
                        <BookOpen size={13} /> Guida
                    </button>
                    <button type="button" className="topbar-btn-ghost" onClick={handleSave} style={{ position: 'relative' }}>
                        {isDirty && (
                            <span aria-hidden="true" style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--color-orange, #f97316)', pointerEvents: 'none' }} />
                        )}
                        <Save size={13} /> {currentId ? 'Salva Modifiche' : 'Salva'}
                    </button>
                </div>,
                document.getElementById('topbar-mode-toggle-slot') ?? document.body
            )}

            <div className="calc-outer-shell" style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : 'calc(100vh - var(--topbar-height, 56px))' }}>
                {isMobile && (
                    // MobileShell non espone topbar-title-slot/topbar-mode-toggle-slot (header statico,
                    // vedi MobileShell.tsx) — niente portal qui, azioni in riga visibile nel flusso.
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--color-border)', background: 'white' }}>
                        <button type="button" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleNew}><Plus size={13} /> Nuovo</button>
                        <button type="button" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setIsArchiveOpen(true)}><Archive size={13} /> Archivio ({savedLabels.length})</button>
                        <button type="button" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowWelcome(true)} aria-label="Apri guida rapida"><BookOpen size={13} /> Guida</button>
                        <button type="button" className="btn btn-accent" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleSave}>
                            {isDirty && (
                                <span aria-hidden="true" style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 2px var(--color-orange, #ff7e2e)' }} />
                            )}
                            <Save size={13} /> {currentId ? 'Salva Modifiche' : 'Salva'}
                        </button>
                    </div>
                )}
                <SplitShell left={leftPanel} right={rightPanel} />
            </div>
        </>
    );
}
