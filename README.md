# Crowdline

Crowdline is a World Cup V1 meta-market app built on top of real Polymarket
markets.

Instead of buying the underlying market directly, the user trades whether a
selected Polymarket market will move `UP` or `DOWN` during a fixed pre-kickoff
window. The current V1 keeps trading state in browser-local credits while the
next backend ledger slice is still in progress.

## What V1 Includes

- 2026 World Cup market feed
- Real Polymarket-backed market detail pages
- Historical outcome chart and scrubber
- Explicit Phantom / MetaMask wallet connect UI
- Local V1 portfolio surface
- PnL leaderboard shell

## Core Product Model

- Source market: a real Polymarket World Cup market
- Crowdline position: `UP` or `DOWN`
- Open window: `kickoff - 24h`
- Lock time: `kickoff`
- Wallet UX: user-initiated connect only, no auto-connect on page load
- Ledger in this slice: browser-local credits and positions

## Current Routes

| Route | Purpose |
| --- | --- |
| `/` | Featured market and World Cup market feed |
| `/markets/[marketId]` | Market detail, outcomes, history curve, trade card |
| `/portfolio` | Local credit balance and stored positions |
| `/leaderboard` | Crowdline PnL leaderboard shell |
| `/api/markets` | Market list JSON |
| `/api/markets/[marketId]` | Market detail JSON |
| `/api/leaderboard` | Leaderboard JSON, empty until durable ledger ships |

Legacy Arena / Agent / Round / Battle routes were intentionally removed during
the V1 cleanup and now return `404`.

## Tech Stack

- Next.js App Router
- React 19
- Prisma
- SQLite
- Polymarket market data ingestion scripts

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run prisma:generate
npm run dev
```

Default local app URL:

```bash
http://localhost:3000
```

If port `3000` is busy:

```bash
npm run dev -- -p 3001
```

## Market Data Setup

The app can read Polymarket through a local proxy.

Example:

```bash
CROWDLINE_POLYMARKET_PROXY=http://127.0.0.1:6324
```

Useful environment variables:

- `DATABASE_URL`
- `CROWDLINE_POLYMARKET_PROXY`
- `CROWDLINE_POLYMARKET_PROXY_INSECURE`
- `CROWDLINE_POLYMARKET_SLUG`
- `CROWDLINE_POLYMARKET_MARKET_ID`
- `CROWDLINE_POLYMARKET_YES_TOKEN_ID`
- `CROWDLINE_POLYMARKET_NO_TOKEN_ID`
- `CROWDLINE_INDEXER_INTERVAL_MS`
- `CROWDLINE_INDEXER_MAX_TICKS`

Inspect a market:

```bash
npm run market:inspect
```

Run the indexer:

```bash
CROWDLINE_POLYMARKET_SLUG=world-cup-winner npm run market:indexer
```

## Current Status

Implemented now:

- Crowdline-only application surface
- Real Polymarket outcomes and historical tick data
- Market feed, detail page, portfolio page, leaderboard shell
- Real wallet connection entry points for Phantom and MetaMask

Still not durable yet:

- server-side wallet account model
- server-side balance ledger
- order and fill persistence
- position aggregation
- realized and unrealized PnL aggregation
- non-empty leaderboard data

## Known Limitations

- Portfolio data is still browser-local in this slice.
- Wallet connection is real, but trading is not yet persisted to a backend
  ledger.
- Leaderboard is still a shell until settlement and aggregation land.

## Next Slice

The next durable build step is moving local credit state into explicit
server-side Crowdline tables and routes:

- wallet account
- balance ledger
- order
- fill
- position
- PnL aggregation
- leaderboard aggregation
