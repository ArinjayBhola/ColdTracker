"use client";
import type { AppPreferences } from "@/lib/preferences";
import type { ShortcutPreferences } from "@/lib/keyboard-shortcuts";

type AccountState = { preferences: AppPreferences | null; shortcuts: ShortcutPreferences };
// Only share concurrent reads. Never retain account data outside the query cache.
let inFlight: Promise<AccountState> | null = null;
function readAccountState() {
  if (!inFlight) {
    inFlight = fetch("/api/account-state", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Could not load account settings. Please sign in again.");
      return await response.json() as AccountState;
    }).finally(() => { inFlight = null; });
  }
  return inFlight;
}
export async function fetchAccountPreferences() { const state = await readAccountState(); return { preferences: state.preferences }; }
export async function fetchKeyboardShortcuts() { return (await readAccountState()).shortcuts; }
