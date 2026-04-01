const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const MARKDOWN_FILE = `C:\\Users\\silve\\.gemini\\antigravity\\brain\\8b64723d-7114-4ba2-ac06-99218b554b0e\\.system_generated\\steps\\5\\content.md`;
const DB_PATH = `C:\\dev\\worldwideview\\packages\\wwv-plugin-iranwarlive\\backend\\data\\history.db`;

const FALLBACKS = {
  "Dahiyeh": { lat: 33.842, lon: 35.503 },
  "Beqaa Valley": { lat: 33.91, lon: 36.14 },
  "Yazd Missile Base": { lat: 31.897, lon: 54.356 },
  "Kuwait": { lat: 29.3759, lon: 47.9774 }, // Added broadly just in case
  "Prince Sultan Air Base": { lat: 24.066, lon: 47.582 }, // Already works but good to have
  "Mubarak Al-Kabeer Port": { lat: 29.933, lon: 48.166 },
};

async function geocode(locationText) {
  // Try to match a known fallback
  for (const [key, coords] of Object.entries(FALLBACKS)) {
    if (locationText.toLowerCase().includes(key.toLowerCase())) {
        return coords;
    }
  }

  // Very rudimentary location extraction (first word sequence before ';' or 'and')
  // We actually extract a location from the headline
  let targetLoc = locationText;
  
  // Try Nominatim API
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(targetLoc)}&format=json&limit=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'WorldwideView-TestBot/1.0' } });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.error(`Error geocoding ${targetLoc}:`, e.message);
  }
  return null;
}

// Helper to extract a plausible location string from the headline
function extractLocation(headline) {
    // If we see specific keywords, hardcode the return or rely on FALLBACKS
    if (headline.includes("Dahiyeh")) return "Dahiyeh";
    if (headline.includes("Beqaa Valley")) return "Beqaa Valley";
    if (headline.includes("Yazd Missile Base")) return "Yazd Missile Base";
    if (headline.includes("Prince Sultan Air Base")) return "Prince Sultan Air Base";
    if (headline.includes("Mubarak Al-Kabeer")) return "Mubarak Al-Kabeer Port";
    if (headline.includes("Arak")) return "Arak, Iran";
    if (headline.includes("Ardakan")) return "Ardakan, Iran";
    if (headline.includes("Isfahan")) return "Isfahan, Iran";
    if (headline.includes("Parchin")) return "Parchin, Iran";
    if (headline.includes("Beirut")) return "Beirut, Lebanon";
    if (headline.includes("Tel Aviv")) return "Tel Aviv, Israel";
    if (headline.includes("Tehran")) return "Tehran, Iran";
    if (headline.includes("Al-Tanf")) return "Al-Tanf, Syria";
    if (headline.includes("Diego Garcia")) return "Diego Garcia";
    if (headline.includes("Hormuz")) return "Strait of Hormuz";
    if (headline.includes("Natanz")) return "Natanz, Iran";
    if (headline.includes("Awali River")) return "Awali River, Lebanon";
    
    // Default fallback to Iran if unspecified in the headline but clearly an Iranian strike
    return "Iran";
}

async function run() {
    const markdown = fs.readFileSync(MARKDOWN_FILE, 'utf-8');
    
    // Regex to match the markdown blocks
    // Format:
    // [DAY 30
    //
    // MAR 27, 2026
    // Headline
    // On March 27...](https...)
    
    // We'll split by "[DAY "
    const blocks = markdown.split("[DAY ");
    const events = [];
    
    for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const match = block.match(/^(\d+)[\s\S]*?([A-Z]{3} \d+, 2026)\s+([^\n]+)\s+([\s\S]*?)\]\((https:[^\)]+)\)/);
        if (match) {
            events.push({
                dayIndex: match[1].trim(),
                dateStr: match[2].trim(), // e.g., "MAR 27, 2026"
                headline: match[3].trim(),
                summary: match[4].trim(),
                link: match[5].trim()
            });
        }
    }
    
    console.log(`Successfully parsed ${events.length} historical events.`);
    
    if (events.length === 0) {
        console.error("No events found in markdown!");
        return;
    }
    
    // Seed DB
    let db;
    try {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.exec(`
          CREATE TABLE IF NOT EXISTS iranwar_events (
            event_id TEXT PRIMARY KEY,
            payload JSON NOT NULL,
            timestamp TEXT NOT NULL
          )
        `);
    } catch (e) {
        console.error("Could not open DB:", e);
        return;
    }
    const insertEvent = db.prepare('INSERT OR IGNORE INTO iranwar_events (event_id, payload, timestamp) VALUES (@event_id, @payload, @timestamp)');

    let insertedCount = 0;

    for (const event of events) {
        // Geocode
        const locString = extractLocation(event.headline);
        await new Promise(r => setTimeout(r, 1100)); // Rate limit
        const coords = await geocode(locString);
        
        let type = "Missile Strike";
        if (event.headline.includes("Airstrike") || event.headline.toLowerCase().includes("struck")) type = "Air Strike";
        if (event.headline.includes("GroundForces") || event.headline.toLowerCase().includes("combat")) type = "Ground Combat";
        
        const timestamp = new Date(event.dateStr).toISOString();
        const eventId = `IRW-HIST-DAY${event.dayIndex}`;
        
        const payload = {
            event_id: eventId,
            type: type,
            location: locString,
            timestamp: timestamp,
            confidence: "OSINT Verification",
            event_summary: event.summary,
            source_url: event.link,
            _osint_meta: {
                casualties: 0,
                coordinates: coords ? { lat: coords.lat, lng: coords.lon } : null
            }
        };
        
        insertEvent.run({
            event_id: eventId,
            payload: JSON.stringify(payload),
            timestamp: timestamp
        });
        insertedCount++;
        console.log(`Injected Day ${event.dayIndex} (${locString}) -> ${coords ? `[${coords.lat}, ${coords.lon}]` : 'NO COORDS'}`);
    }
    
    console.log(`Done! Injected ${insertedCount} historical records into history.db`);
}

run();
