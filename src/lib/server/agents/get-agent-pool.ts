import { prisma } from "@/lib/db/prisma";

import { AGENT_POOL } from "./agent-pool-data";
import type { GetAgentPoolInput, InternalAgentProfile } from "./types";

// 这里在干嘛：
// 把 agent pool 相关的类型继续从这个服务文件往外转出。
// 为什么这么写：
// 调用方如果本来就是从 get-agent-pool 这个入口拿数据，通常也希望顺手从这里拿到类型，
// 不用再回头单独 import ./types。
// 最后返回什么：
// 这里本身不返回运行时值，只是把类型导出给别的文件使用。
export type {
  AgentBrainProvider,
  AgentPoolRiskProfile,
  InternalAgentProfile,
} from "./types";

// 这里在干嘛：
// 基于 Prisma 查询结果，推导出“数据库里一条 AgentProfile 记录”的 TS 类型。
// 为什么这么写：
// 这样后面 mapper 可以直接吃数据库真实返回 shape，
// 不需要手写一份很容易过时的 record 类型。
// NonNullable 是因为 findFirst 的返回类型默认可能是 null，
// 但 mapper 只应该接收“已经确定存在的记录”。
// 最后返回什么：
// 这是一个类型别名，不是运行时函数；它描述的是单条 AgentProfile 数据的结构。
type AgentProfileRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.agentProfile.findFirst>>
>;

// 这里在干嘛：
// 把 Prisma 层的原始 AgentProfile 记录，翻译成服务层统一使用的 InternalAgentProfile。
// 为什么这么写：
// 数据库字段和服务层类型最好隔一层 mapper。
// 这样以后数据库结构调整时，影响被收敛在这里，而不是把 Prisma record 直接泄漏到全项目。
// 这里也顺手把 riskProfile 收窄成我们内部允许的联合类型。
// 最后返回什么：
// 返回一份给上层业务使用的 InternalAgentProfile。
function mapRecordToAgentProfile(
  record: AgentProfileRecord,
): InternalAgentProfile {
  const previousRank = record.previousRank;
  const rankDelta =
    previousRank == null ? 0 : previousRank - record.currentRank;

  return {
    avatarSeed: record.avatarSeed,
    badge: record.badge,
    bestStreak: record.bestStreak,
    brainModel: record.brainModel ?? null,
    brainProvider:
      (record.brainProvider as InternalAgentProfile["brainProvider"]) ?? null,
    brainSwappedAt: record.brainSwappedAt
      ? record.brainSwappedAt.toISOString()
      : null,
    currentRank: record.currentRank,
    currentStreak: record.currentStreak,
    externalEndpointUrl: record.externalEndpointUrl ?? null,
    id: record.id,
    identityKey: record.identityKey,
    isActive: record.isActive,
    name: record.name,
    previousRank,
    rankDelta,
    riskProfile: record.riskProfile as InternalAgentProfile["riskProfile"],
    runtimeKey: record.runtimeKey,
    style: record.style,
    tagline: record.tagline,
    totalLosses: record.totalLosses,
    totalWins: record.totalWins,
  };
}

function mapSeedToAgentProfile(
  agent: (typeof AGENT_POOL)[number],
): InternalAgentProfile {
  const previousRank = agent.previousRank;

  return {
    avatarSeed: agent.avatarSeed,
    badge: agent.badge,
    bestStreak: agent.bestStreak,
    brainModel: agent.brainModel ?? null,
    brainProvider: agent.brainProvider ?? null,
    brainSwappedAt: agent.brainSwappedAt,
    currentRank: agent.currentRank,
    currentStreak: agent.currentStreak,
    externalEndpointUrl: agent.externalEndpointUrl ?? null,
    id: agent.identityKey,
    identityKey: agent.identityKey,
    isActive: agent.isActive,
    name: agent.name,
    previousRank,
    rankDelta: previousRank == null ? 0 : previousRank - agent.currentRank,
    riskProfile: agent.riskProfile,
    runtimeKey: agent.runtimeKey,
    style: agent.style,
    tagline: agent.tagline,
    totalLosses: agent.totalLosses,
    totalWins: agent.totalWins,
  };
}

function getFallbackAgentPool(input: GetAgentPoolInput = {}) {
  const agents = AGENT_POOL.filter((agent) => {
    if (!input.includeInactive && !agent.isActive) {
      return false;
    }

    return input.runtimeKey ? agent.runtimeKey === input.runtimeKey : true;
  })
    .map((agent) => mapSeedToAgentProfile(agent))
    .sort(
      (left, right) =>
        left.currentRank - right.currentRank ||
        right.totalWins - left.totalWins ||
        left.name.localeCompare(right.name),
    );

  return typeof input.limit === "number" ? agents.slice(0, input.limit) : agents;
}

// 这里在干嘛：
// 读取整个 Agent Pool，也就是 arena 当前维护的公开参赛者身份列表。
// 为什么这么写：
// 这是 Agent Proof 层最核心的列表读取入口。
// 排序上优先按 currentRank 升序，确保榜单前面的 agent 先出来；
// 再按 totalWins 和 name 兜底，让顺序稳定且可解释。
// where 条件里默认只读 active agent，
// 但如果调用方显式要求 includeInactive，就把 inactive 也放进来。
// take 用来支持“只取前 N 个”的轻量查询，比如首页 podium 或 top agents。
// 最后返回什么：
// 返回一个 InternalAgentProfile 数组，而不是原始 Prisma 记录数组。
export async function getAgentPool(input: GetAgentPoolInput = {}) {
  try {
    const records = await prisma.agentProfile.findMany({
      orderBy: [{ currentRank: "asc" }, { totalWins: "desc" }, { name: "asc" }],
      take: input.limit,
      where: {
        isActive: input.includeInactive ? undefined : true,
        runtimeKey: input.runtimeKey,
      },
    });

    if (records.length === 0) {
      return getFallbackAgentPool(input);
    }

    return records.map((record) => mapRecordToAgentProfile(record));
  } catch (error) {
    console.warn("Falling back to bundled Agent Pool.", error);

    return getFallbackAgentPool(input);
  }
}

// 这里在干嘛：
// 提供一个“读前几名 agent”的便捷函数。
// 为什么这么写：
// 很多页面只关心榜单前几名，比如首页、hero 区、podium 区；
// 单独包一层可以让调用方少传一次对象参数，也让语义更直接。
// 最后返回什么：
// 返回 rank 最靠前的若干个 InternalAgentProfile。
export async function getTopAgentPool(limit = 3) {
  return getAgentPool({ limit });
}

// 这里在干嘛：
// 按数据库主键 id 读取一个 agent profile。
// 为什么这么写：
// 某些页面或 API 拿到的就是表里的 id，
// 这时用 findUnique 是最直接、最明确的查法。
// 如果没查到，就返回 null，而不是抛错，让上层自己决定 404 还是别的处理。
// 最后返回什么：
// 返回一个 InternalAgentProfile，或者在找不到时返回 null。
export async function getAgentPoolEntryById(
  agentId: string,
): Promise<InternalAgentProfile | null> {
  try {
    const record = await prisma.agentProfile.findUnique({
      where: {
        id: agentId,
      },
    });

    if (record) {
      return mapRecordToAgentProfile(record);
    }

    return (
      getFallbackAgentPool({ includeInactive: true }).find(
        (agent) => agent.id === agentId || agent.identityKey === agentId,
      ) ?? null
    );
  } catch (error) {
    console.warn("Falling back to bundled Agent Pool entry.", error);

    return (
      getFallbackAgentPool({ includeInactive: true }).find(
        (agent) => agent.id === agentId || agent.identityKey === agentId,
      ) ?? null
    );
  }
}

// 这里在干嘛：
// 按 identityKey 读取一个公开 agent 身份。
// 为什么这么写：
// identityKey 是 AgentDuel 里更稳定的“公开身份键”，
// 比 runtimeKey 更适合拿来做 profile、history、leaderboard 这些公共身份关联。
// 这里用 findUnique，是因为 identityKey 在 schema 里本来就是唯一的。
// 最后返回什么：
// 返回匹配这个 identityKey 的 InternalAgentProfile，找不到就返回 null。
export async function getAgentPoolEntryByIdentityKey(
  identityKey: string,
): Promise<InternalAgentProfile | null> {
  try {
    const record = await prisma.agentProfile.findUnique({
      where: {
        identityKey,
      },
    });

    if (record) {
      return mapRecordToAgentProfile(record);
    }

    return (
      getFallbackAgentPool({ includeInactive: true }).find(
        (agent) => agent.identityKey === identityKey,
      ) ?? null
    );
  } catch (error) {
    console.warn("Falling back to bundled Agent Pool entry.", error);

    return (
      getFallbackAgentPool({ includeInactive: true }).find(
        (agent) => agent.identityKey === identityKey,
      ) ?? null
    );
  }
}
