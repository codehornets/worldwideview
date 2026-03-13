import { NextResponse } from "next/server";

/**
 * Validate the bridge token from the Authorization header.
 * Returns null if valid, or a NextResponse error if invalid.
 */
export function validateBridgeToken(request: Request): NextResponse | null {
    const bridgeToken = process.env.WWV_BRIDGE_TOKEN;
    if (!bridgeToken) {
        return NextResponse.json(
            { error: "Bridge not configured — set WWV_BRIDGE_TOKEN in .env" },
            { status: 503 },
        );
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token !== bridgeToken) {
        return NextResponse.json(
            { error: "Invalid or missing bridge token" },
            { status: 401 },
        );
    }

    return null;
}
