import type { CrowdlineSide } from "@/lib/crowdline/quotes";

export type CrowdlineStoredPosition = {
  avgPrice: number;
  marketId: string;
  side: CrowdlineSide;
  shares: number;
  spent: number;
  title: string;
};

export const CROWDLINE_BALANCE_STORAGE_KEY = "crowdline.fakeSolBalance";
export const CROWDLINE_POSITION_STORAGE_KEY = "crowdline.positions";
export const CROWDLINE_PORTFOLIO_EVENT = "crowdline:portfolio-updated";
export const CROWDLINE_STARTING_BALANCE = 250;

function canReadBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function formatCrowdlineSol(value: number) {
  return `${value.toFixed(2)} SOL`;
}

export function readCrowdlineBalance() {
  if (!canReadBrowserStorage()) {
    return CROWDLINE_STARTING_BALANCE;
  }

  const storedBalance = window.localStorage.getItem(CROWDLINE_BALANCE_STORAGE_KEY);
  const numericBalance = storedBalance ? Number(storedBalance) : CROWDLINE_STARTING_BALANCE;

  return Number.isFinite(numericBalance) ? numericBalance : CROWDLINE_STARTING_BALANCE;
}

export function writeCrowdlineBalance(balance: number) {
  if (!canReadBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(CROWDLINE_BALANCE_STORAGE_KEY, String(balance));
  window.dispatchEvent(new Event(CROWDLINE_PORTFOLIO_EVENT));
}

export function readCrowdlinePositions(): Record<string, CrowdlineStoredPosition> {
  if (!canReadBrowserStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CROWDLINE_POSITION_STORAGE_KEY);

    return raw ? (JSON.parse(raw) as Record<string, CrowdlineStoredPosition>) : {};
  } catch {
    return {};
  }
}

export function writeCrowdlinePositions(
  positions: Record<string, CrowdlineStoredPosition>,
) {
  if (!canReadBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(CROWDLINE_POSITION_STORAGE_KEY, JSON.stringify(positions));
  window.dispatchEvent(new Event(CROWDLINE_PORTFOLIO_EVENT));
}
