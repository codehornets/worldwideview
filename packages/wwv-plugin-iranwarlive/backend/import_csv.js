/**
 * import_csv.js – Import Events.csv into history.db using locationMapping.json
 *
 * Usage: node import_csv.js
 */
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const CSV_PATH = path.resolve(__dirname, "../../../artifacts/Events.csv");
const LOC_MAP_PATH = path.resolve(
  __dirname,
  "../../../artifacts/locationMapping.json"
);
const DB_PATH = path.join(__dirname, "data", "history.db");

/* ── Load location mapping ─────────────────────────────────────── */
const locationMap = JSON.parse(fs.readFileSync(LOC_MAP_PATH, "utf-8"));

/* ── Parse CSV (no header row) ─────────────────────────────────── */
function parseCSV(raw) {
  const rows = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const fields = splitCSVLine(trimmed);
    if (fields.length < 11) continue;
    rows.push({
      time: fields[0],
      date: fields[1],
      eventType: fields[2],
      location: fields[3],
      casualties: parseInt(fields[4], 10) || 0,
      sourceUrl: fields[5],
      title: fields[6],
      description: fields[7],
      eventId: fields[8],
      day: fields[9],
      recapUrl: fields[10],
    });
  }
  return rows;
}

/** Split a CSV line respecting quoted fields */
function splitCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/* ── Build ISO timestamp from CSV date + time ────────────────── */
function buildTimestamp(dateStr, timeStr) {
  // dateStr = "28-Mar-26", timeStr = "02:00Z"
  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const [day, mon, yr] = dateStr.split("-");
  const fullYear = 2000 + parseInt(yr, 10);
  const [hh, mm] = timeStr.replace("Z", "").split(":");
  const d = new Date(
    Date.UTC(fullYear, months[mon], parseInt(day, 10),
    parseInt(hh, 10), parseInt(mm, 10))
  );
  return d.toISOString();
}

/* ── Main ────────────────────────────────────────────────────── */
function main() {
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const events = parseCSV(raw);
  console.log(`Parsed ${events.length} events from CSV.`);

  // Ensure data dir
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS iranwar_events (
      event_id TEXT PRIMARY KEY,
      payload JSON NOT NULL,
      timestamp TEXT NOT NULL
    )
  `);

  const insert = db.prepare(
    "INSERT OR REPLACE INTO iranwar_events (event_id, payload, timestamp) " +
    "VALUES (@event_id, @payload, @timestamp)"
  );

  const tx = db.transaction((rows) => {
    let ok = 0;
    let noCoords = 0;
    for (const row of rows) {
      const loc = locationMap[row.location];
      const coords =
        loc && loc.lat != null ? { lat: loc.lat, lng: loc.lon } : null;

      if (!coords) {
        noCoords++;
        console.warn(`  ⚠ No coords for "${row.location}"`);
      }

      const ts = buildTimestamp(row.date, row.time);

      const payload = {
        event_id: row.eventId,
        type: row.eventType,
        location: row.location,
        timestamp: ts,
        confidence: "OSINT Verification",
        event_summary: row.description,
        source_url: row.sourceUrl,
        preview_image: null,
        day_label: row.day,
        recap_url: row.recapUrl,
        title: row.title,
        _osint_meta: {
          casualties: row.casualties,
          coordinates: coords,
        },
      };

      insert.run({
        event_id: row.eventId,
        payload: JSON.stringify(payload),
        timestamp: ts,
      });
      ok++;
    }
    return { ok, noCoords };
  });

  const result = tx(events);
  db.close();

  console.log(`\n─── Done ───`);
  console.log(`Inserted/updated: ${result.ok}`);
  console.log(`Missing coords:   ${result.noCoords}`);
}

main();
