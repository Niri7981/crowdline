import { buildBattleReputationEffects } from "@/lib/server/reputation/build-reputation-effects";
import type { ReputationProfileSnapshot } from "@/lib/server/reputation/types";
import type { PersistedRoundRecord } from "@/lib/server/rounds/get-latest-round";

import type {
  BattleOutcome,
  BattleParticipantSide,
  BattleProofPayload,
} from "./types";

type SettlementComputationSnapshot = {
  finalBalance: number;
  pnlUsd: number;
  trustStatus: "degraded" | "trusted";
  trustSummary: string | null;
  winnerAgentKey: string | null;
  winnerName: string;
  winningSide: "yes" | "no" | null;
};

function normalizeOutcome(outcome: string | null | undefined): BattleOutcome {
  if (outcome === "yes" || outcome === "no") {
    return outcome;
  }

  return "pending";
}

function normalizeActionSide(
  side: string | null | undefined,
): BattleParticipantSide {
  if (side === "yes" || side === "no") {
    return side;
  }

  return null;
}

function summarizeReason(reason: string | null | undefined) {
  if (!reason) {
    return null;
  }

  return reason.length <= 180 ? reason : `${reason.slice(0, 177)}...`;
}

// 这里在干嘛：
// 把一场已经结算完成的 round，固化成一份 BattleProofPayload。
// 为什么这么写：
// battle history 适合给页面看，但 proof payload 需要更稳定、更明确，
// 方便以后上链、签名或外部校验。
// 这里会把事件快照、参赛者快照、结算结果和 reputation effect 全部固化下来；
// reputation effect 的计算交给 reputation 层，避免 proof 层重复实现声誉规则。
// 最后返回什么：
// 返回一份 BattleProofPayload。
export function buildBattleProofPayload(params: {
  afterProfiles: ReputationProfileSnapshot[];
  beforeProfiles: ReputationProfileSnapshot[];
  round: PersistedRoundRecord;
  settlement: SettlementComputationSnapshot;
  settledAt: Date;
}): BattleProofPayload {
  const participants = params.round.agents.map((agent) => {
    const action = params.round.actions.find(
      (entry) => entry.roundAgent.id === agent.id,
    );
    const finalBalance =
      action?.roundAgent.finalBalance ??
      params.round.agents.find((entry) => entry.id === agent.id)?.finalBalance ??
      params.round.bankrollPerAgent;
    const startingBalance =
      params.round.agents.find((entry) => entry.id === agent.id)?.startingBalance ??
      params.round.bankrollPerAgent;

    return {
      finalBalance,
      identityKey: agent.agentKey,
      name: agent.name,
      pnlUsd: finalBalance - startingBalance,
      reasonSummary: summarizeReason(action?.reason),
      side: normalizeActionSide(action?.side),
      sizeUsd: action?.sizeUsd ?? null,
      startingBalance,
    };
  });

  return {
    createdAt: params.round.createdAt.toISOString(),
    eventId: params.round.event?.id ?? null,
    finalBalance: params.settlement.finalBalance,
    marketSymbol: params.round.marketSymbol,
    outcome: normalizeOutcome(params.round.event?.outcome),
    participants,
    pnlUsd: params.settlement.pnlUsd,
    proofVersion: 1,
    question: params.round.event?.question ?? "Pending duel event",
    reputationEffects: buildBattleReputationEffects({
      afterProfiles: params.afterProfiles,
      beforeProfiles: params.beforeProfiles,
      participantIdentityKeys: params.round.agents.map((agent) => agent.agentKey),
      winnerIdentityKey: params.settlement.winnerAgentKey,
    }),
    resolutionSource: params.round.event?.resolutionSource ?? "Pending source",
    roundId: params.round.id,
    settledAt: params.settledAt.toISOString(),
    trustStatus: params.settlement.trustStatus,
    trustSummary: params.settlement.trustSummary,
    winnerIdentityKey: params.settlement.winnerAgentKey,
    winnerName: params.settlement.winnerName,
    winningSide: params.settlement.winningSide,
  };
}
