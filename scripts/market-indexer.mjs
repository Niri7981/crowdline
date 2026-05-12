import "dotenv/config";

import crypto from "node:crypto";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import Database from "better-sqlite3";

const execFileAsync = promisify(execFile);
const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_SYMBOLS = ["SOL", "BTC", "ETH"];
const MARKET_DATA_TIMEOUT_MS = 12_000;
const POLYMARKET_CLOB_BASE_URL = "https://clob.polymarket.com";
const POLYMARKET_GAMMA_BASE_URL = "https://gamma-api.polymarket.com";

const COINBASE_PRODUCT_IDS = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
};

const GATEIO_CURRENCY_PAIRS = {
  BTC: "BTC_USDT",
  ETH: "ETH_USDT",
  SOL: "SOL_USDT",
};

function parseArgs(argv) {
  return Object.fromEntries(
    argv
      .filter((entry) => entry.startsWith("--"))
      .map((entry) => {
        const [rawKey, rawValue] = entry.slice(2).split("=");
        return [rawKey, rawValue ?? "true"];
      }),
  );
}

function readProxyUrl(args) {
  return (
    args.proxy ??
    process.env.AGENTDUEL_INDEXER_PROXY ??
    process.env.HTTPS_PROXY ??
    process.env.HTTP_PROXY ??
    null
  );
}

function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!databaseUrl.startsWith("file:")) {
    throw new Error("market-indexer currently supports file: SQLite DATABASE_URL only.");
  }

  const rawPath = databaseUrl.slice("file:".length).replace(/^"|"$/g, "");

  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function hashPayload(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

function parseSymbols(value) {
  if (!value) {
    return DEFAULT_SYMBOLS;
  }

  const symbols = value
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    throw new Error("At least one market symbol is required.");
  }

  for (const symbol of symbols) {
    if (!COINBASE_PRODUCT_IDS[symbol]) {
      throw new Error(`Unsupported market symbol: ${symbol}.`);
    }
  }

  return symbols;
}

function parsePolymarketConfig(args) {
  const slug =
    args["polymarket-slug"] ?? process.env.AGENTDUEL_POLYMARKET_SLUG ?? null;
  const marketId =
    args["polymarket-market-id"] ??
    process.env.AGENTDUEL_POLYMARKET_MARKET_ID ??
    null;
  const conditionId =
    args["polymarket-condition-id"] ??
    process.env.AGENTDUEL_POLYMARKET_CONDITION_ID ??
    null;
  const yesTokenId =
    args["polymarket-yes-token-id"] ??
    process.env.AGENTDUEL_POLYMARKET_YES_TOKEN_ID ??
    null;
  const noTokenId =
    args["polymarket-no-token-id"] ??
    process.env.AGENTDUEL_POLYMARKET_NO_TOKEN_ID ??
    null;

  if (!slug && !yesTokenId && !noTokenId) {
    return null;
  }

  if (!slug && (!marketId || !yesTokenId || !noTokenId)) {
    throw new Error(
      "Polymarket indexing requires --polymarket-slug or --polymarket-market-id plus yes/no token ids.",
    );
  }

  return {
    conditionId,
    marketId,
    noTokenId,
    slug,
    yesTokenId,
  };
}

async function fetchJsonWithCurl(input, proxyUrl) {
  const args = ["-sS", "--max-time", String(Math.ceil(MARKET_DATA_TIMEOUT_MS / 1000))];

  if (proxyUrl) {
    args.push("--proxy", proxyUrl);
  }

  args.push(input);

  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 4 * 1024 * 1024,
  });

  return JSON.parse(stdout);
}

async function fetchJsonWithTimeout(input, proxyUrl = null) {
  if (proxyUrl) {
    return fetchJsonWithCurl(input, proxyUrl);
  }

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

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function readGateIoPrice(symbol, proxyUrl) {
  const currencyPair = GATEIO_CURRENCY_PAIRS[symbol];
  const payload = await fetchJsonWithTimeout(
    `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${currencyPair}`,
    proxyUrl,
  );
  const amount = payload?.[0]?.last == null ? NaN : Number(payload[0].last);

  if (!Number.isFinite(amount)) {
    throw new Error(`Gate.io price response for ${symbol} was invalid.`);
  }

  return {
    payload,
    price: amount,
    sourceLabel: "Gate Spot API",
  };
}

async function readCoinbasePrice(symbol, proxyUrl) {
  const productId = COINBASE_PRODUCT_IDS[symbol];
  const payload = await fetchJsonWithTimeout(
    `https://api.coinbase.com/v2/prices/${productId}/spot`,
    proxyUrl,
  );
  const amount = payload?.data?.amount == null ? NaN : Number(payload.data.amount);

  if (!Number.isFinite(amount)) {
    throw new Error(`Coinbase price response for ${symbol} was invalid.`);
  }

  return {
    payload,
    price: amount,
    sourceLabel: "Coinbase Spot API",
  };
}

async function readIndexedPrice(symbol, proxyUrl) {
  const errors = [];

  try {
    return await readGateIoPrice(symbol, proxyUrl);
  } catch (error) {
    errors.push(
      error instanceof Error ? `Gate Spot API: ${error.message}` : "Gate Spot API failed.",
    );
  }

  try {
    return await readCoinbasePrice(symbol, proxyUrl);
  } catch (error) {
    errors.push(
      error instanceof Error
        ? `Coinbase Spot API: ${error.message}`
        : "Coinbase Spot API failed.",
    );
  }

  throw new Error(`Failed to index ${symbol}. ${errors.join(" / ")}`);
}

function createFactWriter(db) {
  return db.prepare(`
    INSERT OR IGNORE INTO FactPriceTick (
      id,
      symbol,
      price,
      sourceLabel,
      observedAt,
      rawPayloadHash,
      createdAt
    ) VALUES (
      @id,
      @symbol,
      @price,
      @sourceLabel,
      @observedAt,
      @rawPayloadHash,
      @createdAt
    )
  `);
}

function createMarketWriter(db) {
  return db.prepare(`
    INSERT OR IGNORE INTO MarketTick (
      id,
      sourceKey,
      marketId,
      conditionId,
      tokenId,
      side,
      price,
      sourceLabel,
      observedAt,
      rawPayloadHash,
      createdAt
    ) VALUES (
      @id,
      @sourceKey,
      @marketId,
      @conditionId,
      @tokenId,
      @side,
      @price,
      @sourceLabel,
      @observedAt,
      @rawPayloadHash,
      @createdAt
    )
  `);
}

async function indexSymbol(symbol, writeFact, proxyUrl) {
  const observedAt = new Date();
  const fact = await readIndexedPrice(symbol, proxyUrl);
  const row = {
    createdAt: observedAt.toISOString(),
    id: crypto.randomUUID(),
    observedAt: observedAt.toISOString(),
    price: fact.price,
    rawPayloadHash: hashPayload(fact.payload),
    sourceLabel: fact.sourceLabel,
    symbol,
  };

  writeFact.run(row);

  console.log(
    [
      "Indexed fact",
      `symbol=${symbol}`,
      `price=${fact.price.toFixed(2)}`,
      `source=${fact.sourceLabel}`,
      `observedAt=${row.observedAt}`,
    ].join(" / "),
  );
}

function parseJsonArray(value) {
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

function pickTokenIdFromMarket(market, side) {
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

function pickOutcomePriceFromMarket(market, side) {
  const outcomes = parseJsonArray(market.outcomes);
  const outcomePrices = parseJsonArray(market.outcomePrices);
  const sideIndex = outcomes.findIndex(
    (outcome) => String(outcome).toLowerCase() === side,
  );
  const value = sideIndex >= 0 ? outcomePrices[sideIndex] : null;
  const price = value == null ? NaN : Number(value);

  return Number.isFinite(price) ? price : null;
}

async function resolvePolymarketBySlug(slug, proxyUrl) {
  let event = null;
  let market = null;

  try {
    market = await fetchJsonWithTimeout(
      `${POLYMARKET_GAMMA_BASE_URL}/markets/slug/${encodeURIComponent(slug)}`,
      proxyUrl,
    );
  } catch {
    const payload = await fetchJsonWithTimeout(
      `${POLYMARKET_GAMMA_BASE_URL}/events?slug=${encodeURIComponent(slug)}`,
      proxyUrl,
    );

    event = Array.isArray(payload) ? payload[0] : payload;
    market = event?.markets?.[0] ?? null;
  }

  if (!market) {
    throw new Error(`No Polymarket market found for slug: ${slug}.`);
  }

  const yesTokenId = pickTokenIdFromMarket(market, "yes");
  const noTokenId = pickTokenIdFromMarket(market, "no");

  if (!yesTokenId || !noTokenId) {
    throw new Error(`Polymarket market ${market.id ?? slug} does not expose yes/no token ids.`);
  }

  return {
    conditionId: market.conditionId ?? null,
    fallbackPrices: {
      no: pickOutcomePriceFromMarket(market, "no"),
      yes: pickOutcomePriceFromMarket(market, "yes"),
    },
    marketId: String(market.id ?? market.conditionId ?? slug),
    noTokenId,
    slug,
    title: event?.title ?? market.question ?? market.title ?? slug,
    yesTokenId,
  };
}

async function resolvePolymarketConfig(config, proxyUrl) {
  if (config.slug) {
    return resolvePolymarketBySlug(config.slug, proxyUrl);
  }

  return {
    conditionId: config.conditionId,
    fallbackPrices: {
      no: null,
      yes: null,
    },
    marketId: config.marketId,
    noTokenId: config.noTokenId,
    slug: null,
    title: config.marketId,
    yesTokenId: config.yesTokenId,
  };
}

async function readPolymarketTokenPrice(tokenId, proxyUrl) {
  const payload = await fetchJsonWithTimeout(
    `${POLYMARKET_CLOB_BASE_URL}/price?token_id=${encodeURIComponent(tokenId)}&side=BUY`,
    proxyUrl,
  );
  const price = payload?.price == null ? NaN : Number(payload.price);

  if (!Number.isFinite(price)) {
    throw new Error(`Polymarket CLOB price response for token ${tokenId} was invalid.`);
  }

  return {
    payload,
    price,
  };
}

async function indexPolymarketMarket(market, writeMarket, proxyUrl) {
  const observedAt = new Date();
  const sides = [
    { side: "yes", tokenId: market.yesTokenId },
    { side: "no", tokenId: market.noTokenId },
  ];

  for (const entry of sides) {
    let indexedPrice;
    let sourceLabel = "Polymarket CLOB";
    let rawPayload = null;

    try {
      const clobPrice = await readPolymarketTokenPrice(entry.tokenId, proxyUrl);

      indexedPrice = clobPrice.price;
      rawPayload = clobPrice.payload;
    } catch (error) {
      const fallbackPrice = market.fallbackPrices?.[entry.side] ?? null;

      if (fallbackPrice == null) {
        throw error;
      }

      indexedPrice = fallbackPrice;
      rawPayload = {
        fallback: "gamma-outcomePrices",
        price: fallbackPrice,
        side: entry.side,
      };
      sourceLabel = "Polymarket Gamma";
    }

    const row = {
      conditionId: market.conditionId,
      createdAt: observedAt.toISOString(),
      id: crypto.randomUUID(),
      marketId: market.marketId,
      observedAt: observedAt.toISOString(),
      price: indexedPrice,
      rawPayloadHash: hashPayload(rawPayload),
      side: entry.side,
      sourceKey: "polymarket",
      sourceLabel,
      tokenId: entry.tokenId,
    };

    writeMarket.run(row);

    console.log(
      [
        "Indexed market",
        `source=polymarket`,
        `market=${market.marketId}`,
        `side=${entry.side.toUpperCase()}`,
        `price=${indexedPrice.toFixed(4)}`,
        `feed=${sourceLabel}`,
        `observedAt=${row.observedAt}`,
      ].join(" / "),
    );
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const intervalMs = Number(
    args.interval ?? process.env.AGENTDUEL_INDEXER_INTERVAL_MS ?? DEFAULT_INTERVAL_MS,
  );
  const maxTicks = args["max-ticks"]
    ? Number(args["max-ticks"])
    : process.env.AGENTDUEL_INDEXER_MAX_TICKS
      ? Number(process.env.AGENTDUEL_INDEXER_MAX_TICKS)
      : null;
  const symbols = parseSymbols(args.symbols ?? process.env.AGENTDUEL_INDEXER_SYMBOLS);
  const polymarketConfig = parsePolymarketConfig(args);
  const proxyUrl = readProxyUrl(args);

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("Indexer interval must be a positive number.");
  }

  const db = new Database(resolveDatabasePath());
  const writeFact = createFactWriter(db);
  const writeMarket = createMarketWriter(db);
  let polymarketMarket = null;

  if (polymarketConfig) {
    try {
      polymarketMarket = await resolvePolymarketConfig(polymarketConfig, proxyUrl);
    } catch (error) {
      console.error(
        "Polymarket config could not be resolved; continuing with fact indexing only.",
        error instanceof Error ? error.message : error,
      );
    }
  }
  let tickCount = 0;

  console.log(
    [
      "Market indexer started",
      `symbols=${symbols.join(",")}`,
      polymarketMarket
        ? `polymarket=${polymarketMarket.title} (${polymarketMarket.marketId})`
        : "polymarket=disabled",
      `interval=${intervalMs}ms`,
      proxyUrl ? `proxy=${proxyUrl}` : "proxy=none",
    ].join(" / "),
  );

  try {
    while (true) {
      tickCount += 1;

      for (const symbol of symbols) {
        try {
          await indexSymbol(symbol, writeFact, proxyUrl);
        } catch (error) {
          console.error(
            `Failed to index ${symbol}.`,
            error instanceof Error ? error.message : error,
          );
        }
      }

      if (polymarketMarket) {
        try {
          await indexPolymarketMarket(polymarketMarket, writeMarket, proxyUrl);
        } catch (error) {
          console.error(
            "Failed to index Polymarket market.",
            error instanceof Error ? error.message : error,
          );
        }
      }

      if (maxTicks != null && Number.isFinite(maxTicks) && tickCount >= maxTicks) {
        console.log(`Reached max indexer tick limit (${maxTicks}). Stopping.`);
        break;
      }

      await sleep(intervalMs);
    }
  } finally {
    db.close();
  }
}

run().catch((error) => {
  console.error("Market indexer failed.", error);
  process.exitCode = 1;
});
