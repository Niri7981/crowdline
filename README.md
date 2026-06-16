# Crowdline

Crowdline is a World Cup V1 meta-market game built on top of real Polymarket
markets.

Users trade whether an underlying World Cup market price moves `UP` or `DOWN`
between open and kickoff, using browser-local V1 credits tied to an explicit
wallet connection flow.

## V1 Product

- World Cup markets only
- Polymarket as the underlying source
- Phantom / MetaMask wallet connection
- Browser-local V1 credit trading
- UP / DOWN direction shares
- Portfolio and PnL leaderboard surfaces
- Market detail pages with real Polymarket outcomes and history

## Routes

| Route | Purpose |
| --- | --- |
| `/` | World Cup market feed and featured market |
| `/markets/[marketId]` | Market detail, historical curve, outcomes, trade card |
| `/portfolio` | Local V1 credit balance and browser-stored positions |
| `/leaderboard` | Crowdline PnL leaderboard shell |
| `/api/markets` | Crowdline market list JSON |
| `/api/markets/[marketId]` | Crowdline market detail JSON |
| `/api/leaderboard` | PnL leaderboard JSON, empty until server ledger ships |

Old product routes intentionally 404 in this V1 cleanup.

## Local Development

```bash
npm install
npm run prisma:generate
npm run dev
```

The app defaults to the local Polymarket proxy at `http://127.0.0.1:6324`.
Override it with:

```bash
CROWDLINE_POLYMARKET_PROXY=http://127.0.0.1:6324
```

## Market Indexing

Run the Polymarket indexer against a configured market:

```bash
CROWDLINE_POLYMARKET_SLUG=world-cup-winner npm run market:indexer
```

Useful variables:

- `CROWDLINE_POLYMARKET_PROXY`
- `CROWDLINE_POLYMARKET_SLUG`
- `CROWDLINE_POLYMARKET_MARKET_ID`
- `CROWDLINE_POLYMARKET_YES_TOKEN_ID`
- `CROWDLINE_POLYMARKET_NO_TOKEN_ID`
- `CROWDLINE_INDEXER_INTERVAL_MS`
- `CROWDLINE_INDEXER_MAX_TICKS`

## Current Limitations

- Portfolio state is local to the browser.
- Leaderboard is a V1 shell until the server-side/live wallet ledger ships.
- Settlement hooks are product-defined but not yet persisted server-side.
