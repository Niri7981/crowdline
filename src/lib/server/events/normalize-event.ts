import type {
  EventPoolCategory,
  EventPoolStatus,
  InternalEventPoolItem,
} from "./types";
import type { PolymarketRawEventCandidate } from "./sources/polymarket";

// MVP 阶段先把时间窗口放宽一些，保证 internal event pool 里有足够多可用候选。
// 后面如果要做 featured rounds，再在 round-selection 层单独收紧。
const MIN_EVENT_LEAD_MINUTES = 5;
const MAX_EVENT_HORIZON_DAYS = 365;

export type EventNormalizationFailureReason =
  | "missing_external_id"
  | "missing_title_or_question"
  | "inactive_or_closed"
  | "invalid_question_shape"
  | "missing_binary_labels"
  | "missing_end_time"
  | "ends_too_soon"
  | "ends_too_far";

type EventNormalizationResult =
  | { ok: true; value: Omit<InternalEventPoolItem, "id"> }
  | { ok: false; reason: EventNormalizationFailureReason };

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
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

function readDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function readStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => readString(entry))
      .filter((entry): entry is string => entry !== null);
  }

  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value) as unknown;

      return readStringArray(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

function inferMarketSymbol(question: string) {
  const upperQuestion = question.toUpperCase();

  if (upperQuestion.includes("BTC") || upperQuestion.includes("BITCOIN")) {
    return "BTC";
  }

  if (upperQuestion.includes("ETH") || upperQuestion.includes("ETHEREUM")) {
    return "ETH";
  }

  if (upperQuestion.includes("SOL") || upperQuestion.includes("SOLANA")) {
    return "SOL";
  }

  if (upperQuestion.includes("USDC") || upperQuestion.includes("USD COIN")) {
    return "USDC";
  }

  if (upperQuestion.includes("USDT") || upperQuestion.includes("TETHER")) {
    return "USDT";
  }

  return "GENERIC";
}

function inferCategory(question: string, eventCategory: string | null): EventPoolCategory {
  const normalizedCategory = eventCategory?.toLowerCase() ?? "";
  const upperQuestion = question.toUpperCase();

  if (
    normalizedCategory.includes("crypto") ||
    upperQuestion.includes("BTC") ||
    upperQuestion.includes("ETH") ||
    upperQuestion.includes("SOL")
  ) {
    return "crypto";
  }

  if (normalizedCategory.includes("sport")) {
    return "sports";
  }

  if (
    normalizedCategory.includes("politic") ||
    upperQuestion.includes("ELECTION") ||
    upperQuestion.includes("PRESIDENT") ||
    upperQuestion.includes("GOVERNOR")
  ) {
    return "headline";
  }

  if (
    normalizedCategory.includes("macro") ||
    normalizedCategory.includes("econom") ||
    upperQuestion.includes("FED") ||
    upperQuestion.includes("RATE CUT")
  ) {
    return "macro";
  }

  if (normalizedCategory.includes("news")) {
    return "headline";
  }

  return "other";
}

function inferDurationSeconds(startsAt: Date | null, endsAt: Date | null) {
  if (!startsAt || !endsAt) {
    return 10 * 60;
  }

  const seconds = Math.floor((endsAt.getTime() - startsAt.getTime()) / 1000);

  if (seconds <= 0) {
    return 10 * 60;
  }

  return Math.min(seconds, 60 * 60);
}

function inferStatus(
  endsAt: Date | null,
  activeFlag: boolean,
  closedFlag: boolean,
): EventPoolStatus {
  if (closedFlag) {
    return "settled";
  }

  if (endsAt && endsAt.getTime() <= Date.now()) {
    return "settled";
  }

  return activeFlag ? "ready" : "candidate";
}

//过滤器
function validatePlayableEvent(params: {
  activeFlag: boolean;
  closedFlag: boolean;
  endsAt: Date | null;
  category: EventPoolCategory;
  marketSymbol: string;
  question: string;
  yesLabel: string;
  noLabel: string;
}): EventNormalizationFailureReason | null {
  if (params.closedFlag || !params.activeFlag) {
    return "inactive_or_closed";
  }

  const normalizedQuestion = params.question.trim();

  if (normalizedQuestion.length < 12) {
    return "invalid_question_shape";
  }

  if (!params.yesLabel || !params.noLabel) {
    return "missing_binary_labels";
  }

  // MVP 阶段不再强制要求必须识别出特定 symbol，也不再只允许 crypto。
  // 只要问题文本足够清楚、结果是二元、时间窗口合适，就先允许进入 playable pool。
  if (params.marketSymbol.trim().length === 0 || params.category.trim().length === 0) {
    return "invalid_question_shape";
  }

  if (!params.endsAt) {
    return "missing_end_time";
  }

  const now = Date.now();
  const minLeadMs = MIN_EVENT_LEAD_MINUTES * 60 * 1000;
  const maxHorizonMs = MAX_EVENT_HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const endsAtMs = params.endsAt.getTime();

  if (endsAtMs <= now + minLeadMs) {
    return "ends_too_soon";
  }

  if (endsAtMs > now + maxHorizonMs) {
    return "ends_too_far";
  }

  return null;
}

function inferSpectatorNote(category: EventPoolCategory) {
  if (category === "crypto") {
    return "Clear binary framing and easy scoreboard storytelling.";
  }

  if (category === "macro") {
    return "Big external narrative gives the round obvious stakes.";
  }

  if (category === "sports") {
    return "Fast spectator comprehension and clean rivalry framing.";
  }

  return "Readable question with enough clarity for a World Cup market.";
}

function inferStageLabel(category: EventPoolCategory) {
  if (category === "crypto") {
    return "Market Stage";
  }

  if (category === "macro") {
    return "Macro Stage";
  }

  if (category === "sports") {
    return "Showdown Stage";
  }

  return "Market Stage";
}

// 详细归一化结果给 seed 层使用，这样页面能知道 invalid 到底因为什么被刷掉。
export function normalizePolymarketEventWithReason(
  candidate: PolymarketRawEventCandidate,
): EventNormalizationResult {
  const event = candidate.event as Record<string, unknown>;
  const market = (candidate.market ?? {}) as Record<string, unknown>;
  const externalEventId =
    readString(event.id) ??
    readString(event.eventId) ??
    readString(event.event_id);

  if (!externalEventId) {
    return { ok: false, reason: "missing_external_id" };
  }

  const title =
    readString(event.title) ??
    readString(event.question) ??
    readString(market.question);
  const question =
    readString(market.question) ??
    readString(event.question) ??
    title;

  if (!title || !question) {
    return { ok: false, reason: "missing_title_or_question" };
  }

  const startsAt =
    readDate(market.startDate) ??
    readDate(event.startDate) ??
    readDate(event.startTime);
  const endsAt =
    readDate(market.endDate) ??
    readDate(event.endDate) ??
    readDate(event.endTime);
  const marketOutcomes = readStringArray(market.outcomes);
  const eventOutcomes = readStringArray(event.outcomes);
  const outcomes = marketOutcomes.length > 0 ? marketOutcomes : eventOutcomes;
  const yesLabel = outcomes[0] ?? "Yes";
  const noLabel = outcomes[1] ?? "No";
  const marketSymbol = inferMarketSymbol(question);
  const category = inferCategory(question, readString(event.category));
  const activeFlag = Boolean(market.active ?? event.active ?? true);
  const closedFlag = Boolean(market.closed ?? event.closed ?? false);
  const slug = readString(event.slug) ?? readString(market.slug);
  const currentPrice =
    readNumber(market.lastTradePrice) ??
    readNumber(market.currentPrice) ??
    readStringArray(market.outcomePrices)
      .map((value) => readNumber(value))
      .find((value): value is number => value !== null) ??
    null;
  const volumeUsd =
    readNumber(market.volumeNum) ??
    readNumber(market.volume) ??
    readNumber(event.volume) ??
    null;
  const liquidityScore =
    readNumber(market.liquidityNum) ??
    readNumber(market.liquidity) ??
    null;
  const invalidReason = validatePlayableEvent({
    activeFlag,
    category,
    closedFlag,
    endsAt,
    marketSymbol,
    noLabel,
    question,
    yesLabel,
  });

  if (invalidReason) {
    return { ok: false, reason: invalidReason };
  }

  return {
    ok: true,
    value: {
      category,
      currentPrice,
      durationSeconds: inferDurationSeconds(startsAt, endsAt),
      endsAt,
      externalEventId,
      externalMarketId: readString(market.id),
      externalUrl:
        readString(event.url) ??
        readString(market.url) ??
        (slug ? `https://polymarket.com/event/${slug}` : null),
      liquidityScore,
      marketSymbol,
      noLabel,
      playable: true,
      question,
      resolutionSource: "Polymarket market resolution",
      sourceKey: "polymarket",
      sourceLabel: "Polymarket candidate feed",
      spectatorNote: inferSpectatorNote(category),
      stageLabel: inferStageLabel(category),
      startsAt,
      status: inferStatus(endsAt, activeFlag, closedFlag),
      slug,
      title,
      volumeUsd,
      yesLabel,
    },
  };
}

// 市场读取层如果只关心内部 normalized event，可以继续走这个简化入口。
export function normalizePolymarketEvent(
  candidate: PolymarketRawEventCandidate,
): Omit<InternalEventPoolItem, "id"> | null {
  const result = normalizePolymarketEventWithReason(candidate);

  return result.ok ? result.value : null;
}
