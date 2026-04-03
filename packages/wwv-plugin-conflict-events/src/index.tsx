import { Crosshair } from "lucide-react";
import {
    type WorldPlugin,
    type GeoEntity,
    type TimeRange,
    type PluginContext,
    type LayerConfig,
    type CesiumEntityOptions,
    type FilterDefinition,
    type ServerPluginConfig
} from "@worldwideview/wwv-plugin-sdk";

export class ConflictEventsPlugin implements WorldPlugin {
    id = "conflict-events";
    name = "Conflict Events";
    description = "Recent conflict events and violence mapping";
    icon = Crosshair;
    category = "conflict" as const;
    version = "1.0.0";
    
    private data: GeoEntity[] = [];

    async initialize(_ctx: PluginContext): Promise<void> { }
    destroy(): void { }

    getServerConfig(): ServerPluginConfig {
        return {
            apiBasePath: "/api/external/conflict_events",
            pollingIntervalMs: 3600 * 24 * 1000, 
            requiresAuth: false,
            historyEnabled: false,
            availabilityEnabled: true
        };
    }

    async fetch(timeRange: TimeRange): Promise<GeoEntity[]> {
        const res = await fetch("/api/external/conflict_events");
        const json = await res.json();
        
        if (json.data) {
            this.data = json.data;
            return this.data;
        }
        return [];
    }

    getPollingInterval(): number { 
        return 3600 * 24 * 1000;
    }

    getLayerConfig(): LayerConfig {
        return {
            color: "#ef4444",
            clusterEnabled: true,
            clusterDistance: 50,
        };
    }

    getFilterDefinitions(): FilterDefinition[] {
        return [
            {
                id: "type",
                label: "Event Type",
                propertyKey: "type",
                type: "select",
                options: [
                    { value: "Battles", label: "Battles" },
                    { value: "Explosions/Remote violence", label: "Explosions/Remote violence" },
                    { value: "Violence against civilians", label: "Violence against civilians" },
                    { value: "Protests", label: "Protests" },
                    { value: "Riots", label: "Riots" },
                    { value: "Strategic developments", label: "Strategic developments" }
                ]
            }
        ];
    }

    getLegend() {
        return [
            { label: "High Fatalities (>10)", color: "#ef4444" },
            { label: "Medium Fatalities (1-10)", color: "#f97316" },
            { label: "Low Fatalities / Remote", color: "#facc15" },
        ];
    }

    renderEntity(entity: GeoEntity): CesiumEntityOptions {
        const fatalities = entity.properties?.fatalities as number || 0;
        let color = "#facc15"; // Yellow
        if (fatalities > 10) color = "#ef4444";
        else if (fatalities > 0) color = "#f97316";

        return {
            type: "point",
            color: color,
            size: fatalities > 10 ? 20 : (fatalities > 0 ? 15 : 10)
        };
    }
}
