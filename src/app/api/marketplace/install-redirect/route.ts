import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { upsertPlugin } from "@/lib/marketplace/repository";
import { issueMarketplaceToken } from "@/lib/marketplace/marketplaceToken";
import type { PluginManifest } from "@/core/plugins/PluginManifest";
import { validateManifest } from "@/core/plugins/validateManifest";

const ALLOWED_REDIRECT_HOSTS = new Set([
    "localhost",
    "127.0.0.1",
    "worldwideview.io",
    "worldwideview.cloud",
]);

function isSafeRedirect(url: string): boolean {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname;
        return ALLOWED_REDIRECT_HOSTS.has(hostname) || hostname.endsWith(".worldwideview.io");
    } catch {
        return false;
    }
}

/**
 * GET /api/marketplace/install-redirect
 * Used by the marketplace browser to install a plugin without an API key.
 * Validates the user's WWV session, installs the plugin, then redirects back.
 *
 * Query params:
 *   pluginId   - the plugin ID to install
 *   manifest   - base64-encoded JSON manifest
 *   version    - semver string
 *   redirectTo - URL to redirect to after install (must be allowlisted)
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    const { searchParams } = request.nextUrl;

    const pluginId = searchParams.get("pluginId");
    const manifestB64 = searchParams.get("manifest");
    const version = searchParams.get("version") ?? "1.0.0";
    const redirectTo = searchParams.get("redirectTo") ?? "";

    // Not logged in — send to login with this URL as callbackUrl
    if (!session?.user) {
        const loginUrl = new URL("/login", request.nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", request.nextUrl.toString());
        return NextResponse.redirect(loginUrl);
    }

    if (!pluginId || !manifestB64 || !redirectTo) {
        return NextResponse.json({ error: "Missing required params" }, { status: 400 });
    }

    if (!isSafeRedirect(redirectTo)) {
        return NextResponse.json({ error: "Invalid redirectTo domain" }, { status: 400 });
    }

    let manifest: PluginManifest;
    try {
        manifest = JSON.parse(Buffer.from(manifestB64, "base64").toString("utf8"));
    } catch {
        return NextResponse.json({ error: "Invalid manifest encoding" }, { status: 400 });
    }

    const validation = validateManifest(manifest);
    if (!validation.valid) {
        return NextResponse.json(
            { error: "Invalid manifest", details: validation.errors },
            { status: 400 },
        );
    }

    try {
        await upsertPlugin(pluginId, version, JSON.stringify(manifest));
    } catch (err) {
        console.error("[install-redirect] Install failed:", err);
        const errorUrl = new URL(redirectTo);
        errorUrl.searchParams.set("install_error", pluginId);
        return NextResponse.redirect(errorUrl);
    }

    // Issue a marketplace-scoped JWT for the Manage page's cross-origin API calls
    const token = await issueMarketplaceToken();

    // Success — redirect back to marketplace with ?installed=pluginId&token=<jwt>
    const successUrl = new URL(redirectTo);
    successUrl.searchParams.set("installed", pluginId);
    successUrl.searchParams.set("token", token);
    return NextResponse.redirect(successUrl);
}
