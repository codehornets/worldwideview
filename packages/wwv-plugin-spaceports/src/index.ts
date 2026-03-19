import { Rocket } from "lucide-react";
import type {
    WorldPlugin, GeoEntity, TimeRange, PluginContext,
    LayerConfig, CesiumEntityOptions,
} from "@worldwideview/wwv-plugin-sdk";

export class SpaceportsPlugin implements WorldPlugin {
    id = "spaceports";
    name = "Spaceports";
    description = "Space launch sites worldwide from OSM";
    icon = Rocket;
    category = "custom" as const;
    version = "1.0.0";

    async initialize(_ctx: PluginContext): Promise<void> { }
    destroy(): void { }
    async fetch(_tr: TimeRange): Promise<GeoEntity[]> { return []; }
    getPollingInterval(): number { return 0; }

    getLayerConfig(): LayerConfig {
        return {
            color: "#7c3aed",
            clusterEnabled: true,
            clusterDistance: 50,
            maxEntities: 1000,
        };
    }

    renderEntity(_e: GeoEntity): CesiumEntityOptions {
        return { type: "point", color: "#7c3aed", size: 8 };
    }
}
