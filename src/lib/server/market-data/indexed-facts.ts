import { prisma } from "@/lib/db/prisma";
import {
  assertSupportedMarketSymbol,
  buildMarketObservation,
} from "@/lib/server/market-data/get-live-price";
import type {
  LivePriceObservation,
  MarketObservationContext,
  MarketObservationReference,
  SupportedMarketSymbol,
} from "@/lib/server/market-data/types";

type IndexedFactObservationInput = {
  marketSymbol: string;
  previousPoint?: MarketObservationReference | null;
  roundEndsAt?: Date | null;
};

type IndexedSettlementFactInput = {
  marketSymbol: string;
  settledAt?: Date | null;
};

type IndexedMarketObservationInput = {
  externalMarketId: string;
  previousPoint?: MarketObservationReference | null;
  roundEndsAt?: Date | null;
  side?: "yes" | "no";
};

type IndexedSettlementMarketInput = {
  externalMarketId: string;
  settledAt?: Date | null;
  side?: "yes" | "no";
};

const SETTLEMENT_FACT_TOLERANCE_MS = 2 * 60 * 1000;
const POLYMARKET_OBSERVATION_SYMBOL: SupportedMarketSymbol = "SOL";

async function readLatestAnyMarketPriceTick(
  externalMarketId: string,
  side: "yes" | "no" = "yes",
) {
  return prisma.marketTick.findFirst({
    orderBy: [{ observedAt: "desc" }, { id: "desc" }],
    where: {
      marketId: externalMarketId,
      side,
      sourceKey: "polymarket",
    },
  });
}

// 这里在干嘛：
// 从 indexer 已经落库的 FactPriceTick 里读取某个 symbol 最新的一条事实价格。
// 为什么这么写：
// round tick 不应该自己现场请求外部 API；它应该消费独立 indexer 预先写好的事实流。
// 最后返回什么：
// 返回最新 indexed fact；如果 indexer 没有写入过这个 symbol，就抛出明确错误。
async function readLatestFactPriceTick(marketSymbol: string) {
  const symbol = assertSupportedMarketSymbol(marketSymbol);
  const tick = await prisma.factPriceTick.findFirst({
    orderBy: [{ observedAt: "desc" }, { id: "desc" }],
    where: {
      symbol,
    },
  });

  if (!tick) {
    throw new Error(
      `No indexed fact price available for ${symbol}. Start npm run market:indexer before ticking live rounds.`,
    );
  }

  return tick;
}

// 这里在干嘛：
// 把最新 indexed fact 包装成 live round 使用的 market observation。
// 为什么这么写：
// UI 和 agent runtime 已经理解 delta、pctChange、deadline 等 observation 语义；
// 这里只替换事实来源，不改 round 层的数据形状。
// 最后返回什么：
// 返回带 delta / pctChange / timeToDeadline 的 indexed price observation。
export async function observeIndexedFactPrice(
  input: IndexedFactObservationInput,
): Promise<LivePriceObservation> {
  const tick = await readLatestFactPriceTick(input.marketSymbol);
  const symbol = assertSupportedMarketSymbol(input.marketSymbol);

  return buildMarketObservation(
    {
      price: tick.price,
      sourceLabel: `Indexed ${tick.sourceLabel}`,
      symbol,
      timestamp: tick.observedAt,
    },
    {
      previousPoint: input.previousPoint ?? null,
      roundEndsAt: input.roundEndsAt ?? null,
    },
  );
}

// 这里在干嘛：
// 从 indexer 已落库的 MarketTick 里读取某个 Polymarket 市场最新 YES/NO 价格。
// 为什么这么写：
// 当 round 题目本身是“预测预测市场 5 分钟怎么动”时，tick 的事实源必须是市场价格本身，
// 不能再借用 SOL/BTC/ETH 资产事实价格。
// 最后返回什么：
// 返回带 delta / pctChange / timeToDeadline 的 Polymarket 市场价格 observation。
export async function observeIndexedMarketPrice(
  input: IndexedMarketObservationInput,
): Promise<LivePriceObservation> {
  const targetSide = input.side ?? "yes";
  const tick = await readLatestAnyMarketPriceTick(input.externalMarketId, targetSide);

  if (!tick) {
    throw new Error(
      `No indexed market price available for Polymarket market ${input.externalMarketId}. Start npm run market:indexer with this market before ticking live rounds.`,
    );
  }

  return buildMarketObservation(
    {
      price: tick.price,
      sourceLabel: `Indexed ${tick.sourceLabel}`,
      symbol: POLYMARKET_OBSERVATION_SYMBOL,
      timestamp: tick.observedAt,
    },
    {
      previousPoint: input.previousPoint ?? null,
      roundEndsAt: input.roundEndsAt ?? null,
    },
  );
}

// 这里在干嘛：
// 为 settlement 找到 round 截止时间附近已经被 indexer 记录下来的事实价格。
// 为什么这么写：
// 结算应该使用截止点附近的公共事实记录，而不是结算按钮点击时才临时请求外部 API。
// 最后返回什么：
// 返回最适合作为结算事实的 indexed observation；太旧则抛错。
export async function readSettlementFactPrice(
  input: IndexedSettlementFactInput,
): Promise<LivePriceObservation> {
  const symbol = assertSupportedMarketSymbol(input.marketSymbol);
  const settledAt = input.settledAt ?? new Date();
  const tick = await prisma.factPriceTick.findFirst({
    orderBy: [{ observedAt: "desc" }, { id: "desc" }],
    where: {
      observedAt: {
        lte: settledAt,
      },
      symbol,
    },
  });

  if (!tick) {
    throw new Error(
      `No indexed settlement fact available for ${symbol} before ${settledAt.toISOString()}.`,
    );
  }

  const ageMs = Math.abs(settledAt.getTime() - tick.observedAt.getTime());

  if (ageMs > SETTLEMENT_FACT_TOLERANCE_MS) {
    throw new Error(
      `Latest indexed settlement fact for ${symbol} is too stale: observed ${tick.observedAt.toISOString()}.`,
    );
  }

  return buildMarketObservation(
    {
      price: tick.price,
      sourceLabel: `Indexed ${tick.sourceLabel}`,
      symbol,
      timestamp: tick.observedAt,
    },
    {} satisfies MarketObservationContext,
  );
}

// 这里在干嘛：
// 为 Polymarket 市场动量 round 找到截止时间附近的市场价格记录。
// 为什么这么写：
// 这类 round 结算的是市场共识有没有上移，而不是外部资产事实价格有没有变化；
// 所以结算也必须读取 MarketTick。
// 最后返回什么：
// 返回可用于结算的 Polymarket 市场 observation；太旧则抛错。
export async function readSettlementMarketPrice(
  input: IndexedSettlementMarketInput,
): Promise<LivePriceObservation> {
  const settledAt = input.settledAt ?? new Date();
  const tick = await prisma.marketTick.findFirst({
    orderBy: [{ observedAt: "desc" }, { id: "desc" }],
    where: {
      marketId: input.externalMarketId,
      observedAt: {
        lte: settledAt,
      },
      side: input.side ?? "yes",
      sourceKey: "polymarket",
    },
  });

  if (!tick) {
    throw new Error(
      `No indexed settlement market price available for Polymarket market ${input.externalMarketId} before ${settledAt.toISOString()}.`,
    );
  }

  const ageMs = Math.abs(settledAt.getTime() - tick.observedAt.getTime());

  if (ageMs > SETTLEMENT_FACT_TOLERANCE_MS) {
    throw new Error(
      `Latest indexed settlement market price for ${input.externalMarketId} is too stale: observed ${tick.observedAt.toISOString()}.`,
    );
  }

  return buildMarketObservation(
    {
      price: tick.price,
      sourceLabel: `Indexed ${tick.sourceLabel}`,
      symbol: POLYMARKET_OBSERVATION_SYMBOL,
      timestamp: tick.observedAt,
    },
    {} satisfies MarketObservationContext,
  );
}
