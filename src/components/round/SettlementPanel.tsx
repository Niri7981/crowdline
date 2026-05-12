"use client";

import Link from "next/link";
import { RoundSettlement } from "@/lib/types/settlement";
import {
  ExternalLink,
  Medal,
  Minus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

type ProofReceipt = {
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

type LeaderboardEntry = {
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

interface SettlementPanelProps {
  settlement: RoundSettlement;
  roundId: string;
  isSettled: boolean;
  outcome: string;
  proof?: ProofReceipt | null;
  proofErrorMessage?: string | null;
  anchorErrorMessage?: string | null;
  isProofLoading?: boolean;
  leaderboard?: LeaderboardEntry[];
  leaderboardErrorMessage?: string | null;
  isLeaderboardLoading?: boolean;
}

export function SettlementPanel({
  settlement,
  roundId,
  isSettled,
  outcome,
  proof,
  proofErrorMessage,
  anchorErrorMessage,
  isProofLoading = false,
  leaderboard = [],
  leaderboardErrorMessage,
  isLeaderboardLoading = false,
}: SettlementPanelProps) {
  const isWinnerMomentum =
    settlement.winnerAgentId === "momentum" ||
    settlement.winnerAgentId === "agent-momentum";
  const themeColor = isWinnerMomentum ? "#ff1f2d" : "#39ff14";
  const hasLocalTx = Boolean(proof?.onchainSignature);
  const proofHashStatus = proof?.proofHash ? "Hash Locked" : "Hash Pending";
  const verificationStatus = proof?.verificationStatus ?? "pending";
  const isVerified = proof?.verified === true;
  const anchorStatus = isVerified
    ? "PDA Verified"
    : verificationStatus === "mismatch"
      ? "PDA Mismatch"
      : verificationStatus === "missing"
        ? "PDA Missing"
        : hasLocalTx
          ? "Tx Confirmed"
          : isProofLoading
            ? "Reading Proof"
            : "Waiting For Local Tx";
  const winnerReputation =
    settlement.winnerReputation ??
    leaderboard.find((agent) => {
      return (
        agent.identityKey === settlement.winnerAgentId ||
        agent.id === settlement.winnerAgentId ||
        agent.name === settlement.winnerName
      );
    }) ??
    null;

  if (!isSettled) {
    return (
      <article className="industrial-clip border-[6px] border-black bg-[#fcee09] p-5 text-black">
        <ProofHeader status="Awaiting Settlement" />
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <ProofCell label="Payload" value="Canonical JSON" />
          <ProofCell label="Hash" value="SHA-256" />
          <ProofCell label="Program" value="AgentDuel Arena" />
          <ProofCell label="Status" value="Ready To Anchor" accent="#ffb000" />
        </div>
      </article>
    );
  }

  return (
    <article
      className="industrial-clip relative overflow-hidden border-[6px] bg-[#fcee09] p-5 text-black"
      style={{ borderColor: themeColor }}
    >
      <div className="relative z-10">
        <ProofHeader status={`${settlement.winnerName.toUpperCase()} WINS`} tone={themeColor} />
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <ProofCell label="Final PnL" value={`+${settlement.pnlUsd.toFixed(2)}`} accent={themeColor} />
          <ProofCell label="Outcome" value={outcome.toUpperCase()} />
          <ProofCell label="Proof Hash" value={proofHashStatus} accent="#050505" />
          <ProofCell label="Status" value={anchorStatus} accent={isVerified ? "#39ff14" : verificationStatus === "mismatch" ? "#ff1f2d" : "#ffb000"} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3 md:grid-cols-2">
            <ProofCell label="Network" value={(proof?.network ?? "localnet").toUpperCase()} accent="#00eaff" />
            <ProofCell label="Program" value="AgentDuel Arena" accent="#050505" />
            <ProofCell label="Tx Signature" value={formatHash(proof?.onchainSignature)} accent={hasLocalTx ? "#39ff14" : "#ffb000"} />
            <ProofCell label="Proof PDA" value={formatHash(proof?.onchainProofAddress)} accent="#ffb000" />
            <ProofCell label="Slot" value={proof?.slot == null ? "Pending" : proof.slot.toString()} accent="#00eaff" />
            <ProofCell label="Anchored At" value={formatTimestamp(proof?.anchoredAt)} accent="#050505" />
          </div>

          <ReputationImpact
            leaderboard={leaderboard}
            isLoading={isLeaderboardLoading}
            errorMessage={leaderboardErrorMessage}
            winnerAgentId={settlement.winnerAgentId}
            winnerName={settlement.winnerName}
            winnerReputation={winnerReputation}
            themeColor={themeColor}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-[4px] border-black bg-[#d8c900] p-4">
           <div
             className="flex items-center gap-3 font-mono text-[10px] font-black uppercase tracking-[0.2em]"
             style={{ color: isVerified ? "#39ff14" : verificationStatus === "mismatch" ? "#ff1f2d" : "#ffb000" }}
           >
              <ShieldCheck className="h-4 w-4" />
              {isVerified
                ? "Battle Proof PDA Verified On Localnet"
                : verificationStatus === "mismatch"
                  ? `Proof PDA Verification Failed: ${proof?.verificationError ?? "Mismatch"}`
                  : hasLocalTx
                    ? "Local Tx Confirmed / PDA Verification Pending"
                    : "Canonical Proof Hash Ready / Localnet Tx Pending"}
           </div>
           <div className="flex flex-wrap gap-3">
             {proof?.explorerUrl && (
               <Link
                 href={proof.explorerUrl}
                 className="industrial-clip-sm flex items-center justify-center gap-3 border-[3px] border-black bg-[#00eaff] px-5 py-3 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-black"
               >
                 Local Tx
                 <ExternalLink className="h-4 w-4" />
               </Link>
             )}
             <Link 
               href={`/battles/${roundId}`}
               className="industrial-clip-sm flex items-center justify-center gap-3 border-[3px] border-black bg-[#fcee09] px-5 py-3 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-black"
             >
               Inspect Proof
               <ExternalLink className="h-4 w-4" />
             </Link>
           </div>
        </div>

        {anchorErrorMessage && (
          <div className="mt-4 border-[3px] border-[#ff1f2d] bg-[#ff1f2d] px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black">
            {anchorErrorMessage}
          </div>
        )}

        {proofErrorMessage && (
          <div className="mt-4 border-[3px] border-[#ff1f2d] bg-[#ff1f2d] px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black">
            Proof Read Error: {proofErrorMessage}
          </div>
        )}
      </div>
    </article>
  );
}

function ProofHeader({
  status,
  tone = "#ffb000",
}: {
  status: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <div className="inline-flex items-center gap-2 border-2 border-black bg-black px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.24em] text-[#ffb000]">
          <Zap className="h-3.5 w-3.5" />
          Onchain Proof Module
        </div>
        <h2 className="mt-3 font-black uppercase italic leading-none text-4xl md:text-5xl" style={{ color: tone }}>
          {status}
        </h2>
      </div>
      <Trophy className="h-12 w-12 text-[#fcee09]" />
    </div>
  );
}

function ProofCell({ label, value, accent = "#050505" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border-[4px] border-black bg-[#d8c900] p-4">
       <span className="block font-mono text-[8px] font-black uppercase tracking-[0.2em] text-black/70">{label}</span>
       <p className="mt-2 break-all text-xl font-black uppercase italic tracking-tight" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function ReputationImpact({
  errorMessage,
  isLoading,
  leaderboard,
  themeColor,
  winnerAgentId,
  winnerName,
  winnerReputation,
}: {
  errorMessage?: string | null;
  isLoading: boolean;
  leaderboard: LeaderboardEntry[];
  themeColor: string;
  winnerAgentId: string;
  winnerName: string;
  winnerReputation: RoundSettlement["winnerReputation"] | LeaderboardEntry | null;
}) {
  return (
    <aside className="border-[5px] border-[#fcee09] bg-[#fcee09] p-4 text-black">
      <div className="flex items-start justify-between gap-4 border-b-[4px] border-black pb-3">
        <div>
          <div className="inline-flex items-center gap-2 border-2 border-black bg-black px-3 py-1 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[#fcee09]">
            <Medal className="h-3.5 w-3.5" />
            Reputation Impact
          </div>
          <h3 className="mt-2 font-black uppercase italic leading-none text-3xl">
            Public Rank Updated
          </h3>
        </div>
        <div className="border-[3px] border-black bg-black px-3 py-2 text-right text-[#fcee09]">
          <div className="font-mono text-[8px] font-black uppercase tracking-[0.18em]">
            Winner
          </div>
          <div className="font-black uppercase italic" style={{ color: themeColor }}>
            {winnerName}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <ImpactCell
          label="Rank"
          value={winnerReputation ? `#${winnerReputation.currentRank}` : "Pending"}
        />
        <ImpactCell
          label="Rank Move"
          value={winnerReputation ? formatRankDelta(winnerReputation.rankDelta) : "Pending"}
          accent={rankTone(winnerReputation?.rankDelta ?? 0)}
        />
        <ImpactCell
          label="Streak"
          value={winnerReputation ? `${winnerReputation.currentStreak}` : "Pending"}
          accent="#ffb000"
        />
        <ImpactCell
          label="Record"
          value={
            winnerReputation
              ? `${winnerReputation.totalWins}W-${winnerReputation.totalLosses}L`
              : "Pending"
          }
        />
        <ImpactCell
          label="Best"
          value={winnerReputation ? `${winnerReputation.bestStreak}` : "Pending"}
        />
        <ImpactCell
          label="Badge"
          value={getBadgeLabel(winnerReputation)}
          accent={themeColor}
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-black">
          Live Leaderboard
        </div>
        {isLoading ? (
          <div className="border-[3px] border-black bg-black px-3 py-3 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#fcee09]">
            Loading Rank Feed
          </div>
        ) : errorMessage ? (
          <div className="border-[3px] border-black bg-[#ff1f2d] px-3 py-3 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-black">
            {errorMessage}
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((agent) => {
              const isWinner =
                agent.identityKey === winnerAgentId ||
                agent.id === winnerAgentId ||
                agent.name === winnerName;

              return (
                <div
                  key={agent.id}
                  className="grid grid-cols-[52px_1fr_62px_72px] items-center gap-2 border-[3px] border-black px-3 py-2 font-black uppercase"
                  style={{
                    backgroundColor: "#fcee09",
                    boxShadow: isWinner ? "inset 0 0 0 4px #050505" : undefined,
                    color: "#050505",
                  }}
                >
                  <span className="font-mono text-[10px] tracking-[0.16em]">
                    #{agent.currentRank}
                  </span>
                  <span className="truncate text-sm italic">{agent.name}</span>
                  <span
                    className="flex items-center justify-center gap-1 font-mono text-[10px]"
                    style={{ color: isWinner ? themeColor : rankTone(agent.rankDelta) }}
                  >
                    {rankIcon(agent.rankDelta)}
                    {formatRankDelta(agent.rankDelta)}
                  </span>
                  <span className="text-right font-mono text-[10px]">
                    {agent.totalWins}W-{agent.totalLosses}L
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function ImpactCell({
  accent = "#fcee09",
  label,
  value,
}: {
  accent?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="border-[3px] border-black bg-black p-3 text-[#fcee09]">
      <div className="font-mono text-[7px] font-black uppercase tracking-[0.18em] text-black/65">
        {label}
      </div>
      <div className="mt-1 truncate font-black uppercase italic text-lg" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function getBadgeLabel(
  winnerReputation: RoundSettlement["winnerReputation"] | LeaderboardEntry | null,
) {
  if (
    winnerReputation &&
    "badge" in winnerReputation &&
    typeof winnerReputation.badge === "string"
  ) {
    return winnerReputation.badge;
  }

  return "Earned";
}

function formatRankDelta(delta: number) {
  if (delta > 0) {
    return `+${delta}`;
  }

  if (delta < 0) {
    return `${delta}`;
  }

  return "0";
}

function rankTone(delta: number) {
  if (delta > 0) {
    return "#39ff14";
  }

  if (delta < 0) {
    return "#ff1f2d";
  }

  return "#00eaff";
}

function rankIcon(delta: number) {
  if (delta > 0) {
    return <TrendingUp className="h-3 w-3" />;
  }

  if (delta < 0) {
    return <TrendingDown className="h-3 w-3" />;
  }

  return <Minus className="h-3 w-3" />;
}

function formatHash(value?: string | null) {
  if (!value) {
    return "Pending";
  }

  if (value.length <= 24) {
    return value;
  }

  return `${value.slice(0, 12)}...${value.slice(-10)}`;
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
