"use client";

import { useState } from "react";

const COMMANDS = [
  {
    syntax: "/cal <entry> <sell> <vốn>",
    desc: "Tính nhanh lãi, hiện ở Lịch sử",
  },
  {
    syntax: "/profit <entry> <sell> <vốn>",
    desc: "Ghi nhận khoản lãi vào Total Profit",
  },
  {
    syntax: "/goal <giá>",
    desc: "Vẽ đường mục tiêu take-profit lên chart",
  },
  {
    syntax: "/cleargoal",
    desc: "Xoá đường mục tiêu",
  },
];

export default function CommandHelp() {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-panel border border-border rounded-xl p-4 sm:p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500 font-mono"
      >
        <span>Lệnh</span>
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
