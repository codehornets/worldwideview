import { NextResponse } from "next/server";
import { validateBridgeToken } from "../../../../lib/marketplace/auth";
import { installPlugin, isInstalled } from "../../../../lib/marketplace/repository";
import { handlePreflight, withCors } from "../../../../lib/marketplace/cors";

export async function OPTIONS(request: Request) {
    return handlePreflight(request);
}

export async function POST(request: Request) {
    const authError = validateBridgeToken(request);
    if (authError) return withCors(authError, request);

    try {
        const body = await request.json();
        const { pluginId, version, manifest } = body;

        if (!pluginId || typeof pluginId !== "string") {
            return withCors(
                NextResponse.json(
                    { error: "Missing required field: pluginId" },
                    { status: 400 },
                ),
                request,
            );
        }

        if (await isInstalled(pluginId)) {
            return withCors(
                NextResponse.json(
                    { error: `Plugin "${pluginId}" is already installed`, pluginId },
                    { status: 409 },
                ),
                request,
            );
        }

        // Store manifest as config so the startup loader can re-register it
        const config = manifest ? JSON.stringify(manifest) : "{}";
        const record = await installPlugin(pluginId, version || "1.0.0", config);

        return withCors(
            NextResponse.json({
                status: "installed",
                pluginId: record?.pluginId,
                version: record?.version,
                installedAt: record?.installedAt,
            }),
            request,
        );
    } catch (err) {
        console.error("[Bridge/install] Error:", err);
        return withCors(
            NextResponse.json(
                { error: "Install failed" },
                { status: 500 },
            ),
            request,
        );
    }
}
