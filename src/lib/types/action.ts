export type RoundActionRuntimeSnapshot = {
  brainModel: string | null;
  brainProvider: "anthropic" | "external" | "mock" | "openai" | "rules" | null;
  executionModel: string | null;
  executionProvider: "anthropic" | "external" | "mock" | "openai" | "rules" | null;
  executionStatus: "completed" | "failed-fallback" | "mocked" | "rules" | null;
  runtimeKey: string | null;
};

export type RoundActionTracePhase =
  | "context"
  | "policy"
  | "execution"
  | "decision"
  | "fallback";

export type RoundActionTraceStep = {
  id: string;
  detail: string;
  phase: RoundActionTracePhase;
  stepIndex: number;
  title: string;
};

export type RoundAction = {
  id: string;
  agentId: string;
  agentName: string;
  side: "yes" | "no";
  sizeUsd: number;
  at: string;
  reason: string;
  runtime?: RoundActionRuntimeSnapshot;
  trace: RoundActionTraceStep[];
};
