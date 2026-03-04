"use client";

import React, { useEffect, useRef, useCallback, useMemo, useState } from "react";
import {
    Viewer,
    Entity,
    BillboardGraphics,
    PointGraphics,
} from "resium";
import {
    Ion,
    GeoJsonDataSource,
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
    JulianDate,
    PointPrimitiveCollection,
    BillboardCollection,
    LabelCollection,
    Ellipsoid,
    CullingVolume,
    BoundingSphere,
    Intersect,
    Cartographic,
    DistanceDisplayCondition,
    LabelStyle,
    LabelGraphics,
    PolylineGraphics,
    ClassificationType,
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
    const [viewerReady, setViewerReady] = useState(false);
    const setSelectedEntity = useStore((s) => s.setSelectedEntity);
    const entitiesByPlugin = useStore((s) => s.entitiesByPlugin);
    const layers = useStore((s) => s.layers);
    const showLabels = useStore((s) => s.mapConfig.showLabels);
    const bordersDataSourceRef = useRef<import("cesium").GeoJsonDataSource | null>(null);

    // Collect all visible entities (memoized to avoid unnecessary effect re-runs)
    const visibleEntities = useMemo(() => {
        const result: Array<{ entity: GeoEntity; options: CesiumEntityOptions }> = [];
        pluginManager.getAllPlugins().forEach((managed) => {
            if (!layers[managed.plugin.id]?.enabled) return;
            const entities = entitiesByPlugin[managed.plugin.id] || [];
            entities.forEach((entity) => {
                const options = managed.plugin.renderEntity(entity);
                result.push({ entity, options });
            });
        });
        return result;
    }, [layers, entitiesByPlugin]);

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

    // Handle camera position changes from store
    const cameraLat = useStore((s) => s.cameraLat);
    const cameraLon = useStore((s) => s.cameraLon);
    const cameraAlt = useStore((s) => s.cameraAlt);
    const cameraHeading = useStore((s) => s.cameraHeading);
    const cameraPitch = useStore((s) => s.cameraPitch);

    useEffect(() => {
        if (!viewerRef.current) return;

        // Use flyTo for smooth movement
        viewerRef.current.camera.flyTo({
            destination: Cartesian3.fromDegrees(cameraLon, cameraLat, cameraAlt),
            orientation: {
                heading: CesiumMath.toRadians(cameraHeading),
                pitch: CesiumMath.toRadians(cameraPitch),
                roll: 0,
            },
            duration: 2.0,
        });
    }, [cameraLat, cameraLon, cameraAlt, cameraHeading, cameraPitch]);

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

    // Handle Labels & Custom Borders Layer
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        // Ensure globe stays hidden (we only need it for draping if required)
        viewer.scene.globe.show = false;

        if (showLabels) {
            // Load custom border GeoJSON (once)
            if (!bordersDataSourceRef.current) {
                GeoJsonDataSource.load('/borders.geojson', {
                    clampToGround: true,
                    stroke: Color.CYAN.withAlpha(0.6),
                    strokeWidth: 1.5,
                    fill: Color.TRANSPARENT,
                }).then((ds) => {
                    const viewer = viewerRef.current;
                    if (!viewer) return;

                    // Iterate and add labels to the center of the entities
                    const entities = ds.entities.values;
                    for (let i = 0; i < entities.length; i++) {
                        const entity = entities[i];
                        if (entity.name && entity.polygon) {
                            const hierarchy = entity.polygon.hierarchy?.getValue(import("cesium").JulianDate.now());

                            if (hierarchy) {
                                const positions = hierarchy.positions;
                                if (positions && positions.length > 0) {
                                    // 1. Label
                                    const center = BoundingSphere.fromPoints(positions).center;
                                    const cartographic = Cartographic.fromCartesian(center);
                                    // We elevate it slightly, but really we rely on disableDepthTestDistance
                                    cartographic.height = 1000;

                                    entity.position = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height) as any;
                                    entity.label = new LabelGraphics({
                                        text: entity.name,
                                        font: "bold 14px Inter, sans-serif",
                                        fillColor: Color.WHITE,
                                        outlineColor: Color.BLACK.withAlpha(0.8),
                                        outlineWidth: 3,
                                        style: LabelStyle.FILL_AND_OUTLINE,
                                        verticalOrigin: VerticalOrigin.CENTER,
                                        horizontalOrigin: HorizontalOrigin.CENTER,
                                        distanceDisplayCondition: new DistanceDisplayCondition(10.0, 8000000.0),
                                        scaleByDistance: new NearFarScalar(1.5e6, 1.2, 8e6, 0.0),
                                        disableDepthTestDistance: Number.POSITIVE_INFINITY, // Ensure it shows through 3D tiles
                                    });

                                    // 2. Borders
                                    // Polygons don't show outlines well when clamped, so we construct a Polyline
                                    entity.polyline = new PolylineGraphics({
                                        positions: [...positions, positions[0]], // Close the loop
                                        width: 1.5,
                                        material: Color.CYAN.withAlpha(0.5),
                                        clampToGround: true,
                                        classificationType: ClassificationType.BOTH, // Drape on 3D tiles and terrain
                                    });
                                    // Hide original polygon
                                    entity.polygon.show = false as any;
                                }
                            }
                        }
                    }

                    bordersDataSourceRef.current = ds;
                    viewer.dataSources.add(ds);
                }).catch((err) => {
                    console.warn('[GlobeView] Failed to load borders GeoJSON', err);
                });
            } else if (!viewer.dataSources.contains(bordersDataSourceRef.current)) {
                viewer.dataSources.add(bordersDataSourceRef.current);
            }
        } else {
            // Remove border data source
            if (bordersDataSourceRef.current && viewer.dataSources.contains(bordersDataSourceRef.current)) {
                viewer.dataSources.remove(bordersDataSourceRef.current, false);
            }
        }
    }, [showLabels]);

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

        // Signal that the viewer is ready — this triggers the rendering effect
        setViewerReady(true);
    }, []);

    // Native Cesium Rendering for Entities
    // NOTE: viewerReady is in deps so this effect re-runs once the viewer initialises,
    // ensuring entities that loaded before the viewer was ready get rendered.
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer || !viewerReady) return;

        const points = (viewer as any)._wwvPoints as import("cesium").PointPrimitiveCollection;
        const billboards = (viewer as any)._wwvBillboards as import("cesium").BillboardCollection;
        const labels = (viewer as any)._wwvLabels as import("cesium").LabelCollection;

        if (!points || !billboards || !labels) return;

        points.removeAll();
        billboards.removeAll();
        labels.removeAll();

        const animatables: Array<{
            primitive: any;
            labelPrimitive?: any;
            entity: GeoEntity;
            posRef: import("cesium").Cartesian3;
        }> = [];

        for (const { entity, options } of visibleEntities) {
            const position = Cartesian3.fromDegrees(
                entity.longitude,
                entity.latitude,
                entity.altitude || 0
            );
            const color = getEntityColor(entity, options);
            const clickId = { _wwvEntity: entity };

            let addedPrimitive: any;

            if (options.type === "billboard" && options.iconUrl) {
                addedPrimitive = billboards.add({
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
                addedPrimitive = points.add({
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

            let addedLabel: any;
            if (options.labelText) {
                addedLabel = labels.add({
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

            animatables.push({
                primitive: addedPrimitive,
                labelPrimitive: addedLabel,
                entity,
                posRef: position,
            });
        }

        // --- Animation Loop ---
        let frameCount = 0;
        let lastLogTime = 0;
        let totalLoopTime = 0;

        const updatePositions = () => {
            if (!viewerRef.current) return;
            const state = useStore.getState();

            const loopStart = performance.now();

            // Use current time from timeline if in playback, or clock time if live (to prevent stuttering)
            const nowMs = state.isPlaybackMode ? state.currentTime.getTime() : Date.now();

            const cam = viewerRef.current.camera;
            const camPos = cam.positionWC;
            const R_WGS84_MIN = 6356752.0; // Safe underestimate for occlusion
            const R2 = R_WGS84_MIN * R_WGS84_MIN;
            const camDistSqr = Cartesian3.magnitudeSquared(camPos);
            const Dh = Math.sqrt(Math.max(0, camDistSqr - R2));

            let visibleCount = 0;

            for (let i = 0; i < animatables.length; i++) {
                const item = animatables[i];
                const { primitive, labelPrimitive, entity, posRef } = item;

                // --- Position Extrapolation ---
                if (entity.timestamp && entity.speed !== undefined && entity.heading !== undefined) {
                    // Calculate time difference in seconds. Can be negative in playback if nowMs is before the snapshot timestamp.
                    const dtSec = (nowMs - entity.timestamp.getTime()) / 1000;

                    // Allow extrapolation up to 5 minutes forward or backward
                    if (Math.abs(dtSec) <= 300) {
                        const distanceM = entity.speed * dtSec;
                        const angularDist = distanceM / 6371000;

                        const lat1 = CesiumMath.toRadians(entity.latitude);
                        const lon1 = CesiumMath.toRadians(entity.longitude);
                        const brng = CesiumMath.toRadians(entity.heading);

                        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDist) + Math.cos(lat1) * Math.sin(angularDist) * Math.cos(brng));
                        const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(angularDist) * Math.cos(lat1), Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2));

                        // Mutate posRef in place (no GC allocation)
                        Cartesian3.fromRadians(lon2, lat2, entity.altitude || 0, Ellipsoid.WGS84, posRef);
                        primitive.position = posRef;
                        if (labelPrimitive) {
                            labelPrimitive.position = posRef;
                        }
                    }
                }

                // --- Horizon Culling ---
                // The max line-of-sight distance without hitting the Earth is Dh + Dph.
                const posDistSqr = Cartesian3.magnitudeSquared(posRef);
                const Dph = Math.sqrt(Math.max(0, posDistSqr - R2));
                const distanceToPoint = Cartesian3.distance(camPos, posRef);

                const isVisible = distanceToPoint <= (Dh + Dph);
                primitive.show = isVisible;
                if (labelPrimitive) {
                    labelPrimitive.show = isVisible;
                }
                if (isVisible) visibleCount++;
            }

            const loopTime = performance.now() - loopStart;
            totalLoopTime += loopTime;
            frameCount++;

            if (nowMs - lastLogTime > 2000) {
                const avgLoopTime = totalLoopTime / frameCount;
                console.log(`[GlobeView] Render Loop: ${avgLoopTime.toFixed(2)}ms avg over ${frameCount} frames. Total entities: ${animatables.length}. Visible entities: ${visibleCount}`);
                frameCount = 0;
                totalLoopTime = 0;
                lastLogTime = nowMs;
            }
        };

        viewer.scene.preUpdate.addEventListener(updatePositions);

        return () => {
            if (viewer && !viewer.isDestroyed()) {
                viewer.scene.preUpdate.removeEventListener(updatePositions);
            }
        };
    }, [visibleEntities, viewerReady]);

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
