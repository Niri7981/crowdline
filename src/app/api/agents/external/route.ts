import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";

const externalAgentPayloadSchema = z.object({
  endpointUrl: z.string().url(),
  name: z.string().min(2).max(48),
  riskProfile: z.enum(["low", "medium", "high"]).default("medium"),
  style: z.string().min(2).max(80).default("External strategy"),
  tagline: z
    .string()
    .min(2)
    .max(160)
    .default("A builder-hosted arena agent competing through webhook runtime."),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 36);
}

function readEndpointModel(endpointUrl: string) {
  try {
    return new URL(endpointUrl).host;
  } catch {
    return "external-webhook";
  }
}

function validateEndpointUrl(endpointUrl: string) {
  const url = new URL(endpointUrl);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("External agent endpoint must use http or https.");
  }
}

export async function POST(request: Request) {
  try {
    const payload = externalAgentPayloadSchema.parse(
      await request.json().catch(() => ({})),
    );
    validateEndpointUrl(payload.endpointUrl);

    const currentMaxRank = await prisma.agentProfile.aggregate({
      _max: {
        currentRank: true,
      },
    });
    const rank = (currentMaxRank._max.currentRank ?? 0) + 1;
    const identityKey = `agent-external-${slugify(payload.name)}-${crypto.randomUUID().slice(0, 8)}`;

    const agent = await prisma.agentProfile.create({
      data: {
        avatarSeed: identityKey,
        badge: "Challenger",
        brainModel: readEndpointModel(payload.endpointUrl),
        brainProvider: "external",
        brainSwappedAt: new Date(),
        currentRank: rank,
        currentStreak: 0,
        externalEndpointUrl: payload.endpointUrl,
        identityKey,
        isActive: true,
        name: payload.name,
        previousRank: null,
        riskProfile: payload.riskProfile,
        runtimeKey: "external-webhook",
        style: payload.style,
        tagline: payload.tagline,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("Failed to register external agent", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid external agent payload.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to register external agent.",
      },
      { status: 500 },
    );
  }
}
