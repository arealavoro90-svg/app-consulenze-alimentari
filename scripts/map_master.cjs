const XLSX = require('/Users/novanta/Desktop/APP/App_prova/node_modules/xlsx');
const f = '26-crema di erba cipollina.xlsx';
const wb = XLSX.readFile('/Users/novanta/Desktop/faraone-23-02-26/calcolo valori nutrizionali/' + f);
const db = wb.Sheets['database'];
const data = XLSX.utils.sheet_to_json(db, { header: 1 });

const h1 = data[2] || [];
const h2 = data[3] || [];

console.log('Mapping for ' + f);
for (let i = 4; i < Math.min(h1.length, 60); i++) {
    console.log(`${i}: [${h1[i] || ''}] / [${h2[i] || ''}]`);
}

console.log('\nData Sample (Row 11):');
console.log(JSON.stringify(data[10] ? data[10].slice(4, 30) : []));
