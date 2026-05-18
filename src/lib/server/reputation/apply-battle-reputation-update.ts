import type { Prisma } from "@/generated/prisma/client";
import { recomputeLeaderboardRanks } from "@/lib/server/leaderboard/recompute-ranks";
import type { PersistedRoundRecord } from "@/lib/server/rounds/get-latest-round";

import type {
  BattleReputationUpdateResult,
  ReputationProfileSnapshot,
} from "./types";

type RoundAgentProfileMapping = {
  agent: PersistedRoundRecord["agents"][number];
  profile: Prisma.AgentProfileGetPayload<object>;
};

// 这里在干嘛：
// 把 AgentProfile 当前状态压缩成 reputation 层需要的快照。
// 为什么这么写：
// proof 和 reputation event 只需要身份、rank、record、streak，
// 不应该携带 runtimeKey、tagline 这类不属于声誉变化的字段。
// 最后返回什么：
// 返回一份 ReputationProfileSnapshot。
function snapshotReputationProfile(
  profile: Prisma.AgentProfileGetPayload<object>,
): ReputationProfileSnapshot {
  return {
    bestStreak: profile.bestStreak,
    currentRank: profile.currentRank,
    currentStreak: profile.currentStreak,
    identityKey: profile.identityKey,
    name: profile.name,
    previousRank: profile.previousRank,
    totalLosses: profile.totalLosses,
    totalWins: profile.totalWins,
  };
}

// 这里在干嘛：
// 把 round 里的参赛 agent 映射回全局 AgentProfile。
// 为什么这么写：
// reputation 写回的对象是公开身份 profile，
// round 内的 agentKey 必须按 identityKey 精确匹配，不能退回 runtimeKey。
// 最后返回什么：
// 返回 round agent 与 AgentProfile 的一一映射。
async function findReputationProfilesForRound(
  tx: Prisma.TransactionClient,
  round: PersistedRoundRecord,
): Promise<RoundAgentProfileMapping[]> {
  const identityKeys = [...new Set(round.agents.map((agent) => agent.agentKey))];

  const profiles = await tx.agentProfile.findMany({
    where: {
      identityKey: { in: identityKeys },
    },
  });

  return round.agents.map((agent) => {
    const profile = profiles.find(
      (entry) => entry.identityKey === agent.agentKey,
    );

    if (!profile) {
      throw new Error(`No agent profile found for round agent ${agent.agentKey}.`);
    }

    return {
      agent,
      profile,
    };
  });
}

// 这里在干嘛：
// 根据 battle 结果，把每个参赛 agent 的当前 reputation 状态写回 AgentProfile。
// 为什么这么写：
// 当前 MVP 仍然用 AgentProfile 存 reputation 状态，
// 但更新规则属于 reputation 层，不应该继续散落在 settlement orchestration 里。
// draw 不改变胜负和 streak，避免把未分胜负的 battle 误记成 loss。
// 最后返回什么：
// 返回更新前后的 reputation snapshots，供 proof 层固化历史变化。
export async function applyBattleReputationUpdate(
  tx: Prisma.TransactionClient,
  params: {
    dryRun?: boolean;
    round: PersistedRoundRecord;
    winnerIdentityKey: string | null;
  },
): Promise<BattleReputationUpdateResult> {
  const profileMappings = await findReputationProfilesForRound(tx, params.round);
  const beforeProfiles = profileMappings.map(({ profile }) =>
    snapshotReputationProfile(profile),
  );

  if (params.dryRun) {
    return {
      afterProfiles: [...beforeProfiles],
      beforeProfiles,
    };
  }

  for (const { agent, profile } of profileMappings) {
    const isWinner =
      params.winnerIdentityKey !== null &&
      agent.agentKey === params.winnerIdentityKey;
    const isDraw = params.winnerIdentityKey === null;
    const nextWins = profile.totalWins + (isWinner ? 1 : 0);
    const nextLosses = profile.totalLosses + (!isWinner && !isDraw ? 1 : 0);
    const nextStreak = isWinner
      ? profile.currentStreak + 1
      : isDraw
        ? profile.currentStreak
        : 0;
    const nextBestStreak = Math.max(profile.bestStreak, nextStreak);

    await tx.agentProfile.update({
      data: {
        bestStreak: nextBestStreak,
        currentStreak: nextStreak,
        totalLosses: nextLosses,
        totalWins: nextWins,
      },
      where: {
        id: profile.id,
      },
    });
  }

  await recomputeLeaderboardRanks(tx);

  const afterProfiles = (
    await tx.agentProfile.findMany({
      where: {
        identityKey: {
          in: params.round.agents.map((agent) => agent.agentKey),
        },
      },
    })
  ).map((profile) => snapshotReputationProfile(profile));

  return {
    afterProfiles,
    beforeProfiles,
  };
}
