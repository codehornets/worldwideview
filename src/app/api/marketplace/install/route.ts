import { NextResponse } from "next/server";
import { validateBridgeToken } from "../../../../lib/marketplace/auth";
import { installPlugin, isInstalled } from "../../../../lib/marketplace/repository";

export async function POST(request: Request) {
    const authError = validateBridgeToken(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const { pluginId, version } = body;

        if (!pluginId || typeof pluginId !== "string") {
            return NextResponse.json(
                { error: "Missing required field: pluginId" },
                { status: 400 },
            );
        }

        if (await isInstalled(pluginId)) {
            return NextResponse.json(
                { error: `Plugin "${pluginId}" is already installed`, pluginId },
                { status: 409 },
            );
        }

        const record = await installPlugin(pluginId, version || "1.0.0");

        return NextResponse.json({
            status: "installed",
            pluginId: record?.pluginId,
            version: record?.version,
            installedAt: record?.installedAt,
        });
    } catch (err) {
        console.error("[Bridge/install] Error:", err);
        return NextResponse.json(
            { error: "Install failed" },
            { status: 500 },
        );
    }
}
