import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  BATTLE_PROOF_HASH_ENCODING,
  buildBattleProofHash,
} from "@/lib/server/battles/build-battle-proof-hash";
import { buildBattleProofPayload } from "@/lib/server/battles/build-battle-proof-payload";
import { applyBattleReputationUpdate } from "@/lib/server/reputation/apply-battle-reputation-update";

import type { PersistedRoundRecord } from "./get-latest-round";
import { resolveDemoMarket } from "./demo-market";

export type SettleRoundInput = {
  roundId?: string;
  settledAt?: Date;
};

type SettlementComputation = {
  finalBalances: Map<string, number>;
  finalBalance: number;
  pnlUsd: number;
  winnerAgentKey: string | null;
  winnerName: string;
  winningSide: "yes" | "no" | null;
};

const roundInclude = {
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
  settlement: true,
} satisfies Prisma.RoundInclude;

// 这里在干嘛：
// 为一场 round 初始化“每个参赛 agent 当前余额”的映射表。
// 为什么这么写：
// 结算时需要先拿到每个 agent 的起始资金，再根据输赢去更新最终余额。
// 用 Map 可以让后面按 agentKey 回写 finalBalance 时更直接。
// 最后返回什么：
// 返回一个 Map，key 是 round 里的 agentKey，value 是起始余额。
function buildInitialBalances(round: PersistedRoundRecord) {
  return new Map(
    round.agents.map((agent) => [agent.agentKey, agent.startingBalance]),
  );
}

// 这里在干嘛：
// 用当前 MVP 规则计算这场 duel 的结算结果。
// 为什么这么写：
// 现在先把规则压到最小闭环：
// 1. 找出押对 outcome 的一方
// 2. 用双方下注额的最小值作为 matched stake
// 3. winner 加 matched stake，loser 减 matched stake
// 这样资金变化足够直观，也方便把 battle outcome 连接到 reputation 更新。
// 最后返回什么：
// 返回一份 SettlementComputation，里面包含最终余额、赢家信息和 pnl。
function computeSettlement(
  round: PersistedRoundRecord,
  outcome: "yes" | "no",
): SettlementComputation {
  const finalBalances = buildInitialBalances(round);
  const winners = round.actions.filter((action) => action.side === outcome);
  const losers = round.actions.filter((action) => action.side !== outcome);

  if (winners.length !== 1 || losers.length !== 1) {
    return {
      finalBalance: round.bankrollPerAgent,
      finalBalances,
      pnlUsd: 0,
      winnerAgentKey: null,
      winnerName: "Draw",
      winningSide: null,
    };
  }

  const winner = winners[0];
  const loser = losers[0];
  const matchedStake = Math.min(winner.sizeUsd, loser.sizeUsd);
  const winnerBalance = winner.roundAgent.startingBalance + matchedStake;
  const loserBalance = loser.roundAgent.startingBalance - matchedStake;

  finalBalances.set(winner.roundAgent.agentKey, winnerBalance);
  finalBalances.set(loser.roundAgent.agentKey, loserBalance);

  return {
    finalBalance: winnerBalance,
    finalBalances,
    pnlUsd: winnerBalance - winner.roundAgent.startingBalance,
    winnerAgentKey: winner.roundAgent.agentKey,
    winnerName: winner.roundAgent.name,
    winningSide: outcome,
  };
}

// 这里在干嘛：
// 结算一场指定或最新的 round，并把结果一路写回 round、event、roundAgent、settlement、agent reputation。
// 为什么这么写：
// 这是当前 battle lifecycle 的核心写入口。
// 一场 round 的真实闭环不是只更新 settlement，
// 而是要在同一个 transaction 里把 battle 结果变成公开身份变化。
// 所以这里把资金结算和 reputation write-back 串在一起。
// 最后返回什么：
// 返回这场 round 结算完成后的完整 PersistedRoundRecord。
export async function settleRound(
  input: SettleRoundInput = {},
): Promise<PersistedRoundRecord> {
  return prisma.$transaction(async (tx) => {
    const targetRound =
      input.roundId != null
        ? await tx.round.findUnique({
            include: roundInclude,
            where: {
              id: input.roundId,
            },
          })
        : await tx.round.findFirst({
            include: roundInclude,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          });

    if (!targetRound) {
      throw new Error("No round available to settle.");
    }

    if (!targetRound.event) {
      throw new Error("Cannot settle a round without an event.");
    }

    if (targetRound.settlement?.status === "settled") {
      return targetRound;
    }

    const settledAt = input.settledAt ?? new Date();
    const marketResolution = resolveDemoMarket({
      marketSymbol: targetRound.marketSymbol,
      roundId: targetRound.id,
      startPrice: targetRound.event.startPrice,
    });
    const settlement = computeSettlement(targetRound, marketResolution.outcome);
    await tx.round.update({
      data: {
        status: "settled",
      },
      where: {
        id: targetRound.id,
      },
    });

    await tx.roundEvent.update({
      data: {
        endPrice: marketResolution.endPrice,
        outcome: marketResolution.outcome,
      },
      where: {
        id: targetRound.event.id,
      },
    });

    for (const agent of targetRound.agents) {
      await tx.roundAgent.update({
        data: {
          finalBalance:
            settlement.finalBalances.get(agent.agentKey) ?? agent.startingBalance,
        },
        where: {
          id: agent.id,
        },
      });
    }

    if (targetRound.settlement) {
      await tx.settlement.update({
        data: {
          finalBalance: settlement.finalBalance,
          outcome: marketResolution.outcome,
          pnlUsd: settlement.pnlUsd,
          settledAt,
          status: "settled",
          winnerAgentKey: settlement.winnerAgentKey,
          winnerName: settlement.winnerName,
          winningSide: settlement.winningSide,
        },
        where: {
          id: targetRound.settlement.id,
        },
      });
    } else {
      await tx.settlement.create({
        data: {
          finalBalance: settlement.finalBalance,
          outcome: marketResolution.outcome,
          pnlUsd: settlement.pnlUsd,
          roundId: targetRound.id,
          settledAt,
          status: "settled",
          winnerAgentKey: settlement.winnerAgentKey,
          winnerName: settlement.winnerName,
          winningSide: settlement.winningSide,
        },
      });
    }

    const { afterProfiles, beforeProfiles } = await applyBattleReputationUpdate(
      tx,
      {
        round: targetRound,
        winnerIdentityKey: settlement.winnerAgentKey,
      },
    );
    // 这里在干嘛：
    // 结算写入后重新读取 round 关系快照，再生成 proof payload。
    // 为什么这么写：
    // targetRound 是结算前读出来的对象，里面的 event.outcome 和
    // roundAgent.finalBalance 仍然是旧值；proof 必须承诺结算后的公开事实。
    // 最后返回什么：
    // 返回一份已经包含 settled outcome / final balances / settlement 的 round。
    const settledRound = await tx.round.findUniqueOrThrow({
      include: roundInclude,
      where: {
        id: targetRound.id,
      },
    });

    const proofPayload = buildBattleProofPayload({
      afterProfiles,
      beforeProfiles,
      round: settledRound,
      settledAt,
      settlement,
    });
    const proofHash = buildBattleProofHash(proofPayload);

    await tx.battleProofRecord.upsert({
      create: {
        payload: JSON.stringify(proofPayload),
        proofHash,
        proofHashEncoding: BATTLE_PROOF_HASH_ENCODING,
        proofVersion: proofPayload.proofVersion,
        roundId: targetRound.id,
      },
      update: {
        payload: JSON.stringify(proofPayload),
        proofHash,
        proofHashEncoding: BATTLE_PROOF_HASH_ENCODING,
        proofVersion: proofPayload.proofVersion,
      },
      where: {
        roundId: targetRound.id,
      },
    });

    return tx.round.findUniqueOrThrow({
      include: roundInclude,
      where: {
        id: targetRound.id,
      },
    });
  });
}
