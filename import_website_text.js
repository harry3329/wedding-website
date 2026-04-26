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
    
    let fullKey, val;
    let match = line.match(/^"([^"]+)","(.*)"$/);
    
    if (match) {
        fullKey = match[1];
        val = match[2].replace(/""/g, '"');
    } else {
        let parts = line.split(',');
        if (parts.length >= 2) {
            fullKey = parts[0].replace(/^"|"$/g, '');
            val = parts.slice(1).join(',').replace(/^"|"$/g, '');
        } else {
            continue;
        }
    }
    
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
