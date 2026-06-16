"use client";

import { useMemo, useState } from "react";

type CrowdlinePricePoint = {
  id: string;
  noPrice: number | null;
  outcomePrices?: Record<string, number | null>;
  price: number;
  sourceLabel: string;
  timestamp: string;
};

type CrowdlineUnderlyingOutcome = {
  id: string;
  label: string;
  price: number | null;
  rawLabel: string;
  tokenId: string | null;
};

type UnderlyingPriceChartProps = {
  openAt?: string | null;
  outcomes?: CrowdlineUnderlyingOutcome[];
  points: CrowdlinePricePoint[];
  title?: string;
};

type Timeframe = "24H" | "7D" | "1M" | "ALL";

type ChartRow = {
  noPrice: number | null;
  outcomePrices: Record<string, number | null>;
  sourceLabel: string;
  timestamp: string;
  yesPrice: number;
};

const TIMEFRAME_OPTIONS: Timeframe[] = ["24H", "7D", "1M", "ALL"];
const FALLBACK_OUTCOMES: CrowdlineUnderlyingOutcome[] = [
  {
    id: "outcome-0",
    label: "Yes",
    price: null,
    rawLabel: "Yes",
    tokenId: null,
  },
  {
    id: "outcome-1",
    label: "No",
    price: null,
    rawLabel: "No",
    tokenId: null,
  },
];
const OUTCOME_COLORS = [
  "#c91b25",
  "#2268d8",
  "#8896a8",
  "#f5b84b",
  "#44c98a",
  "#b06cff",
  "#f07aa8",
  "#42c7d7",
];
const SVG_WIDTH = 920;
const SVG_HEIGHT = 390;
const PLOT = {
  bottom: 346,
  left: 16,
  right: 862,
  top: 28,
};

function timeframeCutoff(timeframe: Timeframe) {
  const now = Date.now();

  if (timeframe === "24H") {
    return now - 24 * 60 * 60 * 1000;
  }

  if (timeframe === "7D") {
    return now - 7 * 24 * 60 * 60 * 1000;
  }

  if (timeframe === "1M") {
    return now - 31 * 24 * 60 * 60 * 1000;
  }

  return Number.NEGATIVE_INFINITY;
}

function formatTooltipTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatShortTime(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "--";
  }

  return `${Math.round(value * 100)}%`;
}

function normalizeOutcomes(
  outcomes: CrowdlineUnderlyingOutcome[] | undefined,
): CrowdlineUnderlyingOutcome[] {
  return outcomes && outcomes.length > 0 ? outcomes : FALLBACK_OUTCOMES;
}

function readFinitePrice(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? null : value;
}

function normalizeRows(
  points: CrowdlinePricePoint[],
  outcomes: CrowdlineUnderlyingOutcome[],
): ChartRow[] {
  const primaryOutcomeId = outcomes[0]?.id ?? FALLBACK_OUTCOMES[0].id;
  const secondaryOutcomeId = outcomes[1]?.id ?? FALLBACK_OUTCOMES[1].id;
  const canInferBinaryComplement =
    outcomes.length === 2 &&
    (outcomes[1]?.rawLabel.toLowerCase() === "no" ||
      outcomes[1]?.label.toLowerCase().startsWith("not "));

  return points
    .map((point) => {
      const fallbackNoPrice =
        canInferBinaryComplement
          ? point.noPrice == null
            ? Number((1 - point.price).toFixed(4))
            : point.noPrice
          : point.noPrice;
      const outcomePrices = {
        ...(point.outcomePrices ?? {}),
      } as Record<string, number | null>;

      outcomePrices[primaryOutcomeId] =
        readFinitePrice(outcomePrices[primaryOutcomeId]) ?? point.price;
      if (secondaryOutcomeId) {
        outcomePrices[secondaryOutcomeId] =
          readFinitePrice(outcomePrices[secondaryOutcomeId]) ?? fallbackNoPrice;
      }

      return {
        noPrice: readFinitePrice(outcomePrices[secondaryOutcomeId]),
        outcomePrices,
        sourceLabel: point.sourceLabel,
        timestamp: point.timestamp,
        yesPrice: readFinitePrice(outcomePrices[primaryOutcomeId]) ?? point.price,
      };
    })
    .filter((point) => {
      const timestamp = new Date(point.timestamp).getTime();

      return (
        Number.isFinite(timestamp) &&
        Number.isFinite(point.yesPrice) &&
        point.yesPrice >= 0 &&
        point.yesPrice <= 1
      );
    })
    .sort(
      (left, right) =>
        new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
    );
}

function toOutcomePoint(
  row: ChartRow,
  outcomeId: string,
  minTime: number,
  maxTime: number,
) {
  const price = readFinitePrice(row.outcomePrices[outcomeId]);

  if (price == null) {
    return null;
  }

  const time = new Date(row.timestamp).getTime();
  const timeRange = Math.max(1, maxTime - minTime);
  const x = PLOT.left + ((time - minTime) / timeRange) * (PLOT.right - PLOT.left);
  const y = PLOT.top + (1 - price) * (PLOT.bottom - PLOT.top);

  return { price, x, y };
}

function toPoint(
  row: ChartRow,
  key: "noPrice" | "yesPrice",
  minTime: number,
  maxTime: number,
) {
  const time = new Date(row.timestamp).getTime();
  const timeRange = Math.max(1, maxTime - minTime);
  const x = PLOT.left + ((time - minTime) / timeRange) * (PLOT.right - PLOT.left);
  const price = row[key] ?? 0;
  const y = PLOT.top + (1 - price) * (PLOT.bottom - PLOT.top);

  return { x, y };
}

function buildOutcomePath(
  rows: ChartRow[],
  outcomeId: string,
  minTime: number,
  maxTime: number,
) {
  const points = rows.flatMap((row) => {
    const point = toOutcomePoint(row, outcomeId, minTime, maxTime);

    return point ? [point] : [];
  });

  if (points.length === 0) {
    return "";
  }

  const commands = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];

  for (const point of points.slice(1)) {
    commands.push(`H ${point.x.toFixed(2)}`);
    commands.push(`V ${point.y.toFixed(2)}`);
  }

  commands.push(`H ${PLOT.right}`);

  return commands.join(" ");
}

function buildXAxisTicks(rows: ChartRow[]) {
  if (rows.length <= 1) {
    return rows;
  }

  const tickIndexes = new Set<number>();

  return [0, 0.25, 0.5, 0.75, 1].flatMap((ratio) => {
    const index = Math.min(rows.length - 1, Math.round((rows.length - 1) * ratio));

    if (tickIndexes.has(index)) {
      return [];
    }

    tickIndexes.add(index);

    return [rows[index]];
  });
}

function findNearestRowIndex(rows: ChartRow[], targetTime: number) {
  if (rows.length <= 1) {
    return 0;
  }

  let left = 0;
  let right = rows.length - 1;

  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    const middleTime = new Date(rows[middle].timestamp).getTime();

    if (middleTime < targetTime) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  const previous = Math.max(0, left - 1);
  const previousDistance = Math.abs(new Date(rows[previous].timestamp).getTime() - targetTime);
  const currentDistance = Math.abs(new Date(rows[left].timestamp).getTime() - targetTime);

  return previousDistance <= currentDistance ? previous : left;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function UnderlyingPriceChart({
  outcomes,
  points,
  title = "Polymarket historical curve",
}: UnderlyingPriceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("ALL");
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const chartOutcomes = useMemo(() => normalizeOutcomes(outcomes), [outcomes]);
  const rows = useMemo(
    () => normalizeRows(points, chartOutcomes),
    [chartOutcomes, points],
  );
  const visibleRows = useMemo(() => {
    const cutoff = timeframeCutoff(timeframe);
    const filtered = rows.filter((row) => {
      const timestamp = new Date(row.timestamp).getTime();

      return Number.isFinite(timestamp) && timestamp >= cutoff;
    });

    return filtered.length > 0 ? filtered : rows;
  }, [rows, timeframe]);
  const firstRow = visibleRows[0] ?? null;
  const latestRow = visibleRows[visibleRows.length - 1] ?? null;
  const isMultiOutcome = chartOutcomes.length > 2;
  const activeIndex =
    visibleRows.length === 0
      ? 0
      : clamp(scrubIndex ?? visibleRows.length - 1, 0, visibleRows.length - 1);
  const activeRow = visibleRows[activeIndex] ?? latestRow;
  const yesDelta =
    firstRow && activeRow ? activeRow.yesPrice - firstRow.yesPrice : null;
  const minTime = firstRow ? new Date(firstRow.timestamp).getTime() : 0;
  const maxTime = latestRow ? new Date(latestRow.timestamp).getTime() : 1;
  const primaryOutcome = chartOutcomes[0] ?? FALLBACK_OUTCOMES[0];
  const secondaryOutcome = chartOutcomes[1] ?? null;
  const activeYesPoint = activeRow
    ? toOutcomePoint(activeRow, primaryOutcome.id, minTime, maxTime)
    : null;
  const activeNoPoint =
    activeRow && secondaryOutcome
      ? toOutcomePoint(activeRow, secondaryOutcome.id, minTime, maxTime)
      : null;
  const outcomePaths = chartOutcomes.map((outcome, index) => ({
    activePoint: activeRow
      ? toOutcomePoint(activeRow, outcome.id, minTime, maxTime)
      : null,
    color: OUTCOME_COLORS[index % OUTCOME_COLORS.length],
    outcome,
    path: buildOutcomePath(visibleRows, outcome.id, minTime, maxTime),
  }));
  const activeOutcomeEntries = outcomePaths
    .map(({ activePoint, color, outcome }) => ({
      color,
      outcome,
      price: activePoint?.price ?? null,
    }))
    .filter((entry) => entry.price != null)
    .sort((left, right) => (right.price ?? 0) - (left.price ?? 0));
  const activeLeader = activeOutcomeEntries[0] ?? null;
  const labelOnLeft = activeYesPoint ? activeYesPoint.x > PLOT.right - 150 : false;
  const labelX = activeYesPoint
    ? labelOnLeft
      ? activeYesPoint.x - 24
      : activeYesPoint.x + 24
    : 0;
  const labelAnchor = labelOnLeft ? "end" : "start";
  const xTicks = buildXAxisTicks(visibleRows);

  function handleScrub(clientX: number, svgElement: SVGSVGElement) {
    if (visibleRows.length === 0) {
      return;
    }

    const rect = svgElement.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * SVG_WIDTH;
    const ratio = clamp((svgX - PLOT.left) / (PLOT.right - PLOT.left), 0, 1);
    const targetTime = minTime + ratio * (maxTime - minTime);

    setScrubIndex(findNearestRowIndex(visibleRows, targetTime));
  }

  function updateScrubIndex(nextIndex: number) {
    if (visibleRows.length === 0) {
      return;
    }

    setScrubIndex(clamp(Math.round(nextIndex), 0, visibleRows.length - 1));
  }

  function updateScrubFromRangeValue(value: string) {
    const nextIndex = Number(value);

    if (!Number.isFinite(nextIndex)) {
      return;
    }

    updateScrubIndex(nextIndex);
  }

  function updateScrubFromRangePointer(
    clientX: number,
    rangeElement: HTMLInputElement,
  ) {
    if (visibleRows.length === 0) {
      return;
    }

    const rect = rangeElement.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);

    updateScrubIndex(ratio * (visibleRows.length - 1));
  }

  return (
    <div
      className="pm-card overflow-hidden p-5 sm:p-6"
      style={{
        background: "#101417",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="pm-eyebrow">
            Sports · Soccer · World Cup
          </p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {title}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8fa0b8]">
            Full-history Polymarket CLOB odds for the underlying market. Crowdline
            trades the direction of the selected outcome curve before kickoff.
          </p>
        </div>

        <div className="flex gap-1 rounded-xl border border-white/10 bg-[#0b0f12] p-1">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setTimeframe(option);
                setScrubIndex(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                option === timeframe
                  ? "bg-[#0a76d6] text-white"
                  : "text-[#8fa0b8] hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {visibleRows.length > 0 && latestRow && activeRow ? (
        <>
          <div
            className="mt-8 flex flex-col gap-7 xl:flex-row xl:items-center"
          >
            <div
              className="relative min-w-0"
              style={{ flex: "1 1 0", height: 390 }}
            >
              <svg
                aria-label="Polymarket historical outcome prices"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  handleScrub(event.clientX, event.currentTarget);
                }}
                onPointerMove={(event) => {
                  handleScrub(event.clientX, event.currentTarget);
                }}
                preserveAspectRatio="none"
                role="img"
                style={{
                  cursor: "crosshair",
                  display: "block",
                  height: 390,
                  touchAction: "none",
                  width: "100%",
                }}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              >
                {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                  const y = PLOT.top + (1 - tick) * (PLOT.bottom - PLOT.top);

                  return (
                    <g key={tick}>
                      <line
                        stroke="rgba(125, 152, 180, 0.3)"
                        strokeDasharray="1 9"
                        strokeWidth="1"
                        x1={PLOT.left}
                        x2={PLOT.right}
                        y1={y}
                        y2={y}
                      />
                      <text
                        fill="#8fa0b8"
                        fontSize="15"
                        textAnchor="start"
                        x={PLOT.right + 18}
                        y={y + 5}
                      >
                        {Math.round(tick * 100)}%
                      </text>
                    </g>
                  );
                })}

                {xTicks.map((row, index) => {
                  const point = toPoint(row, "yesPrice", minTime, maxTime);

                  return (
                    <text
                      fill="#526071"
                      fontSize="13"
                      key={`${row.timestamp}-${index}`}
                      textAnchor="middle"
                      x={point.x}
                      y={PLOT.bottom + 26}
                    >
                      {formatShortTime(row.timestamp)}
                    </text>
                  );
                })}

                <line
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="2"
                  x1={activeYesPoint?.x ?? PLOT.right}
                  x2={activeYesPoint?.x ?? PLOT.right}
                  y1={PLOT.top - 10}
                  y2={PLOT.bottom + 12}
                />
                {outcomePaths.map(({ outcome, path, color }, index) =>
                  path ? (
                    <path
                      d={path}
                      fill="none"
                      key={outcome.id}
                      opacity={index > 5 ? 0.5 : 1}
                      stroke={color}
                      strokeWidth={index === 0 ? "3" : "2.5"}
                    />
                  ) : null,
                )}
                {outcomePaths.map(({ activePoint, color, outcome }) =>
                  activePoint ? (
                    <circle
                      cx={activePoint.x}
                      cy={activePoint.y}
                      fill={color}
                      key={outcome.id}
                      r="5.5"
                    />
                  ) : null,
                )}
                {activeYesPoint && !isMultiOutcome ? (
                  <g pointerEvents="none">
                    <text
                      fill="#ff333d"
                      fontSize="18"
                      fontWeight="700"
                      textAnchor={labelAnchor}
                      x={labelX}
                      y={activeYesPoint.y - 8}
                    >
                      {primaryOutcome.label}
                    </text>
                    <text
                      fill="#d71f2a"
                      fontSize="44"
                      fontWeight="800"
                      textAnchor={labelAnchor}
                      x={labelX}
                      y={activeYesPoint.y + 36}
                    >
                      {formatPercent(activeRow.yesPrice)}
                    </text>
                    {activeNoPoint && secondaryOutcome ? (
                      <>
                        <text
                          fill="#2f80ff"
                          fontSize="18"
                          fontWeight="700"
                          textAnchor={labelAnchor}
                          x={labelX}
                          y={activeNoPoint.y - 8}
                        >
                          {secondaryOutcome.label}
                        </text>
                        <text
                          fill="#2f80ff"
                          fontSize="38"
                          fontWeight="800"
                          textAnchor={labelAnchor}
                          x={labelX}
                          y={activeNoPoint.y + 32}
                        >
                          {formatPercent(activeRow.noPrice)}
                        </text>
                      </>
                    ) : null}
                  </g>
                ) : null}
              </svg>
            </div>

            <div className="space-y-5" style={{ flex: "0 0 240px" }}>
              {!isMultiOutcome ? (
                <div>
                  <p className="text-lg font-semibold" style={{ color: "#ff333d" }}>
                    {primaryOutcome.label}
                  </p>
                  <p className="mt-1 text-6xl font-semibold tracking-tight" style={{ color: "#d71f2a" }}>
                    {formatPercent(activeRow.yesPrice)}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8fa0b8]">
                    {yesDelta == null
                      ? "Change from first tick --"
                      : `Change from first tick ${yesDelta >= 0 ? "+" : ""}${Math.round(yesDelta * 100)} pts`}
                  </p>
                </div>
              ) : null}

              {!isMultiOutcome && secondaryOutcome ? (
                <div>
                  <p className="text-lg font-semibold text-[#8fa0b8]">
                    {secondaryOutcome.label}
                  </p>
                  <p className="mt-1 text-5xl font-semibold tracking-tight" style={{ color: "#2f80ff" }}>
                    {formatPercent(activeRow.noPrice)}
                  </p>
                </div>
              ) : null}

              {activeOutcomeEntries.length > 2 ? (
                <div className="rounded-xl border border-white/10 bg-[#0b0f12] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8fa0b8]">
                    Polymarket Outcomes
                  </p>
                  {activeLeader ? (
                    <div className="mt-3 border-b border-white/10 pb-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8fa0b8]">
                        Leader at selected tick
                      </p>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <p
                          className="min-w-0 truncate text-xl font-semibold"
                          style={{ color: activeLeader.color }}
                        >
                          {activeLeader.outcome.label}
                        </p>
                        <p className="text-2xl font-semibold text-white">
                          {formatPercent(activeLeader.price)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    {activeOutcomeEntries.slice(0, 7).map((entry) => (
                      <div
                        className="flex items-center justify-between gap-3 text-sm"
                        key={entry.outcome.id}
                      >
                        <span className="inline-flex min-w-0 items-center gap-2 text-[#c7d1df]">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: entry.color }}
                          />
                          <span className="truncate">{entry.outcome.label}</span>
                        </span>
                        <span className="font-semibold text-white">
                          {formatPercent(entry.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-white/10 bg-[#0b0f12] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8fa0b8]">
                  Selected Polymarket Tick
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatTooltipTimestamp(activeRow.timestamp)}
                </p>
                <p className="mt-1 text-xs text-[#8fa0b8]">{activeRow.sourceLabel}</p>
                <button
                  className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-[#8fa0b8] transition hover:border-white/20 hover:text-white"
                  onClick={() => {
                    setScrubIndex(null);
                  }}
                  type="button"
                >
                  Jump to latest
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-[#0b0f12] p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8fa0b8]">
                Scrub History
              </p>
              <p className="text-xs font-semibold text-[#8fa0b8]">
                {activeIndex + 1} / {visibleRows.length}
              </p>
            </div>
            <input
              aria-label="Scrub Polymarket price history"
              max={Math.max(0, visibleRows.length - 1)}
              min={0}
              onChange={(event) => {
                updateScrubFromRangeValue(event.currentTarget.value);
              }}
              onInput={(event) => {
                updateScrubFromRangeValue(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                const largeStep = Math.max(10, Math.round(visibleRows.length / 20));
                const keyActions: Record<string, number> = {
                  ArrowDown: activeIndex - 1,
                  ArrowLeft: activeIndex - 1,
                  ArrowRight: activeIndex + 1,
                  ArrowUp: activeIndex + 1,
                  End: visibleRows.length - 1,
                  Home: 0,
                  PageDown: activeIndex - largeStep,
                  PageUp: activeIndex + largeStep,
                };
                const nextIndex = keyActions[event.key];

                if (nextIndex == null) {
                  return;
                }

                event.preventDefault();
                updateScrubIndex(nextIndex);
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                updateScrubFromRangePointer(event.clientX, event.currentTarget);
              }}
              onPointerMove={(event) => {
                if (event.buttons !== 1) {
                  return;
                }

                updateScrubFromRangePointer(event.clientX, event.currentTarget);
              }}
              step={1}
              style={{
                accentColor: "#0a76d6",
                marginTop: 14,
                touchAction: "none",
                width: "100%",
              }}
              type="range"
              value={activeIndex}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8fa0b8]">
            <div className="flex flex-wrap items-center gap-4">
              {(isMultiOutcome
                ? activeOutcomeEntries
                : outcomePaths.map(({ color, outcome }) => ({ color, outcome }))
              )
                .slice(0, 8)
                .map(({ color, outcome }) => (
                  <span className="inline-flex items-center gap-2" key={outcome.id}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    {outcome.label}
                  </span>
                ))}
            </div>
            <div className="text-lg font-semibold text-[#8fa0b8]">Polymarket</div>
          </div>
        </>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-white/15 bg-[#0b0f12] p-8 text-center">
          <h4 className="text-xl font-semibold text-white">No Polymarket history yet</h4>
          <p className="mt-2 text-sm text-[#8fa0b8]">
            Run the market indexer or check the Polymarket proxy before validating this curve.
          </p>
        </div>
      )}
    </div>
  );
}
