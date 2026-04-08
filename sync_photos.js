const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, 'index.html');
const ASSETS_BASE = 'assets';

/**
 * [說明] 這個腳本會掃描 assets 下的各個資料夾，
 * 並將找到的 .webp 檔案路徑自動寫入 index.html 的 USER_PHOTOS 物件中。
 * 排序規則：優先按檔名倒序排列（讓新照片在前）。
 */

const CONFIG = {
    childhoodGroom: 'origins',
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

function getWebPFiles(dir) {
    const fullDir = path.join(__dirname, ASSETS_BASE, dir);
    if (!fs.existsSync(fullDir)) {
        console.warn(`⚠️  警告: 找不到資料夾 ${fullDir}`);
        return [];
    }
    
    return fs.readdirSync(fullDir)
        .filter(f => {
            const ext = path.extname(f).toLowerCase();
            const isFile = fs.statSync(path.join(fullDir, f)).isFile();
            return isFile && ext === '.webp';
        })
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })) 
        .map(f => `assets/${dir}/${f}`);
}

try {
    let indexContent = fs.readFileSync(INDEX_PATH, 'utf8');

    // 1. 生成新的 USER_PHOTOS 物件字串
    let newPhotosObj = 'const USER_PHOTOS = {\n';
    const entries = Object.entries(CONFIG);
    
    entries.forEach(([key, dir], idx) => {
        const files = getWebPFiles(dir);
        // 特殊處理：如果有特定的排序需求可以在此加入邏輯
        const isLast = idx === entries.length - 1;
        newPhotosObj += `             ${key}: ${JSON.stringify(files)}${isLast ? '' : ','}\n`;
    });
    
    // 補上 promiseVideos (手動保留，因為通常不常變動)
    // 如果您希望影片也自動化，可以仿照上面的邏輯
    const promiseVideos = ["assets/promise/video/promise_01.mp4","assets/promise/video/promise_02.mp4"];
    newPhotosObj = newPhotosObj.replace('hiking:', `promiseVideos: ${JSON.stringify(promiseVideos)},\n             hiking:`);
    
    newPhotosObj += '        };';

    // 2. 定義替換範圍 (從 USER_PHOTOS 開始到結束)
    const startMarker = 'const USER_PHOTOS = {';
    const endMarker = '};';
    const startIdx = indexContent.indexOf(startMarker);
    
    // 尋找對應的收尾大括號 (這裡用比較簡單的 index 查找，前提是 USER_PHOTOS 內部沒有巢狀物件)
    const endIdx = indexContent.indexOf(endMarker, startIdx);

    if (startIdx !== -1 && endIdx !== -1) {
        const finalEndIdx = endIdx + 2; 
        const updatedContent = indexContent.substring(0, startIdx) + newPhotosObj + indexContent.substring(finalEndIdx);
        
        fs.writeFileSync(INDEX_PATH, updatedContent, 'utf8');
        console.log('✨ 恭喜！index.html 照片清單已順利同步更新。');
        console.log(`📊 統計：共更新了 ${entries.length} 個類別清單。`);
    } else {
        console.error('❌ 錯誤：在 index.html 中找不到 USER_PHOTOS 定義區塊。');
    }

} catch (err) {
    console.error('❌ 執行失敗:', err.message);
}
