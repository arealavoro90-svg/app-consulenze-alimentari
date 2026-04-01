const xlsx = require('xlsx');
const path = require('path');

const EXCEL_PATH = '/Users/novanta/Desktop/PRODOTTI DIGITALI/Programma tabelle valori nutrizionali/Programma tabelle valori nutrizionali.xlsx';
const SHEET_NAME = 'database';
const START_ROW = 10; // 0-indexed, corrisponde alla riga 11 dell'Excel

// Mappatura Colonne
const COL_DESC = 4; // E
const COL_KCAL = 283;
const COL_KJ = 284;
const COL_FAT = 288;
const COL_CARBS = 294;
const COL_PROTEIN = 304;
const COL_SALT = 305;
const COL_FIBER = 302;

function scanDatabase() {
    try {
        const workbook = xlsx.readFile(EXCEL_PATH);
        const sheet = workbook.Sheets[SHEET_NAME];
        if (!sheet) {
            console.error(`Errore: Foglio "${SHEET_NAME}" non trovato.`);
            return;
        }

        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });
        const errors = [];

        console.log(`--- SCANSIONE DATABASE INGREDIENTI (Sheet: ${SHEET_NAME}) ---`);
        console.log(`Inizio scansione dalla riga ${START_ROW + 1}...\n`);

        for (let i = START_ROW; i < data.length; i++) {
            const row = data[i];
            const name = row[COL_DESC];

            // Salta righe vuote o senza nome
            if (!name || (typeof name === 'string' && name.trim() === '')) continue;

            const missingFields = [];
            const invalidFields = [];

            const fields = [
                { name: 'kcal', val: row[COL_KCAL], col: 'KCAL (283)' },
                { name: 'kj', val: row[COL_KJ], col: 'KJ (284)' },
                { name: 'grassi', val: row[COL_FAT], col: 'GRASSI (288)' },
                { name: 'carboidrati', val: row[COL_CARBS], col: 'CARBOIDRATI (294)' },
                { name: 'proteine', val: row[COL_PROTEIN], col: 'PROTEINE (304)' }
            ];

            fields.forEach(f => {
                if (f.val === null || f.val === undefined || f.val === '') {
                    missingFields.push(f.col);
                } else if (isNaN(parseFloat(f.val))) {
                    invalidFields.push(`${f.col} [Valore: ${f.val}]`);
                }
            });

            if (missingFields.length > 0 || invalidFields.length > 0) {
                errors.push({
                    row: i + 1,
                    name: name,
                    missing: missingFields,
                    invalid: invalidFields
                });
            }
        }

        if (errors.length === 0) {
            console.log('✅ Nessun errore critico trovato nel database.');
        } else {
            console.log(`❌ Trovate ${errors.length} righe con potenziali errori:\n`);
            errors.forEach(e => {
                console.log(`Riga ${e.row}: "${e.name}"`);
                if (e.missing.length > 0) console.log(`   - MANCANTI: ${e.missing.join(', ')}`);
                if (e.invalid.length > 0) console.log(`   - VALORI NON VALIDI: ${e.invalid.join(', ')}`);
                console.log('---');
            });
        }

    } catch (err) {
        console.error('Errore durante la scansione:', err.message);
    }
}

scanDatabase();
