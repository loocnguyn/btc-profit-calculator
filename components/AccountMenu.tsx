"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getIdentity, signOutUser } from "@/lib/supabase";

export default function AccountMenu({
  session,
  onOpenCommands,
  onClearAll,
}: {
  session: Session;
  onOpenCommands: () => void;
  onClearAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const identity = getIdentity(session);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  function handleClearAll() {
    if (
      window.confirm(
        "Clear all your data? This deletes your ledger, command history, and goal/entry lines. This cannot be undone."
      )
    ) {
      onClearAll();
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full overflow-hidden border border-border hover:border-btc transition-colors flex items-center justify-center bg-panel shrink-0"
        aria-label="Account menu"
      >
        {identity.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={identity.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-mono font-semibold text-btc">{identity.initials}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-40">
          <div className="p-3 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-border flex items-center justify-center bg-panel shrink-0">
              {identity.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={identity.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-mono font-semibold text-btc">
                  {identity.initials}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-neutral-100 truncate">{identity.displayName}</div>
              {identity.email && (
                <div className="text-xs text-neutral-500 truncate">{identity.email}</div>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              onOpenCommands();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 text-sm text-neutral-200 hover:bg-panel transition-colors font-mono"
          >
            Command reference
          </button>

          <button
            onClick={handleClearAll}
            className="w-full text-left px-3 py-2.5 text-sm text-neutral-200 hover:bg-panel transition-colors"
          >
            Clear all my data
          </button>

          <div className="border-t border-border">
            <button
              onClick={() => signOutUser()}
              className="w-full text-left px-3 py-2.5 text-sm text-loss hover:bg-panel transition-colors font-semibold"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
