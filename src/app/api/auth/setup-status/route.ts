import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { corsHeaders, handlePreflight } from "@/lib/marketplace/cors";
import { edition, isDemoAdminConfigured } from "@/core/edition";

/** Lightweight endpoint for middleware to check if first-run setup is needed. */
export async function OPTIONS(request: Request) {
    return handlePreflight(request);
}

export async function GET(request: Request) {
    const count = await prisma.user.count();
    // When demo admin is configured, report as "local" so the marketplace
    // treats the instance as fully capable of plugin management.
    const effectiveEdition = isDemoAdminConfigured ? "local" : edition;
    const res = NextResponse.json({ needsSetup: count === 0, edition: effectiveEdition });
    const headers = corsHeaders(request);
    for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
    return res;
}
