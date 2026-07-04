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

export type CommandKind =
  | "cal"
  | "profit"
  | "goal"
  | "cleargoal"
  | "entry"
  | "clearentry";

export function getCommandKind(input: string): CommandKind {
  const trimmed = input.trim();
  if (/^\/?cleargoal\b/i.test(trimmed)) return "cleargoal";
  if (/^\/?goal\b/i.test(trimmed)) return "goal";
  if (/^\/?clearentry\b/i.test(trimmed)) return "clearentry";
  if (/^\/?entry\b/i.test(trimmed)) return "entry";
  if (/^\/?profit\b/i.test(trimmed)) return "profit";
  return "cal";
}

/** Parse a single positive price argument for /goal or /entry. */
export function parsePriceArg(input: string, cmd: "goal" | "entry"): number {
  const prefix = cmd === "goal" ? /^\/?goal\s+/i : /^\/?entry\s+/i;
  const point = Number(input.trim().replace(prefix, "").trim());

  if (!isFinite(point) || isNaN(point) || point <= 0) {
    const usage = cmd === "goal" ? "/goal <price>" : "/entry <price>";
    throw new Error(`Invalid syntax. Use: ${usage}`);
  }

  return point;
}

export function parseGoalCommand(input: string): number {
  return parsePriceArg(input, "goal");
}

export function parseEntryCommand(input: string): number {
  return parsePriceArg(input, "entry");
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  const withoutPrefix = trimmed.replace(/^\/?(cal|profit)\s+/i, "");
  const parts = withoutPrefix.split(/\s+/).filter(Boolean);

  if (parts.length !== 3) {
    throw new Error(
      "Invalid syntax. Use: /cal <buy_price> <sell_price> <amount_usd> or /profit <entry> <sell> <money>"
    );
  }

  const [buyStr, sellStr, amountStr] = parts;
  const buyPrice = Number(buyStr);
  const sellPrice = Number(sellStr);
  const amountUsd = Number(amountStr);

  if (!isFinite(buyPrice) || isNaN(buyPrice) || buyPrice <= 0) {
    throw new Error("Buy price must be a valid positive number.");
  }
  if (!isFinite(sellPrice) || isNaN(sellPrice) || sellPrice <= 0) {
    throw new Error("Sell price must be a valid positive number.");
  }
  if (!isFinite(amountUsd) || isNaN(amountUsd) || amountUsd <= 0) {
    throw new Error("Amount must be a valid positive number.");
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
