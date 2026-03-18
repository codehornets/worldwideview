"use client";

import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  MapPin, Plane, Ship, Shield, Flame, Camera, Map, Swords,
  Wrench, Atom, Landmark, Package,
} from "lucide-react";

/** Map of lucide icon name strings → React components. */
const ICON_MAP: Record<string, LucideIcon> = {
  MapPin, Plane, Ship, Shield, Flame, Camera, Map, Swords,
  Wrench, Atom, Landmark, Package,
};

interface PluginIconProps {
    icon: string | ComponentType<{ size?: number; color?: string }>;
    size?: number;
    color?: string;
}

/**
 * Renders a plugin icon consistently across the app.
 * Handles lucide icon name strings, emoji strings, and
 * React component icons (e.g. lucide-react components).
 */
export function PluginIcon({ icon, size = 18, color }: PluginIconProps) {
    if (typeof icon === "string") {
        const Mapped = ICON_MAP[icon];
        if (Mapped) return <Mapped size={size} color={color} />;
        return <span>{icon}</span>;
    }

    const IconComponent = icon;
    if (IconComponent) {
        return <IconComponent size={size} color={color} />;
    }

    return <MapPin size={size} />;
}
