"use client";

import { AgentSummary } from "@/lib/types/agent";
import { RoundAction } from "@/lib/types/action";
import { BankrollBalance } from "@/lib/types/round";
import { getLandingAgentVisual } from "@/lib/landing/agent-visual-config";
import { Brain, MessageSquareText, Radar, Shield, Swords, TrendingUp } from "lucide-react";

interface AgentBattleCardProps {
  agent: AgentSummary;
  action?: RoundAction;
  balance?: BankrollBalance;
  isDefeated?: boolean;
  isWinner?: boolean;
  side: "left" | "right";
}

function formatBrainLabel(brain: AgentSummary["brain"]) {
  if (!brain) {
    return "Rules • internal";
  }

  if (brain.provider === "rules") {
    return `Rules • ${brain.model}`;
  }

  const providerLabel =
    brain.provider === "openai"
      ? "OpenAI"
      : brain.provider === "anthropic"
        ? "Anthropic"
        : brain.provider === "mock"
          ? "Mock"
          : brain.provider;

  return `${providerLabel} • ${brain.model}`;
}

function formatRuntimeLabel(action: RoundAction | undefined, brain: AgentSummary["brain"]) {
  const provider = action?.runtime?.executionProvider;
  const model = action?.runtime?.executionModel;

  if (provider && model) {
    return `${provider} / ${model}`;
  }

  return formatBrainLabel(brain);
}

export function AgentBattleCard({
  agent,
  action,
  balance,
  isDefeated = false,
  isWinner = false,
  side,
}: AgentBattleCardProps) {
  const isMomentum = agent.id === "momentum" || agent.id === "agent-momentum";
  const isContrarian = agent.id === "contrarian" || agent.id === "agent-contrarian";
  const themeColor = isMomentum ? "#ff1f2d" : "#39ff14";
  const archetype = isMomentum ? "AGGRO" : isContrarian ? "SLY" : "SIGNAL";
  
  const Icon = isMomentum ? TrendingUp : isContrarian ? Shield : Radar;
  const imageSrc = getRoundAgentImage(agent.id);
  const runtimeLabel = formatRuntimeLabel(action, agent.brain);

  return (
    <article
      className="industrial-clip relative mx-auto h-full w-full min-w-0 max-w-[380px] overflow-hidden border-[3px] bg-[#fcee09] text-black transition duration-300 md:border-[5px]"
      style={{
        borderColor: themeColor,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-3" style={{ backgroundColor: themeColor }} />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-1 border-b-[3px] border-black bg-[#d8c900] p-1.5 md:gap-2 md:border-b-[4px] md:p-5">
          <div className="min-w-0">
            <div className="truncate font-mono text-[6px] font-black uppercase tracking-[0.08em] md:text-[9px] md:tracking-[0.28em]" style={{ color: themeColor }}>
              {side === "left" ? "Left Contender" : "Right Contender"}
            </div>
            <h3
              className="mt-1 truncate font-black uppercase leading-none tracking-tight text-[clamp(13px,2.4vw,38px)]"
              style={{ color: "#050505", fontStyle: "italic", transform: "skewX(-8deg)" }}
            >
              {agent.name}
            </h3>
            <div className="mt-1 inline-flex border-2 border-black px-1.5 py-0.5 font-mono text-[7px] font-black uppercase tracking-[0.12em] text-black md:mt-2 md:px-3 md:py-1 md:text-[10px] md:tracking-[0.24em]" style={{ backgroundColor: themeColor }}>
              {archetype}
            </div>
          </div>
          <div className="hidden border-[3px] bg-black p-2 sm:block md:p-3" style={{ borderColor: themeColor }}>
            <Icon className="h-5 w-5 md:h-7 md:w-7" style={{ color: themeColor }} />
          </div>
        </div>

        <div
          className="relative flex items-center justify-center overflow-hidden border-b-[5px] border-black bg-[#151515]"
          style={{ height: "clamp(120px, 19vw, 300px)" }}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={agent.name}
              className="relative z-10 object-contain contrast-125 saturate-125"
              style={{
                height: "92%",
                maxWidth: "92%",
                width: "auto",
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon className="h-32 w-32" style={{ color: themeColor }} />
            </div>
          )}
          
          {action && (
            <div
              className={`absolute bottom-3 ${side === "left" ? "right-3" : "left-3"} border-[3px] border-black px-3 py-2 md:bottom-5 md:px-6 md:py-3`}
              style={{ backgroundColor: action.side === "yes" ? "#39ff14" : "#ff1f2d" }}
            >
              <span className="font-black italic uppercase leading-none text-black text-lg md:text-3xl">
                {action.side.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="mx-auto grid w-full max-w-[210px] gap-1.5 p-1.5 md:max-w-[260px] md:gap-3 md:p-5">
          <BattleStat label="Style" value={agent.style} />
          <BattleStat label="Risk" value={agent.riskProfile} accent={themeColor} />
          <BattleStat label="Brain" value={formatBrainLabel(agent.brain)} icon={<Brain className="h-3 w-3 md:h-4 md:w-4" />} />
          <BattleStat label="Bankroll" value={`${balance?.usdc.toFixed(2) ?? "0.00"} USDC`} />
          <BattleStat label="Status" value={action ? "Ready" : "Loading"} />
        </div>

        {action ? (
          <div className="mx-auto w-full max-w-[320px] px-1.5 pb-2 md:px-5 md:pb-4">
            <div className="border-[2px] border-black bg-[#fcee09] p-2 text-black md:border-[3px] md:p-3">
              <div className="flex items-center justify-between gap-2 border-b-[2px] border-black pb-1.5 font-mono text-[7px] font-black uppercase tracking-[0.12em] md:text-[8px] md:tracking-[0.2em]">
                <span className="flex items-center gap-1.5">
                  <MessageSquareText className="h-3 w-3 md:h-4 md:w-4" />
                  Brain Reason
                </span>
                <span className="truncate" style={{ color: themeColor }}>
                  {runtimeLabel}
                </span>
              </div>
              <p className="mt-2 line-clamp-4 text-[9px] font-black uppercase leading-relaxed tracking-wide text-black md:text-[11px]">
                {action.reason}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-1 border-t-[3px] border-black bg-[#d8c900] px-1.5 py-2 md:gap-2 md:border-t-[4px] md:px-5 md:py-4">
          <div className="flex items-center gap-1 font-mono text-[7px] font-black uppercase tracking-[0.14em] md:gap-2 md:text-[9px] md:tracking-[0.2em]" style={{ color: themeColor }}>
            <Swords className="h-3 w-3 md:h-4 md:w-4" />
            {isWinner ? "Identity Earned" : isDefeated ? "Defeated" : <><span className="hidden sm:inline">Identity</span> Ready</>}
          </div>
          <div className="text-[9px] font-black italic uppercase text-black md:text-base">
            {action ? `${action.sizeUsd.toFixed(2)} USDC` : "Pending"}
          </div>
        </div>
      </div>
    </article>
  );
}

function getRoundAgentImage(agentId: string) {
  const identityKeyByLegacyId: Record<string, string> = {
    contrarian: "agent-contrarian",
    macro: "agent-macro",
    momentum: "agent-momentum",
    news: "agent-news",
    quant: "agent-quant",
  };
  const identityKey = identityKeyByLegacyId[agentId] ?? agentId;
  const visual = getLandingAgentVisual(identityKey);

  return visual.image || null;
}

function BattleStat({
  accent = "#050505",
  icon,
  label,
  value,
}: {
  accent?: string;
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-1 items-center border-[2px] border-black bg-[#fcee09] text-center md:border-[3px]">
      <div className="flex items-center justify-center gap-1 border-b-[2px] border-black px-1.5 py-1 font-mono text-[6px] font-black uppercase tracking-[0.08em] text-black md:px-3 md:py-2 md:text-[8px] md:tracking-[0.2em]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="truncate px-1.5 py-1 text-[8px] font-black uppercase tracking-wide text-black md:px-3 md:py-2 md:text-xs lg:text-sm" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
