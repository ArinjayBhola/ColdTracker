"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { APPEARANCE_KEY, DEFAULT_APPEARANCE, applyAppearance, parseAppearance, type AppearancePreferences } from "@/lib/appearance";

type Theme = "default" | "blue" | "purple" | "green" | "orange" | "rose" | "teal";
type Density = "comfortable" | "compact";

type AppearanceContextType = {
  colorTheme: Theme;
  density: Density;
  setColorTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  preferences: AppearancePreferences;
  updateAppearance: (value: Partial<AppearancePreferences>) => void;
  resetAppearance: () => void;
};

const AppearanceContext = createContext<AppearanceContextType>({
  colorTheme: "default",
  density: "comfortable",
  setColorTheme: () => {},
  setDensity: () => {},
  preferences: DEFAULT_APPEARANCE,
  updateAppearance: () => {},
  resetAppearance: () => {},
});

export function useAppearance() {
  return useContext(AppearanceContext);
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const preferences = parseAppearance(raw);
  useEffect(() => { applyAppearance(parseAppearance(raw)); }, [raw]);

  const updateAppearance = (value: Partial<AppearancePreferences>) => {
    const next = parseAppearance(JSON.stringify({ ...parseAppearance(snapshot()), ...value }));
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
      localStorage.setItem("density", next.density);
      localStorage.setItem("color-theme", next.colorTheme);
    } catch { /* Changes can still apply for this page when storage is unavailable. */ }
    applyAppearance(next);
    window.dispatchEvent(new Event("coldtrack-appearance-changed"));
  };

  return (
    <AppearanceContext.Provider value={{ colorTheme: preferences.colorTheme, density: preferences.density, setColorTheme: colorTheme => updateAppearance({ colorTheme }), setDensity: density => updateAppearance({ density }), preferences, updateAppearance, resetAppearance: () => updateAppearance(DEFAULT_APPEARANCE) }}>
      {children}
    </AppearanceContext.Provider>
  );
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("coldtrack-appearance-changed", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("coldtrack-appearance-changed", callback); };
}

function snapshot() {
  try {
    return localStorage.getItem(APPEARANCE_KEY) || JSON.stringify({ ...DEFAULT_APPEARANCE, density: localStorage.getItem("density") || "comfortable", colorTheme: localStorage.getItem("color-theme") || "default", fontSize: localStorage.getItem("density") === "compact" ? 14 : 16 });
  } catch { return null; }
}
