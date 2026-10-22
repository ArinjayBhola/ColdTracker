"use client";
import { createContext, useContext, useEffect, useRef, useCallback } from "react";
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
  const mutation = useMutation({ mutationKey: key, scope: { id: "account-preferences" }, mutationFn: saveAccountPreferences,
    onSuccess: (_data, patch) => { channel.current?.postMessage("updated"); if (patch && typeof patch === "object" && "table" in patch) router.refresh(); },
    onSettled: () => { if (client.isMutating({ mutationKey: key }) === 1) void client.invalidateQueries({ queryKey: key }); },
  });
  const query = useQuery({ queryKey: key, queryFn: getAccountPreferences, enabled: enabled && !mutation.isPending, refetchOnWindowFocus: true, refetchOnMount: true, refetchInterval: 60_000 });
  const preferences = query.data?.preferences ?? DEFAULT_PREFERENCES;
  const ready = !!query.data?.preferences;
  const mutate = mutation.mutate;
  const update: Context["update"] = useCallback((section, value) => {
    if (!ready) return;
    const current = client.getQueryData<{ preferences: AppPreferences }>(key)?.preferences ?? DEFAULT_PREFERENCES;
    client.setQueryData(key, { preferences: { ...current, [section]: value } });
    mutate({ [section]: value });
  }, [ready, client, mutate]);
  useEffect(() => {
    if (!enabled || !query.data || mutation.isPending) return;
    if (!query.data.preferences) {
      const seed = { ...DEFAULT_PREFERENCES, appearance: parseAppearance(localStorage.getItem(APPEARANCE_KEY)), mode: (["light", "dark", "system"].includes(localStorage.getItem("theme") || "") ? localStorage.getItem("theme") : "light") as AppPreferences["mode"] };
      client.setQueryData(key, { preferences: seed });
      mutation.mutate(seed);
      return;
    }
    const appearance = query.data.preferences.appearance;
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
    applyAppearance(appearance);
    window.dispatchEvent(new Event("coldtrack-appearance-changed"));
    setTheme(query.data.preferences.mode);
  // Applying remote preferences must not depend on mutation callbacks' identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, enabled, mutation.isPending, setTheme]);
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
  return <PreferencesContext.Provider value={{ preferences, ready, saving: mutation.isPending, error: query.isError || mutation.isError, update, reload: () => { void client.invalidateQueries({ queryKey: key }); } }}>{children}</PreferencesContext.Provider>;
}
