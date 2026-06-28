import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ExternalLink,
  Flame,
  Wallet,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

import {
  CrowdlineCategoryNav,
  CrowdlineTopNav,
} from "@/components/crowdline/CrowdlineMarketShell";
import { CrowdlineTradePanel } from "@/components/crowdline/CrowdlineTradePanel";
import {
  getCrowdlineHome,
  type CrowdlineMarketGroup,
  type CrowdlineMarketSummary,
} from "@/lib/server/crowdline/get-world-cup-markets";

export const dynamic = "force-dynamic";

function formatKickoff(value: string | null) {
  const formatted = formatDateTime(value);

  return formatted === "TBD" ? "Kickoff TBD" : formatted;
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

function formatPrice(value: number | null) {
  if (value == null) {
    return "--";
  }

  return `${Math.round(value * 100)}c`;
}

function formatDrift(value: number | null) {
  if (value == null) {
    return "--";
  }

  const cents = Math.round(value * 100);

  if (cents > 0) {
    return `+${cents}c`;
  }

  return `${cents}c`;
}

function formatVolume(value: number | null) {
  if (value == null) {
    return "--";
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }

  return `$${value.toFixed(0)}`;
}

function formatGroupTitle(group: CrowdlineMarketGroup) {
  if (group === "today") {
    return "Today";
  }

  if (group === "tomorrow") {
    return "Tomorrow";
  }

  return "Later";
}

function groupOrder(group: CrowdlineMarketGroup) {
  if (group === "today") {
    return 0;
  }

  if (group === "tomorrow") {
    return 1;
  }

  return 2;
}

function MarketOutcomeRows({
  limit = 4,
  market,
}: {
  limit?: number;
  market: CrowdlineMarketSummary;
}) {
  const visibleOutcomes = market.outcomes.slice(0, limit);

  return (
    <div className="pm-outcomeList">
      {visibleOutcomes.map((outcome) => {
        const width = Math.max(2, Math.round((outcome.price ?? 0) * 100));

        return (
          <div className="pm-outcomeRow" key={outcome.id}>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{outcome.label}</span>
                <span className="pm-price text-sm">{formatPrice(outcome.price)}</span>
              </div>
              <div className="pm-progressTrack mt-2">
                <div className="pm-progressFill" style={{ width: `${width}%` }} />
              </div>
            </div>
          </div>
        );
      })}
      {market.outcomes.length > visibleOutcomes.length ? (
        <p className="text-xs font-semibold text-[#6f7b8c]">
          +{market.outcomes.length - visibleOutcomes.length} more outcomes
        </p>
      ) : null}
    </div>
  );
}

function MarketCard({ market }: { market: CrowdlineMarketSummary }) {
  const driftPositive = (market.driftSinceOpen ?? 0) >= 0;
  const secondaryLabel =
    market.outcomeKind === "multi"
      ? `${market.outcomes.length} outcomes`
      : market.secondaryOutcomeLabel ?? "Down";

  return (
    <article className="pm-marketCard">
      <div className="pm-marketCardTop">
        <div className="pm-marketIcon">
          <Trophy className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pm-eyebrow normal-case tracking-normal text-[#778393]">
              {market.stageLabel}
            </span>
            <span className="rounded-full bg-[#0b2237] px-2 py-0.5 text-[11px] font-bold text-[#2f9bff]">
              {market.outcomeKind}
            </span>
          </div>
          <Link className="pm-marketTitle mt-2 block" href={`/markets/${market.id}`}>
            {market.title}
          </Link>
          <p className="pm-marketQuestion line-clamp-2">{market.question}</p>
        </div>
        <div className="text-right">
          <p className="pm-price">{formatPrice(market.currentPrice)}</p>
          <div
            className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
              driftPositive
                ? "bg-[#123f28] text-[#20d47a]"
                : "bg-[#3d171d] text-[#ff5367]"
            }`}
          >
            {driftPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {formatDrift(market.driftSinceOpen)}
          </div>
        </div>
      </div>

      <MarketOutcomeRows limit={market.outcomeKind === "multi" ? 4 : 2} market={market} />

      <div className="grid gap-2 border-t border-white/10 pt-3 text-xs text-[#778393] sm:grid-cols-3">
        <span>{formatVolume(market.volumeUsd)} volume</span>
        <span>{formatKickoff(market.kickoffAt)}</span>
        <span>{market.latestObservedAt ? `${formatDateTime(market.latestObservedAt)} tick` : "No tick"}</span>
      </div>

      <div className="pm-actionGrid">
        <Link className="pm-buyUp" href={`/markets/${market.id}`}>
          Up · {formatPrice(market.currentPrice)}
        </Link>
        <Link className="pm-buyDown" href={`/markets/${market.id}`}>
          {secondaryLabel}
        </Link>
      </div>

      {market.externalUrl ? (
        <a
          className="inline-flex items-center justify-center gap-2 border-t border-white/10 pt-3 text-xs font-bold text-[#8fa0b8] transition hover:text-white"
          href={market.externalUrl}
          rel="noreferrer"
          target="_blank"
        >
          View on Polymarket
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </article>
  );
}

function MarketGroupSection({
  group,
  markets,
}: {
  group: CrowdlineMarketGroup;
  markets: CrowdlineMarketSummary[];
}) {
  return (
    <section className="pm-feed">
      <div className="pm-feedHeader">
        <div>
          <p className="pm-eyebrow">Market feed</p>
          <h2 className="pm-sectionTitle">{formatGroupTitle(group)}</h2>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-[#7d8897]">
          {markets.length} markets
        </span>
      </div>
      {markets.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </section>
  );
}

function LeftRail() {
  const items = [
    ["All", "World Cup markets"],
    ["Trending", "Fastest moving odds"],
    ["Locking Soon", "Closest kickoff windows"],
    ["Settlement", "Open to lock direction"],
  ];

  return (
    <aside className="pm-rail pm-leftRail">
      <div className="pm-card pm-cardPad">
        <p className="pm-eyebrow">Categories</p>
        <div className="mt-4 grid gap-2">
          {items.map(([label, description], index) => (
            <Link
              className={`rounded-xl px-3 py-3 transition hover:bg-white/5 ${
                index === 0 ? "bg-[#0b2237] text-[#2f9bff]" : "text-[#9ba6b5]"
              }`}
              href="/"
              key={label}
            >
              <span className="block text-sm font-bold">{label}</span>
              <span className="mt-1 block text-xs text-[#667284]">{description}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="pm-card pm-cardPad">
        <p className="pm-eyebrow">Crowdline V1</p>
        <p className="mt-3 text-sm leading-6 text-[#8a96a6]">
          Trade UP or DOWN on how a real World Cup Polymarket price moves from
          open to kickoff, with wallet-linked V1 positions.
        </p>
      </div>
    </aside>
  );
}

function RightRail({ featuredMarket }: { featuredMarket: CrowdlineMarketSummary | null }) {
  return (
    <aside className="pm-rail">
      <div className="pm-card pm-cardPad">
        <div className="flex items-center gap-3">
          <div className="pm-marketIcon h-10 w-10">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="pm-eyebrow">Wallet game</p>
            <h2 className="text-lg font-bold text-white">Build a World Cup book.</h2>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ["Funds", "Wallet"],
            ["Market", "Polymarket"],
            ["Rank", "PnL"],
          ].map(([label, value]) => (
            <div className="rounded-xl bg-[#0b0f12] p-3" key={label}>
              <p className="text-[10px] font-bold uppercase text-[#667284]">{label}</p>
              <p className="mt-1 text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {featuredMarket ? (
        <CrowdlineTradePanel
          currentPrice={featuredMarket.currentPrice}
          driftSinceOpen={featuredMarket.driftSinceOpen}
          marketId={featuredMarket.id}
          openPrice={featuredMarket.openPrice}
          title={featuredMarket.title}
          tradingStatus={featuredMarket.tradingStatus}
          underlyingLabel={featuredMarket.primaryOutcomeLabel}
        />
      ) : null}
    </aside>
  );
}

export default async function HomePage() {
  const { featuredMarket, marketsByGroup } = await getCrowdlineHome();
  const groupedEntries = (Object.entries(marketsByGroup) as Array<
    [CrowdlineMarketGroup, CrowdlineMarketSummary[]]
  >)
    .filter(([, markets]) => markets.length > 0)
    .sort((left, right) => groupOrder(left[0]) - groupOrder(right[0]));

  return (
    <main className="pm-page">
      <CrowdlineTopNav />
      <CrowdlineCategoryNav />

      <div className="pm-container">
        <div className="pm-homeGrid">
          <LeftRail />

          <section className="pm-feed">
            {featuredMarket ? (
              <section className="pm-card pm-cardPad">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#171d12] px-2.5 py-1 text-xs font-bold text-[#d6a900]">
                        <Flame className="h-3.5 w-3.5" />
                        Featured
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0b2237] px-2.5 py-1 text-xs font-bold text-[#2f9bff]">
                        <Wallet className="h-3.5 w-3.5" />
                        Wallet
                      </span>
                    </div>
                    <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                      {featuredMarket.title}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8793a3]">
                      {featuredMarket.question}
                    </p>
                  </div>
                  {featuredMarket.externalUrl ? (
                    <Link className="pm-link inline-flex items-center gap-2" href={featuredMarket.externalUrl}>
                      Polymarket source
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>

                <div className="mt-5">
                  <MarketOutcomeRows limit={featuredMarket.outcomeKind === "multi" ? 5 : 2} market={featuredMarket} />
                </div>

                <div className="pm-statGrid mt-5">
                  <div className="pm-stat">
                    <p className="pm-eyebrow">Leader</p>
                    <p className="pm-statValue">
                      {featuredMarket.primaryOutcomeLabel} · {formatPrice(featuredMarket.currentPrice)}
                    </p>
                  </div>
                  <div className="pm-stat">
                    <p className="pm-eyebrow">Outcomes</p>
                    <p className="pm-statValue">{featuredMarket.outcomes.length}</p>
                  </div>
                  <div className="pm-stat">
                    <p className="pm-eyebrow">Volume</p>
                    <p className="pm-statValue">{formatVolume(featuredMarket.volumeUsd)}</p>
                  </div>
                  <div className="pm-stat">
                    <p className="pm-eyebrow">Kickoff</p>
                    <p className="pm-statValue">{formatKickoff(featuredMarket.kickoffAt)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link className="pm-primaryButton" href={`/markets/${featuredMarket.id}`}>
                    Open market
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            ) : null}

            {groupedEntries.length > 0 ? (
              groupedEntries.map(([group, markets]) => (
                <MarketGroupSection group={group} key={group} markets={markets} />
              ))
            ) : (
              <div className="pm-card pm-cardPad text-center">
                <Activity className="mx-auto h-8 w-8 text-[#2f9bff]" />
                <h2 className="mt-4 text-xl font-bold text-white">World Cup market list is empty</h2>
                <p className="mt-2 text-sm text-[#8793a3]">
                  The Crowdline shell is ready, but the local event pool needs markets.
                </p>
              </div>
            )}
          </section>

          <RightRail featuredMarket={featuredMarket} />
        </div>
      </div>
    </main>
  );
}
