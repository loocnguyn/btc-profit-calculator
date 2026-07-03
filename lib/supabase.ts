import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ProfitEntry } from "@/components/ProfitPanel";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, anonKey as string)
  : null;

const USER_CODE_KEY = "btc-user-code";

/** Random per-browser code that soft-partitions rows (no login). */
export function getUserCode(): string {
  if (typeof window === "undefined") return "server";
  try {
    let code = window.localStorage.getItem(USER_CODE_KEY);
    if (!code) {
      code =
        (crypto.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      window.localStorage.setItem(USER_CODE_KEY, code);
    }
    return code;
  } catch {
    return "anon";
  }
}

interface ProfitRow {
  id: string;
  user_code: string;
  entry: number;
  sell: number;
  money: number;
  profit_usd: number;
  profit_percent: number;
  created_at?: string;
}

function rowToEntry(r: ProfitRow): ProfitEntry {
  return {
    id: r.id,
    entry: r.entry,
    sell: r.sell,
    money: r.money,
    profitUsd: r.profit_usd,
    profitPercent: r.profit_percent,
    timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  };
}

function entryToRow(e: ProfitEntry, userCode: string): ProfitRow {
  return {
    id: e.id,
    user_code: userCode,
    entry: e.entry,
    sell: e.sell,
    money: e.money,
    profit_usd: e.profitUsd,
    profit_percent: e.profitPercent,
    created_at: new Date(e.timestamp).toISOString(),
  };
}

/** Fetch this user's profit entries, newest first. Returns null on failure. */
export async function fetchProfitEntries(): Promise<ProfitEntry[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("profit_entries")
      .select("*")
      .eq("user_code", getUserCode())
      .order("created_at", { ascending: false });
    if (error || !data) return null;
    return (data as ProfitRow[]).map(rowToEntry);
  } catch {
    return null;
  }
}

export async function insertProfitEntry(entry: ProfitEntry): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("profit_entries").insert(entryToRow(entry, getUserCode()));
  } catch {
    // best-effort; localStorage remains the source of truth on failure
  }
}

export async function deleteProfitEntry(id: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from("profit_entries")
      .delete()
      .eq("user_code", getUserCode())
      .eq("id", id);
  } catch {
    // best-effort
  }
}

export async function clearProfitEntries(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from("profit_entries")
      .delete()
      .eq("user_code", getUserCode());
  } catch {
    // best-effort
  }
}
