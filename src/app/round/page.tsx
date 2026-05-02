"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AgentBattleCard } from "@/components/round/AgentBattleCard";
import { EventDuelStage } from "@/components/round/EventDuelStage";
import { BattleActionTimeline } from "@/components/round/BattleActionTimeline";
import { SettlementPanel } from "@/components/round/SettlementPanel";
import type { RoundState, BankrollBalance } from "@/lib/types/round";
import type { AgentSummary } from "@/lib/types/agent";
import type { RoundAction } from "@/lib/types/action";
import { Zap, Loader2, AlertTriangle, RefreshCw, Swords } from "lucide-react";

type ApiError = {
  error?: string;
};

export type RoundProofReceipt = {
  anchoredAt?: string | null;
  explorerUrl?: string | null;
  network?: string | null;
  onchainProofAddress?: string | null;
  onchainSignature?: string | null;
  proofHash?: string | null;
  proofHashEncoding?: string | null;
  proofVersion?: number | null;
  slot?: number | null;
  verificationError?: string | null;
  verificationStatus?: "missing" | "mismatch" | "pending" | "verified";
  verified?: boolean;
};

export type RoundLeaderboardEntry = {
  bestStreak: number;
  currentRank: number;
  currentStreak: number;
  id: string;
  identityKey: string;
  name: string;
  rankDelta: number;
  totalLosses: number;
  totalWins: number;
  winRate: number | null;
};

type ProofApiRecord = Record<string, unknown>;

const PROOF_PAYLOAD_KEYS = [
  "proofVersion",
  "roundId",
  "createdAt",
  "settledAt",
  "eventId",
  "marketSymbol",
  "question",
  "resolutionSource",
  "outcome",
  "participants",
  "winnerIdentityKey",
  "winnerName",
  "winningSide",
  "finalBalance",
  "pnlUsd",
  "reputationEffects",
];

const FORCE_BLACK_TEXT_STYLE = {
  color: "#050505",
  WebkitTextFillColor: "#050505",
};

async function readRound() {
  const response = await fetch("/api/round", {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(payload?.error ?? "Failed to load duel round.");
  }

  return (await response.json()) as RoundState;
}

async function createRound() {
  const response = await fetch("/api/round", {
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(payload?.error ?? "Failed to create duel round.");
  }

  return (await response.json()) as RoundState;
}

function isRecord(value: unknown): value is ProofApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  return `{${Object.entries(value as ProofApiRecord)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, entryValue]) => {
      return `${JSON.stringify(key)}:${canonicalJson(entryValue)}`;
    })
    .join(",")}}`;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readString(record: ProofApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function readNumber(record: ProofApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function pickProofPayload(record: ProofApiRecord) {
  const payload = isRecord(record.payload) ? record.payload : record;

  return Object.fromEntries(
    PROOF_PAYLOAD_KEYS.flatMap((key) =>
      Object.prototype.hasOwnProperty.call(payload, key)
        ? [[key, payload[key]]]
        : [],
    ),
  );
}

async function readBattleProof(roundId: string): Promise<RoundProofReceipt | null> {
  const response = await fetch(`/api/battles/${roundId}/proof`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(payload?.error ?? "Failed to load battle proof.");
  }

  const raw = (await response.json()) as unknown;

  if (!isRecord(raw)) {
    return null;
  }

  const payloadRecord = isRecord(raw.payload) ? raw.payload : raw;
  const record = isRecord(raw.record) ? { ...raw.record, ...raw } : raw;
  const proofPayload = pickProofPayload(raw);
  const computedHash =
    Object.keys(proofPayload).length > 0
      ? await sha256Hex(canonicalJson(proofPayload))
      : null;

  return {
    anchoredAt: readString(record, ["anchoredAt", "onchainAnchoredAt"]),
    explorerUrl: readString(record, ["explorerUrl", "transactionUrl"]),
    network: readString(record, ["network", "cluster"]) ?? "localnet",
    onchainProofAddress: readString(record, [
      "onchainProofAddress",
      "proofAddress",
      "pda",
    ]),
    onchainSignature: readString(record, [
      "onchainSignature",
      "signature",
      "txSignature",
      "transactionSignature",
    ]),
    proofHash:
      readString(record, ["proofHash", "hash", "payloadHash"]) ?? computedHash,
    proofHashEncoding:
      readString(record, ["proofHashEncoding", "hashEncoding"]) ??
      "canonical-json-v1",
    proofVersion:
      readNumber(payloadRecord, ["proofVersion"]) ??
      readNumber(record, ["proofVersion"]),
    slot: readNumber(record, ["slot", "confirmedSlot"]),
    verificationError: readString(record, ["verificationError"]),
    verificationStatus:
      readString(record, ["verificationStatus"]) === "verified"
        ? "verified"
        : readString(record, ["verificationStatus"]) === "mismatch"
          ? "mismatch"
          : readString(record, ["verificationStatus"]) === "missing"
            ? "missing"
            : "pending",
    verified: record.verified === true,
  };
}

async function readLeaderboard(): Promise<RoundLeaderboardEntry[]> {
  const response = await fetch("/api/leaderboard?limit=5", {
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(payload?.error ?? "Failed to load leaderboard.");
  }

  return (await response.json()) as RoundLeaderboardEntry[];
}

function findAgentRoundData(
  round: RoundState,
  index: number,
): {
  action?: RoundAction;
  agent: AgentSummary;
  balance?: BankrollBalance;
} | null {
  const agent = round.agents[index];

  if (!agent) {
    return null;
  }

  return {
    action: round.actions.find((entry) => entry.agentId === agent.id),
    agent,
    balance: round.balances.find((entry) => entry.agentId === agent.id),
  };
}

type SettleAnchorResult =
  | {
      error: null;
      ok: true;
      onchainProofAddress: string;
      onchainSignature: string;
      proofHash: string;
    }
  | {
      error: string;
      ok: false;
    };

type SettleResponse = RoundState & {
  anchor?: SettleAnchorResult | null;
};

async function settleRound(): Promise<SettleResponse> {
  const response = await fetch("/api/settle", {
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(payload?.error ?? "Failed to settle duel round.");
  }

  return (await response.json()) as SettleResponse;
}

export default function RoundPage() {
  const [round, setRound] = useState<RoundState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [proof, setProof] = useState<RoundProofReceipt | null>(null);
  const [proofErrorMessage, setProofErrorMessage] = useState<string | null>(null);
  const [anchorErrorMessage, setAnchorErrorMessage] = useState<string | null>(null);
  const [isProofLoading, setIsProofLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<RoundLeaderboardEntry[]>([]);
  const [leaderboardErrorMessage, setLeaderboardErrorMessage] = useState<string | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [shouldScrollToProof, setShouldScrollToProof] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isCreating, startCreateTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSettling, startSettleTransition] = useTransition();
  const proofModuleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextRound = await readRound();
        if (!cancelled) {
          setRound(nextRound);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load duel round.");
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!round || round.status !== "settled") {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        if (!cancelled) {
          setIsProofLoading(true);
          setProofErrorMessage(null);
        }

        const nextProof = await readBattleProof(round.id);
        if (!cancelled) {
          setProof(nextProof);
        }
      } catch (error) {
        if (!cancelled) {
          setProofErrorMessage(
            error instanceof Error ? error.message : "Failed to load battle proof.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsProofLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [round]);

  useEffect(() => {
    let cancelled = false;

    if (!round || round.status !== "settled") {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        if (!cancelled) {
          setIsLeaderboardLoading(true);
          setLeaderboardErrorMessage(null);
        }

        const nextLeaderboard = await readLeaderboard();
        if (!cancelled) {
          setLeaderboard(nextLeaderboard);
        }
      } catch (error) {
        if (!cancelled) {
          setLeaderboardErrorMessage(
            error instanceof Error ? error.message : "Failed to load leaderboard.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLeaderboardLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [round]);

  useEffect(() => {
    if (!shouldScrollToProof || round?.status !== "settled") {
      return;
    }

    window.setTimeout(() => {
      proofModuleRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setShouldScrollToProof(false);
    }, 350);
  }, [round?.status, shouldScrollToProof]);

  function handleCreateRound() {
    setErrorMessage(null);
    setProof(null);
    setProofErrorMessage(null);
    setLeaderboard([]);
    setLeaderboardErrorMessage(null);
    startCreateTransition(async () => {
      try {
        const nextRound = await createRound();
        setRound(nextRound);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to create duel round.");
      }
    });
  }

  function handleRefreshRound() {
    setErrorMessage(null);
    startRefreshTransition(async () => {
      try {
        const nextRound = await readRound();
        setRound(nextRound);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to refresh duel round.");
      }
    });
  }

  function handleSettleRound() {
    setErrorMessage(null);
    setAnchorErrorMessage(null);
    startSettleTransition(async () => {
      try {
        const { anchor, ...nextRound } = await settleRound();
        setRound(nextRound as RoundState);
        setShouldScrollToProof(true);

        if (anchor && anchor.ok === false) {
          setAnchorErrorMessage(`Onchain anchor failed: ${anchor.error}`);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to settle duel round.");
      }
    });
  }

  const showBusyState = isCreating || isRefreshing || isSettling;

  if (isInitialLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center text-black"
        style={{
          background: "#fcee09",
          minHeight: "100vh",
          ...FORCE_BLACK_TEXT_STYLE,
        }}
      >
        <Loader2 className="h-12 w-12 animate-spin" style={FORCE_BLACK_TEXT_STYLE} />
        <p className="mt-4 font-mono font-black uppercase tracking-[0.4em]" style={FORCE_BLACK_TEXT_STYLE}>
          Syncing Arena
        </p>
      </div>
    );
  }

  if (!round) {
    return (
      <main
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-black"
        style={{ backgroundColor: "#fcee09", ...FORCE_BLACK_TEXT_STYLE }}
      >
        <style>{`
          .round-standby-black-text :where(h1, h2, h3, h4, h5, h6, p, a, button, span, div, li, small, strong, em, label) {
            color: #050505 !important;
            -webkit-text-fill-color: #050505 !important;
          }

          .round-standby-black-text svg {
            color: #050505 !important;
            stroke: #050505 !important;
          }
        `}</style>
        <div className="acid-grid-overlay absolute inset-0 opacity-30" />
        <div className="round-standby-black-text industrial-clip relative z-10 w-full max-w-2xl border-[6px] border-black bg-[#050505] p-10 text-center text-black">
           <Zap className="mx-auto mb-6 h-16 w-16 text-[#fcee09]" />
           <h2 className="mb-4 font-black uppercase italic leading-none tracking-tight text-6xl">Arena Standby</h2>
           <button
              onClick={handleCreateRound}
              disabled={isCreating}
              className="industrial-clip-sm group relative w-full border-[4px] border-black bg-[#fcee09] px-8 py-5 font-mono text-sm font-black uppercase tracking-[0.24em] text-black"
           >
              {isCreating ? "Initializing..." : "Engage Trial"}
           </button>
           {errorMessage && (
             <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-red-500 uppercase tracking-widest">
               <AlertTriangle className="h-4 w-4" /> {errorMessage}
             </div>
           )}
        </div>
      </main>
    );
  }

  const leftAgentData = findAgentRoundData(round, 0);
  const rightAgentData = findAgentRoundData(round, 1);
  const winnerReputation = round.settlement.winnerReputation;
  const losingAgentName =
    round.status === "settled"
      ? [leftAgentData?.agent, rightAgentData?.agent]
          .find((agent) => agent?.id !== round.settlement.winnerAgentId)
          ?.name
      : null;
  const winningSide = round.settlement.winningSide;
  const winnerAction = round.actions.find(
    (action) => action.agentId === round.settlement.winnerAgentId,
  );
  const loserAction = round.actions.find(
    (action) => action.agentId !== round.settlement.winnerAgentId,
  );
  const leftAction = leftAgentData?.action;
  const rightAction = rightAgentData?.action;
  const leftIsWinner =
    round.status === "settled" &&
    leftAgentData?.agent.id === round.settlement.winnerAgentId;
  const rightIsWinner =
    round.status === "settled" &&
    rightAgentData?.agent.id === round.settlement.winnerAgentId;

  return (
    <div
      className="round-black-text relative min-h-screen overflow-x-hidden text-black selection:bg-black selection:text-[#fcee09]"
      style={{ backgroundColor: "#fcee09" }}
    >
      <style>{`
        .round-black-text :where(h1, h2, h3, h4, h5, h6, p, a, button, span, div, li, small, strong, em, label) {
          color: #050505 !important;
          -webkit-text-fill-color: #050505 !important;
        }

        .round-black-text svg {
          color: #050505 !important;
          stroke: #050505 !important;
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="acid-grid-overlay absolute inset-0 opacity-30" />
        <div className="absolute left-[-12%] top-20 h-40 w-[58%] -skew-x-12 border-y-[6px] border-black bg-[#d8c900]/70" />
        <div className="absolute bottom-0 right-[-10%] h-56 w-[56%] -skew-x-12 border-t-[6px] border-black bg-[#d8c900]/70" />
      </div>

      <main className="relative z-10 mx-auto max-w-[1900px] px-4 py-6 md:px-8">
        
        {errorMessage && (
           <div className="mb-6 border-[4px] border-black bg-[#ff1f2d] px-6 py-4 text-black">
              <p className="font-mono text-xs font-black uppercase tracking-widest">System Alert: {errorMessage}</p>
           </div>
        )}

        <section
          className="industrial-clip flex min-h-[calc(100vh-150px)] flex-col border-[6px] border-black p-3 text-black md:p-5"
          style={{ backgroundColor: "#fcee09" }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b-[6px] border-black pb-4">
            <div>
              <div className="inline-flex border-2 border-black bg-black px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.24em] text-[#fcee09]">
                Product.Module / Live Arena
              </div>
              <h2 className="mt-2 font-black uppercase italic leading-none tracking-tight text-4xl text-black md:text-6xl">
                Battle Round
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="border-[3px] border-black bg-black px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#fcee09]">
                {round.status === "settled"
                  ? "Settlement Sealed / Winner Declared / Proof Ready"
                  : "Settlement Pending"}
              </div>
              <button
                className="industrial-clip-sm flex items-center gap-2 border-[3px] border-black bg-[#fcee09] px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-black disabled:cursor-not-allowed disabled:opacity-50"
                disabled={showBusyState}
                onClick={handleRefreshRound}
                type="button"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Sync
              </button>
              <button
                className="industrial-clip-sm flex items-center gap-2 border-[3px] border-black bg-black px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#fcee09] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={showBusyState || round.status === "settled"}
                onClick={handleSettleRound}
                type="button"
              >
                <Swords className="h-4 w-4" />
                {isSettling ? "Settling" : round.status === "settled" ? "Settled" : "Settle"}
              </button>
            </div>
          </div>

          <div className="mb-4 border-[4px] border-black bg-[#fcee09] px-4 py-3 text-center text-black">
            <div className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-black">
              Active Objective
            </div>
            <div className="mt-1 line-clamp-1 font-black uppercase italic leading-none text-xl md:text-3xl">
              {round.event.question}
            </div>
          </div>

          {round.status === "settled" && (
            <div
              className="mb-4 grid gap-4 border-[6px] border-black px-4 py-4 text-black lg:grid-cols-[1fr_auto]"
              style={{ backgroundColor: "#fcee09", color: "#050505" }}
            >
              <div className="text-left">
                <div className="font-mono text-[9px] font-black uppercase tracking-[0.24em]">
                  Duel Result Bar
                </div>
                <div
                  className="mt-1 font-black uppercase italic leading-none tracking-tight text-[clamp(36px,6vw,96px)]"
                  style={{ color: round.settlement.winnerAgentId.includes("momentum") ? "#ff1f2d" : "#39ff14" }}
                >
                  {round.settlement.winnerName} Defeats {losingAgentName ?? "The Field"}
                </div>
                <div className="mt-3 font-mono text-[10px] font-black uppercase tracking-[0.2em]">
                  {(winningSide ?? "winning").toUpperCase()} position won / +{round.settlement.pnlUsd.toFixed(2)} USDC / Rank impact {formatRankDelta(winnerReputation?.rankDelta ?? 0)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center lg:min-w-[420px]">
                <VerdictStat label="Side" value={(winningSide ?? "sealed").toUpperCase()} />
                <VerdictStat label="PnL" value={`+${round.settlement.pnlUsd.toFixed(2)}`} />
                <VerdictStat label="Rank Impact" value={formatRankDelta(winnerReputation?.rankDelta ?? 0)} />
              </div>
            </div>
          )}

          <div
            className="grid flex-1 items-stretch gap-2 md:gap-5"
            style={{
              gridTemplateColumns: "minmax(0, 1fr) clamp(88px, 12vw, 180px) minmax(0, 1fr)",
            }}
          >
            {leftAgentData && (
              <AgentBattleCard
                agent={leftAgentData.agent}
                action={leftAgentData.action}
                balance={leftAgentData.balance}
                isDefeated={round.status === "settled" && !leftIsWinner}
                isWinner={leftIsWinner}
                side="left"
              />
            )}

            <VersusColumn
              isSettled={round.status === "settled"}
              leftAction={leftAction}
              loserAction={loserAction}
              rightAction={rightAction}
              winnerAction={winnerAction}
              winnerName={round.settlement.winnerName}
            />

            {rightAgentData && (
              <AgentBattleCard
                agent={rightAgentData.agent}
                action={rightAgentData.action}
                balance={rightAgentData.balance}
                isDefeated={round.status === "settled" && !rightIsWinner}
                isWinner={rightIsWinner}
                side="right"
              />
            )}
          </div>
        </section>

        <section ref={proofModuleRef} className="mt-10 min-h-screen scroll-mt-6 space-y-8 pb-10">
          <EventDuelStage
            event={round.event}
            leftAgentName={leftAgentData?.agent.name}
            rightAgentName={rightAgentData?.agent.name}
            roundStatus={round.status}
          />

          <BattleActionTimeline
            actions={round.actions}
            roundStatus={round.status}
            winnerName={round.settlement.winnerName}
          />

          <SettlementPanel
            settlement={round.settlement}
            roundId={round.id}
            isSettled={round.status === "settled"}
            outcome={round.event.outcome}
            proof={proof}
            proofErrorMessage={proofErrorMessage}
            anchorErrorMessage={anchorErrorMessage}
            isProofLoading={isProofLoading}
            leaderboard={leaderboard}
            leaderboardErrorMessage={leaderboardErrorMessage}
            isLeaderboardLoading={isLeaderboardLoading}
          />
        </section>

      </main>

      <footer
        className="relative z-10 mt-8 border-t-[6px] border-black px-8 py-6 text-[#fcee09]"
        style={{ backgroundColor: "#050505" }}
      >
         <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 font-mono text-[9px] font-black uppercase tracking-[0.22em]">
            <span>Network: Solana Localnet</span>
            <span>Proof Mode: Enabled</span>
            <span>AgentDuel System Terminal</span>
         </div>
      </footer>
    </div>
  );
}

function VersusColumn({
  isSettled,
  leftAction,
  loserAction,
  rightAction,
  winnerAction,
  winnerName,
}: {
  isSettled: boolean;
  leftAction?: RoundAction;
  loserAction?: RoundAction;
  rightAction?: RoundAction;
  winnerAction?: RoundAction;
  winnerName: string;
}) {
  const primaryAction = isSettled ? winnerAction : leftAction;
  const rivalAction = isSettled ? loserAction : rightAction;
  const primaryConviction = primaryAction ? Math.round(primaryAction.sizeUsd) : null;
  const rivalConviction = rivalAction ? Math.round(rivalAction.sizeUsd) : null;

  return (
    <div className="flex h-full min-w-0 flex-col items-center justify-center gap-3">
      <div
        className="font-black italic leading-none tracking-tighter text-black"
        style={{ fontSize: "clamp(52px, 8vw, 150px)" }}
      >
        VS
      </div>
      <div className="w-full border-[4px] border-black bg-black p-2 text-center text-[#fcee09] shadow-[6px_6px_0_#000] md:p-3">
        <div className="font-mono text-[6px] font-black uppercase tracking-[0.12em] text-[#fcee09] md:text-[9px]">
          Arena Referee
        </div>
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-1 font-black uppercase italic text-black">
          <span className="border-[2px] border-black bg-[#39ff14] px-1 py-1 text-[12px] md:text-base">
            {primaryAction?.side.toUpperCase() ?? "YES"}
          </span>
          <span className="font-mono text-[8px] text-[#fcee09] md:text-[10px]">VS</span>
          <span className="border-[2px] border-black bg-[#ff1f2d] px-1 py-1 text-[12px] md:text-base">
            {rivalAction?.side.toUpperCase() ?? "NO"}
          </span>
        </div>
        <div className="mt-2 font-mono text-[6px] font-black uppercase tracking-[0.06em] text-[#00eaff] md:text-[9px]">
          Conviction {primaryConviction ?? "--"} / {rivalConviction ?? "--"}
        </div>
        <div className="mt-2 break-words border-t-2 border-[#fcee09] pt-2 font-mono text-[6px] font-black uppercase tracking-[0.06em] text-[#fcee09] md:text-[9px]">
          {isSettled ? `Winner: ${winnerName}` : "Decision lock pending"}
        </div>
      </div>
    </div>
  );
}

function formatRankDelta(delta: number) {
  if (delta > 0) {
    return `+${delta}`;
  }

  return delta.toString();
}

function VerdictStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-[3px] border-black bg-[#fcee09] p-3">
      <div className="font-mono text-[8px] font-black uppercase tracking-[0.2em]">
        {label}
      </div>
      <div className="mt-1 font-black uppercase italic leading-none text-xl">
        {value}
      </div>
    </div>
  );
}
