const fs = require('fs');
const path = require('path');

const descPath = path.join(__dirname, 'assets/descriptions.json');
const csvPath = path.join(__dirname, 'assets/descriptions.csv');

if (!fs.existsSync(descPath)) {
    console.error('❌ descriptions.json not found');
    process.exit(1);
}

let descriptions = JSON.parse(fs.readFileSync(descPath, 'utf8'));

// The user shifted:
// old 26 -> new 28
// old 25 -> new 26
// new 25 and 27 are empty

descriptions['ihsin_28'] = descriptions['ihsin_26'] || '';
descriptions['ihsin_27'] = '';
descriptions['ihsin_26'] = descriptions['ihsin_25'] || '';
descriptions['ihsin_25'] = '';

fs.writeFileSync(descPath, JSON.stringify(descriptions, null, 2), 'utf8');
console.log('✅ descriptions.json shifted successfully for ihsin 25-28');

// Also update CSV to reflect the changes cleanly
let newCsv = '\uFEFF照片編號,照片圖說 (填寫於此)\n';
for(const [k, v] of Object.entries(descriptions)) {
    let safeV = String(v).replace(/"/g, '""');
    newCsv += `"${k}","${safeV}"\n`;
}
fs.writeFileSync(csvPath, newCsv, 'utf8');
console.log('✅ descriptions.csv rewritten correctly');
