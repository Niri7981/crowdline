export type DemoMarketInput = {
  durationSeconds?: number;
  externalMarketId?: string | null;
  marketSymbol?: string;
  observationType?: "fact-price" | "polymarket-price";
  question?: string;
  resolutionSource?: string;
  slug?: string | null;
  startPrice?: number | null;
  startsAt?: Date;
};

export type DemoMarketSnapshot = {
  currentPrice: number;
  endsAt: Date;
  externalMarketId: string | null;
  marketSymbol: string;
  observationType: "fact-price" | "polymarket-price";
  question: string;
  resolutionSource: string;
  slug: string | null;
  startPrice: number;
  startsAt: Date;
};

export type DemoMarketResolutionInput = {
  marketSymbol: string;
  observationType?: "fact-price" | "polymarket-price";
  roundId: string;
  startPrice: number;
};

export type DemoMarketResolution = {
  endPrice: number;
  outcome: "yes" | "no";
};

const DEFAULT_MARKET_SYMBOL = "SOL";
const DEFAULT_DURATION_SECONDS = 5 * 60;

const DEMO_PRICES: Record<string, number> = {
  BTC: 101_250,
  ETH: 3_240,
  SOL: 152.4,
};

// 把任意字符串稳定地转成一个数字种子。
// 用法：给同一场 round 生成“可重复”的伪随机结果，保证本地演示时每次结算一致。
function hashSeed(seed: string) {
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}

// 把秒数转成人更容易读的时间文案。
// 用法：给 event question 拼接展示文案，比如 “in 5 minutes”。
function formatDurationLabel(durationSeconds: number) {
  if (durationSeconds % 60 === 0) {
    const minutes = durationSeconds / 60;

    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return `${durationSeconds} second${durationSeconds === 1 ? "" : "s"}`;
}

// 创建一份本地 MVP 用的市场快照。
// 用法：在 createRound() 里生成一场 duel 的题目、起始价格、起止时间和展示文案。
// 输入：
// - durationSeconds：这场 duel 持续多久
// - marketSymbol：这场 duel 围绕哪个标的
// - startsAt：这场 duel 从什么时候开始
// 输出：
// - currentPrice / startPrice：开局时给 agent 决策用的价格
// - question：页面上展示的问题
// - startsAt / endsAt：后面倒计时和结算都会用到
export function buildDemoMarket(input: DemoMarketInput = {}): DemoMarketSnapshot {
  const durationSeconds = input.durationSeconds ?? DEFAULT_DURATION_SECONDS;
  const marketSymbol = input.marketSymbol ?? DEFAULT_MARKET_SYMBOL;
  const startsAt = input.startsAt ?? new Date();
  const endsAt = new Date(startsAt.getTime() + durationSeconds * 1000);
  const currentPrice = input.startPrice ?? DEMO_PRICES[marketSymbol] ?? 1;
  const durationLabel = formatDurationLabel(durationSeconds);
  const observationType = input.observationType ?? "fact-price";
  const question =
    input.question ??
    (observationType === "polymarket-price"
      ? `Will this market's YES price be higher in ${durationLabel}?`
      : `Will ${marketSymbol} be above the current price in ${durationLabel}?`);

  return {
    currentPrice,
    endsAt,
    externalMarketId: input.externalMarketId ?? null,
    marketSymbol,
    observationType,
    question,
    resolutionSource: input.resolutionSource ?? "Demo market oracle",
    slug: input.slug ?? null,
    startPrice: currentPrice,
    startsAt,
  };
}

// 本地 MVP 先用确定性规则模拟结算价格：
// 同一场 round 只要 roundId 和标的一样，结算结果就固定不变，方便反复演示。
// 用法：在 settleRound() 里根据 roundId、标的和起始价格，生成这场 duel 的结束价格与 outcome。
// 这样即使没有真实 oracle，我们也能稳定地完成“创建 -> 结算 -> 刷新后结果一致”的闭环。
export function resolveDemoMarket(
  input: DemoMarketResolutionInput,
): DemoMarketResolution {
  const hash = hashSeed(`${input.roundId}:${input.marketSymbol}`);
  const direction = hash % 2 === 0 ? 1 : -1;
  const moveBps = 40 + (hash % 140);
  const endPrice = Number(
    (input.startPrice * (1 + (direction * moveBps) / 10_000)).toFixed(2),
  );

  return {
    endPrice,
    outcome: endPrice > input.startPrice ? "yes" : "no",
  };
}
