const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';

try {
    const workbook = XLSX.readFile(excelPath, { cellFormula: false });
    const sheets = ['database', 'ricette', 'calcoli', 't. UE'];

    sheets.forEach(name => {
        const ws = workbook.Sheets[name];
        if (!ws) {
            console.log(`Sheet "${name}" not found.`);
            return;
        }
        console.log(`\n--- Sheet: ${name} (First 30 rows, first 40 cols) ---`);
        // Convert to CSV for compact viewing
        const csv = XLSX.utils.sheet_to_csv(ws, {
            FS: '|',
            RS: '\n',
            strip: true,
            blankrows: false
        });
        const lines = csv.split('\n');
        lines.slice(0, 30).forEach((line, i) => {
            console.log(`${i}: ${line.split('|').slice(0, 40).join('|')}`);
        });
    });

} catch (e) {
    console.error('Error:', e.message);
}
