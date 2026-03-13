import { NextResponse } from "next/server";
import { validateBridgeToken } from "../../../../lib/marketplace/auth";
import { uninstallPlugin } from "../../../../lib/marketplace/repository";

export async function POST(request: Request) {
    const authError = validateBridgeToken(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const { pluginId } = body;

        if (!pluginId || typeof pluginId !== "string") {
            return NextResponse.json(
                { error: "Missing required field: pluginId" },
                { status: 400 },
            );
        }

        const deleted = await uninstallPlugin(pluginId);

        if (deleted === 0) {
            return NextResponse.json(
                { error: `Plugin "${pluginId}" is not installed`, pluginId },
                { status: 404 },
            );
        }

        return NextResponse.json({
            status: "uninstalled",
            pluginId,
        });
    } catch (err) {
        console.error("[Bridge/uninstall] Error:", err);
        return NextResponse.json(
            { error: "Uninstall failed" },
            { status: 500 },
        );
    }
}
