import { NextResponse } from "next/server";
import { validateBridgeToken } from "../../../../lib/marketplace/auth";
import { getInstalledPlugins } from "../../../../lib/marketplace/repository";

export async function GET(request: Request) {
    const authError = validateBridgeToken(request);
    if (authError) return authError;

    try {
        const plugins = await getInstalledPlugins();
        return NextResponse.json({ plugins });
    } catch (err) {
        console.error("[Bridge/status] Error:", err);
        return NextResponse.json(
            { error: "Failed to fetch status" },
            { status: 500 },
        );
    }
}
