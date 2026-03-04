"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/core/state/store";

export function Timeline() {
    const currentTime = useStore((s) => s.currentTime);
    const isPlaying = useStore((s) => s.isPlaying);
    const playbackSpeed = useStore((s) => s.playbackSpeed);
    const setPlaying = useStore((s) => s.setPlaying);
    const setPlaybackSpeed = useStore((s) => s.setPlaybackSpeed);
    const timeRange = useStore((s) => s.timeRange);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const totalMs = timeRange.end.getTime() - timeRange.start.getTime();
    const currentMs = currentTime.getTime() - timeRange.start.getTime();
    const progress = totalMs > 0 ? Math.max(0, Math.min(1, currentMs / totalMs)) : 0;

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        const newTime = new Date(
            timeRange.start.getTime() + val * totalMs
        );
        useStore.getState().setCurrentTime(newTime);
    };

    const speeds = [1, 2, 10, 100];

    return (
        <div className="timeline glass-panel">
            <div className="timeline__playback">
                <button
                    className="timeline__play-btn"
                    onClick={() => setPlaying(!isPlaying)}
                    title={isPlaying ? "Pause" : "Play"}
                >
                    {isPlaying ? "⏸" : "▶"}
                </button>
                <select
                    className="btn"
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    style={{ width: "auto", minWidth: 45 }}
                >
                    {speeds.map((s) => (
                        <option key={s} value={s}>
                            {s}×
                        </option>
                    ))}
                </select>
            </div>

            <div className="timeline__scrubber">
                <input
                    className="timeline__track"
                    type="range"
                    min={0}
                    max={1}
                    step={0.001}
                    value={progress}
                    onChange={handleScrub}
                />
            </div>

            <span className="timeline__time">
                {mounted ? `${currentTime.toLocaleTimeString()} — ${currentTime.toLocaleDateString()}` : "Loading..."}
            </span>
        </div>
    );
}
