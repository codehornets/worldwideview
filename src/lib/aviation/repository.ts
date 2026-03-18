import { prisma } from "../db";

const CHUNK_SIZE = 500;

/**
 * Fetch the latest batch of aviation history records from the local database.
 * Returns data in the same shape as the old Supabase fallback.
 */
export async function getLatestFromDb() {
    try {
        const latest = await prisma.aviationHistory.findFirst({
            select: { timestamp: true },
            orderBy: { timestamp: "desc" },
        });

        if (!latest) return null;

        const records = await prisma.aviationHistory.findMany({
            where: { timestamp: latest.timestamp },
        });

        if (records.length === 0) return null;

        const states = records.map((r: { icao24: string; callsign: string | null; timestamp: Date; longitude: number; latitude: number; altitude: number | null; speed: number | null; heading: number | null }) => [
            r.icao24, r.callsign, null,
            Math.floor(r.timestamp.getTime() / 1000),
            Math.floor(r.timestamp.getTime() / 1000),
            r.longitude, r.latitude, r.altitude,
            r.altitude === null || r.altitude <= 0,
            r.speed, r.heading, null, null, r.altitude, null, false, 0,
        ]);

        return {
            states,
            time: Math.floor(latest.timestamp.getTime() / 1000),
            _source: "db",
            _isFallback: true,
        };
    } catch (e) {
        console.error("[Aviation DB] Fallback error:", e);
        return null;
    }
}

/**
 * Record a batch of aviation states to the local database.
 */
export async function recordToDb(states: any[], timeSecs: number) {
    const timestamp = new Date(timeSecs * 1000);

    const records = states
        .filter((s: any) => s[5] !== null && s[6] !== null)
        .map((s: any) => ({
            timestamp,
            icao24: s[0],
            callsign: s[1]?.trim() || null,
            longitude: s[5],
            latitude: s[6],
            altitude: s[7],
            speed: s[9],
            heading: s[10],
        }));

    if (records.length === 0) return;

    let successCount = 0;

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        try {
            await prisma.aviationHistory.createMany({
                data: chunk,
            });
            successCount += chunk.length;
        } catch (error: any) {
            // Unique constraint violations are expected for duplicate records
            if (error?.code === "P2002") {
                console.warn("[Aviation DB] Skipped duplicate records in chunk");
            } else {
                console.error("[Aviation DB] Failed to insert chunk:", error);
            }
        }
    }

    console.log(`[Aviation DB] Recorded ${successCount}/${records.length} states.`);
}

/**
 * Get the time range of available aviation history data.
 */
export async function getAvailabilityRange() {
    const min = await prisma.aviationHistory.findFirst({
        select: { timestamp: true },
        orderBy: { timestamp: "asc" },
    });

    const max = await prisma.aviationHistory.findFirst({
        select: { timestamp: true },
        orderBy: { timestamp: "desc" },
    });

    if (!min || !max) return [];

    return [{
        start: min.timestamp.getTime(),
        end: max.timestamp.getTime(),
    }];
}

/**
 * Get aviation history records closest to a target time.
 */
export async function getHistoryAtTime(targetTimeMs: number) {
    const targetDate = new Date(targetTimeMs);

    const closest = await prisma.aviationHistory.findFirst({
        select: { timestamp: true },
        where: { timestamp: { lte: targetDate } },
        orderBy: { timestamp: "desc" },
    });

    if (!closest) return { records: [], recordTime: null };

    const records = await prisma.aviationHistory.findMany({
        where: { timestamp: closest.timestamp },
        select: {
            icao24: true, timestamp: true, latitude: true,
            longitude: true, altitude: true, heading: true,
            speed: true, callsign: true,
        },
    });

    return {
        records,
        recordTime: closest.timestamp.getTime(),
    };
}
