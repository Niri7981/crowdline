"use client";

import { useEffect, useState } from "react";

import {
  getLandingAgentVisual,
  type LandingAgentVisual,
} from "./agent-visual-config";
import { AGENT_POOL } from "@/lib/server/agents/agent-pool-data";

// 这里在干嘛：
// 把真实 Agent Pool 和落地页视觉配置合并成首页可直接消费的数据。
// 为什么这么写：
// 首页要展示的是 public identity + reputation + brain + 卡面包装；
// merge 收敛在 hook 里，组件只负责渲染。
// 最后返回什么：
// 返回 5 个真实 agent、加载状态和错误信息。

export type LandingAgentBrainProvider =
  | "anthropic"
  | "external"
  | "mock"
  | "openai"
  | "rules"
  | null;

export type LandingAgent = LandingAgentVisual & {
  badge: string;
  avatarSeed: string;
  bestStreak: number;
  brain: {
    model: string | null;
    provider: LandingAgentBrainProvider;
    swappedAt: string | null;
  };
  id: string;
  identityKey: string;
  name: string;
  rank: number;
  riskProfile: "low" | "medium" | "high";
  runtimeKey: string;
  streak: number;
  style: string;
  tagline: string;
  totalLosses: number;
  totalWins: number;
  winRate: string;
};

type ApiAgent = {
  badge: string;
  avatarSeed: string;
  bestStreak: number;
  brainModel: string | null;
  brainProvider: LandingAgentBrainProvider;
  brainSwappedAt: string | null;
  currentRank: number;
  currentStreak: number;
  id: string;
  identityKey: string;
  name: string;
  runtimeKey: string;
  riskProfile: "low" | "medium" | "high";
  style: string;
  tagline: string;
  totalLosses: number;
  totalWins: number;
};

function computeWinRate(wins: number, losses: number) {
  const total = wins + losses;

  if (total === 0) {
    return "N/A";
  }

  return `${Math.round((wins / total) * 100)}%`;
}

function mapApiAgentToLandingAgent(agent: ApiAgent): LandingAgent {
  return {
    ...getLandingAgentVisual(agent.identityKey, {
      avatarSeed: agent.avatarSeed,
      name: agent.name,
      riskProfile: agent.riskProfile,
      style: agent.style,
    }),
    avatarSeed: agent.avatarSeed,
    badge: agent.badge,
    bestStreak: agent.bestStreak,
    brain: {
      model: agent.brainModel,
      provider: agent.brainProvider,
      swappedAt: agent.brainSwappedAt,
    },
    id: agent.id,
    identityKey: agent.identityKey,
    name: agent.name,
    rank: agent.currentRank,
    riskProfile: agent.riskProfile,
    runtimeKey: agent.runtimeKey,
    streak: agent.currentStreak,
    style: agent.style,
    tagline: agent.tagline,
    totalLosses: agent.totalLosses,
    totalWins: agent.totalWins,
    winRate: computeWinRate(agent.totalWins, agent.totalLosses),
  };
}

function getFallbackLandingAgents() {
  return AGENT_POOL.filter((agent) => agent.isActive)
    .map((agent) =>
      mapApiAgentToLandingAgent({
        avatarSeed: agent.avatarSeed,
        badge: agent.badge,
        bestStreak: agent.bestStreak,
        brainModel: agent.brainModel,
        brainProvider: agent.brainProvider,
        brainSwappedAt: agent.brainSwappedAt,
        currentRank: agent.currentRank,
        currentStreak: agent.currentStreak,
        id: agent.identityKey,
        identityKey: agent.identityKey,
        name: agent.name,
        riskProfile: agent.riskProfile,
        runtimeKey: agent.runtimeKey,
        style: agent.style,
        tagline: agent.tagline,
        totalLosses: agent.totalLosses,
        totalWins: agent.totalWins,
      }),
    )
    .sort((left, right) => left.rank - right.rank);
}

export function formatLandingBrain(agent: LandingAgent) {
  const model = agent.brain.model?.toUpperCase() ?? "";

  if (agent.brain.provider === "openai") {
    return `OPENAI ${model}`.trim();
  }

  if (agent.brain.provider === "anthropic") {
    return `ANTHROPIC ${model}`.trim();
  }

  if (agent.brain.provider === "rules") {
    return "RULES ENGINE";
  }

  if (agent.brain.provider === "mock") {
    return "MOCK BRAIN";
  }

  if (agent.brain.provider === "external") {
    return "EXTERNAL";
  }

  return "UNKNOWN";
}

async function readLandingAgents() {
  const response = await fetch("/api/agents", {
    cache: "no-store",
  });

  if (!response.ok) {
    console.warn("Using bundled Agent Pool because /api/agents failed.");

    return getFallbackLandingAgents();
  }

  const apiAgents = (await response.json()) as ApiAgent[];

  if (apiAgents.length === 0) {
    return getFallbackLandingAgents();
  }

  return apiAgents.map(mapApiAgentToLandingAgent).sort((left, right) => left.rank - right.rank);
}

export function useLandingAgents() {
  const [agents, setAgents] = useState<LandingAgent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshAgents() {
    const nextAgents = await readLandingAgents();

    setAgents(nextAgents);
    setErrorMessage(null);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (cancelled) {
          return;
        }

        await refreshAgents();
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load agents.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    agents,
    errorMessage,
    isLoading,
    refreshAgents,
  };
}
