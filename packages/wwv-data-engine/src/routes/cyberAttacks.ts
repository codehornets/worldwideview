import { fastify } from '../server';
import { getLiveSnapshot } from '../redis';

// Cyber attacks are Redis-only (no SQLite table) — live data only
fastify.get('/data/cyber_attacks', async (request, reply) => {
  const liveData = await getLiveSnapshot('cyber_attacks');
  if (liveData) {
    return { items: Object.values(liveData) };
  }
  return { items: [] };
});
