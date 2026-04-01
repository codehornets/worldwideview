const Database = require('better-sqlite3');
const db = new Database('./data/history.db');
const rows = db.prepare('SELECT payload FROM iranwar_events ORDER BY timestamp ASC').all();
rows.forEach(r => {
    const p = JSON.parse(r.payload);
    console.log(p.event_id + ' | ' + (p.location || 'N/A') + ' | ' + (p.source_url || 'NO_URL') + ' | img:' + (p.preview_image ? 'YES' : 'NO'));
});
console.log('Total:', rows.length);
