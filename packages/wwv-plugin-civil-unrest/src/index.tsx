import type { 
    WorldPlugin, 
    GeoEntity, 
    TimeRange, 
    PluginContext, 
    LayerConfig,
    FilterDefinition,
    CesiumEntityOptions,
    ServerPluginConfig
} from "@worldwideview/wwv-plugin-sdk";
import { Hand } from "lucide-react";

export class CivilUnrestPlugin implements WorldPlugin {
    id = "civil-unrest";
    name = "Civil Unrest";
    description = "Tracks global protests, riots, and civil disturbances.";
    icon = Hand;
    category = "conflict" as const;
    version = "1.0.0";

    async initialize(ctx: PluginContext): Promise<void> {
        console.log("[CivilUnrestPlugin] Initialized.");
    }

    destroy(): void {
        console.log("[CivilUnrestPlugin] Destroyed.");
    }
    
    getPollingInterval(): number {
        return 3600000; // 1 hour
    }

    getLayerConfig(): LayerConfig {
        return {
            color: "#eab308", // Yellow for unrest
            clusterEnabled: true,
            clusterDistance: 50,
            minZoomLevel: 3
        };
    }

    getServerConfig(): ServerPluginConfig {
        return {
            apiBasePath: "/api/external/civil_unrest",
            pollingIntervalMs: 3600000, 
            historyEnabled: false,
            availabilityEnabled: false
        };
    }

    async fetch(timeRange: TimeRange): Promise<GeoEntity[]> {
        const res = await fetch("/api/external/civil_unrest");
        const json = await res.json();
        
        if (json.data) {
            return json.data;
        }
        
        return [];
    }

    getFilterDefinitions(): FilterDefinition[] {
        return [
            {
                id: "type",
                label: "Event Type",
                type: "select",
                propertyKey: "type",
                options: [
                    { value: "Protests", label: "Protests" },
                    { value: "Riots", label: "Riots" }
                ]
            },
            {
                id: "minParticipants",
                label: "Minimum Participants",
                type: "range",
                propertyKey: "participants",
                range: { min: 0, max: 5000, step: 100 }
            }
        ];
    }

    getLegend() {
        return [
            { label: "Riots", color: "#ef4444" },
            { label: "Violent Protests", color: "#f97316" },
            { label: "Peaceful Protests", color: "#eab308" },
        ];
    }

    renderEntity(entity: GeoEntity): CesiumEntityOptions {
        const type = (entity.properties?.type as string) || "";
        const subType = (entity.properties?.subType as string) || "";
        const participants = (entity.properties?.participants as number) || 0;
        
        let color = "#eab308"; // Peaceful
        if (type === "Riots") {
            color = "#ef4444";
        } else if (subType.includes("Violent") || subType.includes("force")) {
            color = "#f97316";
        }

        // Adjust size based on participants
        let size = 10;
        if (participants > 1000) size = 20;
        else if (participants > 300) size = 15;

        return {
            type: "point",
            color: color,
            size: size
        };
    }
}
