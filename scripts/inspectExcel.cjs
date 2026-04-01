const XLSX = require('xlsx');

const excelPath = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';

try {
    const workbook = XLSX.readFile(excelPath);

    const sheetsToInspect = ['t. AUSTRALIA', 't. CANADA verticale'];

    sheetsToInspect.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;

        console.log(`\n--- ${sheetName} STRUCTURE ---`);
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });

        // Find rows with actual table headers (usually between 40-100)
        for (let i = 40; i < 90; i++) {
            const row = data[i];
            if (!row) continue;
            // Filter empty
            if (row.slice(0, 15).some(c => c !== null && c !== '')) {
                console.log(`R${i}:`, row.slice(0, 15).map(cell => cell === null ? '-' : String(cell).substring(0, 30)));
            }
        }
    });

} catch (e) {
    console.error('Error:', e.message);
}
