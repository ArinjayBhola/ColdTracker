"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "default" | "blue" | "purple" | "green" | "orange" | "rose" | "teal";
type Density = "comfortable" | "compact";

type AppearanceContextType = {
  colorTheme: Theme;
  density: Density;
  setColorTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
};

const AppearanceContext = createContext<AppearanceContextType>({
  colorTheme: "default",
  density: "comfortable",
  setColorTheme: () => {},
  setDensity: () => {},
});

export function useAppearance() {
  return useContext(AppearanceContext);
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<Theme>("default");
  const [density, setDensityState] = useState<Density>("comfortable");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read from localStorage on mount
    const savedTheme = localStorage.getItem("color-theme") as Theme | null;
    const savedDensity = localStorage.getItem("density") as Density | null;

    if (savedTheme) {
      setColorThemeState(savedTheme);
      applyTheme(savedTheme);
    }
    if (savedDensity) {
      setDensityState(savedDensity);
      applyDensity(savedDensity);
    }
    setMounted(true);
  }, []);

  const applyTheme = (theme: Theme) => {
    const html = document.documentElement;
    if (theme === "default") {
      html.removeAttribute("data-theme");
    } else {
      html.setAttribute("data-theme", theme);
    }
  };

  const applyDensity = (d: Density) => {
    const html = document.documentElement;
    if (d === "comfortable") {
      html.removeAttribute("data-density");
    } else {
      html.setAttribute("data-density", d);
    }
  };

  const setColorTheme = (theme: Theme) => {
    setColorThemeState(theme);
    localStorage.setItem("color-theme", theme);
    applyTheme(theme);
  };

  const setDensity = (d: Density) => {
    setDensityState(d);
    localStorage.setItem("density", d);
    applyDensity(d);
  };

  // Prevent flash by not rendering children until mounted
  // (the inline script in layout handles the initial state)
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AppearanceContext.Provider value={{ colorTheme, density, setColorTheme, setDensity }}>
      {children}
    </AppearanceContext.Provider>
  );
}
