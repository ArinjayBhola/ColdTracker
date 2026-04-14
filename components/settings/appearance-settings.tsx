"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/components/appearance-provider";
import { useTheme } from "next-themes";
import { FiSun, FiMoon } from "react-icons/fi";
import { cn } from "@/lib/utils";

const COLOR_THEMES = [
  { id: "default" as const, label: "Terracotta", color: "oklch(0.60 0.12 45)" },
  { id: "blue" as const, label: "Blue", color: "oklch(0.55 0.15 250)" },
  { id: "purple" as const, label: "Purple", color: "oklch(0.55 0.15 300)" },
  { id: "green" as const, label: "Green", color: "oklch(0.55 0.14 145)" },
  { id: "rose" as const, label: "Rose", color: "oklch(0.55 0.15 10)" },
  { id: "teal" as const, label: "Teal", color: "oklch(0.55 0.12 185)" },
];

const DENSITY_OPTIONS = [
  { id: "comfortable" as const, label: "Comfortable" },
  { id: "compact" as const, label: "Compact" },
];

export function AppearanceSettings() {
  const { colorTheme, density, setColorTheme, setDensity } = useAppearance();
  const { theme, setTheme } = useTheme();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-premium">
      <CardHeader>
        <CardTitle className="text-xl font-extrabold">Appearance</CardTitle>
        <CardDescription>
          Customize the look and feel of ColdTrack.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Theme */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Color Theme
          </label>
          <div className="flex flex-wrap gap-3">
            {COLOR_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setColorTheme(t.id)}
                className={cn(
                  "w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center",
                  colorTheme === t.id
                    ? "border-foreground scale-110 shadow-lg"
                    : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: t.color }}
                title={t.label}
              >
                {colorTheme === t.id && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Density
          </label>
          <div className="flex gap-2">
            {DENSITY_OPTIONS.map((d) => (
              <Button
                key={d.id}
                variant={density === d.id ? "default" : "outline"}
                size="sm"
                onClick={() => setDensity(d.id)}
              >
                {d.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Dark Mode */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Mode
          </label>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
            >
              <FiSun className="mr-1.5" />
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
            >
              <FiMoon className="mr-1.5" />
              Dark
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
