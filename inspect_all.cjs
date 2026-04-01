const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';

try {
    const workbook = XLSX.readFile(excelPath, { cellFormula: true });
    const sheets = ['database', 'ricette', 'calcoli', 't. UE'];
    const results = {};

    sheets.forEach(name => {
        const ws = workbook.Sheets[name];
        if (!ws) {
            results[name] = "Not found";
            return;
        }
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });
        results[name] = json.slice(0, 100); // Take first 100 rows for analysis
    });

    fs.writeFileSync('inspection_results.json', JSON.stringify(results, null, 2));
    console.log('Results saved to inspection_results.json');

} catch (e) {
    console.error('Error:', e.message);
}
