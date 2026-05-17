//外部来源 key
export type ExternalEventSourceKey = "polymarket";

//状态机定义
export type EventPoolStatus =
  | "candidate" //候选
  | "ready" //准备好
  | "live" //正在使用
  | "settled" //已结算
  | "archived"; //已归档

export type EventPoolCategory =
  | "crypto"
  | "macro"
  | "headline"
  | "sports"
  | "other";

// 这是 arena 内部统一使用的 normalized event 结构。
// 后面的 round、selection、profile、leaderboard 都只应该依赖这个形状，
// 不应该直接依赖任何外部事件源的原始字段。
export type InternalEventPoolItem = {
  id: string;
  sourceKey: ExternalEventSourceKey;
  externalEventId: string;
  externalMarketId: string | null;
  slug: string | null;
  title: string;
  question: string;
  category: EventPoolCategory;
  marketSymbol: string;
  yesLabel: string;
  noLabel: string;
  startsAt: Date | null;
  endsAt: Date | null;
  durationSeconds: number;
  resolutionSource: string;
  sourceLabel: string;
  externalUrl: string | null;
  currentPrice: number | null;
  volumeUsd: number | null;
  liquidityScore: number | null;
  status: EventPoolStatus;
  playable: boolean;
  spectatorNote: string;
  stageLabel: string;
};

export type GetEventPoolInput = {
  category?: EventPoolCategory;
  includeUnplayable?: boolean;
  limit?: number;
  status?: EventPoolStatus | EventPoolStatus[];
};

export type HotPolymarketEvent = {
  id: string;
  sourceKey: "polymarket";
  externalEventId: string;
  externalMarketId: string | null;
  slug: string | null;
  title: string;
  question: string;
  category: EventPoolCategory;
  yesLabel: string;
  noLabel: string;
  endsAt: string | null;
  externalUrl: string | null;
  yesPrice: number | null;
  noPrice: number | null;
  volumeUsd: number | null;
  liquidityScore: number | null;
  spectatorNote: string;
  stageLabel: string;
};

export type SeedEventPoolResult = {
  inserted: number;
  invalid: number;
  invalidBreakdown: Record<string, number>;
  skipped: number;
  updated: number;
};
