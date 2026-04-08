const fs = require('fs');
const path = require('path');
const sharp = require('sharp'); // 確保已安裝 sharp

const INDEX_PATH = path.join(__dirname, 'index.html');
const ASSETS_BASE = 'assets';

/**
 * [說明] 這個腳本會執行兩件事：
 * 1. 掃描 assets 下的原始照片 (jpg, png, heic)，自動轉檔為 WebP 並修復方向。
 * 2. 掃描 assets 下的所有 .webp 檔案路徑，並更新到 index.html 的 USER_PHOTOS 物件。
 */

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

const EXTS = ['.jpg', '.jpeg', '.png', '.heic'];

async function processOriginals() {
    console.log('🔍 正在檢查是否有原始照片需要轉檔...');
    let convertedCount = 0;

    for (const [key, dir] of Object.entries(CONFIG)) {
        const fullDir = path.join(__dirname, ASSETS_BASE, dir);
        if (!fs.existsSync(fullDir)) continue;

        // 掃描主資料夾與 possible 'new' 子資料夾
        const subDirs = ['', 'new'];
        for (const sub of subDirs) {
            const scanDir = path.join(fullDir, sub);
            if (!fs.existsSync(scanDir)) continue;

            const files = fs.readdirSync(scanDir);
            for (const file of files) {
                const ext = path.extname(file).toLowerCase();
                if (EXTS.includes(ext)) {
                    const inputPath = path.join(scanDir, file);
                    // 轉檔後的 webp 統一放回主資料夾
                    const outputPath = path.join(fullDir, path.basename(file, ext) + '.webp');

                    try {
                        await sharp(inputPath)
                            .rotate()
                            .webp({ quality: 85 })
                            .toFile(outputPath);
                        
                        fs.unlinkSync(inputPath); 
                        console.log(`✅ 已轉檔: ${file} -> ${path.basename(outputPath)}`);
                        convertedCount++;
                    } catch (err) {
                        console.error(`❌ 轉檔失敗 (${file}):`, err.message);
                    }
                }
            }
        }
    }
    if (convertedCount > 0) console.log(`🎉 轉檔完成，共處理 ${convertedCount} 張照片。`);
    else console.log('✨ 沒有發現需要處理的原始照片。');
}

function getWebPFiles(dir) {
    const fullDir = path.join(__dirname, ASSETS_BASE, dir);
    if (!fs.existsSync(fullDir)) return [];
    
    return fs.readdirSync(fullDir)
        .filter(f => {
            const ext = path.extname(f).toLowerCase();
            const filePath = path.join(fullDir, f);
            return fs.statSync(filePath).isFile() && ext === '.webp';
        })
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })) 
        .map(f => `assets/${dir}/${f}`);
}

async function main() {
    try {
        // 第一階段：轉檔
        await processOriginals();

        // 第二階段：更新 index.html
        let indexContent = fs.readFileSync(INDEX_PATH, 'utf8');
        let newPhotosObj = 'const USER_PHOTOS = {\n';
        const entries = Object.entries(CONFIG);
        
        entries.forEach(([key, dir], idx) => {
            const files = getWebPFiles(dir);
            const isLast = idx === entries.length - 1;
            newPhotosObj += `             ${key}: ${JSON.stringify(files)}${isLast ? '' : ','}\n`;
        });
        
        // 保留影片
        const promiseVideos = ["assets/promise/video/promise_01.mp4","assets/promise/video/promise_02.mp4"];
        newPhotosObj = newPhotosObj.replace('hiking:', `promiseVideos: ${JSON.stringify(promiseVideos)},\n             hiking:`);
        newPhotosObj += '        };';

        const startMarker = 'const USER_PHOTOS = {';
        const endMarker = '};';
        const startIdx = indexContent.indexOf(startMarker);
        const endIdx = indexContent.indexOf(endMarker, startIdx);

        if (startIdx !== -1 && endIdx !== -1) {
            const finalEndIdx = endIdx + 2; 
            const updatedContent = indexContent.substring(0, startIdx) + newPhotosObj + indexContent.substring(finalEndIdx);
            fs.writeFileSync(INDEX_PATH, updatedContent, 'utf8');
            console.log('✨ 網頁清單已同步更新！');
        } else {
            console.error('❌ 找不到 USER_PHOTOS 區塊。');
        }
    } catch (err) {
        console.error('❌ 執行失敗:', err.message);
    }
}

main();
