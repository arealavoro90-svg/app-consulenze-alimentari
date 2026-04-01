const XLSX = require('/Users/novanta/Desktop/APP/App_prova/node_modules/xlsx');
const fs = require('fs');
const path = require('path');

const dir = '/Users/novanta/Desktop/faraone-23-02-26/calcolo valori nutrizionali/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

files.forEach(f => {
    try {
        const wb = XLSX.readFile(path.join(dir, f));
        if (!wb.SheetNames.includes('database')) return;

        const db = wb.Sheets['database'];
        const data = XLSX.utils.sheet_to_json(db, { header: 1 });

        let count = 0;
        let headerRow = -1;
        let nameCol = -1;

        // Try to find the header row (contains "INGREDIENTI" or "DESCRIZIONE")
        for (let i = 0; i < 20; i++) {
            if (!data[i]) continue;
            const idx = data[i].findIndex(cell => cell && (cell.toString().includes('INGREDIENTI') || cell.toString().includes('DESCRIZIONE')));
            if (idx !== -1) {
                headerRow = i;
                nameCol = idx;
                break;
            }
        }

        if (headerRow !== -1) {
            for (let i = headerRow + 1; i < data.length; i++) {
                if (data[i] && data[i][nameCol] && data[i][nameCol].toString().trim().length > 0) {
                    count++;
                }
            }
        }

        console.log(`${f}: ~${count} ingredients (Header row ${headerRow + 1}, Col ${nameCol})`);
    } catch (e) {
        console.log(`Error reading ${f}: ${e.message}`);
    }
});
