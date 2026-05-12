export type ArenaEvent = {
  id: string;
  question: string;
  resolutionSource: string;
  observationType?: "fact-price" | "polymarket-price";
  sourceKey?: string | null;
  externalMarketId?: string | null;
  slug?: string | null;
  outcome: "yes" | "no" | "pending";
};
