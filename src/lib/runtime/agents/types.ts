import type { ArenaEvent } from "@/lib/types/event";

export type AgentDecisionExecutionProvider =
  | "anthropic"
  | "external"
  | "mock"
  | "openai"
  | "rules";

export type AgentDecisionExecutionStatus =
  | "completed"
  | "failed-fallback"
  | "mocked"
  | "rules";

export type AgentDecisionExecution = {
  model: string | null;
  provider: AgentDecisionExecutionProvider;
  status: AgentDecisionExecutionStatus;
};

export type AgentDecisionTracePhase =
  | "context"
  | "policy"
  | "execution"
  | "decision"
  | "fallback";

export type AgentDecisionTraceStep = {
  phase: AgentDecisionTracePhase;
  title: string;
  detail: string;
};

export type AgentDecisionInput = {
  event: ArenaEvent;
  currentPrice: number;
  bankrollUsd: number;
};

export type AgentDecision = {
  side: "yes" | "no";
  sizeUsd: number;
  reason: string;
  execution?: AgentDecisionExecution;
  trace?: AgentDecisionTraceStep[];
};
