"use client";

import { useEffect, useRef } from "react";
import { pluginManager } from "@/core/plugins/PluginManager";
import { useStore } from "@/core/state/store";
import type { PluginManifest } from "@/core/plugins/PluginManifest";

/**
 * Syncs marketplace-installed plugins on window focus.
 * Detects newly installed plugins and hot-loads them without a full refresh.
 */
export function useMarketplaceSync() {
    const initLayer = useStore((s) => s.initLayer);
    const loadedIds = useRef<Set<string>>(new Set());

    /** Fetch manifests and load any that aren't already registered. */
    async function syncPlugins() {
        try {
            const res = await fetch("/api/marketplace/load");
            if (!res.ok) return;

            const { manifests } = (await res.json()) as { manifests: PluginManifest[] };

            for (const manifest of manifests) {
                if (!manifest.id) continue;
                if (loadedIds.current.has(manifest.id)) continue;
                if (pluginManager.getPlugin(manifest.id)) {
                    loadedIds.current.add(manifest.id);
                    continue;
                }

                await pluginManager.loadFromManifest(manifest);
                initLayer(manifest.id);
                loadedIds.current.add(manifest.id);
                console.log(`[MarketplaceSync] Hot-loaded plugin "${manifest.id}"`);
            }
        } catch {
            // Silently fail — sync is best-effort
        }
    }

    useEffect(() => {
        // Initial sync (records IDs of already-loaded plugins)
        syncPlugins();

        const handleFocus = () => {
            syncPlugins();
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initLayer]);

    return { syncPlugins };
}
