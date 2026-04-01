const XLSX = require('xlsx');
const EXCEL_PATH = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';

const wb = XLSX.readFile(EXCEL_PATH, { cellFormula: true, sheetStubs: true });
const ws = wb.Sheets['calcoli'];

const range = XLSX.utils.decode_range(ws['!ref']);
const data = [];

// Inspect rows that likely contain calculation logic (e.g., row 9 where ingredients might start)
// Based on raw data, row 8 (index 7) has headers like 0,0,0...
for (let r = 0; r <= 50; r++) {
    const row = [];
    for (let c = 0; c <= 20; c++) { // Just first 20 columns
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        row.push(cell ? (cell.f ? '=' + cell.f : cell.v) : null);
    }
    data.push(row);
}

console.log(JSON.stringify(data, null, 2));
