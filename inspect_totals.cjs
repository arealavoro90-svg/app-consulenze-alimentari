const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';

try {
    const workbook = XLSX.readFile(excelPath, { cellFormula: false });
    const ws = workbook.Sheets['calcoli'];
    if (!ws) return;

    console.log(`\n--- Sheet: calcoli (Looking for totals) ---`);
    const json = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });

    for (let i = 0; i < json.length; i++) {
        const row = json[i];
        if (row.some(c => typeof c === 'string' && (c.includes('TOTALE') || c.includes('Total')))) {
            console.log(`R${i}: ${row.slice(0, 30).join('|')}`);
            // Show a few rows after total
            for (let j = 1; j <= 5; j++) {
                if (json[i + j]) {
                    console.log(`R${i + j}: ${json[i + j].slice(0, 30).join('|')}`);
                }
            }
        }
    }

} catch (e) {
    console.error('Error:', e.message);
}
