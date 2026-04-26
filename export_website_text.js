const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'assets/website_text.json');
const csvPath = path.join(__dirname, 'assets/website_text.csv');

if (!fs.existsSync(jsonPath)) {
    console.error('❌ website_text.json not found');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let csv = '\uFEFF區塊與欄位 (勿改),文字內容 (可修改)\n';

for (const section in data) {
    if (typeof data[section] === 'object') {
        for (const key in data[section]) {
            let val = String(data[section][key]).replace(/"/g, '""');
            csv += `"${section}.${key}","${val}"\n`;
        }
    }
}

fs.writeFileSync(csvPath, csv, 'utf8');
console.log('✅ Exported website_text.json to website_text.csv successfully!');
