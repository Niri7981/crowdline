import { NextResponse } from "next/server";

import { getEventPool } from "@/lib/server/events/get-event-pool";
import { getHotPolymarketEvents } from "@/lib/server/events/get-hot-polymarket-events";
import { seedEventPool } from "@/lib/server/events/seed-event-pool";
import type {
  EventPoolCategory,
  EventPoolStatus,
} from "@/lib/server/events/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as EventPoolCategory | null;
  const status = searchParams.get("status") as EventPoolStatus | null;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const source = searchParams.get("source");

  if (source === "polymarket-hot") {
    try {
      return NextResponse.json(
        await getHotPolymarketEvents(Number.isFinite(limit) ? limit : 10),
      );
    } catch (error) {
      console.error("Failed to load hot Polymarket events", error);

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to load hot Polymarket events.",
        },
        { status: 502 },
      );
    }
  }

  // Event Pool 是 arena 的可玩事件入口，先提供最小筛选能力给 battle 编排和首页使用。
  return NextResponse.json(
    await getEventPool({
      category: category ?? undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
      status: status ?? undefined,
    }),
  );
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      limit?: number;
    };
    const result = await seedEventPool({
      limit: payload.limit ?? 10,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to seed event pool", error);

    return NextResponse.json(
      {
        error: "Failed to seed event pool.",
      },
      { status: 500 },
    );
  }
}
