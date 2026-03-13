import { NextResponse } from "next/server";
import { getHistoryAtTime } from "../../../../lib/aviation/repository";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const timeParam = searchParams.get("time");

    if (!timeParam) {
        return NextResponse.json({ error: "Missing time parameter" }, { status: 400 });
    }

    const targetTimeMs = parseInt(timeParam);
    if (isNaN(targetTimeMs)) {
        return NextResponse.json({ error: "Invalid time parameter" }, { status: 400 });
    }

    try {
        const { records, recordTime } = await getHistoryAtTime(targetTimeMs);

        if (recordTime === null) {
            return NextResponse.json({ records: [], targetTime: targetTimeMs });
        }

        return NextResponse.json({ records, recordTime });
    } catch (err) {
        console.error("[API/aviation/history] Unexpected error:", err);
        return NextResponse.json({ records: [], targetTime: targetTimeMs });
    }
}
