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
const MAX_DIM = 2000;
const QUALITY = 75;

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
                    const base = file.replace(new RegExp(ext.replace('.', '\\.') + '$', 'i'), '');
                    const outputPath = path.join(fullDir, base + '.webp');

                    try {
                        await sharp(inputPath)
                            .rotate()
                            .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
                            .webp({ quality: 75 })
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

async function reoptimizeAll(dir = path.join(__dirname, ASSETS_BASE)) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            await reoptimizeAll(fullPath);
        } else if (item.toLowerCase().endsWith('.webp')) {
            try {
                const metadata = await sharp(fullPath).metadata();
                // 如果寬或高超過限制，或檔案大小大於 800KB (緩衝處理)
                const isTooBig = metadata.width > MAX_DIM || metadata.height > MAX_DIM || stat.size > 800 * 1024;
                
                if (isTooBig) {
                    const tmpPath = fullPath + '.tmp.webp';
                    await sharp(fullPath)
                        .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: QUALITY })
                        .toFile(tmpPath);
                    
                    const newStat = fs.statSync(tmpPath);
                    if (newStat.size < stat.size) {
                        fs.renameSync(tmpPath, fullPath);
                        console.log(`✨ 已優化現有照片: ${path.relative(__dirname, fullPath)} (${(stat.size/1024).toFixed(0)}KB -> ${(newStat.size/1024).toFixed(0)}KB)`);
                    } else {
                        fs.unlinkSync(tmpPath);
                    }
                }
            } catch (e) {
                console.error(`⚠️ 無法優化 ${item}:`, e.message);
            }
        }
    }
}

async function main() {
    try {
        // 第一階段：轉檔新照片
        await processOriginals();
        
        // 1.5 階段：優化現有 WebP (確保舊照片也符合新規範)
        console.log('🔄 正在檢查並優化現有 WebP 照片...');
        await reoptimizeAll();

        // 第二階段：更新 index.html
        let indexContent = fs.readFileSync(INDEX_PATH, 'utf8');
        
        // 讀取敘述檔案 (如果存在)
        const DESC_PATH = path.join(__dirname, ASSETS_BASE, 'descriptions.json');
        let descriptions = {};
        if (fs.existsSync(DESC_PATH)) {
            try {
                descriptions = JSON.parse(fs.readFileSync(DESC_PATH, 'utf8'));
                console.log('📖 已載入照片敘述對照表。');
            } catch (e) {
                console.error('⚠️ 敘述檔案格式錯誤，將使用預設標題。');
            }
        }

        let newPhotosObj = 'const USER_PHOTOS = {\n';
        const entries = Object.entries(CONFIG);
        
        entries.forEach(([key, dir], idx) => {
            const files = getWebPFiles(dir);
            // 將路徑轉為物件格式，包含敘述
            const data = files.map(src => {
                const base = path.basename(src, '.webp');
                const baseWithoutSuffix = base.replace(/-\d+$/, '');
                return {
                    src: src,
                    cap: descriptions[base] !== undefined && descriptions[base] !== "" ? descriptions[base] : 
                         (descriptions[baseWithoutSuffix] || "")
                };
            });
            const isLast = idx === entries.length - 1;
            newPhotosObj += `             ${key}: ${JSON.stringify(data)}${isLast ? '' : ','}\n`;
        });
        
        // 動態讀取影片
        const videoDir = path.join(__dirname, ASSETS_BASE, 'promise/video');
        const promiseVideos = fs.existsSync(videoDir) 
            ? fs.readdirSync(videoDir)
                .filter(f => f.toLowerCase().endsWith('.mp4'))
                .sort()
                .map(f => `assets/promise/video/${f}`)
            : [];
            
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
        // 第三階段：更新網頁文字 (新功能)
        const TEXT_PATH = path.join(__dirname, ASSETS_BASE, 'website_text.json');
        if (fs.existsSync(TEXT_PATH)) {
            try {
                const websiteText = JSON.parse(fs.readFileSync(TEXT_PATH, 'utf8'));
                // 再次讀取（或是使用更新後的內容）
                let finalContent = fs.readFileSync(INDEX_PATH, 'utf8');
                
                // 使用 Regex 尋找具有 data-content 屬性的標籤並替換其內容
                // 匹配模式: (前導標籤包含 data-content="key")(舊內容)(結束標籤)
                const updatedContent = finalContent.replace(/(<[^>]+data-content="([^"]+)"[^>]*>)([\s\S]*?)(<\/[^>]+>)/g, (match, openTag, key, oldText, closeTag) => {
                    const parts = key.split('.');
                    let val = websiteText;
                    for (const p of parts) {
                        if (val && val[p] !== undefined) val = val[p];
                        else { val = null; break; }
                    }
                    
                    if (val !== null && typeof val === 'string') {
                        return `${openTag}${val}${closeTag}`;
                    }
                    return match;
                });

                fs.writeFileSync(INDEX_PATH, updatedContent, 'utf8');
                console.log('📝 網頁文字內容已同步更新！');
            } catch (e) {
                console.error('⚠️ 網頁文字同步失敗:', e.message);
            }
        }
    } catch (err) {
        console.error('❌ 執行失敗:', err.message);
    }
}

main();
