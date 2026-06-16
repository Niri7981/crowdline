import { NextResponse } from "next/server";

export type CrowdlineLeaderboardEntry = {
  pnlSol: number;
  rank: number;
  totalTrades: number;
  walletAddress: string;
  winRate: number | null;
};

export async function GET() {
  const entries: CrowdlineLeaderboardEntry[] = [];

  return NextResponse.json({
    entries,
    source: "crowdline-v1-local-ledger-pending",
  });
}
