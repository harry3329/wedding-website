const fs = require('fs');
const path = require('path');

const ASSETS_BASE = 'assets';
const DESC_PATH = path.join(__dirname, ASSETS_BASE, 'descriptions.json');
const CSV_PATH = path.join(__dirname, ASSETS_BASE, 'descriptions.csv');

const CONFIG = {
    childhoodGroom: 'origins/harry',
    childhoodBride: 'origins/ihsin',
    travelTaiwan: 'island/taiwan',
    travelJapan: 'island/japan',
    travelPhilippines: 'island/philippines',
    music: 'music',
    dating: 'daily',
    promise: 'promise/photo',
    beauty: 'beauty',
    hiking: 'forests'
};

const PREFIXES = {
    childhoodGroom: 'harry',
    childhoodBride: 'ihsin',
    travelTaiwan: 'tw',
    travelJapan: 'jp',
    travelPhilippines: 'ph',
    music: 'music',
    dating: 'daily',
    promise: 'promise',
    beauty: 'beauty',
    hiking: 'forest'
};

// 1. Deep Flatten
let descriptions = {};
if (fs.existsSync(DESC_PATH)) {
    try { descriptions = JSON.parse(fs.readFileSync(DESC_PATH, 'utf8')); } catch(e){}
}
const newDesc = {};
const orderMapping = Object.values(PREFIXES);

Object.entries(CONFIG).forEach(([type, dir]) => {
    const fullDir = path.join(__dirname, ASSETS_BASE, dir);
    if (!fs.existsSync(fullDir)) return;
    
    let prefix = PREFIXES[type];
    const files = fs.readdirSync(fullDir).filter(f => f.toLowerCase().endsWith('.webp'));
    
    const parsed = files.map(f => {
        let base = path.basename(f, '.webp');
        let m = base.match(new RegExp(`^${prefix}_(\\d+)(?:-(\\d+))?`));
        return {
            origFile: f,
            origBase: base,
            baseNum: m ? parseInt(m[1], 10) : 9999,
            subNum: (m && m[2]) ? parseInt(m[2], 10) : 0
        };
    });

    parsed.sort((a,b) => {
        if(a.baseNum !== b.baseNum) return a.baseNum - b.baseNum;
        if(a.subNum !== b.subNum) return a.subNum - b.subNum;
        return a.origBase.localeCompare(b.origBase);
    });

    let n = 1;
    parsed.forEach(item => {
        let newBase = `${prefix}_${String(n).padStart(2, '0')}`;
        let tmpFile = path.join(fullDir, `tmp__${newBase}.webp`);
        fs.renameSync(path.join(fullDir, item.origFile), tmpFile);
        newDesc[newBase] = descriptions[item.origBase] || "";
        n++;
    });

    for (let i = 1; i < n; i++) {
        let finalBase = `${prefix}_${String(i).padStart(2, '0')}`;
        let tmpFile = path.join(fullDir, `tmp__${finalBase}.webp`);
        let finalFile = path.join(fullDir, `${finalBase}.webp`);
        if (fs.existsSync(tmpFile)) fs.renameSync(tmpFile, finalFile);
    }
});

const keys = Object.keys(newDesc);
keys.sort((a,b) => {
    let aPrefix = a.split('_')[0];
    let bPrefix = b.split('_')[0];
    let aIdx = orderMapping.indexOf(aPrefix);
    if(aPrefix === 'forests') aIdx = orderMapping.indexOf('forest');
    let bIdx = orderMapping.indexOf(bPrefix);
    if(bPrefix === 'forests') bIdx = orderMapping.indexOf('forest');
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
});

const finalSortedDesc = {};
keys.forEach(k => finalSortedDesc[k] = newDesc[k]);
fs.writeFileSync(DESC_PATH, JSON.stringify(finalSortedDesc, null, 2), 'utf8');

// 2. Export CSV
let csvContent = '\uFEFF照片編號,照片圖說 (填寫於此)\n';
for(const [key, value] of Object.entries(finalSortedDesc)) {
    let safeValue = value.replace(/"/g, '""');
    csvContent += `"${key}","${safeValue}"\n`;
}
fs.writeFileSync(CSV_PATH, csvContent, 'utf8');
console.log('✅ Pipeline Complete: Flattened assets, built JSON, and exported CSV.');
