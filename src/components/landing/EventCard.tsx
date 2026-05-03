"use client";

import { motion } from "framer-motion";
import { LandingEvent } from "@/lib/mocks/landing-demo-data";
import { Crosshair, Database, LockKeyhole, SignalHigh, Target, Zap } from "lucide-react";

interface EventCardProps {
  event: LandingEvent;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function EventCard({ event, isSelected, onSelect }: EventCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(event.id)}
      whileHover={{ y: -8, scale: isSelected ? 1.035 : 1.02 }}
      animate={{ scale: isSelected ? 1.035 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`industrial-clip group relative min-h-[460px] min-w-[min(88vw,520px)] snap-start overflow-hidden text-left shadow-[12px_12px_0_rgba(0,0,0,0.55)] transition-colors md:min-w-[440px] lg:min-w-[500px] ${
        isSelected
          ? "border-[5px] border-[#39ff14] bg-[#050505] text-white"
          : "border-[5px] border-black bg-[#111111] text-white hover:border-[#fcee09]"
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-2 ${isSelected ? "bg-[#39ff14]" : "bg-[#fcee09]"}`} />
      <div className={`absolute right-0 top-0 border-b-[38px] border-l-[38px] border-b-transparent ${isSelected ? "border-l-[#39ff14]" : "border-l-[#fcee09]"}`} />
      <div className="scanline absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute inset-3 border-[3px] border-black" />
      <div
        className="pointer-events-none absolute inset-6 border-2"
        style={{ borderColor: isSelected ? "#39ff14" : "#00e5ff" }}
      />
      <div className="pointer-events-none absolute left-3 top-10 h-9 w-16 border-y-[3px] border-r-[3px] border-black" />
      <div className="pointer-events-none absolute bottom-3 right-10 h-10 w-20 border-l-[3px] border-t-[3px] border-black" />
      <div className="absolute inset-x-8 bottom-24 h-28 -skew-y-3 border-[3px] border-[#2b2b2b] bg-[#151515]" />

      <div className="relative flex min-h-[460px] flex-col justify-between p-6 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className={`flex items-center gap-2 text-[10px] font-black ${isSelected ? "text-[#39ff14]" : "text-[#fcee09]"}`}
              style={{ fontFamily: "monospace", letterSpacing: "0.22em", textTransform: "uppercase" }}
            >
              <Crosshair className="h-4 w-4" />
              Match Event
            </div>
            <div
              className="mt-2 inline-flex border border-[#2b2b2b] px-2 py-1 text-[8px] font-black text-white/45"
              style={{ fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase" }}
            >
              {event.category}
            </div>
          </div>
          <div
            className={`industrial-clip-sm border-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] ${
              isSelected ? "border-[#39ff14] bg-[#39ff14] text-black" : "border-[#fcee09] bg-[#fcee09] text-black"
            }`}
          >
            {event.status}
          </div>
        </div>

        <div className="py-8">
          <div
            className="mb-5 inline-flex items-center gap-2 border-2 border-[#fcee09] bg-[#fcee09] px-3 py-1.5 text-[10px] font-black text-black"
            style={{ fontFamily: "monospace", letterSpacing: "0.22em", textTransform: "uppercase" }}
          >
            <Target className="h-3.5 w-3.5" />
            ROUND
          </div>
          <h3
            className="font-black italic leading-none text-white"
            style={{
              fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
              fontSize: "clamp(42px, 5vw, 70px)",
              textTransform: "uppercase",
            }}
          >
            {event.shortQuestion}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <TicketStat icon={Database} label="Source" value={event.sourceShort} />
          <TicketStat icon={SignalHigh} label="Consensus" value={event.consensus} />
          <TicketStat icon={Zap} label="Risk" value={event.difficulty} />
          <TicketStat icon={Crosshair} label="Status" value={event.status} />
        </div>

        <div className="mt-7 flex items-center justify-between border-t-[3px] border-[#fcee09]/70 pt-4">
          <div className="text-[9px] font-black text-white/45" style={{ fontFamily: "monospace", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Lock Event
          </div>
          <div
            className={`flex items-center gap-2 text-[10px] font-black ${isSelected ? "text-[#39ff14]" : "text-[#fcee09]"}`}
            style={{ fontFamily: "monospace", letterSpacing: "0.22em", textTransform: "uppercase" }}
          >
            <LockKeyhole className="h-3.5 w-3.5" />
            {isSelected ? "Locked" : "Select"}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function TicketStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Crosshair;
  label: string;
  value: string;
}) {
  return (
    <div className="border-2 border-[#2b2b2b] bg-[#151515] px-3 py-2">
      <div className="mb-1 flex items-center gap-2 text-[8px] font-black text-white/40" style={{ fontFamily: "monospace", letterSpacing: "0.22em", textTransform: "uppercase" }}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-[11px] font-black uppercase tracking-wide text-white">
        {value}
      </div>
    </div>
  );
}
