import {
  runContrarianAgent,
  runContrarianLlmAgent,
} from "@/lib/runtime/agents/contrarian";
import {
  runMomentumAgent,
  runMomentumLlmAgent,
} from "@/lib/runtime/agents/momentum";
import { runNewsLlmAgent } from "@/lib/runtime/agents/llm-news";
import { runQuantLlmAgent } from "@/lib/runtime/agents/llm-quant";
import type { BrainConfig } from "@/lib/runtime/agents/llm";

import { runExternalWebhookAgent } from "./external-webhook";
import type {
  AgentRuntimeAdapter,
  AgentRuntimeDecisionInput,
  AgentRuntimeRawDecision,
} from "./types";

// 这里在干嘛：
// 把 public agent 的 runtimeKey 映射到具体 runtime adapter。
// 为什么这么写：
// runtime 有两个 family：
// - persona 系（momentum / contrarian）—— 有 OpenAI/Anthropic brain 时走 LLM，rules brain 时回退规则
// - LLM 系（llm-news / llm-quant）—— async，按 brain 配置选 OpenAI / Anthropic / mock
// adapter 接口用同一个 shape，对外只暴露 .decide()。
// 这样 round 创建逻辑不需要关心 agent 是规则的还是 LLM 的，
// 也不需要关心模型供应商是谁——这就是 “Agent 不是 Model” 的工程落地。

function getConfiguredLlmBrain(
  input: AgentRuntimeDecisionInput,
): BrainConfig | null {
  const { model, provider } = input.agent.brain;

  if (
    (provider === "openai" || provider === "anthropic") &&
    typeof model === "string" &&
    model.length > 0
  ) {
    return { model, provider };
  }

  return null;
}

async function runMomentumAdapter(
  input: AgentRuntimeDecisionInput,
): Promise<AgentRuntimeRawDecision> {
  const brain = getConfiguredLlmBrain(input);

  if (brain) {
    return runMomentumLlmAgent({
      bankrollUsd: input.bankrollUsd,
      brain,
      currentPrice: input.currentPrice,
      event: input.event,
      roundId: input.roundId,
    });
  }

  return runMomentumAgent({
    bankrollUsd: input.bankrollUsd,
    currentPrice: input.currentPrice,
    event: input.event,
  });
}

async function runContrarianAdapter(
  input: AgentRuntimeDecisionInput,
): Promise<AgentRuntimeRawDecision> {
  const brain = getConfiguredLlmBrain(input);

  if (brain) {
    return runContrarianLlmAgent({
      bankrollUsd: input.bankrollUsd,
      brain,
      currentPrice: input.currentPrice,
      event: input.event,
      roundId: input.roundId,
    });
  }

  return runContrarianAgent({
    bankrollUsd: input.bankrollUsd,
    currentPrice: input.currentPrice,
    event: input.event,
  });
}

async function runNewsLlmAdapter(
  input: AgentRuntimeDecisionInput,
): Promise<AgentRuntimeRawDecision> {
  const brain = getConfiguredLlmBrain(input);

  return runNewsLlmAgent({
    bankrollUsd: input.bankrollUsd,
    brain: brain ?? undefined,
    currentPrice: input.currentPrice,
    event: input.event,
    roundId: input.roundId,
  });
}

async function runQuantLlmAdapter(
  input: AgentRuntimeDecisionInput,
): Promise<AgentRuntimeRawDecision> {
  const brain = getConfiguredLlmBrain(input);

  return runQuantLlmAgent({
    bankrollUsd: input.bankrollUsd,
    brain: brain ?? undefined,
    currentPrice: input.currentPrice,
    event: input.event,
    roundId: input.roundId,
  });
}

const AGENT_RUNTIME_REGISTRY = new Map<string, AgentRuntimeAdapter>([
  [
    "momentum",
    {
      decide: runMomentumAdapter,
      runtimeKey: "momentum",
    },
  ],
  [
    "contrarian",
    {
      decide: runContrarianAdapter,
      runtimeKey: "contrarian",
    },
  ],
  [
    "external-webhook",
    {
      decide: runExternalWebhookAgent,
      runtimeKey: "external-webhook",
    },
  ],
  [
    "llm-news",
    {
      decide: runNewsLlmAdapter,
      runtimeKey: "llm-news",
    },
  ],
  [
    "llm-quant",
    {
      decide: runQuantLlmAdapter,
      runtimeKey: "llm-quant",
    },
  ],
]);

// 这里在干嘛：
// 根据 public agent profile 上的 runtimeKey，找到内部 runtime adapter。
// 为什么这么写：
// battle 层关心的是公开 identity，runtime 层才关心 runtimeKey；
// 把 registry 集中在这里，可以避免 createRound 直接判断不同策略。
// 最后返回什么：
// 返回匹配的 AgentRuntimeAdapter；找不到时抛错，让 round creation 明确失败。
export function getAgentRuntimeAdapter(runtimeKey: string) {
  const adapter = AGENT_RUNTIME_REGISTRY.get(runtimeKey);

  if (!adapter) {
    throw new Error(`No agent runtime adapter registered for ${runtimeKey}.`);
  }

  return adapter;
}
