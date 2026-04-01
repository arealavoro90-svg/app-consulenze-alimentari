const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';

try {
    const workbook = XLSX.readFile(excelPath, { cellFormula: false });
    const sheetName = 't. UE';
    const ws = workbook.Sheets[sheetName];
    if (!ws) {
        console.log(`Sheet "${sheetName}" not found.`);
    } else {
        console.log(`\n--- Sheet: ${sheetName} (Non-zero data) ---`);
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });

        for (let i = 0; i < json.length; i++) {
            const row = json[i];
            if (row.some(c => typeof c === 'number' && c !== 0)) {
                console.log(`R${i}: ${row.slice(0, 15).join('|')}`);
            }
        }
    }

} catch (e) {
    console.error('Error:', e.message);
}
