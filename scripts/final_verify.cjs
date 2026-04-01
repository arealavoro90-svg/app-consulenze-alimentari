const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';
const dbPath = '/Users/novanta/Desktop/APP/App_prova/src/data/ingredientsDB.ts';

try {
    const workbook = XLSX.readFile(excelPath, { cellFormula: false, raw: true });
    const ws = workbook.Sheets['database'];
    const excelData = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });

    const dbContent = fs.readFileSync(dbPath, 'utf8');

    console.log('--- FINAL VERIFICATION: Excel vs Code Mapping ---');

    // Test a few specific ingredients that had decimals in my previous inspection
    // R34: aceto balsamico di modena 34% di zuccheri (was row 34 in my previous grep, let's find it by name)
    const testNames = [
        'acqua',
        'acciughe in olio di oliva',
        'aceto balsamico di modena 34% di zuccheri'
    ];

    testNames.forEach(name => {
        const excelRow = excelData.find(r => r[4] && String(r[4]).toLowerCase().includes(name.toLowerCase()));
        if (!excelRow) {
            console.log(`[NOT FOUND in Excel] ${name}`);
            return;
        }

        // Column 339 is Kcal (MB) in extractIngredients_new.cjs
        const excelKcal = excelRow[339];
        // Column 306 is Salt (KU)
        const excelSalt = excelRow[306];

        // Find in generated code using regex
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`nameIT:'${escapedName}',.*kcal:([0-9.]+),.*salt:([0-9.]+),`, 'i');
        const match = dbContent.match(regex);

        if (match) {
            const codeKcal = parseFloat(match[1]);
            const codeSalt = parseFloat(match[2]);

            console.log(`\nIngredient: ${name}`);
            console.log(`  Kcal: Excel=${excelKcal} | Code=${codeKcal} | ${excelKcal == codeKcal ? 'MATCH' : 'MISMATCH'}`);
            console.log(`  Salt: Excel=${excelSalt} | Code=${codeSalt} | ${excelSalt == codeSalt ? 'MATCH' : 'MISMATCH'}`);

            // Specifically check decimal presence if Excel has them
            if (String(excelSalt).includes('.') || String(excelSalt).includes(',')) {
                console.log(`  Decimal Check: Excel has decimals in Salt!`);
            }
        } else {
            console.log(`[NOT FOUND in Code] ${name}`);
        }
    });

} catch (e) {
    console.error('Error:', e.message);
}
