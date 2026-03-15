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
 * Install or update a plugin record.
 * If the plugin is already installed, updates its version and config.
 */
export async function upsertPlugin(pluginId: string, version: string, config?: string) {
    const existing = await prisma.installedPlugin.findFirst({
        where: { pluginId },
    });

    if (existing) {
        return prisma.installedPlugin.update({
            where: { id: existing.id },
            data: { version, config: config ?? existing.config },
        });
    }

    return prisma.installedPlugin.create({
        data: { pluginId, version, config: config ?? "{}" },
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
