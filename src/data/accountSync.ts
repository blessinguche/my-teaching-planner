import { supabase } from "../auth/supabase";
import type { AccountPayload } from "./personal";
import { asSafeAccount } from "./personal";

export const PLANNER_ACCOUNT_TABLE = "planner_account";

export const SETUP_SQL = `create table if not exists public.planner_account (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.planner_account enable row level security;

drop policy if exists "planner_account_own" on public.planner_account;
create policy "planner_account_own"
  on public.planner_account
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.planner_account to authenticated;`;

export type SyncStatus = "syncing" | "synced" | "offline" | "setup";

export type CloudFetch =
  | { kind: "ok"; payload: AccountPayload | null }
  | { kind: "missing-table" }
  | { kind: "error"; message: string };

type PlannerRow = {
  user_id: string;
  payload: unknown;
  updated_at: string;
};

function isMissingTable(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}): boolean {
  const blob = [
    error.code,
    error.message,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (blob.includes("planner_account") &&
      (blob.includes("schema cache") ||
        blob.includes("does not exist") ||
        blob.includes("could not find")))
  );
}

export async function fetchAccountCloud(userId: string): Promise<CloudFetch> {
  if (!supabase) {
    return { kind: "error", message: "Supabase is not configured." };
  }
  const { data, error } = await supabase
    .from(PLANNER_ACCOUNT_TABLE)
    .select("payload, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return { kind: "missing-table" };
    return { kind: "error", message: error.message };
  }
  if (!data) return { kind: "ok", payload: null };
  const row = data as Pick<PlannerRow, "payload" | "updated_at">;
  return {
    kind: "ok",
    payload: asSafeAccount(row.payload, row.updated_at),
  };
}

export async function pushAccountCloud(
  userId: string,
  account: AccountPayload,
): Promise<CloudFetch> {
  if (!supabase) {
    return { kind: "error", message: "Supabase is not configured." };
  }
  const { error } = await supabase.from(PLANNER_ACCOUNT_TABLE).upsert(
    {
      user_id: userId,
      payload: account,
      updated_at: account.updatedAt,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    if (isMissingTable(error)) return { kind: "missing-table" };
    return { kind: "error", message: error.message };
  }
  return { kind: "ok", payload: account };
}
