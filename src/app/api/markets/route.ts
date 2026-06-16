import { NextResponse } from "next/server";

import { getCrowdlineHome } from "@/lib/server/crowdline/get-world-cup-markets";

export async function GET() {
  try {
    const payload = await getCrowdlineHome();

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load Crowdline markets", error);

    return NextResponse.json(
      {
        error: "Failed to load Crowdline markets.",
      },
      { status: 500 },
    );
  }
}
