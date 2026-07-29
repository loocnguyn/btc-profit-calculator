import { useEffect, useState } from "react";

const REST_URL = "https://api.binance.com/api/v3/klines";
const WS_BASE = "wss://stream.binance.com:9443/ws/btcusdt@kline_";
const SYMBOL = "BTCUSDT";
const CANDLE_LIMIT = 500;
const RECONNECT_DELAY_MS = 2000;

export type Interval = "15m" | "1h" | "4h" | "1d" | "1w";

export const INTERVALS: { value: Interval; label: string }[] = [
  { value: "15m", label: "15m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
];

/** One OHLCV candle. `time` is a UNIX timestamp in **seconds**. */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KlinesState {
  candles: Candle[];
  /** Increments on every successful reseed, so consumers can tell a fresh
   *  dataset (setData) apart from a live tick on the last candle (update). */
  seedId: number;
  loading: boolean;
  error: string | null;
}

/** Binance REST rows are `[openTime, open, high, low, close, volume, ...]`. */
type KlineRow = [number, string, string, string, string, string, ...unknown[]];

function rowToCandle(r: KlineRow): Candle {
  return {
    time: Math.floor(r[0] / 1000),
    open: parseFloat(r[1]),
    high: parseFloat(r[2]),
    low: parseFloat(r[3]),
    close: parseFloat(r[4]),
    volume: parseFloat(r[5]),
  };
}

export function useKlines(interval: Interval): KlinesState {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [seedId, setSeedId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    // Drop the previous timeframe's candles so they never render under a new one.
    setCandles([]);
    setLoading(true);
    setError(null);

    async function seed() {
      try {
        const res = await fetch(
          `${REST_URL}?symbol=${SYMBOL}&interval=${interval}&limit=${CANDLE_LIMIT}`
        );
        if (!res.ok) throw new Error(`Binance returned ${res.status}`);
        const rows: KlineRow[] = await res.json();
        if (cancelled) return;
        setCandles(rows.map(rowToCandle));
        setSeedId((n) => n + 1);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load candles.");
        setLoading(false);
      }
    }

    function connect() {
      ws = new WebSocket(`${WS_BASE}${interval}`);

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const k = JSON.parse(event.data)?.k;
          if (!k) return;
          const live: Candle = {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
          };
          setCandles((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            // Same candle still forming -> replace it; a newer one -> append.
            if (live.time === last.time) {
              return [...prev.slice(0, -1), live];
            }
            if (live.time > last.time) {
              return [...prev, live];
            }
            return prev;
          });
        } catch {
          // ignore malformed kline payloads
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    seed();
    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [interval]);

  return { candles, seedId, loading, error };
}
