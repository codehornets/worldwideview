import type {
    WorldPlugin,
    GeoEntity,
    TimeRange,
    PluginContext,
    LayerConfig,
    CesiumEntityOptions,
} from "@/core/plugins/PluginTypes";

function frpToColor(frp: number): string {
    if (frp < 10) return "#fbbf24";   // yellow — low
    if (frp < 50) return "#f97316";   // orange — medium
    if (frp < 100) return "#ef4444";  // red — high
    return "#dc2626";                  // dark red — extreme
}

function frpToSize(frp: number): number {
    if (frp < 10) return 5;
    if (frp < 50) return 7;
    if (frp < 100) return 9;
    return 12;
}

export class WildfirePlugin implements WorldPlugin {
    id = "wildfire";
    name = "Wildfire";
    description = "Active fire detection via NASA FIRMS (VIIRS)";
    icon = "🔥";
    category = "natural-disaster" as const;
    version = "1.0.0";

    private context: PluginContext | null = null;

    async initialize(ctx: PluginContext): Promise<void> {
        this.context = ctx;
    }

    destroy(): void {
        this.context = null;
    }

    async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
        try {
            const res = await fetch("/api/wildfire");
            if (!res.ok) throw new Error(`Wildfire API returned ${res.status}`);
            const data = await res.json();

            if (!data.fires || !Array.isArray(data.fires)) return [];

            return data.fires.map(
                (fire: {
                    latitude: number;
                    longitude: number;
                    frp: number;
                    confidence: string;
                    acq_date: string;
                    acq_time: string;
                    satellite: string;
                    bright_ti4?: number;
                    bright_ti5?: number;
                }): GeoEntity => ({
                    id: `wildfire-${fire.latitude.toFixed(4)}-${fire.longitude.toFixed(4)}-${fire.acq_date}`,
                    pluginId: "wildfire",
                    latitude: fire.latitude,
                    longitude: fire.longitude,
                    timestamp: new Date(`${fire.acq_date}T${fire.acq_time.padStart(4, "0").slice(0, 2)}:${fire.acq_time.padStart(4, "0").slice(2)}:00Z`),
                    label: `FRP: ${fire.frp}`,
                    properties: {
                        frp: fire.frp,
                        confidence: fire.confidence,
                        satellite: fire.satellite,
                        acq_date: fire.acq_date,
                        acq_time: fire.acq_time,
                        bright_ti4: fire.bright_ti4,
                        bright_ti5: fire.bright_ti5,
                    },
                })
            );
        } catch (err) {
            console.error("[WildfirePlugin] Fetch error:", err);
            return [];
        }
    }

    getPollingInterval(): number {
        return 300000; // 5 minutes
    }

    getLayerConfig(): LayerConfig {
        return {
            color: "#ef4444",
            clusterEnabled: true,
            clusterDistance: 30,
        };
    }

    renderEntity(entity: GeoEntity): CesiumEntityOptions {
        const frp = (entity.properties.frp as number) || 0;
        return {
            type: "point",
            color: frpToColor(frp),
            size: frpToSize(frp),
            outlineColor: "#000000",
            outlineWidth: 1,
        };
    }
}
