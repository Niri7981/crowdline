import type { InternalAgentProfile } from "./types";

// Agent Pool 代表公开参赛者身份。
// 这里的记录面向 arena 展示与 battle 编排，不等于底层模型供应商。
//
// brain 字段说明：
// - brainProvider / brainModel 是 “这个公开 agent 当前用什么大脑在思考”
// - 同一个 agent 可以换 brain 但保留 identityKey 和战绩
//   （这是 AgentDuel 最核心的 “Agent != Model” 抽象）
//
// runtimeKey 控制内部 adapter：
// - "momentum" / "contrarian"：persona adapter，优先按 brain 走 LLM，必要时保留 rules fallback
// - "llm-news" / "llm-quant"：LLM-backed adapter，按 brain 配置选 OpenAI / Anthropic
//AgentDuel 初始承认的公开参赛者身份种子。
export const AGENT_POOL: Array<
  Omit<InternalAgentProfile, "id" | "rankDelta" | "brainSwappedAt"> & {
    brainSwappedAt: string | null;
  }
> = [
  {
    avatarSeed: "momentum-surge",
    badge: "Rising",
    bestStreak: 4,
    brainModel: "gpt-5",
    brainProvider: "openai",
    brainSwappedAt: "2026-04-24T00:00:00.000Z",
    externalEndpointUrl: null,
    currentRank: 1,
    currentStreak: 3,
    identityKey: "agent-momentum",
    isActive: true,
    name: "Momentum Agent",
    previousRank: null,
    riskProfile: "medium",
    runtimeKey: "momentum",
    style: "Trend following",
    tagline: "Rides price acceleration and presses when conviction builds.",
    totalLosses: 2,
    totalWins: 7,
  },
  {
    avatarSeed: "contrarian-vault",
    badge: "Provocateur",
    bestStreak: 5,
    brainModel: "gpt-5",
    brainProvider: "openai",
    brainSwappedAt: "2026-04-24T00:00:00.000Z",
    externalEndpointUrl: null,
    currentRank: 2,
    currentStreak: 1,
    identityKey: "agent-contrarian",
    isActive: true,
    name: "Contrarian Agent",
    previousRank: null,
    riskProfile: "medium",
    runtimeKey: "contrarian",
    style: "Crowd fading",
    tagline: "Looks for consensus excess and leans the other way.",
    totalLosses: 3,
    totalWins: 6,
  },
  {
    avatarSeed: "news-flash",
    badge: "Scout",
    bestStreak: 2,
    brainModel: "gpt-5",
    brainProvider: "openai",
    brainSwappedAt: "2026-04-12T00:00:00.000Z",
    externalEndpointUrl: null,
    currentRank: 3,
    currentStreak: 0,
    identityKey: "agent-news",
    isActive: true,
    name: "News Agent",
    previousRank: null,
    riskProfile: "low",
    runtimeKey: "llm-news",
    style: "Headline scanning",
    tagline: "Prefers quick reactions when a new signal changes the narrative.",
    totalLosses: 4,
    totalWins: 4,
  },
  {
    avatarSeed: "quant-lattice",
    badge: "Disciplined",
    bestStreak: 3,
    brainModel: "gpt-5",
    brainProvider: "openai",
    brainSwappedAt: "2026-04-18T00:00:00.000Z",
    externalEndpointUrl: null,
    currentRank: 4,
    currentStreak: 1,
    identityKey: "agent-quant",
    isActive: true,
    name: "Quant Agent",
    previousRank: null,
    riskProfile: "medium",
    runtimeKey: "llm-quant",
    style: "Microstructure & reversion",
    tagline:
      "Reads short-horizon imbalances and sizes by conviction, never bankroll.",
    totalLosses: 1,
    totalWins: 3,
  },
  {
    avatarSeed: "macro-pulse",
    badge: "Strategist",
    bestStreak: 2,
    brainModel: "gpt-5",
    brainProvider: "openai",
    brainSwappedAt: "2026-04-22T00:00:00.000Z",
    externalEndpointUrl: null,
    currentRank: 5,
    currentStreak: 0,
    identityKey: "agent-macro",
    isActive: true,
    name: "Macro Agent",
    previousRank: null,
    riskProfile: "high",
    runtimeKey: "llm-news",
    style: "Macro narrative",
    tagline:
      "Tracks regime shifts and sides with the dominant macro narrative of the week.",
    totalLosses: 2,
    totalWins: 2,
  },
];
