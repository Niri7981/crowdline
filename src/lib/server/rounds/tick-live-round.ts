import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { runRoundAgentRuntime } from "@/lib/server/agent-runtime/run-round-agent-runtime";
import type { AgentRuntimeParticipant } from "@/lib/server/agent-runtime/types";
import {
  observeIndexedFactPrice,
  observeIndexedMarketPrice,
} from "@/lib/server/market-data/indexed-facts";
import type { PersistedRoundRecord } from "@/lib/server/rounds/get-latest-round";
import type { ArenaEvent } from "@/lib/types/event";

const liveRoundInclude = {
  actions: {
    include: {
      roundAgent: true,
      traceSteps: {
        orderBy: [{ stepIndex: "asc" as const }, { id: "asc" as const }],
      },
    },
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
  },
  agents: {
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
  },
  event: true,
  priceSnapshots: {
    orderBy: [{ capturedAt: "asc" as const }, { id: "asc" as const }],
  },
  settlement: true,
} satisfies Prisma.RoundInclude;

type TickLiveRoundInput = {
  roundId?: string;
};

type RuntimeProfileRecord = {
  brainModel: string | null;
  brainProvider: "anthropic" | "external" | "mock" | "openai" | "rules" | null;
  externalEndpointUrl: string | null;
  identityKey: string;
  runtimeKey: string;
};

function mapRoundEvent(round: PersistedRoundRecord): ArenaEvent {
  return {
    externalMarketId: round.event?.externalMarketId ?? null,
    id: round.event?.id ?? `event-${round.id}`,
    observationType:
      round.event?.observationType === "polymarket-price"
        ? "polymarket-price"
        : "fact-price",
    outcome:
      round.event?.outcome === "yes" || round.event?.outcome === "no"
        ? round.event.outcome
        : "pending",
    question: round.event?.question ?? "Pending duel event",
    resolutionSource: round.event?.resolutionSource ?? "Pending source",
    slug: round.event?.slug ?? null,
    sourceKey: round.event?.sourceKey ?? null,
  };
}

// 这里在干嘛：
// 把 live round 里的公开参赛者快照，拼回 runtime 层真正执行需要的配置。
// 为什么这么写：
// tick 阶段不能依赖创建 round 时那一刻的内存数据；
// 它必须根据 round 内的公开参赛者 + 当前 AgentProfile 配置，重新组装运行输入。
// 最后返回什么：
// 返回可直接交给 runRoundAgentRuntime 的 AgentRuntimeParticipant 列表。
async function loadRuntimeParticipants(
  round: PersistedRoundRecord,
): Promise<AgentRuntimeParticipant[]> {
  const identityKeys = round.agents.map((agent) => agent.agentKey);
  const profiles = await prisma.agentProfile.findMany({
    select: {
      brainModel: true,
      brainProvider: true,
      externalEndpointUrl: true,
      identityKey: true,
      runtimeKey: true,
    },
    where: {
      identityKey: {
        in: identityKeys,
      },
    },
  });
  const profileMap = new Map<string, RuntimeProfileRecord>(
    profiles.map((profile) => [
      profile.identityKey,
      {
        brainModel: profile.brainModel,
        brainProvider:
          profile.brainProvider === "anthropic" ||
          profile.brainProvider === "external" ||
          profile.brainProvider === "mock" ||
          profile.brainProvider === "openai" ||
          profile.brainProvider === "rules"
            ? profile.brainProvider
            : null,
        externalEndpointUrl: profile.externalEndpointUrl,
        identityKey: profile.identityKey,
        runtimeKey: profile.runtimeKey,
      },
    ]),
  );

  return round.agents.map((agent) => {
    const profile = profileMap.get(agent.agentKey);

    if (!profile) {
      throw new Error(`No runtime profile found for ${agent.agentKey}.`);
    }

    return {
      brain: {
        model: profile.brainModel,
        provider: profile.brainProvider,
      },
      externalEndpointUrl: profile.externalEndpointUrl,
      identityKey: agent.agentKey,
      name: agent.name,
      riskProfile:
        agent.riskProfile === "low" ||
        agent.riskProfile === "medium" ||
        agent.riskProfile === "high"
          ? agent.riskProfile
          : "medium",
      roundAgentId: agent.id,
      runtimeKey: profile.runtimeKey,
      style: agent.style,
    };
  });
}

// 这里在干嘛：
// 为一场仍在 live 状态的 round 追加一轮市场观察和 agent action。
// 为什么这么写：
// 这一步把 battle 从“一次建局，一次出手”升级成可推进的过程；
// 每次 tick 都会读取 indexer 已落库的最新事实价格，再让所有参赛 agent 基于最新上下文重新决策。
// 最后返回什么：
// 返回 tick 完成后的完整 round 记录，里面已经包含新增的 price snapshot 和 actions。
export async function tickLiveRound(
  input: TickLiveRoundInput = {},
): Promise<PersistedRoundRecord> {
  const targetRound =
    input.roundId != null
      ? await prisma.round.findUnique({
          include: liveRoundInclude,
          where: {
            id: input.roundId,
          },
        })
      : await prisma.round.findFirst({
          include: liveRoundInclude,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          where: {
            status: "live",
          },
        });

  if (!targetRound) {
    throw new Error("No live round available to tick.");
  }

  if (targetRound.status !== "live") {
    throw new Error("Only live rounds can be ticked.");
  }

  if (!targetRound.event) {
    throw new Error("Cannot tick a round without an event.");
  }

  if (targetRound.endsAt && targetRound.endsAt.getTime() <= Date.now()) {
    throw new Error("Round deadline reached. Settle the live round instead of ticking.");
  }

  const previousSnapshot = targetRound.priceSnapshots.at(-1) ?? null;
  const roundEvent = mapRoundEvent(targetRound as PersistedRoundRecord);
  const liveObservation =
    roundEvent.observationType === "polymarket-price" &&
    roundEvent.externalMarketId
      ? await observeIndexedMarketPrice({
          externalMarketId: roundEvent.externalMarketId,
          previousPoint:
            previousSnapshot == null
              ? null
              : {
                  price: previousSnapshot.price,
                  timestamp: previousSnapshot.capturedAt,
                },
          roundEndsAt: targetRound.endsAt,
        })
      : await observeIndexedFactPrice({
          marketSymbol: targetRound.marketSymbol,
          previousPoint:
            previousSnapshot == null
              ? null
              : {
                  price: previousSnapshot.price,
                  timestamp: previousSnapshot.capturedAt,
                },
          roundEndsAt: targetRound.endsAt,
        });
  const runtimeParticipants = await loadRuntimeParticipants(
    targetRound as PersistedRoundRecord,
  );
  const decisions = await runRoundAgentRuntime({
    agents: runtimeParticipants,
    bankrollUsd: targetRound.bankrollPerAgent,
    currentPrice: liveObservation.price,
    event: roundEvent,
    roundId: targetRound.id,
  });

  return prisma.$transaction(async (tx) => {
    const tickSnapshot = await tx.roundPriceSnapshot.create({
      data: {
        capturedAt: liveObservation.timestamp,
        price: liveObservation.price,
        roundId: targetRound.id,
        sourceLabel: liveObservation.sourceLabel,
      },
    });

    for (const decision of decisions) {
      await tx.action.create({
        data: {
          reason: decision.reason,
          brainModel: decision.brainModel,
          brainProvider: decision.brainProvider,
          executionModel: decision.executionModel,
          executionProvider: decision.executionProvider,
          executionStatus: decision.executionStatus,
          roundAgentId: decision.roundAgentId,
          roundId: targetRound.id,
          snapshotId: tickSnapshot.id,
          runtimeKey: decision.runtimeKey,
          side: decision.side,
          sizeUsd: decision.sizeUsd,
          traceSteps: {
            create: decision.trace.map((step, stepIndex) => ({
              detail: step.detail,
              phase: step.phase,
              roundAgentId: decision.roundAgentId,
              roundId: targetRound.id,
              stepIndex,
              title: step.title,
            })),
          },
        },
      });
    }

    return tx.round.findUniqueOrThrow({
      include: liveRoundInclude,
      where: {
        id: targetRound.id,
      },
    });
  }) as Promise<PersistedRoundRecord>;
}
