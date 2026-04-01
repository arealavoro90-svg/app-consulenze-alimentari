const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';

try {
    const workbook = XLSX.readFile(excelPath, { cellFormula: false });
    const sheets = ['database', 'ricette', 'calcoli'];

    sheets.forEach(name => {
        const ws = workbook.Sheets[name];
        if (!ws) return;

        console.log(`\n--- Sheet: ${name} (Rows with non-zero numeric data) ---`);
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });

        let count = 0;
        for (let i = 0; i < json.length && count < 10; i++) {
            const row = json[i];
            // Look for numbers that are not 0 and not empty
            const hasData = row.some(c => typeof c === 'number' && c !== 0);
            if (hasData) {
                // Find column index of first non-zero number
                const firstDataIdx = row.findIndex(c => typeof c === 'number' && c !== 0);
                console.log(`R${i} (Col ${firstDataIdx}+): ${row.slice(firstDataIdx, firstDataIdx + 20).join('|')}`);
                count++;
            }
        }
    });

} catch (e) {
    console.error('Error:', e.message);
}
