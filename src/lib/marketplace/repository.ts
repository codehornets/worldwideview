import { prisma } from "../db";

/**
 * Get all installed marketplace plugins.
 */
export async function getInstalledPlugins() {
    return prisma.installedPlugin.findMany({
        orderBy: { installedAt: "desc" },
    });
}

/**
 * Check if a plugin is already installed.
 */
export async function isInstalled(pluginId: string): Promise<boolean> {
    const record = await prisma.installedPlugin.findFirst({
        where: { pluginId },
    });
    return record !== null;
}

/**
 * Record a plugin install.
 * Returns the created record, or null if already installed.
 */
export async function installPlugin(pluginId: string, version: string) {
    if (await isInstalled(pluginId)) return null;

    return prisma.installedPlugin.create({
        data: { pluginId, version },
    });
}

/**
 * Remove an installed plugin record.
 * Returns the number of deleted records (0 or 1).
 */
export async function uninstallPlugin(pluginId: string) {
    const existing = await prisma.installedPlugin.findFirst({
        where: { pluginId },
    });
    if (!existing) return 0;

    await prisma.installedPlugin.delete({
        where: { id: existing.id },
    });
    return 1;
}
