"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/components/appearance-provider";
import { useTheme } from "next-themes";
import { FiSun, FiMoon } from "react-icons/fi";

const DENSITY_OPTIONS = [
  { id: "comfortable" as const, label: "Comfortable" },
  { id: "compact" as const, label: "Compact" },
];

export function AppearanceSettings() {
  const { density, setDensity } = useAppearance();
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the look and feel of ColdTrack.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
