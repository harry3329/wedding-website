const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'assets/descriptions.csv');
const descPath = path.join(__dirname, 'assets/descriptions.json');

if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split(/\r?\n/);
    
    let descriptions = {};
    if (fs.existsSync(descPath)) {
        descriptions = JSON.parse(fs.readFileSync(descPath, 'utf8'));
    }

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        
        // Match standard CSV escaping
        let match = line.match(/^"([^"]+)","(.*)"$/);
        if (match) {
            let key = match[1];
            let val = match[2].replace(/""/g, '"');
            descriptions[key] = val;
        } else {
            let parts = line.split(',');
            if (parts.length >= 2) {
                let key = parts[0].replace(/^"|"$/g, '');
                let val = parts.slice(1).join(',').replace(/^"|"$/g, '');
                descriptions[key] = val;
            }
        }
    }
    
    fs.writeFileSync(descPath, JSON.stringify(descriptions, null, 2), 'utf8');
    console.log('✅ CSV imported to descriptions.json');
} else {
    console.error('❌ descriptions.csv not found');
}
