import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CommandKind } from "@/lib/calc";
import type { ProfitEntry } from "@/components/ProfitPanel";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient = createClient(
  url || "https://placeholder.invalid",
  anonKey || "placeholder"
);

const EMAIL_DOMAIN = "mail.btc-profit-calculator-tau.vercel.app";
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username.trim().toLowerCase());
}

export function toSyntheticEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

export function signUpWithUsername(username: string, password: string) {
  return supabase.auth.signUp({
    email: toSyntheticEmail(username),
    password,
    options: { data: { username: username.trim().toLowerCase() } },
  });
}

export function signInWithUsername(username: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: toSyntheticEmail(username),
    password,
  });
}

export function signOutUser() {
  return supabase.auth.signOut();
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ---- Profit ledger ----

interface ProfitRow {
  id: string;
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

export async function fetchProfitEntries(): Promise<ProfitEntry[]> {
  const { data, error } = await supabase
    .from("profit_entries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ProfitRow[]).map(rowToEntry);
}

export async function insertProfitEntry(userId: string, entry: ProfitEntry): Promise<void> {
  const { error } = await supabase.from("profit_entries").insert({
    id: entry.id,
    user_id: userId,
    entry: entry.entry,
    sell: entry.sell,
    money: entry.money,
    profit_usd: entry.profitUsd,
    profit_percent: entry.profitPercent,
    created_at: new Date(entry.timestamp).toISOString(),
  });
  if (error) throw error;
}

export async function deleteProfitEntry(id: string): Promise<void> {
  const { error } = await supabase.from("profit_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function clearProfitEntries(): Promise<void> {
  const { error } = await supabase.from("profit_entries").delete().neq("id", "");
  if (error) throw error;
}

// ---- Goal / entry price marks ----

export interface PriceMarks {
  goal: number | null;
  entry: number | null;
}

export async function fetchPriceMarks(): Promise<PriceMarks> {
  const { data, error } = await supabase
    .from("user_price_marks")
    .select("goal_price, entry_price")
    .maybeSingle();
  if (error) throw error;
  return {
    goal: data?.goal_price ?? null,
    entry: data?.entry_price ?? null,
  };
}

export async function upsertPriceMarks(userId: string, marks: PriceMarks): Promise<void> {
  const { error } = await supabase.from("user_price_marks").upsert({
    user_id: userId,
    goal_price: marks.goal,
    entry_price: marks.entry,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ---- Unified command history ----

export interface CommandHistoryItem {
  id: string;
  kind: CommandKind;
  command: string;
  profitPercent: number | null;
  profitUsd: number | null;
  timestamp: number;
}

interface CommandHistoryRow {
  id: string;
  kind: string;
  command: string;
  profit_percent: number | null;
  profit_usd: number | null;
  created_at?: string;
}

function rowToHistoryItem(r: CommandHistoryRow): CommandHistoryItem {
  return {
    id: r.id,
    kind: r.kind as CommandKind,
    command: r.command,
    profitPercent: r.profit_percent,
    profitUsd: r.profit_usd,
    timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  };
}

const HISTORY_FETCH_LIMIT = 10;

export async function fetchCommandHistory(): Promise<CommandHistoryItem[]> {
  const { data, error } = await supabase
    .from("command_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(HISTORY_FETCH_LIMIT);
  if (error) throw error;
  return (data as CommandHistoryRow[]).map(rowToHistoryItem);
}

export async function insertCommandHistoryItem(
  userId: string,
  item: CommandHistoryItem
): Promise<void> {
  const { error } = await supabase.from("command_history").insert({
    id: item.id,
    user_id: userId,
    kind: item.kind,
    command: item.command,
    profit_percent: item.profitPercent,
    profit_usd: item.profitUsd,
    created_at: new Date(item.timestamp).toISOString(),
  });
  if (error) throw error;
}
