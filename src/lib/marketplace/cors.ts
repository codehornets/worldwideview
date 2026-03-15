import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
    "http://localhost:3001",
    "https://marketplace.worldwideview.io",
];

/** Build CORS headers for the marketplace bridge API. */
export function corsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get("origin") ?? "";
    const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
    };
}

/** Standard preflight response. */
export function handlePreflight(request: Request): NextResponse {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(request),
    });
}

/** Wrap a NextResponse with CORS headers. */
export function withCors(response: NextResponse, request: Request): NextResponse {
    const headers = corsHeaders(request);
    for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
    }
    return response;
}
