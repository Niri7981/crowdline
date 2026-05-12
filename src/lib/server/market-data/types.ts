export type SupportedMarketSymbol = "BTC" | "ETH" | "SOL";

export type MarketObservationPoint = {
  price: number;
  sourceLabel: string;
  timestamp: Date;
};

export type MarketObservationReference = Pick<
  MarketObservationPoint,
  "price" | "timestamp"
>;

export type MarketObservationMetrics = {
  delta: number | null;
  pctChange: number | null;
  timeSinceLastTick: number | null;
  timeToDeadline: number | null;
};

export type MarketObservation = MarketObservationPoint &
  MarketObservationMetrics;

export type MarketObservationContext = {
  previousPoint?: MarketObservationReference | null;
  roundEndsAt?: Date | null;
};

export type LivePriceSnapshot = MarketObservationPoint & {
  symbol: SupportedMarketSymbol;
};

export type LivePriceObservation = LivePriceSnapshot &
  MarketObservationMetrics;
