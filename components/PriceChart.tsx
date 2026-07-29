"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { formatPercent, formatUsd } from "@/lib/format";
import { sma, smaAt } from "@/lib/indicators";
import { INTERVALS, useKlines, type Candle, type Interval } from "@/lib/useKlines";

const INTERVAL_KEY = "btc-chart-interval";

const UP = "#3ddc84";
const DOWN = "#ff4d4f";
const GRID = "#1e2430";
const AXIS_TEXT = "#8b93a7";
const CROSSHAIR = "#3a3f4b";
const GOAL_COLOR = "#f7931a";
const ENTRY_COLOR = "#38bdf8";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const MAS = [
  { period: 7, color: "#f0b90b" },
  { period: 25, color: "#e5379c" },
  { period: 99, color: "#8b5cf6" },
];

function toCandleData(c: Candle) {
  return {
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  };
}

function toVolumeData(c: Candle) {
  return {
    time: c.time as UTCTimestamp,
    value: c.volume,
    color: c.close >= c.open ? "rgba(61,220,132,0.3)" : "rgba(255,77,79,0.3)",
  };
}

export default function PriceChart({
  goal = null,
  entry = null,
  currentPrice = null,
}: {
  goal?: number | null;
  entry?: number | null;
  currentPrice?: number | null;
}) {
  // Read the saved timeframe during the first render so we don't fire a wasted
  // request for the default one and then immediately refetch.
  const [timeframe, setTimeframe] = useState<Interval>(() => {
    if (typeof window === "undefined") return "1h";
    try {
      const stored = window.localStorage.getItem(INTERVAL_KEY) as Interval | null;
      return stored && INTERVALS.some((i) => i.value === stored) ? stored : "1h";
    } catch {
      return "1h";
    }
  });
  const { candles, seedId, loading, error } = useKlines(timeframe);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<"Line">[]>([]);
  const goalLineRef = useRef<IPriceLine | null>(null);
  const entryLineRef = useRef<IPriceLine | null>(null);

  function pickTimeframe(next: Interval) {
    setTimeframe(next);
    try {
      window.localStorage.setItem(INTERVAL_KEY, next);
    } catch {
      // localStorage unavailable, skip persisting
    }
  }

  // Build the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      // Let the library own sizing: measuring clientWidth here can read 0 (hidden
      // tab / layout not settled) and then never self-correct.
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: AXIS_TEXT,
        fontFamily: MONO,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: CROSSHAIR, style: LineStyle.Dashed, labelBackgroundColor: GRID },
        horzLine: { color: CROSSHAIR, style: LineStyle.Dashed, labelBackgroundColor: GRID },
      },
      rightPriceScale: { borderColor: GRID },
      timeScale: { borderColor: GRID, timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chart.priceScale("").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    const maSeries = MAS.map(({ color }) =>
      chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
    );

    chart.subscribeCrosshairMove((param) => {
      setHoveredTime(typeof param.time === "number" ? param.time : null);
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volSeriesRef.current = volSeries;
    maSeriesRef.current = maSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
      maSeriesRef.current = [];
      goalLineRef.current = null;
      entryLineRef.current = null;
    };
  }, []);

  // Fresh dataset (first load or timeframe switch) -> replace everything.
  useEffect(() => {
    if (seedId === 0 || candles.length === 0) return;
    const candleSeries = candleSeriesRef.current;
    const volSeries = volSeriesRef.current;
    if (!candleSeries || !volSeries) return;

    candleSeries.setData(candles.map(toCandleData));
    volSeries.setData(candles.map(toVolumeData));
    maSeriesRef.current.forEach((series, i) => {
      series.setData(
        sma(candles, MAS[i].period).map((p) => ({
          time: p.time as UTCTimestamp,
          value: p.value,
        }))
      );
    });
    chartRef.current?.timeScale().fitContent();
    // Intentionally keyed on seedId only: `candles` mutates on every live tick,
    // and those are handled by the update() effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedId]);

  // Live tick -> patch just the last candle so zoom/scroll stay put.
  useEffect(() => {
    if (candles.length === 0) return;
    const candleSeries = candleSeriesRef.current;
    const volSeries = volSeriesRef.current;
    if (!candleSeries || !volSeries) return;

    const last = candles[candles.length - 1];
    candleSeries.update(toCandleData(last));
    volSeries.update(toVolumeData(last));
    maSeriesRef.current.forEach((series, i) => {
      const value = smaAt(candles, MAS[i].period, candles.length - 1);
      if (value !== null) {
        series.update({ time: last.time as UTCTimestamp, value });
      }
    });
  }, [candles]);

  const goalReached = goal !== null && currentPrice !== null && currentPrice >= goal;

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    if (goalLineRef.current) {
      candleSeries.removePriceLine(goalLineRef.current);
      goalLineRef.current = null;
    }
    if (goal !== null) {
      goalLineRef.current = candleSeries.createPriceLine({
        price: goal,
        color: goalReached ? UP : GOAL_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: goalReached ? "Target hit" : "Target",
      });
    }
  }, [goal, goalReached]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    if (entryLineRef.current) {
      candleSeries.removePriceLine(entryLineRef.current);
      entryLineRef.current = null;
    }
    if (entry !== null) {
      entryLineRef.current = candleSeries.createPriceLine({
        price: entry,
        color: ENTRY_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "Entry",
      });
    }
  }, [entry]);

  const shownIndex =
    hoveredTime !== null
      ? candles.findIndex((c) => c.time === hoveredTime)
      : candles.length - 1;
  const shown = shownIndex >= 0 ? candles[shownIndex] : null;
  const changePercent = shown ? ((shown.close - shown.open) / shown.open) * 100 : 0;
  const rangePercent = shown ? ((shown.high - shown.low) / shown.low) * 100 : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 font-mono text-[11px] sm:text-xs">
        {INTERVALS.map((i) => (
          <button
            key={i.value}
            onClick={() => pickTimeframe(i.value)}
            className={`px-2 py-1 rounded transition-colors ${
              timeframe === i.value
                ? "bg-btc text-black font-semibold"
                : "text-neutral-500 hover:text-neutral-200"
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>

      {shown && (
        <div className="flex flex-col gap-0.5 font-mono text-[10px] sm:text-[11px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="text-neutral-500">
              {new Date(shown.time * 1000).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <OhlcItem label="O" value={shown.open} />
            <OhlcItem label="H" value={shown.high} />
            <OhlcItem label="L" value={shown.low} />
            <OhlcItem label="C" value={shown.close} />
            <span className={changePercent >= 0 ? "text-profit" : "text-loss"}>
              {formatPercent(changePercent)}
            </span>
            <span className="text-neutral-500">Range {rangePercent.toFixed(2)}%</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {MAS.map(({ period, color }) => {
              const value = smaAt(candles, period, shownIndex);
              return (
                <span key={period} style={{ color }}>
                  MA({period}) {value !== null ? formatUsd(value) : "—"}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative w-full h-[260px] sm:h-[380px]">
        <div ref={containerRef} className="absolute inset-0" />
        {(loading || error) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className={`font-mono text-xs ${error ? "text-loss" : "text-neutral-500"}`}
            >
              {error ?? "Loading chart..."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function OhlcItem({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-neutral-500">
      {label} <span className="text-neutral-200">{formatUsd(value)}</span>
    </span>
  );
}
