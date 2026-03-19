import { Anchor } from "lucide-react";
import type {
    WorldPlugin, GeoEntity, TimeRange, PluginContext,
    LayerConfig, CesiumEntityOptions,
} from "@worldwideview/wwv-plugin-sdk";

export class SeaportsPlugin implements WorldPlugin {
    id = "seaports";
    name = "Seaports";
    description = "Harbours and seaports worldwide from OSM";
    icon = Anchor;
    category = "maritime" as const;
    version = "1.0.0";

    async initialize(_ctx: PluginContext): Promise<void> { }
    destroy(): void { }
    async fetch(_tr: TimeRange): Promise<GeoEntity[]> { return []; }
    getPollingInterval(): number { return 0; }

    getLayerConfig(): LayerConfig {
        return {
            color: "#0ea5e9",
            clusterEnabled: true,
            clusterDistance: 50,
            maxEntities: 5000,
        };
    }

    renderEntity(_e: GeoEntity): CesiumEntityOptions {
        return { type: "point", color: "#0ea5e9", size: 8 };
    }
}
