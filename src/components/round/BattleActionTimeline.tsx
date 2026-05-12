"use client";

import { RoundAction } from "@/lib/types/action";
import {
  Brain,
  CheckCircle2,
  Clock,
  Crosshair,
  MessageSquareText,
  MoveRight,
  Workflow,
} from "lucide-react";

interface BattleActionCardProps {
  action: RoundAction;
}

export function BattleActionCard({ action }: BattleActionCardProps) {
  const isMomentum = action.agentId === "momentum" || action.agentId === "agent-momentum";
  const themeColor = isMomentum ? "#ff1f2d" : "#39ff14";
  const sideColor = action.side === "yes" ? "#39ff14" : "#ff1f2d";
  const runtimeLabel =
    action.runtime?.executionProvider && action.runtime.executionModel
      ? `${action.runtime.executionProvider} / ${action.runtime.executionModel}`
      : "arena brain";

  return (
    <article
      className="industrial-clip-sm group relative min-h-[210px] w-[300px] shrink-0 snap-start border-[4px] bg-[#fcee09] p-3 text-black md:w-[330px]"
      style={{ borderColor: themeColor }}
    >
      <div className="pointer-events-none absolute -left-[18px] top-7 hidden h-1 w-8 bg-black md:block" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-black/65">
            <Clock className="h-3.5 w-3.5" />
            {action.at}
          </div>
          <div
            className="mt-2 truncate font-mono text-[9px] font-black uppercase tracking-[0.2em]"
            style={{ color: themeColor }}
          >
            {action.agentName}
          </div>
        </div>
        <div
          className="shrink-0 border-2 border-black px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-black"
          style={{ backgroundColor: sideColor }}
        >
          {action.side}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
        <div className="min-w-0">
          <div className="font-black uppercase italic leading-none text-2xl text-black">
            {action.side === "yes" ? "Buy Yes" : "Fade Crowd"}
          </div>
          <div className="mt-2 flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-black/70">
            <Brain className="h-3 w-3 shrink-0" />
            <span className="truncate">{runtimeLabel}</span>
          </div>
        </div>
        <div className="text-right text-xl font-black text-black">
          ${action.sizeUsd.toFixed(2)}
        </div>
      </div>

      <div className="mt-3 border-[3px] border-black bg-[#111111] p-3">
        <div className="flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#fcee09]">
          <span className="flex items-center gap-2">
            <MessageSquareText className="h-3.5 w-3.5" />
            Model Output
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-[10px] font-black uppercase leading-relaxed tracking-wide text-[#fcee09]">
          {action.reason}
        </p>
      </div>

      {action.trace.length > 0 ? (
        <div className="mt-3 flex items-center gap-2 overflow-hidden border-t-2 border-black/30 pt-2">
          <Workflow className="h-3 w-3 shrink-0" />
          <div className="flex min-w-0 gap-1.5 overflow-hidden">
            {action.trace.slice(0, 3).map((step) => (
              <span
                key={step.id}
                className="max-w-[92px] truncate border-2 border-black bg-[#d8c900] px-1.5 py-1 font-mono text-[7px] font-black uppercase tracking-[0.12em] text-black"
                title={`${step.phase} / ${step.title}`}
              >
                {step.phase}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

interface BattleActionTimelineProps {
  actions: RoundAction[];
  roundStatus?: "live" | "settled";
  winnerName?: string;
}

export function BattleActionTimeline({
  actions,
  roundStatus = "live",
  winnerName,
}: BattleActionTimelineProps) {
  const timelineActions =
    actions.length > 0
      ? actions
      : [
          {
            agentId: "oracle",
            agentName: "Oracle",
            at: "01:02",
            id: "mock-oracle-pending",
            reason: "Settlement pending.",
            snapshotId: null,
            side: "yes" as const,
            sizeUsd: 0,
            trace: [],
          },
        ];

  return (
    <section className="industrial-clip border-[6px] border-black bg-[#fcee09] p-5 text-black">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b-[4px] border-black pb-4">
        <div>
          <div className="inline-flex items-center gap-2 border-2 border-black bg-black px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.24em] text-[#fcee09]">
            <Crosshair className="h-3.5 w-3.5" />
            Battle Log
          </div>
          <h3 className="mt-3 font-black uppercase italic leading-none text-3xl md:text-4xl">
            Action Timeline
          </h3>
        </div>
        <div className="flex items-center gap-3 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-black">
          <span>{timelineActions.length} Entries</span>
          <span className="inline-flex items-center gap-1 border-2 border-black bg-[#d8c900] px-2 py-1">
            Swipe
            <MoveRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
      
      <div className="relative">
        <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-1 bg-black md:block" />
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 pt-1 [-webkit-overflow-scrolling:touch]">
          {timelineActions.map((action) => (
            <BattleActionCard key={action.id} action={action} />
          ))}
          <article className="industrial-clip-sm relative min-h-[210px] w-[260px] shrink-0 snap-start border-[4px] border-black bg-[#d8c900] p-3 text-black">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[9px] font-black uppercase tracking-[0.24em] text-black/70">
                Oracle
              </div>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="mt-5 font-black uppercase italic leading-none text-2xl text-black">
              {roundStatus === "settled" ? "Winner Declared" : "Settlement Pending"}
            </div>
            <div className="mt-4 text-xs font-black uppercase leading-relaxed tracking-wide text-black/65">
              {roundStatus === "settled"
                ? `${winnerName ?? "Winner"} proof ready`
                : "Record will be anchored after the result is sealed."}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
