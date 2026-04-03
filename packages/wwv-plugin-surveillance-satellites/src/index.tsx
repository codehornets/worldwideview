import { Radar } from "lucide-react";
import {
    type WorldPlugin,
    type GeoEntity,
    type TimeRange,
    type PluginContext,
    type LayerConfig,
    type CesiumEntityOptions,
    type SelectionBehavior,
    type ServerPluginConfig,
} from "@worldwideview/wwv-plugin-sdk";

interface SatelliteResponse {
    noradId: number;
    name: string;
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
    speed: number;
    group: string;
    country?: string;
    objectType?: string;
    period?: number;
}

export class SurveillanceSatellitesPlugin implements WorldPlugin {
    id = "surveillance-satellites";
    name = "Surveillance Satellites";
    description = "Active military and reconnaissance satellite tracking";
    icon = Radar;
    category = "infrastructure" as const;
    version = "1.0.0";

    private context: PluginContext | null = null;
    private iconUrl: string | null = null;

    async initialize(ctx: PluginContext): Promise<void> {
        this.context = ctx;
        // this.iconUrl = createSvgIconUrl(Radar, { color: "#ef4444" }); // Deprecated in SDK
    }

    destroy(): void {
        this.context = null;
    }

    async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
        try {
            const res = await globalThis.fetch(`/api/external/surveillance_satellites`);
            if (!res.ok) throw new Error(`Satellite API returned ${res.status}`);
            const data = await res.json();
            const surveillanceSats = data.satellites || data.items || [];
            if (!surveillanceSats || !Array.isArray(surveillanceSats)) return [];

            return surveillanceSats.map(
                (sat: SatelliteResponse): GeoEntity => ({
                    id: `surv-sat-${sat.noradId}`,
                    pluginId: "surveillance-satellites",
                    latitude: sat.latitude,
                    longitude: sat.longitude,
                    altitude: sat.altitude * 1000, // km → meters
                    heading: sat.heading,
                    speed: sat.speed,
                    timestamp: new Date(),
                    label: sat.name,
                    properties: {
                        noradId: sat.noradId,
                        name: sat.name,
                        group: sat.group === "military" ? "Military" : "Recon",
                        country: sat.country || "Unknown",
                        objectType: sat.objectType,
                        altitudeKm: Math.round(sat.altitude),
                        speedKph: Math.round(sat.speed * 3.6),
                        period: sat.period,
                    },
                }),
            );
        } catch (err) {
            console.error("[SurveillanceSatellitesPlugin] Fetch error:", err);
            return [];
        }
    }

    getPollingInterval(): number {
        return 0; // WebSocket streaming, or handles live polling on its own
    }

    getLayerConfig(): LayerConfig {
        return {
            color: "#ef4444",
            clusterEnabled: false,
            clusterDistance: 0,
            maxEntities: 1000,
        };
    }

    renderEntity(entity: GeoEntity): CesiumEntityOptions {
        return {
            type: "billboard",
            iconUrl: this.iconUrl || undefined,
            color: "#ef4444",
            size: 16,
            outlineColor: "#ffffff",
            outlineWidth: 2,
            labelText: entity.label,
            labelFont: "12px monospace"
        };
    }

    getSelectionBehavior(_entity: GeoEntity): SelectionBehavior | null {
        return {
            showTrail: true,
            trailDurationSec: 300,
            trailStepSec: 10,
            trailColor: "#ef4444",
            flyToOffsetMultiplier: 4,
            flyToBaseDistance: 2000000,
        };
    }

    getLegend() {
        return [
            { label: "Military Satellites", color: "#ef4444" },
            { label: "Reconnaissance", color: "#f97316" }
        ];
    }

    getServerConfig(): ServerPluginConfig {
        return {
            apiBasePath: "/api/external/surveillance_satellites",
            pollingIntervalMs: 0,
            historyEnabled: true,
        };
    }
}
