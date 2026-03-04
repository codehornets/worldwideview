import { NextResponse } from "next/server";

// In-memory cache
let cachedData: unknown = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds

export async function GET() {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedData && now - cacheTimestamp < CACHE_TTL) {
        return NextResponse.json(cachedData);
    }

    try {
        const username = process.env.OPENSKY_USERNAME;
        const password = process.env.OPENSKY_PASSWORD;

        const headers: Record<string, string> = {};
        if (username && password) {
            headers["Authorization"] =
                "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
        }

        const res = await fetch("https://opensky-network.org/api/states/all", {
            headers,
            next: { revalidate: 5 },
        });

        if (!res.ok) {
            // OpenSky rate limit or error — return cached or empty
            if (cachedData) return NextResponse.json(cachedData);
            return NextResponse.json(
                { states: [], time: Math.floor(now / 1000), error: `OpenSky returned ${res.status}` },
                { status: 200 }
            );
        }

        const data = await res.json();
        cachedData = data;
        cacheTimestamp = now;
        return NextResponse.json(data);
    } catch (err) {
        console.error("[API/aviation] Error:", err);
        if (cachedData) return NextResponse.json(cachedData);
        return NextResponse.json(
            { states: [], time: Math.floor(now / 1000) },
            { status: 200 }
        );
    }
}
