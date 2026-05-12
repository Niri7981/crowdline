import { buildAnthropicAdapter } from "./anthropic-chat";
import { buildMockLlmAdapter } from "./mock-llm";
import { buildOpenAiAdapter } from "./openai-chat";
import type { LlmAdapter } from "./types";

// 这里在干嘛：
// 根据 agent 的 brain 配置和当前环境变量，选出真 LLM adapter 或 mock fallback。
// 为什么这么写：
// 我们要保证“Agent 永远能跑”——
// hackathon evaluator 不一定有 OPENAI_API_KEY / ANTHROPIC_API_KEY，
// 但产品故事是 "这个 Agent 用 GPT-5 大脑" 必须始终成立。
// 所以这里加一层间接：
// 有真 key 就走真 LLM，没 key 就走 mock，但 brain 标识不变。
// 最后返回什么：
// 返回一个实现 LlmAdapter 的对象，调用方只需要 .complete()。

export type BrainConfig = {
  provider: "openai" | "anthropic";
  model: string;
};

function getOpenAiApiMode() {
  return process.env.AGENTDUEL_OPENAI_API_MODE === "responses" ||
    process.env.OPENAI_API_MODE === "responses"
    ? "responses"
    : "chat";
}

function getOpenAiModel(model: string) {
  return process.env.AGENTDUEL_OPENAI_MODEL ?? process.env.OPENAI_MODEL ?? model;
}

export function getLlmAdapterForBrain(brain: BrainConfig): LlmAdapter {
  if (brain.provider === "openai") {
    const apiKey =
      process.env.AGENTDUEL_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
    const model = getOpenAiModel(brain.model);

    if (apiKey) {
      return buildOpenAiAdapter({
        apiMode: getOpenAiApiMode(),
        apiKey,
        baseUrl:
          process.env.AGENTDUEL_OPENAI_BASE_URL ?? process.env.OPENAI_BASE_URL,
        model,
      });
    }

    return buildMockLlmAdapter({
      emulatedModel: model,
      emulatedProvider: "openai",
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    return buildAnthropicAdapter({ apiKey, model: brain.model });
  }

  return buildMockLlmAdapter({
    emulatedModel: brain.model,
    emulatedProvider: "anthropic",
  });
}
