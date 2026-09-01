/**
 * Dizionario codici materiale imballo (Decisione 97/129/CE + prassi raccolta differenziata IT).
 * Usato come suggerimento/autocompletamento nel campo "codice" di EtichetteCalc — riduce il
 * rischio che l'utente inserisca un codice inventato o una raccolta sbagliata per mancanza
 * di nozioni tecniche. Non è un elenco esaustivo: il campo resta testo libero con fallback manuale.
 */
export interface PackagingMaterial {
    codice: string;
    materiale: string;
    raccolta: string;
}

export const PACKAGING_MATERIALS: PackagingMaterial[] = [
    { codice: 'PET 1', materiale: 'Plastica — PET (Polietilene tereftalato)', raccolta: 'Raccolta plastica' },
    { codice: 'HDPE 2', materiale: 'Plastica — HDPE (Polietilene alta densità)', raccolta: 'Raccolta plastica' },
    { codice: 'PVC 3', materiale: 'Plastica — PVC (Cloruro di polivinile)', raccolta: 'Raccolta plastica' },
    { codice: 'LDPE 4', materiale: 'Plastica — LDPE (Polietilene bassa densità)', raccolta: 'Raccolta plastica' },
    { codice: 'PP 5', materiale: 'Plastica — PP (Polipropilene)', raccolta: 'Raccolta plastica' },
    { codice: 'PS 6', materiale: 'Plastica — PS (Polistirene)', raccolta: 'Raccolta plastica' },
    { codice: 'O 7', materiale: 'Plastica — altro/multimateriale plastico', raccolta: 'Raccolta plastica' },
    { codice: 'FE 40', materiale: 'Metallo — acciaio/banda stagnata', raccolta: 'Raccolta metallo' },
    { codice: 'ALU 41', materiale: 'Metallo — alluminio', raccolta: 'Raccolta metallo' },
    { codice: 'PAP 20', materiale: 'Carta/cartone ondulato', raccolta: 'Raccolta carta' },
    { codice: 'PAP 21', materiale: 'Cartone non ondulato', raccolta: 'Raccolta carta' },
    { codice: 'PAP 22', materiale: 'Carta', raccolta: 'Raccolta carta' },
    { codice: 'GL 70', materiale: 'Vetro incolore', raccolta: 'Raccolta vetro' },
    { codice: 'GL 71', materiale: 'Vetro verde', raccolta: 'Raccolta vetro' },
    { codice: 'GL 72', materiale: 'Vetro marrone', raccolta: 'Raccolta vetro' },
    { codice: 'FOR 50', materiale: 'Legno', raccolta: 'Raccolta legno' },
    { codice: 'TEX 60', materiale: 'Tessile', raccolta: 'Raccolta tessile' },
    { codice: 'C/PAP 84', materiale: 'Accoppiato cartone/plastica', raccolta: 'Verifica raccolta indifferenziata/Comune' },
    { codice: 'C/LDPE 90', materiale: 'Accoppiato carta/polietilene', raccolta: 'Verifica raccolta indifferenziata/Comune' },
];
