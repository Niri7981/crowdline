"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  formatLandingBrain,
  type LandingAgent,
} from "@/lib/landing/use-landing-agents";
import { Flame, Radar, Shield, Trophy, Zap, Lock } from "lucide-react";

interface AgentCardProps {
  agent: LandingAgent;
  isSelected: boolean;
  onSelect: (id: string) => void;
  selectedSlot?: number | null;
}

export function AgentCard({
  agent,
  isSelected,
  onSelect,
  selectedSlot,
}: AgentCardProps) {
  return (
    <AgentCardFront
      agent={agent}
      isSelected={isSelected}
      onSelect={onSelect}
      selectedSlot={selectedSlot}
    />
  );
}

export function AgentCardFront({
  agent,
  isSelected,
  onSelect,
  selectedSlot,
}: AgentCardProps) {
  const [imageLoaded, setImageLoaded] = useState(true);

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(agent.id)}
      animate={{
        scale: isSelected ? 1.08 : 0.96,
        y: isSelected ? -16 : 0,
        rotateZ: isSelected
          ? agent.identityKey === "agent-momentum"
            ? -1
            : 1
          : 0,
        opacity: isSelected ? 1 : 0.72,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      className="block cursor-pointer border-0 bg-transparent p-0 text-left outline-none"
      style={{ zIndex: isSelected ? 20 : 1 }}
    >
      <article
        style={{
          backgroundColor: "#fcee09",
          color: "#050505",
          height: "clamp(520px, 58vw, 650px)",
          width: "clamp(280px, 31vw, 360px)",
          WebkitTextFillColor: "#050505",
        }}
        className={`industrial-clip relative overflow-hidden text-left shadow-[10px_10px_0_rgba(0,0,0,0.72)] outline-none transition-all duration-300 ${
          isSelected
            ? "border-4 border-[#fcee09] bg-[#050505] shadow-[0_20px_50px_rgba(252,238,9,0.2)]"
            : "border-4 border-black bg-[#050505] hover:border-[#fcee09]"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            borderColor: isSelected ? agent.accent : undefined,
            boxShadow: isSelected ? `inset 0 0 0 3px ${agent.accent}, 0 0 70px ${agent.color}55` : undefined,
          }}
        />
        <div className="absolute inset-x-0 top-0 h-2" style={{ backgroundColor: agent.color }} />
        <div className="absolute inset-0 opacity-35" style={{ background: `radial-gradient(circle at 50% 34%, ${agent.color}55, transparent 45%)` }} />
        <div className="scanline absolute inset-0 opacity-18" />

        <div className="relative z-10 flex h-full flex-col">
          <div
            className="relative flex shrink-0 items-center justify-center overflow-hidden border-b-4 border-black bg-[#151515]"
            style={{ height: "64%" }}
          >
            <div className="absolute inset-x-6 bottom-6 h-16 skew-y-[-5deg] border-4 border-[#202326] bg-[#050505]" />
            {agent.image && imageLoaded ? (
              <img
                src={agent.image}
                alt={agent.name}
                onError={() => setImageLoaded(false)}
                className="relative z-10 object-contain drop-shadow-[0_12px_14px_rgba(0,0,0,0.72)]"
                style={{
                  maxHeight: "94%",
                  maxWidth: "94%",
                  width: "auto",
                  height: "auto",
                }}
              />
            ) : (
              <div className="relative z-10 flex h-32 w-32 items-center justify-center border-4 bg-[#050505]" style={{ borderColor: agent.color }}>
                <AgentFallbackIcon agentId={agent.identityKey} color={agent.accent} />
              </div>
            )}
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col justify-between space-y-2 bg-[#fcee09] p-4 text-black"
            style={{
              backgroundColor: "#fcee09",
              color: "#050505",
              WebkitTextFillColor: "#050505",
            }}
          >
            <div>
              <h3
                className="font-black italic leading-none text-black"
                style={{
                  fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
                  fontSize: "clamp(34px, 3.8vw, 52px)",
                  textTransform: "uppercase",
                  WebkitTextFillColor: "#050505",
                }}
              >
                {agent.codename}
              </h3>
              <p className="mt-1.5 text-lg font-black uppercase leading-none text-black" style={{ WebkitTextFillColor: "#050505" }}>
                {agent.archetype}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <AgentStat label="Risk" value={agent.riskLabel} />
              <AgentStat label="Win Rate" value={agent.winRate} />
              <AgentStat label="Streak" value={`${agent.streak}W`} />
              <AgentStat label="Rank" value={`#${agent.rank}`} />
              <AgentStat label="Brain" value={formatLandingBrain(agent)} wide />
            </div>

            <div className="flex items-center justify-between border-t-2 border-[#202326] pt-3">
              <div
                className="flex items-center gap-2 text-[10px] font-black text-black transition-colors"
                style={{ fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", WebkitTextFillColor: "#050505" }}
              >
                {isSelected ? (
                  <>
                    <Lock className="h-4 w-4" />
                    {selectedSlot === 2 ? "LOCKED B" : "LOCKED A"}
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4" />
                    Select Agent
                  </>
                )}
              </div>
              <Zap
                className={`h-5 w-5 transition-transform duration-500 ${isSelected ? "scale-125 rotate-12" : ""}`}
                style={{ color: "#050505" }}
              />
            </div>
          </div>
        </div>
      </article>
    </motion.button>
  );
}

function AgentStat({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`min-h-[48px] border-2 bg-[#fcee09] p-1.5 text-black ${
        wide ? "col-span-2 border-black" : "border-black"
      }`}
      style={{ backgroundColor: "#fcee09", color: "#050505", WebkitTextFillColor: "#050505" }}
    >
      <div
        className="mb-1 text-[7px] font-black text-black"
        style={{
          fontFamily: "monospace",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          WebkitTextFillColor: "#050505",
        }}
      >
        {label}
      </div>
      <div className="line-clamp-2 text-[10px] font-black uppercase leading-tight text-black">
        {value}
      </div>
    </div>
  );
}

function AgentFallbackIcon({ agentId, color }: { agentId: string; color: string }) {
  if (agentId === "agent-momentum") {
    return <Flame className="h-24 w-24" style={{ color }} />;
  }

  if (agentId === "agent-contrarian") {
    return <Shield className="h-24 w-24" style={{ color }} />;
  }

  return <Radar className="h-24 w-24" style={{ color }} />;
}
