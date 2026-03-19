import { PlaneTakeoff } from "lucide-react";
import type {
    WorldPlugin, GeoEntity, TimeRange, PluginContext,
    LayerConfig, CesiumEntityOptions,
} from "@worldwideview/wwv-plugin-sdk";

export class AirportsPlugin implements WorldPlugin {
    id = "airports";
    name = "Airports";
    description = "Airports and aerodromes worldwide from OSM";
    icon = PlaneTakeoff;
    category = "aviation" as const;
    version = "1.0.0";

    async initialize(_ctx: PluginContext): Promise<void> { }
    destroy(): void { }
    async fetch(_tr: TimeRange): Promise<GeoEntity[]> { return []; }
    getPollingInterval(): number { return 0; }

    getLayerConfig(): LayerConfig {
        return {
            color: "#3b82f6",
            clusterEnabled: true,
            clusterDistance: 50,
            maxEntities: 5000,
        };
    }

    renderEntity(_e: GeoEntity): CesiumEntityOptions {
        return { type: "point", color: "#3b82f6", size: 8 };
    }
}
