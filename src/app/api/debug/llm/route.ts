import { NextResponse } from "next/server";

function buildChatUrl(baseUrl: string | undefined) {
  const normalizedBaseUrl = (baseUrl ?? "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );

  return normalizedBaseUrl.endsWith("/chat/completions")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/chat/completions`;
}

export async function GET() {
  const apiKey =
    process.env.AGENTDUEL_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
  const baseUrl =
    process.env.AGENTDUEL_OPENAI_BASE_URL ?? process.env.OPENAI_BASE_URL;
  const model =
    process.env.AGENTDUEL_OPENAI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
  const chatUrl = buildChatUrl(baseUrl);

  const response = await fetch(chatUrl, {
    body: JSON.stringify({
      messages: [
        {
          content: "Return JSON only.",
          role: "system",
        },
        {
          content: 'Return JSON: {"side":"yes","sizeUsd":1,"reason":"test"}',
          role: "user",
        },
      ],
      model,
      response_format: { type: "json_object" },
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const body = await response.text().catch(() => "");

  return NextResponse.json({
    chatUrl,
    env: {
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.slice(0, 8),
      apiKeySuffix: apiKey.slice(-8),
      baseUrl,
      model,
    },
    response: {
      body: body.slice(0, 1200),
      status: response.status,
      statusText: response.statusText,
    },
  });
}
