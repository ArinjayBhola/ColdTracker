"use client";
import { createContext, useContext, useEffect, useRef, useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { getAccountPreferences, saveAccountPreferences } from "@/actions/preferences";
import { DEFAULT_PREFERENCES, type AppPreferences } from "@/lib/preferences";
import { APPEARANCE_KEY, applyAppearance, parseAppearance } from "@/lib/appearance";

type Context = { preferences: AppPreferences; ready: boolean; saving: boolean; error: boolean; update: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void; reload: () => void };
const PreferencesContext = createContext<Context>({ preferences: DEFAULT_PREFERENCES, ready: false, saving: false, error: false, update: () => {}, reload: () => {} });
export const usePreferences = () => useContext(PreferencesContext);
const key = ["account-preferences"];
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const enabled = !["/", "/signin", "/signup"].includes(pathname);
  const client = useQueryClient();
  const { setTheme } = useTheme();
  const channel = useRef<BroadcastChannel | null>(null);
  const tableSignature = useRef("");
  const [failedPatch, setFailedPatch] = useState<Partial<AppPreferences>>({});
  const mutation = useMutation({ mutationKey: key, scope: { id: "account-preferences" }, mutationFn: saveAccountPreferences,
    onSuccess: (_data, patch) => {
      setFailedPatch(previous => Object.fromEntries(Object.entries(previous).filter(([section]) => !(patch && typeof patch === "object" && section in patch))));
      channel.current?.postMessage("updated");
      if (patch && typeof patch === "object" && "table" in patch) router.refresh();
    },
    onError: (_error, patch) => { if (patch && typeof patch === "object") setFailedPatch(previous => ({ ...previous, ...patch })); },
    onSettled: () => { if (client.isMutating({ mutationKey: key }) === 1) void client.invalidateQueries({ queryKey: key }); },
  });
  useEffect(() => {
    if (!enabled) { client.removeQueries({ queryKey: key }); setFailedPatch({}); }
  }, [enabled, client]);
  const query = useQuery({ queryKey: key, queryFn: getAccountPreferences, enabled: enabled && !mutation.isPending, refetchOnWindowFocus: true, refetchOnMount: true, refetchInterval: 60_000 });
  const preferences = query.data?.preferences ?? DEFAULT_PREFERENCES;
  const ready = !!query.data?.preferences;
  const mutate = mutation.mutate;
  const update: Context["update"] = useCallback((section, value) => {
    if (!ready) return;
    const current = client.getQueryData<{ preferences: AppPreferences }>(key)?.preferences ?? DEFAULT_PREFERENCES;
    const patch: Partial<AppPreferences> = { [section]: value };
    // Preserve immediate font/palette edits if another setting is changed before their debounce ends.
    const localAppearance = parseAppearance(localStorage.getItem(APPEARANCE_KEY));
    if (section !== "appearance" && JSON.stringify(localAppearance) !== JSON.stringify(current.appearance)) patch.appearance = localAppearance;
    client.setQueryData(key, { preferences: { ...current, ...patch } });
    mutate(patch);
  }, [ready, client, mutate]);
  useEffect(() => {
    if (!enabled || !query.data || mutation.isPending) return;
    if (!query.data.preferences) {
      if (Object.keys(failedPatch).length) return;
      const seed = { ...DEFAULT_PREFERENCES, appearance: parseAppearance(localStorage.getItem(APPEARANCE_KEY)), mode: (["light", "dark", "system"].includes(localStorage.getItem("theme") || "") ? localStorage.getItem("theme") : "light") as AppPreferences["mode"] };
      client.setQueryData(key, { preferences: seed });
      mutation.mutate(seed);
      return;
    }
    const appearance = query.data.preferences.appearance;
    const signature = JSON.stringify(query.data.preferences.table);
    if (tableSignature.current && signature !== tableSignature.current && pathname === "/dashboard") router.refresh();
    tableSignature.current = signature;
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
    applyAppearance(appearance);
    window.dispatchEvent(new Event("coldtrack-appearance-changed"));
    setTheme(query.data.preferences.mode);
  // Applying remote preferences must not depend on mutation callbacks' identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, enabled, mutation.isPending, setTheme, pathname, router, failedPatch]);
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout>;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const appearance = parseAppearance(localStorage.getItem(APPEARANCE_KEY));
        if (JSON.stringify(appearance) !== JSON.stringify(client.getQueryData<{ preferences: AppPreferences }>(key)?.preferences.appearance)) update("appearance", appearance);
      }, 500);
    };
    window.addEventListener("coldtrack-appearance-changed", save);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("coldtrack-preferences");
      channel.current.onmessage = () => { if (!client.isMutating({ mutationKey: key })) void client.invalidateQueries({ queryKey: key }); };
    }
    return () => { clearTimeout(timer); window.removeEventListener("coldtrack-appearance-changed", save); channel.current?.close(); channel.current = null; };
  }, [ready, client, update]);
  return <PreferencesContext.Provider value={{ preferences, ready, saving: mutation.isPending, error: query.isError || Object.keys(failedPatch).length > 0, update, reload: () => { if (Object.keys(failedPatch).length) mutate(failedPatch); else void client.invalidateQueries({ queryKey: key }); } }}>{children}</PreferencesContext.Provider>;
}
