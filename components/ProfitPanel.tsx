"use client";

import { formatPercent, formatUsd, formatUsdSigned } from "@/lib/format";

export interface ProfitEntry {
  id: string;
  entry: number;
  sell: number;
  money: number;
  profitUsd: number;
  profitPercent: number;
  timestamp: number;
}

export default function ProfitPanel({
  entries,
  onRemove,
  onClearAll,
}: {
  entries: ProfitEntry[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}) {
  const totalProfit = entries.reduce((sum, e) => sum + e.profitUsd, 0);
  const totalMoney = entries.reduce((sum, e) => sum + e.money, 0);
  const overallPercent = totalMoney > 0 ? (totalProfit / totalMoney) * 100 : 0;
  const isProfit = totalProfit >= 0;

  return (
    <div className="bg-panel border border-border rounded-xl p-4 sm:p-5 flex flex-col gap-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-neutral-500 font-mono mb-1">
          Total Profit
        </div>
        <div
          className={`text-3xl sm:text-4xl font-bold font-mono ${
            isProfit ? "text-profit" : "text-loss"
          }`}
        >
          {formatUsdSigned(totalProfit)}
        </div>
        {entries.length > 0 && (
          <div className="mt-1 font-mono text-xs sm:text-sm text-neutral-500">
            Cost basis: ${formatUsd(totalMoney)} · {formatPercent(overallPercent)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-mono">
          Ledger ({entries.length})
        </h2>
        {entries.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Delete the entire ledger? This cannot be undone.")) {
                onClearAll();
              }
            }}
            className="text-xs font-mono text-neutral-500 hover:text-loss transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {entries.length > 0 && (
        <ul className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
          {entries.map((e) => {
            const rowIsProfit = e.profitUsd >= 0;
            const colorClass = rowIsProfit ? "text-profit" : "text-loss";
            return (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 font-mono text-xs sm:text-sm border-b border-border pb-2 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="text-neutral-300 truncate">
                    {formatUsd(e.entry)} → {formatUsd(e.sell)}
                  </div>
                  <div className="text-neutral-600 text-[10px] sm:text-xs">
                    cost ${formatUsd(e.money)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className={colorClass}>{formatUsdSigned(e.profitUsd)}</div>
                    <div className={`${colorClass} opacity-70 text-[10px] sm:text-xs`}>
                      {formatPercent(e.profitPercent)}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(e.id)}
                    aria-label="Delete this entry"
                    className="text-neutral-600 hover:text-loss transition-colors px-1"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
