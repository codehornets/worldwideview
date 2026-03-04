"use client";

import React, { useEffect, useRef, useCallback, useMemo } from "react";
import {
    Viewer,
    Entity,
    BillboardGraphics,
    PointGraphics,
    LabelGraphics,
} from "resium";
import {
    Ion,
    createGooglePhotorealistic3DTileset,
    Cartesian3,
    Color,
    VerticalOrigin,
    HorizontalOrigin,
    NearFarScalar,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    defined,
    Math as CesiumMath,
    CallbackProperty,
    JulianDate,
    PointPrimitiveCollection,
    BillboardCollection,
    LabelCollection,
} from "cesium";
import type { Viewer as CesiumViewer } from "cesium";
import { useStore } from "@/core/state/store";
import { dataBus } from "@/core/data/DataBus";
import { pluginManager } from "@/core/plugins/PluginManager";
import type { GeoEntity, CesiumEntityOptions } from "@/core/plugins/PluginTypes";

// Set Cesium Ion token
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_CESIUM_TOKEN) {
    Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_TOKEN;
}

// Camera presets
const CAMERA_PRESETS: Record<string, { lat: number; lon: number; alt: number; heading: number; pitch: number }> = {
    global: { lat: 20, lon: 0, alt: 20000000, heading: 0, pitch: -90 },
    americas: { lat: 15, lon: -80, alt: 12000000, heading: 0, pitch: -80 },
    europe: { lat: 50, lon: 15, alt: 6000000, heading: 0, pitch: -75 },
    mena: { lat: 28, lon: 42, alt: 6000000, heading: 0, pitch: -75 },
    asiaPacific: { lat: 30, lon: 105, alt: 10000000, heading: 0, pitch: -80 },
    africa: { lat: 2, lon: 22, alt: 8000000, heading: 0, pitch: -80 },
    oceania: { lat: -25, lon: 140, alt: 7000000, heading: 0, pitch: -75 },
    arctic: { lat: 80, lon: 0, alt: 6000000, heading: 0, pitch: -85 },
};

function getEntityColor(entity: GeoEntity, options: CesiumEntityOptions): Color {
    if (options.color) {
        return Color.fromCssColorString(options.color);
    }
    return Color.CYAN;
}


export default function GlobeView() {
    const viewerRef = useRef<CesiumViewer | null>(null);
    const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
    const setSelectedEntity = useStore((s) => s.setSelectedEntity);
    const entitiesByPlugin = useStore((s) => s.entitiesByPlugin);
    const layers = useStore((s) => s.layers);

    // Collect all visible entities
    const visibleEntities: Array<{ entity: GeoEntity; options: CesiumEntityOptions }> = [];
    pluginManager.getAllPlugins().forEach((managed) => {
        if (!layers[managed.plugin.id]?.enabled) return;
        const entities = entitiesByPlugin[managed.plugin.id] || [];
        entities.forEach((entity) => {
            const options = managed.plugin.renderEntity(entity);
            visibleEntities.push({ entity, options });
        });
    });

    // Fly to camera preset
    const flyToPreset = useCallback((presetId: string) => {
        const preset = CAMERA_PRESETS[presetId];
        if (!preset || !viewerRef.current) return;
        viewerRef.current.camera.flyTo({
            destination: Cartesian3.fromDegrees(preset.lon, preset.lat, preset.alt),
            orientation: {
                heading: CesiumMath.toRadians(preset.heading),
                pitch: CesiumMath.toRadians(preset.pitch),
                roll: 0,
            },
            duration: 2.5,
        });
    }, []);

    // Listen for camera preset events
    useEffect(() => {
        const unsub = dataBus.on("cameraPreset", ({ presetId }) => {
            flyToPreset(presetId);
        });
        return unsub;
    }, [flyToPreset]);

    // Set up click handler for entity selection
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        handlerRef.current = new ScreenSpaceEventHandler(viewer.scene.canvas);
        handlerRef.current.setInputAction(
            (event: { position: { x: number; y: number } }) => {
                const picked = viewer.scene.pick(event.position as import("cesium").Cartesian2);
                if (defined(picked) && picked.id && picked.id._wwvEntity) {
                    setSelectedEntity(picked.id._wwvEntity as GeoEntity);
                } else {
                    setSelectedEntity(null);
                }
            },
            ScreenSpaceEventType.LEFT_CLICK
        );

        return () => {
            handlerRef.current?.destroy();
        };
    }, [setSelectedEntity]);

    // Init Google 3D tiles
    const handleViewerReady = useCallback(async (viewer: CesiumViewer) => {
        viewerRef.current = viewer;

        // Performance optimizations
        viewer.scene.requestRenderMode = false; // Disabled to allow dynamic entity updates
        viewer.scene.maximumRenderTimeChange = Infinity;
        viewer.scene.debugShowFramesPerSecond = false;

        // Remove default imagery/terrain
        viewer.scene.globe.show = false;

        // Add Google Photorealistic 3D Tiles
        try {
            const tileset = await createGooglePhotorealistic3DTileset({
                key: process.env.GOOGLE_MAPS_API_KEY || undefined,
            });
            viewer.scene.primitives.add(tileset);
        } catch (err) {
            console.warn("[GlobeView] Failed to load Google 3D Tiles, falling back to default globe:", err);
            viewer.scene.globe.show = true;
        }

        // Initialize empty collections on the viewer for reuse
        (viewer as any)._wwvPoints = viewer.scene.primitives.add(new PointPrimitiveCollection());
        (viewer as any)._wwvBillboards = viewer.scene.primitives.add(new BillboardCollection());
        (viewer as any)._wwvLabels = viewer.scene.primitives.add(new LabelCollection());

        // Set initial camera position
        viewer.camera.setView({
            destination: Cartesian3.fromDegrees(0, 20, 20000000),
        });
    }, []);

    // Native Cesium Rendering for Entities
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        const points = (viewer as any)._wwvPoints as import("cesium").PointPrimitiveCollection;
        const billboards = (viewer as any)._wwvBillboards as import("cesium").BillboardCollection;
        const labels = (viewer as any)._wwvLabels as import("cesium").LabelCollection;

        if (!points || !billboards || !labels) return;

        points.removeAll();
        billboards.removeAll();
        labels.removeAll();

        for (const { entity, options } of visibleEntities) {
            const position = Cartesian3.fromDegrees(
                entity.longitude,
                entity.latitude,
                entity.altitude || 0
            );
            const color = getEntityColor(entity, options);
            const clickId = { _wwvEntity: entity };

            if (options.type === "billboard" && options.iconUrl) {
                billboards.add({
                    position,
                    image: options.iconUrl,
                    scale: 0.5,
                    verticalOrigin: VerticalOrigin.CENTER,
                    horizontalOrigin: HorizontalOrigin.CENTER,
                    rotation: options.rotation
                        ? -CesiumMath.toRadians(options.rotation)
                        : 0,
                    color,
                    scaleByDistance: new NearFarScalar(1e3, 1.0, 1e7, 0.3),
                    id: clickId,
                });
            } else {
                points.add({
                    position,
                    pixelSize: options.size || 6,
                    color,
                    outlineColor: options.outlineColor
                        ? Color.fromCssColorString(options.outlineColor)
                        : Color.BLACK,
                    outlineWidth: options.outlineWidth || 1,
                    scaleByDistance: new NearFarScalar(1e3, 1.0, 1e7, 0.4),
                    id: clickId,
                });
            }

            if (options.labelText) {
                labels.add({
                    position,
                    text: options.labelText,
                    font: options.labelFont || "12px Inter, sans-serif",
                    fillColor: Color.WHITE,
                    outlineColor: Color.BLACK,
                    outlineWidth: 2,
                    verticalOrigin: VerticalOrigin.BOTTOM,
                    pixelOffset: { x: 0, y: -12 } as any,
                    scaleByDistance: new NearFarScalar(1e3, 1.0, 5e6, 0.0),
                    id: clickId,
                });
            }
        }
    }, [visibleEntities]);

    return (
        <Viewer
            full
            ref={(e) => {
                if (e?.cesiumElement && !viewerRef.current) {
                    handleViewerReady(e.cesiumElement);
                }
            }}
            animation={false}
            baseLayerPicker={false}
            fullscreenButton={false}
            geocoder={false}
            homeButton={false}
            infoBox={false}
            navigationHelpButton={false}
            sceneModePicker={false}
            selectionIndicator={false}
            timeline={false}
            vrButton={false}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
    );
}
