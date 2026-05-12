import { prisma } from "@/lib/db/prisma";
import {
  observeIndexedFactPrice,
  observeIndexedMarketPrice,
} from "@/lib/server/market-data/indexed-facts";
import { runRoundAgentRuntime } from "@/lib/server/agent-runtime/run-round-agent-runtime";
import type { AgentRuntimeParticipant } from "@/lib/server/agent-runtime/types";
import { selectRoundAgents } from "@/lib/server/agents/select-round-agents";
import { selectRoundEvent } from "@/lib/server/events/select-round-event";
import type { ArenaEvent } from "@/lib/types/event";

export type CreateRoundInput = {
  agentIds?: string[];
  bankrollPerAgent?: number;
  durationSeconds?: number;
  eventId?: string;
  startsAt?: Date;
};

const DEFAULT_BANKROLL_PER_AGENT = 10;

// 创建一场最小可运行的 duel：
// 1. 从 Event Pool 里挑一条事件
// 2. 从 Agent Pool 里挑两名公开选手
// 3. 创建 round 主记录
// 4. 让 agent runtime 立即产出 action
// 5. 初始化一条 pending settlement
export async function createRound(input: CreateRoundInput = {}) {
  const bankrollPerAgent =
    input.bankrollPerAgent ?? DEFAULT_BANKROLL_PER_AGENT;

  const selectedEvent = await selectRoundEvent({
    durationSeconds: input.durationSeconds,
    eventId: input.eventId,
    startsAt: input.startsAt,
  });
  const selectedAgents = await selectRoundAgents({
    agentIds: input.agentIds,
  });
  const market = selectedEvent.market;
  const liveObservation = await (
    market.observationType === "polymarket-price" && market.externalMarketId
      ? observeIndexedMarketPrice({
          externalMarketId: market.externalMarketId,
          roundEndsAt: market.endsAt,
        })
      : observeIndexedFactPrice({
          marketSymbol: market.marketSymbol,
          roundEndsAt: market.endsAt,
        })
  ).catch(() => null);
  const currentPrice = liveObservation?.price ?? market.currentPrice;
  const roundEvent: Omit<ArenaEvent, "id"> = {
    ...selectedEvent.eventInput,
  };

  return prisma.$transaction(async (tx) => {
    // Round 是整场对局的主表，先把时间、预算和状态固定下来。
    const round = await tx.round.create({
      data: {
        bankrollPerAgent,
        durationSeconds: Math.floor(
          (market.endsAt.getTime() - market.startsAt.getTime()) / 1000,
        ),
        endsAt: market.endsAt,
        marketSymbol: market.marketSymbol,
        startsAt: market.startsAt,
        status: "live",
      },
    });

    // 每场 round 只挂一个 event，表示这局到底在赌什么。
    const event = await tx.roundEvent.create({
      data: {
        outcome: roundEvent.outcome,
        externalMarketId: roundEvent.externalMarketId,
        observationType: roundEvent.observationType,
        question: roundEvent.question,
        resolutionSource: roundEvent.resolutionSource,
        roundId: round.id,
        slug: roundEvent.slug,
        sourceKey: roundEvent.sourceKey,
        startPrice: market.startPrice,
      },
    });

    const runtimeAgents: AgentRuntimeParticipant[] = [];

    for (const agent of selectedAgents) {
      // RoundAgent 记录的是“某个公开 agent 参加这一局”的快照，不是全局模板本身。
      const createdAgent = await tx.roundAgent.create({
        data: {
          agentKey: agent.identityKey,
          name: agent.name,
          riskProfile: agent.riskProfile,
          roundId: round.id,
          startingBalance: bankrollPerAgent,
          style: agent.style,
        },
      });

      runtimeAgents.push({
        brain: {
          model: agent.brainModel,
          provider: agent.brainProvider,
        },
        externalEndpointUrl: agent.externalEndpointUrl,
        identityKey: createdAgent.agentKey,
        name: createdAgent.name,
        riskProfile:
          createdAgent.riskProfile === "low" ||
          createdAgent.riskProfile === "medium" ||
          createdAgent.riskProfile === "high"
            ? createdAgent.riskProfile
            : "medium",
        roundAgentId: createdAgent.id,
        runtimeKey: agent.runtimeKey,
        style: createdAgent.style,
      });
    }

    const eventInput: ArenaEvent = {
      ...roundEvent,
      id: event.id,
    };

    const decisions = await runRoundAgentRuntime({
      agents: runtimeAgents,
      bankrollUsd: bankrollPerAgent,
      currentPrice,
      event: eventInput,
      roundId: round.id,
    });

    const openingSnapshot = await tx.roundPriceSnapshot.create({
      data: {
        capturedAt: liveObservation?.timestamp ?? input.startsAt ?? new Date(),
        price: currentPrice,
        roundId: round.id,
        sourceLabel: liveObservation?.sourceLabel ?? roundEvent.resolutionSource,
      },
    });

    for (const decision of decisions) {
      // agent runtime 只负责给出决策，真正的落库由 round 服务层完成。
      await tx.action.create({
        data: {
          reason: decision.reason,
          brainModel: decision.brainModel,
          brainProvider: decision.brainProvider,
          executionModel: decision.executionModel,
          executionProvider: decision.executionProvider,
          executionStatus: decision.executionStatus,
          roundAgentId: decision.roundAgentId,
          roundId: round.id,
          snapshotId: openingSnapshot.id,
          runtimeKey: decision.runtimeKey,
          side: decision.side,
          sizeUsd: decision.sizeUsd,
          traceSteps: {
            create: decision.trace.map((step, stepIndex) => ({
              detail: step.detail,
              phase: step.phase,
              roundAgentId: decision.roundAgentId,
              roundId: round.id,
              stepIndex,
              title: step.title,
            })),
          },
        },
      });
    }

    // 先创建一条 pending settlement，后面真正结算时只更新这条记录。
    await tx.settlement.create({
      data: {
        outcome: "pending",
        roundId: round.id,
        status: "pending",
      },
    });

    // 创建完成后把整场 round 的关联数据一次性带回，方便 API 直接继续映射。
    return tx.round.findUniqueOrThrow({
      include: {
        actions: {
          include: {
            roundAgent: true,
            traceSteps: {
              orderBy: [{ stepIndex: "asc" }, { id: "asc" }],
            },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
        agents: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
        event: true,
        priceSnapshots: {
          orderBy: [{ capturedAt: "asc" }, { id: "asc" }],
        },
        settlement: true,
      },
      where: {
        id: round.id,
      },
    });
  }, {
    timeout: 30_000,
  });
}
