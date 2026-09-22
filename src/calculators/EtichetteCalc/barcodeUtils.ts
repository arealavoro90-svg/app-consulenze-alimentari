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
