export type LandingEventCategory =
  | "Crypto"
  | "DeFi"
  | "Finance"
  | "Macro"
  | "Social"
  | "Sports";

export interface LandingEvent {
  id: string;
  question: string;
  shortQuestion: string;
  category: LandingEventCategory;
  deadline: string;
  source: string;
  sourceShort: string;
  consensus: string;
  difficulty: "High" | "Medium" | "Low";
  status: "OPEN" | "SETTLING";
}

export const MOCK_EVENTS: LandingEvent[] = [
  {
    id: "e1",
    question: "Will SOL break $200 before the end of May?",
    shortQuestion: "SOL > $200 BY MAY 31",
    category: "Crypto",
    deadline: "May 31, 2026",
    source: "Pyth Mainnet",
    sourceShort: "Pyth",
    consensus: "68% YES",
    difficulty: "Medium",
    status: "OPEN",
  },
  {
    id: "e2",
    question: "Will BTC close above $100k this week?",
    shortQuestion: "BTC > $100K THIS WEEK",
    category: "Crypto",
    deadline: "Sunday, UTC Midnight",
    source: "Coinbase API",
    sourceShort: "Coinbase",
    consensus: "42% YES",
    difficulty: "High",
    status: "OPEN",
  },
  {
    id: "e3",
    question: "Will ETH outperform SOL in the next 24h?",
    shortQuestion: "ETH OUTRUNS SOL IN 24H",
    category: "Crypto",
    deadline: "May 4, 2026",
    source: "Binance Feed",
    sourceShort: "Binance",
    consensus: "55% YES",
    difficulty: "High",
    status: "OPEN",
  },
  {
    id: "e4",
    question: "Will a Solana spot ETF receive approval before June 30?",
    shortQuestion: "SOL ETF BY JUN 30",
    category: "Finance",
    deadline: "June 30, 2026",
    source: "Polymarket Event Pool",
    sourceShort: "Polymarket",
    consensus: "37% YES",
    difficulty: "High",
    status: "OPEN",
  },
  {
    id: "e5",
    question: "Will Jupiter route more than $2B in daily volume this week?",
    shortQuestion: "JUP > $2B VOLUME",
    category: "DeFi",
    deadline: "May 10, 2026",
    source: "Jupiter Metrics",
    sourceShort: "Jupiter",
    consensus: "61% YES",
    difficulty: "Medium",
    status: "OPEN",
  },
  {
    id: "e6",
    question: "Will the next FOMC decision keep rates unchanged?",
    shortQuestion: "FOMC HOLDS RATES",
    category: "Macro",
    deadline: "June 17, 2026",
    source: "FedWatch",
    sourceShort: "FedWatch",
    consensus: "74% YES",
    difficulty: "Low",
    status: "OPEN",
  },
  {
    id: "e7",
    question: "Will Nvidia print a new all-time high before Friday close?",
    shortQuestion: "NVDA NEW ATH",
    category: "Finance",
    deadline: "May 8, 2026",
    source: "NASDAQ Feed",
    sourceShort: "NASDAQ",
    consensus: "48% YES",
    difficulty: "Medium",
    status: "OPEN",
  },
  {
    id: "e8",
    question: "Will the AI token index gain more than 10% this week?",
    shortQuestion: "AI TOKENS +10%",
    category: "Crypto",
    deadline: "May 10, 2026",
    source: "CoinGecko Basket",
    sourceShort: "CoinGecko",
    consensus: "33% YES",
    difficulty: "High",
    status: "OPEN",
  },
  {
    id: "e9",
    question: "Will Solana memecoins outperform L1 tokens over the next 24h?",
    shortQuestion: "MEMES BEAT L1S",
    category: "Social",
    deadline: "May 4, 2026",
    source: "DEX Screener",
    sourceShort: "DEX",
    consensus: "52% YES",
    difficulty: "Medium",
    status: "OPEN",
  },
  {
    id: "e10",
    question: "Will the NBA Finals top seed win Game 1?",
    shortQuestion: "TOP SEED WINS G1",
    category: "Sports",
    deadline: "June 4, 2026",
    source: "Sportsbook Composite",
    sourceShort: "Sportsbook",
    consensus: "57% YES",
    difficulty: "Medium",
    status: "OPEN",
  },
  {
    id: "e11",
    question: "Will the Champions League final finish over 2.5 goals?",
    shortQuestion: "UCL FINAL O2.5",
    category: "Sports",
    deadline: "May 30, 2026",
    source: "Opta Match Feed",
    sourceShort: "Opta",
    consensus: "46% YES",
    difficulty: "High",
    status: "OPEN",
  },
  {
    id: "e12",
    question: "Will the S&P 500 close higher this week?",
    shortQuestion: "S&P CLOSES GREEN",
    category: "Finance",
    deadline: "May 8, 2026",
    source: "NYSE Composite",
    sourceShort: "NYSE",
    consensus: "59% YES",
    difficulty: "Low",
    status: "OPEN",
  },
];
