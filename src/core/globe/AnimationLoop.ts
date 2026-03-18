import {
    Cartesian3,
    Color,
    Math as CesiumMath,
    Ellipsoid,
    BoundingSphere,
    Intersect,
    CullingVolume
} from "cesium";
import type { Viewer as CesiumViewer } from "cesium";
import type { GeoEntity, CesiumEntityOptions } from "@/core/plugins/PluginTypes";
import { useStore } from "@/core/state/store";
import { getEntityColor, createLabel, removeLabel, type AnimatableItem } from "./EntityRenderer";
import { updateModelTransform } from "./ModelManager";

/** Returns a touch-friendly default point size: larger on mobile. */
function defaultPointSize(): number {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return 12;
    return 8;
}

const HIGHLIGHT_COLOR_SELECTED = Color.fromCssColorString("#00fff7");
const HIGHLIGHT_COLOR_HOVERED = Color.YELLOW;

const R_WGS84_MIN = 6356752.0;
const R2 = R_WGS84_MIN * R_WGS84_MIN;

// Pre-allocate objects for Zero-Allocation Loop
const scratchDisplacement = new Cartesian3();
const scratchNorth = new Cartesian3();
const scratchEast = new Cartesian3();
const scratchVelocity = new Cartesian3();
const scratchSphere = new BoundingSphere(new Cartesian3(), 100);
const scratchNorthPole = new Cartesian3(0, 0, 1);
const scratchSurfaceNormal = new Cartesian3();

/** How often to re-evaluate culling for static entities (every N frames) */
const STATIC_CULL_INTERVAL = 4;

/**
 * Creates the per-frame update function for entity position extrapolation,
 * horizon culling, frustum culling, and highlight styling.
 * Accepts a cached array reference that is rebuilt externally only on data changes.
 */
export function createUpdateLoop(
    viewer: CesiumViewer,
    animatablesRef: { current: AnimatableItem[] },
    hoveredEntityIdRef: React.MutableRefObject<string | null>
): () => void {
    let frameCount = 0;
    let cullingVolume = new CullingVolume();

    return () => {
        if (!viewer || viewer.isDestroyed()) return;

        const animatables = animatablesRef.current;
        if (animatables.length === 0) return;

        const labelsCollection = (viewer as any)._wwvLabels;
        const state = useStore.getState();
        const nowMs = state.isPlaybackMode ? state.currentTime.getTime() : Date.now();
        const cam = viewer.camera;
        const camPos = cam.positionWC;
        const camDistSqr = Cartesian3.magnitudeSquared(camPos);

        if (camDistSqr <= R2) return;

        const Dh = Math.sqrt(camDistSqr - R2);
        const frame = frameCount++;
        const isFullUpdate = frame % 2 === 0;
        // Static entities only re-cull every STATIC_CULL_INTERVAL frames
        const isStaticCullFrame = frame % STATIC_CULL_INTERVAL === 0;

        cullingVolume = cam.frustum.computeCullingVolume(cam.positionWC, cam.directionWC, cam.upWC);

        for (let i = 0; i < animatables.length; i++) {
            const item = animatables[i];
            const { primitive, entity, posRef } = item;
            const isModel = item.options.type === "model";
            const isSelected = state.selectedEntity?.id === entity.id;
            const isHovered = hoveredEntityIdRef.current === entity.id;

            if (!primitive || primitive.isDestroyed?.()) continue;

            // For static entities (no speed), skip culling on non-cull frames
            const isDynamic = entity.speed !== undefined && entity.speed > 0;
            if (!isDynamic && !isStaticCullFrame && !isSelected && !isHovered) continue;

            // 1. Horizon culling FIRST (cheaper: just math, rejects ~50% of globe)
            const posDistSqr = Cartesian3.magnitudeSquared(posRef);
            const Dph = Math.sqrt(Math.max(0, posDistSqr - R2));
            const distSqr = Cartesian3.distanceSquared(camPos, posRef);
            const horizonLimit = Dh + Dph;
            const isVisible = distSqr <= horizonLimit * horizonLimit;

            if (!isVisible && !isSelected && !isHovered) {
                if (primitive.show !== false) primitive.show = false;
                if (item.labelPrimitive && !item.labelPrimitive.isDestroyed?.() && item.labelPrimitive.show !== false) item.labelPrimitive.show = false;
                if (item.labelPrimitive && !item.labelPrimitive.isDestroyed?.() && labelsCollection) removeLabel(item, labelsCollection);
                continue;
            }

            // 2. Frustum Culling (more expensive: plane-sphere intersection tests)
            scratchSphere.center = posRef;
            scratchSphere.radius = 1000;
            const intersect = cullingVolume.computeVisibility(scratchSphere);
            const inFrustum = intersect !== Intersect.OUTSIDE;

            if (!inFrustum && !isSelected && !isHovered) {
                if (primitive.show !== false) primitive.show = false;
                if (item.labelPrimitive && !item.labelPrimitive.isDestroyed?.() && item.labelPrimitive.show !== false) item.labelPrimitive.show = false;
                continue;
            }

            // 3. Position extrapolation (for moving entities)
            if (entity.timestamp && entity.speed !== undefined && entity.heading !== undefined) {
                if (isFullUpdate || isSelected || isHovered) {
                    extrapolatePosition(item, nowMs);
                    if (isModel) {
                        updateModelTransform(item, item.posRef, entity.heading);
                    }
                }
            }

            // Don't show billboard if LOD hook has promoted this item to a 3D model
            if (item._modelPromoted) continue;

            if (primitive.show !== true) primitive.show = true;

            // 4. Highlight styling
            if (!isModel) {
                applyHighlight(item, isSelected, isHovered);
            } else {
                if (isSelected && primitive.silhouetteSize !== 2) {
                    primitive.silhouetteSize = 2;
                } else if (isHovered && primitive.silhouetteSize !== 1) {
                    primitive.silhouetteSize = 1;
                } else if (!isSelected && !isHovered && primitive.silhouetteSize !== 0) {
                    primitive.silhouetteSize = 0;
                }
            }

            // 5. Label visibility and lazy creation
            const distanceToPoint = Math.sqrt(distSqr);
            const showLabel = isVisible && (distanceToPoint < 500000 || isSelected || isHovered);

            if (showLabel) {
                if (!item.labelPrimitive && labelsCollection) {
                    createLabel(item, labelsCollection);
                }
                if (item.labelPrimitive && !item.labelPrimitive.isDestroyed?.()) {
                    if (item.labelPrimitive.show !== true) item.labelPrimitive.show = true;
                    const targetFillColor = isSelected ? HIGHLIGHT_COLOR_SELECTED : Color.WHITE;
                    if (!Color.equals(item.labelPrimitive.fillColor, targetFillColor)) {
                        item.labelPrimitive.fillColor = targetFillColor;
                    }
                }
            } else {
                if (item.labelPrimitive && !item.labelPrimitive.isDestroyed?.()) {
                    if (item.labelPrimitive.show !== false) item.labelPrimitive.show = false;
                    if (labelsCollection) removeLabel(item, labelsCollection);
                }
            }
        }
    };
}

/** Extrapolate entity position forward/backward in time using zero-allocation mathematics. */
function extrapolatePosition(item: AnimatableItem, nowMs: number): void {
    const { entity, posRef } = item;
    if (!entity.timestamp) return;
    const timestamp = typeof entity.timestamp === 'string' ? new Date(entity.timestamp) : entity.timestamp;

    const dtSec = (nowMs - timestamp.getTime()) / 1000;
    if (Math.abs(dtSec) > 300) return;

    // Cache base position and velocity vector only once
    if (!item.velocityVector) {
        const headingRad = CesiumMath.toRadians(entity.heading!);
        Ellipsoid.WGS84.geodeticSurfaceNormal(posRef, scratchSurfaceNormal);

        Cartesian3.cross(scratchNorthPole, scratchSurfaceNormal, scratchNorth);
        Cartesian3.cross(scratchSurfaceNormal, scratchNorth, scratchNorth);
        Cartesian3.normalize(scratchNorth, scratchNorth);

        Cartesian3.cross(scratchNorth, scratchSurfaceNormal, scratchEast);
        Cartesian3.normalize(scratchEast, scratchEast);

        Cartesian3.multiplyByScalar(scratchNorth, Math.cos(headingRad), scratchVelocity);
        Cartesian3.multiplyByScalar(scratchEast, Math.sin(headingRad), scratchEast);
        Cartesian3.add(scratchVelocity, scratchEast, scratchVelocity);
        Cartesian3.multiplyByScalar(scratchVelocity, entity.speed!, scratchVelocity);

        item.basePosition = Cartesian3.clone(posRef);
        item.velocityVector = Cartesian3.clone(scratchVelocity);
    }

    // If static, only set position once
    if (entity.speed === 0) {
        if (item.primitive && !item.primitive.isDestroyed?.() && item.primitive.position !== posRef) {
            item.primitive.position = posRef;
            if (item.labelPrimitive && !item.labelPrimitive.isDestroyed?.()) item.labelPrimitive.position = posRef;
        }
        return;
    }

    // Apply zero-allocation displacement calculation
    Cartesian3.multiplyByScalar(item.velocityVector, dtSec, scratchDisplacement);
    Cartesian3.add(item.basePosition!, scratchDisplacement, posRef);

    if (item.primitive && !item.primitive.isDestroyed?.()) item.primitive.position = posRef;
    if (item.labelPrimitive && !item.labelPrimitive.isDestroyed?.()) item.labelPrimitive.position = posRef;
}

/** Apply selected/hovered/normal highlight styling. */
function applyHighlight(item: AnimatableItem, isSelected: boolean, isHovered: boolean): void {
    const { primitive, options } = item;

    let targetState: 'selected' | 'hovered' | 'normal' = 'normal';
    if (isSelected) targetState = 'selected';
    else if (isHovered) targetState = 'hovered';

    if (item.lastHighlightState === targetState) return;
    item.lastHighlightState = targetState;

    if (targetState === 'selected') {
        primitive.color = HIGHLIGHT_COLOR_SELECTED;
        if (options.type === "billboard") {
            primitive.scale = 0.7;
        } else {
            primitive.pixelSize = (options.size || defaultPointSize()) * 2.0;
            primitive.outlineColor = HIGHLIGHT_COLOR_SELECTED;
            primitive.outlineWidth = 3;
        }
    } else if (targetState === 'hovered') {
        primitive.color = HIGHLIGHT_COLOR_HOVERED;
        if (options.type === "billboard") {
            primitive.scale = 0.6;
        } else {
            primitive.pixelSize = (options.size || defaultPointSize()) * 1.5;
            primitive.outlineColor = HIGHLIGHT_COLOR_HOVERED;
            primitive.outlineWidth = 2;
        }
    } else {
        primitive.color = item.baseColor;
        if (options.type === "billboard") {
            primitive.scale = 0.5;
        } else {
            primitive.pixelSize = options.size || defaultPointSize();
            primitive.outlineColor = item.baseOutlineColor;
            primitive.outlineWidth = options.outlineWidth || 1;
        }
    }
}
