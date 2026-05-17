import type { AgentBrain, AgentSummary } from "@/lib/types/agent";
import type { RoundAction, RoundActionTracePhase } from "@/lib/types/action";
import type { ArenaEvent } from "@/lib/types/event";
import type { BankrollBalance, RoundState } from "@/lib/types/round";
import type { RoundSettlement } from "@/lib/types/settlement";

import type { PersistedRoundRecord } from "./get-latest-round";
import { prisma } from "@/lib/db/prisma";
import { buildMarketObservation } from "@/lib/server/market-data/get-live-price";
import { getAgentPoolEntryByIdentityKey } from "@/lib/server/agents/get-agent-pool";

// 把某个 action 的创建时间，换算成“距离 round 开始已经过了多久”。
function formatElapsedTime(createdAt: Date, startsAt: Date | null) {
  if (!startsAt) {
    return "00:00";
  }

  const elapsedMs = Math.max(createdAt.getTime() - startsAt.getTime(), 0);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

// 从数据库 round 里，提取出页面要显示的 event。
function mapEvent(round: PersistedRoundRecord): ArenaEvent {
  return {
    externalMarketId: round.event?.externalMarketId ?? null,
    id: round.event?.id ?? `event-${round.id}`,
    observationType:
      round.event?.observationType === "polymarket-price"
        ? "polymarket-price"
        : "fact-price",
    outcome:
      round.event?.outcome === "yes" || round.event?.outcome === "no"
        ? round.event.outcome
        : "pending",
    question: round.event?.question ?? "Pending duel event",
    resolutionSource: round.event?.resolutionSource ?? "Pending source",
    slug: round.event?.slug ?? null,
    sourceKey: round.event?.sourceKey ?? null,
  };
}

// 把 AgentProfile 上的 brain 字段拼回 AgentSummary。
// 注意：当前是按 identityKey 实时查 pool，
// 这意味着如果某个 agent 的 brain 在 round 之后被 swap 过，
// 历史 round 也会显示新的 brain。
// 这是 MVP 的折中——真正的“历史快照式 brain 证据”将来会进 RoundAgent 表。
async function loadBrainsForRound(
  round: PersistedRoundRecord,
): Promise<Map<string, AgentBrain>> {
  const identityKeys = round.agents.map((agent) => agent.agentKey);

  if (identityKeys.length === 0) {
    return new Map();
  }

  const profiles = await prisma.agentProfile.findMany({
    where: {
      identityKey: { in: identityKeys },
    },
  });

  const brainsByIdentity = new Map<string, AgentBrain>();

  for (const profile of profiles) {
    if (!profile.brainProvider || !profile.brainModel) {
      continue;
    }

    brainsByIdentity.set(profile.identityKey, {
      model: profile.brainModel,
      provider:
        profile.brainProvider === "openai" ||
        profile.brainProvider === "anthropic" ||
        profile.brainProvider === "rules" ||
        profile.brainProvider === "mock" ||
        profile.brainProvider === "external"
          ? profile.brainProvider
          : "rules",
      swappedAt: profile.brainSwappedAt
        ? profile.brainSwappedAt.toISOString()
        : null,
    });
  }

  return brainsByIdentity;
}

function mapAgents(
  round: PersistedRoundRecord,
  brainsByIdentity: Map<string, AgentBrain>,
): AgentSummary[] {
  return round.agents.map((agent) => ({
    brain: brainsByIdentity.get(agent.agentKey) ?? null,
    id: agent.agentKey,
    name: agent.name,
    riskProfile:
      agent.riskProfile === "low" ||
      agent.riskProfile === "medium" ||
      agent.riskProfile === "high"
        ? agent.riskProfile
        : "medium",
    style: agent.style,
  }));
}

function mapRuntimeProvider(value: string | null) {
  if (
    value === "anthropic" ||
    value === "external" ||
    value === "mock" ||
    value === "openai" ||
    value === "rules"
  ) {
    return value;
  }

  return null;
}

function mapExecutionStatus(value: string | null) {
  if (
    value === "completed" ||
    value === "failed-fallback" ||
    value === "mocked" ||
    value === "rules"
  ) {
    return value;
  }

  return null;
}

function mapTracePhase(value: string): RoundActionTracePhase {
  if (
    value === "context" ||
    value === "policy" ||
    value === "execution" ||
    value === "decision" ||
    value === "fallback"
  ) {
    return value;
  }

  return "execution";
}

function mapActions(round: PersistedRoundRecord): RoundAction[] {
  return round.actions.map((action) => ({
    agentId: action.roundAgent.agentKey,
    agentName: action.roundAgent.name,
    at: formatElapsedTime(action.createdAt, round.startsAt),
    id: action.id,
    reason: action.reason,
    snapshotId: action.snapshotId,
    runtime: {
      brainModel: action.brainModel,
      brainProvider: mapRuntimeProvider(action.brainProvider),
      executionModel: action.executionModel,
      executionProvider: mapRuntimeProvider(action.executionProvider),
      executionStatus: mapExecutionStatus(action.executionStatus),
      runtimeKey: action.runtimeKey,
    },
    side: action.side === "no" ? "no" : "yes",
    sizeUsd: action.sizeUsd,
    trace: action.traceSteps.map((step) => ({
      detail: step.detail,
      id: step.id,
      phase: mapTracePhase(step.phase),
      stepIndex: step.stepIndex,
      title: step.title,
    })),
  }));
}

function mapBalances(round: PersistedRoundRecord): BankrollBalance[] {
  return round.agents.map((agent) => ({
    agentId: agent.agentKey,
    agentName: agent.name,
    usdc: agent.finalBalance ?? agent.startingBalance,
  }));
}

function mapPriceSnapshots(round: PersistedRoundRecord): RoundState["priceSnapshots"] {
  return round.priceSnapshots.map((snapshot, index, snapshots) => {
    const previousSnapshot = index === 0 ? null : snapshots[index - 1];
    const observation = buildMarketObservation(
      {
        price: snapshot.price,
        sourceLabel: snapshot.sourceLabel,
        timestamp: snapshot.capturedAt,
      },
      {
        previousPoint:
          previousSnapshot == null
            ? null
            : {
                price: previousSnapshot.price,
                timestamp: previousSnapshot.capturedAt,
              },
        roundEndsAt: round.endsAt,
      },
    );

    return {
      capturedAt: observation.timestamp.toISOString(),
      delta: observation.delta,
      id: snapshot.id,
      pctChange: observation.pctChange,
      price: observation.price,
      sourceLabel: observation.sourceLabel,
      timeSinceLastTick: observation.timeSinceLastTick,
      timeToDeadline: observation.timeToDeadline,
    };
  });
}

// 这里在干嘛：
// 读取最近一小段 Polymarket YES/NO 市场价格，映射成 round 页可画的市场共识点。
// 为什么这么写：
// Polymarket 是外部市场共识输入，不等于 SOL 事实价格；
// 先在 API state 里单独暴露，前端可以显式切换查看，不污染 settlement fact 曲线。
// 最后返回什么：
// 返回按时间升序排列的 Polymarket market ticks。
async function mapPolymarketSnapshots(): Promise<RoundState["polymarketSnapshots"]> {
  const ticks = await prisma.marketTick.findMany({
    orderBy: [{ observedAt: "desc" }, { id: "desc" }],
    take: 80,
    where: {
      sourceKey: "polymarket",
      side: {
        in: ["yes", "no"],
      },
    },
  });

  return ticks
    .reverse()
    .map((tick) => ({
      conditionId: tick.conditionId,
      id: tick.id,
      marketId: tick.marketId,
      observedAt: tick.observedAt.toISOString(),
      price: tick.price,
      side: tick.side === "no" ? "no" : "yes",
      sourceLabel: tick.sourceLabel,
    }));
}

async function mapSettlement(round: PersistedRoundRecord): Promise<RoundSettlement> {
  const winnerAgent = round.agents.find(
    (agent) =>
      round.settlement?.winnerAgentKey &&
      agent.agentKey === round.settlement.winnerAgentKey,
  );
  const fallbackBalance = winnerAgent?.finalBalance ??
    winnerAgent?.startingBalance ??
    round.bankrollPerAgent;
  const winnerProfile =
    round.settlement?.winnerAgentKey == null
      ? null
      : await getAgentPoolEntryByIdentityKey(round.settlement.winnerAgentKey);

  return {
    finalBalance: round.settlement?.finalBalance ?? fallbackBalance,
    pnlUsd: round.settlement?.pnlUsd ?? 0,
    status: round.settlement?.status === "settled" ? "settled" : "pending",
    winningSide:
      round.settlement?.winningSide === "yes" ||
      round.settlement?.winningSide === "no"
        ? round.settlement.winningSide
        : null,
    winnerAgentId: round.settlement?.winnerAgentKey ?? winnerAgent?.agentKey ?? "",
    winnerName: round.settlement?.winnerName ?? winnerAgent?.name ?? "Pending settlement",
    winnerReputation:
      winnerProfile == null
        ? null
        : {
            badge: winnerProfile.badge,
            bestStreak: winnerProfile.bestStreak,
            currentRank: winnerProfile.currentRank,
            currentStreak: winnerProfile.currentStreak,
            identityKey: winnerProfile.identityKey,
            name: winnerProfile.name,
            previousRank: winnerProfile.previousRank,
            rankDelta: winnerProfile.rankDelta,
            totalLosses: winnerProfile.totalLosses,
            totalWins: winnerProfile.totalWins,
          },
  };
}

// 这里专门做“数据库结构 -> 页面结构”的翻译。
// 这样前端不用知道 Prisma 表长什么样，后面改表也不会一路牵连到 UI。
export async function mapRoundToState(round: PersistedRoundRecord): Promise<RoundState> {
  const brainsByIdentity = await loadBrainsForRound(round);
  const polymarketSnapshots = await mapPolymarketSnapshots();

  return {
    actions: mapActions(round),
    agents: mapAgents(round, brainsByIdentity),
    balances: mapBalances(round),
    bankrollPerAgent: round.bankrollPerAgent,
    endsAt: round.endsAt ? round.endsAt.toISOString() : null,
    event: mapEvent(round),
    id: round.id,
    priceSnapshots: mapPriceSnapshots(round),
    polymarketSnapshots,
    settlement: await mapSettlement(round),
    startsAt: round.startsAt ? round.startsAt.toISOString() : null,
    status: round.status === "settled" ? "settled" : "live",
  };
}
