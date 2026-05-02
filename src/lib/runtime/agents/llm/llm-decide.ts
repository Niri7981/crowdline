import type { AgentDecision } from "@/lib/runtime/agents/types";
import { getLlmAdapterForBrain, type BrainConfig } from "./brain-registry";
import type { LlmDecisionContext } from "./types";

// 这里在干嘛：
// 公共的 LLM 决策入口：
// 把上层 agent runtime 提供的 persona、context 和 brain，
// 翻译成 prompt → 调 LLM → 解析回 AgentDecision。
// 为什么这么写：
// 每个 LLM-backed agent runtime（llm-news / llm-quant / 未来更多）
// 共享的“格式化 prompt + 解析 JSON + 兜底”逻辑必须只写一份。
// 这样新加 agent 的成本是写一段 persona prompt，不是再写一遍 LLM 胶水。
// 最后返回什么：
// 一份标准 AgentDecision，符合 runtime 协议，可被 round 直接消费。

export type LlmAgentPersona = {
  name: string;
  styleSummary: string;
  decisionPolicy: string;
};

export type RunLlmAgentInput = {
  brain: BrainConfig;
  context: LlmDecisionContext;
  persona: LlmAgentPersona;
};

function buildSystemPrompt(persona: LlmAgentPersona) {
  return [
    `You are ${persona.name}, a competitive arena agent in the AgentDuel system.`,
    `Style: ${persona.styleSummary}`,
    `Decision policy: ${persona.decisionPolicy}`,
    `Always respond with strict json shaped as: {"side": "yes" | "no", "sizeUsd": number, "reason": string}.`,
    `sizeUsd must be between 0 and the bankroll provided. Keep reason concise (max 240 chars).`,
  ].join("\n");
}

function buildUserPrompt(context: LlmDecisionContext) {
  const lines = [
    `Round ID: ${context.roundId}`,
    `Question: ${context.question}`,
    `Resolution source: ${context.resolutionSource}`,
    `Current price: ${context.currentPrice}`,
    `Bankroll available (USDC): ${context.bankrollUsd}`,
  ];

  if (context.marketSymbol) {
    lines.push(`Market symbol: ${context.marketSymbol}`);
  }

  lines.push(
    "",
    "Decide which side to take, how much to commit, and explain your reasoning in one sentence.",
  );

  return lines.join("\n");
}

function clampSize(sizeUsd: number, bankrollUsd: number) {
  if (!Number.isFinite(sizeUsd) || sizeUsd <= 0) {
    return Math.min(1, bankrollUsd);
  }

  return Math.min(Math.max(sizeUsd, 0), bankrollUsd);
}

function buildFallbackDecision(input: RunLlmAgentInput) {
  const followsCrowd = input.context.currentPrice >= 0.5;
  const isContrarian = input.persona.name.toLowerCase().includes("contrarian");
  const side = isContrarian
    ? followsCrowd
      ? "no"
      : "yes"
    : followsCrowd
      ? "yes"
      : "no";
  const sizeUsd = clampSize(isContrarian ? 3 : 4, input.context.bankrollUsd);

  return { side, sizeUsd } as const;
}

export async function runLlmAgent(
  input: RunLlmAgentInput,
): Promise<AgentDecision> {
  const adapter = getLlmAdapterForBrain(input.brain);
  const systemPrompt = buildSystemPrompt(input.persona);
  const userPrompt = buildUserPrompt(input.context);
  const completedExecution = {
    model: adapter.model,
    provider: adapter.provider,
    status: adapter.provider === "mock" ? "mocked" : "completed",
  } as const;

  try {
    const completion = await adapter.complete({
      seed: `${input.context.roundId}:${input.persona.name}`,
      systemPrompt,
      userPrompt,
    });

    return {
      execution: completedExecution,
      reason: completion.reason,
      side: completion.side,
      sizeUsd: clampSize(completion.sizeUsd, input.context.bankrollUsd),
      trace: [
        {
          detail: `${input.context.question} at live price ${input.context.currentPrice}.`,
          phase: "context",
          title: "Event Context Loaded",
        },
        {
          detail: input.persona.decisionPolicy,
          phase: "policy",
          title: "Public Persona Policy Applied",
        },
        {
          detail: `${adapter.provider}/${adapter.model} returned a structured arena decision.`,
          phase: "execution",
          title: "Brain Execution Completed",
        },
        {
          detail: `${completion.side.toUpperCase()} for ${clampSize(
            completion.sizeUsd,
            input.context.bankrollUsd,
          ).toFixed(2)} USDC. ${completion.reason}`,
          phase: "decision",
          title: "Arena Action Submitted",
        },
      ],
    };
  } catch (error) {
    // 真实 LLM 失败时不能让一整场 round 崩溃，
    // 给一个保守 fallback decision，但把错误记下来便于排查。
    console.warn(
      `LLM agent ${input.persona.name} failed via ${adapter.provider}/${adapter.model}; falling back to safe default.`,
      error,
    );

    const fallback = buildFallbackDecision(input);

    return {
      execution: {
        model: adapter.model,
        provider: adapter.provider,
        status: "failed-fallback",
      },
      reason: `LLM failed on ${adapter.model}; used ${input.persona.name} fallback policy and committed ${fallback.side.toUpperCase()}.`,
      side: fallback.side,
      sizeUsd: fallback.sizeUsd,
      trace: [
        {
          detail: `${input.context.question} at live price ${input.context.currentPrice}.`,
          phase: "context",
          title: "Event Context Loaded",
        },
        {
          detail: `${adapter.provider}/${adapter.model} failed before returning a usable decision.`,
          phase: "execution",
          title: "Brain Execution Failed",
        },
        {
          detail: `${input.persona.name} fallback preserved its public strategy after the upstream LLM failed.`,
          phase: "fallback",
          title: "Fallback Policy Activated",
        },
        {
          detail: `Committed ${fallback.side.toUpperCase()} with ${fallback.sizeUsd.toFixed(2)} USDC exposure.`,
          phase: "decision",
          title: "Arena Action Submitted",
        },
      ],
    };
  }
}
