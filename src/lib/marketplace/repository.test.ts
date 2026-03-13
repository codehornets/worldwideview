import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => {
    const mockPrisma = {
        installedPlugin: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
        },
    };
    return { prisma: mockPrisma };
});

import { prisma } from "../db";
import {
    getInstalledPlugins,
    isInstalled,
    installPlugin,
    uninstallPlugin,
} from "./repository";

const mockInstalledPlugin = prisma.installedPlugin as {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

describe("Marketplace Repository", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getInstalledPlugins", () => {
        it("returns all installed plugins ordered by date", async () => {
            const plugins = [{ pluginId: "aviation", version: "1.0.0" }];
            mockInstalledPlugin.findMany.mockResolvedValue(plugins);

            const result = await getInstalledPlugins();
            expect(result).toEqual(plugins);
            expect(mockInstalledPlugin.findMany).toHaveBeenCalledWith({
                orderBy: { installedAt: "desc" },
            });
        });
    });

    describe("isInstalled", () => {
        it("returns true when plugin exists", async () => {
            mockInstalledPlugin.findFirst.mockResolvedValue({ pluginId: "aviation" });
            expect(await isInstalled("aviation")).toBe(true);
        });

        it("returns false when plugin not found", async () => {
            mockInstalledPlugin.findFirst.mockResolvedValue(null);
            expect(await isInstalled("unknown")).toBe(false);
        });
    });

    describe("installPlugin", () => {
        it("creates record for new plugin", async () => {
            mockInstalledPlugin.findFirst.mockResolvedValue(null);
            const created = { pluginId: "wildfire", version: "1.0.0" };
            mockInstalledPlugin.create.mockResolvedValue(created);

            const result = await installPlugin("wildfire", "1.0.0");
            expect(result).toEqual(created);
        });

        it("returns null if already installed", async () => {
            mockInstalledPlugin.findFirst.mockResolvedValue({ pluginId: "wildfire" });
            const result = await installPlugin("wildfire", "1.0.0");
            expect(result).toBeNull();
            expect(mockInstalledPlugin.create).not.toHaveBeenCalled();
        });
    });

    describe("uninstallPlugin", () => {
        it("deletes existing plugin and returns 1", async () => {
            mockInstalledPlugin.findFirst.mockResolvedValue({ id: "uuid-1", pluginId: "wildfire" });
            mockInstalledPlugin.delete.mockResolvedValue({});

            const result = await uninstallPlugin("wildfire");
            expect(result).toBe(1);
            expect(mockInstalledPlugin.delete).toHaveBeenCalledWith({ where: { id: "uuid-1" } });
        });

        it("returns 0 if plugin not installed", async () => {
            mockInstalledPlugin.findFirst.mockResolvedValue(null);
            const result = await uninstallPlugin("unknown");
            expect(result).toBe(0);
        });
    });
});
