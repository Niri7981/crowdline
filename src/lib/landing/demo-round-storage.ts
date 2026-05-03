"use client";

import type { RoundAction, RoundActionTraceStep } from "@/lib/types/action";
import type { AgentSummary } from "@/lib/types/agent";
import type { ArenaEvent } from "@/lib/types/event";
import type { RoundState } from "@/lib/types/round";
import type { LandingEvent } from "@/lib/mocks/landing-demo-data";

import type { LandingAgent } from "./use-landing-agents";

const DEMO_ROUND_STORAGE_KEY = "agentduel.demoRound.v1";

type CreateDemoRoundInput = {
  agents: LandingAgent[];
  event: LandingEvent;
};

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function riskToSize(riskProfile: LandingAgent["riskProfile"], index: number) {
  if (riskProfile === "high") {
    return index === 0 ? 7.8 : 7.2;
  }

  if (riskProfile === "low") {
    return index === 0 ? 4.8 : 4.4;
  }

  return index === 0 ? 6.4 : 5.9;
}

function buildTrace(agent: LandingAgent, index: number): RoundActionTraceStep[] {
  const side = index === 0 ? "YES" : "NO";

  return [
    {
      detail: `${agent.name} reads the curated event context and market consensus before entering the arena.`,
      id: `demo-trace-${agent.identityKey}-context`,
      phase: "context",
      stepIndex: 1,
      title: "Context loaded",
    },
    {
      detail: `${agent.style} policy converts the public signal into a standardized ${side} decision.`,
      id: `demo-trace-${agent.identityKey}-policy`,
      phase: "policy",
      stepIndex: 2,
      title: "Arena policy applied",
    },
    {
      detail: `Runtime snapshot captured for ${agent.brain.provider ?? "openai"} / ${agent.brain.model ?? "demo-model"}.`,
      id: `demo-trace-${agent.identityKey}-execution`,
      phase: "execution",
      stepIndex: 3,
      title: "Runtime proof captured",
    },
    {
      detail: `${agent.name} locks ${side} with visible conviction and public accountability.`,
      id: `demo-trace-${agent.identityKey}-decision`,
      phase: "decision",
      stepIndex: 4,
      title: "Decision locked",
    },
  ];
}

function mapAgent(agent: LandingAgent): AgentSummary {
  return {
    brain: agent.brain.provider
      ? {
          model: agent.brain.model ?? "demo-model",
          provider: agent.brain.provider,
          swappedAt: agent.brain.swappedAt,
        }
      : null,
    id: agent.identityKey,
    name: agent.name,
    riskProfile: agent.riskProfile,
    style: agent.style,
  };
}

function mapAction(agent: LandingAgent, index: number): RoundAction {
  const side = index === 0 ? "yes" : "no";
  const sizeUsd = riskToSize(agent.riskProfile, index);

  return {
    agentId: agent.identityKey,
    agentName: agent.name,
    at: new Date().toISOString(),
    id: `demo-action-${agent.identityKey}-${Date.now()}`,
    reason:
      side === "yes"
        ? `${agent.name} sees enough directional pressure to take the YES side and turn its thesis into public reputation risk.`
        : `${agent.name} rejects the crowd setup, takes the NO side, and makes its dissent legible in the arena.`,
    runtime: {
      brainModel: agent.brain.model,
      brainProvider: agent.brain.provider,
      executionModel: agent.brain.model,
      executionProvider: agent.brain.provider,
      executionStatus: "completed",
      runtimeKey: agent.runtimeKey,
    },
    side,
    sizeUsd,
    trace: buildTrace(agent, index),
  };
}

// 这里在干嘛：
// 在部署环境写数据库失败时，生成一场只存在于浏览器里的 demo round。
// 为什么这么写：
// Vercel 上的 SQLite 不适合当持久写入层，但黑客松 demo 不能因此卡在 Start Duel。
// 这个 fallback 只兜住展示链路，真实本地 flow 仍然走 DB、LLM runtime 和 localnet proof。
// 最后返回什么：
// 返回页面已经会渲染的 RoundState，结构和真实 API 返回值一致。
export function createDemoRoundState({
  agents,
  event,
}: CreateDemoRoundInput): RoundState {
  const selectedAgents = agents.slice(0, 2);
  const actions = selectedAgents.map(mapAction);
  const arenaEvent: ArenaEvent = {
    id: `demo-event-${event.id}`,
    outcome: "pending",
    question: event.question,
    resolutionSource: event.source,
  };

  return {
    actions,
    agents: selectedAgents.map(mapAgent),
    balances: selectedAgents.map((agent) => ({
      agentId: agent.identityKey,
      agentName: agent.name,
      usdc: 10,
    })),
    bankrollPerAgent: 10,
    event: arenaEvent,
    id: `demo-round-${Date.now()}`,
    settlement: {
      finalBalance: 10,
      pnlUsd: 0,
      status: "pending",
      winnerAgentId: "",
      winnerName: "Pending settlement",
      winningSide: null,
      winnerReputation: null,
    },
    status: "live",
  };
}

export function isDemoRound(round: RoundState | null) {
  return Boolean(round?.id.startsWith("demo-round-"));
}

export function settleDemoRoundState(round: RoundState): RoundState {
  const [leftAction, rightAction] = round.actions;
  const winnerAction =
    !rightAction || (leftAction?.sizeUsd ?? 0) >= rightAction.sizeUsd
      ? leftAction
      : rightAction;
  const winnerAgent = round.agents.find((agent) => agent.id === winnerAction?.agentId);

  if (!winnerAction || !winnerAgent) {
    return round;
  }

  const finalBalance = round.bankrollPerAgent + 3.42;

  return {
    ...round,
    balances: round.balances.map((balance) =>
      balance.agentId === winnerAgent.id
        ? { ...balance, usdc: finalBalance }
        : { ...balance, usdc: Math.max(0, round.bankrollPerAgent - 2.18) },
    ),
    event: {
      ...round.event,
      outcome: winnerAction.side,
    },
    settlement: {
      finalBalance,
      pnlUsd: finalBalance - round.bankrollPerAgent,
      status: "settled",
      winnerAgentId: winnerAgent.id,
      winnerName: winnerAgent.name,
      winnerReputation: {
        badge: "Arena Proof",
        bestStreak: 4,
        currentRank: 1,
        currentStreak: 2,
        identityKey: winnerAgent.id,
        name: winnerAgent.name,
        previousRank: 2,
        rankDelta: 1,
        totalLosses: 2,
        totalWins: 8,
      },
      winningSide: winnerAction.side,
    },
    status: "settled",
  };
}

export function readStoredDemoRound(): RoundState | null {
  if (!hasBrowserStorage()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(DEMO_ROUND_STORAGE_KEY);

    return rawValue ? (JSON.parse(rawValue) as RoundState) : null;
  } catch {
    return null;
  }
}

export function writeStoredDemoRound(round: RoundState) {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(DEMO_ROUND_STORAGE_KEY, JSON.stringify(round));
}
