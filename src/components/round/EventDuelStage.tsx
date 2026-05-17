"use client";
import { ArenaEvent } from "@/lib/types/event";
import { Crosshair } from "lucide-react";

interface EventDuelStageProps {
  event: ArenaEvent;
  leftAgentName?: string;
  rightAgentName?: string;
  roundStatus: "live" | "settled";
}

export function EventDuelStage({
  event,
  leftAgentName = "Momentum",
  rightAgentName = "Contrarian",
  roundStatus,
}: EventDuelStageProps) {
  return (
    <div className="industrial-clip relative flex h-full min-h-[420px] min-w-0 flex-col justify-between overflow-hidden border-[3px] border-black bg-[#fcee09] p-2 text-center text-black md:border-[5px] md:p-5">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(0,0,0,.18)_1px,transparent_1px),linear-gradient(rgba(0,0,0,.14)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative z-10">
        <div className="mx-auto inline-flex items-center gap-1 border-[3px] border-black bg-black px-1.5 py-1 font-mono text-[7px] font-black uppercase tracking-[0.1em] text-[#fcee09] md:gap-2 md:px-4 md:py-2 md:text-[10px] md:tracking-[0.24em]">
          <Crosshair className="h-3 w-3 md:h-4 md:w-4" />
          Objective
        </div>
        <h2 className="mx-auto mt-3 max-w-2xl font-black uppercase leading-none tracking-tight text-[clamp(16px,3.2vw,64px)] md:mt-6">
          {event.question}
        </h2>
      </div>

      <div className="relative z-10 my-4 grid items-center gap-2 md:grid-cols-[1fr_auto_1fr] md:gap-3">
        <FactionName color="#ff1f2d" name={leftAgentName} />
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center border-[4px] border-black bg-black text-[#fcee09] md:h-36 md:w-36 md:border-[6px]">
          <div className="absolute inset-1 border-2 border-[#fcee09] md:inset-2 md:border-[3px]" />
          <div className="font-black italic leading-none tracking-tighter text-3xl md:text-7xl">VS</div>
        </div>
        <FactionName color="#39ff14" name={rightAgentName} />
      </div>

      <div className="relative z-10 grid gap-3 sm:grid-cols-2">
        <HudTag label="Round State" value={roundStatus} tone="#00eaff" />
        <HudTag label="Resolution Source" value={event.resolutionSource} tone="#fcee09" />
        <HudTag label="Win Rule" value="Match Outcome" tone="#ffb000" />
        <HudTag label="Outcome" value={event.outcome === "pending" ? "Pending" : event.outcome} tone="#39ff14" />
      </div>
    </div>
  );
}

function FactionName({ color, name }: { color: string; name: string }) {
  return (
    <div className="border-[2px] border-black bg-[#d8c900] px-1.5 py-2 shadow-[6px_6px_0_rgba(0,0,0,0.32)] md:border-[4px] md:px-4 md:py-5">
      <div className="font-mono text-[6px] font-black uppercase tracking-[0.08em] md:text-[9px] md:tracking-[0.24em]" style={{ color }}>
        Combatant
      </div>
      <div className="mt-1 truncate font-black uppercase italic leading-none text-[11px] text-black md:mt-2 md:text-3xl">
        {name}
      </div>
    </div>
  );
}

function HudTag({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <div className="border-[2px] border-black bg-[#d8c900] p-2 text-left md:border-[3px] md:p-3">
      <div className="font-mono text-[6px] font-black uppercase tracking-[0.08em] text-black/70 md:text-[8px] md:tracking-[0.2em]">
        {label}
      </div>
      <div className="mt-1 truncate text-[8px] font-black uppercase tracking-wide md:text-sm" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}
