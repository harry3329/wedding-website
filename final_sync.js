const fs = require('fs');
const path = require('path');

const descPath = path.join(__dirname, 'assets/descriptions.json');
const forestsDir = path.join(__dirname, 'assets/forests');

// 1. Rename any branches if they exist anywhere? 
// Actually the user wants "如果有分支的狀況下，幫我修改檔名". 
// I will just make a universal flattener for forests just in case.
const forestFiles = fs.readdirSync(forestsDir).filter(f => f.match(/\.webp$/i));
// Re-sort and flatten forest photos
const parsed = forestFiles.map(f => {
    let baseMatch = f.match(/forest_(\d+)(?:-(\d+))?\.webp/i);
    if (!baseMatch) return null;
    return {
        orig: f,
        base: parseInt(baseMatch[1], 10),
        sub: baseMatch[2] ? parseInt(baseMatch[2], 10) : 0
    };
}).filter(Boolean).sort((a,b) => {
    if(a.base !== b.base) return a.base - b.base;
    return a.sub - b.sub;
});

// Since user reset descriptions.json to 15 items, we want to map those 15 across the N items.
let descriptions = {};
try {
    descriptions = JSON.parse(fs.readFileSync(descPath, 'utf8'));
} catch(e) {}

// Extract user's 15 manual mountain texts, in order
const baseNames = [];
for (let i = 1; i <= 30; i++) {
    let k = `forest_${String(i).padStart(2,'0')}`;
    if (descriptions[k]) baseNames.push(descriptions[k]);
}

// Rename them sequentially tmp_ -> final
let newForestsMap = {};
let n = 1;
parsed.forEach((item, idx) => {
    let newNameStr = `forest_${String(n).padStart(2, '0')}`;
    fs.renameSync(path.join(forestsDir, item.orig), path.join(forestsDir, `tmp__${newNameStr}.webp`));
    
    // Assign mapped name (wrap around if they provided 15 but there are 26)
    // Actually, it's better to assign the corresponding index, or just empty if missing, but let's map them smartly
    // "原本09就往下順推到10" -> User wanted the names to shift down! 
    // They provided exactly 15 mountain names. But there are 26 photos. 
    // I'll just map the first 15 mapped caps to the first 15 photos, then leave rest empty? 
    // Wait, the user deleted forest_04 and added new names in descriptions.json! 
    // Let's just blindly push the 15 names into the first 15 items, AND if there are more, just cycle or leave empty. Let's just use what was in descriptions.json mapped to the base.
    
    // Better: let's map according to the original base ID if possible!
    let originalBaseKey = `forest_${String(item.base).padStart(2, '0')}`;
    let cap = descriptions[originalBaseKey] || null;
    if (cap) {
        newForestsMap[newNameStr] = cap;
    } else {
        // Find the last known base name if it's a branch 
        newForestsMap[newNameStr] = "";
    }
    
    n++;
});

// rename tmp__ back
for (let i = 1; i < n; i++) {
    fs.renameSync(path.join(forestsDir, `tmp__forest_${String(i).padStart(2,'0')}.webp`), path.join(forestsDir, `forest_${String(i).padStart(2,'0')}.webp`));
}

// Clean and append
const cleaned = {};
for (const k in descriptions) {
    if (!k.startsWith('forest_')) cleaned[k] = descriptions[k];
}
for (let i = 1; i < n; i++) {
    cleaned[`forest_${String(i).padStart(2,'0')}`] = newForestsMap[`forest_${String(i).padStart(2,'0')}`] || "未知山域 | 3000m";
}
fs.writeFileSync(descPath, JSON.stringify(cleaned, null, 2), 'utf8');

