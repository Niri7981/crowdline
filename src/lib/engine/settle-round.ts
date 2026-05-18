import { RoundState } from "@/lib/types/round";
import { RoundSettlement } from "@/lib/types/settlement";

export function buildSettlementPreview(round: RoundState): RoundSettlement {
  const winner = round.balances.reduce((best, current) =>
    current.usdc > best.usdc ? current : best,
  );

  return {
    winnerAgentId: winner.agentId,
    winnerName: winner.agentName,
    finalBalance: winner.usdc,
    pnlUsd: winner.usdc - round.bankrollPerAgent,
    status: "settled",
    trustStatus: round.trustStatus,
    trustSummary: null,
    winningSide:
      round.actions.find((action) => action.agentId === winner.agentId)?.side ?? null,
  };
}
