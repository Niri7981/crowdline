import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Info, Trophy } from "lucide-react";

import {
  CrowdlineCategoryNav,
  CrowdlineTopNav,
} from "@/components/crowdline/CrowdlineMarketShell";
import { CrowdlineTradePanel } from "@/components/crowdline/CrowdlineTradePanel";
import { UnderlyingPriceChart } from "@/components/crowdline/UnderlyingPriceChart";
import { getCrowdlineMarketDetail } from "@/lib/server/crowdline/get-world-cup-markets";

export const dynamic = "force-dynamic";

function formatPrice(value: number | null) {
  if (value == null) {
    return "--";
  }

  return `${Math.round(value * 100)}c`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "TBD";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type DetailOutcome = {
  id: string;
  label: string;
  marketId?: string | null;
  price: number | null;
};

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pm-stat">
      <p className="pm-eyebrow">{label}</p>
      <p className="pm-statValue">{value}</p>
    </div>
  );
}

function OutcomePriceGrid({ outcomes }: { outcomes: DetailOutcome[] }) {
  if (outcomes.length === 0) {
    return null;
  }

  return (
    <div className="pm-card pm-cardPad">
      <p className="pm-eyebrow">Outcomes</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {outcomes.map((outcome) => (
          <div className="rounded-xl bg-[#0b0f12] p-4" key={outcome.id}>
            <p className="text-sm font-bold text-white">{outcome.label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{formatPrice(outcome.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutcomeMarketBoard({ outcomes }: { outcomes: DetailOutcome[] }) {
  if (outcomes.length === 0) {
    return null;
  }

  return (
    <section className="pm-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="pm-eyebrow">Polymarket outcomes</p>
          <h2 className="mt-1 text-lg font-bold text-white">Winner board</h2>
        </div>
        <span className="rounded-full bg-[#0b2237] px-3 py-1 text-xs font-bold text-[#2f9bff]">
          {outcomes.length} outcomes
        </span>
      </div>
      <div className="max-h-[560px] overflow-auto">
        {outcomes.map((outcome, index) => {
          const width = Math.max(2, Math.round((outcome.price ?? 0) * 100));

          return (
            <div
              className="grid items-center gap-3 border-b border-white/10 px-4 py-3 last:border-b-0"
              key={outcome.id}
              style={{ gridTemplateColumns: "44px minmax(0, 1fr) 82px" }}
            >
              <span className="text-sm font-bold text-[#778393]">#{index + 1}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="truncate text-sm font-bold text-white">{outcome.label}</span>
                  {outcome.marketId ? (
                    <span className="hidden text-xs text-[#5f6b7c] sm:inline">
                      Market {outcome.marketId}
                    </span>
                  ) : null}
                </div>
                <div className="pm-progressTrack mt-2">
                  <div className="pm-progressFill" style={{ width: `${width}%` }} />
                </div>
              </div>
              <span className="text-right text-base font-bold text-white">
                {formatPrice(outcome.price)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;
  const market = await getCrowdlineMarketDetail(marketId);

  if (!market) {
    notFound();
  }

  return (
    <main className="pm-page">
      <CrowdlineTopNav />
      <CrowdlineCategoryNav />

      <div className="pm-container">
        <div className="pm-detailGrid">
          <div className="grid gap-3">
            <section className="pm-detailHeader">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Link className="pm-link inline-flex items-center gap-2" href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Back to markets
                </Link>

                {market.externalUrl ? (
                  <Link className="pm-link inline-flex items-center gap-2" href={market.externalUrl}>
                    Polymarket source
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-[56px_minmax(0,1fr)]">
                <div className="pm-marketIcon h-14 w-14">
                  <Trophy className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#151b20] px-2.5 py-1 text-xs font-bold text-[#8793a3]">
                      {market.stageLabel}
                    </span>
                    <span className="rounded-full bg-[#0b2237] px-2.5 py-1 text-xs font-bold text-[#2f9bff]">
                      {market.tradingStatus}
                    </span>
                    <span className="rounded-full bg-[#171d12] px-2.5 py-1 text-xs font-bold text-[#d6a900]">
                      {market.outcomeKind}
                    </span>
                  </div>
                  {market.marketGroupTitle ? (
                    <p className="mt-4 text-sm font-bold text-[#7d8897]">
                      {market.marketGroupTitle}
                    </p>
                  ) : null}
                  <h1 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
                    {market.title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8793a3]">
                    {market.question}
                  </p>
                </div>
              </div>

              <div className="pm-statGrid">
                <DetailStat label="Kickoff" value={formatDateTime(market.kickoffAt)} />
                <DetailStat
                  label={market.outcomeKind === "multi" ? "Outcomes" : market.primaryOutcomeLabel}
                  value={
                    market.outcomeKind === "multi"
                      ? String(market.outcomes.length)
                      : formatPrice(market.currentPrice)
                  }
                />
                <DetailStat
                  label={`Leader · ${market.primaryOutcomeLabel}`}
                  value={formatPrice(market.currentPrice)}
                />
                <DetailStat label="Latest tick" value={formatDateTime(market.latestObservedAt)} />
              </div>
            </section>

            <UnderlyingPriceChart
              openAt={market.openAt}
              outcomes={market.outcomes}
              points={market.chartSeries}
              title={market.title}
            />

            {market.outcomeKind === "multi" ? (
              <OutcomeMarketBoard outcomes={market.outcomes} />
            ) : (
              <OutcomePriceGrid outcomes={market.outcomes} />
            )}

            <section className="pm-card pm-cardPad">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[#0b2237] p-2 text-[#2f9bff]">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    How Crowdline reads this market
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#8793a3]">
                    {market.outcomeKind === "multi"
                      ? "This is a multi-outcome Polymarket event group. Crowdline reads each team as a child market outcome, then tracks the leader curve over time."
                      : `Crowdline tracks whether the underlying Polymarket ${market.primaryOutcomeLabel} price finishes above or below its opening point by kickoff.`}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="pm-stickyPanel grid gap-3">
            <CrowdlineTradePanel
              currentPrice={market.currentPrice}
              driftSinceOpen={market.driftSinceOpen}
              marketId={market.id}
              openPrice={market.openPrice}
              title={market.title}
              tradingStatus={market.tradingStatus}
              underlyingLabel={market.primaryOutcomeLabel}
            />

            <div className="pm-card pm-cardPad">
              <p className="pm-eyebrow">Crowdline rule</p>
              <h2 className="mt-2 text-lg font-bold text-white">
                Settle from open to kickoff.
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#8793a3]">
                UP wins if the underlying price locks above open. DOWN wins if it
                locks below open. A flat move refunds the position.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
