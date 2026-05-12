"use client";

import { RefreshCw, Swords } from "lucide-react";

interface RoundArenaHeaderProps {
  roundId: string;
  question: string;
  isSettled: boolean;
  onRefresh: () => void;
  onSettle: () => void;
  isRefreshing: boolean;
  isSettling: boolean;
  showBusyState: boolean;
}

export function RoundArenaHeader({
  roundId,
  question,
  isSettled,
  onRefresh,
  onSettle,
  isRefreshing,
  isSettling,
  showBusyState,
}: RoundArenaHeaderProps) {
  return (
    <header
      className="relative z-20 border-b-[6px] border-black px-4 py-4 text-black shadow-[0_10px_0_rgba(0,0,0,0.18)] md:px-8"
      style={{ backgroundColor: "#fcee09" }}
    >
      <div className="mx-auto grid max-w-[1800px] gap-4 lg:grid-cols-[320px_1fr_360px] lg:items-center">
        <div className="flex items-center gap-4">
          <div className="industrial-clip-sm border-2 border-[#fcee09] bg-[#fcee09] px-3 py-2 text-black">
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.26em]">
              Live Arena
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black italic leading-none tracking-tight text-black">
              AGENT<span className="text-[#ff1f2d]">DUEL</span>
            </h1>
            <div className="mt-1 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-black/75">
              NODE {roundId.slice(0, 8)}
            </div>
          </div>
        </div>

        <div
          className="industrial-clip border-4 px-5 py-4 text-center shadow-[8px_8px_0_#000]"
          style={{ backgroundColor: "#d8c900", borderColor: "#050505" }}
        >
          <div className="font-mono text-[9px] font-black uppercase tracking-[0.26em] text-black/70">
            Battle Round
          </div>
          <h2 className="mt-1 line-clamp-2 text-xl font-black uppercase leading-none tracking-wide text-black md:text-2xl">
            {question}
          </h2>
        </div>

        <div className="flex justify-start gap-3 lg:justify-end">
          <button
            onClick={onRefresh}
            disabled={showBusyState}
            className="industrial-clip-sm flex items-center gap-2 border-[3px] border-[#fcee09] bg-black px-5 py-3 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#fcee09] shadow-[6px_6px_0_#000] transition hover:-translate-y-0.5 hover:bg-[#fcee09] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            onClick={onSettle}
            disabled={showBusyState || isSettled}
            className={`industrial-clip-sm flex items-center gap-2 border-[3px] px-5 py-3 font-mono text-[10px] font-black uppercase tracking-[0.22em] shadow-[6px_6px_0_#000] transition ${
              isSettled
                ? "border-[#202326] bg-[#151515] text-neutral-500"
                : "border-black bg-[#fcee09] text-black hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#ff1f2d]"
            }`}
          >
            <Swords className="h-4 w-4" />
            {isSettling ? "Settling" : isSettled ? "Settled" : "Settle Duel"}
          </button>
        </div>
      </div>
    </header>
  );
}
