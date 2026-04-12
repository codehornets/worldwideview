import { Activity } from "lucide-react";
import {
    type GeoEntity,
    type TimeRange,
    type FilterDefinition,
    type ServerPluginConfig,
} from "@worldwideview/wwv-plugin-sdk";
import { BaseIncidentPlugin } from "@worldwideview/wwv-lib-incidents";

export class EarthquakesPlugin extends BaseIncidentPlugin {
    id = "earthquakes";
    name = "Earthquakes";
    description = "USGS Real-Time Earthquakes (4.5+)";
    icon = Activity;
    category = "natural-disaster" as const;
    version = "1.0.2";
    
    protected defaultLayerColor = "#f97316";

    protected getSeverityValue(entity: GeoEntity): number {
        return (entity.properties.magnitude as number) || 4.5;
    }

    protected getSeverityColor(mag: number): string {
        if (mag < 5.0) return "#fcd34d"; // Yellow
        if (mag < 6.0) return "#f97316"; // Orange
        if (mag < 7.0) return "#ef4444"; // Red
        return "#7f1d1d"; // Dark Red
    }

    protected getSeveritySize(mag: number): number {
        if (mag < 5.0) return 5;
        if (mag < 6.0) return 8;
        if (mag < 7.0) return 12;
        return 16;
    }

    async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
        try {
            const res = await globalThis.fetch("/api/external/earthquakes");
            if (!res.ok) throw new Error(`Earthquakes API returned ${res.status}`);
            const data = await res.json();
            if (!data.items || !Array.isArray(data.items)) return [];

            return data.items.map((eq: any): GeoEntity => ({
                id: eq.id,
                pluginId: this.id,
                latitude: eq.lat,
                longitude: eq.lon,
                timestamp: new Date(eq.occurredAt),
                label: `M${eq.magnitude} - ${eq.place}`,
                properties: {
                    magnitude: eq.magnitude,
                    depth_km: eq.depth_km,
                    place: eq.place,
                    url: eq.url,
                    nearTestSite: eq.nearTestSite,
                    nearestSiteName: eq.nearestSiteName,
                },
            }));
        } catch (err) {
            console.error("[EarthquakesPlugin] Fetch error:", err);
            return [];
        }
    }

    getServerConfig(): ServerPluginConfig {
        return { apiBasePath: "/api/external/earthquakes", pollingIntervalMs: 0, historyEnabled: true };
    }

    getLegend(): { label: string; color: string; filterId?: string; filterValue?: string }[] {
        return [
            { label: "M < 5.0", color: "#fcd34d", filterId: "magnitude", filterValue: "4.5" },
            { label: "M 5.0 - 5.9", color: "#f97316", filterId: "magnitude", filterValue: "5.0" },
            { label: "M 6.0 - 6.9", color: "#ef4444", filterId: "magnitude", filterValue: "6.0" },
            { label: "M ≥ 7.0", color: "#7f1d1d", filterId: "magnitude", filterValue: "7.0" },
        ];
    }

    getFilterDefinitions(): FilterDefinition[] {
        return [
            { id: "magnitude", label: "Magnitude", type: "range", propertyKey: "magnitude", range: { min: 4.5, max: 10.0, step: 0.1 } },
            { id: "depth", label: "Depth (km)", type: "range", propertyKey: "depth_km", range: { min: 0, max: 800, step: 10 } },
            {
                id: "nuclear", label: "Nuclear Site Proximity", type: "select", propertyKey: "nearTestSite",
                options: [{ value: "true", label: "Suspicious (<10km from test site)" }],
            }
        ];
    }
}
