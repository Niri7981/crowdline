import {
  readSettlementFactPrice,
  readSettlementMarketPrice,
} from "@/lib/server/market-data/indexed-facts";
import type { PersistedRoundRecord } from "@/lib/server/rounds/get-latest-round";
import type { ResolvedRoundOutcome } from "@/lib/server/settlement/resolve-round-outcome";

// 这里在干嘛：
// 用“当前价格是否高于 round 起始价”来结算短周期价格事件。
// 为什么这么写：
// 这是最小可验证的真实结算路径：不依赖主观判断，不依赖复杂市场结构，
// 只需要 round 的 startPrice 和 indexer 已经写下来的可信公开价格事实。
// 最后返回什么：
// 返回 yes/no outcome、最新 endPrice、结算来源和事实时间戳。
export async function resolvePriceThresholdRound(
  round: PersistedRoundRecord,
): Promise<ResolvedRoundOutcome> {
  if (!round.event) {
    throw new Error("Cannot resolve round outcome without round event.");
  }

  const now = new Date();
  const settlementFactAt =
    round.endsAt && round.endsAt.getTime() < now.getTime() ? round.endsAt : now;
  const indexedFact =
    round.event.observationType === "polymarket-price" &&
    round.event.externalMarketId
      ? await readSettlementMarketPrice({
          externalMarketId: round.event.externalMarketId,
          settledAt: settlementFactAt,
        })
      : await readSettlementFactPrice({
          marketSymbol: round.marketSymbol,
          settledAt: settlementFactAt,
        });
  const endPrice = Number(indexedFact.price.toFixed(2));

  return {
    endPrice,
    outcome: endPrice > round.event.startPrice ? "yes" : "no",
    resolutionSource: `${round.event.resolutionSource} via ${indexedFact.sourceLabel}`,
    settledAt: indexedFact.timestamp,
  };
}
