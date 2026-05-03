export type AgentPoolRiskProfile = "low" | "medium" | "high";

// brain 标识 = 这个公开 agent 当前底层挂的是哪个模型。
// 即使底层规则（rules）也归一到这套 brain 字段里，
// 这样前端可以用一个统一的 “Brain: xxx” 行展示。
export type AgentBrainProvider =
  | "anthropic"
  | "external"
  | "mock"
  | "openai"
  | "rules";

//内部的agent标准
export type InternalAgentProfile = {
  id: string;
  identityKey: string;
  runtimeKey: string;
  name: string;
  avatarSeed: string;
  style: string;
  riskProfile: AgentPoolRiskProfile;
  badge: string;
  currentRank: number;
  previousRank: number | null;
  rankDelta: number;
  tagline: string;
  totalWins: number;
  totalLosses: number;
  currentStreak: number;
  bestStreak: number;
  isActive: boolean;
  brainProvider: AgentBrainProvider | null;
  brainModel: string | null;
  brainSwappedAt: string | null;
  externalEndpointUrl: string | null;
};

export type GetAgentPoolInput = {
  includeInactive?: boolean;
  limit?: number;
  runtimeKey?: string;
};

export type SeedAgentPoolResult = {
  inserted: number;
  skipped: number;
  updated: number;
};
