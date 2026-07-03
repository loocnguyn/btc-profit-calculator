"use client";

import { useId, useMemo, useState, type MouseEvent } from "react";
import { formatUsd } from "@/lib/format";

export interface PricePoint {
  t: number;
  p: number;
}

const WIDTH = 600;
const HEIGHT = 120;
const PADDING = 8;
const LABEL_HEIGHT = 16;

/** A dashed horizontal price line with a labelled pill offset off the line. */
function ChartPriceLine({
  y,
  color,
  text,
  preferBelow = false,
}: {
  y: number;
  color: string;
  text: string;
  preferBelow?: boolean;
}) {
  const labelWidth = text.length * 6.4 + 12;
  const roomAbove = y - PADDING > LABEL_HEIGHT + 4;
  const roomBelow = HEIGHT - PADDING - y > LABEL_HEIGHT + 4;
  const below = preferBelow ? roomBelow || !roomAbove : !roomAbove && roomBelow;
  const labelCenterY = below ? y + 14 : y - 14;
  const rectX = WIDTH - labelWidth - 6;

  return (
    <>
      <line
        x1={0}
        y1={y}
        x2={WIDTH}
        y2={y}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="6 5"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={rectX}
        y={labelCenterY - LABEL_HEIGHT / 2}
        width={labelWidth}
        height={LABEL_HEIGHT}
        rx={4}
        fill="#0b0e14"
        fillOpacity={0.9}
        stroke={color}
        strokeOpacity={0.4}
      />
      <text
        x={WIDTH - 12}
        y={labelCenterY + 4}
        textAnchor="end"
        fontSize={11}
        fontFamily="ui-monospace, monospace"
        fill={color}
      >
        {text}
      </text>
    </>
  );
}

export default function PriceChart({
  points,
  goal = null,
  entry = null,
  currentPrice = null,
}: {
  points: PricePoint[];
  goal?: number | null;
  entry?: number | null;
  currentPrice?: number | null;
}) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { linePath, areaPath, coords, isUp, goalY, entryY } = useMemo(() => {
    if (points.length < 2) {
      return {
        linePath: "",
        areaPath: "",
        coords: [] as [number, number][],
        isUp: true,
        goalY: null as number | null,
        entryY: null as number | null,
      };
    }

    const prices = points.map((pt) => pt.p);
    let min = Math.min(...prices);
    let max = Math.max(...prices);
    for (const extra of [goal, entry]) {
      if (extra !== null) {
        min = Math.min(min, extra);
        max = Math.max(max, extra);
      }
    }
    const range = max - min || max * 0.001 || 1;

    const toY = (price: number) =>
      HEIGHT - PADDING - ((price - min) / range) * (HEIGHT - PADDING * 2);

    const coords = points.map((pt, i) => {
      const x = (i / (points.length - 1)) * WIDTH;
      return [x, toY(pt.p)] as [number, number];
    });

    const line = coords
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");

    const area = `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;

    return {
      linePath: line,
      areaPath: area,
      coords,
      isUp: prices[prices.length - 1] >= prices[0],
      goalY: goal !== null ? toY(goal) : null,
      entryY: entry !== null ? toY(entry) : null,
    };
  }, [points, goal, entry]);

  if (points.length < 2) {
    return (
      <div className="h-[120px] flex items-center justify-center text-xs sm:text-sm text-neutral-500 font-mono">
        Đang tải biểu đồ giá...
      </div>
    );
  }

  const color = isUp ? "#3ddc84" : "#ff4d4f";
  const goalReached = goal !== null && currentPrice !== null && currentPrice >= goal;
  const goalColor = goalReached ? "#3ddc84" : "#f7931a";
  const entryColor = "#38bdf8";

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relX * (points.length - 1));
    setHoverIndex(Math.min(points.length - 1, Math.max(0, idx)));
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredCoord = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div
      className="relative w-full h-[120px]"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {entryY !== null && (
          <ChartPriceLine
            y={entryY}
            color={entryColor}
            text={`Vào $${formatUsd(entry as number)}`}
            preferBelow
          />
        )}
        {goalY !== null && (
          <ChartPriceLine
            y={goalY}
            color={goalColor}
            text={`${goalReached ? "Đã đạt · " : "Mục tiêu "}$${formatUsd(goal as number)}`}
          />
        )}
        {hoveredCoord && (
          <>
            <line
              x1={hoveredCoord[0]}
              y1={0}
              x2={hoveredCoord[0]}
              y2={HEIGHT}
              stroke="#3a3f4b"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hoveredCoord[0]}
              cy={hoveredCoord[1]}
              r={4}
              fill={color}
              stroke="#0b0e14"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      {hovered && hoveredCoord && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-md border border-border bg-panel px-2 py-1 font-mono text-xs shadow-lg"
          style={{
            left: `${(hoveredCoord[0] / WIDTH) * 100}%`,
            top: `${(hoveredCoord[1] / HEIGHT) * 100}%`,
          }}
        >
          <div className="text-neutral-100">${formatUsd(hovered.p)}</div>
          <div className="text-neutral-500">
            {new Date(hovered.t).toLocaleTimeString("vi-VN")}
          </div>
        </div>
      )}
    </div>
  );
}
