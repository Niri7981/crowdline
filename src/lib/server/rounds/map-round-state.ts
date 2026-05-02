import type { AgentBrain, AgentSummary } from "@/lib/types/agent";
import type { RoundAction, RoundActionTracePhase } from "@/lib/types/action";
import type { ArenaEvent } from "@/lib/types/event";
import type { BankrollBalance, RoundState } from "@/lib/types/round";
import type { RoundSettlement } from "@/lib/types/settlement";

import type { PersistedRoundRecord } from "./get-latest-round";
import { prisma } from "@/lib/db/prisma";
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
    id: round.event?.id ?? `event-${round.id}`,
    outcome:
      round.event?.outcome === "yes" || round.event?.outcome === "no"
        ? round.event.outcome
        : "pending",
    question: round.event?.question ?? "Pending duel event",
    resolutionSource: round.event?.resolutionSource ?? "Pending source",
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
        profile.brainProvider === "mock"
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

  return {
    actions: mapActions(round),
    agents: mapAgents(round, brainsByIdentity),
    balances: mapBalances(round),
    bankrollPerAgent: round.bankrollPerAgent,
    event: mapEvent(round),
    id: round.id,
    settlement: await mapSettlement(round),
    status: round.status === "settled" ? "settled" : "live",
  };
}
