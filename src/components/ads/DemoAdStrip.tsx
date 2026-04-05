"use client";

import React, { useState, useEffect } from "react";
import { isDemo } from "@/core/edition";
import { AdUnit } from "./AdUnit";
import { X } from "lucide-react";
import "./DemoAdStrip.css";

/** Ad slot IDs — replace with your AdSense slot IDs. */
const TOP_AD_SLOT = "6006554079";
const BOTTOM_AD_SLOT = "6006554079";

/** Width of the ad strip — must match the CSS value. */
const AD_STRIP_WIDTH = 160;

export function DemoAdStrip() {
    const [showMessage, setShowMessage] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(false);

    // Set the --ad-strip-inset CSS variable on the page root
    // so fixed-position panels (header, timeline) stay within bounds.
    useEffect(() => {
        if (!isDemo) return;
        const root = document.querySelector(".page-root") as HTMLElement | null;
        if (root) root.style.setProperty("--ad-strip-inset", `${AD_STRIP_WIDTH}px`);
        return () => {
            if (root) root.style.setProperty("--ad-strip-inset", "0px");
        };
    }, []);

    if (!isDemo) return null;

    return (
        <aside className="demo-ad-strip" aria-label="Sponsored content">
            <AdUnit
                adSlot={TOP_AD_SLOT}
                adFormat="auto"
                className="demo-ad-strip__ad"
            />
            <AdUnit
                adSlot={BOTTOM_AD_SLOT}
                adFormat="auto"
                className="demo-ad-strip__ad"
            />


            {!bannerDismissed && (
                <div
                    className="demo-ad-strip__banner"
                    onClick={() => setShowMessage((prev) => !prev)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                        if (e.key === "Enter") setShowMessage((prev) => !prev);
                    }}
                >
                    <button
                        className="demo-ad-strip__close"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            setBannerDismissed(true);
                        }}
                        aria-label="Dismiss banner"
                    >
                        <X size={12} />
                    </button>
                    <span className="demo-ad-strip__banner-label">Why ads?</span>
                    {showMessage ? (
                        <span className="demo-ad-strip__banner-text">
                            This isn&apos;t permanent — it&apos;s temporary
                            because I&apos;m a single dev and need to cover
                            hosting costs. Thank you for understanding.
                        </span>
                    ) : (
                        <span className="demo-ad-strip__banner-text">
                            Click to learn more
                        </span>
                    )}
                </div>
            )}
        </aside>
    );
}
