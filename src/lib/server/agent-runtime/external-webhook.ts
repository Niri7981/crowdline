import { z } from "zod";

import type {
  AgentRuntimeDecisionInput,
  AgentRuntimeRawDecision,
} from "./types";

const EXTERNAL_AGENT_TIMEOUT_MS = 8_000;

const externalAgentDecisionSchema = z.object({
  reason: z.string().min(1).max(480),
  side: z.enum(["yes", "no"]),
  sizeUsd: z.number().finite().positive(),
});

function clampSize(sizeUsd: number, bankrollUsd: number) {
  return Math.min(Math.max(sizeUsd, 0), bankrollUsd);
}

function getPublicEndpointLabel(endpointUrl: string) {
  try {
    return new URL(endpointUrl).host;
  } catch {
    return "external-agent";
  }
}

function buildFallbackDecision(
  input: AgentRuntimeDecisionInput,
): AgentRuntimeRawDecision {
  const side = input.currentPrice >= 0.5 ? "yes" : "no";
  const sizeUsd = clampSize(2, input.bankrollUsd);

  return {
    execution: {
      model: getPublicEndpointLabel(input.agent.externalEndpointUrl ?? ""),
      provider: "external",
      status: "failed-fallback",
    },
    reason:
      "External agent endpoint did not return a usable decision; arena fallback preserved the round.",
    side,
    sizeUsd,
    trace: [
      {
        detail: `${input.event.question} at live price ${input.currentPrice}.`,
        phase: "context",
        title: "Event Context Loaded",
      },
      {
        detail:
          "External webhook failed or timed out before a valid decision was returned.",
        phase: "execution",
        title: "External Agent Unavailable",
      },
      {
        detail: `Committed ${side.toUpperCase()} with ${sizeUsd.toFixed(2)} USDC exposure via arena fallback.`,
        phase: "fallback",
        title: "Fallback Policy Activated",
      },
    ],
  };
}

// 这里在干嘛：
// 调用外部 builder 自己托管的 agent webhook，让它返回标准 duel decision。
// 为什么这么写：
// AgentDuel 不应该替所有 agent 消耗平台模型 key。
// 外部 agent 只需要实现一个小 HTTP 接口，就能以公开 identity 进入 arena。
// 最后返回什么：
// 返回标准 AgentRuntimeRawDecision；如果 webhook 挂了，返回可见 fallback 决策。
export async function runExternalWebhookAgent(
  input: AgentRuntimeDecisionInput,
): Promise<AgentRuntimeRawDecision> {
  const endpointUrl = input.agent.externalEndpointUrl;

  if (!endpointUrl) {
    return buildFallbackDecision(input);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTERNAL_AGENT_TIMEOUT_MS);

  try {
    const response = await fetch(endpointUrl, {
      body: JSON.stringify({
        agent: {
          identityKey: input.agent.identityKey,
          name: input.agent.name,
          riskProfile: input.agent.riskProfile,
          style: input.agent.style,
        },
        bankrollUsd: input.bankrollUsd,
        currentPrice: input.currentPrice,
        event: input.event,
        opponents: input.opponents.map((opponent) => ({
          identityKey: opponent.identityKey,
          name: opponent.name,
          style: opponent.style,
        })),
        protocol: "agentduel.external-agent.v1",
        roundId: input.roundId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`External agent returned HTTP ${response.status}.`);
    }

    const decision = externalAgentDecisionSchema.parse(await response.json());
    const sizeUsd = clampSize(decision.sizeUsd, input.bankrollUsd);
    const endpointLabel = getPublicEndpointLabel(endpointUrl);

    return {
      execution: {
        model: endpointLabel,
        provider: "external",
        status: "completed",
      },
      reason: decision.reason,
      side: decision.side,
      sizeUsd,
      trace: [
        {
          detail: `${input.event.question} at live price ${input.currentPrice}.`,
          phase: "context",
          title: "Event Context Loaded",
        },
        {
          detail: `${input.agent.name} executed through external webhook ${endpointLabel}.`,
          phase: "execution",
          title: "External Agent Responded",
        },
        {
          detail: `Committed ${decision.side.toUpperCase()} with ${sizeUsd.toFixed(2)} USDC exposure. ${decision.reason}`,
          phase: "decision",
          title: "Arena Action Submitted",
        },
      ],
    };
  } catch (error) {
    console.warn(`External agent ${input.agent.name} failed.`, error);

    return buildFallbackDecision(input);
  } finally {
    clearTimeout(timeout);
  }
}
