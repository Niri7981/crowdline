import Link from "next/link";
import { BarChart3, Trophy } from "lucide-react";

import {
  CrowdlineCategoryNav,
  CrowdlineTopNav,
} from "@/components/crowdline/CrowdlineMarketShell";

type CrowdlineLeaderboardEntry = {
  pnlSol: number;
  rank: number;
  totalTrades: number;
  walletLabel: string;
  winRate: number | null;
};

async function getCrowdlineLeaderboard(): Promise<CrowdlineLeaderboardEntry[]> {
  return [];
}

function formatPnl(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} SOL`;
}

function formatWinRate(value: number | null) {
  return value == null ? "--" : `${Math.round(value * 100)}%`;
}

export default async function LeaderboardPage() {
  const entries = await getCrowdlineLeaderboard();

  return (
    <main className="pm-page">
      <CrowdlineTopNav />
      <CrowdlineCategoryNav />

      <div className="pm-container">
        <section className="pm-card pm-cardPad">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="pm-eyebrow">Leaderboard</p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                Crowdline PnL rankings
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8793a3]">
                V1 ranks connected wallets by cumulative PnL after World Cup
                markets lock and settle.
              </p>
            </div>
            <Link className="pm-primaryButton" href="/portfolio">
              My portfolio
              <BarChart3 className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="pm-card mt-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="pm-eyebrow">Cumulative PnL</p>
              <h2 className="mt-1 text-lg font-bold text-white">World Cup board</h2>
            </div>
            <Trophy className="h-5 w-5 text-[#2f9bff]" />
          </div>

          {entries.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-xl font-bold text-white">No settled rankings yet</h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#8793a3]">
                Rankings will appear after the V1 server ledger records fills and
                kickoff settlement turns open positions into realized PnL.
              </p>
              <Link className="pm-primaryButton mt-5" href="/">
                Browse markets
              </Link>
            </div>
          ) : (
            <div className="grid gap-0">
              {entries.map((entry) => (
                <div
                  className="grid items-center gap-3 border-b border-white/10 px-4 py-4 text-white"
                  key={entry.walletLabel}
                  style={{
                    gridTemplateColumns: "80px minmax(0, 1fr) 120px 120px 120px",
                  }}
                >
                  <span className="text-sm font-bold text-[#778393]">
                    #{entry.rank}
                  </span>
                  <span className="truncate text-sm font-bold">{entry.walletLabel}</span>
                  <span className="text-right text-sm font-bold">
                    {formatPnl(entry.pnlSol)}
                  </span>
                  <span className="text-right text-sm font-bold">
                    {formatWinRate(entry.winRate)}
                  </span>
                  <span className="text-right text-sm font-bold">
                    {entry.totalTrades}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
