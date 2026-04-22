const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'assets/descriptions.csv');
const descPath = path.join(__dirname, 'assets/descriptions.json');
const musicDir = path.join(__dirname, 'assets/music');

if (!fs.existsSync(csvPath)) {
    console.error('❌ descriptions.csv not found');
    process.exit(1);
}

// 1. Read CSV string
const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split(/\r?\n/);
let musicItems = [];

// 2. Parse CSV
for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    let key, val;
    let match = line.match(/^"([^"]+)","(.*)"$/);
    if (match) {
        key = match[1];
        val = match[2].replace(/""/g, '"');
    } else {
        let parts = line.split(',');
        if (parts.length >= 2) {
            key = parts[0].replace(/^"|"$/g, '');
            val = parts.slice(1).join(',').replace(/^"|"$/g, '');
        }
    }
    
    if (key && key.startsWith('music_')) {
        musicItems.push({ oldKey: key, text: val });
    }
}

// 3. Sort music items by text (which naturally sorts by Year since they start with 20XX), then by oldKey
musicItems.sort((a, b) => {
    let textCmp = a.text.localeCompare(b.text);
    if (textCmp !== 0) return textCmp;
    return a.oldKey.localeCompare(b.oldKey, undefined, {numeric: true});
});

console.log('--- Sorted Music Groupings ---');
musicItems.forEach((m, idx) => {
    m.newKey = `music_${String(idx + 1).padStart(2, '0')}`;
    console.log(`${m.oldKey} -> ${m.newKey} : ${m.text}`);
});

// 4. Physical Rename (Tmp stage to avoid overwrite conflicts)
musicItems.forEach(m => {
    let oldFile = path.join(musicDir, `${m.oldKey}.webp`);
    let tmpFile = path.join(musicDir, `tmp_${m.newKey}.webp`);
    if (fs.existsSync(oldFile)) {
        fs.renameSync(oldFile, tmpFile);
    }
});

// Rename Tmp to Final
musicItems.forEach(m => {
    let tmpFile = path.join(musicDir, `tmp_${m.newKey}.webp`);
    let finalFile = path.join(musicDir, `${m.newKey}.webp`);
    if (fs.existsSync(tmpFile)) {
        fs.renameSync(tmpFile, finalFile);
    }
});

// 5. Build New JSON & CSV
let descriptions = {};
if (fs.existsSync(descPath)) {
    descriptions = JSON.parse(fs.readFileSync(descPath, 'utf8'));
}

// Full parsing of CSV again just to retain non-music items
let fullItems = [];
for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    let key, val;
    let match = line.match(/^"([^"]+)","(.*)"$/);
    if (match) {
        key = match[1];
        val = match[2].replace(/""/g, '"');
    } else {
        let parts = line.split(',');
        if (parts.length >= 2) {
            key = parts[0].replace(/^"|"$/g, '');
            val = parts.slice(1).join(',').replace(/^"|"$/g, '');
        }
    }
    if (key) fullItems.push({ key, text: val });
}

// Replace music keys with new layout in fullItems
let updatedDesc = {};
fullItems.forEach(item => {
    if (item.key.startsWith('music_')) {
        // Will handle music separately
    } else {
        updatedDesc[item.key] = item.text;
    }
});

// Insert music at its original block (after ph, before daily)
// Let's just follow the typical order
const PREFIXES = ['harry', 'ihsin', 'tw', 'jp', 'ph', 'music', 'daily', 'promise', 'beauty', 'forest'];
const sortedKeys = Object.keys(updatedDesc).concat(musicItems.map(m => m.newKey));
sortedKeys.sort((a,b) => {
    let aPrefix = a.split('_')[0];
    let bPrefix = b.split('_')[0];
    if(aPrefix==='forests') aPrefix='forest';
    if(bPrefix==='forests') bPrefix='forest';
    
    let aIdx = PREFIXES.indexOf(aPrefix);
    let bIdx = PREFIXES.indexOf(bPrefix);
    if(aIdx !== bIdx) return aIdx - bIdx;
    
    return a.localeCompare(b, undefined, {numeric: true});
});

let finalDescObject = {};
sortedKeys.forEach(k => {
    if (k.startsWith('music_')) {
        let matched = musicItems.find(m => m.newKey === k);
        finalDescObject[k] = matched ? matched.text : "";
    } else {
        finalDescObject[k] = updatedDesc[k] || descriptions[k] || "";
    }
});

fs.writeFileSync(descPath, JSON.stringify(finalDescObject, null, 2), 'utf8');

// Write new CSV
let newCsv = '\uFEFF照片編號,照片圖說 (填寫於此)\n';
for(const [k, v] of Object.entries(finalDescObject)) {
    let safeV = v.replace(/"/g, '""');
    newCsv += `"${k}","${safeV}"\n`;
}
fs.writeFileSync(csvPath, newCsv, 'utf8');

console.log('✅ Music photos grouped, renamed, and descriptions synchronized successfully!');
