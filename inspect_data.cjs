const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';

try {
    const workbook = XLSX.readFile(excelPath, { cellFormula: false });
    const sheets = ['ricette', 'calcoli', 't. UE'];

    sheets.forEach(name => {
        const ws = workbook.Sheets[name];
        if (!ws) {
            console.log(`Sheet "${name}" not found.`);
            return;
        }
        console.log(`\n--- Sheet: ${name} (Actual Data Rows) ---`);
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });

        let count = 0;
        for (let i = 0; i < json.length && count < 20; i++) {
            const row = json[i];
            // Filter: must have at least one non-empty cell that is not in the first few columns
            if (row && row.some((c, idx) => idx > 3 && c !== '')) {
                console.log(`R${i}: ${row.slice(0, 30).join('|')}`);
                count++;
            }
        }
    });

} catch (e) {
    console.error('Error:', e.message);
}
