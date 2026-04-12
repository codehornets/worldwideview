import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') });

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function checkAviation() {
    console.log('Checking Aviation Live Snapshot...');
    const data = await redis.get('live_snapshot_aviation');
    if (!data) {
        console.log('No aviation snapshot found in Redis.');
        process.exit(1);
    }

    const snapshot = JSON.parse(data);
    const aircraft = Object.values(snapshot);
    if (aircraft.length === 0) {
        console.log('Snapshot is empty.');
    } else {
        const first = aircraft[0];
        console.log(`Found ${aircraft.length} aircraft.`);
        console.log(`Last updated: ${new Date(first.last_updated).toLocaleString()}`);
        console.log(`Current time: ${new Date().toLocaleString()}`);
        
        const diffSec = (Date.now() - first.last_updated) / 1000;
        console.log(`Data age: ${diffSec.toFixed(2)} seconds`);
        
        if (diffSec < 10) {
            console.log('✅ Polling verified: Data is fresh (under 10s).');
        } else {
            console.log('❌ Polling stall: Data is stale.');
        }
    }
    process.exit(0);
}

checkAviation().catch(err => {
    console.error(err);
    process.exit(1);
});
