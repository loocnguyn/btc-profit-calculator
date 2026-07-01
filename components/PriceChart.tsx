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

export default function PriceChart({ points }: { points: PricePoint[] }) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { linePath, areaPath, coords, isUp } = useMemo(() => {
    if (points.length < 2) {
      return { linePath: "", areaPath: "", coords: [] as [number, number][], isUp: true };
    }

    const prices = points.map((pt) => pt.p);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || max * 0.001 || 1;

    const coords = points.map((pt, i) => {
      const x = (i / (points.length - 1)) * WIDTH;
      const y =
        HEIGHT -
        PADDING -
        ((pt.p - min) / range) * (HEIGHT - PADDING * 2);
      return [x, y] as [number, number];
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
    };
  }, [points]);

  if (points.length < 2) {
    return (
      <div className="h-[120px] flex items-center justify-center text-xs sm:text-sm text-neutral-500 font-mono">
        Đang tải biểu đồ giá...
      </div>
    );
  }

  const color = isUp ? "#3ddc84" : "#ff4d4f";

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
