import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

import Fastify from 'fastify';
import { prisma } from './prisma';
import { startScheduler } from './scheduler';
import { seederStatus } from './scheduler';

// Boot Fastify
export const fastify = Fastify({
  logger: false // Keep it clean for the console
});

import fastifyWebsocket from '@fastify/websocket';
import fastifyRateLimit from '@fastify/rate-limit';
import { handleConnection } from './websocket';

fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

fastify.register(fastifyWebsocket);

fastify.register(async function (fastify) {
  // @ts-ignore - RouteShorthandOptions augmentation missing for websocket in strict mode
  fastify.get('/stream', { websocket: true }, (connection: any, req) => {
    handleConnection(connection, req);
  });
});

const PORT = parseInt(process.env.PORT || '5001', 10);

fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    engine: 'wwv-data-engine',
    timestamp: Date.now(),
    seeders: seederStatus
  };
});

async function start() {
  try {
    // 1. Initialize Prisma Database (Supabase)
    try {
      await prisma.$connect();
    } catch (dbErr) {
      console.error('[Server] Prisma could not connect. Supabase historical data sync disabled.', dbErr instanceof Error ? dbErr.message : String(dbErr));
    }

    // 1.5. Initialize Local SQLite (Fallback/Secondary History)
    const { initDB } = await import('./db.js');
    initDB();

    // 2. Register Routes
    await import('./routes/index.js');

    // 3. Start the Fastify API Server
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Server] WWV Data Engine listening on port ${PORT}`);

    // 4. Import seeder registry (this registers them)
    await import('./seeders/index.js');

    // 5. Start the Cron Scheduler
    startScheduler();

  } catch (err) {
    console.error('[Server] Fatal error during startup:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n[Server] ${signal} received. Shutting down...`);
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();
