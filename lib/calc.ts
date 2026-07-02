export interface CalcResult {
  buyPrice: number;
  sellPrice: number;
  amountUsd: number;
  btcBought: number;
  totalReceived: number;
  profitUsd: number;
  profitPercent: number;
}

export interface ParsedCommand {
  raw: string;
  buyPrice: number;
  sellPrice: number;
  amountUsd: number;
}

export type CommandKind = "cal" | "profit" | "goal" | "cleargoal";

export function getCommandKind(input: string): CommandKind {
  const trimmed = input.trim();
  if (/^\/?cleargoal\b/i.test(trimmed)) return "cleargoal";
  if (/^\/?goal\b/i.test(trimmed)) return "goal";
  if (/^\/?profit\b/i.test(trimmed)) return "profit";
  return "cal";
}

export function parseGoalCommand(input: string): number {
  const withoutPrefix = input.trim().replace(/^\/?goal\s+/i, "");
  const point = Number(withoutPrefix.trim());

  if (!isFinite(point) || isNaN(point) || point <= 0) {
    throw new Error("Cú pháp không đúng. Dùng: /goal <mức_giá>");
  }

  return point;
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  const withoutPrefix = trimmed.replace(/^\/?(cal|profit)\s+/i, "");
  const parts = withoutPrefix.split(/\s+/).filter(Boolean);

  if (parts.length !== 3) {
    throw new Error(
      "Cú pháp không đúng. Dùng: /cal <giá_mua> <giá_bán> <số_tiền_usd> hoặc /profit <entry> <sell> <vốn>"
    );
  }

  const [buyStr, sellStr, amountStr] = parts;
  const buyPrice = Number(buyStr);
  const sellPrice = Number(sellStr);
  const amountUsd = Number(amountStr);

  if (!isFinite(buyPrice) || isNaN(buyPrice) || buyPrice <= 0) {
    throw new Error("Giá mua phải là số dương hợp lệ.");
  }
  if (!isFinite(sellPrice) || isNaN(sellPrice) || sellPrice <= 0) {
    throw new Error("Giá bán phải là số dương hợp lệ.");
  }
  if (!isFinite(amountUsd) || isNaN(amountUsd) || amountUsd <= 0) {
    throw new Error("Số tiền phải là số dương hợp lệ.");
  }

  return { raw: trimmed, buyPrice, sellPrice, amountUsd };
}

export function calculate(cmd: ParsedCommand): CalcResult {
  const { buyPrice, sellPrice, amountUsd } = cmd;
  const btcBought = amountUsd / buyPrice;
  const totalReceived = btcBought * sellPrice;
  const profitUsd = totalReceived - amountUsd;
  const profitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

  return {
    buyPrice,
    sellPrice,
    amountUsd,
    btcBought,
    totalReceived,
    profitUsd,
    profitPercent,
  };
}
