// Test di integrità sui DATI del database ingredienti (non sulla logica).
//
// `public/data/ingredientsDB.json` è un artefatto generato da un Excel esterno
// (vedi D1/D2 in AUDIT-2026-09-03.md). Le correzioni fatte a mano qui verrebbero
// perse a una rigenerazione: questi test esistono proprio per accorgersene:
// se il difetto rientra, la suite fallisce invece di lasciarlo passare in silenzio.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface RawIngredient {
    nome?: string;
    etichetta?: string;
    all_grano?: string;
    all_glutine?: string;
    [k: string]: unknown;
}

const db = JSON.parse(
    readFileSync(resolve(__dirname, '../../public/data/ingredientsDB.json'), 'utf8'),
) as RawIngredient[];

const testo = (i: RawIngredient) => `${i.nome ?? ''} ${i.etichetta ?? ''}`;

// "grano saraceno" contiene la parola "grano" ma NON è un cereale: è una
// poligonacea, senza glutine, base della cucina per celiaci. Va escluso prima
// di cercare i veri cereali del gruppo, altrimenti matcha su sé stesso.
const senzaSaraceno = (s: string) => s.replace(/grano\s+saraceno/gi, '___');
const CEREALI_GLUTINE = /frumento|\bgrano\b|segale|orzo|avena|farro|kamut|spelta/i;

describe('ingredientsDB — integrità allergeni (D1)', () => {
    const saraceno = db.filter(i => /saraceno/i.test(testo(i)));

    it('il grano saraceno è presente nel database', () => {
        // Se questo fallisce, i test sotto passerebbero a vuoto.
        expect(saraceno.length).toBeGreaterThan(0);
    });

    const soloSaraceno = saraceno.filter(i => !CEREALI_GLUTINE.test(senzaSaraceno(testo(i))));

    it('nessuna voce di solo grano saraceno è taggata GRANO come presente', () => {
        const sbagliati = soloSaraceno
            .filter(i => i.all_grano)
            .map(i => `${i.nome} (all_grano=${i.all_grano})`);

        expect(
            sbagliati,
            'Il grano saraceno non è frumento: dichiarare GRANO è un falso allergene su un ' +
            'prodotto per celiaci — e dopo il fix E4 si porta dietro anche GLUTINE. ' +
            'Se questo test fallisce dopo una rigenerazione del JSON, il difetto va corretto ' +
            'nell\'Excel sorgente (colonna HO) — vedi D1 in AUDIT-2026-09-03.md.',
        ).toEqual([]);
    });

    // D2 è un finding APERTO e distinto: 9 prodotti "senza glutine" hanno all_glutine
    // valorizzato come presente. Serve la scheda tecnica del fornitore per stabilire se
    // sia "presente" o "tracce", quindi non è stato corretto. Qui la voce nota è elencata
    // esplicitamente: il test non diventa rosso per un problema già tracciato, ma fallisce
    // se ne compare una NUOVA — e va aggiornato quando D2 viene chiuso.
    const D2_NOTI_IN_REVISIONE = ['mix ai cereali  e semi per prodotti da forno senza glutine'];

    it('nessuna NUOVA voce di grano saraceno è taggata GLUTINE come presente', () => {
        const sbagliati = soloSaraceno
            .filter(i => i.all_glutine && !D2_NOTI_IN_REVISIONE.includes(i.nome ?? ''))
            .map(i => `${i.nome} (all_glutine=${i.all_glutine})`);

        expect(sbagliati, 'Voce nuova con GLUTINE presente ma senza cereali del gruppo — vedi D2.').toEqual([]);
    });

    it('i tag di traccia NON sono vincolati: la contaminazione crociata col glutine è plausibile', () => {
        // Un molino che lavora anche frumento può legittimamente dichiarare tracce
        // sul grano saraceno. Il test sopra riguarda solo gli allergeni PRESENTI.
        const conTracce = saraceno.filter(i => i.cross_glutine || i.cross_grano);
        expect(Array.isArray(conTracce)).toBe(true);
    });
});
