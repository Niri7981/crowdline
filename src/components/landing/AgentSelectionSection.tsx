"use client";

import {
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  formatLandingBrain,
  type LandingAgent,
} from "@/lib/landing/use-landing-agents";
import { AgentCard } from "./AgentCard";
import { Crown, Plus, Swords, X, Zap } from "lucide-react";

interface AgentSelectionSectionProps {
  agents: LandingAgent[];
  errorMessage: string | null;
  isLoading: boolean;
  onAgentCreated: () => Promise<void>;
  selectedAgentIds: string[];
  onSelectAgent: (id: string) => void;
}

type ExternalAgentForm = {
  avatarSeed: string;
  endpointUrl: string;
  name: string;
  riskProfile: "low" | "medium" | "high";
  style: string;
  tagline: string;
};

const AVATAR_PRESETS = [
  { accent: "#39ff14", label: "Neon", value: "external-neon" },
  { accent: "#00eaff", label: "Cyan", value: "external-cyan" },
  { accent: "#ff1f2d", label: "Red", value: "external-red" },
  { accent: "#fbbf24", label: "Gold", value: "external-gold" },
];

export function AgentSelectionSection({
  agents,
  errorMessage,
  isLoading,
  onAgentCreated,
  selectedAgentIds,
  onSelectAgent,
}: AgentSelectionSectionProps) {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const selectedAgents = selectedAgentIds
    .map((agentId) => agents.find((agent) => agent.id === agentId))
    .filter((agent): agent is LandingAgent => Boolean(agent));
  const posterAgents = agents;

  return (
    <section id="agents" className="relative min-h-screen overflow-hidden bg-[#fcee09] py-24 text-black md:py-28">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#fcee09_0%,#fcee09_58%,#d8c900_100%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(90deg,rgba(0,0,0,.18)_1px,transparent_1px),linear-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute left-[-8%] top-0 h-full w-[24%] -skew-x-12 border-r-[6px] border-black bg-[#d8c900]/60" />
      <div className="absolute right-0 top-16 hidden h-[calc(100%-4rem)] w-24 border-l-[6px] border-black bg-[#d8c900] lg:block" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-12rem)] max-w-[1580px] flex-col justify-center gap-10 px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto flex flex-col items-center space-y-5 text-center"
        >
          <div
            className="inline-flex items-center gap-3 border-2 border-black bg-[#fcee09] px-4 py-2 text-[11px] font-black text-black shadow-[8px_8px_0_rgba(0,0,0,0.65)]"
            style={{
              color: "#050505",
              fontFamily: "monospace",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              WebkitTextFillColor: "#050505",
            }}
          >
            <Crown className="h-4 w-4" />
            {"/// AGENT.MODULE"}
            <span>SELECTING...</span>
          </div>
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center">
              <h2
                className="font-black italic"
                style={{
                  fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
                  fontSize: "clamp(76px, 12vw, 168px)",
                  letterSpacing: "0",
                  lineHeight: 0.82,
                  textTransform: "uppercase",
                  WebkitTextFillColor: "#050505",
                }}
              >
                CHOOSE YOUR
                <br />
                AGENT.
              </h2>
              <p
                className="mt-5 text-xl font-black uppercase leading-none text-black md:text-2xl"
                style={{ WebkitTextFillColor: "#050505" }}
              >
                Pick two public identities.
              </p>
            </div>
            {selectedAgents.length > 0 ? (
              <SelectedAgentDossier agents={selectedAgents} />
            ) : null}
          </div>
        </motion.div>

        <div
          className="relative border-[6px] border-black bg-[#fcee09] p-4 text-black shadow-[18px_18px_0_rgba(0,0,0,0.38)] md:p-7"
          style={{ backgroundColor: "#fcee09", color: "#050505", WebkitTextFillColor: "#050505" }}
        >
          <div className="mb-6 flex flex-col gap-3 border-b-[6px] border-[#fcee09] pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div
                className="mb-2 text-[10px] font-black text-black"
                style={{ fontFamily: "monospace", letterSpacing: "0.22em", textTransform: "uppercase", WebkitTextFillColor: "#050505" }}
              >
                Live Agent Pool
              </div>
              <h3
                className="font-black italic leading-none text-black"
                style={{
                  fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
                  fontSize: "clamp(42px, 6vw, 86px)",
                  textTransform: "uppercase",
                  WebkitTextFillColor: "#050505",
                }}
              >
                SELECT TWO AGENTS
              </h3>
            </div>
            <div className="text-[10px] font-black text-black" style={{ fontFamily: "monospace", letterSpacing: "0.22em", textTransform: "uppercase", WebkitTextFillColor: "#050505" }}>
              {selectedAgentIds.length}/2 LOCKED · {posterAgents.length} PUBLIC IDENTITIES ONLINE.
            </div>
          </div>

          {isLoading ? (
            <AgentPoolState label="Loading live agent pool..." />
          ) : errorMessage ? (
            <AgentPoolState label={errorMessage} tone="error" />
          ) : posterAgents.length === 0 ? (
            <AgentPoolState label="No public agents online." />
          ) : (
            <div className="relative flex flex-wrap justify-center gap-8 overflow-visible px-2 pb-10 pt-6">
              {posterAgents.map((agent) => (
                <div key={agent.id} className="shrink-0 snap-start">
                  <AgentCard
                    agent={agent}
                    isSelected={selectedAgentIds.includes(agent.id)}
                    onSelect={onSelectAgent}
                    selectedSlot={
                      selectedAgentIds.includes(agent.id)
                        ? selectedAgentIds.indexOf(agent.id) + 1
                        : null
                    }
                  />
                </div>
              ))}
              <div className="shrink-0 snap-start">
                <AddAgentCard onClick={() => setIsCreatorOpen(true)} />
              </div>
            </div>
          )}
        </div>
      </div>

      {isCreatorOpen ? (
        <ExternalAgentCreatorModal
          onAgentCreated={onAgentCreated}
          onClose={() => setIsCreatorOpen(false)}
        />
      ) : null}
    </section>
  );
}

function AddAgentCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -10, rotateZ: -1 }}
      className="block border-0 bg-transparent p-0 text-left outline-none"
    >
      <article
        className="industrial-clip relative flex flex-col items-center justify-center overflow-hidden border-4 border-dashed border-black bg-[#fcee09] text-black shadow-[10px_10px_0_rgba(0,0,0,0.72)] transition hover:bg-black hover:text-[#fcee09]"
        style={{
          height: "clamp(520px, 58vw, 650px)",
          width: "clamp(280px, 31vw, 360px)",
        }}
      >
        <div className="absolute inset-5 border-4 border-black/80" />
        <div className="relative z-10 flex h-28 w-28 items-center justify-center border-[6px] border-black bg-[#fcee09] text-black">
          <Plus className="h-16 w-16" />
        </div>
        <div className="relative z-10 mt-8 text-center">
          <div className="font-mono text-[10px] font-black uppercase tracking-[0.24em]">
            Bring Your Own
          </div>
          <div
            className="mt-3 font-black uppercase italic leading-none"
            style={{
              fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
              fontSize: "clamp(48px, 6vw, 78px)",
            }}
          >
            Agent
          </div>
          <div className="mt-4 px-8 text-sm font-black uppercase leading-snug">
            Create a public competitor identity and connect your webhook runtime.
          </div>
        </div>
      </article>
    </motion.button>
  );
}

function ExternalAgentCreatorModal({
  onAgentCreated,
  onClose,
}: {
  onAgentCreated: () => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ExternalAgentForm>({
    avatarSeed: "external-neon",
    endpointUrl: "",
    name: "",
    riskProfile: "medium",
    style: "Webhook strategist",
    tagline: "A builder-owned arena agent competing through external runtime.",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/agents/external", {
          body: JSON.stringify(form),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;

          throw new Error(payload?.error ?? "Failed to create external agent.");
        }

        await onAgentCreated();
        onClose();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to create external agent.",
        );
      }
    });
  }

  return createPortal(
    <div
      className="flex items-center justify-center px-4 py-8"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        bottom: 0,
        left: 0,
        position: "fixed",
        right: 0,
        top: 0,
        zIndex: 9999,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="industrial-clip max-h-[92vh] w-full max-w-4xl overflow-y-auto border-[6px] border-black bg-[#fcee09] p-5 text-black shadow-[18px_18px_0_rgba(0,0,0,0.72)] md:p-7"
        style={{
          backgroundColor: "#fcee09",
          border: "6px solid #050505",
          boxShadow: "18px 18px 0 rgba(0,0,0,0.72)",
          color: "#050505",
          maxHeight: "92vh",
          maxWidth: "920px",
          overflowY: "auto",
          padding: "28px",
          width: "100%",
          WebkitTextFillColor: "#050505",
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b-[5px] border-black pb-4">
          <div>
            <div className="inline-flex items-center gap-2 border-2 border-black bg-black px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.22em] text-[#fcee09]">
              <Zap className="h-3.5 w-3.5" />
              External Agent Entry
            </div>
            <h3
              className="mt-3 font-black uppercase italic leading-none"
              style={{
                fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
                fontSize: "clamp(46px, 7vw, 92px)",
              }}
            >
              Build Your Agent
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-[3px] border-black bg-[#fcee09] p-3 text-black"
            aria-label="Close external agent creator"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-[4px] border-black bg-[#fcee09] p-4">
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.22em]">
              Avatar Preset
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      avatarSeed: preset.value,
                    }))
                  }
                  className={`border-[3px] p-3 text-left font-mono text-[10px] font-black uppercase tracking-[0.18em] ${
                    form.avatarSeed === preset.value
                      ? "border-black bg-black text-[#fcee09]"
                      : "border-black bg-[#fcee09] text-black"
                  }`}
                >
                  <span
                    className="mb-3 block h-12 w-12 border-[3px] border-black"
                    style={{ backgroundColor: preset.accent }}
                  />
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="mt-5 border-[4px] border-black bg-black p-4 text-[#fcee09]">
              <div className="font-mono text-[8px] font-black uppercase tracking-[0.22em]">
                Card Preview
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div
                  className="flex h-20 w-20 items-center justify-center border-[4px] border-[#fcee09] bg-[#111111]"
                  style={{
                    color:
                      AVATAR_PRESETS.find(
                        (preset) => preset.value === form.avatarSeed,
                      )?.accent ?? "#39ff14",
                  }}
                >
                  <Zap className="h-10 w-10" />
                </div>
                <div>
                  <div className="font-black uppercase italic leading-none text-3xl text-white">
                    {form.name || "Your Agent"}
                  </div>
                  <div className="mt-2 font-mono text-[9px] font-black uppercase tracking-[0.18em]">
                    {form.style || "Custom Style"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <CreatorField label="Agent Name">
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Circuit Oracle"
                className="w-full border-[3px] border-black bg-[#fcee09] px-4 py-3 font-black uppercase text-black outline-none"
              />
            </CreatorField>

            <CreatorField label="Webhook Endpoint">
              <input
                required
                type="url"
                value={form.endpointUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endpointUrl: event.target.value,
                  }))
                }
                placeholder="https://your-agent.com/agentduel/decide"
                className="w-full border-[3px] border-black bg-[#fcee09] px-4 py-3 font-black text-black outline-none"
              />
            </CreatorField>

            <CreatorField label="Best At / Style">
              <input
                required
                value={form.style}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    style: event.target.value,
                  }))
                }
                placeholder="News reaction / macro signals / contrarian reads"
                className="w-full border-[3px] border-black bg-[#fcee09] px-4 py-3 font-black uppercase text-black outline-none"
              />
            </CreatorField>

            <CreatorField label="Risk Profile">
              <select
                value={form.riskProfile}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    riskProfile: event.target.value as ExternalAgentForm["riskProfile"],
                  }))
                }
                className="w-full border-[3px] border-black bg-[#fcee09] px-4 py-3 font-black uppercase text-black outline-none"
              >
                <option value="low">Conservative</option>
                <option value="medium">Balanced</option>
                <option value="high">Aggressive</option>
              </select>
            </CreatorField>

            <CreatorField label="Tagline">
              <input
                required
                value={form.tagline}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tagline: event.target.value,
                  }))
                }
                className="w-full border-[3px] border-black bg-[#fcee09] px-4 py-3 font-black text-black outline-none"
              />
            </CreatorField>

            {errorMessage ? (
              <div className="border-[3px] border-black bg-[#ff1f2d] px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-black">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="industrial-clip-sm mt-2 border-[4px] border-black bg-black px-6 py-4 font-mono text-[11px] font-black uppercase tracking-[0.22em] text-[#fcee09] disabled:opacity-60"
            >
              {isPending ? "Creating Agent..." : "Add Agent To Arena"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
}

function CreatorField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[9px] font-black uppercase tracking-[0.22em]">
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectedAgentDossier({ agents }: { agents: LandingAgent[] }) {
  return (
    <motion.div
      key={agents.map((agent) => agent.id).join("-")}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      className="industrial-clip hidden border-4 border-black bg-[#050505] p-5 text-white shadow-[12px_12px_0_rgba(0,0,0,0.28)] lg:block"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black" style={{ color: agents[0]?.accent ?? "#fcee09", fontFamily: "monospace", letterSpacing: "0.22em", textTransform: "uppercase" }}>
          <Swords className="h-4 w-4" />
          Duel Pair
        </div>
        <div className="bg-[#fcee09] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-black">
          {agents.length}/2
        </div>
      </div>
      <div className="grid gap-3">
        {agents.map((agent, index) => (
          <div key={agent.id} className="border-2 border-[#fcee09] bg-[#151515] p-3">
            <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#fcee09]">
              Agent {index === 0 ? "A" : "B"}
            </div>
            <h3 className="font-black italic leading-none text-white" style={{ fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif", fontSize: "40px", textTransform: "uppercase" }}>{agent.codename}</h3>
            <div className="mt-2 text-xl font-black uppercase leading-none" style={{ color: agent.accent }}>
              {agent.archetype}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {agents.length === 2 ? (
          <DossierTag label="Status" value="Duel Armed" emphasis />
        ) : (
          <DossierTag label="Status" value="Pick Rival" emphasis />
        )}
        {agents.map((agent) => (
          <DossierTag key={agent.id} label={agent.codename} value={formatLandingBrain(agent)} />
        ))}
      </div>
    </motion.div>
  );
}

function DossierTag({
  emphasis = false,
  label,
  value,
}: {
  emphasis?: boolean;
  label: string;
  value: string;
}) {
  return (
    <span
      className={`border-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${
        emphasis
          ? "border-[#fcee09] bg-[#fcee09] text-black"
          : "border-[#fcee09] bg-[#151515] text-white"
      }`}
    >
      {label}: {value}
    </span>
  );
}

function AgentPoolState({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={`mx-auto my-10 max-w-xl border-4 p-8 text-center text-xs font-black uppercase tracking-[0.22em] ${
        tone === "error"
          ? "border-[#ff1f2d] bg-[#210608] text-[#ff9aa2]"
          : "border-[#fcee09] bg-[#111111] text-white"
      }`}
      style={{ fontFamily: "monospace" }}
    >
      {label}
    </div>
  );
}
