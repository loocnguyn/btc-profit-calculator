"use client";

import { useId, useMemo } from "react";

export interface PricePoint {
  t: number;
  p: number;
}

const WIDTH = 600;
const HEIGHT = 120;
const PADDING = 8;

export default function PriceChart({ points }: { points: PricePoint[] }) {
  const gradientId = useId();

  const { linePath, areaPath, isUp } = useMemo(() => {
    if (points.length < 2) return { linePath: "", areaPath: "", isUp: true };

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
      return [x, y] as const;
    });

    const line = coords
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");

    const area = `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;

    return {
      linePath: line,
      areaPath: area,
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

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="w-full h-[120px]"
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
    </svg>
  );
}
