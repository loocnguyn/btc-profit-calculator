"use client";

import { useEffect } from "react";

const COMMANDS = [
  {
    syntax: "/cal <entry> <sell> <money>",
    desc: "Quick profit calc, shown in History",
  },
  {
    syntax: "/profit <entry> <sell> <money>",
    desc: "Records profit into Total Profit",
  },
  {
    syntax: "/goal <price>",
    desc: "Draws a take-profit target line on the chart",
  },
  {
    syntax: "/cleargoal",
    desc: "Removes the target line",
  },
  {
    syntax: "/entry <price>",
    desc: "Draws an entry price line on the chart",
  },
  {
    syntax: "/clearentry",
    desc: "Removes the entry line",
  },
];

export default function CommandReference({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-panel border border-border rounded-xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-mono">
            Commands
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-500 hover:text-neutral-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <ul className="flex flex-col gap-3">
          {COMMANDS.map((c) => (
            <li key={c.syntax} className="flex flex-col">
              <span className="font-mono text-xs sm:text-sm text-btc">{c.syntax}</span>
              <span className="text-[11px] sm:text-xs text-neutral-500">{c.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
