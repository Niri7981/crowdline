import type {
  AgentDecisionExecution,
  AgentDecisionTraceStep,
} from "@/lib/runtime/agents/types";
import type { AgentPoolRiskProfile } from "@/lib/server/agents/types";
import type { ArenaEvent } from "@/lib/types/event";

export type AgentRuntimeBrain = {
  model: string | null;
  provider: "anthropic" | "external" | "mock" | "openai" | "rules" | null;
};

export type AgentRuntimeParticipant = {
  brain: AgentRuntimeBrain;
  identityKey: string;
  externalEndpointUrl: string | null;
  name: string;
  riskProfile: AgentPoolRiskProfile;
  roundAgentId: string;
  runtimeKey: string;
  style: string;
};

export type AgentRuntimeDecisionInput = {
  agent: AgentRuntimeParticipant;
  bankrollUsd: number;
  currentPrice: number;
  event: ArenaEvent;
  opponents: AgentRuntimeParticipant[];
  roundId: string;
};

export type AgentRuntimeDecision = {
  brainModel: string | null;
  brainProvider: AgentRuntimeBrain["provider"];
  executionModel: string | null;
  executionProvider: AgentDecisionExecution["provider"];
  executionStatus: AgentDecisionExecution["status"];
  identityKey: string;
  reason: string;
  roundAgentId: string;
  runtimeKey: string;
  side: "yes" | "no";
  sizeUsd: number;
  trace: AgentDecisionTraceStep[];
};

export type AgentRuntimeRawDecision = Pick<
  AgentRuntimeDecision,
  "reason" | "side" | "sizeUsd"
> & {
  execution?: AgentDecisionExecution;
  trace?: AgentDecisionTraceStep[];
};

export type AgentRuntimeAdapter = {
  decide(
    input: AgentRuntimeDecisionInput,
  ): AgentRuntimeRawDecision | Promise<AgentRuntimeRawDecision>;
  runtimeKey: string;
};
