import { NextResponse } from "next/server";
import { z } from "zod";

import { mapRoundToState } from "@/lib/server/rounds/map-round-state";
import { tickLiveRound } from "@/lib/server/rounds/tick-live-round";

const tickRoundPayloadSchema = z.object({
  roundId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const payload = tickRoundPayloadSchema.parse(rawPayload);
    const round = await tickLiveRound({
      roundId: payload.roundId,
    });

    return NextResponse.json(await mapRoundToState(round));
  } catch (error) {
    console.error("Failed to tick live round", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid round tick payload.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to tick live duel round.",
      },
      { status: 500 },
    );
  }
}
