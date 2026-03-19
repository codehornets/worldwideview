import { Lamp } from "lucide-react";
import type {
    WorldPlugin, GeoEntity, TimeRange, PluginContext,
    LayerConfig, CesiumEntityOptions,
} from "@worldwideview/wwv-plugin-sdk";

export class LighthousesPlugin implements WorldPlugin {
    id = "lighthouses";
    name = "Lighthouses";
    description = "Lighthouses worldwide from OSM";
    icon = Lamp;
    category = "maritime" as const;
    version = "1.0.0";

    async initialize(_ctx: PluginContext): Promise<void> { }
    destroy(): void { }
    async fetch(_tr: TimeRange): Promise<GeoEntity[]> { return []; }
    getPollingInterval(): number { return 0; }

    getLayerConfig(): LayerConfig {
        return {
            color: "#facc15",
            clusterEnabled: true,
            clusterDistance: 50,
            maxEntities: 5000,
        };
    }

    renderEntity(_e: GeoEntity): CesiumEntityOptions {
        return { type: "point", color: "#facc15", size: 8 };
    }
}
