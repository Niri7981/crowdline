export type SettledAgentReputation = {
  identityKey: string;
  name: string;
  badge: string;
  currentRank: number;
  previousRank: number | null;
  rankDelta: number;
  currentStreak: number;
  bestStreak: number;
  totalWins: number;
  totalLosses: number;
};

export type RoundSettlement = {
  winnerAgentId: string;
  winnerName: string;
  finalBalance: number;
  pnlUsd: number;
  status: "pending" | "settled";
  trustStatus: "degraded" | "trusted";
  trustSummary?: string | null;
  winningSide: "yes" | "no" | null;
  winnerReputation?: SettledAgentReputation | null;
};
