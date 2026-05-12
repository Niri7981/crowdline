import type { ArenaEvent } from "@/lib/types/event";
import { assertSupportedMarketSymbol } from "@/lib/server/market-data/get-live-price";

import { buildDemoMarket } from "@/lib/server/rounds/demo-market";

import {
  getEventPoolItemById,
  getReadyEventPool,
  type InternalEventPoolItem,
} from "./get-event-pool";

type DemoArenaEvent = Pick<
  InternalEventPoolItem,
  | "category"
  | "currentPrice"
  | "durationSeconds"
  | "endsAt"
  | "externalEventId"
  | "externalMarketId"
  | "externalUrl"
  | "id"
  | "liquidityScore"
  | "marketSymbol"
  | "noLabel"
  | "playable"
  | "question"
  | "resolutionSource"
  | "slug"
  | "sourceKey"
  | "sourceLabel"
  | "spectatorNote"
  | "stageLabel"
  | "startsAt"
  | "status"
  | "title"
  | "volumeUsd"
  | "yesLabel"
>;

export type SelectedRoundEvent = {
  poolItem: InternalEventPoolItem;
  market: ReturnType<typeof buildDemoMarket>;
  eventInput: Omit<ArenaEvent, "id">;
};

export type SelectRoundEventInput = {
  durationSeconds?: number;
  eventId?: string;
  startsAt?: Date;
};

const DEMO_ARENA_EVENTS = new Map<string, DemoArenaEvent>([
  [
    "e1",
    {
      category: "crypto",
      currentPrice: 152.4,
      durationSeconds: 5 * 60,
      endsAt: null,
      externalEventId: "demo-sol-200-may-31",
      externalMarketId: null,
      externalUrl: null,
      id: "e1",
      liquidityScore: 92,
      marketSymbol: "SOL",
      noLabel: "No",
      playable: true,
      question: "Will SOL break $200 before the end of May?",
      resolutionSource: "Pyth Mainnet",
      slug: "demo-sol-200-may-31",
      sourceKey: "polymarket",
      sourceLabel: "Pyth",
      spectatorNote: "Demo event locked from the landing page selection.",
      stageLabel: "Market Stage",
      startsAt: null,
      status: "ready",
      title: "SOL > $200 by May 31",
      volumeUsd: 680_000,
      yesLabel: "Yes",
    },
  ],
  [
    "e2",
    {
      category: "crypto",
      currentPrice: 101_250,
      durationSeconds: 5 * 60,
      endsAt: null,
      externalEventId: "demo-btc-100k-week",
      externalMarketId: null,
      externalUrl: null,
      id: "e2",
      liquidityScore: 88,
      marketSymbol: "BTC",
      noLabel: "No",
      playable: true,
      question: "Will BTC close above $100k this week?",
      resolutionSource: "Coinbase API",
      slug: "demo-btc-100k-week",
      sourceKey: "polymarket",
      sourceLabel: "Coinbase",
      spectatorNote: "Demo event locked from the landing page selection.",
      stageLabel: "Market Stage",
      startsAt: null,
      status: "ready",
      title: "BTC > $100K this week",
      volumeUsd: 420_000,
      yesLabel: "Yes",
    },
  ],
  [
    "e3",
    {
      category: "crypto",
      currentPrice: 3_240,
      durationSeconds: 5 * 60,
      endsAt: null,
      externalEventId: "demo-eth-outruns-sol-24h",
      externalMarketId: null,
      externalUrl: null,
      id: "e3",
      liquidityScore: 84,
      marketSymbol: "ETH",
      noLabel: "No",
      playable: true,
      question: "Will ETH outperform SOL in the next 24h?",
      resolutionSource: "Binance Feed",
      slug: "demo-eth-outruns-sol-24h",
      sourceKey: "polymarket",
      sourceLabel: "Binance",
      spectatorNote: "Demo event locked from the landing page selection.",
      stageLabel: "Market Stage",
      startsAt: null,
      status: "ready",
      title: "ETH outruns SOL in 24h",
      volumeUsd: 550_000,
      yesLabel: "Yes",
    },
  ],
]);

function getDemoArenaEvent(eventId: string | undefined) {
  return eventId ? DEMO_ARENA_EVENTS.get(eventId) ?? null : null;
}

function supportsLiveObservation(marketSymbol: string) {
  try {
    assertSupportedMarketSymbol(marketSymbol);
    return true;
  } catch {
    return false;
  }
}

function shouldUsePolymarketMarketObservation(poolItem: DemoArenaEvent | InternalEventPoolItem) {
  return Boolean(
    poolItem.sourceKey === "polymarket" &&
      poolItem.externalMarketId &&
      poolItem.currentPrice != null,
  );
}

// Round 层不应该再自己发明事件。
// 它只应该从内部 Event Pool 里挑一条事件，然后展开成 battle 需要的市场快照。
export async function selectRoundEvent(
  input: SelectRoundEventInput = {},
): Promise<SelectedRoundEvent> {
  const explicitlySelectedEvent =
    getDemoArenaEvent(input.eventId) ??
    (input.eventId ? await getEventPoolItemById(input.eventId) : null);
  const fallbackLiveEvent =
    explicitlySelectedEvent == null
      ? DEMO_ARENA_EVENTS.get("e1") ??
        (await getReadyEventPool(8)).find((event) =>
          supportsLiveObservation(event.marketSymbol),
        ) ?? null
      : null;
  const poolItem = explicitlySelectedEvent ?? fallbackLiveEvent;

  if (!poolItem) {
    throw new Error("Event Pool is empty.");
  }

  const market = buildDemoMarket({
    durationSeconds: input.durationSeconds ?? poolItem.durationSeconds,
    externalMarketId: poolItem.externalMarketId,
    marketSymbol: poolItem.marketSymbol,
    observationType: shouldUsePolymarketMarketObservation(poolItem)
      ? "polymarket-price"
      : "fact-price",
    question: shouldUsePolymarketMarketObservation(poolItem)
      ? `Will ${poolItem.yesLabel} price be higher in ${Math.round((input.durationSeconds ?? poolItem.durationSeconds) / 60)} minutes?`
      : poolItem.question,
    resolutionSource: shouldUsePolymarketMarketObservation(poolItem)
      ? "Indexed Polymarket market price"
      : poolItem.resolutionSource,
    slug: poolItem.slug,
    startPrice: poolItem.currentPrice,
    startsAt: input.startsAt,
  });

  return {
    eventInput: {
      externalMarketId: poolItem.externalMarketId,
      outcome: "pending",
      observationType: market.observationType,
      question: market.question,
      resolutionSource: market.resolutionSource,
      slug: poolItem.slug,
      sourceKey: poolItem.sourceKey,
    },
    market,
    poolItem,
  };
}
