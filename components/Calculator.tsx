"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  calculate,
  getCommandKind,
  parseCommand,
  parseEntryCommand,
  parseGoalCommand,
  type CalcResult,
  type CommandKind,
} from "@/lib/calc";
import { formatBtc, formatPercent, formatUsd, formatUsdSigned } from "@/lib/format";
import { useLivePrice } from "@/lib/useLivePrice";
import {
  clearProfitEntries,
  deleteProfitEntry,
  fetchCommandHistory,
  fetchPriceMarks,
  fetchProfitEntries,
  insertCommandHistoryItem,
  insertProfitEntry,
  signOutUser,
  upsertPriceMarks,
  type CommandHistoryItem,
} from "@/lib/supabase";
import PriceChart, { type PricePoint } from "./PriceChart";
import ProfitPanel, { type ProfitEntry } from "./ProfitPanel";
import CommandHelp from "./CommandHelp";

const HISTORY_LIMIT = 10;
const CHART_APPEND_MS = 30_000;
const CHART_POINTS_LIMIT = 300;

export default function Calculator({ session }: { session: Session }) {
  const userId = session.user.id;
  const username = (session.user.user_metadata?.username as string | undefined) ?? "user";

  const [input, setInput] = useState("");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profitBook, setProfitBook] = useState<ProfitEntry[]>([]);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [goalPrice, setGoalPrice] = useState<number | null>(null);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    price: currentPrice,
    updatedAt: priceUpdatedAt,
    connected: priceConnected,
    flash: priceFlash,
  } = useLivePrice();
  const currentPriceRef = useRef<number | null>(null);
  const goalPriceRef = useRef<number | null>(null);
  const entryPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentPrice === null) return;
    document.title = `$${formatUsd(currentPrice)} · BTC`;
    return () => {
      document.title = "BTC Profit Calculator";
    };
  }, [currentPrice]);

  useEffect(() => {
    currentPriceRef.current = currentPrice;
  }, [currentPrice]);

  useEffect(() => {
    goalPriceRef.current = goalPrice;
  }, [goalPrice]);

  useEffect(() => {
    entryPriceRef.current = entryPrice;
  }, [entryPrice]);

  useEffect(() => {
    inputRef.current?.focus();

    Promise.all([fetchProfitEntries(), fetchPriceMarks(), fetchCommandHistory()])
      .then(([entries, marks, historyItems]) => {
        setProfitBook(entries);
        setGoalPrice(marks.goal);
        setEntryPrice(marks.entry);
        setHistory(historyItems);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load your data.");
      });
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

  function logCommand(
    kind: CommandKind,
    command: string,
    profitPercent: number | null = null,
    profitUsd: number | null = null
  ) {
    const item: CommandHistoryItem = {
      id: `${Date.now()}`,
      kind,
      command,
      profitPercent,
      profitUsd,
      timestamp: Date.now(),
    };
    setHistory((prev) => [item, ...prev].slice(0, HISTORY_LIMIT));
    insertCommandHistoryItem(userId, item).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not save to history.");
    });
  }

  function syncPriceMarks(goal: number | null, entry: number | null) {
    upsertPriceMarks(userId, { goal, entry }).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not save your price marks.");
    });
  }

  function handleSubmit() {
    if (!input.trim()) return;
    const raw = input.trim();
    const kind = getCommandKind(raw);

    if (kind === "cleargoal") {
      setGoalPrice(null);
      syncPriceMarks(null, entryPriceRef.current);
      setError(null);
      logCommand("cleargoal", raw);
      return;
    }

    if (kind === "goal") {
      try {
        const point = parseGoalCommand(raw);
        setGoalPrice(point);
        syncPriceMarks(point, entryPriceRef.current);
        setError(null);
        logCommand("goal", raw);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error.");
      }
      return;
    }

    if (kind === "clearentry") {
      setEntryPrice(null);
      syncPriceMarks(goalPriceRef.current, null);
      setError(null);
      logCommand("clearentry", raw);
      return;
    }

    if (kind === "entry") {
      try {
        const point = parseEntryCommand(raw);
        setEntryPrice(point);
        syncPriceMarks(goalPriceRef.current, point);
        setError(null);
        logCommand("entry", raw);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error.");
      }
      return;
    }

    try {
      const parsed = parseCommand(raw);
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
        setProfitBook((prev) => [entry, ...prev]);
        insertProfitEntry(userId, entry).catch((err) => {
          setError(err instanceof Error ? err.message : "Could not save to your ledger.");
        });
      }

      logCommand(kind, parsed.raw, calcResult.profitPercent, calcResult.profitUsd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
      setResult(null);
    }
  }

  function removeProfitEntry(id: string) {
    setProfitBook((prev) => prev.filter((e) => e.id !== id));
    deleteProfitEntry(id).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not delete that entry.");
    });
  }

  function clearProfitBook() {
    setProfitBook([]);
    clearProfitEntries().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not clear your ledger.");
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSubmit();
  }

  function useCurrentPriceAsSell() {
    const kind = getCommandKind(input);
    if (kind === "goal" || kind === "cleargoal" || kind === "entry" || kind === "clearentry") {
      return;
    }
    const withoutPrefix = input.trim().replace(/^\/?(cal|profit)\s*/i, "");
    const parts = withoutPrefix.split(/\s+/).filter(Boolean);
    const amount = parts[2] ?? "";

    if (entryPrice !== null) {
      // An /entry line exists: only fill the entry param, leave sell untouched.
      const sell = parts[1] ?? "";
      setInput(`/${kind} ${entryPrice.toFixed(2)} ${sell} ${amount}`.trim());
      inputRef.current?.focus();
      return;
    }

    if (currentPrice === null) return;
    const buy = parts[0] ?? "";
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
  const entryPnlPercent =
    entryPrice !== null && currentPrice !== null
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : null;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-5xl flex flex-col lg:grid lg:grid-cols-[300px_minmax(0,1fr)] gap-5 lg:items-start">
        <div className="flex flex-col gap-5 lg:sticky lg:top-6">
          <CommandHelp />
          <ProfitPanel
            entries={profitBook}
            onRemove={removeProfitEntry}
            onClearAll={clearProfitBook}
          />
        </div>

        <div className="flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              <span className="text-btc">₿</span> BTC Profit Calculator
            </h1>
            <div className="text-[10px] sm:text-xs text-neutral-500 font-mono mt-0.5">
              @{username} ·{" "}
              <button onClick={() => signOutUser()} className="hover:text-btc underline">
                Log out
              </button>
            </div>
          </div>
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
                  {priceConnected ? "updated" : "disconnected, retrying..."}{" "}
                  {priceUpdatedAt?.toLocaleTimeString("en-US")}
                </div>
                {goalPrice !== null && goalDistancePercent !== null && (
                  <div
                    className={`text-[10px] sm:text-xs ${
                      goalReached ? "text-profit" : "text-btc"
                    }`}
                  >
                    Target ${formatUsd(goalPrice)}{" "}
                    {goalReached
                      ? "— reached!"
                      : `— ${formatPercent(goalDistancePercent)} away`}
                  </div>
                )}
                {entryPrice !== null && entryPnlPercent !== null && (
                  <div
                    className={`text-[10px] sm:text-xs ${
                      entryPnlPercent >= 0 ? "text-profit" : "text-loss"
                    }`}
                  >
                    Entry ${formatUsd(entryPrice)} — {formatPercent(entryPnlPercent)}
                  </div>
                )}
              </>
            ) : (
              <span>Connecting to price feed...</span>
            )}
          </div>
        </header>

        <div className="bg-panel border border-border rounded-xl p-3 sm:p-4">
          <PriceChart
            points={priceHistory}
            goal={goalPrice}
            entry={entryPrice}
            currentPrice={currentPrice}
          />
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
                disabled={currentPrice === null && entryPrice === null}
                className="whitespace-nowrap px-3 py-2.5 rounded-lg border border-border text-xs sm:text-sm font-mono text-neutral-300 hover:border-btc hover:text-btc transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Use current price
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2.5 rounded-lg bg-btc text-black font-semibold text-sm sm:text-base hover:brightness-110 transition-all"
              >
                Calculate
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
              <Stat label="Buy price" value={`$${formatUsd(result.buyPrice)}`} />
              <Stat label="Sell price" value={`$${formatUsd(result.sellPrice)}`} />
              <Stat label="BTC bought" value={formatBtc(result.btcBought)} />
              <Stat label="Cost basis" value={`$${formatUsd(result.amountUsd)}`} />
              <Stat
                label="Total received"
                value={`$${formatUsd(result.totalReceived)}`}
              />
              <Stat
                label="Profit / Loss"
                value={`${isProfit ? "+" : ""}$${formatUsd(result.profitUsd)}`}
                valueClassName={isProfit ? "text-profit" : "text-loss"}
              />
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="bg-panel border border-border rounded-xl p-4 sm:p-5">
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500 font-mono"
            >
              <span>History ({history.length})</span>
              <span className="text-neutral-600">{historyOpen ? "▲" : "▼"}</span>
            </button>

            {historyOpen && (
              <ul className="mt-3 flex flex-col gap-1.5 font-mono text-xs sm:text-sm">
                {history.map((item) => {
                  const hasProfit = item.profitPercent !== null && item.profitUsd !== null;
                  const itemIsProfit = hasProfit && (item.profitPercent as number) >= 0;
                  const colorClass = hasProfit
                    ? itemIsProfit
                      ? "text-profit"
                      : "text-loss"
                    : "text-neutral-500";
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-neutral-300"
                    >
                      <span className="truncate">{item.command}</span>
                      {hasProfit ? (
                        <span className="flex items-baseline gap-2 shrink-0">
                          <span className={colorClass}>
                            {formatPercent(item.profitPercent as number)}
                          </span>
                          <span className={`${colorClass} opacity-70 text-[11px] sm:text-xs`}>
                            {formatUsdSigned(item.profitUsd as number)}
                          </span>
                        </span>
                      ) : (
                        <span className={`${colorClass} text-[11px] sm:text-xs shrink-0`}>
                          {item.kind}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
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
