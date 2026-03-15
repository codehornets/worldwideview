import { NextResponse } from "next/server";
import { validateBridgeToken } from "../../../../lib/marketplace/auth";
import { uninstallPlugin } from "../../../../lib/marketplace/repository";
import { handlePreflight, withCors } from "../../../../lib/marketplace/cors";

export async function OPTIONS(request: Request) {
    return handlePreflight(request);
}

export async function POST(request: Request) {
    const authError = validateBridgeToken(request);
    if (authError) return withCors(authError, request);

    try {
        const body = await request.json();
        const { pluginId } = body;

        if (!pluginId || typeof pluginId !== "string") {
            return withCors(
                NextResponse.json(
                    { error: "Missing required field: pluginId" },
                    { status: 400 },
                ),
                request,
            );
        }

        const deleted = await uninstallPlugin(pluginId);

        if (deleted === 0) {
            return withCors(
                NextResponse.json(
                    { error: `Plugin "${pluginId}" is not installed`, pluginId },
                    { status: 404 },
                ),
                request,
            );
        }

        return withCors(
            NextResponse.json({
                status: "uninstalled",
                pluginId,
            }),
            request,
        );
    } catch (err) {
        console.error("[Bridge/uninstall] Error:", err);
        return withCors(
            NextResponse.json(
                { error: "Uninstall failed" },
                { status: 500 },
            ),
            request,
        );
    }
}
