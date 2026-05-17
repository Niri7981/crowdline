import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getAgentPool } from "@/lib/server/agents/get-agent-pool";
import {
  getBattleFeed,
  type BattleFeedItem,
} from "@/lib/server/battles/get-battle-feed";
import { getLeaderboard } from "@/lib/server/leaderboard/get-leaderboard";
import type { LeaderboardEntry } from "@/lib/server/leaderboard/types";
import type { PersistedRoundRecord } from "@/lib/server/rounds/get-latest-round";
import { mapRoundToState } from "@/lib/server/rounds/map-round-state";
import type { RoundState } from "@/lib/types/round";

export type ArenaReputationMovement = {
  roundId: string;
  identityKey: string;
  name: string;
  result: "win" | "loss" | "draw";
  rankBefore: number;
  rankAfter: number;
  rankDelta: number;
  streakBefore: number;
  streakAfter: number;
};

export type ArenaHomePayload = {
  currentRound: RoundState | null;
  latestSettledBattle: BattleFeedItem | null;
  leaderboard: LeaderboardEntry[];
  featuredAgents: Awaited<ReturnType<typeof getAgentPool>>;
  recentBattles: BattleFeedItem[];
  reputationMovement: ArenaReputationMovement[];
};

const arenaRoundInclude = {
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

// 这里在干嘛：
// 读取当前最适合主舞台展示的一场 round，优先取 live round。
// 为什么这么写：
// Arena 首页的首屏需要一个“现在正在发生什么”的对象；
// 如果当前没有 live round，就返回 null，让前端展示 battle feed 或空态。
// 最后返回什么：
// 返回映射后的 RoundState，或者没有 live round 时返回 null。
async function getCurrentArenaRound(): Promise<RoundState | null> {
  const round = await prisma.round.findFirst({
    include: arenaRoundInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    where: {
      status: "live",
    },
  });

  return round
    ? mapRoundToState(round as unknown as PersistedRoundRecord)
    : null;
}

// 这里在干嘛：
// 从 battle feed 里抽出最近的 reputation movement。
// 为什么这么写：
// 未来大前端会需要 top mover、rank jump、streak change 这类动态模块；
// 这里先把它们聚合成扁平列表，页面只负责渲染。
// 最后返回什么：
// 返回最近 proof 里记录的身份变化列表。
function buildReputationMovement(
  recentBattles: BattleFeedItem[],
): ArenaReputationMovement[] {
  return recentBattles.flatMap((battle) =>
    battle.reputationHighlights.map((effect) => ({
      identityKey: effect.identityKey,
      name: effect.name,
      rankAfter: effect.rankAfter,
      rankBefore: effect.rankBefore,
      rankDelta: effect.rankDelta,
      result: effect.result,
      roundId: battle.roundId,
      streakAfter: effect.streakAfter,
      streakBefore: effect.streakBefore,
    })),
  );
}

// 这里在干嘛：
// 组装 arena 首页和未来 spectacle 前端需要的一站式数据。
// 为什么这么写：
// 前端不应该在主舞台里到处请求 round、leaderboard、battle proof、agent pool；
// 这个读服务把观众视角的核心数据一次性拼好，后续视觉层可以专心做呈现。
// 最后返回什么：
// 返回 ArenaHomePayload。
export async function getArenaHome(): Promise<ArenaHomePayload> {
  const [currentRound, leaderboard, featuredAgents, recentBattles] =
    await Promise.all([
      getCurrentArenaRound(),
      getLeaderboard({ limit: 5 }),
      getAgentPool({ limit: 4 }),
      getBattleFeed({ limit: 8 }),
    ]);

  const latestSettledBattle =
    recentBattles.find((battle) => battle.roundStatus === "settled") ?? null;

  return {
    currentRound,
    featuredAgents,
    latestSettledBattle,
    leaderboard,
    recentBattles,
    reputationMovement: buildReputationMovement(recentBattles),
  };
}
