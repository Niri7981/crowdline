"use client";

import { RoundAction } from "@/lib/types/action";
import { Brain, Clock, Crosshair, MessageSquareText, Workflow } from "lucide-react";

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
      className="industrial-clip-sm relative min-w-[280px] border-[4px] bg-[#111111] p-4 text-white"
      style={{ borderColor: themeColor }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-neutral-300">
          <Clock className="h-3.5 w-3.5" />
          {action.at}
        </div>
        <div className="border-2 border-black px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-black" style={{ backgroundColor: sideColor }}>
          {action.side}
        </div>
      </div>

      <div className="mt-4">
        <div className="font-mono text-[9px] font-black uppercase tracking-[0.24em]" style={{ color: themeColor }}>
          {action.agentName}
        </div>
        <div className="mt-2 font-black uppercase italic leading-none text-3xl text-white">
          {action.side === "yes" ? "Buy Yes" : "Fade Crowd"}
        </div>
        <div className="mt-3 text-xl font-black text-[#fcee09]">
          ${action.sizeUsd.toFixed(2)}
        </div>
      </div>

      <div className="mt-4 border-[3px] border-[#fcee09] bg-black p-3">
        <div className="flex items-center justify-between gap-3 border-b-2 border-[#fcee09] pb-2 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#fcee09]">
          <span className="flex items-center gap-2">
            <MessageSquareText className="h-3.5 w-3.5" />
            Model Output
          </span>
          <span className="flex min-w-0 items-center gap-1 truncate text-[#00eaff]">
            <Brain className="h-3 w-3 shrink-0" />
            <span className="truncate">{runtimeLabel}</span>
          </span>
        </div>
        <p className="mt-3 line-clamp-5 text-[11px] font-black uppercase leading-relaxed tracking-wide text-white">
          {action.reason}
        </p>
      </div>

      {action.trace.length > 0 ? (
        <div className="mt-4 border-t-2 border-[#202326] pt-3">
          <div className="mb-2 flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[#fcee09]">
            <Workflow className="h-3 w-3" />
            Runtime Trace
          </div>
          <ol className="space-y-2">
            {action.trace.slice(0, 3).map((step) => (
              <li key={step.id} className="grid grid-cols-[auto_1fr] gap-2">
                <span className="mt-0.5 h-2 w-2 border border-black bg-[#fcee09]" />
                <div className="min-w-0">
                  <div className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-[#00eaff]">
                    {step.phase} / {step.title}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[10px] font-bold uppercase leading-relaxed text-neutral-300">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
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
            side: "yes" as const,
            sizeUsd: 0,
            trace: [],
          },
        ];

  return (
    <section className="industrial-clip border-[6px] border-black bg-[#050505] p-5 text-white">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b-[4px] border-[#fcee09] pb-4">
        <div>
          <div className="inline-flex items-center gap-2 border-2 border-[#fcee09] px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.24em] text-[#fcee09]">
            <Crosshair className="h-3.5 w-3.5" />
            Battle Log
          </div>
          <h3 className="mt-3 font-black uppercase italic leading-none text-4xl">
            Action Timeline
          </h3>
        </div>
        <span className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-[#00eaff]">
          {timelineActions.length} Entries Recorded
        </span>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-3">
        {timelineActions.map((action) => (
          <BattleActionCard key={action.id} action={action} />
        ))}
        <article className="industrial-clip-sm min-w-[280px] border-[4px] border-[#ffb000] bg-[#111111] p-4 text-white">
          <div className="font-mono text-[9px] font-black uppercase tracking-[0.24em] text-[#ffb000]">
            Oracle
          </div>
          <div className="mt-3 font-black uppercase italic leading-none text-3xl text-white">
            {roundStatus === "settled" ? "Winner Declared" : "Settlement Pending"}
          </div>
          <div className="mt-4 text-sm font-black uppercase tracking-wide text-neutral-300">
            {roundStatus === "settled"
              ? `${winnerName ?? "Winner"} proof ready`
              : "Record will be anchored"}
          </div>
        </article>
      </div>
    </section>
  );
}
