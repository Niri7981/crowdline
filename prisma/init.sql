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

CREATE TABLE IF NOT EXISTS WalletAccount (
  id TEXT PRIMARY KEY NOT NULL,
  walletKind TEXT NOT NULL,
  walletAddress TEXT NOT NULL,
  normalizedAddress TEXT NOT NULL,
  networkLabel TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS WalletAccount_walletKind_normalizedAddress_key
  ON WalletAccount(walletKind, normalizedAddress);

CREATE INDEX IF NOT EXISTS WalletAccount_normalizedAddress_idx
  ON WalletAccount(normalizedAddress);

CREATE TABLE IF NOT EXISTS CreditLedgerEntry (
  id TEXT PRIMARY KEY NOT NULL,
  walletAccountId TEXT NOT NULL,
  entryType TEXT NOT NULL,
  amount REAL NOT NULL,
  balanceAfter REAL,
  referenceType TEXT,
  referenceId TEXT,
  dedupeKey TEXT,
  note TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT CreditLedgerEntry_walletAccountId_fkey
    FOREIGN KEY (walletAccountId) REFERENCES WalletAccount(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS CreditLedgerEntry_dedupeKey_key
  ON CreditLedgerEntry(dedupeKey);

CREATE INDEX IF NOT EXISTS CreditLedgerEntry_walletAccountId_createdAt_idx
  ON CreditLedgerEntry(walletAccountId, createdAt);

CREATE INDEX IF NOT EXISTS CreditLedgerEntry_referenceType_referenceId_idx
  ON CreditLedgerEntry(referenceType, referenceId);

CREATE TABLE IF NOT EXISTS CrowdlineOrder (
  id TEXT PRIMARY KEY NOT NULL,
  walletAccountId TEXT NOT NULL,
  marketId TEXT NOT NULL,
  side TEXT NOT NULL,
  amount REAL NOT NULL,
  quotePrice REAL NOT NULL,
  shares REAL NOT NULL,
  status TEXT NOT NULL,
  marketTitle TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  filledAt DATETIME,
  CONSTRAINT CrowdlineOrder_walletAccountId_fkey
    FOREIGN KEY (walletAccountId) REFERENCES WalletAccount(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT CrowdlineOrder_marketId_fkey
    FOREIGN KEY (marketId) REFERENCES EventPoolItem(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS CrowdlineOrder_walletAccountId_createdAt_idx
  ON CrowdlineOrder(walletAccountId, createdAt);

CREATE INDEX IF NOT EXISTS CrowdlineOrder_marketId_side_idx
  ON CrowdlineOrder(marketId, side);

CREATE INDEX IF NOT EXISTS CrowdlineOrder_status_createdAt_idx
  ON CrowdlineOrder(status, createdAt);

CREATE TABLE IF NOT EXISTS CrowdlineFill (
  id TEXT PRIMARY KEY NOT NULL,
  orderId TEXT NOT NULL,
  walletAccountId TEXT NOT NULL,
  marketId TEXT NOT NULL,
  side TEXT NOT NULL,
  amount REAL NOT NULL,
  price REAL NOT NULL,
  shares REAL NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT CrowdlineFill_orderId_fkey
    FOREIGN KEY (orderId) REFERENCES CrowdlineOrder(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT CrowdlineFill_walletAccountId_fkey
    FOREIGN KEY (walletAccountId) REFERENCES WalletAccount(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT CrowdlineFill_marketId_fkey
    FOREIGN KEY (marketId) REFERENCES EventPoolItem(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS CrowdlineFill_orderId_key
  ON CrowdlineFill(orderId);

CREATE INDEX IF NOT EXISTS CrowdlineFill_walletAccountId_createdAt_idx
  ON CrowdlineFill(walletAccountId, createdAt);

CREATE INDEX IF NOT EXISTS CrowdlineFill_marketId_side_idx
  ON CrowdlineFill(marketId, side);

CREATE TABLE IF NOT EXISTS CrowdlinePosition (
  id TEXT PRIMARY KEY NOT NULL,
  walletAccountId TEXT NOT NULL,
  marketId TEXT NOT NULL,
  side TEXT NOT NULL,
  shares REAL NOT NULL,
  avgPrice REAL NOT NULL,
  spent REAL NOT NULL,
  realizedPnl REAL NOT NULL DEFAULT 0,
  openedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT CrowdlinePosition_walletAccountId_fkey
    FOREIGN KEY (walletAccountId) REFERENCES WalletAccount(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT CrowdlinePosition_marketId_fkey
    FOREIGN KEY (marketId) REFERENCES EventPoolItem(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS CrowdlinePosition_walletAccountId_marketId_side_key
  ON CrowdlinePosition(walletAccountId, marketId, side);

CREATE INDEX IF NOT EXISTS CrowdlinePosition_marketId_side_idx
  ON CrowdlinePosition(marketId, side);

CREATE INDEX IF NOT EXISTS CrowdlinePosition_walletAccountId_updatedAt_idx
  ON CrowdlinePosition(walletAccountId, updatedAt);
