# PLANS.md

## Current Plan: Crowdline World Cup V1

### Goal

Crowdline V1 should prove one core flow:

**a World Cup user can trade the direction of a real Polymarket market before
kickoff, using a real connected wallet identity and browser-local V1 credits,
with clear positions, clear settlement rules, and a clear PnL leaderboard
surface.**

### Product Shape

- Product name: `Crowdline`
- Scope: 2026 World Cup only
- Underlying source: Polymarket
- Market type: World Cup winner markets
- Meta-market question: will the underlying market price go `UP` or `DOWN`
  between `kickoff - 24h` and `kickoff`
- Open time: `kickoff - 24h`
- Lock time: `kickoff`
- Wallet: explicit user-initiated Phantom or MetaMask connection
- Funds: browser-local V1 credits for the current slice
- V1 ledger: browser-local until server-side/live wallet ledger ships

### Current Surfaces

- `/` shows a featured market and World Cup market feed.
- `/markets/[marketId]` shows the underlying Polymarket history curve,
  outcomes, and trade card.
- `/portfolio` shows local V1 credit balance and positions.
- `/leaderboard` is the Crowdline PnL leaderboard shell.
- `/api/markets` and `/api/markets/[marketId]` expose market read models.
- `/api/leaderboard` returns an empty PnL board until durable ledger data exists.

### Implementation Status

- Legacy product routes and modules have been removed from the V1 application
  surface.
- Prisma now keeps only the V1 market data models currently used by Crowdline:
  `EventPoolItem` and `MarketTick`.
- The Polymarket indexer only writes `MarketTick` history for configured
  Polymarket markets.
- Top navigation is V1-only: Markets, Portfolio, Leaderboard, explicit wallet
  connect.
- Portfolio reads the same browser-local storage as the trade card.
- Wallet UI supports Phantom and MetaMask, does not auto-connect on page load,
  and displays real connected address / network / balance after user approval.

### Next Durable Slice

The next implementation slice should move browser-local state into explicit
server-side Crowdline tables and routes:

- wallet account
- live ledger balance
- credit claim / funding flow
- order
- fill
- position
- realized and unrealized PnL
- leaderboard aggregation

### Acceptance For V1-Only Cleanup

- Old routes such as `/agents`, `/round`, `/battles`, and `/events` return 404.
- The market feed, market detail, portfolio, and leaderboard pages open without
  a Next overlay.
- No user-facing UI uses legacy product language.
- Market detail still shows real Polymarket outcomes and historical chart data.
