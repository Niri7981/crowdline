# PLANS.md

## Current Master Plan: Identity-Proof Arena

### Goal

AgentDuel should prove one core truth:

**agents earn public identity through repeated, trustworthy battles.**

The near-term product is not a generic prediction dashboard.
The near-term product is:

- fixed public agents
- curated internal Event Pool
- short-horizon Polymarket battle rounds
- real external market observation
- visible settlement and reputation movement

### Current Product Read

What is already meaningfully working:

- hot Polymarket events can feed the internal Event Pool
- rounds can be created from real external events
- `polymarket-price` rounds can tick from `MarketTick`
- settlement can resolve from indexed market price
- LLM-backed agents can return real decisions again

What still makes the arena feel not fully real:

- selected markets are not yet auto-observed end to end
- LLM failure still has fallback semantics that are too soft for a trusted arena
- agent context is still thin relative to the ambition of agent identity
- evaluation is not yet formalized, so iteration still relies too much on feel
- identity / reputation surfaces are not yet the strongest emotional layer

### Product Layer Impact

This roadmap strengthens all core product layers in order:

1. event source layer
2. event pool layer
3. round / battle layer
4. settlement / proof layer
5. leaderboard / profile / reputation layer

### Technical Architecture

The next system shape should be:

1. external source -> internal Event Pool -> round creation
2. selected live round -> automatic market observation -> `MarketTick`
3. `MarketTick` + structured context -> agent runtime decision
4. trusted tick / settle pipeline -> reputation update
5. replayable history -> evaluation harness -> better agents over time

### Phase Roadmap

#### Phase 1: Stable Live Market Loop

##### Problem

The arena now has the right data model direction, but the live market loop is
still partly manual. A selected market should automatically become a watched
market while the round is live.

##### Tasks

1. Make the market indexer automatically discover active live rounds.
2. Extract each live round's `externalMarketId` / slug into a watchlist.
3. Continuously write `MarketTick` for watched Polymarket markets.
4. Fail loudly when a live `polymarket-price` round lacks fresh indexed ticks.
5. Run a full local smoke test: create -> auto-observe -> tick -> settle.

##### Affected Files

- `/Users/irin/agent-duel/scripts/market-indexer.mjs`
- `/Users/irin/agent-duel/src/lib/server/market-data/indexed-facts.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/create-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/tick-live-round.ts`
- `/Users/irin/agent-duel/src/lib/server/settlement/resolvers/price-threshold.ts`
- `/Users/irin/agent-duel/src/app/api/settle/route.ts`

##### Acceptance

- selecting a Polymarket event is enough to start observation
- no manual slug handoff is required for the active round path
- tick and settle read the same indexed market source
- stale or missing market data is explicit, not hidden

#### Phase 2: Trusted Battle Semantics

##### Problem

The system can now run real LLM calls again, but a failed LLM execution should
not quietly blend into a normal trusted battle result.

##### Tasks

1. Define round / action trust states for degraded runtime execution.
2. Mark `failed-fallback` actions as non-trusted battle evidence.
3. Decide whether a degraded agent invalidates the whole round or only that
   agent's battle proof.
4. Surface trust state in the round response and settlement path.
5. Prevent reputation updates from pretending degraded battles were fully real.

##### Affected Files

- `/Users/irin/agent-duel/src/lib/server/agent-runtime/run-round-agent-runtime.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm/llm-decide.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/map-round-state.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/settle-round.ts`
- `/Users/irin/agent-duel/src/lib/server/reputation/build-reputation-effects.ts`
- `/Users/irin/agent-duel/src/lib/types/action.ts`
- `/Users/irin/agent-duel/src/lib/types/round.ts`

##### Acceptance

- LLM failure no longer masquerades as clean arena proof
- degraded actions are visible in battle state
- reputation movement respects trust boundaries

#### Phase 3: Stronger Agent Context

##### Problem

The current agent input is still too thin. To make identity meaningful, agents
need richer observation of the battle environment, not just a single latest
price.

##### Tasks

1. Feed recent `MarketTick` windows into LLM-backed agents.
2. Add short-horizon momentum / volatility / reversal features.
3. Add round clock context such as time remaining and tick cadence.
4. Standardize a compact observation packet shared across agent runtimes.
5. Keep reasons concise while making the decision surface more grounded.

##### Affected Files

- `/Users/irin/agent-duel/src/lib/server/market-data/indexed-facts.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/tick-live-round.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm/llm-decide.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm-news.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm-quant.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/types.ts`

##### Acceptance

- agents can see structured recent market behavior
- different agent identities can express visibly different styles
- decisions become more repeatable and less arbitrary

#### Phase 4: Evaluation Harness v1

##### Problem

We need a repeatable way to test whether an agent identity actually improved,
or whether a change only made the demo feel better.

##### Tasks

1. Define a replayable evaluation input based on historical `MarketTick`.
2. Re-run agent runtimes against fixed historical market windows.
3. Settle replayed decisions on future real market movement.
4. Report core metrics: win rate, pnl proxy, drawdown, flip rate,
   conviction distribution.
5. Compare agents, prompts, models, and context versions without touching live
   reputation.

##### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/package.json`
- `/Users/irin/agent-duel/scripts/`
- `/Users/irin/agent-duel/src/lib/runtime/agents/`
- `/Users/irin/agent-duel/src/lib/server/market-data/`
- `/Users/irin/agent-duel/src/lib/types/`

##### Acceptance

- we can run an offline evaluation pass locally
- the same historical slice produces comparable results across runs
- agent changes can be judged with evidence instead of instinct alone

#### Phase 5: Identity And Proof Surfaces

##### Problem

Even with real battle data, the product will not land if identity, ranking, and
proof are not the most legible part of the experience.

##### Tasks

1. Strengthen leaderboard movement and settlement payoff.
2. Expand agent profile surfaces: recent battles, style, streaks, badges,
   trusted vs degraded record.
3. Make battle detail pages emphasize why an agent's public identity changed.
4. Keep charts as evidence, not the main character.
5. Prepare onchain / durable proof hooks around battle history and reputation.

##### Affected Files

- `/Users/irin/agent-duel/src/app/round/page.tsx`
- `/Users/irin/agent-duel/src/components/round/SettlementPanel.tsx`
- `/Users/irin/agent-duel/src/app/battles/[roundId]/page.tsx`
- `/Users/irin/agent-duel/src/app/leaderboard/page.tsx`
- `/Users/irin/agent-duel/src/lib/server/reputation/`
- `/Users/irin/agent-duel/src/lib/server/battles/`

##### Acceptance

- a battle ending visibly changes agent public status
- users can inspect trusted history, not just the latest chart
- identity and proof clearly dominate the product narrative

#### Phase 6: Learning Loop Preparation

##### Problem

RL may matter later, but it should only be added after the environment,
evaluation, and trust boundary are solid.

##### Tasks

1. Capture evaluation-ready decision datasets.
2. Define reward signals aligned with public battle performance.
3. Separate live identity logic from experimental training loops.
4. Test offline policy updates before any live learning path.
5. Keep the public arena deterministic enough to remain credible.

##### Acceptance

- the project has a clean bridge from evaluation to future learning work
- RL remains a later optimization layer, not a premature dependency

## Immediate Plan: Hot Polymarket Event Pool

### Problem

The current selectable events can feel stale or one-sided. Many external
markets have already converged near 0/1, which removes the spectator tension
AgentDuel needs for a public arena round.

### Constraints

- Polymarket stays an input layer, not the product center.
- Keep the internal Event Pool as the arena boundary.
- Use the local proxy when pulling Polymarket data.
- Prefer a small, curated list: 10 hot events with real market disagreement.
- Do not break the existing round path while non-price Polymarket settlement is
  still being wired.

### Product Layer Impact

This improves the event source layer and Event Pool layer:

- hot external markets become the default event intake
- boring one-sided events are filtered out
- the homepage selection experience reflects current external attention
- the arena still presents events as battle objectives, not as a market browser

### Technical Architecture

- Add a reusable hot Polymarket candidate fetcher.
- Filter candidates by active/open status, future deadline, volume, and YES
  price disagreement.
- Make Event Pool sync default to 10 hot Polymarket candidates.
- Keep `/api/events?source=polymarket-hot` as a direct debug/read endpoint.
- Make the homepage event selector read internal Event Pool items.

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/src/lib/server/events/get-hot-polymarket-events.ts`
- `/Users/irin/agent-duel/src/lib/server/events/seed-event-pool.ts`
- `/Users/irin/agent-duel/src/app/api/events/route.ts`
- `/Users/irin/agent-duel/src/app/events/page.tsx`
- `/Users/irin/agent-duel/src/app/page.tsx`

### Implementation Order

1. Expand hot Polymarket fetching so it can reliably find 10 interesting
   future markets.
2. Make Event Pool sync consume that source by default.
3. Default event reads/syncs to 10 hot items.
4. Point homepage event selection at the internal Event Pool.
5. Run lint and smoke-check the API.

### Risks / Edge Cases

- Polymarket can return active event wrappers that contain stale or closed
  child markets; filter at the market level too.
- If fewer than 10 markets pass the disagreement filter, return the best
  available set instead of filling with one-sided events.
- Non-price Polymarket events still need a dedicated YES/NO market tick
  settlement path before every hot event can fully settle as a real round.

## Immediate Plan: Indexed Fact Price Layer

### Problem

The live round loop reads public prices, but it still does so inside the round
tick / settlement path. That makes the arena feel less real because there is no
independent fact stream being indexed before agents act.

### Constraints

- Keep the first slice narrow: indexed asset prices before broad market
  indexing.
- Keep round orchestration separate from external source polling.
- Do not scrape HTML; use public JSON APIs.
- Preserve the existing live round API and local runner behavior.
- Keep failures visible when the indexer has not produced fresh facts.

### Product Layer Impact

This strengthens the event source / fact layer and makes public battle proof
more credible:

- external prices become a durable fact stream
- round snapshots can cite an indexed fact tick
- settlement can resolve from facts already observed near the deadline
- spectators can distinguish arena decisions from the external world feed

### Technical Architecture

- Add `FactPriceTick` as the indexed asset-price table.
- Add a Node.js indexer script that polls supported symbols and writes fact
  ticks.
- Add a server helper that reads the latest indexed fact and converts it into
  existing market observation semantics.
- Make live round ticking consume indexed facts instead of directly fetching
  external prices.
- Make settlement resolve from the indexed fact closest to the round deadline.

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/prisma/schema.prisma`
- `/Users/irin/agent-duel/prisma/init.sql`
- `/Users/irin/agent-duel/scripts/init-sqlite-db.mjs`
- `/Users/irin/agent-duel/scripts/market-indexer.mjs`
- `/Users/irin/agent-duel/package.json`
- `/Users/irin/agent-duel/src/lib/server/market-data/indexed-facts.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/create-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/tick-live-round.ts`
- `/Users/irin/agent-duel/src/lib/server/settlement/resolvers/price-threshold.ts`

### Implementation Order

1. Add the indexed fact schema and SQLite init support.
2. Add the reusable indexed fact read helper.
3. Add the Node.js polling indexer script.
4. Switch create/tick/settlement to consume indexed facts.
5. Run Prisma generate, lint, and local smoke checks.

### Risks / Edge Cases

- If the indexer is not running, tick should fail clearly instead of silently
  pretending it observed a fresh fact.
- Create round can use event pool fallback only as a bootstrap; tick/settlement
  should prefer indexed facts.
- Deadline settlement may need a tolerance window if the indexer missed a few
  seconds.

## Immediate Plan: Polymarket Market Price Indexing

### Problem

The indexed fact layer now records true asset prices, but the arena still lacks
the external market-consensus curve from Polymarket. For spectator clarity,
AgentDuel should separate:

- fact price: what the external world says SOL/BTC/ETH is worth
- market price: what a Polymarket YES/NO market currently implies

### Constraints

- Keep Polymarket as an input layer, not the product center.
- Use public Gamma/CLOB JSON APIs; do not scrape HTML.
- Do not require Polymarket trading auth for read-only indexing.
- If Gamma slug resolution is unavailable, allow direct token-id config so the
  indexer can still run.

### Product Layer Impact

This adds the missing external market-consensus stream:

- agents can later compare fact movement with market belief movement
- the battle chart can show public market sentiment separately from settlement
  facts
- event pool entries can eventually link to real Polymarket market identities

### Technical Architecture

- Add `MarketTick` as a separate table from `FactPriceTick`.
- Resolve Polymarket market metadata from Gamma by slug when available.
- Read YES/NO token prices from Polymarket CLOB `/price`.
- Write one `MarketTick` per side per observed timestamp.
- Keep the existing fact indexer path alive even when Polymarket is temporarily
  unreachable.

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/prisma/schema.prisma`
- `/Users/irin/agent-duel/prisma/init.sql`
- `/Users/irin/agent-duel/scripts/init-sqlite-db.mjs`
- `/Users/irin/agent-duel/scripts/market-indexer.mjs`

### Implementation Order

1. Add `MarketTick` schema/init support.
2. Extend `market-indexer.mjs` with optional Polymarket config.
3. Support slug auto-resolution via Gamma.
4. Support direct token-id config as a fallback.
5. Run init/generate/lint and a local indexer smoke test.

### Risks / Edge Cases

- Gamma can be slow or temporarily unreachable; direct token-id config preserves
  demo control.
- CLOB token price requests can fail for stale or closed markets.
- Polymarket price is market sentiment, not settlement fact; keep it separate
  from `FactPriceTick`.

## Immediate Plan: Live Round Runner And Visible Battle Curves

### Problem

The repo can already persist repeated `priceSnapshots` and repeated `Action`
writes, but the live battle loop is not yet reliably legible end to end:

- the local runner can attach to a stale round because it trusts snapshot-time
  deadline math instead of the round's real deadline
- the `/round` chart still fails to render reliably because the current
  responsive chart container can collapse to zero size
- the page does not yet expose the real round timing needed for a true live
  countdown and a stable external observation loop

### Constraints

- Keep the arena framing; do not turn `/round` into a trading terminal.
- Preserve `priceSnapshots` as the base market proof layer.
- Preserve repeated `Action` rows as the public battle layer.
- Keep settlement on the real fact path; do not replace it with a demo resolver.
- Prefer the smallest slice that makes the round visibly alive before adding
  more market-data sophistication.

### Product Layer Impact

This strengthens the round / battle layer and keeps the identity thesis clear:

- the market curve becomes a visible public fact layer
- each agent gets a visible conviction curve over time
- the battle can keep advancing through a real 5-second observation cadence
- spectators can actually watch public proof being built before settlement

### Technical Architecture

- Expose `startsAt` and `endsAt` through `RoundState` so the runner and UI can
  reason about the real round clock instead of stale snapshot-relative values.
- Update the local runner to use round-level deadline semantics and keep moving
  forward across live rounds more reliably.
- Replace the fragile chart auto-sizing path with an explicit measured chart
  width so the 3-curve battle view consistently renders on `/round`.
- Keep `priceSnapshots` as the market base line and render one exposure line
  per agent plus action markers.

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/src/lib/types/round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/map-round-state.ts`
- `/Users/irin/agent-duel/src/app/round/page.tsx`
- `/Users/irin/agent-duel/src/components/round/BattlePriceChart.tsx`
- `/Users/irin/agent-duel/scripts/live-round-runner.mjs`

### Implementation Order

1. Expose real round timing in API state.
2. Make the runner use real deadline timing and continue more safely.
3. Replace the chart sizing path so axes and curves render reliably.
4. Run lint and a local live runner smoke test.
5. Re-open `/round` and verify that the battle visibly moves.

### Risks / Edge Cases

- Historical snapshot-level `timeToDeadline` should remain snapshot-relative for
  tooltip proof; the live countdown must come from round-level timing instead.
- If settlement fails because the external fact source is unavailable, the
  runner should fail loudly instead of silently pretending the round resolved.
- The first visible curve point still needs a bootstrap rule so a one-snapshot
  round does not look empty.

## Immediate Plan: Live Round Observation Semantics

### Problem

The live round tick path can already fetch a fresh external price and persist a
new `priceSnapshot`, but the market-data boundary still speaks in bare price
points. That makes it harder to prove what changed between ticks and harder for
agents or the UI to reason about fresh external re-evaluation.

### Constraints

- Keep the existing `priceSnapshots` table as the persisted proof layer.
- Do not introduce a heavier market subscription or historical sync system in
  this pass.
- Keep settlement compatible with the current fact-based resolver path.
- Prefer computed observation metadata over new database columns for now.

### Product Layer Impact

This strengthens the round / battle layer. Each tick becomes a clearer public
observation cycle:

- fresh external state arrives
- market movement becomes legible
- agents can later explain whether they held, resized, or flipped

### Technical Architecture

- Promote the current market-data read boundary into an observation helper.
- Keep raw latest-price fetch support, but add observation semantics on top:
  `price`, `timestamp`, `sourceLabel`, `delta`, `pctChange`,
  `timeSinceLastTick`, and `timeToDeadline`.
- Compute observation deltas from the latest persisted local snapshot plus the
  round deadline.
- Update live round ticking to consume the observation layer instead of a bare
  price point.
- Map persisted `priceSnapshots` back into observation-shaped API state for the
  `/round` page.

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/src/lib/server/market-data/types.ts`
- `/Users/irin/agent-duel/src/lib/server/market-data/get-live-price.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/create-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/tick-live-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/map-round-state.ts`
- `/Users/irin/agent-duel/src/lib/types/round.ts`

### Implementation Order

1. Add shared market observation types and metrics computation.
2. Wrap the latest-price fetch in an observation builder.
3. Switch live round create/tick paths to use the observation layer.
4. Map persisted snapshots into observation-shaped round state.
5. Run lint and build to confirm the new data shape is stable.

### Risks / Edge Cases

- The first snapshot in a round has no previous local baseline, so delta and
  time-since-last-tick should remain `null`.
- Some rounds may not have a deadline; `timeToDeadline` should stay `null`
  instead of inventing a value.
- External fetch failures should preserve the existing fallback behavior during
  round creation.

## Immediate Plan: External Agent Webhook Entry

### Problem

AgentDuel should not be limited to agents powered by the project owner's model
keys. For the hackathon story, other builders should be able to bring their own
agent into the arena as a public identity and let that agent compete through a
standard decision interface.

### Constraints

- Do not store user API keys.
- Keep `identityKey`, `runtimeKey`, and `agentKey` separate.
- Keep the external agent as a public `AgentProfile`, not a raw model.
- Do not make this a full marketplace or permission system before the demo.
- Keep round creation robust if an external webhook is offline.

### Product Layer Impact

This expands the Agent Pool layer and reinforces the core thesis: agent identity
is earned through public battles. External agents can enter the arena, build
rank, collect match history, and become inspectable competitors instead of just
being private scripts.

### Technical Architecture

- Add `externalEndpointUrl` to `AgentProfile`.
- Add `runtimeKey = external-webhook` adapter support.
- Add a registration API that creates a public external agent identity with a
  webhook endpoint.
- At round time, POST the standardized event / bankroll / opponent context to
  the external endpoint.
- Validate the returned decision shape and persist it like any other action.
- If the external endpoint fails, use a visible fallback decision so the demo
  flow continues.

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/prisma/schema.prisma`
- `/Users/irin/agent-duel/src/lib/server/agents/types.ts`
- `/Users/irin/agent-duel/src/lib/server/agents/get-agent-pool.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/create-round.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/types.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/registry.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/external-webhook.ts`
- `/Users/irin/agent-duel/src/app/api/agents/external/route.ts`
- `/Users/irin/agent-duel/src/app/agents/page.tsx`

### Implementation Order

1. Add schema/type support for external endpoint metadata.
2. Add the external webhook runtime adapter.
3. Wire create-round participant snapshots to carry the endpoint.
4. Add external agent registration API.
5. Add a small Agents page registration form.
6. Run Prisma generate/migration, lint, build, and a local API smoke test.

### Risks / Edge Cases

- A webhook can be slow or offline; use timeout and fallback trace.
- External URL is third-party infrastructure; the app should not send secrets.
- Hackathon demo should avoid exposing private localhost endpoints unless the
  user intentionally registers one.
- A malicious webhook response must be validated before persistence.

## Immediate Plan: Agent Runtime Brain Closure

### Problem

The current round flow has a real runtime dispatcher, but it still leaves three
gaps in the agent proof story:

- LLM-backed adapters do not yet consume the selected `AgentProfile` brain
  snapshot from the database.
- `Action` rows only store `side`, `sizeUsd`, and `reason`, so a historical
  decision does not prove which runtime and brain produced it.
- Momentum and Contrarian are still pure rules while the demo narrative wants
  every public agent to feel like an Arena Agent with a swappable model brain.

### Constraints

- Keep public identity keyed by `identityKey`; do not confuse it with
  `runtimeKey`.
- Keep the runtime registry as the adapter boundary.
- Preserve existing battle rows by adding nullable snapshot fields.
- Keep the demo robust when OpenAI / Anthropic keys are missing by retaining
  mock fallback.

### Product Layer Impact

This advances the Agent Pool and Round / Battle layers. A round action can now
say which public agent acted, which runtime style it used, which brain it was
configured with, and whether the execution hit a real provider or fallback.

### Technical Architecture

- Extend runtime decisions with an execution snapshot.
- Convert `AgentRuntimeBrain` into LLM `BrainConfig` at the registry boundary.
- Run Momentum and Contrarian through LLM personas when their profile brain is
  OpenAI / Anthropic, while retaining rules fallback for rules brains.
- Persist runtime and brain snapshot fields on `Action`.
- Map persisted snapshots back to `RoundAction` for UI/proof surfaces.

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/prisma/schema.prisma`
- `/Users/irin/agent-duel/src/lib/runtime/agents/types.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm/llm-decide.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm-news.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm-quant.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/types.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/registry.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/run-round-agent-runtime.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/create-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/map-round-state.ts`
- `/Users/irin/agent-duel/src/lib/types/action.ts`

### Implementation Order

1. Extend runtime and action types with execution snapshot fields.
2. Pass DB brain into LLM-backed adapters.
3. Add LLM persona adapters for Momentum and Contrarian with rules fallback.
4. Persist action runtime / brain / execution snapshots.
5. Update Prisma schema, generate client, and run type/lint checks.

### Risks / Edge Cases

- Existing action rows will have null snapshots until a new round is created.
- If an agent profile has a rules brain, Momentum / Contrarian should keep
  deterministic rules behavior instead of forcing LLM.
- If provider keys are missing, the execution provider should show `mock` while
  the configured brain still shows `openai` or `anthropic`.

## Immediate Plan: Onchain Proof Verification Polish

### Problem

The demo can currently settle a battle and store a localnet transaction
signature, but the product surface still treats "has a signature" as the main
proof signal. For AgentDuel, public proof should mean the app can read the
Solana proof PDA back and verify that its compact account data matches the
persisted battle proof.

### Constraints

- Keep settlement and reputation computation in the backend.
- Keep the Pinocchio program as a compact proof anchor, not a full arena state
  machine.
- Do not introduce wallet UX or mainnet behavior in this pass.
- Keep localnet failure states visible instead of hiding them behind a generic
  pending label.

### Product Layer Impact

This improves the public proof layer:

- the proof panel can say verified, pending, or mismatch
- spectators can inspect the PDA and signature with clearer trust language
- "onchain" becomes a verifiable anchor, not only a badge in the UI

### Technical Architecture

- Add a TypeScript decoder for the fixed Pinocchio `BattleProofAnchor` account
  layout.
- Read the proof PDA from localnet when rendering battle proof state.
- Validate account owner, expected PDA, discriminator/version, proof hash,
  proof version, round id, winner identity, and winning side.
- Surface verification status through the existing proof API and UI panels.
- Add a small Pinocchio guard that rejects calls routed to the wrong program id.

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/onchain/clients/arena/constants.ts`
- `/Users/irin/agent-duel/onchain/clients/arena/decode-battle-proof-anchor.ts`
- `/Users/irin/agent-duel/onchain/clients/arena/index.ts`
- `/Users/irin/agent-duel/onchain/clients/arena/types.ts`
- `/Users/irin/agent-duel/onchain/programs/arena/src/lib.rs`
- `/Users/irin/agent-duel/src/lib/server/battles/get-battle-anchor.ts`
- `/Users/irin/agent-duel/src/app/round/page.tsx`
- `/Users/irin/agent-duel/src/components/round/SettlementPanel.tsx`
- `/Users/irin/agent-duel/src/app/battles/[roundId]/page.tsx`

### Implementation Order

1. Add account layout constants and a decoder matching the Rust account layout.
2. Add RPC read-back verification to `getBattleAnchor()`.
3. Update API/UI proof types to show verification status.
4. Add the Pinocchio program id guard.
5. Run TypeScript lint/build and Rust compile checks where available.

### Risks / Edge Cases

- Localnet may be offline; verification should become `pending`, not fail the
  battle page.
- A stale database signature may point to a missing PDA; show `missing`.
- A PDA can exist but fail hash or owner checks; show `mismatch`.
- Old records without `onchainProofAddress` should remain readable.

## Immediate Plan: Pinocchio Battle Proof Anchor

### Goal

Keep the onchain arena program on a minimal Pinocchio proof-anchor path.

The next implementation step is to record compact battle proof anchors on
Solana after a battle has been settled and its `BattleProofRecord` has been
persisted in the app database.

### Minimum Viable Implementation

Build one Pinocchio instruction:

- `record_battle_proof`

The instruction records only the compact public proof anchor:

- `round_id`
- `proof_hash`
- `winner_identity_key`
- `winning_side`
- `settled_at`
- `proof_version`
- `authority`

The full `BattleProofPayload` remains in the app database. The onchain account
stores a durable commitment to that payload and the public winner identity.

Do not move Event Pool, Agent Pool, agent runtime decisions, leaderboard
calculation, or settlement computation into the program.

### Product Layer Impact

This work primarily advances:

1. round / battle layer
2. resolution / settlement proof layer
3. leaderboard / profile / reputation trust layer

It makes the statement "agent identity is earned through public battles" more
credible without turning the contract into the source of all arena business
logic.

### Technical Layer Impact

This work primarily touches:

1. chain record / settlement layer
2. future backend-to-chain integration boundary
3. proof verification model

The app backend remains responsible for building the proof payload, computing
the payload hash, storing `BattleProofRecord`, and later storing the returned
transaction signature / proof PDA.

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/onchain/programs/arena/Cargo.toml`
- `/Users/irin/agent-duel/onchain/programs/arena/README.md`
- `/Users/irin/agent-duel/onchain/programs/arena/src/lib.rs`

### New Files

- `/Users/irin/agent-duel/onchain/programs/arena/src/errors/mod.rs`
- `/Users/irin/agent-duel/onchain/programs/arena/src/instructions/mod.rs`
- `/Users/irin/agent-duel/onchain/programs/arena/src/instructions/record_battle_proof/accounts.rs`
- `/Users/irin/agent-duel/onchain/programs/arena/src/instructions/record_battle_proof/data.rs`
- `/Users/irin/agent-duel/onchain/programs/arena/src/instructions/record_battle_proof/mod.rs`
- `/Users/irin/agent-duel/onchain/programs/arena/src/instructions/record_battle_proof/processor.rs`
- `/Users/irin/agent-duel/onchain/programs/arena/src/state/battle_proof_anchor.rs`
- `/Users/irin/agent-duel/onchain/programs/arena/src/state/mod.rs`
- `/Users/irin/agent-duel/onchain/programs/arena/src/utils/bytes.rs`
- `/Users/irin/agent-duel/onchain/programs/arena/src/utils/mod.rs`

### Implementation Order

1. Use Pinocchio program entrypoint routing.
2. Define the fixed-size battle proof anchor account layout.
3. Define the `record_battle_proof` instruction data format.
4. Validate signer, writable proof account, PDA seeds, proof version, timestamp,
   side enum, and compact identity bytes.
5. Create and write the proof anchor PDA.
6. Run a local compile check before adding heavier LiteSVM or Mollusk tests.

### Risks

- If the account stores full JSON, chain cost and schema migration risk grow
  quickly.
- If `winner_identity_key` is confused with `runtimeKey`, the onchain proof
  will anchor implementation details instead of public identity.
- If the program starts recomputing settlement, it will duplicate backend
  business logic and make the MVP harder to change.
- If proof hashing is not canonicalized in the backend integration, the chain
  anchor will be hard to verify later.

## Immediate Plan: Internal Agent Runtime Layer

### Goal

Make the real MVP round flow explicit:

**user selects event -> user selects internal arena agents -> round starts ->
agent runtime produces decisions -> actions are recorded**

The next implementation step is to expose an internal runtime layer before any
external agent upload or marketplace work.

### Minimum Viable Implementation

Keep runtime internal and curated for MVP.

Add a backend runtime layer that provides:

- a standard runtime decision input
- a standard runtime decision output
- a runtime registry keyed by `runtimeKey`
- a round-level runner that executes selected internal agents

For MVP, runtime adapters can remain rule-based and reuse the existing momentum
and contrarian demo strategies.

### Product Layer Impact

This work primarily advances:

1. agent pool layer
2. round / battle layer
3. decision output and resolution layer

It makes selected public agents feel like they actually enter a round and act,
instead of `createRound()` directly fabricating actions.

### Technical Layer Impact

This work primarily touches:

1. backend orchestration layer
2. agent runtime layer
3. round creation flow

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/src/lib/server/rounds/create-round.ts`

### New Files

- `/Users/irin/agent-duel/src/lib/server/agent-runtime/types.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/registry.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/run-round-agent-runtime.ts`

### Implementation Order

1. Define runtime input and output types around public agent identity.
2. Add a registry from `runtimeKey` to internal adapters.
3. Add a round-level runtime runner that produces one decision per selected
   agent.
4. Replace direct action generation in `createRound()` with the runtime runner.
5. Run lint and build.

### Risks

- If runtime stays embedded in `createRound()`, selected agents will not become
  a real technical layer.
- If external upload is added before internal runtime is clear, the product will
  inherit sandbox, security, and abuse complexity too early.
- If runtimeKey leaks into battle identity, battle history and reputation will
  stop representing public agent identity.

## Immediate Plan: Reputation Service Layer

### Goal

Separate reputation behavior from round settlement and battle proof assembly.

The next implementation step is to expose:

- a stable reputation snapshot type
- a battle reputation update service
- a reusable reputation effect builder
- cleaner settlement orchestration that treats reputation as its own product
  layer

### Minimum Viable Implementation

Keep the MVP database shape unchanged for now.

`AgentProfile` remains the current reputation state store, and
`BattleProofPayload.reputationEffects` remains the historical proof snapshot.

Add a dedicated backend layer that provides:

- `ReputationProfileSnapshot`
- `ReputationEffect`
- `applyBattleReputationUpdate()`
- `buildBattleReputationEffects()`

For MVP, do not introduce `AgentReputation` or `ReputationEvent` tables yet.
The point of this step is to isolate reputation rules before changing schema.

### Product Layer Impact

This work primarily advances:

1. leaderboard / profile / reputation layer
2. resolution / settlement layer
3. public proof layer

It makes reputation a first-class product layer instead of an implementation
detail hidden inside settlement.

### Technical Layer Impact

This work primarily touches:

1. backend orchestration layer
2. storage / indexing / stats layer
3. battle proof construction

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/src/lib/server/rounds/settle-round.ts`
- `/Users/irin/agent-duel/src/lib/server/battles/types.ts`
- `/Users/irin/agent-duel/src/lib/server/battles/build-battle-proof-payload.ts`

### New Files

- `/Users/irin/agent-duel/src/lib/server/reputation/types.ts`
- `/Users/irin/agent-duel/src/lib/server/reputation/apply-battle-reputation-update.ts`
- `/Users/irin/agent-duel/src/lib/server/reputation/build-reputation-effects.ts`

### Implementation Order

1. Define reputation snapshot and effect types.
2. Move battle reputation write-back out of `settle-round`.
3. Move reputation effect construction out of battle proof assembly.
4. Keep proof payload output stable.
5. Run lint and build.

### Risks

- If reputation rules stay embedded in settlement, future rating or season logic
  will be hard to evolve.
- If proof effect construction is duplicated across battle and arena layers,
  public reputation history can drift.
- If schema is split before service boundaries are clear, the migration can add
  complexity without product benefit.

## Immediate Plan: Arena Spectator Data Surface

### Goal

Move the frontend from API testing screens toward a spectator-ready arena data
surface.

The next implementation step is to expose:

- one arena home payload for the future main stage UI
- one battle feed payload for public battle history
- one `/api/arena` route that frontend experiments can consume directly
- one `/battles` page that makes repeated public battles browsable

### Minimum Viable Implementation

Build a backend aggregation layer on top of the existing read services:

- `getArenaHome()` composes current round, latest settled battle, leaderboard,
  featured agents, battle feed, and reputation movement
- `getBattleFeed()` maps battle records plus persisted proof snapshots into a
  frontend-friendly feed item
- `GET /api/arena` returns the arena home payload
- `/battles` renders recent battles as a public history feed and links into
  `/battles/[roundId]`

For MVP, keep this as a read aggregation layer.
Do not create a new database table for arena home or battle feed.

### Product Layer Impact

This work primarily advances:

1. round / battle layer
2. leaderboard / profile / reputation layer
3. public proof layer
4. frontend presentation layer readiness

It creates the data contract the future high-impact arena frontend should use.

### Technical Layer Impact

This work primarily touches:

1. backend orchestration layer
2. API layer for frontend composition
3. frontend presentation layer through a battle feed page

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/src/app/page.tsx`

### New Files

- `/Users/irin/agent-duel/src/lib/server/arena/get-arena-home.ts`
- `/Users/irin/agent-duel/src/lib/server/battles/get-battle-feed.ts`
- `/Users/irin/agent-duel/src/app/api/arena/route.ts`
- `/Users/irin/agent-duel/src/app/battles/page.tsx`

### Implementation Order

1. Build the battle feed service from `BattleRecord` plus persisted proof.
2. Build the arena home aggregation service.
3. Expose `/api/arena`.
4. Add `/battles` as the public battle history surface.
5. Add light navigation from the current home page into battle history.

### Risks

- If future frontend work consumes many raw APIs directly, arena UI logic will
  become hard to evolve.
- If battle feed does not include proof status and rank movement, the feed will
  read like generic match history instead of public agent identity history.
- If this layer starts mutating state, it will blur the boundary between
  spectator reads and battle orchestration.

## Immediate Plan: Battle Detail And Proof Surface

### Goal

Turn the completed battle backend into a public proof surface that users can
actually inspect, compare, and share.

The next implementation step is to expose:

- a battle detail page
- a proof panel for reputation change
- links from leaderboard, agent profile, and battle list surfaces into a single
  public battle page

### Minimum Viable Implementation

Build the smallest frontend surface on top of the existing battle backend:

- `getBattleRecord()` remains the source for the main battle detail view
- `getBattleProof()` remains the source for the proof snapshot view
- add a `/battles/[roundId]` page
- render participant decisions, balances, winner, and outcome
- render reputation effects from the persisted proof payload
- add navigation into this page from existing identity surfaces

For MVP, do not introduce a new materialized battle view model table.
Do not re-derive proof state in the frontend.
The page should consume the current backend shape directly.

### Product Layer Impact

This work primarily advances:

1. round / battle layer
2. leaderboard / profile / reputation layer
3. public proof layer

It is the shortest path from "battle data exists in APIs" to "users can see why
an agent's identity rose or fell."

### Technical Layer Impact

This work primarily touches:

1. frontend presentation layer
2. backend read-service reuse
3. API-connected page composition

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/src/app/leaderboard/page.tsx`
- `/Users/irin/agent-duel/src/app/agents/[agentId]/page.tsx`
- `/Users/irin/agent-duel/src/app/agents/page.tsx`

### New Files

- `/Users/irin/agent-duel/src/app/battles/[roundId]/page.tsx`

### Implementation Order

1. Create the battle detail page from the existing battle record service.
2. Add a proof section sourced from persisted battle proof payload.
3. Add navigation from leaderboard and agent surfaces into battle detail.
4. Polish the page so rank movement, streak movement, and winner identity read
   clearly at a glance.

### Risks

- If the page starts recomputing proof state from raw round data, the battle
  detail surface can drift from the persisted proof snapshot.
- If battle detail only shows outcome and not reputation effects, the product
  will under-deliver on the "identity is earned publicly" thesis.
- If navigation into battle pages is weak, the new surface will exist without
  becoming part of the arena loop.

## Immediate Plan: Battle History And Battle Record Layer

### Goal

Extract battle history from the agent profile service into a dedicated backend
layer.

The next implementation step is to expose:

- a stable battle record shape
- a battle history listing service
- a single battle record service
- battle APIs that frontend surfaces can consume directly

### Minimum Viable Implementation

Build a `battles` backend layer on top of existing `Round`, `RoundEvent`,
`RoundAgent`, `Action`, and `Settlement` data.

This layer should provide:

- a `BattleRecord` type
- `getBattleHistory()` for list views
- `getBattleRecord()` for one battle
- `GET /api/battles`
- `GET /api/battles/:roundId`

For MVP, battle records remain derived from the existing round tables instead of
being materialized into a separate database table.

### Product Layer Impact

This work primarily advances:

1. round / battle layer
2. leaderboard / profile / reputation layer
3. public proof layer

It is the shortest path from "agent profile has recent battles" to "the product
has a reusable public battle record surface."

### Technical Layer Impact

This work primarily touches:

1. backend orchestration layer
2. storage / indexing / stats layer
3. API layer for frontend consumption

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/src/lib/server/agents/get-agent-profile.ts`

### New Files

- `/Users/irin/agent-duel/src/lib/server/battles/types.ts`
- `/Users/irin/agent-duel/src/lib/server/battles/get-battle-history.ts`
- `/Users/irin/agent-duel/src/lib/server/battles/get-battle-record.ts`
- `/Users/irin/agent-duel/src/app/api/battles/route.ts`
- `/Users/irin/agent-duel/src/app/api/battles/[roundId]/route.ts`

### Implementation Order

1. Define the canonical battle record shape.
2. Build list and single-record services.
3. Expose battle APIs.
4. Reuse the new battle layer from agent profile history.

## Immediate Plan: Agent Profile And Match History

### Goal

Turn each public arena agent from a leaderboard row into a real public profile.

The next implementation step is to expose:

- one agent profile surface
- one recent battle history surface
- one API shape that explains why this agent currently deserves trust

### Minimum Viable Implementation

Build the smallest profile layer on top of the existing `AgentProfile`,
`Round`, `RoundAgent`, `Action`, and `Settlement` records.

This layer should provide:

- a backend service that returns one agent plus recent battle history
- a `GET /api/agents/:id` route that returns the full profile payload
- a `/agents/[agentId]` page
- links into the profile from the Agent Pool and Leaderboard pages

For MVP, battle history can remain derived from existing round records instead
of introducing a new summary table.

### Product Layer Impact

This work primarily advances:

1. leaderboard / profile / reputation layer
2. round / battle layer
3. resolution / settlement layer

It is the shortest path from "this agent is ranked here" to "here is the public
record that explains why."

### Technical Layer Impact

This work primarily touches:

1. backend orchestration layer
2. storage / indexing / stats layer
3. frontend presentation layer

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/src/app/api/agents/[agentId]/route.ts`
- `/Users/irin/agent-duel/src/app/agents/page.tsx`
- `/Users/irin/agent-duel/src/app/leaderboard/page.tsx`

### New Files

- `/Users/irin/agent-duel/src/lib/server/agents/get-agent-profile.ts`
- `/Users/irin/agent-duel/src/app/agents/[agentId]/page.tsx`

### Implementation Order

1. Build a profile query service from existing battle records.
2. Upgrade the per-agent API route.
3. Add the profile page.
4. Add navigation from Agent Pool and Leaderboard.

## Immediate Plan: Leaderboard MVP Closure

### Goal

Close the smallest possible identity loop after `event-proof` and
`agent-proof`.

The next implementation step is not a larger UI push.
It is making round settlement update public agent status for real.

That means:

- settlement updates wins and losses
- settlement updates streak state
- settlement recalculates rank
- the leaderboard becomes a first-class backend surface

### Minimum Viable Implementation

Build the leaderboard layer before wiring it into `settle-round`.

This layer should provide:

- a single rank rule for active public agents
- a rank recomputation function that can be called after settlement
- a leaderboard read service that returns leaderboard-facing agent data
- a `GET /api/leaderboard` route for UI consumption

For the MVP, rank can remain derived from current profile stats instead of
introducing a more complex rating system.

### Product Layer Impact

This work primarily advances:

1. leaderboard / profile / reputation layer
2. resolution / settlement layer
3. agent pool layer

It is the shortest path from "a duel resolved" to "an agent's identity changed
publicly."

### Technical Layer Impact

This work primarily touches:

1. backend orchestration layer
2. storage / indexing / stats layer
3. frontend presentation layer through a new API surface

### Rank Rule For MVP

Keep the first ranking rule simple and legible.

Sort active agents by:

1. total wins descending
2. current streak descending
3. best streak descending
4. total losses ascending
5. createdAt ascending
6. name ascending

Then rewrite `currentRank` from the sorted order.

This is intentionally simpler than Elo.
The product needs visible public status change first.

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/src/lib/server/rounds/settle-round.ts`
- `/Users/irin/agent-duel/src/app/api/leaderboard/route.ts`

### New Files

- `/Users/irin/agent-duel/src/lib/server/leaderboard/get-leaderboard.ts`
- `/Users/irin/agent-duel/src/lib/server/leaderboard/recompute-ranks.ts`
- `/Users/irin/agent-duel/src/lib/server/leaderboard/types.ts`

### Implementation Order

1. Write the leaderboard service layer.
2. Expose the leaderboard API.
3. Wire rank recomputation into `settle-round`.
4. Surface rank and streak change in the round and leaderboard UI.

### Risks

- If rank logic is embedded directly in `settle-round`, leaderboard behavior
  will become harder to evolve.
- If the API surface is skipped, the frontend will keep reading ad hoc agent
  shapes instead of a leaderboard shape.
- If movement is prioritized before real rank write-back exists, the UI will
  overpromise identity change.

## MVP Plan: Public Agent Identity Arena

### Problem

The current repo has the beginning of a round lifecycle, but the product thesis
has now sharpened considerably.

AgentDuel is not mainly a duel settlement demo.
It is a product where agents earn public identity and reputation through
repeated battles.

Right now, the codebase still leans too much toward a "single duel flow" frame.
That is useful, but it is not enough to prove the new core truth:

**agents can publicly battle, and their performance can become durable public identity.**

The MVP therefore needs to expand from a single round demo into a compact arena
system with:

- an internal Event Pool
- an internal Agent Pool
- round creation from those pools
- visible agent decisions
- round resolution
- leaderboard movement
- agent profile and match history

### Core Truth To Prove

The MVP succeeds if one resolved battle makes the winning agent feel more real.

That means the resolved battle must visibly change:

- ranking
- streak
- status
- public record
- profile history

The emotional center is not "a trade happened."
The emotional center is:

**a battle ended, and an agent's public identity rose.**

### Product Scope

The MVP should include:

- a small internal Event Pool
- a small internal Agent Pool
- round creation
- visible agent decision outputs
- clear round resolution
- leaderboard
- persistent match history
- profile surface for each agent

The MVP should not include:

- broad market support
- deep external market integrations as the headline
- generalized autonomous trading infrastructure
- large open ecosystems of user-created agents
- too much tokenomics
- too much marketplace complexity

### Constraints

- Keep the playable experience to a small number of curated rounds.
- Keep the initial Agent Pool small and intentionally designed.
- Optimize for spectator clarity and public identity, not feature breadth.
- Maintain the distinction between model provider and public arena agent.
- Preserve room for onchain public record later, but do not block the MVP on
  full onchain settlement.
- Use deterministic or curated local data where needed to keep the MVP moving.
- Prefer visible end-to-end proof over abstract infrastructure.

### Product Architecture

The MVP should be built in these product layers:

1. event source layer
2. event pool layer
3. agent pool layer
4. round / battle layer
5. resolution / settlement layer
6. leaderboard / profile / reputation layer

Each implementation decision should clearly map back to one of these layers.

### Technical Architecture

The MVP should be built in these technical layers:

1. frontend presentation layer
2. backend orchestration layer
3. agent runtime layer
4. chain record / settlement layer
5. storage / indexing / stats layer

### MVP User Flow

1. User opens the arena homepage.
2. User sees the Event Pool, top agents, and live or recent rounds.
3. User enters or starts a battle round built from the Event Pool and Agent Pool.
4. Two public agents produce visible decisions.
5. The round resolves.
6. The winning agent moves on the leaderboard.
7. The winner's profile, streak, and match history update.
8. Users can inspect why that agent now deserves more trust or attention.

### System Goals

The MVP needs to make five systems real:

#### 1. Event Pool

The product should not expose a raw external market universe.
It should expose a curated internal Event Pool.

The Event Pool should include:

- clear title / question
- source metadata
- timing metadata
- status
- optional category
- spectator-friendly structure

#### 2. Agent Pool

Agents should be public competitors, not hidden runtime names.

Each agent record should include:

- id
- name
- avatar or visual token
- style
- risk profile
- current rank
- current streak
- badge state
- summary stats
- runtime adapter or strategy key

#### 3. Round / Battle

Each round should represent:

- one curated event
- two selected agents
- visible decisions
- timestamps
- resolution state
- winner outcome

#### 4. Leaderboard / Reputation

The leaderboard must be treated as a primary product surface, not an afterthought.

It should make visible:

- rank
- movement
- wins / losses
- streaks
- badges or prestige markers
- credibility growth over time

#### 5. Agent Profile / Match History

Each public agent should have a profile surface showing:

- identity
- style
- rank
- streak
- cumulative history
- recent battles
- credibility evidence

### Current Codebase Implication

The existing round lifecycle work is still useful, but it now belongs inside a
broader arena architecture.

Current code should evolve as follows:

- existing round services become the battle layer foundation
- current demo market logic should become part of the Event Pool pipeline
- agent strategy functions should remain runtime logic, but the public Agent
  Pool should become a separate identity layer
- the homepage should become an arena / leaderboard / live rounds surface, not
  a generic launch page

### Proposed Data Model Direction

The current schema already includes `Round`, `RoundEvent`, `RoundAgent`,
`Action`, and `Settlement`, but the MVP now needs to expand toward explicit pool
and reputation systems.

Target models or equivalent structures:

#### `EventPoolItem`

- id
- title / question
- source
- category
- startTime
- endTime
- status
- currentPrice or reference signal
- resolutionSource
- outcome

#### `AgentProfile`

- id
- name
- avatar
- style
- riskProfile
- runtimeKey
- badge
- currentRank
- totalWins
- totalLosses
- currentStreak
- bestStreak
- createdAt
- updatedAt

#### `Round`

- id
- status
- eventPoolItemId
- startsAt
- endsAt
- createdAt
- updatedAt

#### `RoundAgent`

- id
- roundId
- agentProfileId
- snapshotName
- snapshotStyle
- snapshotRank
- startingBalance
- finalBalance

#### `Action`

- id
- roundId
- roundAgentId
- side
- sizeUsd
- reason
- createdAt

#### `Settlement`

- id
- roundId
- outcome
- winnerRoundAgentId
- winnerAgentProfileId
- pnlUsd
- settledAt

#### `LeaderboardSnapshot` or derived stats table

This may remain derived in MVP if needed, but the product must expose:

- current rank
- previous rank
- movement
- streak
- prestige markers

#### `AgentMatchHistory`

This can be derived from rounds in MVP, but the product must support profile
pages that clearly show battle history.

### API Plan

The current round APIs should stay, but the product now needs additional
identity-focused endpoints or server loaders.

#### Existing Battle APIs

- `GET /api/round`
  - returns the latest round state
- `POST /api/round`
  - creates a new round from the Event Pool and Agent Pool
- `POST /api/settle`
  - resolves a round and persists winner data

#### New Arena APIs Or Data Surfaces

- `GET /api/events`
  - returns the curated Event Pool
- `GET /api/agents`
  - returns the Agent Pool and leaderboard-facing summary
- `GET /api/leaderboard`
  - returns ranked agents with movement and streak data
- `GET /api/agents/:id`
  - returns one agent profile plus match history

If route segments are not ideal right away, equivalent server-side data loaders
are acceptable for the MVP.

### Frontend Plan

The frontend should shift from a simple duel shell into a compact arena product.

#### Required Surfaces

1. Arena homepage
   - top agents
   - event pool
   - current or latest battle
   - leaderboard movement

2. Round page
   - current battle
   - agent decision outputs
   - result
   - visible winner state

3. Leaderboard section
   - rank
   - movement
   - streak
   - badges

4. Agent profile page
   - identity
   - history
   - recent matches
   - credibility surface

#### Motion Priorities

Motion should prioritize:

- battle resolution
- leaderboard climb
- streak activation
- badge unlock
- prestige reveal

The product should feel like a live arena, not a trading terminal.

### Backend Orchestration Plan

The backend should orchestrate:

- selection of a curated event from the Event Pool
- selection of participating agents from the Agent Pool
- round creation
- agent decision collection
- round resolution
- reputation and leaderboard updates

Keep this orchestration explicit and readable.
Avoid premature job systems or generic platform abstractions unless they
materially help the MVP.

### Agent Runtime Plan

The runtime should preserve the distinction between public agent and backend
brain.

In MVP:

- keep the existing strategy-backed agents
- formalize them as public Agent Pool entries
- maintain a standard decision interface

Later:

- add adapters for GPT / Claude / hybrid systems

The arena should always execute against a standardized agent interface.

### Onchain Plan

For MVP:

- keep real onchain settlement minimal
- preserve the conceptual role of onchain public record
- do not let full chain implementation block the arena, leaderboard, and
  profile experience

The immediate conceptual job of chain integration is:

- make battle history durable
- make performance harder to rewrite
- prepare identity / reputation objects to become public truth

### Affected Files

#### Existing files likely to change

- `/Users/irin/agent-duel/AGENTS.md`
- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/prisma/schema.prisma`
- `/Users/irin/agent-duel/prisma/seed.ts`
- `/Users/irin/agent-duel/src/app/page.tsx`
- `/Users/irin/agent-duel/src/app/round/page.tsx`
- `/Users/irin/agent-duel/src/app/api/round/route.ts`
- `/Users/irin/agent-duel/src/app/api/settle/route.ts`
- `/Users/irin/agent-duel/src/app/api/timeline/route.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/create-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/get-latest-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/map-round-state.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/settle-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/demo-market.ts`
- `/Users/irin/agent-duel/src/lib/types/agent.ts`
- `/Users/irin/agent-duel/src/lib/types/round.ts`

#### New files likely needed

- `/Users/irin/agent-duel/src/lib/server/events/get-event-pool.ts`
- `/Users/irin/agent-duel/src/lib/server/events/create-event-pool.ts`
- `/Users/irin/agent-duel/src/lib/server/agents/get-agent-pool.ts`
- `/Users/irin/agent-duel/src/lib/server/agents/get-agent-profile.ts`
- `/Users/irin/agent-duel/src/lib/server/leaderboard/get-leaderboard.ts`
- `/Users/irin/agent-duel/src/app/agents/[id]/page.tsx`
- `/Users/irin/agent-duel/src/app/leaderboard/page.tsx`
- `/Users/irin/agent-duel/src/app/api/events/route.ts`
- `/Users/irin/agent-duel/src/app/api/agents/route.ts`
- `/Users/irin/agent-duel/src/app/api/leaderboard/route.ts`

### Implementation Order

#### Phase 1: Reframe The Current MVP Around Identity

1. Formalize the internal Agent Pool.
2. Formalize the internal Event Pool.
3. Update round creation to source from both pools.
4. Make the homepage an arena / leaderboard entry point.
5. Add a minimum leaderboard view.
6. Add a minimum agent profile view.

#### Phase 2: Make Battle Outcomes Change Public Status

1. Update settlement to write leaderboard-affecting stats.
2. Persist wins, losses, streaks, and rank movement.
3. Surface recent match history on profiles.
4. Add visual rank movement after settlement.

#### Phase 3: Make Public Record Credible

1. Prepare chain-facing battle record structures.
2. Persist durable public result snapshots.
3. Connect onchain record updates to battle outcomes.

### Risks And Edge Cases

- The codebase may overfit to the current single-round flow and underbuild the
  Event Pool / Agent Pool identity systems.
- It is easy to keep building a duel screen while neglecting leaderboard and
  profile surfaces, which are now product-critical.
- If agent identity data is mixed directly into runtime-only structures, public
  identity will stay too thin.
- If the leaderboard is added as a late afterthought, the emotional payoff of
  the product will remain weak.
- If external event sources dominate the UX, the product will feel like a market
  wrapper instead of an arena.
- If onchain is treated only as payments, the strongest conceptual reason for
  the product will be lost.

### Definition Of Done For MVP

The MVP is complete when:

- the app exposes a small internal Event Pool
- the app exposes a small internal Agent Pool
- a battle can be created from those pools
- agents produce visible decisions
- a battle can resolve clearly
- the winning agent visibly changes position or reputation state
- leaderboard ranking is visible
- each agent has a public profile surface
- match history is inspectable
- the product feels like an arena where agents become real through battle

### Immediate Next Step

Do not keep optimizing the product around a bare duel flow alone.

The next implementation push should focus on:

1. internal Event Pool
2. internal Agent Pool
3. leaderboard surface
4. agent profile surface

Those systems are now the shortest path to proving the real product thesis.

## Two-Day Execution Table

The next two days should be treated as a focused MVP realignment sprint.
The goal is not to broaden the system.
The goal is to make the product visibly read as an arena where agents earn
identity.

| Day | Priority | What To Build | Why It Matters |
| --- | --- | --- | --- |
| Day 1 | 1 | Reorganize chain code into `onchain/` and keep it isolated from app code | Makes the repo easier to reason about and keeps chain work clearly separated |
| Day 1 | 2 | Introduce a small internal Event Pool service and seed data | Moves the product away from "one hardcoded duel" and toward a real arena input layer |
| Day 1 | 3 | Introduce a small internal Agent Pool service and seed data | Makes agents public competitors instead of hidden runtime-only strategies |
| Day 1 | 4 | Refactor round creation to source from Event Pool + Agent Pool | Connects the new product truth to the existing battle backend |
| Day 1 | 5 | Update homepage to show arena framing: live round, event pool preview, top agents preview | Starts shifting the product from duel launcher to public arena |
| Day 2 | 1 | Build a minimum leaderboard service and leaderboard API/data surface | Leaderboard movement is the emotional center of the product |
| Day 2 | 2 | Add leaderboard UI with rank, movement, streak, and top-agent presentation | Makes battle outcomes visibly change public status |
| Day 2 | 3 | Build a minimum agent profile service with recent match history | Lets users inspect identity, reputation, and trust over time |
| Day 2 | 4 | Add an agent profile page with summary stats and battle history | Makes agents feel like persistent public characters |
| Day 2 | 5 | Connect settlement to reputation updates: wins, losses, streaks, rank recalculation | Turns battle results into public identity instead of isolated outcomes |

### Day 1 Deliverable

By the end of Day 1, the repo should clearly support:

- an internal Event Pool
- an internal Agent Pool
- round creation from those pools
- a homepage that feels more like an arena than a launcher

### Day 2 Deliverable

By the end of Day 2, the product should clearly support:

- visible leaderboard movement
- public agent profile surfaces
- match history
- battle outcomes that visibly change agent status

### Rule For The Next Two Days

Whenever there is a choice between:

- making a battle look more like a generic market interaction
- making an agent feel more real as a public competitor

choose the second option.

## Battle Runtime Trace Layer

### Problem

Agent runtime currently persists a final action only: side, size, reason, and
execution snapshot. That proves the outcome of a decision, but it does not make
the battle feel like a public arena process. Viewers should see how an agent
entered the round, applied its public style, executed through its current brain,
and committed a decision.

### Constraints

- Trace must support public proof of agent ability, not private model
  chain-of-thought.
- Trace should stay attached to `Action`, because an action is the public
  decision artifact for a `RoundAgent`.
- Existing runtime snapshots on `Action` remain the summary layer.
- Rules, mock, OpenAI, and Anthropic backed agents must share one trace shape.
- Keep `identityKey`, `runtimeKey`, and model/provider fields distinct.

### Product Layer Impact

- Agent Pool: public identities gain a more legible battle process.
- Round / Battle Layer: each action becomes a short sequence of public steps.
- Resolution / Reputation Layer: future proof payloads can summarize process,
  while reputation still changes only from resolved results.
- Leaderboard / Profile Layer: later surfaces can show trace excerpts as
  evidence of earned identity.

### Technical Architecture

- Add an `ActionTraceStep` table related to `Action`, `Round`, and
  `RoundAgent`.
- Extend runtime decision types with `trace`.
- Normalize missing adapter traces in `runRoundAgentRuntime` so old/simple
  adapters still produce visible process.
- Persist trace steps through nested `action.create`.
- Include trace steps in round and battle query shapes.
- Map trace steps into `RoundAction` and `BattleParticipantRecord`.
- Render compact trace chips in the live action timeline and battle detail
  page.

### Affected Files

- `/Users/irin/agent-duel/prisma/schema.prisma`
- `/Users/irin/agent-duel/prisma/init.sql`
- `/Users/irin/agent-duel/src/lib/runtime/agents/types.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm/llm-decide.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/momentum.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/contrarian.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/types.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/run-round-agent-runtime.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/create-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/get-latest-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/map-round-state.ts`
- `/Users/irin/agent-duel/src/lib/server/battles/types.ts`
- `/Users/irin/agent-duel/src/lib/server/battles/get-battle-history.ts`
- `/Users/irin/agent-duel/src/lib/server/battles/get-battle-record.ts`
- `/Users/irin/agent-duel/src/lib/types/action.ts`
- `/Users/irin/agent-duel/src/components/round/BattleActionTimeline.tsx`
- `/Users/irin/agent-duel/src/app/battles/[roundId]/page.tsx`

### Implementation Order

1. Add schema and SQL support for action trace steps.
2. Add shared runtime trace types.
3. Make rules and LLM runtimes emit public process steps.
4. Persist trace steps when creating actions.
5. Include and map trace steps in round and battle services.
6. Surface trace steps in live round and battle detail UI.
7. Run Prisma generate, lint, and build if available.

### Risks / Edge Cases

- Trace can become too verbose or imply hidden reasoning. Keep it concise and
  public-facing.
- Existing database files may not have the new table until schema push/init is
  run.
- Historical actions will have no trace; mappers and UI must handle empty
  arrays.

## Event Pool Rotation Polish

### Problem

The landing Event Pool looked too small for the arena thesis because it exposed
only three fixed mock events. The hackathon demo needs the product to feel like
it is curating from a broader external event universe while still keeping the
first screen focused on three readable battle objectives.

### Constraints

- Do not redesign the landing UI.
- Keep Event Pool as the arena input layer, not the product center.
- Keep the main stage limited to three visible events so the demo remains easy
  to scan.
- Avoid live external dependencies for the submission path.

### Product Layer Impact

- Event Pool: the landing surface now shows that the pool can contain more than
  one fixed trio.
- Round / Battle Layer: selected events still feed the existing round creation
  flow unchanged.

### Technical Architecture

- Expand the landing mock Event Pool data.
- Add lightweight category metadata for crypto, finance, sports, DeFi, macro,
  and social events.
- Keep page-level state for the visible event window.
- Add compact refresh, category, and full-list controls to the Event Pool
  header.
- Let the full list select any event without changing the battle creation API.

### Affected Files

- `/Users/irin/agent-duel/src/lib/mocks/landing-demo-data.ts`
- `/Users/irin/agent-duel/src/app/page.tsx`
- `/Users/irin/agent-duel/src/components/landing/EventSelectionSection.tsx`
- `/Users/irin/agent-duel/src/components/landing/EventCard.tsx`

### Implementation Order

1. Add more curated mock events.
2. Add category metadata and a small filter row.
3. Add a page-level three-event rotation window.
4. Add refresh and total event list controls to the Event Pool header.
5. Run lint/build and visually check the landing page.

### Risks / Edge Cases

- The full list should not make the page feel like a generic market dashboard.
- Refresh should keep the selected battle event obvious.
- Long event titles need to stay legible inside ticket cards and list rows.

## Live Unresolved Round And Fact-Based Settlement

### Problem

The current arena loop proves identity movement, but it still feels too staged.
Agents currently produce one decision at round creation time, then the round
waits for a deterministic demo resolver. That means viewers do not get to watch
a real battle unfold around an unresolved event, and settlement does not yet
feel anchored to external fact.

The next local milestone is not "more pages."
It is a more credible arena loop:

- choose an unresolved event
- let agents keep acting while the event is still live
- show the battle process as curves and action markers
- settle from a real fact source instead of `resolveDemoMarket()`

This is the shortest path from "cool demo" to "this feels like a real arena."

### Constraints

- Keep AgentDuel centered on public agent identity, not on becoming a trading
  terminal.
- Start with one narrow event class that is easy to settle objectively.
- Preserve the current leaderboard, profile, reputation, and proof layers.
- Avoid introducing a fully generic scheduler or exchange simulator in v1.5.
- Prefer a local-dev-friendly flow that can be run and verified end to end.
- Keep Event Pool as the input layer; do not let external feeds become the
  headline experience.

### Product Layer Impact

- Event Pool Layer: events must now support a truly unresolved playable state,
  not just demo-stage selection.
- Round / Battle Layer: a round becomes an ongoing public contest instead of a
  one-shot decision snapshot.
- Resolution / Settlement Layer: winner selection must come from external fact,
  not deterministic demo output.
- Leaderboard / Profile / Reputation Layer: public status change becomes more
  credible because it follows a visible live battle.

### Technical Architecture

- Introduce a first-class "live unresolved round" path for a narrow event type,
  starting with short-horizon price-threshold events such as:
  `Will SOL be above the start price in 10 minutes?`
- Replace direct `resolveDemoMarket()` usage in settlement with a resolver
  interface:
  - input: round + event metadata
  - output: outcome, end price, settlement source, settledAt
- Implement one real resolver adapter backed by an external price source.
- Add a round tick/update path so agents can emit multiple public actions during
  a live round instead of exactly one action at creation.
- Persist battle process data needed for visualization:
  - price snapshots over time
  - repeated agent actions
  - optional derived exposure / unrealized PnL snapshots if needed
- Extend battle queries and mappers so unresolved rounds can return both the
  current battle state and the process history needed to render curves.
- Update the round and battle UI to render:
  - current unresolved status
  - price line
  - agent action markers
  - at least one agent-vs-agent process curve
- Keep settlement transaction ownership in the backend, so the final round,
  reputation update, and proof payload remain consistent.

### Minimum Viable Implementation

The minimum version for this push is intentionally narrow.

It should support:

- one supported event family: short-duration price events
- one live round at a time in local development
- two agents updating their decisions on a fixed interval
- persisted process history, so refresh does not erase the battle
- manual or time-triggered settlement using a real fact resolver
- post-settlement leaderboard / profile / proof updates using the existing
  identity pipeline

It should explicitly not require:

- a full generic market engine
- many event categories
- autonomous execution on real venues
- a broad scheduling framework
- polished multi-round concurrency

### Affected Files

- `/Users/irin/agent-duel/PLANS.md`
- `/Users/irin/agent-duel/prisma/schema.prisma`
- `/Users/irin/agent-duel/prisma/init.sql`
- `/Users/irin/agent-duel/src/lib/server/events/types.ts`
- `/Users/irin/agent-duel/src/lib/server/events/select-round-event.ts`
- `/Users/irin/agent-duel/src/lib/server/events/get-event-pool.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/create-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/get-latest-round.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/map-round-state.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/settle-round.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/types.ts`
- `/Users/irin/agent-duel/src/lib/server/agent-runtime/run-round-agent-runtime.ts`
- `/Users/irin/agent-duel/src/lib/server/battles/get-battle-record.ts`
- `/Users/irin/agent-duel/src/lib/server/battles/get-battle-history.ts`
- `/Users/irin/agent-duel/src/lib/server/battles/types.ts`
- `/Users/irin/agent-duel/src/app/api/round/route.ts`
- `/Users/irin/agent-duel/src/app/api/settle/route.ts`
- `/Users/irin/agent-duel/src/app/round/page.tsx`
- `/Users/irin/agent-duel/src/app/battles/[roundId]/page.tsx`
- `/Users/irin/agent-duel/src/components/round/BattleActionTimeline.tsx`
- `/Users/irin/agent-duel/src/components/round/EventDuelStage.tsx`
- `/Users/irin/agent-duel/src/components/round/SettlementPanel.tsx`

### Likely New Files

- `/Users/irin/agent-duel/src/lib/server/market-data/get-live-price.ts`
- `/Users/irin/agent-duel/src/lib/server/market-data/types.ts`
- `/Users/irin/agent-duel/src/lib/server/settlement/resolve-round-outcome.ts`
- `/Users/irin/agent-duel/src/lib/server/settlement/resolvers/price-threshold.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/tick-live-round.ts`
- `/Users/irin/agent-duel/src/app/api/round/tick/route.ts`

### Implementation Order

1. Lock the first supported live event type to short-horizon price events.
2. Add a real settlement resolver interface and wire `settle-round.ts` to it.
3. Implement one external price adapter for local fact-based settlement.
4. Add persistence for battle process history required by live charts.
5. Add a round tick path that can run agent decision updates repeatedly during a
   live unresolved round.
6. Extend round and battle query layers to expose current process history.
7. Render one unresolved live battle UI with curves and action markers.
8. Run the full local flow:
   - seed/select event
   - create live round
   - tick agents several times
   - inspect curves
   - settle from real fact source
   - verify leaderboard / profile / proof updates

### Local Acceptance Checklist

The local flow is complete when we can demonstrate all of the following:

- a round can be created from an unresolved playable event
- the round remains visibly live before settlement
- two agents emit more than one action during the round lifecycle
- those actions are persisted and survive refresh
- the UI shows battle process, not only final settlement
- the UI shows at least one real changing curve tied to stored round history
- settlement no longer depends on `resolveDemoMarket()`
- the final outcome is sourced from an external fact adapter
- post-settlement leaderboard and profile movement still work
- battle proof generation still reflects the final settled state

### Risks / Edge Cases

- If we make the live battle UI look too much like a pro trading terminal, the
  product can drift away from its arena identity.
- If the first resolver supports too many event classes, settlement logic will
  sprawl before the core loop is stable.
- If process history is only computed in the client, refresh and battle detail
  pages will feel fake.
- If tick cadence is too aggressive, local development will become noisy and
  brittle.
- If repeated actions overwrite previous ones instead of appending, the public
  battle history will lose credibility.
- If live rounds and settlement read different price sources or timestamps, the
  battle can feel inconsistent at the finish line.
