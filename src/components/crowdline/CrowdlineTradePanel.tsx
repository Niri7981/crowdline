"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Wallet } from "lucide-react";

import {
  buildCrowdlineQuote,
  calculateShares,
  getQuotePrice,
  type CrowdlineSide,
} from "@/lib/crowdline/quotes";
import {
  CROWDLINE_STARTING_BALANCE,
  readCrowdlineBalance,
  readCrowdlinePositions,
  type CrowdlineStoredPosition,
  writeCrowdlineBalance,
  writeCrowdlinePositions,
} from "@/lib/crowdline/local-portfolio";

type CrowdlineTradePanelProps = {
  currentPrice: number | null;
  driftSinceOpen: number | null;
  marketId: string;
  openPrice: number | null;
  title: string;
  tradingStatus: "locked" | "open" | "preopen";
  underlyingLabel: string;
};

const QUICK_AMOUNTS = [1, 5, 10, 25];

function formatPrice(value: number | null) {
  if (value == null) {
    return "--";
  }

  return `${Math.round(value * 100)}c`;
}

function formatCredits(value: number) {
  return `${value.toFixed(2)} credits`;
}

export function CrowdlineTradePanel({
  currentPrice,
  driftSinceOpen,
  marketId,
  openPrice,
  title,
  tradingStatus,
  underlyingLabel,
}: CrowdlineTradePanelProps) {
  const quote = useMemo(() => buildCrowdlineQuote(driftSinceOpen), [driftSinceOpen]);
  const [amount, setAmount] = useState("10");
  const [balance, setBalance] = useState(readCrowdlineBalance);
  const [position, setPosition] = useState<CrowdlineStoredPosition | null>(
    () => readCrowdlinePositions()[marketId] ?? null,
  );
  const [selectedSide, setSelectedSide] = useState<CrowdlineSide>("up");
  const [reviewing, setReviewing] = useState(false);

  const parsedAmount = Number(amount);
  const tradeAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const selectedPrice = getQuotePrice(quote, selectedSide);
  const estimatedShares = calculateShares(tradeAmount, selectedPrice);
  const canTrade =
    tradingStatus === "open" && tradeAmount > 0 && tradeAmount <= balance;
  const heldSidePrice =
    position?.side === "up" ? quote.upPrice : position?.side === "down" ? quote.downPrice : 0;
  const positionValue = position ? position.shares * heldSidePrice : 0;
  const unrealizedPnl = position ? positionValue - position.spent : 0;

  function claimBalance() {
    writeCrowdlineBalance(CROWDLINE_STARTING_BALANCE);
    setBalance(CROWDLINE_STARTING_BALANCE);
  }

  function confirmTrade() {
    if (!canTrade) {
      return;
    }

    const nextBalance = Number((balance - tradeAmount).toFixed(4));
    const positions = readCrowdlinePositions();
    const existing = positions[marketId];
    const nextShares = (existing?.shares ?? 0) + estimatedShares;
    const nextSpent = (existing?.spent ?? 0) + tradeAmount;
    const nextPosition: CrowdlineStoredPosition = {
      avgPrice: nextSpent / nextShares,
      marketId,
      side: selectedSide,
      shares: nextShares,
      spent: nextSpent,
      title,
    };

    positions[marketId] = nextPosition;
    writeCrowdlineBalance(nextBalance);
    writeCrowdlinePositions(positions);
    setBalance(nextBalance);
    setPosition(nextPosition);
    setReviewing(false);
  }

  return (
    <aside className="pm-card pm-cardPad">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="pm-eyebrow">Trade Card</p>
          <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-white">{title}</h2>
        </div>
        <button
          type="button"
          onClick={claimBalance}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-[#0b2237] px-3 py-2 text-xs font-bold text-[#2f9bff] transition hover:border-[#2f9bff]/50 hover:text-white"
        >
          <Wallet className="h-4 w-4" />
          {formatCredits(balance)}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {(["up", "down"] as CrowdlineSide[]).map((side) => {
          const active = selectedSide === side;
          const price = getQuotePrice(quote, side);

          return (
            <button
              key={side}
              type="button"
              onClick={() => {
                setSelectedSide(side);
                setReviewing(false);
              }}
              className={`rounded-xl px-4 py-4 text-left transition ${
                active
                  ? side === "up"
                    ? "bg-[#123f28] text-[#1ed17a]"
                    : "bg-[#3d171d] text-[#ff5367]"
                  : "bg-[#151b20] text-[#9aa6b5] hover:bg-[#1a2229]"
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">
                Buy
              </div>
              <div className="mt-1 text-2xl font-bold">
                {side.toUpperCase()} {formatPrice(price)}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-[#0b0f12] p-4">
        <label className="pm-eyebrow">
          Amount
        </label>
        <div
          className="mt-3 flex items-end gap-3"
          style={{
            alignItems: "flex-end",
            display: "flex",
            gap: 12,
          }}
        >
          <input
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setReviewing(false);
            }}
            className="min-w-0 flex-1 border-0 bg-transparent text-5xl font-bold text-white outline-none"
            style={{
              flex: "1 1 0",
              minWidth: 0,
              width: 0,
            }}
          />
          <span
            className="pb-2 text-sm font-semibold text-[#8fa0b8]"
            style={{
              flex: "0 0 auto",
              paddingBottom: 8,
            }}
          >
            credits
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((quickAmount) => (
            <button
              key={quickAmount}
              type="button"
              onClick={() => {
                setAmount(String(quickAmount));
                setReviewing(false);
              }}
              className="rounded-lg border border-white/10 bg-[#151b20] px-3 py-2 text-xs font-bold text-[#8a96a6] transition hover:border-white/20 hover:text-white"
            >
              +{quickAmount}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <Metric label={`${underlyingLabel} open`} value={formatPrice(openPrice)} />
        <Metric label={`${underlyingLabel} current`} value={formatPrice(currentPrice)} />
        <Metric label="Estimated shares" value={estimatedShares.toFixed(2)} />
      </div>

      {position ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-[#0b0f12] p-4">
          <p className="pm-eyebrow">Open Position</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Side" value={position.side.toUpperCase()} />
            <Metric label="Avg price" value={formatPrice(position.avgPrice)} />
            <Metric label="Shares" value={position.shares.toFixed(2)} />
            <Metric
              label="PnL"
              value={`${unrealizedPnl >= 0 ? "+" : ""}${formatCredits(unrealizedPnl)}`}
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canTrade}
        onClick={() => {
          if (reviewing) {
            confirmTrade();
          } else {
            setReviewing(true);
          }
        }}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a76d6] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#0c86f5] disabled:cursor-not-allowed disabled:bg-[#151b20] disabled:text-[#667284]"
      >
        {reviewing ? (
          <>
            <Check className="h-4 w-4" />
            Confirm {selectedSide.toUpperCase()} order
          </>
        ) : (
          <>
            Review order
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="mt-3 text-xs leading-5 text-[#7d8897]">
        {tradingStatus === "open"
          ? reviewing
            ? `Buy ${estimatedShares.toFixed(2)} ${selectedSide.toUpperCase()} shares at ${formatPrice(selectedPrice)}.`
            : "Local V1 ledger is browser-only until live settlement ships."
          : `Trading is ${tradingStatus}; orders open 24 hours before kickoff and lock at kickoff.`}
      </p>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#0b0f12] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#667284]">{label}</p>
      <p className="mt-2 text-base font-bold text-white">{value}</p>
    </div>
  );
}
