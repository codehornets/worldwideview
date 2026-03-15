import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handlePreflight, withCors } from "@/lib/marketplace/cors";

export async function OPTIONS(request: Request) {
    return handlePreflight(request);
}

/**
 * Returns manifests of all installed marketplace plugins.
 * Called by the client at startup to load installed plugins.
 * No auth required — this is internal.
 */
export async function GET(request: Request) {
    try {
        const records = await prisma.installedPlugin.findMany();

        const manifests = records
            .map((r) => {
                try {
                    const manifest = JSON.parse(r.config);
                    if (!manifest.id) manifest.id = r.pluginId;
                    return manifest;
                } catch {
                    return null;
                }
            })
            .filter(Boolean);

        return withCors(NextResponse.json({ manifests }), request);
    } catch (err) {
        console.error("[Marketplace/load] Error:", err);
        return withCors(NextResponse.json({ manifests: [] }), request);
    }
}
