import { NextRequest, NextResponse } from "next/server";
import * as insecam from "insecam-api";
import * as cheerio from "cheerio";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "rating";

    try {
        const pagesToFetch = 15; // 15 pages * 6 cameras = 90 cameras
        const pagePromises = [];

        for (let i = 1; i <= pagesToFetch; i++) {
            const url = `http://www.insecam.org/en/by${category}/?page=${i}`;
            pagePromises.push(
                fetch(url, { headers: { "User-Agent": "WorldWideView/1.0" } })
                    .then(res => res.text())
                    .then(text => {
                        const $ = cheerio.load(text);
                        const ids: string[] = [];
                        $(".thumbnail-item__wrap").each(function () {
                            const href = $(this).attr("href");
                            if (href) {
                                ids.push(href.slice(9, -1)); // Extract ID from /en/view/12345/
                            }
                        });
                        return ids;
                    })
                    .catch(err => {
                        console.error(`[Insecam Proxy] Error fetching page ${i}:`, err);
                        return [];
                    })
            );
        }

        const pageResults = await Promise.all(pagePromises);
        const cameraIds = pageResults.flat();

        if (!cameraIds || cameraIds.length === 0) {
            return NextResponse.json({ error: "No cameras found" }, { status: 404 });
        }

        // Fetch details concurrently for all discovered IDs
        const cameraDetailsPromises = cameraIds.map(async (id) => {
            try {
                return await insecam.camera(id);
            } catch (err) {
                console.error(`[Insecam Proxy] Failed to fetch details for camera ${id}:`, err);
                return null;
            }
        });

        const cameras = (await Promise.all(cameraDetailsPromises)).filter(Boolean);

        return NextResponse.json(cameras);
    } catch (error: any) {
        console.error("[Insecam Proxy] Error fetching from insecam API:", error);
        return NextResponse.json(
            { error: "Failed to fetch cameras from insecam API", details: error.message },
            { status: 500 }
        );
    }
}
