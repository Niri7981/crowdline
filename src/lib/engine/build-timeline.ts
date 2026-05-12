import { RoundAction } from "@/lib/types/action";

export function getDemoTimeline(): RoundAction[] {
  return [
    {
      id: "action-1",
      agentId: "momentum",
      agentName: "Momentum Agent",
      snapshotId: "snapshot-1",
      side: "yes",
      sizeUsd: 4,
      at: "00:30",
      reason: "Price moved above 0.50 and momentum stayed positive.",
      trace: [
        {
          detail: "Demo price crossed the momentum threshold.",
          id: "action-1-trace-1",
          phase: "context",
          stepIndex: 0,
          title: "Signal Read",
        },
      ],
    },
    {
      id: "action-2",
      agentId: "contrarian",
      agentName: "Contrarian Agent",
      snapshotId: "snapshot-2",
      side: "no",
      sizeUsd: 3,
      at: "02:10",
      reason: "Consensus looked crowded, so it faded the move.",
      trace: [
        {
          detail: "Demo consensus looked crowded above fair value.",
          id: "action-2-trace-1",
          phase: "policy",
          stepIndex: 0,
          title: "Crowd Fade",
        },
      ],
    },
  ];
}
