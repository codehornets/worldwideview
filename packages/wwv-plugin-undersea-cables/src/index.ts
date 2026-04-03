import React, { useEffect, useRef } from "react";
import { Cable } from "lucide-react";
import * as Cesium from "cesium";
import type {
    GlobePlugin,
    GeoEntity,
    TimeRange,
    PluginContext,
    LayerConfig,
    CesiumEntityOptions,
} from "@worldwideview/wwv-plugin-sdk";

const UnderseaCablesRenderer: React.FC<{ viewer: Cesium.Viewer | null; enabled: boolean }> = ({ viewer, enabled }) => {
    const dataSourceRef = useRef<Cesium.GeoJsonDataSource | null>(null);

    useEffect(() => {
        if (!viewer || !enabled) {
            // Cleanup on disable
            if (viewer && dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
            return;
        }

        let isCancelled = false;

        async function loadCables() {
            if (!viewer) return;
            try {
                const dataSource = new Cesium.GeoJsonDataSource("undersea-cables");
                
                // Telegeography submarine cable map API
                const url = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json";
                
                await dataSource.load(url, {
                    stroke: Cesium.Color.fromCssColorString("#0ea5e9").withAlpha(0.6),
                    strokeWidth: 2,
                    clampToGround: true,
                });

                if (isCancelled) return;

                const entities = dataSource.entities.values;
                for (let i = 0; i < entities.length; i++) {
                    const entity = entities[i];
                    if (entity.polyline) {
                        entity.polyline.width = new Cesium.ConstantProperty(2);
                        entity.polyline.material = new Cesium.ColorMaterialProperty(
                            Cesium.Color.fromCssColorString("#0ea5e9").withAlpha(0.6)
                        );
                    }
                    const props = entity.properties ? entity.properties.getValue(Cesium.JulianDate.now()) : {};
                    let desc = `<table class="cesium-infoBox-defaultTable"><tbody>`;
                    for (const key in props) {
                        if (props.hasOwnProperty(key)) {
                            desc += `<tr><th>${key}</th><td>${props[key]}</td></tr>`;
                        }
                    }
                    desc += `</tbody></table>`;
                    entity.description = new Cesium.ConstantProperty(desc);
                }

                viewer.dataSources.add(dataSource);
                dataSourceRef.current = dataSource;
            } catch (err) {
                console.error("[UnderseaCablesPlugin] Failed to load data", err);
            }
        }

        loadCables();

        return () => {
            isCancelled = true;
            if (viewer && dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current);
                dataSourceRef.current = null;
            }
        };
    }, [viewer, enabled]);

    return null; // Side-effect only component
};

export class UnderseaCablesPlugin implements GlobePlugin {
    id = "undersea-cables";
    name = "Undersea Cables";
    description = "Displays the global network of submarine telecommunication cables.";
    icon = Cable;
    category = "infrastructure" as const;
    version = "1.0.0";
    
    async initialize(_ctx: PluginContext): Promise<void> {}
    
    destroy(): void {}

    async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> { return []; }

    getPollingInterval(): number { return 0; }

    getLayerConfig(): LayerConfig {
        return { color: "#0ea5e9", clusterEnabled: false, clusterDistance: 0 };
    }

    renderEntity(_entity: GeoEntity): CesiumEntityOptions {
        return { type: "polyline" }; // Fallback since actual rendering is via GlobeComponent
    }

    getGlobeComponent() {
        return UnderseaCablesRenderer;
    }
}
