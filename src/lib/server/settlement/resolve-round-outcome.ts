import type { PersistedRoundRecord } from "@/lib/server/rounds/get-latest-round";
import { resolvePriceThresholdRound } from "@/lib/server/settlement/resolvers/price-threshold";

export type ResolvedRoundOutcome = {
  endPrice: number;
  outcome: "yes" | "no";
  resolutionSource: string;
  settledAt: Date;
};

// 这里在干嘛：
// 作为 settlement 层统一入口，把 round 交给合适的 resolver 去拿真实结果。
// 为什么这么写：
// `settle-round.ts` 不应该继续知道 demo 规则、价格源细节或事件类型分发逻辑；
// 先收口到一个入口，后续再按 event family 扩展 resolver matrix。
// 最后返回什么：
// 返回已经带外部事实结果的 round outcome。
export async function resolveRoundOutcome(
  round: PersistedRoundRecord,
): Promise<ResolvedRoundOutcome> {
  return resolvePriceThresholdRound(round);
}
