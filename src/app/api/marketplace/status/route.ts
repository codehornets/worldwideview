import { NextResponse } from "next/server";
import { validateMarketplaceAuth } from "@/lib/marketplace/auth";
import { getInstalledPlugins, DISABLED_VERSION } from "@/lib/marketplace/repository";
import { handlePreflight, withCors } from "@/lib/marketplace/cors";
import { BUILT_IN_PLUGIN_IDS } from "@/lib/marketplace/builtinPlugins";
import { marketplaceApiLimiter } from "@/lib/rateLimiters";
import { getClientIp } from "@/lib/rateLimit";
import { isDemo, isDemoAdmin } from "@/core/edition";
import { auth } from "@/lib/auth";

export async function OPTIONS(request: Request) {
    return handlePreflight(request);
}

export async function GET(request: Request) {
    const rateLimited = marketplaceApiLimiter.check(getClientIp(request));
    if (rateLimited) return withCors(rateLimited, request);

    // On demo, only the admin session may manage plugins (which involves viewing status via UI)
    if (isDemo && !isDemoAdmin(await auth())) {
        return withCors(
            NextResponse.json({ error: "Admin access required" }, { status: 403 }),
            request,
        );
    }

    const authError = await validateMarketplaceAuth(request);
    if (authError) return withCors(authError, request);

    try {
        const dbPlugins = await getInstalledPlugins();
        const dbMap = new Map(dbPlugins.map((p) => [p.pluginId, p]));

        // Collect active DB plugins (exclude disabled markers)
        const activeDbPlugins = dbPlugins.filter((p) => p.version !== DISABLED_VERSION);

        // Add built-in plugins that aren't in the DB at all (default = installed)
        const builtInRecords = BUILT_IN_PLUGIN_IDS
            .filter((id) => !dbMap.has(id))
            .map((id) => ({
                pluginId: id,
                version: "built-in",
                config: "{}",
                installedAt: "",
            }));

        const plugins = [...activeDbPlugins, ...builtInRecords];
        return withCors(NextResponse.json({ plugins }), request);
    } catch (err) {
        console.error("[marketplace/status] Error:", err);
        // Fallback: return built-in plugins when DB is unavailable
        const fallback = BUILT_IN_PLUGIN_IDS.map((id) => ({
            pluginId: id,
            version: "built-in",
            config: "{}",
            installedAt: "",
        }));
        return withCors(NextResponse.json({ plugins: fallback }), request);
    }
}

