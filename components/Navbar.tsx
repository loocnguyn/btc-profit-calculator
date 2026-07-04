"use client";

import type { Session } from "@supabase/supabase-js";
import type { FlashDirection } from "@/lib/useLivePrice";
import { formatUsd } from "@/lib/format";
import AccountMenu from "./AccountMenu";

export default function Navbar({
  session,
  price,
  flash,
  connected,
  updatedAt,
  onOpenCommands,
  onClearAll,
}: {
  session: Session;
  price: number | null;
  flash: FlashDirection;
  connected: boolean;
  updatedAt: Date | null;
  onOpenCommands: () => void;
  onClearAll: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 w-full bg-surface border-b border-border">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <h1 className="text-base sm:text-lg font-bold tracking-tight whitespace-nowrap">
          <span className="text-btc">₿</span> BTC Profit Calculator
        </h1>

        <div className="flex items-center gap-3">
          {price !== null ? (
            <div className="flex items-center gap-2 font-mono text-xs sm:text-sm bg-panel border border-border rounded-full px-3 py-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  connected ? "bg-profit" : "bg-loss"
                }`}
              />
              <span
                className={`transition-colors duration-500 ${
                  flash === "up"
                    ? "text-profit"
                    : flash === "down"
                      ? "text-loss"
                      : "text-neutral-200"
                }`}
              >
                ${formatUsd(price)}
              </span>
              <span className="hidden sm:inline text-neutral-500 text-[11px]">
                {updatedAt?.toLocaleTimeString("en-US")}
              </span>
            </div>
          ) : (
            <span className="font-mono text-xs text-neutral-500">Connecting...</span>
          )}

          <AccountMenu session={session} onOpenCommands={onOpenCommands} onClearAll={onClearAll} />
        </div>
      </div>
    </header>
  );
}
