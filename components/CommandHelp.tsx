"use client";

import { useState } from "react";

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

export default function CommandHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-panel border border-border rounded-xl p-4 sm:p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500 font-mono"
      >
        <span>Commands</span>
        <span className="text-neutral-600">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <ul className="mt-3 flex flex-col gap-2">
          {COMMANDS.map((c) => (
            <li key={c.syntax} className="flex flex-col">
              <span className="font-mono text-xs sm:text-sm text-btc">{c.syntax}</span>
              <span className="text-[11px] sm:text-xs text-neutral-500">{c.desc}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
