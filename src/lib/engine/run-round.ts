import { getDemoTimeline } from "@/lib/engine/build-timeline";
import { buildSettlementPreview } from "@/lib/engine/settle-round";
import { RoundState } from "@/lib/types/round";

export function getDemoRoundState(): RoundState {
  const round: RoundState = {
    id: "round-demo-1",
    status: "live",
    bankrollPerAgent: 10,
    startsAt: null,
    endsAt: null,
    event: {
      id: "event-1",
      question: "Will BTC close above 100k by round end?",
      resolutionSource: "Demo oracle feed",
      outcome: "pending",
    },
    agents: [
      {
        id: "momentum",
        name: "Momentum Agent",
        style: "Trend following",
        riskProfile: "medium",
      },
      {
        id: "contrarian",
        name: "Contrarian Agent",
        style: "Crowd fading",
        riskProfile: "medium",
      },
    ],
    actions: getDemoTimeline(),
    balances: [
      {
        agentId: "momentum",
        agentName: "Momentum Agent",
        usdc: 11.8,
      },
      {
        agentId: "contrarian",
        agentName: "Contrarian Agent",
        usdc: 9.4,
      },
    ],
    priceSnapshots: [],
    polymarketSnapshots: [],
    settlement: {
      winnerAgentId: "momentum",
      winnerName: "Momentum Agent",
      finalBalance: 11.8,
      pnlUsd: 1.8,
      status: "pending",
      winningSide: null,
    },
  };

  return {
    ...round,
    settlement: buildSettlementPreview(round),
  };
}
