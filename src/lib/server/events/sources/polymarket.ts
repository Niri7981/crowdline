const POLYMARKET_EVENTS_URL = "https://gamma-api.polymarket.com/events";
const POLYMARKET_MARKETS_URL = "https://gamma-api.polymarket.com/markets";

export type PolymarketRawEvent = Record<string, unknown>;
export type PolymarketRawMarket = Record<string, unknown>;

export type PolymarketRawEventCandidate = {
  event: PolymarketRawEvent;
  market: PolymarketRawMarket | null;
};

type FetchPolymarketEventCandidatesInput = {
  limit?: number;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readEventId(record: Record<string, unknown>) {
  return readString(record.id) ?? readString(record.eventId) ?? readString(record.event_id);
}

function readMarketEventId(record: Record<string, unknown>) {
  return (
    readString(record.eventId) ??
    readString(record.event_id) ??
    readString(record.parentEventId)
  );
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

function pickPrimaryMarket(
  eventId: string,
  markets: PolymarketRawMarket[],
) {
  const matchedMarkets = markets.filter((market) => {
    const candidate = market as Record<string, unknown>;

    return readMarketEventId(candidate) === eventId;
  });

  if (matchedMarkets.length === 0) {
    return null;
  }

  return matchedMarkets
    .slice()
    .sort((left, right) => {
      const leftVolume = readNumber((left as Record<string, unknown>).volumeNum) ??
        readNumber((left as Record<string, unknown>).volume) ??
        0;
      const rightVolume = readNumber((right as Record<string, unknown>).volumeNum) ??
        readNumber((right as Record<string, unknown>).volume) ??
        0;

      return rightVolume - leftVolume;
    })[0] ?? null;
}

// 这里只负责从 Polymarket 拉取“候选事件”。
// 返回值仍然是外部 source 专属 shape，后面必须再经过 normalize-event.ts 才能进入 Crowdline。
export async function fetchPolymarketEventCandidates(
  input: FetchPolymarketEventCandidatesInput = {},
): Promise<PolymarketRawEventCandidate[]> {
  const limit = input.limit ?? 25;
  const eventsUrl = new URL(POLYMARKET_EVENTS_URL);
  const marketsUrl = new URL(POLYMARKET_MARKETS_URL);

  eventsUrl.searchParams.set("limit", String(limit));
  eventsUrl.searchParams.set("active", "true");
  eventsUrl.searchParams.set("closed", "false");

  marketsUrl.searchParams.set("limit", String(limit * 3));
  marketsUrl.searchParams.set("active", "true");
  marketsUrl.searchParams.set("closed", "false");

  const [eventsResponse, marketsResponse] = await Promise.all([
    fetch(eventsUrl, {
      cache: "no-store",
    }),
    fetch(marketsUrl, {
      cache: "no-store",
    }),
  ]);

  if (!eventsResponse.ok) {
    throw new Error("Failed to fetch Polymarket events.");
  }

  if (!marketsResponse.ok) {
    throw new Error("Failed to fetch Polymarket markets.");
  }

  const rawEvents = readArray(await eventsResponse.json()) as PolymarketRawEvent[];
  const rawMarkets = readArray(await marketsResponse.json()) as PolymarketRawMarket[];

  return rawEvents.flatMap((event) => {
    const record = event as Record<string, unknown>;
    const eventId = readEventId(record);

    if (!eventId) {
      return [];
    }

    return [
      {
        event,
        market: pickPrimaryMarket(eventId, rawMarkets),
      },
    ];
  });
}
