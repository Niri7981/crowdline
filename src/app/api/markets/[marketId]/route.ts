import { NextResponse } from "next/server";

import { getCrowdlineMarketDetail } from "@/lib/server/crowdline/get-world-cup-markets";

export async function GET(
  request: Request,
  context: { params: Promise<{ marketId: string }> },
) {
  try {
    const { marketId } = await context.params;
    const payload = await getCrowdlineMarketDetail(marketId);

    if (!payload) {
      return NextResponse.json(
        {
          error: "Market not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load Crowdline market detail", error);

    return NextResponse.json(
      {
        error: "Failed to load Crowdline market detail.",
      },
      { status: 500 },
    );
  }
}
