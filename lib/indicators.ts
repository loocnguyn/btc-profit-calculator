import type { Candle } from "@/lib/useKlines";

export interface MaPoint {
  time: number;
  value: number;
}

/** Simple moving average of closes. Emits nothing until `period` candles exist. */
export function sma(candles: Candle[], period: number): MaPoint[] {
  if (candles.length < period) return [];

  const out: MaPoint[] = [];
  let sum = 0;

  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) {
      out.push({ time: candles[i].time, value: sum / period });
    }
  }

  return out;
}

/** SMA ending at `index`, or null when there aren't enough candles before it. */
export function smaAt(candles: Candle[], period: number, index: number): number | null {
  if (index < period - 1 || index >= candles.length) return null;

  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    sum += candles[i].close;
  }

  return sum / period;
}
