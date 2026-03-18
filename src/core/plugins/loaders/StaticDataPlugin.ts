// ─── StaticDataPlugin ────────────────────────────────────────
// Loads Format 2 plugins: GeoJSON file + rendering config.
// No polling, no API calls — data is converted once at init.

import type {
    WorldPlugin,
    GeoEntity,
    TimeRange,
    PluginContext,
    LayerConfig,
    CesiumEntityOptions,
    PluginCategory,
} from "../PluginTypes";
import type { PluginManifest, RenderingConfig } from "../PluginManifest";
import type { GeoJsonFeature, GeoJsonGeometry } from "@/types/geojson";

// ─── Geometry → Representative Point ────────────────────────

interface RepPoint {
    lat: number;
    lon: number;
    alt?: number;
}

function representativePoint(geom: GeoJsonGeometry): RepPoint {
    switch (geom.type) {
        case "Point": {
            const [lon, lat, alt] = geom.coordinates;
            return { lat, lon, ...(alt !== undefined ? { alt } : {}) };
        }
        case "MultiPoint":
        case "LineString": {
            const first = geom.coordinates[0] as number[];
            return { lat: first[1], lon: first[0] };
        }
        case "Polygon":
        case "MultiLineString": {
            const ring = geom.coordinates[0] as number[][];
            return { lat: ring[0][1], lon: ring[0][0] };
        }
        case "MultiPolygon": {
            const poly = geom.coordinates[0] as number[][][];
            return { lat: poly[0][0][1], lon: poly[0][0][0] };
        }
        default:
            return { lat: 0, lon: 0 };
    }
}

// ─── Feature → GeoEntity ────────────────────────────────────

function featureToEntity(
    feature: GeoJsonFeature,
    pluginId: string,
    index: number,
    labelField?: string,
): GeoEntity {
    const point = representativePoint(feature.geometry);
    const featureId = feature.id ?? index;

    return {
        id: `${pluginId}-${featureId}`,
        pluginId,
        latitude: point.lat,
        longitude: point.lon,
        altitude: point.alt,
        timestamp: new Date(),
        label: labelField
            ? (feature.properties[labelField] as string) ?? undefined
            : (feature.properties.name as string) ?? undefined,
        properties: {
            ...feature.properties,
            _geometryType: feature.geometry.type,
        },
    };
}

// ─── Rendering Config → LayerConfig ─────────────────────────

function renderingToLayerConfig(rendering?: RenderingConfig): LayerConfig {
    return {
        color: rendering?.color ?? "#3b82f6",
        clusterEnabled: rendering?.clusterEnabled ?? false,
        clusterDistance: rendering?.clusterDistance ?? 0,
        minZoomLevel: rendering?.minZoomLevel,
        maxEntities: rendering?.maxEntities,
    };
}

// ─── StaticDataPlugin Class ─────────────────────────────────

export class StaticDataPlugin implements WorldPlugin {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly icon: string;
    readonly category: PluginCategory;
    readonly version: string;
    readonly pluginType = "data-layer" as const;
    readonly capabilities: ["data:own"] = ["data:own"];

    private entities: GeoEntity[] = [];
    private readonly rendering: RenderingConfig | undefined;

    constructor(
        private readonly manifest: PluginManifest,
        private readonly features: GeoJsonFeature[],
    ) {
        this.id = manifest.id;
        this.name = manifest.name;
        this.description = manifest.description ?? "";
        this.icon = manifest.icon ?? "📍";
        this.category = (manifest.category as PluginCategory) ?? "custom";
        this.version = manifest.version;
        this.rendering = manifest.rendering;
    }

    async initialize(_ctx: PluginContext): Promise<void> {
        this.entities = this.features.map((feature, i) =>
            featureToEntity(
                feature,
                this.id,
                i,
                this.rendering?.labelField,
            ),
        );
    }

    destroy(): void {
        this.entities = [];
    }

    async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
        return this.entities;
    }

    getPollingInterval(): number {
        return 0; // Static — never re-fetch
    }

    getLayerConfig(): LayerConfig {
        return renderingToLayerConfig(this.rendering);
    }

    renderEntity(_entity: GeoEntity): CesiumEntityOptions {
        return {
            type: this.rendering?.entityType ?? "point",
            color: this.rendering?.color ?? "#3b82f6",
            iconUrl: this.rendering?.icon,
        };
    }
}
