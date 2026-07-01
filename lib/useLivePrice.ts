import { useEffect, useRef, useState } from "react";

const WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@trade";
const THROTTLE_MS = 1000;
const RECONNECT_DELAY_MS = 2000;
const FLASH_DURATION_MS = 700;

export type FlashDirection = "up" | "down" | null;

export interface LivePriceState {
  price: number | null;
  updatedAt: Date | null;
  connected: boolean;
  flash: FlashDirection;
}

export function useLivePrice(): LivePriceState {
  const [price, setPrice] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [connected, setConnected] = useState(false);
  const [flash, setFlash] = useState<FlashDirection>(null);

  const latestTradeRef = useRef<number | null>(null);
  const lastShownRef = useRef<number | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let flashTimer: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (!cancelled) setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const tradePrice = parseFloat(data.p);
          if (!isNaN(tradePrice)) latestTradeRef.current = tradePrice;
        } catch {
          // ignore malformed trade payloads
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    const flushInterval = setInterval(() => {
      const latest = latestTradeRef.current;
      if (latest === null) return;

      const prev = lastShownRef.current;
      if (prev !== null && latest !== prev) {
        setFlash(latest > prev ? "up" : "down");
        clearTimeout(flashTimer);
        flashTimer = setTimeout(() => setFlash(null), FLASH_DURATION_MS);
      }

      lastShownRef.current = latest;
      setPrice(latest);
      setUpdatedAt(new Date());
    }, THROTTLE_MS);

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      clearTimeout(flashTimer);
      clearInterval(flushInterval);
      ws?.close();
    };
  }, []);

  return { price, updatedAt, connected, flash };
}
