import { NextResponse } from "next/server";

/**
 * Maritime AIS proxy.
 * Currently returns demo data — will be connected to a real AIS feed in Phase 2.
 */
export async function GET() {
    // In the future, this will proxy to a real AIS data provider.
    // For now, return an empty vessels array so the plugin falls back to demo data.
    return NextResponse.json({ vessels: null });
}
