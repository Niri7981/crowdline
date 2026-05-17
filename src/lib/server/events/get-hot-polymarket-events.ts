import type { EventPoolCategory, HotPolymarketEvent } from "./types";
import type { PolymarketRawEventCandidate } from "./sources/polymarket";

const POLYMARKET_EVENTS_URL = "https://gamma-api.polymarket.com/events";
const DEFAULT_PROXY_URL = "http://127.0.0.1:6324";
const HOT_EVENT_TIMEOUT_MS = 12_000;
const MIN_INTERESTING_PRICE = 0.12;
const MAX_INTERESTING_PRICE = 0.88;
const MAX_HOT_EVENT_HORIZON_DAYS = 365;

type PolymarketMarket = {
  active?: boolean;
  clobTokenIds?: string;
  closed?: boolean;
  conditionId?: string;
  endDate?: string | null;
  id?: string | number;
  liquidity?: string | number | null;
  liquidityNum?: string | number | null;
  outcomePrices?: string;
  outcomes?: string;
  question?: string;
  slug?: string;
  volume?: string | number | null;
  volumeNum?: string | number | null;
};

type PolymarketEvent = {
  active?: boolean;
  category?: string | null;
  closed?: boolean;
  endDate?: string | null;
  id?: string | number;
  liquidity?: string | number | null;
  markets?: PolymarketMarket[];
  slug?: string;
  title?: string;
  volume?: string | number | null;
  volume24hr?: string | number | null;
};

export function readPolymarketProxyUrl() {
  return process.env.AGENTDUEL_INDEXER_PROXY ??
    process.env.AGENTDUEL_POLYMARKET_PROXY ??
    DEFAULT_PROXY_URL;
}

async function fetchJsonWithTimeout(input: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, HOT_EVENT_TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonViaProxy(input: string) {
  const proxyUrl = readPolymarketProxyUrl();

  if (!proxyUrl) {
    return fetchJsonWithTimeout(input);
  }

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);
  const { stdout } = await execFileAsync(
    "curl",
    [
      "-sS",
      "--max-time",
      String(Math.ceil(HOT_EVENT_TIMEOUT_MS / 1000)),
      "--proxy",
      proxyUrl,
      input,
    ],
    {
      maxBuffer: 32 * 1024 * 1024,
    },
  );

  if (stdout.trim().length === 0) {
    throw new Error("Polymarket returned an empty response.");
  }

  return JSON.parse(stdout) as unknown;
}

function parseJsonArray(value: string | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readNumber(value: string | number | null | undefined) {
  if (value == null) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function readDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function mapCategory(
  value: string | null | undefined,
  question: string | null | undefined,
): EventPoolCategory {
  const normalized = value?.toLowerCase() ?? "";
  const normalizedQuestion = question?.toLowerCase() ?? "";

  if (normalized.includes("crypto")) {
    return "crypto";
  }

  if (
    normalized.includes("sport") ||
    normalizedQuestion.includes("nba") ||
    normalizedQuestion.includes("nhl") ||
    normalizedQuestion.includes("fifa") ||
    normalizedQuestion.includes("world cup") ||
    normalizedQuestion.includes("premier league") ||
    normalizedQuestion.includes("champions league")
  ) {
    return "sports";
  }

  if (
    normalized.includes("macro") ||
    normalized.includes("fed") ||
    normalizedQuestion.includes("fed") ||
    normalizedQuestion.includes("rate cut")
  ) {
    return "macro";
  }

  if (
    normalized.includes("politic") ||
    normalized.includes("news") ||
    normalizedQuestion.includes("election") ||
    normalizedQuestion.includes("president") ||
    normalizedQuestion.includes("governor")
  ) {
    return "headline";
  }

  return "other";
}

function isFutureEvent(endsAt: string | null | undefined) {
  const endDate = readDate(endsAt);

  if (!endDate) {
    return false;
  }

  const now = Date.now();
  const maxHorizonMs = MAX_HOT_EVENT_HORIZON_DAYS * 24 * 60 * 60 * 1000;

  return endDate.getTime() > now && endDate.getTime() <= now + maxHorizonMs;
}

function isInterestingPrice(yesPrice: number | null) {
  if (yesPrice == null) {
    return false;
  }

  return yesPrice >= MIN_INTERESTING_PRICE && yesPrice <= MAX_INTERESTING_PRICE;
}

function pickHotMarket(event: PolymarketEvent) {
  const markets = event.markets ?? [];
  const rankedMarkets = markets
    .map((market) => {
      const outcomes = parseJsonArray(market.outcomes);
      const prices = parseJsonArray(market.outcomePrices);
      const yesIndex = outcomes.findIndex(
        (outcome) => String(outcome).toLowerCase() === "yes",
      );
      const yesPrice = readNumber(prices[yesIndex >= 0 ? yesIndex : 0]);
      const marketVolume =
        readNumber(market.volumeNum) ?? readNumber(market.volume) ?? 0;
      const marketLiquidity =
        readNumber(market.liquidityNum) ?? readNumber(market.liquidity) ?? 0;

      return {
        interestDistance: yesPrice == null ? Number.POSITIVE_INFINITY : Math.abs(yesPrice - 0.5),
        market,
        marketLiquidity,
        marketVolume,
        yesPrice,
      };
    })
    .filter(({ market, yesPrice }) => {
      const active = market.active ?? event.active ?? true;
      const closed = market.closed ?? false;
      const endsAt = market.endDate ?? event.endDate ?? null;

      return Boolean(active) && !closed && isFutureEvent(endsAt) && isInterestingPrice(yesPrice);
    })
    .sort((left, right) => {
      const rightScore = right.marketVolume + right.marketLiquidity;
      const leftScore = left.marketVolume + left.marketLiquidity;

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return left.interestDistance - right.interestDistance;
    });

  return rankedMarkets[0]?.market ?? null;
}

export function mapHotPolymarketEvent(event: PolymarketEvent): HotPolymarketEvent | null {
  if (event.closed || event.active === false || !isFutureEvent(event.endDate)) {
    return null;
  }

  const market = pickHotMarket(event);

  if (!market) {
    return null;
  }

  const outcomes = parseJsonArray(market.outcomes);
  const prices = parseJsonArray(market.outcomePrices);
  const yesIndex = outcomes.findIndex(
    (outcome) => String(outcome).toLowerCase() === "yes",
  );
  const noIndex = outcomes.findIndex(
    (outcome) => String(outcome).toLowerCase() === "no",
  );
  const yesPrice = readNumber(prices[yesIndex >= 0 ? yesIndex : 0]);
  const noPrice = readNumber(prices[noIndex >= 0 ? noIndex : 1]);

  if (!isInterestingPrice(yesPrice)) {
    return null;
  }

  const eventId = event.id == null ? market.id : event.id;
  const marketId = market.id == null ? null : String(market.id);
  const endsAt = market.endDate ?? event.endDate ?? null;
  const volumeUsd =
    readNumber(event.volume24hr) ??
    readNumber(event.volume) ??
    readNumber(market.volumeNum) ??
    readNumber(market.volume);
  const liquidityScore =
    readNumber(event.liquidity) ??
    readNumber(market.liquidityNum) ??
    readNumber(market.liquidity);

  return {
    category: mapCategory(event.category, market.question ?? event.title),
    endsAt,
    externalEventId: String(eventId),
    externalMarketId: marketId,
    externalUrl: event.slug ? `https://polymarket.com/event/${event.slug}` : null,
    id: `poly-hot-${eventId}`,
    liquidityScore,
    noLabel: "No",
    noPrice,
    question: market.question ?? event.title ?? "Polymarket event",
    slug: market.slug ?? event.slug ?? null,
    sourceKey: "polymarket",
    spectatorNote:
      "Hot Polymarket event with live market disagreement, suitable for arena selection.",
    stageLabel: "Hot Market",
    title: event.title ?? market.question ?? "Polymarket event",
    volumeUsd,
    yesLabel: "Yes",
    yesPrice,
  };
}

export function mapHotPolymarketEventToCandidate(
  hotEvent: HotPolymarketEvent,
): PolymarketRawEventCandidate {
  return {
    event: {
      active: true,
      category: hotEvent.category,
      closed: false,
      endDate: hotEvent.endsAt,
      id: hotEvent.externalEventId,
      liquidity: hotEvent.liquidityScore,
      slug: hotEvent.slug,
      title: hotEvent.title,
      volume: hotEvent.volumeUsd,
    },
    market: {
      active: true,
      closed: false,
      endDate: hotEvent.endsAt,
      id: hotEvent.externalMarketId,
      outcomePrices: JSON.stringify([
        hotEvent.yesPrice == null ? null : String(hotEvent.yesPrice),
        hotEvent.noPrice == null ? null : String(hotEvent.noPrice),
      ]),
      outcomes: JSON.stringify([hotEvent.yesLabel, hotEvent.noLabel]),
      question: hotEvent.question,
      slug: hotEvent.slug,
      volume: hotEvent.volumeUsd,
    },
  };
}

// 这里在干嘛：
// 从 Polymarket 热门事件里挑出还有悬念的市场，作为 arena 可观战候选。
// 为什么这么写：
// 0/1 附近的事件已经没有比赛张力；热门但价格仍在中间区间的事件更适合 agent duel。
// 最后返回什么：
// 返回最多 limit 个热门、活跃、未收盘、YES 价格不极端的 Polymarket events。
export async function getHotPolymarketEvents(limit = 10) {
  const url = new URL(POLYMARKET_EVENTS_URL);

  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("limit", String(Math.max(limit * 16, 80)));
  url.searchParams.set("order", "volume_24hr");
  url.searchParams.set("ascending", "false");

  const payload = await fetchJsonViaProxy(url.toString());
  const events = Array.isArray(payload) ? (payload as PolymarketEvent[]) : [];

  return events
    .map((event) => mapHotPolymarketEvent(event))
    .filter((event): event is HotPolymarketEvent => event != null)
    .sort((left, right) => {
      const rightVolume = right.volumeUsd ?? 0;
      const leftVolume = left.volumeUsd ?? 0;

      if (rightVolume !== leftVolume) {
        return rightVolume - leftVolume;
      }

      return (right.liquidityScore ?? 0) - (left.liquidityScore ?? 0);
    })
    .slice(0, limit);
}
