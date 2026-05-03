"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ChevronUp,
  Loader2,
  Minus,
  RefreshCw,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useEffect, useState } from "react";

import { getLandingAgentVisual } from "@/lib/landing/agent-visual-config";
import { AGENT_POOL } from "@/lib/server/agents/agent-pool-data";

type LeaderboardDockEntry = {
  badge: string;
  bestStreak: number;
  currentRank: number;
  currentStreak: number;
  id: string;
  identityKey: string;
  name: string;
  rankDelta: number;
  riskProfile: "low" | "medium" | "high";
  style: string;
  totalLosses: number;
  totalWins: number;
  winRate: number | null;
};

function formatWinRate(winRate: number | null) {
  return winRate == null ? "N/A" : `${Math.round(winRate * 100)}%`;
}

function formatRankDelta(rankDelta: number) {
  if (rankDelta > 0) {
    return `+${rankDelta}`;
  }

  return rankDelta.toString();
}

function getDeltaTone(rankDelta: number) {
  if (rankDelta > 0) {
    return "#42f5c8";
  }

  if (rankDelta < 0) {
    return "#ff4d4d";
  }

  return "#a3a3a3";
}

function getRankTone(rank: number) {
  if (rank === 1) {
    return "#fbbf24";
  }

  if (rank === 2) {
    return "#38bdf8";
  }

  if (rank === 3) {
    return "#42f5c8";
  }

  return "#fcee09";
}

function getFallbackLeaderboard() {
  return AGENT_POOL.filter((agent) => agent.isActive)
    .map<LeaderboardDockEntry>((agent) => {
      const matchCount = agent.totalWins + agent.totalLosses;

      return {
        badge: agent.badge,
        bestStreak: agent.bestStreak,
        currentRank: agent.currentRank,
        currentStreak: agent.currentStreak,
        id: agent.identityKey,
        identityKey: agent.identityKey,
        name: agent.name,
        rankDelta:
          agent.previousRank == null ? 0 : agent.previousRank - agent.currentRank,
        riskProfile: agent.riskProfile,
        style: agent.style,
        totalLosses: agent.totalLosses,
        totalWins: agent.totalWins,
        winRate: matchCount === 0 ? null : agent.totalWins / matchCount,
      };
    })
    .sort((left, right) => left.currentRank - right.currentRank)
    .slice(0, 5);
}

async function readLeaderboard() {
  try {
    const response = await fetch("/api/leaderboard?limit=5", {
      cache: "no-store",
    });

    if (!response.ok) {
      return getFallbackLeaderboard();
    }

    const entries = (await response.json()) as LeaderboardDockEntry[];

    return entries.length > 0 ? entries : getFallbackLeaderboard();
  } catch {
    return getFallbackLeaderboard();
  }
}

export function GlobalLeaderboardDock() {
  const [entries, setEntries] = useState<LeaderboardDockEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function refreshLeaderboard() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setEntries(await readLeaderboard());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load arena rankings.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    readLeaderboard()
      .then((nextEntries) => {
        if (isMounted) {
          setEntries(nextEntries);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load arena rankings.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={styles.dock}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        style={styles.trigger}
        aria-expanded={isOpen}
        aria-label="Open arena leaderboard"
      >
        <span style={styles.triggerInner}>
          <span style={styles.triggerIcon}>
            <Trophy className="h-4 w-4" />
          </span>
          <span style={styles.triggerText}>
            Board
          </span>
        </span>
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.aside
            initial={{ opacity: 0, scale: 0.96, y: -14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -14 }}
            transition={{ duration: 0.18 }}
            style={styles.panel}
          >
            <div style={styles.header}>
              <div>
                <div style={styles.eyebrow}>
                  <Activity className="h-3.5 w-3.5" />
                  Live Standings
                </div>
                <h2 style={styles.title}>
                  Agent Board
                </h2>
              </div>

              <div style={styles.actions}>
                <button
                  type="button"
                  onClick={refreshLeaderboard}
                  style={styles.iconButton}
                  aria-label="Refresh leaderboard"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={styles.iconButton}
                  aria-label="Close leaderboard"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div style={styles.list}>
              {entries.length === 0 && !isLoading ? (
                <div style={styles.empty}>
                  No agents ranked yet
                </div>
              ) : null}

              {entries.map((agent) => (
                <AgentRankRow key={agent.id} agent={agent} />
              ))}
            </div>

            {errorMessage ? (
              <div style={styles.error}>
                {errorMessage}
              </div>
            ) : null}
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AgentRankRow({ agent }: { agent: LeaderboardDockEntry }) {
  const visual = getLandingAgentVisual(agent.identityKey);
  const rankTone = getRankTone(agent.currentRank);
  const deltaTone = getDeltaTone(agent.rankDelta);

  return (
    <Link
      href={`/agents/${agent.id}`}
      style={styles.row}
    >
      <div
        style={{
          ...styles.rank,
          color: rankTone,
          borderColor: rankTone,
        }}
      >
        #{agent.currentRank}
      </div>

      <div
        style={{
          ...styles.avatarFrame,
          borderColor: visual.accent,
        }}
      >
        {visual.image ? (
          <Image
            src={visual.image}
            alt={agent.name}
            fill
            sizes="48px"
            style={{ objectFit: "cover" }}
          />
        ) : null}
      </div>

      <div style={styles.agentBody}>
        <div style={styles.agentName}>
          {agent.name}
        </div>
        <div style={styles.agentMeta}>
          <span style={styles.badge}>
            {agent.badge}
          </span>
          <span style={styles.record}>
            {agent.totalWins}W-{agent.totalLosses}L
          </span>
          <span style={styles.winRate}>
            {formatWinRate(agent.winRate)}
          </span>
        </div>
      </div>

      <div style={styles.metrics}>
        <div
          style={{
            ...styles.delta,
            color: deltaTone,
          }}
        >
          {agent.rankDelta > 0 ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {formatRankDelta(agent.rankDelta)}
        </div>
        <div style={styles.streak}>
          <Zap className="h-3 w-3" />
          {agent.currentStreak}
        </div>
      </div>
    </Link>
  );
}

const styles = {
  actions: {
    display: "flex",
    gap: 8,
  },
  agentBody: {
    minWidth: 0,
  },
  agentMeta: {
    display: "flex",
    gap: 8,
    marginTop: 5,
    minWidth: 0,
  },
  agentName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  avatarFrame: {
    background: "#000000",
    border: "2px solid #fcee09",
    height: 46,
    overflow: "hidden",
    position: "relative",
    width: 46,
  },
  badge: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: "0.14em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  delta: {
    alignItems: "center",
    display: "flex",
    fontSize: 10,
    fontWeight: 900,
    gap: 3,
  },
  dock: {
    alignItems: "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    position: "fixed",
    right: 28,
    top: 76,
    zIndex: 90,
  },
  empty: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "rgba(255,255,255,0.66)",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.18em",
    padding: 14,
    textAlign: "center",
    textTransform: "uppercase",
  },
  error: {
    background: "rgba(255,77,77,0.12)",
    border: "1px solid #ff4d4d",
    color: "#ff8a8a",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.16em",
    marginTop: 10,
    padding: 8,
    textTransform: "uppercase",
  },
  eyebrow: {
    alignItems: "center",
    color: "#fcee09",
    display: "flex",
    fontSize: 9,
    fontWeight: 900,
    gap: 8,
    letterSpacing: "0.22em",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  header: {
    alignItems: "flex-start",
    borderBottom: "3px solid #fcee09",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 10,
  },
  iconButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.26)",
    color: "#ffffff",
    display: "flex",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  list: {
    display: "grid",
    gap: 7,
  },
  metrics: {
    alignItems: "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 46,
  },
  panel: {
    background: "#050505",
    border: "4px solid #000000",
    boxShadow: "12px 12px 0 rgba(0,0,0,0.56)",
    color: "#ffffff",
    maxHeight: "calc(100vh - 120px)",
    overflow: "auto",
    padding: 12,
    width: "min(370px, calc(100vw - 32px))",
  },
  rank: {
    alignItems: "center",
    border: "2px solid currentColor",
    display: "flex",
    fontSize: 13,
    fontWeight: 900,
    height: 38,
    justifyContent: "center",
    width: 42,
  },
  record: {
    color: "#fcee09",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  row: {
    alignItems: "center",
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#ffffff",
    display: "grid",
    gap: 8,
    gridTemplateColumns: "42px 46px minmax(0, 1fr) auto",
    padding: 8,
    textDecoration: "none",
  },
  streak: {
    alignItems: "center",
    color: "#fbbf24",
    display: "flex",
    fontSize: 10,
    fontWeight: 900,
    gap: 3,
  },
  title: {
    color: "#ffffff",
    fontFamily: 'Impact, Haettenschweiler, "Arial Black", sans-serif',
    fontSize: 25,
    fontStyle: "italic",
    fontWeight: 900,
    lineHeight: 0.9,
    textTransform: "uppercase",
  },
  trigger: {
    background: "#050505",
    border: "3px solid #fcee09",
    boxShadow: "6px 6px 0 rgba(0,0,0,0.58)",
    color: "#fcee09",
    padding: "8px 10px",
  },
  triggerIcon: {
    alignItems: "center",
    display: "flex",
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  triggerInner: {
    alignItems: "center",
    display: "flex",
    gap: 8,
  },
  triggerText: {
    color: "#fcee09",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  },
  winRate: {
    color: "#42f5c8",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
} satisfies Record<string, CSSProperties>;
