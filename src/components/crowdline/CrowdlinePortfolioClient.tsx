"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Wallet } from "lucide-react";

import {
  CROWDLINE_PORTFOLIO_EVENT,
  CROWDLINE_STARTING_BALANCE,
  readCrowdlineBalance,
  readCrowdlinePositions,
  type CrowdlineStoredPosition,
  writeCrowdlineBalance,
} from "@/lib/crowdline/local-portfolio";

type PortfolioSnapshot = {
  balance: number;
  positions: CrowdlineStoredPosition[];
};

function readPortfolioSnapshot(): PortfolioSnapshot {
  return {
    balance: readCrowdlineBalance(),
    positions: Object.values(readCrowdlinePositions()),
  };
}

function formatPrice(value: number) {
  return `${Math.round(value * 100)}c`;
}

function formatCredits(value: number) {
  return `${value.toFixed(2)} credits`;
}

export function CrowdlinePortfolioClient() {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>({
    balance: CROWDLINE_STARTING_BALANCE,
    positions: [],
  });

  useEffect(() => {
    function refreshPortfolio() {
      setSnapshot(readPortfolioSnapshot());
    }

    refreshPortfolio();
    window.addEventListener("storage", refreshPortfolio);
    window.addEventListener(CROWDLINE_PORTFOLIO_EVENT, refreshPortfolio);

    return () => {
      window.removeEventListener("storage", refreshPortfolio);
      window.removeEventListener(CROWDLINE_PORTFOLIO_EVENT, refreshPortfolio);
    };
  }, []);

  const totals = useMemo(() => {
    const deployed = snapshot.positions.reduce(
      (total, position) => total + position.spent,
      0,
    );
    const shares = snapshot.positions.reduce(
      (total, position) => total + position.shares,
      0,
    );

    return {
      deployed,
      openPositions: snapshot.positions.length,
      shares,
    };
  }, [snapshot.positions]);

  function resetLocalCredits() {
    writeCrowdlineBalance(CROWDLINE_STARTING_BALANCE);
    setSnapshot(readPortfolioSnapshot());
  }

  return (
    <div className="grid gap-4">
      <section className="pm-card pm-cardPad">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="pm-eyebrow">Portfolio</p>
            <h1 className="mt-2 text-3xl font-bold text-white">My Crowdline book</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8793a3]">
              Local V1 positions are stored in this browser until the server-side
              live wallet ledger ships.
            </p>
          </div>
          <button
            className="pm-primaryButton"
            onClick={resetLocalCredits}
            type="button"
          >
            <Wallet className="h-4 w-4" />
            Reset local credits
          </button>
        </div>

        <div className="pm-statGrid mt-5">
          <div className="pm-stat">
            <p className="pm-eyebrow">Balance</p>
            <p className="pm-statValue">{formatCredits(snapshot.balance)}</p>
          </div>
          <div className="pm-stat">
            <p className="pm-eyebrow">Open positions</p>
            <p className="pm-statValue">{totals.openPositions}</p>
          </div>
          <div className="pm-stat">
            <p className="pm-eyebrow">Deployed</p>
            <p className="pm-statValue">{formatCredits(totals.deployed)}</p>
          </div>
          <div className="pm-stat">
            <p className="pm-eyebrow">Shares</p>
            <p className="pm-statValue">{totals.shares.toFixed(2)}</p>
          </div>
        </div>
      </section>

      <section className="pm-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <p className="pm-eyebrow">Positions</p>
            <h2 className="mt-1 text-lg font-bold text-white">Open positions</h2>
          </div>
          <BriefcaseBusiness className="h-5 w-5 text-[#2f9bff]" />
        </div>

        {snapshot.positions.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="text-xl font-bold text-white">No positions yet</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#8793a3]">
              Open a World Cup market and buy UP or DOWN with local credits to start
              building your local portfolio.
            </p>
            <Link className="pm-primaryButton mt-5" href="/">
              Browse markets
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-0">
            {snapshot.positions.map((position) => (
              <Link
                className="pm-positionRow border-b border-white/10 px-4 py-4 text-white transition hover:bg-white/5"
                href={`/markets/${position.marketId}`}
                key={position.marketId}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{position.title}</p>
                  <p className="mt-1 text-xs font-semibold uppercase text-[#778393]">
                    {position.side.toUpperCase()} side
                  </p>
                </div>
                <Metric label="Avg price" value={formatPrice(position.avgPrice)} />
                <Metric label="Shares" value={position.shares.toFixed(2)} />
                <Metric label="Spent" value={formatCredits(position.spent)} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#667284]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
