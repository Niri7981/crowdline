import "dotenv/config";

import crypto from "node:crypto";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import Database from "better-sqlite3";

const execFileAsync = promisify(execFile);
const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_PROXY_URL = "http://127.0.0.1:6324";
const MARKET_DATA_TIMEOUT_MS = 12_000;
const POLYMARKET_CLOB_BASE_URL = "https://clob.polymarket.com";
const POLYMARKET_GAMMA_BASE_URL = "https://gamma-api.polymarket.com";

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
    process.env.CROWDLINE_POLYMARKET_PROXY ??
    process.env.HTTPS_PROXY ??
    process.env.HTTP_PROXY ??
    DEFAULT_PROXY_URL
  );
}

function shouldSkipTlsVerificationForProxy(proxyUrl) {
  if (!proxyUrl) {
    return false;
  }

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

function parsePolymarketConfig(args) {
  const slug =
    args["polymarket-slug"] ?? process.env.CROWDLINE_POLYMARKET_SLUG ?? null;
  const marketId =
    args["polymarket-market-id"] ??
    process.env.CROWDLINE_POLYMARKET_MARKET_ID ??
    null;
  const conditionId =
    args["polymarket-condition-id"] ??
    process.env.CROWDLINE_POLYMARKET_CONDITION_ID ??
    null;
  const yesTokenId =
    args["polymarket-yes-token-id"] ??
    process.env.CROWDLINE_POLYMARKET_YES_TOKEN_ID ??
    null;
  const noTokenId =
    args["polymarket-no-token-id"] ??
    process.env.CROWDLINE_POLYMARKET_NO_TOKEN_ID ??
    null;

  if (!slug && !marketId && !yesTokenId && !noTokenId) {
    throw new Error(
      "Crowdline indexing requires CROWDLINE_POLYMARKET_SLUG or CROWDLINE_POLYMARKET_MARKET_ID.",
    );
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

    if (shouldSkipTlsVerificationForProxy(proxyUrl)) {
      args.push("-k");
    }
  }

  args.push(input);

  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 32 * 1024 * 1024,
  });

  if (stdout.trim().length === 0) {
    throw new Error("Polymarket returned an empty response.");
  }

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

async function resolvePolymarketByMarketId(marketId, proxyUrl) {
  const market = await fetchJsonWithTimeout(
    `${POLYMARKET_GAMMA_BASE_URL}/markets/${encodeURIComponent(marketId)}`,
    proxyUrl,
  );

  if (!market) {
    throw new Error(`No Polymarket market found for id: ${marketId}.`);
  }

  const yesTokenId = pickTokenIdFromMarket(market, "yes");
  const noTokenId = pickTokenIdFromMarket(market, "no");

  if (!yesTokenId || !noTokenId) {
    throw new Error(`Polymarket market ${marketId} does not expose yes/no token ids.`);
  }

  return {
    conditionId: market.conditionId ?? null,
    fallbackPrices: {
      no: pickOutcomePriceFromMarket(market, "no"),
      yes: pickOutcomePriceFromMarket(market, "yes"),
    },
    marketId: String(market.id ?? marketId),
    noTokenId,
    slug: market.slug ?? null,
    title: market.question ?? market.title ?? marketId,
    yesTokenId,
  };
}

async function resolvePolymarketConfig(config, proxyUrl) {
  if (config.slug) {
    return resolvePolymarketBySlug(config.slug, proxyUrl);
  }

  if (config.marketId && (!config.yesTokenId || !config.noTokenId)) {
    return resolvePolymarketByMarketId(config.marketId, proxyUrl);
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
        "Indexed Crowdline market",
        "source=polymarket",
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
    args.interval ?? process.env.CROWDLINE_INDEXER_INTERVAL_MS ?? DEFAULT_INTERVAL_MS,
  );
  const maxTicks = args["max-ticks"]
    ? Number(args["max-ticks"])
    : process.env.CROWDLINE_INDEXER_MAX_TICKS
      ? Number(process.env.CROWDLINE_INDEXER_MAX_TICKS)
      : null;
  const proxyUrl = readProxyUrl(args);
  const polymarketConfig = parsePolymarketConfig(args);

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("Indexer interval must be a positive number.");
  }

  const market = await resolvePolymarketConfig(polymarketConfig, proxyUrl);
  const db = new Database(resolveDatabasePath());
  const writeMarket = createMarketWriter(db);
  let tickCount = 0;

  console.log(
    [
      "Crowdline market indexer started",
      `polymarket=${market.title} (${market.marketId})`,
      `interval=${intervalMs}ms`,
      proxyUrl ? `proxy=${proxyUrl}` : "proxy=none",
    ].join(" / "),
  );

  try {
    while (true) {
      tickCount += 1;

      await indexPolymarketMarket(market, writeMarket, proxyUrl);

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
  console.error("Crowdline market indexer failed.", error);
  process.exitCode = 1;
});
