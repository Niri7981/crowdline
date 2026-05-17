import type {
  LivePriceObservation,
  LivePriceSnapshot,
  MarketObservation,
  MarketObservationContext,
  MarketObservationPoint,
  SupportedMarketSymbol,
} from "@/lib/server/market-data/types";

const COINBASE_PRODUCT_IDS: Record<SupportedMarketSymbol, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
};

const GATEIO_CURRENCY_PAIRS: Record<SupportedMarketSymbol, string> = {
  BTC: "BTC_USDT",
  ETH: "ETH_USDT",
  SOL: "SOL_USDT",
};

const MARKET_DATA_TIMEOUT_MS = 8_000;

type CoinbaseSpotResponse = {
  data?: {
    amount?: string;
    base?: string;
    currency?: string;
  };
};

type GateIoTickerResponse = Array<{
  last?: string;
}>;

function isSupportedMarketSymbol(value: string): value is SupportedMarketSymbol {
  return value === "BTC" || value === "ETH" || value === "SOL";
}

function getSafeElapsedMs(later: Date, earlier: Date) {
  return Math.max(later.getTime() - earlier.getTime(), 0);
}

function getPctChange(currentPrice: number, previousPrice: number) {
  if (previousPrice === 0) {
    return null;
  }

  return ((currentPrice - previousPrice) / previousPrice) * 100;
}

async function fetchJsonWithTimeout<T>(input: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, MARKET_DATA_TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function readGateIoPrice(
  symbol: SupportedMarketSymbol,
): Promise<LivePriceSnapshot> {
  const currencyPair = GATEIO_CURRENCY_PAIRS[symbol];
  const payload = await fetchJsonWithTimeout<GateIoTickerResponse>(
    `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${currencyPair}`,
  );
  const amount = payload[0]?.last == null ? NaN : Number(payload[0].last);

  if (!Number.isFinite(amount)) {
    throw new Error(`Gate.io price response for ${symbol} was invalid.`);
  }

  return {
    price: amount,
    sourceLabel: "Gate Spot API",
    symbol,
    timestamp: new Date(),
  };
}

async function readCoinbasePrice(
  symbol: SupportedMarketSymbol,
): Promise<LivePriceSnapshot> {
  const productId = COINBASE_PRODUCT_IDS[symbol];
  const payload = await fetchJsonWithTimeout<CoinbaseSpotResponse>(
    `https://api.coinbase.com/v2/prices/${productId}/spot`,
  );
  const amount = payload.data?.amount == null ? NaN : Number(payload.data.amount);

  if (!Number.isFinite(amount)) {
    throw new Error(`Coinbase price response for ${symbol} was invalid.`);
  }

  return {
    price: amount,
    sourceLabel: "Coinbase Spot API",
    symbol,
    timestamp: new Date(),
  };
}

// 这里在干嘛：
// 把 round 里的 market symbol 收敛成当前本地开发允许查询的公开价格标的。
// 为什么这么写：
// live settlement 的第一阶段只支持少数高流动性币种，先把能力边界写死，
// 避免后面不小心把任意 symbol 都丢给外部价格源，导致结算不稳定。
// 最后返回什么：
// 返回受支持的 market symbol；不支持时抛错。
export function assertSupportedMarketSymbol(
  marketSymbol: string,
): SupportedMarketSymbol {
  const uppercased = marketSymbol.toUpperCase();

  if (!isSupportedMarketSymbol(uppercased)) {
    throw new Error(`Unsupported live price symbol: ${marketSymbol}.`);
  }

  return uppercased;
}

// 这里在干嘛：
// 从公开价格源读取一个可用于结算的最新现价快照。
// 为什么这么写：
// 这一步是把 round outcome 从本地伪随机结果切到外部事实的最小入口；
// 先只读一个最新价格，不引入更重的 market data 订阅和缓存层。
// 最后返回什么：
// 返回 symbol、price、sourceLabel、timestamp 组成的实时价格快照。
export async function getLivePrice(
  marketSymbol: string,
): Promise<LivePriceSnapshot> {
  const symbol = assertSupportedMarketSymbol(marketSymbol);
  const errors: string[] = [];

  try {
    return await readGateIoPrice(symbol);
  } catch (error) {
    errors.push(
      error instanceof Error ? `Gate Spot API: ${error.message}` : "Gate Spot API failed.",
    );
  }

  try {
    return await readCoinbasePrice(symbol);
  } catch (error) {
    errors.push(
      error instanceof Error
        ? `Coinbase Spot API: ${error.message}`
        : "Coinbase Spot API failed.",
    );
  }

  throw new Error(
    `Failed to fetch live price for ${symbol}. ${errors.join(" / ")}`,
  );
}

// 这里在干嘛：
// 把一个价格点提升成 live round 能直接消费的 observation 语义。
// 为什么这么写：
// tick 不该只知道“现在价格是多少”，还要知道这次观察相对上一条本地 snapshot
// 到底变了多少、离截止还有多久，这样 agent 重评估和 public proof 才能对齐。
// 最后返回什么：
// 返回带有 delta、pctChange、timeSinceLastTick、timeToDeadline 的 observation。
export function buildMarketObservation<T extends MarketObservationPoint>(
  point: T,
  context: MarketObservationContext = {},
): T & MarketObservation {
  const previousPoint = context.previousPoint ?? null;
  const delta =
    previousPoint == null ? null : point.price - previousPoint.price;
  const pctChange =
    previousPoint == null ? null : getPctChange(point.price, previousPoint.price);
  const timeSinceLastTick =
    previousPoint == null
      ? null
      : getSafeElapsedMs(point.timestamp, previousPoint.timestamp);
  const timeToDeadline =
    context.roundEndsAt == null
      ? null
      : Math.max(context.roundEndsAt.getTime() - point.timestamp.getTime(), 0);

  return {
    ...point,
    delta,
    pctChange,
    timeSinceLastTick,
    timeToDeadline,
  };
}

// 这里在干嘛：
// 读取一次最新外部价格，并把它包装成 live round 的完整 observation。
// 为什么这么写：
// live battle 的每次 tick 都应该对应一条“外部世界发生了什么”的观察记录，
// 后续 agent 是否翻边、加仓、坚持，都要建立在这条 observation 上。
// 最后返回什么：
// 返回本次最新价格的 observation，包含时间、来源、涨跌和截止时间语义。
export async function observeLivePrice(input: {
  marketSymbol: string;
  previousPoint?: MarketObservationContext["previousPoint"];
  roundEndsAt?: Date | null;
}): Promise<LivePriceObservation> {
  const snapshot = await getLivePrice(input.marketSymbol);

  return buildMarketObservation(snapshot, {
    previousPoint: input.previousPoint,
    roundEndsAt: input.roundEndsAt,
  });
}
