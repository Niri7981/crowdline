import { prisma } from "@/lib/db/prisma";

import {
  getHotPolymarketEvents,
  mapHotPolymarketEventToCandidate,
} from "./get-hot-polymarket-events";
import { normalizePolymarketEventWithReason } from "./normalize-event";
import { fetchPolymarketEventCandidates, type PolymarketRawEventCandidate } from "./sources/polymarket";
import type { InternalEventPoolItem, SeedEventPoolResult } from "./types";

type SeedEventPoolInput = {
  candidates?: PolymarketRawEventCandidate[];
  limit?: number;
};

// seed-event-pool.ts 负责把 normalized events 写进 Crowdline 自己的事件池。
// 这里会去重、过滤无效候选，并把外部 source 的变化 upsert 到内部存储层。
export async function seedEventPool(
  input: SeedEventPoolInput = {},
): Promise<SeedEventPoolResult> {
  const rawCandidates =
    input.candidates ??
    (await getHotPolymarketEvents(input.limit ?? 10)).map(
      mapHotPolymarketEventToCandidate,
    );

  const dedupeKeys = new Set<string>();
  const validEvents: Array<Omit<InternalEventPoolItem, "id">> = [];
  const invalidBreakdown: Record<string, number> = {};
  let inserted = 0;
  let invalid = 0;
  let skipped = 0;
  let updated = 0;

  for (const candidate of rawCandidates) {
    const normalized = normalizePolymarketEventWithReason(candidate);

    if (!normalized.ok) {
      invalid += 1;
      invalidBreakdown[normalized.reason] =
        (invalidBreakdown[normalized.reason] ?? 0) + 1;
      continue;
    }

    const normalizedEvent = normalized.value;

    const dedupeKey = `${normalizedEvent.sourceKey}:${normalizedEvent.externalEventId}`;

    if (dedupeKeys.has(dedupeKey)) {
      skipped += 1;
      continue;
    }

    dedupeKeys.add(dedupeKey);
    validEvents.push(normalizedEvent);
  }

  await prisma.$transaction(async (tx) => {
    // 这里在干嘛：
    // 每次 sync 都把 Polymarket 当前热榜重建成 Crowdline 自己的 playable pool。
    // 为什么这么写：
    // 旧的长尾候选和已经单边化的市场会让 World Cup V1 失焦；这里保留“这次同步后仍有悬念”的内部事件。
    // 最后返回什么：
    // transaction 结束后，EventPoolItem 只剩当前热榜候选处于 playable/ready。
    await tx.eventPoolItem.updateMany({
      data: {
        playable: false,
        status: "archived",
      },
      where: {
        sourceKey: "polymarket",
      },
    });

    for (const normalized of validEvents) {
      const existing = await tx.eventPoolItem.findUnique({
        where: {
          sourceKey_externalEventId: {
            externalEventId: normalized.externalEventId,
            sourceKey: normalized.sourceKey,
          },
        },
      });

      await tx.eventPoolItem.upsert({
        create: normalized,
        update: normalized,
        where: {
          sourceKey_externalEventId: {
            externalEventId: normalized.externalEventId,
            sourceKey: normalized.sourceKey,
          },
        },
      });

      if (existing) {
        updated += 1;
      } else {
        inserted += 1;
      }
    }
  });

  return {
    inserted,
    invalid,
    invalidBreakdown,
    skipped,
    updated,
  };
}

export async function seedEventPoolFromGeneralPolymarket(
  input: SeedEventPoolInput = {},
): Promise<SeedEventPoolResult> {
  return seedEventPool({
    ...input,
    candidates:
      input.candidates ??
      (await fetchPolymarketEventCandidates({ limit: input.limit })),
  });
}
