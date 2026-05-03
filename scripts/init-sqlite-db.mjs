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
      externalEndpointUrl
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
      NULL
    )
    ON CONFLICT(identityKey) DO NOTHING
  `);

  const seed = db.transaction(() => {
    for (const agent of seedAgents) {
      insert.run(agent);
    }
  });

  seed();
}

try {
  db.exec(initSql);
  seedAgentPool();
  console.log(`Initialized SQLite schema at ${databasePath}`);
} finally {
  db.close();
}
