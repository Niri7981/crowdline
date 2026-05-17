# Current Execution Plan

## Goal

Turn AgentDuel into a trustworthy identity arena where fixed public agents
compete on short-horizon prediction-market rounds, and each result becomes
usable proof of ability.

## Current Position

Completed:

- hot Polymarket events can seed the internal Event Pool
- `polymarket-price` rounds can read `MarketTick`
- settlement can resolve from indexed Polymarket market price
- LLM-backed agents can return real decisions again through the private
  `AGENTDUEL_OPENAI_*` config path
- `/round` already shows the live battle more clearly than the earlier demo

Still missing:

- selected markets are not yet auto-observed by the indexer
- trusted battle semantics are too soft when LLM execution degrades
- agent context is still thin
- evaluation is not yet formalized
- identity / reputation surfaces still need to dominate the product feeling

## Agent Information Model

Current state:

- automatic external observation is handled by the indexer layer
- agents do not yet proactively search websites or plan multi-step research
- tick consumes indexed observations from the database, then passes compact
  context into agent runtime

Meaning:

- `indexer` is the current external-world observer
- `agent` is currently a bounded decision-maker, not a full autonomous
  research agent

Future expansion path:

1. richer system-provided context
2. controlled tool use for structured search / event updates
3. later, more autonomous research behavior

Priority rule:

- do not jump to open-ended agent web research before the lower layers are
  stable
- first stabilize market observation, trust semantics, and evaluation
- then expand agent information-gathering ability on top of a credible arena

## Phase Table

### Phase 1: Automatic Market Observation

Outcome:

- picking a market automatically makes it a watched market
- live rounds no longer depend on manual slug handoff

Tasks:

1. Make `market-indexer.mjs` discover live `polymarket-price` rounds.
2. Build a runtime watchlist from `externalMarketId` / slug.
3. Keep writing fresh `MarketTick` rows for watched markets.
4. Make tick / settle fail clearly when indexed market data is stale.
5. Smoke test the loop locally from round creation through settlement.

Primary files:

- `/Users/irin/agent-duel/scripts/market-indexer.mjs`
- `/Users/irin/agent-duel/src/lib/server/market-data/indexed-facts.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/tick-live-round.ts`
- `/Users/irin/agent-duel/src/lib/server/settlement/resolvers/price-threshold.ts`

### Phase 2: Trusted Battle Boundary

Outcome:

- real battles are distinguishable from degraded runtime execution

Tasks:

1. Add explicit trust state for round actions and/or rounds.
2. Mark `failed-fallback` as degraded proof, not normal proof.
3. Decide settlement / reputation behavior for degraded rounds.
4. Surface trust state in API and UI.

Primary files:

- `/Users/irin/agent-duel/src/lib/server/agent-runtime/run-round-agent-runtime.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm/llm-decide.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/map-round-state.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/settle-round.ts`

### Phase 3: Stronger Agent Observation Context

Outcome:

- agents stop feeling like single-shot prompt calls and start feeling like
  situated competitors

Tasks:

1. Feed recent `MarketTick` windows into agent runtime context.
2. Add momentum / volatility / reversal summaries.
3. Add time-remaining and cadence awareness.
4. Keep the prompt compact and structured.

Primary files:

- `/Users/irin/agent-duel/src/lib/server/market-data/indexed-facts.ts`
- `/Users/irin/agent-duel/src/lib/server/rounds/tick-live-round.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm/llm-decide.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm-news.ts`
- `/Users/irin/agent-duel/src/lib/runtime/agents/llm-quant.ts`

### Phase 4: Evaluation Harness v1

Outcome:

- we can judge agent changes with replayable evidence instead of gut feel

Tasks:

1. Replay historical `MarketTick` windows.
2. Re-run agent decisions on fixed slices.
3. Settle against future market movement.
4. Report win rate, pnl proxy, drawdown, flip rate, conviction profile.

Primary files:

- `/Users/irin/agent-duel/scripts/`
- `/Users/irin/agent-duel/src/lib/server/market-data/`
- `/Users/irin/agent-duel/src/lib/runtime/agents/`

### Phase 5: Identity / Reputation Surfaces

Outcome:

- users remember the agent, not just the chart

Tasks:

1. Strengthen settlement payoff and leaderboard movement.
2. Expand profile/history/trust surfaces.
3. Make battle pages explain public identity change clearly.
4. Keep charts as supporting evidence.

Primary files:

- `/Users/irin/agent-duel/src/app/round/page.tsx`
- `/Users/irin/agent-duel/src/components/round/SettlementPanel.tsx`
- `/Users/irin/agent-duel/src/lib/server/reputation/`
- `/Users/irin/agent-duel/src/lib/server/battles/`

### Phase 6: Learning Loop Prep

Outcome:

- the repo is ready for later RL or offline policy tuning, without rushing it

Tasks:

1. Capture evaluation-friendly datasets.
2. Define reward signals aligned with public battle performance.
3. Keep training loops separate from live identity logic.

## Immediate Recommendation

The next build step should be **Phase 1: Automatic Market Observation**.

Reason:

- it stabilizes the environment
- it removes the most obvious manual demo behavior
- it makes tick / settle / agent context all more credible

## Execution Bias

For the immediate next stretch, prefer lower-level infrastructure work over
agent-spectacle work:

1. automatic market observation
2. trusted battle boundary
3. stronger structured context
4. evaluation harness
5. only then broader agent tool use / research behavior
