import type { ReputationEffect } from "@/lib/server/reputation/types";

// BattleOutcome 是 battle 层对事件结果的稳定表达。
// 数据库里 outcome 仍然是字符串，但 battle API 只向外暴露 yes / no / pending。
export type BattleOutcome = "yes" | "no" | "pending";

// BattleStatus 是前端和 API 关心的 round 状态。
// 这里刻意只保留 live / settled，避免把数据库内部状态直接泄漏出去。
export type BattleStatus = "live" | "settled";

// BattleParticipantSide 是 agent 在一场 battle 里的公开决策方向。
// null 表示 action 还没有可用，或者历史数据无法收敛成 yes / no。
export type BattleParticipantSide = "yes" | "no" | null;

export type BattleRuntimeTracePhase =
  | "context"
  | "policy"
  | "execution"
  | "decision"
  | "fallback";

export type BattleRuntimeTraceStep = {
  id: string;
  detail: string;
  phase: BattleRuntimeTracePhase;
  stepIndex: number;
  title: string;
};

// BattleParticipantRecord 是 BattleRecord 里的参赛者视图。
// 注意这里的 agentId 指的是公开身份 key，也就是 AgentProfile.identityKey / RoundAgent.agentKey，
// 不是 runtimeKey，也不是底层模型供应商 ID。
export type BattleParticipantRecord = {
  agentId: string;
  name: string;
  style: string;
  riskProfile: "low" | "medium" | "high";
  side: BattleParticipantSide;
  sizeUsd: number | null;
  reason: string | null;
  trace: BattleRuntimeTraceStep[];
  startingBalance: number;
  finalBalance: number;
  pnlUsd: number;
  isWinner: boolean;
};

// BattleRecord 是给 battle history、battle detail、agent profile recent battles 使用的标准记录。
// 它从 Round / RoundEvent / RoundAgent / Action / Settlement 聚合而来，
// 适合页面展示“这场 battle 发生了什么”。
export type BattleRecord = {
  roundId: string;
  marketSymbol: string;
  roundStatus: BattleStatus;
  trustStatus?: "degraded" | "trusted";
  question: string;
  resolutionSource: string;
  outcome: BattleOutcome;
  createdAt: string;
  settledAt: string | null;
  winningAgentId: string | null;
  winningAgentName: string | null;
  winningSide: "yes" | "no" | null;
  finalBalance: number | null;
  pnlUsd: number | null;
  participants: BattleParticipantRecord[];
};

// BattleProofParticipant 是 proof payload 里的参赛者快照。
// proof 语义更强调 public identity，所以这里字段名显式使用 identityKey。
// reasonSummary 会被截断，避免 proof snapshot 携带过长的 runtime rationale。
export type BattleProofParticipant = {
  identityKey: string;
  name: string;
  side: BattleParticipantSide;
  sizeUsd: number | null;
  reasonSummary: string | null;
  startingBalance: number;
  finalBalance: number;
  pnlUsd: number;
};

// BattleProofReputationEffect 复用 reputation 层的标准 effect。
// battle proof 不单独定义一套 rank / streak / record 变化规则，
// 避免 proof 层和 reputation 层以后发生漂移。
export type BattleProofReputationEffect = ReputationEffect;

// BattleProofPayload 是 settlement 时固化下来的证明快照。
// 它回答的不是“页面现在应该怎么显示”，而是“这场 battle 在结算时如何改变公开身份”。
// 未来上链时，完整 payload 仍留在数据库，链上只锚定它的 proof hash。
export type BattleProofPayload = {
  proofVersion: 1;
  roundId: string;
  createdAt: string;
  settledAt: string | null;
  trustStatus?: "degraded" | "trusted";
  trustSummary?: string | null;
  eventId: string | null;
  marketSymbol: string;
  question: string;
  resolutionSource: string;
  outcome: BattleOutcome;
  participants: BattleProofParticipant[];
  winnerIdentityKey: string | null;
  winnerName: string | null;
  winningSide: "yes" | "no" | null;
  finalBalance: number | null;
  pnlUsd: number | null;
  reputationEffects: BattleProofReputationEffect[];
};
