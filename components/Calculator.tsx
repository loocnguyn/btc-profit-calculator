"use client";

import { useEffect, useRef, useState } from "react";
import {
  calculate,
  getCommandKind,
  parseCommand,
  parseGoalCommand,
  type CalcResult,
} from "@/lib/calc";
import { formatBtc, formatPercent, formatUsd, formatUsdSigned } from "@/lib/format";
import { useLivePrice } from "@/lib/useLivePrice";
import PriceChart, { type PricePoint } from "./PriceChart";
import ProfitPanel, { type ProfitEntry } from "./ProfitPanel";

interface HistoryItem {
  id: string;
  command: string;
  profitPercent: number;
  profitUsd: number;
}

const HISTORY_KEY = "btc-cal-history";
const HISTORY_LIMIT = 10;
const PROFIT_BOOK_KEY = "btc-profit-book";
const GOAL_KEY = "btc-goal-price";
const CHART_APPEND_MS = 30_000;
const CHART_POINTS_LIMIT = 300;

export default function Calculator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [profitBook, setProfitBook] = useState<ProfitEntry[]>([]);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [goalPrice, setGoalPrice] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    price: currentPrice,
    updatedAt: priceUpdatedAt,
    connected: priceConnected,
    flash: priceFlash,
  } = useLivePrice();
  const currentPriceRef = useRef<number | null>(null);

  useEffect(() => {
    currentPriceRef.current = currentPrice;
  }, [currentPrice]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed: HistoryItem[] = JSON.parse(stored);
        setHistory(parsed.map((item) => ({ ...item, profitUsd: item.profitUsd ?? 0 })));
      }
    } catch {
      // ignore malformed localStorage data
    }
    try {
      const storedProfit = window.localStorage.getItem(PROFIT_BOOK_KEY);
      if (storedProfit) setProfitBook(JSON.parse(storedProfit));
    } catch {
      // ignore malformed localStorage data
    }
    try {
      const storedGoal = window.localStorage.getItem(GOAL_KEY);
      if (storedGoal) {
        const parsedGoal = Number(storedGoal);
        if (isFinite(parsedGoal) && parsedGoal > 0) setGoalPrice(parsedGoal);
      }
    } catch {
      // ignore malformed localStorage data
    }
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchChartHistory() {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1"
        );
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        const prices: [number, number][] = data?.prices ?? [];
        if (!cancelled && prices.length > 0) {
          setPriceHistory(prices.map(([t, p]) => ({ t, p })));
        }
      } catch {
        // chart seed failed, live ticks will still populate it over time
      }
    }

    fetchChartHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const price = currentPriceRef.current;
      if (price === null) return;
      setPriceHistory((prev) => {
        const next = [...prev, { t: Date.now(), p: price }];
        return next.length > CHART_POINTS_LIMIT
          ? next.slice(next.length - CHART_POINTS_LIMIT)
          : next;
      });
    }, CHART_APPEND_MS);
    return () => clearInterval(interval);
  }, []);

  function saveHistory(next: HistoryItem[]) {
    setHistory(next);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable, skip persisting
    }
  }

  function saveProfitBook(next: ProfitEntry[]) {
    setProfitBook(next);
    try {
      window.localStorage.setItem(PROFIT_BOOK_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable, skip persisting
    }
  }

  function saveGoal(next: number | null) {
    setGoalPrice(next);
    try {
      if (next === null) {
        window.localStorage.removeItem(GOAL_KEY);
      } else {
        window.localStorage.setItem(GOAL_KEY, String(next));
      }
    } catch {
      // localStorage unavailable, skip persisting
    }
  }

  function handleSubmit() {
    if (!input.trim()) return;
    const kind = getCommandKind(input);

    if (kind === "cleargoal") {
      saveGoal(null);
      setError(null);
      return;
    }

    if (kind === "goal") {
      try {
        const point = parseGoalCommand(input);
        saveGoal(point);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      }
      return;
    }

    try {
      const parsed = parseCommand(input);
      const calcResult = calculate(parsed);
      setResult(calcResult);
      setError(null);

      if (kind === "profit") {
        const entry: ProfitEntry = {
          id: `${Date.now()}`,
          entry: parsed.buyPrice,
          sell: parsed.sellPrice,
          money: parsed.amountUsd,
          profitUsd: calcResult.profitUsd,
          profitPercent: calcResult.profitPercent,
          timestamp: Date.now(),
        };
        saveProfitBook([entry, ...profitBook]);
      } else {
        const item: HistoryItem = {
          id: `${Date.now()}`,
          command: parsed.raw,
          profitPercent: calcResult.profitPercent,
          profitUsd: calcResult.profitUsd,
        };
        saveHistory([item, ...history].slice(0, HISTORY_LIMIT));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      setResult(null);
    }
  }

  function removeProfitEntry(id: string) {
    saveProfitBook(profitBook.filter((e) => e.id !== id));
  }

  function clearProfitBook() {
    saveProfitBook([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSubmit();
  }

  function useCurrentPriceAsSell() {
    if (currentPrice === null) return;
    const kind = getCommandKind(input);
    if (kind === "goal" || kind === "cleargoal") return;
    const withoutPrefix = input.trim().replace(/^\/?(cal|profit)\s*/i, "");
    const parts = withoutPrefix.split(/\s+/).filter(Boolean);
    const buy = parts[0] ?? "";
    const amount = parts[2] ?? "";
    const sell = currentPrice.toFixed(2);
    setInput(`/${kind} ${buy} ${sell} ${amount}`.trim());
    inputRef.current?.focus();
  }

  const isProfit = result !== null && result.profitPercent >= 0;

  const goalReached =
    goalPrice !== null && currentPrice !== null && currentPrice >= goalPrice;
  const goalDistancePercent =
    goalPrice !== null && currentPrice !== null
      ? ((goalPrice - currentPrice) / currentPrice) * 100
      : null;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-5xl flex flex-col lg:grid lg:grid-cols-[300px_minmax(0,1fr)] gap-5 lg:items-start">
        <ProfitPanel
          entries={profitBook}
          onRemove={removeProfitEntry}
          onClearAll={clearProfitBook}
        />

        <div className="flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            <span className="text-btc">₿</span> BTC Profit Calculator
          </h1>
          <div className="text-right font-mono text-xs sm:text-sm text-neutral-400">
            {currentPrice !== null ? (
              <>
                <span
                  className={`transition-colors duration-500 ${
                    priceFlash === "up"
                      ? "text-profit"
                      : priceFlash === "down"
                        ? "text-loss"
                        : "text-neutral-200"
                  }`}
                >
                  ${formatUsd(currentPrice)}
                </span>
                <div className="text-[10px] sm:text-xs text-neutral-500">
                  {priceConnected ? "cập nhật" : "mất kết nối, đang thử lại..."}{" "}
                  {priceUpdatedAt?.toLocaleTimeString("vi-VN")}
                </div>
                {goalPrice !== null && goalDistancePercent !== null && (
                  <div
                    className={`text-[10px] sm:text-xs ${
                      goalReached ? "text-profit" : "text-btc"
                    }`}
                  >
                    🎯 ${formatUsd(goalPrice)}{" "}
                    {goalReached
                      ? "— đã đạt!"
                      : `— còn ${formatPercent(goalDistancePercent)}`}
                  </div>
                )}
              </>
            ) : (
              <span>Đang kết nối giá...</span>
            )}
          </div>
        </header>

        <div className="bg-panel border border-border rounded-xl p-3 sm:p-4">
          <PriceChart points={priceHistory} goal={goalPrice} currentPrice={currentPrice} />
        </div>

        <div className="bg-panel border border-border rounded-xl p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-2.5 font-mono text-sm sm:text-base text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-btc transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={useCurrentPriceAsSell}
                disabled={currentPrice === null}
                className="whitespace-nowrap px-3 py-2.5 rounded-lg border border-border text-xs sm:text-sm font-mono text-neutral-300 hover:border-btc hover:text-btc transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Dùng giá hiện tại
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2.5 rounded-lg bg-btc text-black font-semibold text-sm sm:text-base hover:brightness-110 transition-all"
              >
                Tính
              </button>
            </div>
          </div>
          {error && (
            <p className="text-loss text-sm font-mono">{error}</p>
          )}
        </div>

        {result && (
          <div className="bg-panel border border-border rounded-xl p-4 sm:p-5 flex flex-col gap-4">
            <div className="text-center">
              <div
                className={`text-4xl sm:text-5xl font-bold font-mono ${
                  isProfit ? "text-profit" : "text-loss"
                }`}
              >
                {formatPercent(result.profitPercent)}
              </div>
              <div
                className={`mt-1 text-sm sm:text-base font-mono ${
                  isProfit ? "text-profit" : "text-loss"
                }`}
              >
                {isProfit ? "+" : ""}
                {formatUsd(result.profitUsd)} USD
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-sm">
              <Stat label="Giá mua" value={`$${formatUsd(result.buyPrice)}`} />
              <Stat label="Giá bán" value={`$${formatUsd(result.sellPrice)}`} />
              <Stat label="Số BTC mua được" value={formatBtc(result.btcBought)} />
              <Stat label="Vốn bỏ ra" value={`$${formatUsd(result.amountUsd)}`} />
              <Stat
                label="Tổng tiền nhận về"
                value={`$${formatUsd(result.totalReceived)}`}
              />
              <Stat
                label="Lãi / Lỗ"
                value={`${isProfit ? "+" : ""}$${formatUsd(result.profitUsd)}`}
                valueClassName={isProfit ? "text-profit" : "text-loss"}
              />
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="bg-panel border border-border rounded-xl p-4 sm:p-5">
            <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-mono mb-2">
              Lịch sử ({history.length})
            </h2>
            <ul className="flex flex-col gap-1.5 font-mono text-xs sm:text-sm">
              {history.map((item) => {
                const itemIsProfit = item.profitPercent >= 0;
                const colorClass = itemIsProfit ? "text-profit" : "text-loss";
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-neutral-300"
                  >
                    <span className="truncate">{item.command}</span>
                    <span className="flex items-baseline gap-2 shrink-0">
                      <span className={colorClass}>
                        {formatPercent(item.profitPercent)}
                      </span>
                      <span className={`${colorClass} opacity-70 text-[11px] sm:text-xs`}>
                        {formatUsdSigned(item.profitUsd)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-neutral-500 text-xs">{label}</span>
      <span className={valueClassName ?? "text-neutral-100"}>{value}</span>
    </div>
  );
}
