"use client";

import { useStore } from "@/core/state/store";
import { pluginManager } from "@/core/plugins/PluginManager";
import { MapPin } from "lucide-react";

const CARD_WIDTH = 260;
const CARD_HEIGHT_EST = 180;
const OFFSET_X = 16;
const OFFSET_Y = 16;
const EDGE_PADDING = 12;

export function EntityInfoCard() {
    const hoveredEntity = useStore((s) => s.hoveredEntity);
    const screenPos = useStore((s) => s.hoveredScreenPosition);
    const selectedEntity = useStore((s) => s.selectedEntity);

    // Don't show the hover card if an entity is selected (IntelPanel is open)
    // or if the hovered entity IS the selected entity
    if (
        !hoveredEntity ||
        !screenPos ||
        (selectedEntity && selectedEntity.id === hoveredEntity.id)
    )
        return null;

    // Find plugin info
    const managed = pluginManager.getPlugin(hoveredEntity.pluginId);
    const PluginIcon = managed?.plugin.icon;
    const pluginName = managed?.plugin.name || hoveredEntity.pluginId;

    // Clamp position to keep card within viewport
    let x = screenPos.x + OFFSET_X;
    let y = screenPos.y + OFFSET_Y;

    if (typeof window !== "undefined") {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (x + CARD_WIDTH > vw - EDGE_PADDING) {
            x = screenPos.x - CARD_WIDTH - OFFSET_X;
        }
        if (y + CARD_HEIGHT_EST > vh - EDGE_PADDING) {
            y = screenPos.y - CARD_HEIGHT_EST - OFFSET_Y;
        }
        if (x < EDGE_PADDING) x = EDGE_PADDING;
        if (y < EDGE_PADDING) y = EDGE_PADDING;
    }

    // Format values
    const altitude = hoveredEntity.altitude;
    const altitudeDisplay =
        altitude !== undefined
            ? altitude >= 1000
                ? `${(altitude / 10).toFixed(0)} m` // Undo the 10x visual scale
                : `${(altitude / 10).toFixed(0)} m`
            : null;

    const speed = hoveredEntity.speed;
    const speedDisplay =
        speed !== undefined ? `${speed.toFixed(0)} m/s` : null;

    const heading = hoveredEntity.heading;
    const headingDisplay =
        heading !== undefined ? `${heading.toFixed(0)}°` : null;

    return (
        <div
            className="entity-info-card"
            style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${CARD_WIDTH}px`,
            }}
        >
            {/* Header */}
            <div className="entity-info-card__header">
                <span className="entity-info-card__icon">
                    {typeof PluginIcon === "string" ? (
                        PluginIcon
                    ) : PluginIcon ? (
                        <PluginIcon size={16} />
                    ) : (
                        <MapPin size={16} />
                    )}
                </span>
                <div className="entity-info-card__title-group">
                    <div className="entity-info-card__title">
                        {hoveredEntity.label || hoveredEntity.id}
                    </div>
                    <div className="entity-info-card__badge">{pluginName}</div>
                </div>
            </div>

            {/* Properties */}
            <div className="entity-info-card__props">
                <div className="entity-info-card__prop">
                    <span className="entity-info-card__prop-key">Position</span>
                    <span className="entity-info-card__prop-value">
                        {hoveredEntity.latitude.toFixed(3)}°,{" "}
                        {hoveredEntity.longitude.toFixed(3)}°
                    </span>
                </div>
                {altitudeDisplay && (
                    <div className="entity-info-card__prop">
                        <span className="entity-info-card__prop-key">
                            Altitude
                        </span>
                        <span className="entity-info-card__prop-value">
                            {altitudeDisplay}
                        </span>
                    </div>
                )}
                {speedDisplay && (
                    <div className="entity-info-card__prop">
                        <span className="entity-info-card__prop-key">
                            Speed
                        </span>
                        <span className="entity-info-card__prop-value">
                            {speedDisplay}
                        </span>
                    </div>
                )}
                {headingDisplay && (
                    <div className="entity-info-card__prop">
                        <span className="entity-info-card__prop-key">
                            Heading
                        </span>
                        <span className="entity-info-card__prop-value">
                            {headingDisplay}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer hint */}
            <div className="entity-info-card__hint">Click for details</div>
        </div>
    );
}
