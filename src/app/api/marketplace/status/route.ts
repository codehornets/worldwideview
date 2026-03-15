import { NextResponse } from "next/server";
import { validateBridgeToken } from "../../../../lib/marketplace/auth";
import { getInstalledPlugins } from "../../../../lib/marketplace/repository";
import { handlePreflight, withCors } from "../../../../lib/marketplace/cors";

export async function OPTIONS(request: Request) {
    return handlePreflight(request);
}

export async function GET(request: Request) {
    const authError = validateBridgeToken(request);
    if (authError) return withCors(authError, request);

    try {
        const plugins = await getInstalledPlugins();
        return withCors(NextResponse.json({ plugins }), request);
    } catch (err) {
        console.error("[Bridge/status] Error:", err);
        return withCors(
            NextResponse.json(
                { error: "Failed to fetch status" },
                { status: 500 },
            ),
            request,
        );
    }
}
