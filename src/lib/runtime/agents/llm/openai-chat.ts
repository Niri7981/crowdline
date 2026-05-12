import type { LlmAdapter, LlmCompletionInput, LlmCompletionOutput } from "./types";

// 这里在干嘛：
// 真实的 OpenAI-compatible adapter。
// 没有 OPENAI_API_KEY 时调用方应当 fallback 到 mock-llm。
// 为什么这么写：
// 我们坚持 Agent Runtime model-agnostic：
// 上层 agent runtime 只调 adapter.complete()，
// 这里负责把 prompt 翻译成 OpenAI request，再把 response 解析成统一 shape。
// 最后返回什么：
// 返回一个实现 LlmAdapter 的对象，complete() 命中 OpenAI 拿真实推理结果。

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

type OpenAiAdapterConfig = {
  apiMode?: "chat" | "responses";
  apiKey: string;
  baseUrl?: string;
  model: string;
};

type OpenAiChoiceMessage = {
  content?: string | null;
};

type OpenAiChatResponse = {
  choices?: Array<{
    delta?: OpenAiChoiceMessage;
    message?: OpenAiChoiceMessage;
  }>;
};

type OpenAiResponsesResponse = {
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
    type?: string;
  }>;
  output_text?: string;
};

function clampSizeUsd(rawSize: unknown) {
  const parsed = Number(rawSize);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 1;
  }

  return Math.min(Math.max(parsed, 0), 100);
}

function parseDecisionJson(text: string): {
  side: "yes" | "no";
  sizeUsd: number;
  reason: string;
} {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  const jsonSlice =
    jsonStart >= 0 && jsonEnd > jsonStart
      ? text.slice(jsonStart, jsonEnd + 1)
      : text;

  let parsed: Record<string, unknown> = {};

  try {
    parsed = JSON.parse(jsonSlice) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const side = parsed.side === "no" ? "no" : "yes";
  const sizeUsd = clampSizeUsd(parsed.sizeUsd);
  const reason =
    typeof parsed.reason === "string" && parsed.reason.length > 0
      ? parsed.reason
      : "Reason missing in LLM output.";

  return { reason, side, sizeUsd };
}

function buildOpenAiChatUrl(baseUrl: string | undefined) {
  const normalizedBaseUrl = (baseUrl ?? DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");

  if (normalizedBaseUrl.endsWith("/chat/completions")) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}/chat/completions`;
}

function buildOpenAiResponsesUrl(baseUrl: string | undefined) {
  const normalizedBaseUrl = (baseUrl ?? DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");

  if (normalizedBaseUrl.endsWith("/responses")) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}/responses`;
}

async function readErrorMessage(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string };
      message?: string;
    };

    return parsed.error?.message ?? parsed.message ?? text.slice(0, 240);
  } catch {
    return text.slice(0, 240);
  }
}

function parseJsonObject(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function readChatTextFromJson(data: unknown) {
  const response = data as OpenAiChatResponse;

  return response.choices?.[0]?.message?.content ?? "";
}

function readChatTextFromSse(text: string) {
  const chunks: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine.startsWith("data:")) {
      continue;
    }

    const payload = trimmedLine.slice("data:".length).trim();

    if (!payload || payload === "[DONE]") {
      continue;
    }

    const parsed = parseJsonObject(payload) as OpenAiChatResponse | null;
    const content =
      parsed?.choices?.[0]?.delta?.content ??
      parsed?.choices?.[0]?.message?.content;

    if (typeof content === "string") {
      chunks.push(content);
    }
  }

  return chunks.join("");
}

function readChatText(text: string) {
  const jsonData = parseJsonObject(text);

  if (jsonData) {
    return readChatTextFromJson(jsonData);
  }

  return readChatTextFromSse(text);
}

function readResponsesText(data: OpenAiResponsesResponse) {
  if (typeof data.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }

  for (const outputItem of data.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (typeof contentItem.text === "string" && contentItem.text.length > 0) {
        return contentItem.text;
      }
    }
  }

  return "{}";
}

export function buildOpenAiAdapter(config: OpenAiAdapterConfig): LlmAdapter {
  const apiMode = config.apiMode ?? "chat";
  const chatUrl = buildOpenAiChatUrl(config.baseUrl);
  const responsesUrl = buildOpenAiResponsesUrl(config.baseUrl);

  return {
    provider: "openai",
    model: config.model,
    async complete(input: LlmCompletionInput): Promise<LlmCompletionOutput> {
      if (apiMode === "responses") {
        const response = await fetch(responsesUrl, {
          body: JSON.stringify({
            input: input.userPrompt,
            instructions: input.systemPrompt,
            model: config.model,
            text: {
              format: { type: "json_object" },
            },
          }),
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(
            `OpenAI Responses adapter failed: ${await readErrorMessage(response)}`,
          );
        }

        const data = (await response.json()) as OpenAiResponsesResponse;
        const rawText = readResponsesText(data);
        const decision = parseDecisionJson(rawText);

        return {
          rawText,
          reason: decision.reason,
          side: decision.side,
          sizeUsd: decision.sizeUsd,
        };
      }

      const response = await fetch(chatUrl, {
        body: JSON.stringify({
          messages: [
            { content: input.systemPrompt, role: "system" },
            { content: input.userPrompt, role: "user" },
          ],
          model: config.model,
          response_format: { type: "json_object" },
        }),
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI Chat Completions adapter failed: ${await readErrorMessage(response)}`,
        );
      }

      const responseText = await response.text();
      const rawText = readChatText(responseText);

      if (!rawText) {
        throw new Error("OpenAI Chat Completions adapter returned empty output.");
      }

      const decision = parseDecisionJson(rawText);

      return {
        rawText,
        reason: decision.reason,
        side: decision.side,
        sizeUsd: decision.sizeUsd,
      };
    },
  };
}
