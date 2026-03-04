"use client";

import { useStore } from "@/core/state/store";
import { dataBus } from "@/core/data/DataBus";
import { pluginManager } from "@/core/plugins/PluginManager";

const REGIONS = [
    { id: "global", label: "🌍 Global" },
    { id: "americas", label: "🌎 Americas" },
    { id: "europe", label: "🇪🇺 Europe" },
    { id: "mena", label: "🕌 MENA" },
    { id: "asiaPacific", label: "🌏 Asia" },
    { id: "africa", label: "🌍 Africa" },
    { id: "oceania", label: "🦘 Oceania" },
    { id: "arctic", label: "❄️ Arctic" },
];

const TIME_WINDOWS = ["1h", "6h", "24h", "48h", "7d"] as const;

export function Header() {
    const timeWindow = useStore((s) => s.timeWindow);
    const setTimeWindow = useStore((s) => s.setTimeWindow);
    const toggleLeftSidebar = useStore((s) => s.toggleLeftSidebar);

    return (
        <header className="header glass-panel">
            <div className="header__brand">
                <button
                    className="btn btn--icon"
                    onClick={toggleLeftSidebar}
                    title="Toggle layers"
                >
                    ☰
                </button>
                <div>
                    <div className="header__logo">WorldWideView</div>
                    <div className="header__subtitle">Geospatial Intelligence</div>
                </div>
            </div>
            <div className="header__controls">
                {/* Region presets */}
                {REGIONS.map((r) => (
                    <button
                        key={r.id}
                        className="btn btn--glow"
                        onClick={() => dataBus.emit("cameraPreset", { presetId: r.id })}
                        title={r.label}
                    >
                        {r.label}
                    </button>
                ))}
                {/* Separator */}
                <div style={{ width: 1, height: 20, background: "var(--border-subtle)" }} />
                {/* Time windows */}
                {TIME_WINDOWS.map((tw) => (
                    <button
                        key={tw}
                        className={`btn ${timeWindow === tw ? "btn--active" : ""}`}
                        onClick={() => {
                            setTimeWindow(tw);
                            const range = useStore.getState().timeRange;
                            pluginManager.updateTimeRange(range);
                        }}
                    >
                        {tw}
                    </button>
                ))}
                {/* Live indicator */}
                <div className="status-badge">
                    <span className="status-badge__dot" />
                    LIVE
                </div>
            </div>
        </header>
    );
}
