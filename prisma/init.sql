PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Round (
  id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL,
  marketSymbol TEXT NOT NULL,
  bankrollPerAgent REAL NOT NULL,
  durationSeconds INTEGER NOT NULL,
  startsAt DATETIME,
  endsAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS EventPoolItem (
  id TEXT PRIMARY KEY NOT NULL,
  sourceKey TEXT NOT NULL,
  externalEventId TEXT NOT NULL,
  externalMarketId TEXT,
  slug TEXT,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  category TEXT NOT NULL,
  marketSymbol TEXT NOT NULL,
  yesLabel TEXT NOT NULL,
  noLabel TEXT NOT NULL,
  startsAt DATETIME,
  endsAt DATETIME,
  durationSeconds INTEGER NOT NULL,
  resolutionSource TEXT NOT NULL,
  sourceLabel TEXT NOT NULL,
  externalUrl TEXT,
  currentPrice REAL,
  volumeUsd REAL,
  liquidityScore REAL,
  status TEXT NOT NULL,
  playable INTEGER NOT NULL DEFAULT 1,
  spectatorNote TEXT NOT NULL,
  stageLabel TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS EventPoolItem_sourceKey_externalEventId_key
  ON EventPoolItem(sourceKey, externalEventId);

CREATE INDEX IF NOT EXISTS EventPoolItem_status_playable_idx
  ON EventPoolItem(status, playable);

CREATE INDEX IF NOT EXISTS EventPoolItem_marketSymbol_idx
  ON EventPoolItem(marketSymbol);

CREATE TABLE IF NOT EXISTS AgentProfile (
  id TEXT PRIMARY KEY NOT NULL,
  identityKey TEXT NOT NULL UNIQUE,
  runtimeKey TEXT NOT NULL,
  name TEXT NOT NULL,
  avatarSeed TEXT NOT NULL,
  style TEXT NOT NULL,
  riskProfile TEXT NOT NULL,
  badge TEXT NOT NULL,
  currentRank INTEGER NOT NULL,
  previousRank INTEGER,
  totalWins INTEGER NOT NULL DEFAULT 0,
  totalLosses INTEGER NOT NULL DEFAULT 0,
  currentStreak INTEGER NOT NULL DEFAULT 0,
  bestStreak INTEGER NOT NULL DEFAULT 0,
  tagline TEXT NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 1,
  brainProvider TEXT,
  brainModel TEXT,
  brainSwappedAt DATETIME,
  externalEndpointUrl TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS AgentProfile_isActive_currentRank_idx
  ON AgentProfile(isActive, currentRank);

CREATE INDEX IF NOT EXISTS AgentProfile_runtimeKey_idx
  ON AgentProfile(runtimeKey);

CREATE TABLE IF NOT EXISTS RoundEvent (
  id TEXT PRIMARY KEY NOT NULL,
  roundId TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  resolutionSource TEXT NOT NULL,
  startPrice REAL NOT NULL,
  endPrice REAL,
  outcome TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roundId) REFERENCES Round(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS RoundAgent (
  id TEXT PRIMARY KEY NOT NULL,
  roundId TEXT NOT NULL,
  agentKey TEXT NOT NULL,
  name TEXT NOT NULL,
  style TEXT NOT NULL,
  riskProfile TEXT NOT NULL,
  startingBalance REAL NOT NULL,
  finalBalance REAL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roundId) REFERENCES Round(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS RoundAgent_roundId_agentKey_key
  ON RoundAgent(roundId, agentKey);

CREATE INDEX IF NOT EXISTS RoundAgent_roundId_idx
  ON RoundAgent(roundId);

CREATE TABLE IF NOT EXISTS Action (
  id TEXT PRIMARY KEY NOT NULL,
  roundId TEXT NOT NULL,
  roundAgentId TEXT NOT NULL,
  side TEXT NOT NULL,
  sizeUsd REAL NOT NULL,
  reason TEXT NOT NULL,
  runtimeKey TEXT,
  brainProvider TEXT,
  brainModel TEXT,
  executionProvider TEXT,
  executionModel TEXT,
  executionStatus TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roundId) REFERENCES Round(id) ON DELETE CASCADE,
  FOREIGN KEY (roundAgentId) REFERENCES RoundAgent(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS Action_roundId_idx
  ON Action(roundId);

CREATE INDEX IF NOT EXISTS Action_roundAgentId_idx
  ON Action(roundAgentId);

CREATE INDEX IF NOT EXISTS Action_runtimeKey_idx
  ON Action(runtimeKey);

CREATE INDEX IF NOT EXISTS Action_brainProvider_brainModel_idx
  ON Action(brainProvider, brainModel);

CREATE TABLE IF NOT EXISTS ActionTraceStep (
  id TEXT PRIMARY KEY NOT NULL,
  actionId TEXT NOT NULL,
  roundId TEXT NOT NULL,
  roundAgentId TEXT NOT NULL,
  stepIndex INTEGER NOT NULL,
  phase TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actionId) REFERENCES Action(id) ON DELETE CASCADE,
  FOREIGN KEY (roundId) REFERENCES Round(id) ON DELETE CASCADE,
  FOREIGN KEY (roundAgentId) REFERENCES RoundAgent(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ActionTraceStep_actionId_stepIndex_key
  ON ActionTraceStep(actionId, stepIndex);

CREATE INDEX IF NOT EXISTS ActionTraceStep_roundId_idx
  ON ActionTraceStep(roundId);

CREATE INDEX IF NOT EXISTS ActionTraceStep_roundAgentId_idx
  ON ActionTraceStep(roundAgentId);

CREATE INDEX IF NOT EXISTS ActionTraceStep_phase_idx
  ON ActionTraceStep(phase);

CREATE TABLE IF NOT EXISTS Settlement (
  id TEXT PRIMARY KEY NOT NULL,
  roundId TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  outcome TEXT NOT NULL,
  winnerAgentKey TEXT,
  winnerName TEXT,
  winningSide TEXT,
  finalBalance REAL,
  pnlUsd REAL,
  settledAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roundId) REFERENCES Round(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS BattleProofRecord (
  id TEXT PRIMARY KEY NOT NULL,
  roundId TEXT NOT NULL UNIQUE,
  proofVersion INTEGER NOT NULL,
  proofHash TEXT NOT NULL,
  proofHashEncoding TEXT NOT NULL,
  payload TEXT NOT NULL,
  onchainProofAddress TEXT,
  onchainSignature TEXT,
  anchoredAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roundId) REFERENCES Round(id) ON DELETE CASCADE
);
