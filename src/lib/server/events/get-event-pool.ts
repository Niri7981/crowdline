import { prisma } from "@/lib/db/prisma";

import type { InternalEventPoolItem, GetEventPoolInput } from "./types";

export type {
  EventPoolCategory,
  EventPoolStatus,
  ExternalEventSourceKey,
  InternalEventPoolItem,
} from "./types";

type EventPoolRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.eventPoolItem.findFirst>>
>;

// 读取层和 normalize 层保持一致，避免 seed 进来的事件又被页面读层刷掉。
const MIN_EVENT_LEAD_MINUTES = 5;
const MAX_EVENT_HORIZON_DAYS = 365;

function mapRecordToInternalEvent(record: EventPoolRecord): InternalEventPoolItem {
  return {
    category: record.category as InternalEventPoolItem["category"],
    currentPrice: record.currentPrice,
    durationSeconds: record.durationSeconds,
    endsAt: record.endsAt,
    externalEventId: record.externalEventId,
    externalMarketId: record.externalMarketId,
    externalUrl: record.externalUrl,
    id: record.id,
    liquidityScore: record.liquidityScore,
    marketSymbol: record.marketSymbol,
    noLabel: record.noLabel,
    playable: record.playable,
    question: record.question,
    resolutionSource: record.resolutionSource,
    slug: record.slug,
    sourceKey: record.sourceKey as InternalEventPoolItem["sourceKey"],
    sourceLabel: record.sourceLabel,
    spectatorNote: record.spectatorNote,
    stageLabel: record.stageLabel,
    startsAt: record.startsAt,
    status: record.status as InternalEventPoolItem["status"],
    title: record.title,
    volumeUsd: record.volumeUsd,
    yesLabel: record.yesLabel,
  };
}

// 读取层再做一层 Crowdline 级过滤，避免历史上已经 seed 过的宽松候选继续出现在产品页面里。
// 这样市场页面展示的是“当前 World Cup V1 可用的内部事件”，不是所有历史归一化记录。
function isCurrentCrowdlineEvent(record: EventPoolRecord) {
  if (!record.playable) {
    return false;
  }

  if (!record.endsAt) {
    return false;
  }

  const now = Date.now();
  const endsAtMs = record.endsAt.getTime();
  const minLeadMs = MIN_EVENT_LEAD_MINUTES * 60 * 1000;
  const maxHorizonMs = MAX_EVENT_HORIZON_DAYS * 24 * 60 * 60 * 1000;

  return endsAtMs > now + minLeadMs && endsAtMs <= now + maxHorizonMs;
}

// get-event-pool.ts 只读取 Crowdline 自己的内部事件池。
// 默认只返回可玩且处于 ready/live 的候选，不碰任何外部 raw source shape。
export async function getEventPool(input: GetEventPoolInput = {}) {
  const statusFilter = Array.isArray(input.status)
    ? input.status
    : input.status
      ? [input.status]
      : ["ready", "live"];
  const records = await prisma.eventPoolItem.findMany({
    orderBy: [
      { liquidityScore: "desc" },
      { volumeUsd: "desc" },
      { createdAt: "desc" },
    ],
    take: input.limit,
    where: {
      category: input.category,
      playable: input.includeUnplayable ? undefined : true,
      status: {
        in: statusFilter,
      },
    },
  });

  return records
    .filter((record) =>
      input.includeUnplayable ? true : isCurrentCrowdlineEvent(record),
    )
    .map((record) => mapRecordToInternalEvent(record));
}

export async function getReadyEventPool(limit?: number) {
  return getEventPool({
    limit,
    status: "ready",
  });
}

export async function getEventPoolItemById(
  eventId: string,
): Promise<InternalEventPoolItem | null> {
  const record = await prisma.eventPoolItem.findUnique({
    where: {
      id: eventId,
    },
  });

  return record ? mapRecordToInternalEvent(record) : null;
}
