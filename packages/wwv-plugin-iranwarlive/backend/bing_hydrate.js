/**
 * bing_hydrate.js – Hydrate events with real news links and images via Bing RSS
 * 
 * Usage: node bing_hydrate.js
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data', 'history.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const FALLBACK_TYPES = new Set(['POSTURING', 'INTERCEPTION', 'AIRSPACE CLOSED']);

// Utility sleep
const sleep = ms => new Promise(res => setTimeout(res, ms));

async function fetchArticleHtml(url) {
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WorldWideView-Hydrator/1.0" }
        });
        if (!res.ok) return null;
        return await res.text();
    } catch (e) {
        return null;
    }
}

async function scrapeOgImage(html) {
    if (!html) return null;
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) 
                 || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    return ogMatch ? ogMatch[1] : null;
}

async function bingNewsSearch(query) {
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`;
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WorldWideView-Hydrator/1.0" }
        });
        if (!res.ok) return null;
        
        const xml = await res.text();
        // Super simple regex to extract the first <item><link>
        const itemMatch = xml.match(/<item>[\s\S]*?<link>(.*?)<\/link>/i);
        if (itemMatch && itemMatch[1]) {
            let encodedUrl = itemMatch[1].trim().replace(/&amp;/g, '&');
            // Extract &url=... from the apiclick URL
            const urlMatch = encodedUrl.match(/[?&]url=([^&]+)/i);
            if (urlMatch && urlMatch[1]) {
                return decodeURIComponent(urlMatch[1]);
            }
            return encodedUrl; // Fallback to whatever was there
        }
        return null;
    } catch (e) {
        console.error("  ⚠ Bing Search Error:", e.message);
        return null;
    }
}

async function main() {
    const getEvents = db.prepare("SELECT event_id, payload FROM iranwar_events");
    const updateEvent = db.prepare("UPDATE iranwar_events SET payload = ? WHERE event_id = ?");
    
    const rows = getEvents.all();
    console.log(`Found ${rows.length} events to process.`);
    
    let updatedCount = 0;
    
    for (const row of rows) {
        let payload = JSON.parse(row.payload);
        
        // Skip events that didn't come from the simulation CSV (live polled events)
        if (!payload.day_label && !payload.recap_url) continue;
        
        const typeUpper = (payload.type || "").toUpperCase();
        
        // 1. NON-SEARCHABLE EVENTS: Fallback to recap URL
        if (FALLBACK_TYPES.has(typeUpper)) {
            // Only update if it points to google search
            if (payload.source_url && payload.source_url.includes('google.com/search')) {
                payload.source_url = payload.recap_url;
                updateEvent.run(JSON.stringify(payload), row.event_id);
                updatedCount++;
                // console.log(`[FALLBACK] ${payload.event_id} -> ${payload.source_url}`);
            }
            continue;
        }
        
        // 2. SEARCHABLE EVENTS: Query Bing
        if (payload.source_url && payload.source_url.includes('google.com/search') && payload.title) {
            // Genericize query for fictional simulation to find plausible images
            const queryLocation = payload.location_string || 'Middle East';
            const searchQuery = `${payload.type || 'Strike'} ${queryLocation} Iran Israel conflict`;
            console.log(`[SEARCH] Querying Bing for: "${searchQuery}" (Original: ${payload.title})`);
            
            // Wait 500ms to avoid Bing rate limits
            await sleep(500);
            const articleUrl = await bingNewsSearch(searchQuery);
            
            if (articleUrl) {
                console.log(`  ✓ Found Article: ${articleUrl.substring(0, 60)}...`);
                payload.source_url = articleUrl;
                
                // Now attempt to scrape the og:image
                await sleep(500); // polite delay for the target site
                const html = await fetchArticleHtml(articleUrl);
                const imageUrl = await scrapeOgImage(html);
                
                if (imageUrl) {
                    payload.preview_image = imageUrl;
                    console.log(`  ✓ Found Image: ${imageUrl.substring(0, 60)}...`);
                } else {
                    console.log(`  ⚠ No og:image found on article page.`);
                }
                
                updateEvent.run(JSON.stringify(payload), row.event_id);
                updatedCount++;
            } else {
                // If search fails, fallback to recap URL
                payload.source_url = payload.recap_url;
                updateEvent.run(JSON.stringify(payload), row.event_id);
                updatedCount++;
                console.log(`  ⚠ No search results. Falling back to recap URL.`);
            }
        }
    }
    
    console.log(`\n─── Done ───`);
    console.log(`Successfully updated ${updatedCount} events in history.db.`);
}

main().catch(console.error);
