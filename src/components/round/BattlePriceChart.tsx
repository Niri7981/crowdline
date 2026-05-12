"use client";

import { useEffect, useRef, useState } from "react";
import type { RoundAction } from "@/lib/types/action";
import type {
  RoundPolymarketSnapshot,
  RoundPriceSnapshot,
} from "@/lib/types/round";
import { BarChart3, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BattlePriceChartProps = {
  actions: RoundAction[];
  marketLabel: string;
  polymarketSnapshots?: RoundPolymarketSnapshot[];
  priceSnapshots: RoundPriceSnapshot[];
  roundEndsAt?: string | null;
};

type PricePoint = {
  id: string;
  label: string;
  price: number;
  sourceLabel: string;
  xIndex: number;
};

type ActionPoint = {
  actionAt: string;
  agentId: string;
  agentName: string;
  label: string;
  price: number;
  side: "yes" | "no";
  sizeUsd: number;
  xIndex: number;
};

type ExposureSeries = {
  agentId: string;
  agentName: string;
  color: string;
  dataKey: string;
};

type ChartRow = {
  [key: string]: number | string | null;
  delta: number | null;
  id: string;
  isSynthetic: string | null;
  label: string;
  pctChange: number | null;
  price: number;
  sourceLabel: string;
  timeToDeadline: number | null;
  xIndex: number;
};

type PolymarketChartRow = {
  id: string;
  label: string;
  marketId: string;
  noPrice: number | null;
  observedAt: string;
  sourceLabel: string;
  xIndex: number;
  yesPrice: number | null;
};

type TooltipPayloadEntry = {
  dataKey?: string;
  name?: string;
  payload?: ChartRow | ActionPoint | PolymarketChartRow;
  value?: number;
};

const AGENT_SERIES_COLORS = ["#00eaff", "#ff1f2d", "#39ff14", "#ff8a00"];

function formatSnapshotLabel(timestamp: string, index: number) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return `T${index + 1}`;
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatSignedExposure(action: RoundAction) {
  const signedSize = action.side === "yes" ? action.sizeUsd : action.sizeUsd * -1;

  return Number(signedSize.toFixed(2));
}

function buildExposureSeries(actions: RoundAction[]): ExposureSeries[] {
  const uniqueAgents = Array.from(
    new Map(actions.map((action) => [action.agentId, action.agentName])).entries(),
  );

  return uniqueAgents.map(([agentId, agentName], index) => ({
    agentId,
    agentName,
    color: AGENT_SERIES_COLORS[index % AGENT_SERIES_COLORS.length],
    dataKey: `exposure:${agentId}`,
  }));
}

function buildActionPoints(
  actions: RoundAction[],
  pricePoints: PricePoint[],
): ActionPoint[] {
  if (pricePoints.length === 0 || actions.length === 0) {
    return [];
  }

  const pricePointBySnapshotId = new Map<string, PricePoint>(
    pricePoints.map((point) => [point.id, point]),
  );
  const fallbackAgentCount = Math.max(
    1,
    new Set(actions.map((action) => action.agentId)).size,
  );

  return actions.map((action, index) => {
    const indexedSnapshot = pricePoints[
      Math.min(Math.floor(index / fallbackAgentCount), pricePoints.length - 1)
    ];
    const snapshot =
      (action.snapshotId ? pricePointBySnapshotId.get(action.snapshotId) : null) ??
      indexedSnapshot;
    const verticalOffset = Math.max(snapshot.price * 0.004, 0.18);

    return {
      actionAt: action.at,
      agentId: action.agentId,
      agentName: action.agentName,
      label: snapshot.label,
      price:
        action.side === "yes"
          ? snapshot.price + verticalOffset
          : snapshot.price - verticalOffset,
      side: action.side,
      sizeUsd: action.sizeUsd,
      xIndex: snapshot.xIndex,
    };
  });
}

function buildChartRows(
  priceSnapshots: RoundPriceSnapshot[],
  actions: RoundAction[],
  exposureSeries: ExposureSeries[],
): ChartRow[] {
  if (priceSnapshots.length === 0) {
    return [];
  }

  const latestExposureByAgent = new Map<string, number>();

  return priceSnapshots.map((snapshot, snapshotIndex) => {
    const tickActions = actions.filter((action, actionIndex) => {
      if (action.snapshotId) {
        return action.snapshotId === snapshot.id;
      }

      const fallbackAgentCount = Math.max(exposureSeries.length, 1);

      return Math.min(
        Math.floor(actionIndex / fallbackAgentCount),
        priceSnapshots.length - 1,
      ) === snapshotIndex;
    });

    for (const action of tickActions) {
      latestExposureByAgent.set(action.agentId, formatSignedExposure(action));
    }

    const exposureFields = Object.fromEntries(
      exposureSeries.map((series) => [
        series.dataKey,
        latestExposureByAgent.get(series.agentId) ?? null,
      ]),
    );

    return {
      ...exposureFields,
      delta: snapshot.delta,
      id: snapshot.id,
      isSynthetic: null,
      label: formatSnapshotLabel(snapshot.capturedAt, snapshotIndex),
      pctChange: snapshot.pctChange,
      price: snapshot.price,
      sourceLabel: snapshot.sourceLabel,
      timeToDeadline: snapshot.timeToDeadline,
      xIndex: snapshotIndex,
    };
  });
}

function buildDisplayRows(
  chartRows: ChartRow[],
  exposureSeries: ExposureSeries[],
): ChartRow[] {
  if (chartRows.length !== 1) {
    return chartRows;
  }

  const liveRow = chartRows[0];
  const openingExposure = Object.fromEntries(
    exposureSeries.map((series) => [series.dataKey, 0]),
  );

  return [
    {
      ...liveRow,
      ...openingExposure,
      delta: null,
      id: `${liveRow.id}:bootstrap`,
      isSynthetic: "bootstrap",
      label: "OPEN",
      pctChange: null,
      sourceLabel: "Arena opening snapshot",
      xIndex: 0,
    },
    {
      ...liveRow,
      xIndex: 1,
    },
  ];
}

function getPriceAxisDomain(chartRows: ChartRow[]): [number, number] {
  const priceValues = chartRows.map((row) => row.price);
  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);
  const range = maxPrice - minPrice;
  const padding = range === 0 ? Math.max(Math.abs(minPrice) * 0.01, 1) : range * 0.2;

  return [minPrice - padding, maxPrice + padding];
}

function getExposureAxisDomain(actions: RoundAction[]): [number, number] {
  const signedExposureValues = actions.map((action) => Math.abs(formatSignedExposure(action)));
  const maxExposure = Math.max(...signedExposureValues, 1);
  const paddedMax = Math.ceil(maxExposure * 1.25);

  return [paddedMax * -1, paddedMax];
}

function formatPercentChange(value: number | null) {
  if (value == null) {
    return "Awaiting move";
  }

  const prefix = value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(2)}%`;
}

function formatPriceDelta(value: number | null) {
  if (value == null) {
    return "Flat start";
  }

  const prefix = value > 0 ? "+" : "";

  return `${prefix}$${value.toFixed(2)}`;
}

function formatDeadline(value: number | null) {
  if (value == null) {
    return "Open";
  }

  const totalSeconds = Math.max(Math.floor(value / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")} left`;
}

function buildPolymarketRows(
  polymarketSnapshots: RoundPolymarketSnapshot[],
): PolymarketChartRow[] {
  const rowsByObservedAt = new Map<string, PolymarketChartRow>();

  for (const snapshot of polymarketSnapshots) {
    const existing = rowsByObservedAt.get(snapshot.observedAt);
    const row =
      existing ??
      {
        id: snapshot.observedAt,
        label: formatSnapshotLabel(snapshot.observedAt, rowsByObservedAt.size),
        marketId: snapshot.marketId,
        noPrice: null,
        observedAt: snapshot.observedAt,
        sourceLabel: snapshot.sourceLabel,
        xIndex: rowsByObservedAt.size,
        yesPrice: null,
      };

    if (snapshot.side === "yes") {
      row.yesPrice = snapshot.price;
    } else {
      row.noPrice = snapshot.price;
    }

    row.sourceLabel = snapshot.sourceLabel;
    rowsByObservedAt.set(snapshot.observedAt, row);
  }

  return Array.from(rowsByObservedAt.values());
}

function getLiveTimeToDeadline(roundEndsAt: string | null | undefined, nowMs: number) {
  if (!roundEndsAt) {
    return null;
  }

  const deadline = new Date(roundEndsAt);

  if (Number.isNaN(deadline.getTime())) {
    return null;
  }

  return Math.max(deadline.getTime() - nowMs, 0);
}

function PolymarketTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const row = payload[0]?.payload as PolymarketChartRow | undefined;

  if (!row) {
    return null;
  }

  return (
    <div className="border-[3px] border-black bg-[#fcee09] p-3 text-black shadow-[6px_6px_0_#000]">
      <div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-black/70">
        {label ?? "Market Tick"}
      </div>
      <div className="mt-2 grid gap-1 font-mono text-[10px] font-black uppercase tracking-[0.12em]">
        <div>Yes / {row.yesPrice == null ? "Pending" : row.yesPrice.toFixed(3)}</div>
        <div>No / {row.noPrice == null ? "Pending" : row.noPrice.toFixed(3)}</div>
        <div>Market / {row.marketId}</div>
        <div>{row.sourceLabel}</div>
      </div>
    </div>
  );
}

function PriceTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const pricePoint = payload.find((entry) => entry.dataKey === "price")
    ?.payload as ChartRow | undefined;
  const actionPoint = payload.find((entry) => entry.dataKey === "actionPrice")
    ?.payload as ActionPoint | undefined;
  const exposureEntries = payload.filter(
    (entry) =>
      typeof entry.dataKey === "string" &&
      entry.dataKey.startsWith("exposure:") &&
      typeof entry.value === "number",
  );

  return (
    <div className="border-[3px] border-black bg-[#fcee09] p-3 text-black shadow-[6px_6px_0_#000]">
      <div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-black/70">
        {label ?? "Snapshot"}
      </div>
      {pricePoint ? (
        <div className="mt-1 text-lg font-black uppercase italic">
          ${pricePoint.price.toFixed(2)}
        </div>
      ) : null}
      {pricePoint ? (
        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-black/70">
          {pricePoint.sourceLabel}
        </div>
      ) : null}
      {pricePoint ? (
        <div className="mt-2 grid gap-1 border-t-2 border-black pt-2 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-black/80">
          <div>Delta / {formatPriceDelta(pricePoint.delta)}</div>
          <div>Move / {formatPercentChange(pricePoint.pctChange)}</div>
          <div>Deadline / {formatDeadline(pricePoint.timeToDeadline)}</div>
        </div>
      ) : null}
      {actionPoint ? (
        <div className="mt-2 border-t-2 border-black pt-2 text-[10px] font-black uppercase tracking-[0.12em]">
          {actionPoint.agentName} / {actionPoint.side.toUpperCase()} / $
          {actionPoint.sizeUsd.toFixed(2)} / {actionPoint.actionAt}
        </div>
      ) : null}
      {exposureEntries.length > 0 ? (
        <div className="mt-2 border-t-2 border-black pt-2">
          <div className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-black/70">
            Live Exposure
          </div>
          <div className="mt-1 grid gap-1 font-mono text-[9px] font-black uppercase tracking-[0.12em]">
            {exposureEntries.map((entry) => {
              const exposureValue = typeof entry.value === "number" ? entry.value : 0;
              const prefix = exposureValue > 0 ? "+" : "";

              return (
                <div key={entry.dataKey}>
                  {entry.name ?? entry.dataKey?.replace("exposure:", "") ?? "Agent"} / {prefix}
                  {exposureValue.toFixed(2)} USDC
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// 这里在干嘛：
// 把 live round 已经持久化下来的价格快照和 action 序列画成一张 battle 曲线。
// 为什么这么写：
// 这张图的任务不是做专业交易终端，而是让观众同时看懂两件事：
// 1. 市场价格怎么动
// 2. agent 的 yes/no exposure 怎么跟着变化
// 最后返回什么：
// 返回一个可直接放进 round 页的 live battle chart 模块。
export function BattlePriceChart({
  actions,
  marketLabel,
  polymarketSnapshots = [],
  priceSnapshots,
  roundEndsAt,
}: BattlePriceChartProps) {
  const chartFrameRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [viewMode, setViewMode] = useState<"arena" | "polymarket">("arena");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const exposureSeries = buildExposureSeries(actions);
  const rawChartRows = buildChartRows(priceSnapshots, actions, exposureSeries);
  const chartRows = buildDisplayRows(rawChartRows, exposureSeries);
  const polymarketRows = buildPolymarketRows(polymarketSnapshots);
  const pricePoints = chartRows.map((row) => ({
    id: row.id,
    label: row.label,
    price: row.price,
    sourceLabel: row.sourceLabel,
    xIndex: row.xIndex,
  }));
  const actionPoints = buildActionPoints(actions, pricePoints);
  const latestSnapshot = priceSnapshots.at(-1) ?? null;
  const latestPolymarketRow = polymarketRows.at(-1) ?? null;
  const priceAxisDomain = getPriceAxisDomain(chartRows);
  const exposureAxisDomain = getExposureAxisDomain(actions);
  const liveTimeToDeadline = getLiveTimeToDeadline(roundEndsAt, nowMs);
  const canShowPolymarket = polymarketRows.length > 0;
  const activeViewMode = viewMode === "polymarket" && canShowPolymarket ? "polymarket" : "arena";

  useEffect(() => {
    const frame = chartFrameRef.current;

    if (!frame) {
      return;
    }

    const updateWidth = () => {
      const nextWidth = Math.max(Math.floor(frame.getBoundingClientRect().width), 0);
      setChartWidth(nextWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);

      return () => {
        window.removeEventListener("resize", updateWidth);
      };
    }

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(frame);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!roundEndsAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [roundEndsAt]);

  if (pricePoints.length === 0) {
    return (
      <section className="industrial-clip border-[6px] border-black bg-[#fcee09] p-5 text-black">
        <div className="inline-flex items-center gap-2 border-2 border-black bg-black px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.24em] text-[#fcee09]">
          <TrendingUp className="h-3.5 w-3.5" />
          Battle Curve
        </div>
        <div className="mt-4 border-[4px] border-black bg-[#d8c900] p-6 text-center">
          <div className="font-black uppercase italic text-3xl">
            Awaiting Market Data
          </div>
          <div className="mt-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black/70">
            Create or tick a live round to start recording price snapshots.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="industrial-clip border-[6px] border-black bg-[#fcee09] p-5 text-black">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b-[4px] border-black pb-4">
        <div>
          <div className="inline-flex items-center gap-2 border-2 border-black bg-black px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.24em] text-[#fcee09]">
            <TrendingUp className="h-3.5 w-3.5" />
            Battle Curve
          </div>
          <h3 className="mt-3 font-black uppercase italic leading-none text-4xl">
            Market And Conviction Flow
          </h3>
        </div>
        <div className="flex border-[3px] border-black bg-black p-1">
          <button
            className={`industrial-clip-sm flex items-center gap-2 px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.18em] ${
              activeViewMode === "arena"
                ? "bg-[#fcee09] text-black"
                : "bg-black text-[#fcee09]"
            }`}
            onClick={() => {
              setViewMode("arena");
            }}
            type="button"
          >
            <TrendingUp className="h-4 w-4" />
            Arena Curve
          </button>
          <button
            className={`industrial-clip-sm flex items-center gap-2 px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-45 ${
              activeViewMode === "polymarket"
                ? "bg-[#00eaff] text-black"
                : "bg-black text-[#fcee09]"
            }`}
            disabled={!canShowPolymarket}
            onClick={() => {
              setViewMode("polymarket");
            }}
            title={
              canShowPolymarket
                ? "Show Polymarket YES/NO market consensus curve"
                : "Run market:indexer with a Polymarket slug to enable this curve"
            }
            type="button"
          >
            <BarChart3 className="h-4 w-4" />
            Polymarket Curve
          </button>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-[4px] border-black pb-4">
        <div className="flex flex-wrap gap-3">
          <div className="border-[3px] border-black bg-[#d8c900] px-4 py-3">
            <div className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-black/70">
              {activeViewMode === "polymarket" ? "Polymarket Yes" : `Latest ${marketLabel}`}
            </div>
            <div className="mt-1 text-xl font-black uppercase italic">
              {activeViewMode === "polymarket"
                ? latestPolymarketRow?.yesPrice == null
                  ? "Pending"
                  : latestPolymarketRow.yesPrice.toFixed(3)
                : `$${latestSnapshot?.price.toFixed(2) ?? "Pending"}`}
            </div>
          </div>
          <div className="border-[3px] border-black bg-[#d8c900] px-4 py-3">
            <div className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-black/70">
              {activeViewMode === "polymarket" ? "Polymarket No" : "Last Move"}
            </div>
            <div className="mt-1 text-xl font-black uppercase italic">
              {activeViewMode === "polymarket"
                ? latestPolymarketRow?.noPrice == null
                  ? "Pending"
                  : latestPolymarketRow.noPrice.toFixed(3)
                : formatPriceDelta(latestSnapshot?.delta ?? null)}
            </div>
          </div>
          <div className="border-[3px] border-black bg-[#d8c900] px-4 py-3">
            <div className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-black/70">
              To Deadline
            </div>
            <div className="mt-1 text-xl font-black uppercase italic">
              {formatDeadline(liveTimeToDeadline ?? latestSnapshot?.timeToDeadline ?? null)}
            </div>
          </div>
          <div className="border-[3px] border-black bg-[#d8c900] px-4 py-3">
            <div className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-black/70">
              Battle Points
            </div>
            <div className="mt-1 text-xl font-black uppercase italic">
              {pricePoints.length} / {actionPoints.length}
            </div>
          </div>
        </div>
      </div>

      <div className="border-[4px] border-black bg-[#d8c900] p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-black/70">
            {activeViewMode === "polymarket"
              ? latestPolymarketRow?.sourceLabel ?? "Polymarket market source"
              : latestSnapshot?.sourceLabel ?? "Live market source"}
          </div>
          <div className="flex flex-wrap items-center gap-4 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-black">
            {activeViewMode === "polymarket" ? (
              <>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 border border-black bg-[#39ff14]" />
                  Polymarket Yes
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 border border-black bg-[#ff1f2d]" />
                  Polymarket No
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 border border-black bg-black" />
                  Price
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 border border-black bg-[#39ff14]" />
                  Yes
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 border border-black bg-[#ff1f2d]" />
                  No
                </span>
                {exposureSeries.map((series) => (
                  <span key={series.agentId} className="inline-flex items-center gap-2">
                    <span
                      className="h-3 w-3 border border-black"
                      style={{ backgroundColor: series.color }}
                    />
                    {series.agentName}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>

        <div ref={chartFrameRef} className="h-[420px] w-full min-w-0">
          {chartWidth > 0 ? (
            activeViewMode === "polymarket" ? (
              <ComposedChart
                data={polymarketRows}
                height={420}
                margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
                width={chartWidth}
              >
                <CartesianGrid stroke="rgba(0,0,0,0.18)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  stroke="#050505"
                  tick={{ fill: "#050505", fontSize: 11, fontWeight: 900 }}
                  tickLine={{ stroke: "#050505" }}
                />
                <YAxis
                  domain={[0, 1]}
                  stroke="#050505"
                  tick={{ fill: "#050505", fontSize: 11, fontWeight: 900 }}
                  tickFormatter={(value: number) => value.toFixed(2)}
                  tickLine={{ stroke: "#050505" }}
                  width={60}
                  label={{
                    angle: -90,
                    fill: "#050505",
                    fontSize: 11,
                    fontWeight: 900,
                    position: "insideLeft",
                    value: "POLYMARKET PRICE",
                  }}
                />
                <Tooltip content={<PolymarketTooltip />} />
                <Line
                  type="stepAfter"
                  dataKey="yesPrice"
                  name="Polymarket Yes"
                  stroke="#39ff14"
                  strokeWidth={4}
                  dot={{ fill: "#39ff14", r: 5, stroke: "#050505", strokeWidth: 2 }}
                  connectNulls
                />
                <Line
                  type="stepAfter"
                  dataKey="noPrice"
                  name="Polymarket No"
                  stroke="#ff1f2d"
                  strokeWidth={4}
                  dot={{ fill: "#ff1f2d", r: 5, stroke: "#050505", strokeWidth: 2 }}
                  connectNulls
                />
              </ComposedChart>
            ) : (
              <ComposedChart
                data={chartRows}
                height={420}
                margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
                width={chartWidth}
              >
              <CartesianGrid stroke="rgba(0,0,0,0.18)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                stroke="#050505"
                tick={{ fill: "#050505", fontSize: 11, fontWeight: 900 }}
                tickLine={{ stroke: "#050505" }}
                label={{
                  fill: "#050505",
                  fontSize: 11,
                  fontWeight: 900,
                  offset: -2,
                  position: "insideBottom",
                  value: "TIME / TICK",
                }}
              />
              <YAxis
                yAxisId="price"
                domain={priceAxisDomain}
                stroke="#050505"
                tick={{ fill: "#050505", fontSize: 11, fontWeight: 900 }}
                tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                tickLine={{ stroke: "#050505" }}
                width={60}
                label={{
                  angle: -90,
                  fill: "#050505",
                  fontSize: 11,
                  fontWeight: 900,
                  position: "insideLeft",
                  value: "MARKET PRICE",
                }}
              />
              <YAxis
                yAxisId="exposure"
                orientation="right"
                domain={exposureAxisDomain}
                stroke="#050505"
                tick={{ fill: "#050505", fontSize: 11, fontWeight: 900 }}
                tickFormatter={(value: number) => `${value > 0 ? "+" : ""}${value}`}
                tickLine={{ stroke: "#050505" }}
                width={56}
                label={{
                  angle: 90,
                  fill: "#050505",
                  fontSize: 11,
                  fontWeight: 900,
                  position: "insideRight",
                  value: "AGENT EXPOSURE",
                }}
              />
              <Tooltip content={<PriceTooltip />} />
              <ReferenceLine
                yAxisId="exposure"
                y={0}
                stroke="rgba(0,0,0,0.35)"
                strokeDasharray="6 4"
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="#050505"
                strokeWidth={4}
                dot={{ fill: "#050505", r: 4, stroke: "#050505" }}
                activeDot={{ fill: "#050505", r: 6, stroke: "#050505" }}
              />
              {exposureSeries.map((series) => (
                <Line
                  key={series.agentId}
                  yAxisId="exposure"
                  type="stepAfter"
                  dataKey={series.dataKey}
                  name={series.agentName}
                  stroke={series.color}
                  strokeWidth={3}
                  dot={{
                    fill: series.color,
                    r: 4,
                    stroke: "#050505",
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    fill: series.color,
                    r: 6,
                    stroke: "#050505",
                    strokeWidth: 2,
                  }}
                  connectNulls
                />
              ))}
              <Scatter
                data={actionPoints.map((point) => ({
                  ...point,
                  actionPrice: point.price,
                }))}
                dataKey="actionPrice"
                yAxisId="price"
                fill="#050505"
                shape={(props: {
                  cx?: number;
                  cy?: number;
                  payload?: ActionPoint;
                }) => {
                  const cx = props.cx ?? 0;
                  const cy = props.cy ?? 0;
                  const side = props.payload?.side ?? "yes";
                  const fill = side === "yes" ? "#39ff14" : "#ff1f2d";

                  return (
                    <g>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={7}
                        fill={fill}
                        stroke="#050505"
                        strokeWidth={2}
                      />
                    </g>
                  );
                }}
              />
              </ComposedChart>
            )
          ) : (
            <div className="flex h-full items-center justify-center border-[3px] border-dashed border-black/40 bg-[#fcee09]/40">
              <div className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-black/70">
                Calibrating battle curve...
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="border-[3px] border-black bg-[#d8c900] p-3">
          <div className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-black/70">
            Live Reading
          </div>
          <div className="mt-1 text-sm font-black uppercase leading-relaxed">
            Every tick appends a real market snapshot and moves each agent
            conviction curve to its latest yes or no exposure.
          </div>
        </div>
        <div className="border-[3px] border-black bg-[#d8c900] p-3">
          <div className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-black/70">
            Arena Meaning
          </div>
          <div className="mt-1 text-sm font-black uppercase leading-relaxed">
            The black line is live market price. Colored lines show each agent
            holding, growing, or flipping conviction through time.
          </div>
        </div>
        <div className="border-[3px] border-black bg-[#d8c900] p-3">
          <div className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-black/70">
            Next Step
          </div>
          <div className="mt-1 text-sm font-black uppercase leading-relaxed">
            The next layer after this is explicit flip markers and unrealized
            pnl per snapshot.
          </div>
        </div>
      </div>
      {rawChartRows.length === 1 ? (
        <div className="mt-4 border-[3px] border-black bg-black px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#fcee09]">
          Curve bootstrapping. The first public snapshot is locked and the next
          live tick will extend it into a visible moving battle line.
        </div>
      ) : null}
    </section>
  );
}
