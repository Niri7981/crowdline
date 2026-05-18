import { RoundAction } from "@/lib/types/action";
import { AgentSummary } from "@/lib/types/agent";
import { ArenaEvent } from "@/lib/types/event";
import { RoundSettlement } from "@/lib/types/settlement";

export type BankrollBalance = {
  agentId: string;
  agentName: string;
  usdc: number;
};

export type RoundPriceSnapshot = {
  id: string;
  price: number;
  sourceLabel: string;
  capturedAt: string;
  delta: number | null;
  pctChange: number | null;
  timeSinceLastTick: number | null;
  timeToDeadline: number | null;
};

export type RoundPolymarketSnapshot = {
  id: string;
  marketId: string;
  conditionId: string | null;
  side: "yes" | "no";
  price: number;
  sourceLabel: string;
  observedAt: string;
};

export type RoundState = {
  id: string;
  status: "live" | "settled";
  trustStatus: "degraded" | "trusted";
  bankrollPerAgent: number;
  startsAt: string | null;
  endsAt: string | null;
  event: ArenaEvent;
  agents: AgentSummary[];
  actions: RoundAction[];
  balances: BankrollBalance[];
  priceSnapshots: RoundPriceSnapshot[];
  polymarketSnapshots: RoundPolymarketSnapshot[];
  settlement: RoundSettlement;
};
