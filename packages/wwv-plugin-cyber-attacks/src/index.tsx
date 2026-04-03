import { ShieldAlert, Terminal, Network } from "lucide-react";
import {
    type WorldPlugin,
    type GeoEntity,
    type TimeRange,
    type PluginContext,
    type LayerConfig,
    type CesiumEntityOptions,
    type SelectionBehavior,
    type FilterDefinition,
    type ServerPluginConfig,
} from "@worldwideview/wwv-plugin-sdk";

const SEVERITY_COLORS = {
    low: "#facc15",      // Yellow
    medium: "#fb923c",   // Orange
    high: "#ef4444",     // Red
    critical: "#7f1d1d"  // Dark Red
};

export class CyberAttacksPlugin implements WorldPlugin {
    id = "cyber-attacks";
    name = "Cyber Attacks";
    description = "Live DDoS, malware, and state-backed cyber intrusions";
    icon = ShieldAlert;
    category = "infrastructure" as const;
    version = "1.0.0";

    private context: PluginContext | null = null;
    private iconUrls: Record<string, string> = {};

    async initialize(ctx: PluginContext): Promise<void> {
        this.context = ctx;
    }

    destroy(): void {
        this.context = null;
    }

    async fetch(timeRange: TimeRange): Promise<GeoEntity[]> {
        try {
            // We fetch the live snapshot via the standard internal endpoint
            const res = await globalThis.fetch(`/api/external/cyber_attacks?start=${timeRange.start.toISOString()}&end=${timeRange.end.toISOString()}`);
            if (!res.ok) throw new Error(`Cyber Attacks API returned ${res.status}`);
            
            const data = await res.json();
            const attacks = data.items || [];

            return attacks.map((attack: any): GeoEntity => ({
                id: attack.id,
                pluginId: "cyber-attacks",
                // Render at the target destination
                latitude: attack.targetLatitude,
                longitude: attack.targetLongitude,
                altitude: 0,
                timestamp: new Date(),
                label: `${attack.type}: ${attack.originName} → ${attack.targetName}`,
                properties: {
                    ...attack
                },
            }));
        } catch (err) {
            console.error("[CyberAttacksPlugin] Fetch error:", err);
            return [];
        }
    }

    getPollingInterval(): number {
        return 5000; // Poll every 5 seconds for rapid updates
    }

    getLayerConfig(): LayerConfig {
        return {
            color: "#ef4444",
            clusterEnabled: false,
            clusterDistance: 0,
            maxEntities: 2000,
        };
    }

    renderEntity(entity: GeoEntity): CesiumEntityOptions {
        const severity = (entity.properties.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium';
        const color = SEVERITY_COLORS[severity];

        if (!this.iconUrls[color]) {
            // this.iconUrls[color] = createSvgIconUrl(Terminal, { color }); // Deprecated in SDK
        }

        return {
            type: "billboard",
            iconUrl: this.iconUrls[color],
            color,
            size: 24,
            outlineColor: "#ffffff",
            outlineWidth: 2,
            labelText: entity.properties.type as string,
            labelFont: "12px monospace",
        };
    }

    getSelectionBehavior(entity: GeoEntity): SelectionBehavior | null {
        return {
            showTrail: false,
            flyToOffsetMultiplier: 2,
            flyToBaseDistance: 1000000,
        };
    }

    getFilterDefinitions(): FilterDefinition[] {
        return [
            {
                id: "severity",
                label: "Severity",
                type: "select",
                propertyKey: "severity",
                options: [
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                    { value: "critical", label: "Critical" },
                ]
            },
            {
                id: "type",
                label: "Attack Type",
                type: "select",
                propertyKey: "type",
                options: [
                    { value: "DDoS", label: "DDoS" },
                    { value: "Malware", label: "Malware" },
                    { value: "Intrusion", label: "Intrusion" },
                    { value: "Data Exfiltration", label: "Data Exfiltration" },
                    { value: "Ransomware", label: "Ransomware" }
                ]
            }
        ];
    }

    getLegend() {
        return [
            { label: "Critical", color: SEVERITY_COLORS.critical },
            { label: "High", color: SEVERITY_COLORS.high },
            { label: "Medium", color: SEVERITY_COLORS.medium },
            { label: "Low", color: SEVERITY_COLORS.low },
        ];
    }

    getServerConfig(): ServerPluginConfig {
        return {
            apiBasePath: "/api/external/cyber_attacks",
            pollingIntervalMs: 5000,
            historyEnabled: false, // DDoS maps are usually live-only
        };
    }
}
