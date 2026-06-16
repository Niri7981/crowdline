# Current Execution Plan

## Goal

Ship Crowdline as a focused World Cup V1 meta-market game:

- real Polymarket World Cup markets
- explicit Phantom / MetaMask wallet connection
- browser-local V1 credit trading
- UP / DOWN direction shares
- browser-local portfolio for the current slice
- PnL leaderboard surface ready for the server ledger

## Completed In Current Cleanup

- Removed old product routes and APIs from the app surface.
- Removed legacy product modules, scripts, assets, and onchain workspace.
- Replaced the top navigation with Crowdline V1 links.
- Added a real wallet-connect UI that only connects after user action.
- Added `/portfolio`.
- Rewrote `/leaderboard` as a Crowdline PnL shell.
- Reduced Prisma to `EventPoolItem` and `MarketTick`.
- Reworked the market indexer to write only Polymarket `MarketTick` rows.
- Updated README and planning docs for Crowdline V1.

## Active Product Surfaces

- `/`
- `/markets/[marketId]`
- `/portfolio`
- `/leaderboard`
- `/api/markets`
- `/api/markets/[marketId]`
- `/api/leaderboard`

## Next Build Step

Move browser-local credit state into server-side Crowdline tables and routes:

1. Wallet account
2. Credit claim / funding flow
3. Balance ledger
4. Order and fill records
5. Position aggregation
6. Portfolio API
7. Leaderboard aggregation by cumulative PnL

## Acceptance Checks

- V1 pages return 200.
- Old product routes return 404.
- Typecheck, lint, and build pass.
- Market detail still renders real Polymarket outcomes and historical chart
  controls.
