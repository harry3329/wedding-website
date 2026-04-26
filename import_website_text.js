const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'assets/website_text.json');
const csvPath = path.join(__dirname, 'assets/website_text.csv');

if (!fs.existsSync(csvPath)) {
    console.error('❌ website_text.csv not found');
    process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split(/\r?\n/);

let data = {};
if (fs.existsSync(jsonPath)) {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    let match = line.match(/^"([^"]+)","(.*)"$/);
    if (!match) continue;
    
    let fullKey = match[1];
    let val = match[2].replace(/""/g, '"');
    
    let parts = fullKey.split('.');
    if (parts.length >= 2) {
        let section = parts[0];
        let key = parts.slice(1).join('.');
        if (!data[section]) data[section] = {};
        data[section][key] = val;
    }
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log('✅ Imported website_text.csv deeply back into website_text.json successfully!');
