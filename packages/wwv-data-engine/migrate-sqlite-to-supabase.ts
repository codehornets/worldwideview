import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const prisma = new PrismaClient();

async function main() {
    console.log('[Migration] Starting migration from local engine.db to Supabase');

    const dbPath = process.argv[2] || path.join(process.cwd(), 'data', 'engine.db');
    console.log(`[Migration] Reading from SQLite database at: ${dbPath}`);
    
    const db = new Database(dbPath, { readonly: true });

    // 1. Migrate IranwarEvent
    try {
        console.log('[Migration] Migrating iranwar_events...');
        const events = db.prepare('SELECT event_id, payload, timestamp, fetched_at FROM iranwar_events').all();
        console.log(`[Migration] Found ${events.length} iranwar_events. Iterating...`);
        let count = 0;
        for (const evt of events as any[]) {
            const parsedTs = typeof evt.timestamp === 'string' ? new Date(evt.timestamp).getTime() : (evt.timestamp || Date.now());
            await prisma.iranwarEvent.upsert({
                where: { eventId: evt.event_id },
                create: {
                    eventId: evt.event_id,
                    payload: evt.payload,
                    timestamp: BigInt(parsedTs),
                    fetchedAt: BigInt(evt.fetched_at || Date.now())
                },
                update: {
                    payload: evt.payload,
                    timestamp: BigInt(parsedTs),
                    fetchedAt: BigInt(evt.fetched_at || Date.now())
                }
            });
            count++;
        }
        console.log(`[Migration] Successfully migrated ${count} iranwar_events.`);
    } catch (e: any) {
        console.error(`[Migration] Skipped or failed iranwar_events: ${e.message}`);
    }

    // 2. Migrate Earthquake
    try {
        console.log('[Migration] Migrating earthquakes...');
        const quakes = db.prepare('SELECT id, payload, source_ts, fetched_at FROM earthquakes').all();
        console.log(`[Migration] Found ${quakes.length} earthquakes. Migrating in bulk...`);
        const qData = quakes.map((q: any) => ({
            id: String(q.id),
            payload: q.payload,
            sourceTs: BigInt(q.source_ts || Date.now()),
            fetchedAt: BigInt(q.fetched_at || Date.now())
        }));
        if (qData.length > 0) {
            await prisma.earthquake.createMany({ data: qData, skipDuplicates: true });
        }
        console.log(`[Migration] Successfully migrated earthquakes.`);
    } catch (e: any) {
        console.error(`[Migration] Skipped or failed earthquakes: ${e.message}`);
    }

    // 3. Migrate Wildfire
    try {
        console.log('[Migration] Migrating wildfires...');
        const fires = db.prepare('SELECT id, payload, source_ts, fetched_at FROM wildfires').all();
        console.log(`[Migration] Found ${fires.length} wildfires. Migrating in bulk...`);
        const fData = fires.map((f: any) => ({
            id: String(f.id),
            payload: f.payload,
            sourceTs: BigInt(f.source_ts || Date.now()),
            fetchedAt: BigInt(f.fetched_at || Date.now())
        }));
        if (fData.length > 0) {
            await prisma.wildfire.createMany({ data: fData, skipDuplicates: true });
        }
        console.log(`[Migration] Successfully migrated wildfires.`);
    } catch (e: any) {
        console.error(`[Migration] Skipped or failed wildfires: ${e.message}`);
    }

    // 4. Migrate MaritimeHistory
    try {
        console.log('[Migration] Migrating maritime_history...');
        const maritime = db.prepare('SELECT mmsi, ts, lat, lon, hdg, spd, fetched_at FROM maritime_history').all();
        console.log(`[Migration] Found ${maritime.length} maritime_history records. Migrating in bulk...`);
        
        // Chunk it in case it's huge
        const chunkSize = 5000;
        for (let i = 0; i < maritime.length; i += chunkSize) {
            const chunk = maritime.slice(i, i + chunkSize).map((x: any) => ({
                mmsi: String(x.mmsi),
                ts: BigInt(x.ts),
                lat: x.lat,
                lon: x.lon,
                heading: x.hdg,
                speed: x.spd,
                fetchedAt: BigInt(x.fetched_at || Date.now())
            }));
            await prisma.maritimeHistory.createMany({ data: chunk as any, skipDuplicates: true });
            console.log(`[Migration] Migrated ${i + chunk.length}/${maritime.length} maritime_history...`);
        }
        console.log(`[Migration] Successfully migrated maritime_history.`);
    } catch (e: any) {
        console.error(`[Migration] Skipped or failed maritime_history: ${e.message}`);
    }

    // 5. Migrate AviationHistory
    try {
        console.log('[Migration] Migrating aviation_history...');
        const aviation = db.prepare('SELECT icao24, ts, lat, lon, alt, hdg, spd, fetched_at FROM aviation_history').all();
        console.log(`[Migration] Found ${aviation.length} aviation_history records. Migrating in bulk...`);
        
        const chunkSize = 5000;
        for (let i = 0; i < aviation.length; i += chunkSize) {
            const chunk = aviation.slice(i, i + chunkSize).map((x: any) => ({
                icao24: String(x.icao24),
                ts: BigInt(x.ts),
                lat: x.lat,
                lon: x.lon,
                alt: x.alt,
                heading: x.hdg,
                speed: x.spd,
                fetchedAt: BigInt(x.fetched_at || Date.now())
            }));
            await prisma.aviationHistory.createMany({ data: chunk as any, skipDuplicates: true });
            console.log(`[Migration] Migrated ${i + chunk.length}/${aviation.length} aviation_history...`);
        }
        console.log(`[Migration] Successfully migrated aviation_history.`);
    } catch (e: any) {
        console.error(`[Migration] Skipped or failed aviation_history: ${e.message}`);
    }

    // 6. Migrate MilitaryAviationHistory
    try {
        console.log('[Migration] Migrating military_aviation_history...');
        const maviation = db.prepare('SELECT hex, ts, lat, lon, alt, hdg, spd, fetched_at FROM military_aviation_history').all();
        console.log(`[Migration] Found ${maviation.length} military_aviation_history records. Migrating in bulk...`);
        
        const chunkSize = 5000;
        for (let i = 0; i < maviation.length; i += chunkSize) {
            const chunk = maviation.slice(i, i + chunkSize).map((x: any) => ({
                hex: String(x.hex),
                ts: BigInt(x.ts),
                lat: x.lat,
                lon: x.lon,
                alt: x.alt,
                heading: x.hdg,
                speed: x.spd,
                fetchedAt: BigInt(x.fetched_at || Date.now())
            }));
            await prisma.militaryAviationHistory.createMany({ data: chunk as any, skipDuplicates: true });
            console.log(`[Migration] Migrated ${i + chunk.length}/${maviation.length} military_aviation_history...`);
        }
        console.log(`[Migration] Successfully migrated military_aviation_history.`);
    } catch (e: any) {
        console.error(`[Migration] Skipped or failed military_aviation_history: ${e.message}`);
    }

    console.log('[Migration] Completed migration from local SQLite to Supabase!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
