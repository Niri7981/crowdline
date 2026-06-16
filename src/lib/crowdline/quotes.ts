export type CrowdlineSide = "down" | "up";

export type CrowdlineQuote = {
  downPrice: number;
  upPrice: number;
};

const MIN_QUOTE_PRICE = 0.05;
const MAX_QUOTE_PRICE = 0.95;

function clampPrice(value: number) {
  return Math.min(MAX_QUOTE_PRICE, Math.max(MIN_QUOTE_PRICE, value));
}

// 这里在干嘛：
// 根据底层 Polymarket 从 open 到 current 的漂移，生成 Crowdline 的 UP / DOWN 系统报价。
// 为什么这么写：
// V1 不做完整订单簿，先用一个明确、可解释的报价函数把“市场方向”变成可交易价格。
// 漂移越向上，UP 越贵；漂移越向下，DOWN 越贵，同时保留 5c 到 95c 的边界。
// 最后返回什么：
// 返回 upPrice 和 downPrice，两个价格总和为 1。
export function buildCrowdlineQuote(driftSinceOpen: number | null): CrowdlineQuote {
  const drift = driftSinceOpen ?? 0;
  const upPrice = clampPrice(0.5 + drift * 2);

  return {
    downPrice: Number((1 - upPrice).toFixed(4)),
    upPrice: Number(upPrice.toFixed(4)),
  };
}

export function getQuotePrice(quote: CrowdlineQuote, side: CrowdlineSide) {
  return side === "up" ? quote.upPrice : quote.downPrice;
}

export function calculateShares(amount: number, quotePrice: number) {
  if (!Number.isFinite(amount) || !Number.isFinite(quotePrice) || quotePrice <= 0) {
    return 0;
  }

  return amount / quotePrice;
}
