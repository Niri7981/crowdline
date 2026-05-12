import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const cwd = process.cwd();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

if (!databaseUrl.startsWith("file:")) {
  console.log("Skipping SQLite init because DATABASE_URL is not file: based.");
  process.exit(0);
}

const rawPath = databaseUrl.slice("file:".length);
const databasePath = path.isAbsolute(rawPath)
  ? rawPath
  : path.resolve(cwd, rawPath);
const initSqlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../prisma/init.sql",
);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
const initSql = fs.readFileSync(initSqlPath, "utf8");

const seedAgents = [
  {
    avatarSeed: "momentum-surge",
    badge: "Rising",
    bestStreak: 4,
    brainModel: "gpt-5",
    brainProvider: "openai",
    brainSwappedAt: "2026-04-24T00:00:00.000Z",
    currentRank: 1,
    currentStreak: 3,
    identityKey: "agent-momentum",
    id: "seed-agent-momentum",
    name: "Momentum Agent",
    previousRank: null,
    riskProfile: "medium",
    runtimeKey: "momentum",
    style: "Trend following",
    tagline: "Rides price acceleration and presses when conviction builds.",
    totalLosses: 2,
    totalWins: 7,
  },
  {
    avatarSeed: "contrarian-vault",
    badge: "Provocateur",
    bestStreak: 5,
    brainModel: "gpt-5",
    brainProvider: "openai",
    brainSwappedAt: "2026-04-24T00:00:00.000Z",
    currentRank: 2,
    currentStreak: 1,
    identityKey: "agent-contrarian",
    id: "seed-agent-contrarian",
    name: "Contrarian Agent",
    previousRank: null,
    riskProfile: "medium",
    runtimeKey: "contrarian",
    style: "Crowd fading",
    tagline: "Looks for consensus excess and leans the other way.",
    totalLosses: 3,
    totalWins: 6,
  },
  {
    avatarSeed: "news-flash",
    badge: "Scout",
    bestStreak: 2,
    brainModel: "gpt-5",
    brainProvider: "openai",
    brainSwappedAt: "2026-04-12T00:00:00.000Z",
    currentRank: 3,
    currentStreak: 0,
    identityKey: "agent-news",
    id: "seed-agent-news",
    name: "News Agent",
    previousRank: null,
    riskProfile: "low",
    runtimeKey: "llm-news",
    style: "Headline scanning",
    tagline: "Prefers quick reactions when a new signal changes the narrative.",
    totalLosses: 4,
    totalWins: 4,
  },
  {
    avatarSeed: "quant-lattice",
    badge: "Disciplined",
    bestStreak: 3,
    brainModel: "gpt-5",
    brainProvider: "openai",
    brainSwappedAt: "2026-04-18T00:00:00.000Z",
    currentRank: 4,
    currentStreak: 1,
    identityKey: "agent-quant",
    id: "seed-agent-quant",
    name: "Quant Agent",
    previousRank: null,
    riskProfile: "medium",
    runtimeKey: "llm-quant",
    style: "Microstructure & reversion",
    tagline:
      "Reads short-horizon imbalances and sizes by conviction, never bankroll.",
    totalLosses: 1,
    totalWins: 3,
  },
  {
    avatarSeed: "macro-pulse",
    badge: "Strategist",
    bestStreak: 2,
    brainModel: "gpt-5",
    brainProvider: "openai",
    brainSwappedAt: "2026-04-22T00:00:00.000Z",
    currentRank: 5,
    currentStreak: 0,
    identityKey: "agent-macro",
    id: "seed-agent-macro",
    name: "Macro Agent",
    previousRank: null,
    riskProfile: "high",
    runtimeKey: "llm-news",
    style: "Macro narrative",
    tagline:
      "Tracks regime shifts and sides with the dominant macro narrative of the week.",
    totalLosses: 2,
    totalWins: 2,
  },
];

function seedAgentPool() {
  const insert = db.prepare(`
    INSERT INTO AgentProfile (
      id,
      identityKey,
      runtimeKey,
      name,
      avatarSeed,
      style,
      riskProfile,
      badge,
      currentRank,
      previousRank,
      totalWins,
      totalLosses,
      currentStreak,
      bestStreak,
      tagline,
      isActive,
      brainProvider,
      brainModel,
      brainSwappedAt,
      externalEndpointUrl,
      createdAt,
      updatedAt
    ) VALUES (
      @id,
      @identityKey,
      @runtimeKey,
      @name,
      @avatarSeed,
      @style,
      @riskProfile,
      @badge,
      @currentRank,
      @previousRank,
      @totalWins,
      @totalLosses,
      @currentStreak,
      @bestStreak,
      @tagline,
      1,
      @brainProvider,
      @brainModel,
      @brainSwappedAt,
      NULL,
      @now,
      @now
    )
    ON CONFLICT(identityKey) DO NOTHING
  `);

  const seed = db.transaction(() => {
    const now = new Date().toISOString();

    for (const agent of seedAgents) {
      insert.run({ ...agent, now });
    }
  });

  seed();
}

function ensureLiveRoundColumns() {
  const actionColumns = db.prepare("PRAGMA table_info(Action)").all();
  const hasSnapshotId = actionColumns.some((column) => column.name === "snapshotId");
  const roundEventColumns = db.prepare("PRAGMA table_info(RoundEvent)").all();
  const hasObservationType = roundEventColumns.some(
    (column) => column.name === "observationType",
  );
  const hasSourceKey = roundEventColumns.some((column) => column.name === "sourceKey");
  const hasExternalMarketId = roundEventColumns.some(
    (column) => column.name === "externalMarketId",
  );
  const hasSlug = roundEventColumns.some((column) => column.name === "slug");

  if (!hasSnapshotId) {
    db.exec("ALTER TABLE Action ADD COLUMN snapshotId TEXT;");
  }

  if (!hasObservationType) {
    db.exec("ALTER TABLE RoundEvent ADD COLUMN observationType TEXT DEFAULT 'fact-price';");
  }

  if (!hasSourceKey) {
    db.exec("ALTER TABLE RoundEvent ADD COLUMN sourceKey TEXT;");
  }

  if (!hasExternalMarketId) {
    db.exec("ALTER TABLE RoundEvent ADD COLUMN externalMarketId TEXT;");
  }

  if (!hasSlug) {
    db.exec("ALTER TABLE RoundEvent ADD COLUMN slug TEXT;");
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS Action_roundId_snapshotId_idx
      ON Action(roundId, snapshotId);
  `);
}

function ensureFactPriceTickTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS FactPriceTick (
      id TEXT PRIMARY KEY NOT NULL,
      symbol TEXT NOT NULL,
      price REAL NOT NULL,
      sourceLabel TEXT NOT NULL,
      observedAt DATETIME NOT NULL,
      rawPayloadHash TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS FactPriceTick_symbol_sourceLabel_observedAt_key
      ON FactPriceTick(symbol, sourceLabel, observedAt);

    CREATE INDEX IF NOT EXISTS FactPriceTick_symbol_observedAt_idx
      ON FactPriceTick(symbol, observedAt);
  `);
}

function ensureMarketTickTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS MarketTick (
      id TEXT PRIMARY KEY NOT NULL,
      sourceKey TEXT NOT NULL,
      marketId TEXT NOT NULL,
      conditionId TEXT,
      tokenId TEXT NOT NULL,
      side TEXT NOT NULL,
      price REAL NOT NULL,
      sourceLabel TEXT NOT NULL,
      observedAt DATETIME NOT NULL,
      rawPayloadHash TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS MarketTick_sourceKey_tokenId_observedAt_key
      ON MarketTick(sourceKey, tokenId, observedAt);

    CREATE INDEX IF NOT EXISTS MarketTick_sourceKey_marketId_observedAt_idx
      ON MarketTick(sourceKey, marketId, observedAt);

    CREATE INDEX IF NOT EXISTS MarketTick_tokenId_observedAt_idx
      ON MarketTick(tokenId, observedAt);

    CREATE INDEX IF NOT EXISTS MarketTick_conditionId_idx
      ON MarketTick(conditionId);
  `);
}

try {
  db.exec(initSql);
  ensureLiveRoundColumns();
  ensureFactPriceTickTable();
  ensureMarketTickTable();
  seedAgentPool();
  console.log(`Initialized SQLite schema at ${databasePath}`);
} finally {
  db.close();
}
