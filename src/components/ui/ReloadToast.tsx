"use client";

import { useState } from "react";
import styles from "./ReloadToast.module.css";

interface ReloadToastProps {
    message?: string;
}

/**
 * Floating toast prompting user to reload after plugin changes.
 * Dismissible, with a Reload button that triggers a full page refresh.
 */
export default function ReloadToast({ message }: ReloadToastProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.toast}>
                <span className={styles.icon}>🔄</span>
                <span className={styles.message}>
                    {message ?? "Plugin changes detected. Reload to apply."}
                </span>
                <button
                    className={styles.reloadBtn}
                    onClick={() => window.location.reload()}
                >
                    Reload
                </button>
                <button
                    className={styles.dismiss}
                    onClick={() => setDismissed(true)}
                    aria-label="Dismiss"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
