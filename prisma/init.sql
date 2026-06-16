PRAGMA foreign_keys = ON;

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
