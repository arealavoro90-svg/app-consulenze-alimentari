import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { importFromExcel } from './excelImporter';
import type { DBIngredient } from '../engines/nutrizionaleCalcEngine';

function makeIng(nome: string): DBIngredient {
    return {
        nome, etichetta: nome,
        kcal: 100, kj: 420, grassi: 1, saturi: 0.5, carboidrati: 10, zuccheri: 1,
        proteine: 2, sodio_mg: 5,
    };
}

/** Costruisce un workbook minimale che rispetta il layout del foglio "calcoli" AEA. */
function buildWorkbook(opts: { finishedWeight?: number; pz1?: number } = {}): File {
    const ws: XLSX.WorkSheet = {};
    const set = (addr: string, v: number | string) => { ws[addr] = { t: typeof v === 'number' ? 'n' : 's', v }; };

    set('L7', 'RICETTA TEST');
    // Header componente 1: colonna I(8); "Per N° Pz:" in K(10); valore in L(11)
    set('I12', 'Ricetta Componente 1');
    if (opts.pz1 !== undefined) { set('K12', 'Per N° Pz:'); set('L12', opts.pz1); }
    set('I14', 500); // totale componente 1 (riga 13, 0-based -> Excel riga 14)
    if (opts.finishedWeight !== undefined) set('AF13', opts.finishedWeight);

    // Ingredienti: riga 18 (0-based 17) in poi, nome in colonna B, grammi in colonna I
    set('B18', 'farina test');
    set('I18', 500);

    ws['!ref'] = 'A1:AF20';
    const wb: XLSX.WorkBook = { SheetNames: ['calcoli'], Sheets: { calcoli: ws } };
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new File([buf], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

describe('importFromExcel — peso finito e pezzi prodotti', () => {
    const db = [makeIng('farina test')];

    it('legge il peso finito da AF13 quando presente', async () => {
        const file = buildWorkbook({ finishedWeight: 450, pz1: 2 });
        const data = await importFromExcel(file, db);
        expect(data.finishedWeight).toBe(450);
    });

    it('finishedWeight è undefined se AF13 è assente o zero', async () => {
        const file = buildWorkbook({ pz1: 2 });
        const data = await importFromExcel(file, db);
        expect(data.finishedWeight).toBeUndefined();
    });

    it('legge i pezzi prodotti (pzUV) del componente da L12', async () => {
        const file = buildWorkbook({ finishedWeight: 450, pz1: 4.5 });
        const data = await importFromExcel(file, db);
        expect(data.groups[0].pzUV).toBe(4.5);
    });

    it('pzUV è undefined se la cella "Per N° Pz" è assente', async () => {
        const file = buildWorkbook({ finishedWeight: 450 });
        const data = await importFromExcel(file, db);
        expect(data.groups[0].pzUV).toBeUndefined();
    });
});
