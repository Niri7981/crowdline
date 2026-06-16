#!/usr/bin/env node
import "dotenv/config";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const POLYMARKET_GAMMA_BASE_URL = "https://gamma-api.polymarket.com";
const REQUEST_TIMEOUT_MS = 12_000;

function parseArgs(argv) {
  return Object.fromEntries(
    argv
      .filter((entry) => entry.startsWith("--"))
      .map((entry) => {
        const [rawKey, ...rawValueParts] = entry.slice(2).split("=");

        return [rawKey, rawValueParts.join("=") || "true"];
      }),
  );
}

function readProxyUrl(args) {
  return (
    args.proxy ??
    process.env.CROWDLINE_INDEXER_PROXY ??
    process.env.CROWDLINE_POLYMARKET_PROXY ??
    process.env.HTTPS_PROXY ??
    process.env.HTTP_PROXY ??
    null
  );
}

function shouldSkipTlsVerificationForProxy(proxyUrl) {
  if (!proxyUrl) {
    return false;
  }

  if (
    process.env.CROWDLINE_INDEXER_PROXY_INSECURE === "true" ||
    process.env.CROWDLINE_POLYMARKET_PROXY_INSECURE === "true"
  ) {
    return true;
  }

  try {
    const hostname = new URL(proxyUrl).hostname;

    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}

async function fetchJsonWithCurl(input, proxyUrl) {
  const args = ["-sS", "--max-time", String(Math.ceil(REQUEST_TIMEOUT_MS / 1000))];

  if (proxyUrl) {
    args.push("--proxy", proxyUrl);

    if (shouldSkipTlsVerificationForProxy(proxyUrl)) {
      args.push("-k");
    }
  }

  args.push(input);

  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 16 * 1024 * 1024,
  });

  if (stdout.trim().length === 0) {
    throw new Error("Polymarket returned an empty response.");
  }

  return JSON.parse(stdout);
}

async function fetchJson(input, proxyUrl) {
  if (proxyUrl) {
    return fetchJsonWithCurl(input, proxyUrl);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
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

function readNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readSlugFromUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);

    return segments.at(-1) ?? null;
  } catch {
    return null;
  }
}

async function resolveMarketBySlug(slug, proxyUrl) {
  try {
    const market = await fetchJson(
      `${POLYMARKET_GAMMA_BASE_URL}/markets/slug/${encodeURIComponent(slug)}`,
      proxyUrl,
    );

    return { event: null, market, resolvedBy: "market-slug" };
  } catch {
    const payload = await fetchJson(
      `${POLYMARKET_GAMMA_BASE_URL}/events?slug=${encodeURIComponent(slug)}`,
      proxyUrl,
    );
    const event = Array.isArray(payload) ? payload[0] : payload;
    const market = event?.markets?.[0] ?? null;

    if (!market) {
      throw new Error(`No Polymarket market found for slug: ${slug}.`);
    }

    return { event, market, resolvedBy: "event-slug" };
  }
}

async function resolveMarket(args, proxyUrl) {
  const eventId = args["event-id"] ?? args.eventId ?? null;
  const marketId = args["market-id"] ?? args.marketId ?? null;
  const explicitSlug = args.slug ?? args["market-slug"] ?? args["event-slug"] ?? null;
  const slugFromUrl = readSlugFromUrl(args.url ?? null);
  const slug = explicitSlug ?? slugFromUrl;

  if (eventId) {
    const event = await fetchJson(
      `${POLYMARKET_GAMMA_BASE_URL}/events/${encodeURIComponent(eventId)}`,
      proxyUrl,
    );

    return { event, market: null, resolvedBy: "event-id" };
  }

  if (marketId) {
    const market = await fetchJson(
      `${POLYMARKET_GAMMA_BASE_URL}/markets/${encodeURIComponent(marketId)}`,
      proxyUrl,
    );

    return { event: null, market, resolvedBy: "market-id" };
  }

  if (slug) {
    return resolveMarketBySlug(slug, proxyUrl);
  }

  throw new Error(
    "Usage: npm run market:inspect -- --event-id=30615 OR --market-id=558936 OR --slug=will-france-win-the-2026-fifa-world-cup-924",
  );
}

function buildOutcomeLabel(rawLabel, index, groupItemTitle, outcomeKind) {
  const normalizedRawLabel = String(rawLabel);
  const lowerLabel = normalizedRawLabel.toLowerCase();

  if (outcomeKind === "binary" && groupItemTitle && lowerLabel === "yes") {
    return groupItemTitle;
  }

  if (outcomeKind === "binary" && groupItemTitle && lowerLabel === "no") {
    return `Not ${groupItemTitle}`;
  }

  return normalizedRawLabel || `Outcome ${index + 1}`;
}

function inspectMarket(event, market, resolvedBy) {
  const rawOutcomes = parseJsonArray(market.outcomes);
  const outcomePrices = parseJsonArray(market.outcomePrices);
  const clobTokenIds = parseJsonArray(market.clobTokenIds);
  const groupItemTitle = readString(market.groupItemTitle);
  const outcomeKind =
    rawOutcomes.length === 2 ? "binary" : rawOutcomes.length > 2 ? "multi" : "unknown";

  const outcomes = rawOutcomes.map((rawOutcome, index) => ({
    index,
    label: buildOutcomeLabel(rawOutcome, index, groupItemTitle, outcomeKind),
    price: readNumber(outcomePrices[index]),
    rawLabel: String(rawOutcome),
    tokenId: clobTokenIds[index] == null ? null : String(clobTokenIds[index]),
  }));

  return {
    conditionId: readString(market.conditionId),
    eventId: event?.id == null ? null : String(event.id),
    eventTitle: readString(event?.title),
    groupItemTitle,
    marketId: market.id == null ? null : String(market.id),
    outcomeCount: outcomes.length,
    outcomeKind,
    outcomes,
    question: readString(market.question),
    resolvedBy,
    slug: readString(market.slug),
    title: readString(market.title),
  };
}

function deriveGroupItemTitleFromQuestion(question) {
  const match = question?.match(/^Will\s+(.+?)\s+win the 2026 FIFA World Cup\??$/i);

  return match?.[1]?.trim() ?? null;
}

function pickYesOutcomeFromMarket(market) {
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

function inspectEventGroup(event, resolvedBy) {
  const markets = Array.isArray(event.markets) ? event.markets : [];
  const outcomes = markets
    .filter((market) => market.active !== false && market.closed !== true)
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
          label,
          marketId,
          price: yesOutcome.price,
          rawLabel: yesOutcome.rawLabel,
          tokenId: yesOutcome.tokenId,
        },
      ];
    })
    .sort((left, right) => (right.price ?? 0) - (left.price ?? 0))
    .map((outcome, index) => ({
      index,
      ...outcome,
    }));

  return {
    eventId: event.id == null ? null : String(event.id),
    eventSlug: readString(event.slug),
    eventTitle: readString(event.title),
    marketCount: markets.length,
    outcomeCount: outcomes.length,
    outcomeKind: outcomes.length > 2 ? "multi" : outcomes.length === 2 ? "binary" : "unknown",
    outcomes,
    question: readString(event.question) ?? "Who will win?",
    resolvedBy,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const proxyUrl = readProxyUrl(args);
  const { event, market, resolvedBy } = await resolveMarket(args, proxyUrl);
  const inspection = market
    ? inspectMarket(event, market, resolvedBy)
    : inspectEventGroup(event, resolvedBy);

  console.log(JSON.stringify(inspection, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
