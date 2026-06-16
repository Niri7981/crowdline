import { prisma } from "@/lib/db/prisma";
import { readPolymarketProxyUrl } from "@/lib/server/events/get-hot-polymarket-events";
import {
  getEventPool,
  type InternalEventPoolItem,
} from "@/lib/server/events/get-event-pool";

export type CrowdlineMarketGroup = "later" | "today" | "tomorrow";
export type CrowdlineTradingStatus = "locked" | "open" | "preopen";

export type CrowdlinePricePoint = {
  id: string;
  noPrice: number | null;
  outcomePrices?: Record<string, number | null>;
  price: number;
  sourceLabel: string;
  timestamp: string;
};

export type CrowdlineUnderlyingMarketKind = "binary" | "multi" | "unknown";

export type CrowdlineUnderlyingOutcome = {
  id: string;
  label: string;
  marketId?: string | null;
  price: number | null;
  rawLabel: string;
  tokenId: string | null;
};

export type CrowdlineMarketSummary = {
  currentPrice: number | null;
  driftSinceOpen: number | null;
  externalUrl: string | null;
  group: CrowdlineMarketGroup;
  id: string;
  kickoffAt: string | null;
  latestObservedAt: string | null;
  lockAt: string | null;
  marketGroupTitle: string | null;
  noPrice: number | null;
  openAt: string | null;
  openPrice: number | null;
  outcomeKind: CrowdlineUnderlyingMarketKind;
  outcomes: CrowdlineUnderlyingOutcome[];
  primaryOutcomeLabel: string;
  question: string;
  secondaryOutcomeLabel: string | null;
  sourceLabel: string;
  stageLabel: string;
  startsAt: string | null;
  title: string;
  tradingStatus: CrowdlineTradingStatus;
  underlyingMarketId: string | null;
  volumeUsd: number | null;
};

export type CrowdlineMarketDetail = CrowdlineMarketSummary & {
  chartSeries: CrowdlinePricePoint[];
  externalEventId: string;
  liquidityScore: number | null;
  slug: string | null;
  underlyingLabel: string;
};

export type CrowdlineHomePayload = {
  featuredMarket: CrowdlineMarketSummary | null;
  markets: CrowdlineMarketSummary[];
  marketsByGroup: Record<CrowdlineMarketGroup, CrowdlineMarketSummary[]>;
};

type UnderlyingMarketMetadata = {
  displayTitle: string;
  externalUrl: string | null;
  groupTitle: string | null;
  kind: CrowdlineUnderlyingMarketKind;
  outcomes: CrowdlineUnderlyingOutcome[];
  question: string;
};

const MANUAL_FEATURED_SLUGS = [
  "will-france-win-the-2026-fifa-world-cup-924",
];
const POLYMARKET_CLOB_HISTORY_URL = "https://clob.polymarket.com/prices-history";
const POLYMARKET_GAMMA_EVENTS_URL = "https://gamma-api.polymarket.com/events";
const POLYMARKET_GAMMA_MARKETS_URL = "https://gamma-api.polymarket.com/markets";
const POLYMARKET_HISTORY_TIMEOUT_MS = 12_000;
const MAX_HISTORY_OUTCOME_LINES = 6;
const MAX_HISTORY_POINTS = 900;

function isWorldCupMarket(event: InternalEventPoolItem) {
  const haystack = [
    event.title,
    event.question,
    event.slug,
    event.externalUrl,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    event.category === "sports" &&
    (haystack.includes("world cup") ||
      haystack.includes("fifa") ||
      haystack.includes("fifwc"))
  );
}

function deriveKickoffAt(event: InternalEventPoolItem) {
  return event.startsAt ?? event.endsAt ?? null;
}

function deriveOpenAt(kickoffAt: Date | null) {
  if (!kickoffAt) {
    return null;
  }

  return new Date(kickoffAt.getTime() - 24 * 60 * 60 * 1000);
}

function deriveTradingStatus(
  openAt: Date | null,
  lockAt: Date | null,
): CrowdlineTradingStatus {
  const now = Date.now();

  if (lockAt && now >= lockAt.getTime()) {
    return "locked";
  }

  if (openAt && now >= openAt.getTime()) {
    return "open";
  }

  return "preopen";
}

function deriveMarketGroup(kickoffAt: Date | null): CrowdlineMarketGroup {
  if (!kickoffAt) {
    return "later";
  }

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const laterStart = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

  if (kickoffAt < tomorrowStart) {
    return "today";
  }

  if (kickoffAt < laterStart) {
    return "tomorrow";
  }

  return "later";
}

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getOutcomeKind(outcomeCount: number): CrowdlineUnderlyingMarketKind {
  if (outcomeCount === 2) {
    return "binary";
  }

  if (outcomeCount > 2) {
    return "multi";
  }

  return "unknown";
}

function buildOutcomeId(index: number) {
  return `outcome-${index}`;
}

function buildOutcomeLabel(
  rawLabel: string,
  index: number,
  groupItemTitle: string | null,
  kind: CrowdlineUnderlyingMarketKind,
) {
  const lowerLabel = rawLabel.toLowerCase();

  if (kind === "binary" && groupItemTitle && lowerLabel === "yes") {
    return groupItemTitle;
  }

  if (kind === "binary" && groupItemTitle && lowerLabel === "no") {
    return `Not ${groupItemTitle}`;
  }

  return rawLabel || `Outcome ${index + 1}`;
}

function buildWorldCupWinnerTitle(
  groupItemTitle: string | null,
  question: string,
) {
  if (!groupItemTitle) {
    return question;
  }

  const worldCupWinnerQuestion = /^will\s+.+?\s+win the 2026 fifa world cup\??$/i;

  if (worldCupWinnerQuestion.test(question)) {
    return `${groupItemTitle} wins the 2026 FIFA World Cup`;
  }

  return question;
}

function buildPolymarketEventUrl(slug: string | null) {
  return slug ? `https://polymarket.com/event/${slug}` : null;
}

function deriveGroupItemTitleFromQuestion(question: string | null) {
  if (!question) {
    return null;
  }

  const match = question.match(/^Will\s+(.+?)\s+win the 2026 FIFA World Cup\??$/i);

  return match?.[1]?.trim() ?? null;
}

function pickYesOutcomeFromMarket(market: Record<string, unknown>) {
  const rawOutcomes = parseJsonArray(market.outcomes).map((value) => String(value));
  const outcomePrices = parseJsonArray(market.outcomePrices);
  const clobTokenIds = parseJsonArray(market.clobTokenIds);
  const yesIndex = rawOutcomes.findIndex(
    (outcome) => outcome.toLowerCase() === "yes",
  );
  const index = yesIndex >= 0 ? yesIndex : 0;

  return {
    price: readNumber(outcomePrices[index]),
    rawLabel: rawOutcomes[index] ?? "Yes",
    tokenId: clobTokenIds[index] == null ? null : String(clobTokenIds[index]),
  };
}

function isActivePolymarketChildMarket(market: Record<string, unknown>) {
  return market.active !== false && market.closed !== true;
}

function buildFallbackUnderlyingMetadata(
  event: InternalEventPoolItem,
): UnderlyingMarketMetadata {
  const rawOutcomes = [event.yesLabel, event.noLabel].filter(
    (value) => value.trim().length > 0,
  );
  const kind = getOutcomeKind(rawOutcomes.length);
  const outcomes = rawOutcomes.map((rawLabel, index) => ({
    id: buildOutcomeId(index),
    label: rawLabel,
    price:
      index === 0
        ? event.currentPrice
        : event.currentPrice == null
          ? null
          : Number((1 - event.currentPrice).toFixed(4)),
    rawLabel,
    tokenId: null,
  }));

  return {
    displayTitle: event.question || event.title,
    externalUrl: event.externalUrl,
    groupTitle: event.title === event.question ? null : event.title,
    kind,
    outcomes,
    question: event.question,
  };
}

function buildUnderlyingMetadataFromGammaEvent(
  event: InternalEventPoolItem,
  gammaEvent: Record<string, unknown>,
): UnderlyingMarketMetadata | null {
  const childMarkets = Array.isArray(gammaEvent.markets)
    ? (gammaEvent.markets as Record<string, unknown>[])
    : [];

  if (childMarkets.length <= 1) {
    return null;
  }

  const displayTitle =
    event.title ||
    readString(gammaEvent.title)?.trim() ||
    readString(gammaEvent.question) ||
    "World Cup Winner";
  const eventSlug = readString(gammaEvent.slug);
  const outcomes = childMarkets
    .filter(isActivePolymarketChildMarket)
    .flatMap((market) => {
      const question = readString(market.question);
      const label =
        readString(market.groupItemTitle) ??
        deriveGroupItemTitleFromQuestion(question);
      const marketId = market.id == null ? null : String(market.id);
      const yesOutcome = pickYesOutcomeFromMarket(market);

      if (!label || !marketId || yesOutcome.price == null) {
        return [];
      }

      return [
        {
          id: `market-${marketId}`,
          label,
          marketId,
          price: yesOutcome.price,
          rawLabel: yesOutcome.rawLabel,
          tokenId: yesOutcome.tokenId,
        },
      ];
    })
    .sort((left, right) => (right.price ?? 0) - (left.price ?? 0));

  if (outcomes.length <= 2) {
    return null;
  }

  return {
    displayTitle,
    externalUrl: buildPolymarketEventUrl(eventSlug) ?? event.externalUrl,
    groupTitle: displayTitle,
    kind: "multi",
    outcomes,
    question:
      readString(gammaEvent.question) ??
      (displayTitle.toLowerCase().includes("world cup")
        ? "Who will win the 2026 FIFA World Cup?"
        : `Who will win ${displayTitle.replace(/\s+/g, " ").trim()}?`),
  };
}

function buildUnderlyingMetadataFromGammaMarket(
  event: InternalEventPoolItem,
  market: Record<string, unknown>,
): UnderlyingMarketMetadata {
  const rawOutcomes = parseJsonArray(market.outcomes)
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (rawOutcomes.length === 0) {
    return buildFallbackUnderlyingMetadata(event);
  }

  const kind = getOutcomeKind(rawOutcomes.length);
  const groupItemTitle = readString(market.groupItemTitle);
  const outcomePrices = parseJsonArray(market.outcomePrices);
  const clobTokenIds = parseJsonArray(market.clobTokenIds);
  const question = readString(market.question) ?? event.question;
  const displayTitle =
    kind === "binary"
      ? buildWorldCupWinnerTitle(groupItemTitle, question)
      : readString(market.title) ?? question ?? event.title;
  const outcomes = rawOutcomes.map((rawLabel, index) => ({
    id: buildOutcomeId(index),
    label: buildOutcomeLabel(rawLabel, index, groupItemTitle, kind),
    marketId: market.id == null ? null : String(market.id),
    price: readNumber(outcomePrices[index]),
    rawLabel,
    tokenId: clobTokenIds[index] == null ? null : String(clobTokenIds[index]),
  }));

  return {
    displayTitle,
    externalUrl: event.externalUrl,
    groupTitle: event.title === displayTitle ? null : event.title,
    kind,
    outcomes,
    question,
  };
}

async function readUnderlyingMarketMetadata(
  event: InternalEventPoolItem,
): Promise<UnderlyingMarketMetadata> {
  try {
    if (event.externalEventId) {
      const gammaEventPayload = await fetchPolymarketJson(
        `${POLYMARKET_GAMMA_EVENTS_URL}/${encodeURIComponent(event.externalEventId)}`,
      );
      const groupMetadata = buildUnderlyingMetadataFromGammaEvent(
        event,
        gammaEventPayload as Record<string, unknown>,
      );

      if (groupMetadata) {
        return groupMetadata;
      }
    }

    if (!event.externalMarketId) {
      return buildFallbackUnderlyingMetadata(event);
    }

    const marketPayload = await fetchPolymarketJson(
      `${POLYMARKET_GAMMA_MARKETS_URL}/${encodeURIComponent(event.externalMarketId)}`,
    );

    return buildUnderlyingMetadataFromGammaMarket(
      event,
      marketPayload as Record<string, unknown>,
    );
  } catch (error) {
    console.warn(
      "Failed to read Polymarket market metadata.",
      error instanceof Error ? error.message : error,
    );

    return buildFallbackUnderlyingMetadata(event);
  }
}

function shouldSkipTlsVerificationForProxy(proxyUrl: string) {
  if (process.env.CROWDLINE_POLYMARKET_PROXY_INSECURE === "true") {
    return true;
  }

  try {
    const hostname = new URL(proxyUrl).hostname;

    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}

async function fetchPolymarketJson(input: string) {
  const proxyUrl = readPolymarketProxyUrl();

  if (!proxyUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, POLYMARKET_HISTORY_TIMEOUT_MS);

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

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);
  const args = [
    "-sS",
    "--max-time",
    String(Math.ceil(POLYMARKET_HISTORY_TIMEOUT_MS / 1000)),
    "--proxy",
    proxyUrl,
  ];

  if (shouldSkipTlsVerificationForProxy(proxyUrl)) {
    args.push("-k");
  }

  args.push(input);

  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 32 * 1024 * 1024,
  });

  if (stdout.trim().length === 0) {
    throw new Error("Polymarket returned an empty response.");
  }

  return JSON.parse(stdout) as unknown;
}

async function readTokenIdFromGammaMarket(
  externalMarketId: string,
  side: "no" | "yes",
) {
  const payload = await fetchPolymarketJson(
    `${POLYMARKET_GAMMA_MARKETS_URL}/${encodeURIComponent(externalMarketId)}`,
  );
  const market = payload as Record<string, unknown>;
  const outcomes = parseJsonArray(market.outcomes);
  const clobTokenIds = parseJsonArray(market.clobTokenIds);
  const sideIndex = outcomes.findIndex(
    (outcome) => String(outcome).toLowerCase() === side,
  );

  if (sideIndex >= 0 && clobTokenIds[sideIndex]) {
    return String(clobTokenIds[sideIndex]);
  }

  if (side === "yes" && clobTokenIds[0]) {
    return String(clobTokenIds[0]);
  }

  if (side === "no" && clobTokenIds[1]) {
    return String(clobTokenIds[1]);
  }

  return null;
}

async function readUnderlyingTokenId(
  externalMarketId: string | null,
  side: "no" | "yes",
) {
  if (!externalMarketId) {
    return null;
  }

  const latestTick = await prisma.marketTick.findFirst({
    orderBy: [{ observedAt: "desc" }, { id: "desc" }],
    where: {
      marketId: externalMarketId,
      side,
      sourceKey: "polymarket",
    },
  });

  if (latestTick?.tokenId) {
    return latestTick.tokenId;
  }

  return readTokenIdFromGammaMarket(externalMarketId, side);
}

type OutcomeHistorySeries = {
  outcome: CrowdlineUnderlyingOutcome;
  points: Array<{
    price: number;
    timestamp: string;
  }>;
};

function mapPolymarketHistory(
  payload: unknown,
  outcome: CrowdlineUnderlyingOutcome,
): OutcomeHistorySeries {
  const history = Array.isArray((payload as { history?: unknown }).history)
    ? ((payload as { history: unknown[] }).history)
    : [];
  const points = history.flatMap((entry) => {
    const record = entry as Record<string, unknown>;
    const timestampSeconds = readNumber(record.t);
    const price = readNumber(record.p);

    if (timestampSeconds == null || price == null) {
      return [];
    }

    const timestamp = new Date(timestampSeconds * 1000);

    if (Number.isNaN(timestamp.getTime())) {
      return [];
    }

    return [
      {
        price,
        timestamp: timestamp.toISOString(),
      },
    ];
  });

  return {
    outcome,
    points,
  };
}

function samplePriceSeries(points: CrowdlinePricePoint[]) {
  if (points.length <= MAX_HISTORY_POINTS) {
    return points;
  }

  const step = Math.ceil(points.length / MAX_HISTORY_POINTS);

  return points.filter((_, index) => index % step === 0 || index === points.length - 1);
}

function mergeOutcomeHistorySeries(
  metadata: UnderlyingMarketMetadata,
  histories: OutcomeHistorySeries[],
) {
  const updatesByTimestamp = new Map<
    string,
    Array<{ outcomeId: string; price: number }>
  >();

  for (const history of histories) {
    for (const point of history.points) {
      const updates = updatesByTimestamp.get(point.timestamp) ?? [];

      updates.push({
        outcomeId: history.outcome.id,
        price: point.price,
      });
      updatesByTimestamp.set(point.timestamp, updates);
    }
  }

  const timestamps = Array.from(updatesByTimestamp.keys()).sort(
    (left, right) => new Date(left).getTime() - new Date(right).getTime(),
  );
  const latestPrices = new Map<string, number>();
  const primaryOutcomeId = metadata.outcomes[0]?.id ?? buildOutcomeId(0);
  const secondaryOutcomeId = metadata.outcomes[1]?.id ?? null;

  return timestamps.flatMap((timestamp, index) => {
    const updates = updatesByTimestamp.get(timestamp) ?? [];

    for (const update of updates) {
      latestPrices.set(update.outcomeId, update.price);
    }

    const primaryPrice = latestPrices.get(primaryOutcomeId);

    if (primaryPrice == null) {
      return [];
    }

    const secondaryPriceFromHistory = secondaryOutcomeId
      ? latestPrices.get(secondaryOutcomeId)
      : null;
    const secondaryPrice =
      secondaryPriceFromHistory ??
      (metadata.kind === "binary"
        ? Number((1 - primaryPrice).toFixed(4))
        : null);
    const outcomePrices = Object.fromEntries(
      metadata.outcomes.map((outcome) => [
        outcome.id,
        latestPrices.get(outcome.id) ??
          (metadata.kind === "binary" && outcome.id === secondaryOutcomeId
            ? secondaryPrice
            : null),
      ]),
    );

    return [
      {
        id: `polymarket-history:${timestamp}:${index}`,
        noPrice: secondaryPrice,
        outcomePrices,
        price: primaryPrice,
        sourceLabel: "Polymarket CLOB history",
        timestamp,
      },
    ];
  });
}

// 这里在干嘛：
// 从 Polymarket CLOB 的 prices-history API 拉每个 outcome token 的全历史价格。
// 为什么这么写：
// Crowdline 的核心图应该展示真实 underlying market 的历史，而不是只展示本地 indexer 的少量 tick；
// CLOB history 是 Polymarket 原始价格路径，并且 market 是 binary 还是 multi 必须由 Gamma outcomes 决定。
// 最后返回什么：
// 返回按时间升序、已经合并 outcome prices 且采样过的 CrowdlinePricePoint；失败时返回空数组。
async function readPolymarketHistorySeries(
  externalMarketId: string | null,
  metadata: UnderlyingMarketMetadata,
) {
  try {
    const tokenOutcomes = metadata.outcomes
      .filter((outcome) => outcome.tokenId)
      .slice(
        0,
        metadata.kind === "multi"
          ? MAX_HISTORY_OUTCOME_LINES
          : metadata.outcomes.length,
      );

    if (tokenOutcomes.length === 0) {
      const yesTokenId = await readUnderlyingTokenId(externalMarketId, "yes");
      const noTokenId = await readUnderlyingTokenId(externalMarketId, "no");

      if (!yesTokenId) {
        return [];
      }

      tokenOutcomes.push({
        id: buildOutcomeId(0),
        label: metadata.outcomes[0]?.label ?? "Yes",
        price: null,
        rawLabel: metadata.outcomes[0]?.rawLabel ?? "Yes",
        tokenId: yesTokenId,
      });

      if (noTokenId) {
        tokenOutcomes.push({
          id: buildOutcomeId(1),
          label: metadata.outcomes[1]?.label ?? "No",
          price: null,
          rawLabel: metadata.outcomes[1]?.rawLabel ?? "No",
          tokenId: noTokenId,
        });
      }
    }

    const histories = await Promise.all(
      tokenOutcomes.map(async (outcome) => {
        const url = new URL(POLYMARKET_CLOB_HISTORY_URL);

        url.searchParams.set("market", outcome.tokenId ?? "");
        url.searchParams.set("interval", "max");
        url.searchParams.set("fidelity", "60");

        return mapPolymarketHistory(await fetchPolymarketJson(url.toString()), outcome);
      }),
    );
    const mergedPoints = mergeOutcomeHistorySeries(metadata, histories).sort(
      (left, right) =>
        new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
    );

    return samplePriceSeries(mergedPoints);
  } catch (error) {
    console.warn(
      "Failed to read Polymarket history.",
      error instanceof Error ? error.message : error,
    );

    return [];
  }
}

async function readUnderlyingPriceSeries(
  externalMarketId: string | null,
  openAt: Date | null,
  metadata: UnderlyingMarketMetadata,
): Promise<CrowdlinePricePoint[]> {
  if (!externalMarketId) {
    return [];
  }

  const now = Date.now();
  const effectiveOpenAt = openAt && openAt.getTime() <= now ? openAt : null;

  const ticks = await prisma.marketTick.findMany({
    orderBy: [{ observedAt: "asc" }, { id: "asc" }],
    take: 240,
    where: {
      marketId: externalMarketId,
      observedAt: effectiveOpenAt
        ? {
            gte: effectiveOpenAt,
          }
        : undefined,
      side: "yes",
      sourceKey: "polymarket",
    },
  });

  const primaryOutcomeId = metadata.outcomes[0]?.id ?? buildOutcomeId(0);
  const secondaryOutcomeId = metadata.outcomes[1]?.id ?? null;

  return ticks.map((tick) => {
    const secondaryPrice =
      metadata.kind === "binary" ? Number((1 - tick.price).toFixed(4)) : null;
    const outcomePrices: Record<string, number | null> = {
      [primaryOutcomeId]: tick.price,
    };

    if (secondaryOutcomeId) {
      outcomePrices[secondaryOutcomeId] = secondaryPrice;
    }

    return {
      id: tick.id,
      noPrice: secondaryPrice,
      outcomePrices,
      price: tick.price,
      sourceLabel: tick.sourceLabel,
      timestamp: tick.observedAt.toISOString(),
    };
  });
}

async function readLatestUnderlyingQuote(externalMarketId: string | null) {
  if (!externalMarketId) {
    return {
      noPrice: null,
      observedAt: null,
      yesPrice: null,
    };
  }

  const ticks = await prisma.marketTick.findMany({
    orderBy: [{ observedAt: "desc" }, { id: "desc" }],
    take: 16,
    where: {
      marketId: externalMarketId,
      sourceKey: "polymarket",
    },
  });
  const latestYes = ticks.find((tick) => tick.side === "yes") ?? null;
  const latestNo = ticks.find((tick) => tick.side === "no") ?? null;
  const observedAt =
    [latestYes?.observedAt, latestNo?.observedAt]
      .filter((value): value is Date => value != null)
      .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;

  return {
    noPrice: latestNo?.price ?? null,
    observedAt,
    yesPrice: latestYes?.price ?? null,
  };
}

function buildFallbackSeries(
  event: InternalEventPoolItem,
  openAt: Date | null,
  metadata: UnderlyingMarketMetadata,
): CrowdlinePricePoint[] {
  const primaryOutcome = metadata.outcomes[0] ?? null;
  const primaryPrice = primaryOutcome?.price ?? event.currentPrice;

  if (primaryPrice == null) {
    return [];
  }

  const secondaryOutcome = metadata.outcomes[1] ?? null;
  const secondaryPrice =
    secondaryOutcome?.price ??
    (metadata.kind === "binary" ? Number((1 - primaryPrice).toFixed(4)) : null);
  const outcomePrices = Object.fromEntries(
    metadata.outcomes.map((outcome, index) => [
      outcome.id,
      index === 0 ? primaryPrice : index === 1 ? secondaryPrice : outcome.price,
    ]),
  );
  const now = new Date();
  const effectiveStart = openAt && openAt.getTime() <= now.getTime()
    ? openAt
    : event.startsAt ?? now;
  const startTimestamp = effectiveStart.toISOString();

  return [
    {
      id: `${event.id}:open`,
      noPrice: secondaryPrice,
      outcomePrices,
      price: primaryPrice,
      sourceLabel: "Underlying Polymarket market",
      timestamp: startTimestamp,
    },
    {
      id: `${event.id}:current`,
      noPrice: secondaryPrice,
      outcomePrices,
      price: primaryPrice,
      sourceLabel: "Underlying Polymarket market",
      timestamp: now.toISOString(),
    },
  ];
}

// 这里在干嘛：
// 把 arena 时代的 EventPoolItem 读模型翻译成 Crowdline 首页和详情页真正需要的市场摘要。
// 为什么这么写：
// 现有 repo 已经有 EventPoolItem 和 MarketTick；Day 1 不该先造新的 registry 表，
// 先把已有数据解释成世界杯 meta-market 视角下的 read model，最快落地。
// 最后返回什么：
// 返回一条 CrowdlineMarketSummary。
async function mapEventToCrowdlineSummary(
  event: InternalEventPoolItem,
  metadataInput?: UnderlyingMarketMetadata,
): Promise<CrowdlineMarketSummary> {
  const kickoffAt = deriveKickoffAt(event);
  const openAt = deriveOpenAt(kickoffAt);
  const tradingStatus = deriveTradingStatus(openAt, kickoffAt);
  const metadata = metadataInput ?? (await readUnderlyingMarketMetadata(event));
  const latestQuote =
    metadata.kind === "binary"
      ? await readLatestUnderlyingQuote(event.externalMarketId)
      : {
          noPrice: null,
          observedAt: null,
          yesPrice: null,
        };
  const chartSeries =
    metadata.kind === "binary"
      ? await readUnderlyingPriceSeries(event.externalMarketId, openAt, metadata)
      : [];
  const series = chartSeries.length > 0
    ? chartSeries
    : buildFallbackSeries(event, openAt, metadata);
  const primaryOutcome = metadata.outcomes[0] ?? null;
  const secondaryOutcome = metadata.outcomes[1] ?? null;
  const openPrice =
    tradingStatus === "preopen"
      ? null
      : series[0]?.price ?? primaryOutcome?.price ?? event.currentPrice ?? null;
  const currentPrice =
    latestQuote.yesPrice ??
    series[series.length - 1]?.price ??
    primaryOutcome?.price ??
    event.currentPrice ??
    null;
  const noPrice =
    latestQuote.noPrice ??
    secondaryOutcome?.price ??
    (metadata.kind === "binary" && currentPrice != null
      ? Number((1 - currentPrice).toFixed(4))
      : null);
  const driftSinceOpen =
    openPrice == null || currentPrice == null
      ? null
      : Number((currentPrice - openPrice).toFixed(4));
  const outcomes = metadata.outcomes.map((outcome, index) => ({
    ...outcome,
    price:
      index === 0
        ? currentPrice ?? outcome.price
        : index === 1
          ? noPrice ?? outcome.price
          : outcome.price,
  }));

  return {
    currentPrice,
    driftSinceOpen,
    externalUrl: metadata.externalUrl ?? event.externalUrl,
    group: deriveMarketGroup(kickoffAt),
    id: event.id,
    kickoffAt: kickoffAt?.toISOString() ?? null,
    latestObservedAt:
      latestQuote.observedAt?.toISOString() ??
      series[series.length - 1]?.timestamp ??
      null,
    lockAt: kickoffAt?.toISOString() ?? null,
    marketGroupTitle: metadata.groupTitle,
    noPrice,
    openAt: openAt?.toISOString() ?? null,
    openPrice,
    outcomeKind: metadata.kind,
    outcomes,
    primaryOutcomeLabel: outcomes[0]?.label ?? "Outcome",
    question: metadata.question,
    secondaryOutcomeLabel: outcomes[1]?.label ?? null,
    sourceLabel: event.sourceLabel,
    stageLabel: event.stageLabel,
    startsAt: event.startsAt?.toISOString() ?? null,
    title: metadata.displayTitle,
    tradingStatus,
    underlyingMarketId: event.externalMarketId,
    volumeUsd: event.volumeUsd,
  };
}

function pickFeaturedMarket(markets: CrowdlineMarketSummary[]) {
  const manual =
    markets.find((market) =>
      MANUAL_FEATURED_SLUGS.some((slug) => market.externalUrl?.includes(slug)),
    ) ?? null;

  if (manual) {
    return manual;
  }

  return (
    markets
      .slice()
      .sort((left, right) => (right.volumeUsd ?? 0) - (left.volumeUsd ?? 0))[0] ??
    null
  );
}

function groupMarkets(markets: CrowdlineMarketSummary[]) {
  return {
    later: markets.filter((market) => market.group === "later"),
    today: markets.filter((market) => market.group === "today"),
    tomorrow: markets.filter((market) => market.group === "tomorrow"),
  } satisfies Record<CrowdlineMarketGroup, CrowdlineMarketSummary[]>;
}

// 这里在干嘛：
// 读取 Crowdline 首页需要的世界杯市场列表和 featured hero market。
// 为什么这么写：
// 首页 Day 1 先只做 read-only skeleton；复用 getEventPool 现有入口，
// 再在 Crowdline 层做“世界杯市场”筛选和排序，避免页面直接依赖外部 source shape。
// 最后返回什么：
// 返回 featuredMarket、markets、marketsByGroup。
export async function getCrowdlineHome(): Promise<CrowdlineHomePayload> {
  const events = await getEventPool({
    category: "sports",
    includeUnplayable: true,
    limit: 48,
    status: ["ready", "live"],
  });
  const worldCupEvents = events.filter((event) => isWorldCupMarket(event));
  const markets = await Promise.all(
    worldCupEvents.map((event) => mapEventToCrowdlineSummary(event)),
  );
  const sortedMarkets = markets
    .slice()
    .sort((left, right) => (right.volumeUsd ?? 0) - (left.volumeUsd ?? 0));

  return {
    featuredMarket: pickFeaturedMarket(sortedMarkets),
    markets: sortedMarkets,
    marketsByGroup: groupMarkets(sortedMarkets),
  };
}

// 这里在干嘛：
// 读取一个具体 Crowdline 市场的详情读模型，包括底层价格曲线。
// 为什么这么写：
// 详情页的中心不是球队故事，而是 underlying Polymarket 价格路径；
// 这里集中把 open/current/series 等字段准备好，页面层只管渲染。
// 最后返回什么：
// 返回 CrowdlineMarketDetail；找不到市场时返回 null。
export async function getCrowdlineMarketDetail(
  marketId: string,
): Promise<CrowdlineMarketDetail | null> {
  const event = await prisma.eventPoolItem.findUnique({
    where: {
      id: marketId,
    },
  });

  if (!event) {
    return null;
  }

  const normalizedEvent: InternalEventPoolItem = {
    category: event.category as InternalEventPoolItem["category"],
    currentPrice: event.currentPrice,
    durationSeconds: event.durationSeconds,
    endsAt: event.endsAt,
    externalEventId: event.externalEventId,
    externalMarketId: event.externalMarketId,
    externalUrl: event.externalUrl,
    id: event.id,
    liquidityScore: event.liquidityScore,
    marketSymbol: event.marketSymbol,
    noLabel: event.noLabel,
    playable: event.playable,
    question: event.question,
    resolutionSource: event.resolutionSource,
    slug: event.slug,
    sourceKey: event.sourceKey as InternalEventPoolItem["sourceKey"],
    sourceLabel: event.sourceLabel,
    spectatorNote: event.spectatorNote,
    stageLabel: event.stageLabel,
    startsAt: event.startsAt,
    status: event.status as InternalEventPoolItem["status"],
    title: event.title,
    volumeUsd: event.volumeUsd,
    yesLabel: event.yesLabel,
  };

  const metadata = await readUnderlyingMarketMetadata(normalizedEvent);
  const summary = await mapEventToCrowdlineSummary(normalizedEvent, metadata);
  const historySeries = await readPolymarketHistorySeries(
    normalizedEvent.externalMarketId,
    metadata,
  );
  const chartSeries =
    historySeries.length > 0
      ? historySeries
      : await readUnderlyingPriceSeries(
          normalizedEvent.externalMarketId,
          summary.openAt ? new Date(summary.openAt) : null,
          metadata,
        );
  const finalSeries =
    chartSeries.length > 0
      ? chartSeries
      : buildFallbackSeries(
          normalizedEvent,
          summary.openAt ? new Date(summary.openAt) : null,
          metadata,
        );

  return {
    ...summary,
    chartSeries: finalSeries,
    externalEventId: normalizedEvent.externalEventId,
    liquidityScore: normalizedEvent.liquidityScore,
    slug: normalizedEvent.slug,
    underlyingLabel: summary.primaryOutcomeLabel,
  };
}
