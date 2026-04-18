const fs = require('fs');
const path = require('path');

const ASSETS_BASE = 'assets';
const DESC_PATH = path.join(__dirname, ASSETS_BASE, 'descriptions.json');

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

function getWebPFiles(dirSuffix) {
    const dir = path.join(__dirname, ASSETS_BASE, dirSuffix);
    if (!fs.existsSync(dir)) return [];
    
    // Sort logic to naturally sort numbers (e.g. 02 vs 02-2)
    return fs.readdirSync(dir)
        .filter(f => f.toLowerCase().endsWith('.webp'))
        .sort((a,b) => {
            const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
            const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
            if (numA !== numB) return numA - numB;
            return a.localeCompare(b);
        })
        .map(f => path.basename(f, '.webp'));
}

let descriptions = {};
if (fs.existsSync(DESC_PATH)) {
    try {
        descriptions = JSON.parse(fs.readFileSync(DESC_PATH, 'utf8'));
    } catch(e){}
}

const newDesc = {};
Object.entries(CONFIG).forEach(([type, dir]) => {
    const bases = getWebPFiles(dir);
    bases.forEach(base => {
        newDesc[base] = descriptions[base] || "";
    });
});

fs.writeFileSync(DESC_PATH, JSON.stringify(newDesc, null, 2), 'utf8');
console.log("✅ 成功重新生成 descriptions.json ，總共欄位數: " + Object.keys(newDesc).length);
