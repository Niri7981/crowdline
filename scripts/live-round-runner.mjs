import "dotenv/config";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_INTERVAL_MS = 5_000;

function parseArgs(argv) {
  return Object.fromEntries(
    argv
      .filter((entry) => entry.startsWith("--"))
      .map((entry) => {
        const [rawKey, rawValue] = entry.slice(2).split("=");
        return [rawKey, rawValue ?? "true"];
      }),
  );
}

const args = parseArgs(process.argv.slice(2));
const baseUrl = args["base-url"] ?? process.env.AGENTDUEL_BASE_URL ?? DEFAULT_BASE_URL;
const intervalMs = Number(
  args.interval ?? process.env.AGENTDUEL_TICK_INTERVAL_MS ?? DEFAULT_INTERVAL_MS,
);
const createIfMissing =
  (args.create ?? process.env.AGENTDUEL_CREATE_LIVE_ROUND ?? "true") !== "false";
const continueAfterSettle =
  (args.continue ?? process.env.AGENTDUEL_CONTINUE_AFTER_SETTLE ?? "true") !==
  "false";
const maxTicks = args["max-ticks"]
  ? Number(args["max-ticks"])
  : process.env.AGENTDUEL_MAX_TICKS
    ? Number(process.env.AGENTDUEL_MAX_TICKS)
    : null;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatSignedDelta(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "flat";
  }

  const prefix = value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(2)}`;
}

function formatDeadline(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "open";
  }

  const totalSeconds = Math.max(Math.floor(value / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function getTimeToDeadline(round) {
  if (!round?.endsAt) {
    return null;
  }

  const endsAt = new Date(round.endsAt);

  if (Number.isNaN(endsAt.getTime())) {
    return null;
  }

  return endsAt.getTime() - Date.now();
}

async function requestJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed: ${path}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function getLatestRound() {
  try {
    return await requestJson("/api/round", {
      method: "GET",
    });
  } catch (error) {
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
}

async function createRound() {
  return requestJson("/api/round", {
    body: JSON.stringify({}),
    method: "POST",
  });
}

async function tickRound(roundId) {
  return requestJson("/api/round/tick", {
    body: JSON.stringify({ roundId }),
    method: "POST",
  });
}

async function settleRound(roundId) {
  return requestJson("/api/settle", {
    body: JSON.stringify({ roundId }),
    method: "POST",
  });
}

async function ensureLiveRound() {
  const currentRound = await getLatestRound();

  if (currentRound && currentRound.status === "live") {
    return currentRound;
  }

  if (!createIfMissing) {
    throw new Error("No live round available for runner.");
  }

  console.log("No live round found. Creating a fresh live round.");
  return createRound();
}

function logRoundSnapshot(prefix, round) {
  const latestSnapshot = round.priceSnapshots.at(-1) ?? null;
  const latestActions = round.actions.slice(-2);
  const timeToDeadline = getTimeToDeadline(round);
  const actionSummary = latestActions
    .map((action) => `${action.agentName}:${action.side.toUpperCase()}:${action.sizeUsd.toFixed(2)}`)
    .join(" | ");

  console.log(
    [
      prefix,
      `round=${round.id}`,
      `snapshots=${round.priceSnapshots.length}`,
      latestSnapshot ? `price=${latestSnapshot.price.toFixed(2)}` : "price=pending",
      latestSnapshot ? `delta=${formatSignedDelta(latestSnapshot.delta)}` : "delta=flat",
      `deadline=${formatDeadline(timeToDeadline)}`,
      actionSummary ? `actions=${actionSummary}` : "actions=pending",
    ].join(" / "),
  );
}

async function run() {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("Runner interval must be a positive number.");
  }

  let round = await ensureLiveRound();
  let tickCount = 0;

  logRoundSnapshot("Runner attached", round);

  while (true) {
    if (round.status !== "live") {
      if (!continueAfterSettle || !createIfMissing) {
        break;
      }

      console.log("Latest round is settled. Creating a fresh live round.");
      round = await createRound();
      tickCount = 0;
      logRoundSnapshot("Runner attached", round);
      continue;
    }

    const timeToDeadline = getTimeToDeadline(round);

    if (timeToDeadline != null && timeToDeadline <= 0) {
      console.log("Round deadline reached. Settling latest live round.");
      round = await settleRound(round.id);
      logRoundSnapshot("Settlement complete", round);
      continue;
    }

    if (tickCount > 0 || round.priceSnapshots.length > 0) {
      await sleep(intervalMs);
    }

    try {
      round = await tickRound(round.id);
      tickCount += 1;
      logRoundSnapshot(`Tick ${tickCount}`, round);

      if (maxTicks != null && Number.isFinite(maxTicks) && tickCount >= maxTicks) {
        console.log(`Reached max tick limit (${maxTicks}). Stopping runner.`);
        break;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Round deadline reached")
      ) {
        console.log("Tick rejected at deadline. Settling round now.");
        round = await settleRound(round.id);
        logRoundSnapshot("Settlement complete", round);
        continue;
      }

      throw error;
    }
  }

  if (round.status === "settled") {
    console.log(
      `Settled / winner=${round.settlement.winnerName} / side=${round.settlement.winningSide ?? "draw"} / pnl=${round.settlement.pnlUsd.toFixed(2)}`,
    );
  } else {
    console.log("Runner stopped with live round still open.");
  }
}

run().catch((error) => {
  console.error("Live round runner failed.", error);
  process.exitCode = 1;
});
