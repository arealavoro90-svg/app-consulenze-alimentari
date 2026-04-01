import { readFile, writeFileSync } from 'fs';
import { join } from 'path';

// This script will read the TS files and create a JS version to run validation
const tsFile = '/Users/novanta/Desktop/APP/App_prova/src/data/ingredientsDB.ts';
const jsFile = '/Users/novanta/Desktop/APP/App_prova/scripts/ingredientsDB.js';

readFile(tsFile, 'utf8', (err, data) => {
    if (err) throw err;
    // Strip type definitions
    const jsData = data
        .replace(': IngredientDB[]', '')
        .replace('export interface IngredientDB {', '/*')
        .replace('}', '*/')
        .replace('export function searchIngredients', 'function searchIngredients');
    writeFileSync(jsFile, jsData);
    console.log('Converted ingredientsDB to JS');
});
