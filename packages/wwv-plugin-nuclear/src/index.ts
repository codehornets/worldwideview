import { Atom } from "lucide-react";
import type {
    WorldPlugin,
    GeoEntity,
    TimeRange,
    PluginContext,
    LayerConfig,
    CesiumEntityOptions,
} from "@worldwideview/wwv-plugin-sdk";

export class NuclearPlugin implements WorldPlugin {
    id = "nuclear";
    name = "Nuclear Facilities";
    description = "Global nuclear power plants and reactors from OSM.";
    icon = Atom;
    category = "infrastructure" as const;
    version = "1.0.0";

    async initialize(_ctx: PluginContext): Promise<void> { }
    destroy(): void { }

    async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
        // Rendering managed by StaticDataPlugin loader
        return [];
    }

    getPollingInterval(): number { return 0; }

    getLayerConfig(): LayerConfig {
        return {
            color: "#22d3ee",
            clusterEnabled: true,
            clusterDistance: 50,
            maxEntities: 1000,
        };
    }

    renderEntity(_entity: GeoEntity): CesiumEntityOptions {
        return { type: "point", color: "#22d3ee", size: 8 };
    }
}
