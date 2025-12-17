const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Optimized HTTP agents with connection pooling
const httpsAgent = new https.Agent({ 
    rejectUnauthorized: false,
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 30000
});

const httpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 30000
});

// Fast axios client with short timeouts for checking
const fastClient = axios.create({
    httpsAgent,
    httpAgent,
    timeout: 8000,
    maxRedirects: 5
});

// Download client with longer timeout
const downloadClient = axios.create({
    httpsAgent,
    httpAgent,
    timeout: 300000, // 5 min for large files
    maxRedirects: 10
});

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Extract package ID from URL
function extractPackageId(url) {
    const match = url.match(/[?&]id=([a-zA-Z0-9._]+)/);
    return match ? match[1] : null;
}

// Check if input is a URL or app name
function isPlayStoreUrl(input) {
    return input.includes('play.google.com') || input.includes('id=');
}

// Search Play Store by app name
async function searchPlayStore(query) {
    try {
        console.log(`\n🔍 Searching Play Store for: ${query}`);
        
        // Use Google Play search
        const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps&hl=en`;
        const resp = await fastClient.get(searchUrl, {
            headers: { 'User-Agent': UA },
            timeout: 8000
        });
        
        const $ = cheerio.load(resp.data);
        const results = [];
        
        // Find app links in search results
        $('a[href*="/store/apps/details?id="]').each((i, el) => {
            if (i >= 5) return false;
            const href = $(el).attr('href') || '';
            const match = href.match(/id=([a-zA-Z0-9._]+)/);
            if (match && !results.find(r => r.packageId === match[1])) {
                results.push({
                    packageId: match[1],
                    url: `https://play.google.com/store/apps/details?id=${match[1]}`
                });
            }
        });
        
        if (results.length > 0) {
            console.log(`  ✓ Found ${results.length} apps, using: ${results[0].packageId}`);
            return results[0];
        }
        
        console.log(`  ✗ No apps found`);
        return null;
    } catch (e) {
        console.log(`  ✗ Search error: ${e.message}`);
        return null;
    }
}

// Get app info (fast, with timeout)
async function getAppInfo(packageId) {
    try {
        const response = await fastClient.get(`https://play.google.com/store/apps/details?id=${packageId}&hl=en`, {
            headers: { 'User-Agent': UA },
            timeout: 5000
        });
        const $ = cheerio.load(response.data);
        let name = $('h1 span').first().text() || packageId;
        let icon = '';
        $('img').each((i, el) => {
            const src = $(el).attr('src') || '';
            if (src.includes('play-lh.googleusercontent.com')) {
                icon = src.split('=')[0] + '=w240-h240-rw';
                return false;
            }
        });
        return { name: name.trim(), packageId, icon };
    } catch (e) {
        return { name: packageId, packageId, icon: '' };
    }
}

// FAST: Direct CDN check (fastest method)
async function tryDirectCDN(packageId) {
    const cdns = [
        `https://d.cdnpure.com/b/APK/${packageId}?version=latest`,
        `https://d.apkpure.com/b/APK/${packageId}?version=latest`,
    ];
    
    // Check all CDNs in parallel
    const checks = cdns.map(async (url) => {
        try {
            const resp = await fastClient.head(url, {
                headers: { 'User-Agent': UA, 'Referer': 'https://apkpure.com/' },
                timeout: 5000,
                validateStatus: s => s < 400
            });
            if (resp.status < 400) return { url, source: 'APKPure CDN' };
        } catch (e) {}
        return null;
    });
    
    const results = await Promise.all(checks);
    return results.find(r => r !== null) || null;
}

// Check APKCombo (backup)
async function tryApkCombo(packageId) {
    try {
        const searchUrl = `https://apkcombo.com/search/${encodeURIComponent(packageId)}/`;
        const resp = await fastClient.get(searchUrl, {
            headers: { 'User-Agent': UA },
            timeout: 6000
        });
        
        const $ = cheerio.load(resp.data);
        let appLink = null;
        
        $('a').each((i, el) => {
            const href = $(el).attr('href') || '';
            if (href.includes(packageId.split('.').pop())) {
                appLink = href;
                return false;
            }
        });
        
        if (appLink) {
            if (!appLink.startsWith('http')) appLink = `https://apkcombo.com${appLink}`;
            return { url: `${appLink}download/apk`, source: 'APKCombo' };
        }
    } catch (e) {}
    return null;
}

// Check APKMirror (backup)
async function tryApkMirror(packageId) {
    try {
        const url = `https://www.apkmirror.com/?post_type=app_release&searchtype=app&s=${encodeURIComponent(packageId)}`;
        const resp = await fastClient.get(url, {
            headers: { 'User-Agent': UA },
            timeout: 6000
        });
        
        const $ = cheerio.load(resp.data);
        const link = $('.appRow a.fontBlack').first().attr('href');
        
        if (link) {
            return { url: `https://www.apkmirror.com${link}`, source: 'APKMirror' };
        }
    } catch (e) {}
    return null;
}

// ============= MOD APK SOURCES =============

// Check if title matches the app we're looking for
function isRelevantResult(title, appName, packageId) {
    if (!title) return false;
    const t = title.toLowerCase();
    const app = (appName || '').toLowerCase();
    const pkg = (packageId || '').toLowerCase();
    
    // Check if title contains key words from app name
    const appWords = app.split(/[\s:,.-]+/).filter(w => w.length > 2);
    const matchCount = appWords.filter(w => t.includes(w)).length;
    
    // Need at least 1 matching word, or package name match
    return matchCount >= 1 || t.includes(pkg.split('.').pop());
}

// Search a mod site and return results
async function searchModSite(config, appName, packageId) {
    try {
        const query = encodeURIComponent(appName || packageId);
        const url = config.searchUrl.replace('{query}', query).replace('{pkg}', packageId);
        
        const resp = await fastClient.get(url, {
            headers: { 
                'User-Agent': UA,
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': config.baseUrl
            },
            timeout: 10000
        });
        
        const $ = cheerio.load(resp.data);
        const results = [];
        
        $(config.selectors.item).each((i, el) => {
            if (i >= 3) return false;
            const $el = $(el);
            
            let title = '';
            for (const sel of config.selectors.title) {
                title = $el.find(sel).first().text().trim();
                if (title) break;
            }
            
            let link = $el.find('a').first().attr('href') || '';
            if (link && !link.startsWith('http')) {
                link = config.baseUrl + (link.startsWith('/') ? '' : '/') + link;
            }
            
            // Only include if relevant to the app
            if (title && link && isRelevantResult(title, appName, packageId)) {
                results.push({
                    siteName: config.name,
                    siteIcon: config.icon,
                    title: title.substring(0, 60),
                    url: link
                });
            }
        });
        
        return results.length > 0 ? results[0] : null; // Return best match
    } catch (e) {
        // Silently fail - return fallback
        return null;
    }
}

// Get mod APK from all sources
async function getModApkLinks(packageId, appName) {
    console.log(`\n🔓 Searching mods for: ${appName || packageId}`);
    
    const query = encodeURIComponent(appName || packageId);
    
    // Mod site configurations
    const modSites = [
        {
            name: 'HappyMod',
            icon: '😊',
            baseUrl: 'https://happymod.com',
            searchUrl: 'https://happymod.com/search.html?q={query}',
            selectors: { item: '.plist-app-box, .app-item, article', title: ['.plist-app-title', 'h3', '.title', 'a'] }
        },
        {
            name: 'ModYolo',
            icon: '🎮',
            baseUrl: 'https://modyolo.com',
            searchUrl: 'https://modyolo.com/?s={query}',
            selectors: { item: 'article, .post', title: ['h2 a', 'h3 a', '.entry-title a', 'h2', 'h3'] }
        },
        {
            name: 'LiteAPKs',
            icon: '⚡',
            baseUrl: 'https://liteapks.com',
            searchUrl: 'https://liteapks.com/?s={query}',
            selectors: { item: 'article, .post', title: ['.entry-title a', 'h2 a', 'h3 a', 'h2', 'h3'] }
        },
        {
            name: 'AN1',
            icon: '🔥',
            baseUrl: 'https://an1.com',
            searchUrl: 'https://an1.com/search/?q={query}',
            selectors: { item: '.shortstory, article, .item', title: ['h2 a', '.title a', 'h3 a', 'h2', 'h3'] }
        },
        {
            name: 'APKDone',
            icon: '✅',
            baseUrl: 'https://apkdone.com',
            searchUrl: 'https://apkdone.com/?s={query}',
            selectors: { item: 'article, .post', title: ['.entry-title a', 'h2 a', 'h2', 'h3'] }
        },
        {
            name: 'APKMody',
            icon: '🎯',
            baseUrl: 'https://apkmody.io',
            searchUrl: 'https://apkmody.io/?s={query}',
            selectors: { item: 'article, .post', title: ['.entry-title a', 'h2 a', 'h2', 'h3'] }
        }
    ];
    
    // Search all sites in parallel
    const searches = modSites.map(site => searchModSite(site, appName, packageId));
    const results = await Promise.all(searches);
    
    // Build final results with fallback URLs
    const finalResults = modSites.map((site, i) => {
        const found = results[i];
        if (found) {
            console.log(`  ✓ ${site.name}: ${found.title}`);
            return {
                name: site.name,
                icon: site.icon,
                title: found.title,
                url: found.url,
                found: true
            };
        } else {
            // Fallback to search URL
            return {
                name: site.name,
                icon: site.icon,
                title: `Search on ${site.name}`,
                url: site.searchUrl.replace('{query}', query).replace('{pkg}', packageId),
                found: false
            };
        }
    });
    
    const foundCount = finalResults.filter(r => r.found).length;
    console.log(`  Found on ${foundCount}/${modSites.length} sites`);
    
    return {
        appName: appName || packageId,
        sites: finalResults
    };
}

// Main APK finder - PARALLEL checking for speed
async function getApkDownloadUrl(packageId) {
    console.log(`\n⚡ Fast searching: ${packageId}`);
    
    // Try CDN first (fastest)
    const cdnResult = await tryDirectCDN(packageId);
    if (cdnResult) {
        console.log(`  ✓ CDN hit!`);
        return cdnResult;
    }
    
    // Try backup sources in parallel
    console.log(`  → Checking backup sources...`);
    const [comboResult, mirrorResult] = await Promise.all([
        tryApkCombo(packageId),
        tryApkMirror(packageId)
    ]);
    
    if (comboResult) {
        console.log(`  ✓ APKCombo`);
        return comboResult;
    }
    if (mirrorResult) {
        console.log(`  ✓ APKMirror`);
        return mirrorResult;
    }
    
    console.log(`  ✗ Not found`);
    return null;
}

// API endpoint - accepts both app name and Play Store URL
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || !url.trim()) return res.status(400).json({ error: 'Please enter an app name or Play Store URL' });
        
        const input = url.trim();
        let packageId;
        
        // Check if it's a URL or app name
        if (isPlayStoreUrl(input)) {
            packageId = extractPackageId(input);
            if (!packageId) return res.status(400).json({ error: 'Invalid Play Store URL' });
        } else {
            // It's an app name - search Play Store
            const searchResult = await searchPlayStore(input);
            if (!searchResult) {
                return res.status(404).json({ 
                    error: `Could not find "${input}" on Play Store. Try a different name.`
                });
            }
            packageId = searchResult.packageId;
        }
        
        // Get app info and download URL in parallel
        const [appInfo, downloadInfo] = await Promise.all([
            getAppInfo(packageId),
            getApkDownloadUrl(packageId)
        ]);
        
        // Add Play Store URL to response
        appInfo.playStoreUrl = `https://play.google.com/store/apps/details?id=${packageId}`;
        
        // Get mod APK results (searches mod sites)
        const modInfo = await getModApkLinks(packageId, appInfo.name);
        
        if (!downloadInfo) {
            return res.status(404).json({ 
                error: 'APK not found. Try a more popular app.',
                appInfo,
                modInfo
            });
        }
        
        res.json({ ...appInfo, downloadUrl: downloadInfo.url, source: downloadInfo.source, modInfo });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// FAST download proxy with streaming
app.get('/api/download-apk', async (req, res) => {
    try {
        const { url, name, packageId } = req.query;
        if (!url) return res.status(400).json({ error: 'URL required' });
        
        let currentUrl = decodeURIComponent(url);
        const filename = `${(name || packageId || 'app').replace(/[^a-zA-Z0-9.-]/g, '_')}.apk`;
        
        console.log(`\n📥 Downloading: ${filename}`);
        
        for (let i = 0; i < 8; i++) {
            try {
                const resp = await downloadClient({
                    method: 'GET',
                    url: currentUrl,
                    headers: {
                        'User-Agent': UA,
                        'Accept': '*/*',
                        'Accept-Encoding': 'identity', // No compression for faster streaming
                        'Referer': new URL(currentUrl).origin + '/',
                        'Connection': 'keep-alive'
                    },
                    responseType: 'stream',
                    maxRedirects: 5
                });
                
                const ct = resp.headers['content-type'] || '';
                const cl = resp.headers['content-length'];
                
                // APK file - stream directly
                if (ct.includes('android') || ct.includes('octet-stream') || 
                    (ct.includes('application') && !ct.includes('html') && cl > 100000)) {
                    
                    console.log(`  ✓ Streaming ${Math.round((cl||0)/1024/1024)}MB`);
                    
                    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                    res.setHeader('Cache-Control', 'no-cache');
                    if (cl) res.setHeader('Content-Length', cl);
                    
                    // Direct pipe with error handling
                    resp.data.pipe(res);
                    
                    resp.data.on('error', (err) => {
                        console.error('Stream error:', err.message);
                        if (!res.headersSent) res.status(500).end();
                    });
                    
                    return;
                }
                
                // HTML page - quick parse
                if (ct.includes('html')) {
                    const chunks = [];
                    let size = 0;
                    for await (const c of resp.data) {
                        chunks.push(c);
                        size += c.length;
                        if (size > 500000) break; // Only read first 500KB
                    }
                    resp.data.destroy?.();
                    
                    const html = Buffer.concat(chunks).toString();
                    const $ = cheerio.load(html);
                    
                    let next = null;
                    
                    // Quick pattern matching
                    if (currentUrl.includes('apkmirror')) {
                        next = $('a.accent_bg').attr('href') ||
                               $('a[href*="download.php"]').attr('href');
                    } else if (currentUrl.includes('apkcombo')) {
                        next = $('a[href*="/download/"]').filter((i,e) => {
                            const h = $(e).attr('href') || '';
                            return h.includes('/apk') && !h.includes('xapk');
                        }).first().attr('href') ||
                        $('ul.file-list a').first().attr('href');
                    }
                    
                    // Generic APK link
                    if (!next) {
                        $('a').each((i, e) => {
                            const h = $(e).attr('href') || '';
                            if (h.match(/\.apk($|\?)/i) && !h.includes('xapk')) {
                                next = h;
                                return false;
                            }
                        });
                    }
                    
                    if (!next) {
                        next = $('a.download-button, a.download-btn, a[download]').first().attr('href');
                    }
                    
                    if (next) {
                        if (!next.startsWith('http')) {
                            const u = new URL(currentUrl);
                            next = next.startsWith('/') ? `${u.protocol}//${u.host}${next}` : `${u.protocol}//${u.host}/${next}`;
                        }
                        currentUrl = next;
                        continue;
                    }
                    
                    return res.status(500).json({ error: 'Download link not found' });
                }
                
                resp.data.destroy?.();
                return res.status(500).json({ error: `Unexpected: ${ct}` });
                
            } catch (err) {
                console.log(`  Retry ${i+1}: ${err.message}`);
                if (i >= 7) throw err;
            }
        }
        
        res.status(500).json({ error: 'Too many redirects' });
    } catch (e) {
        console.error('Error:', e.message);
        if (!res.headersSent) res.status(500).json({ error: e.message });
    }
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
    console.log(`\n🚀 APK Downloader (Fast) - http://localhost:${PORT}\n`);
});
