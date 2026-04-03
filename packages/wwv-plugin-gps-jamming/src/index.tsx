import React, { useEffect } from "react";
import { SatelliteDish } from "lucide-react";
import { Color, Cartesian3 } from "cesium";
import { Entity, PointGraphics } from "resium";
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

const LEVEL_COLORS: Record<string, string> = {
    "low": "#facc15",    // Yellow
    "medium": "#f97316", // Orange
    "high": "#ef4444",   // Red
};

export class GpsJammingPlugin implements WorldPlugin {
    id = "gps_jamming";
    name = "GPS Jamming";
    description = "Daily Global GPS/GNSS Interference Map";
    icon = SatelliteDish;
    category = "aviation" as const;
    version = "1.0.0";
    
    private data: GeoEntity[] = [];

    async initialize(_ctx: PluginContext): Promise<void> { }
    destroy(): void { }

    getServerConfig(): ServerPluginConfig {
        return {
            apiBasePath: "/api/external/gps_jamming",
            pollingIntervalMs: 3600 * 1000, // 1 hour
            requiresAuth: false,
            historyEnabled: false,
            availabilityEnabled: true
        };
    }

    async fetch(timeRange: TimeRange): Promise<GeoEntity[]> {
        const res = await fetch(`/api/external/gps_jamming`);
        const json = await res.json();
        
        if (json.data) {
            this.data = json.data;
            return this.data;
        }
        return [];
    }

    getPollingInterval(): number { 
        return 3600 * 1000;
    }

    getLayerConfig(): LayerConfig {
        return {
            color: "#ef4444",
            clusterEnabled: false, // We want to see individual hexes/points
            clusterDistance: 50,
        };
    }

    getFilterDefinitions(): FilterDefinition[] {
        return [
            {
                id: "level",
                label: "Interference Level",
                propertyKey: "interferenceLevel",
                type: "select",
                options: [
                    { value: "low", label: "Low (0-2%)" },
                    { value: "medium", label: "Medium (2-10%)" },
                    { value: "high", label: "High (>10%)" }
                ]
            }
        ];
    }

    getLegend() {
        return [
            { label: "Low (0-2%)", color: LEVEL_COLORS["low"], filterId: "level", filterValue: "low" },
            { label: "Medium (2-10%)", color: LEVEL_COLORS["medium"], filterId: "level", filterValue: "medium" },
            { label: "High (>10%)", color: LEVEL_COLORS["high"], filterId: "level", filterValue: "high" }
        ];
    }

    // Standard renderer - used as fallback
    renderEntity(entity: GeoEntity): CesiumEntityOptions {
        const level = (entity.properties?.interferenceLevel as string)?.toLowerCase() || "low";
        const color = LEVEL_COLORS[level] || LEVEL_COLORS["low"];

        return {
            type: "point",
            color: color,
            size: 15,
        };
    }

    // Advanced native Cesium renderer for better performance on large sets
    getGlobeComponent() {
        // eslint-disable-next-line react/display-name
        return ({ enabled }: { enabled: boolean }) => {
            if (!enabled || this.data.length === 0) return null;

            return (
                <>
                    {this.data.map((entity) => {
                        const level = (entity.properties?.interferenceLevel as string)?.toLowerCase() || "low";
                        const hexStr = LEVEL_COLORS[level] || LEVEL_COLORS["low"];
                        const color = Color.fromCssColorString(hexStr).withAlpha(0.6);
                        
                        return (
                            <Entity
                                key={entity.id}
                                position={Cartesian3.fromDegrees(entity.longitude, entity.latitude, 5000)}
                                name={`GPS Interference: ${level.toUpperCase()}`}
                                description={`
                                    <div class="p-3">
                                        <div class="mb-2"><span class="font-semibold text-gray-300">Level:</span> <span style="color: ${hexStr}">${level.toUpperCase()}</span></div>
                                        <div class="mb-2"><span class="font-semibold text-gray-300">Region:</span> ${entity.properties?.region || 'Unknown'}</div>
                                    </div>
                                `}
                            >
                                <PointGraphics
                                    color={color}
                                    pixelSize={!!(level === 'high') ? 25 : (level === 'medium' ? 18 : 12)}
                                    // Use outline to simulate a slightly blurrier glow/hex
                                    outlineColor={color.withAlpha(0.8)}
                                    outlineWidth={2}
                                />
                            </Entity>
                        );
                    })}
                </>
            );
        };
    }
}
