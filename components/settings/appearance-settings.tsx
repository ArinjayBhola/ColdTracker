"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/components/appearance-provider";
import { useTheme } from "next-themes";
import { FiSun, FiMoon } from "react-icons/fi";
import { FONT_OPTIONS, type FontId } from "@/lib/appearance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DENSITY_OPTIONS = [
  { id: "comfortable" as const, label: "Comfortable" },
  { id: "compact" as const, label: "Compact" },
];

export function AppearanceSettings() {
  const { density, setDensity, preferences, updateAppearance, resetAppearance } = useAppearance();
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the look and feel of ColdTrack. Changes apply immediately and are saved in this browser.
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
            <Button variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setTheme("system")}>System</Button>
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
        <div className="grid gap-5 sm:grid-cols-2">
          {([{ key: "bodyFont", label: "Body font" }, { key: "headingFont", label: "Heading font" }] as const).map(({ key, label }) => <div key={key} className="space-y-2">
            <Label htmlFor={`appearance-${key}`}>{label}</Label>
            <Select value={preferences[key]} onValueChange={value => updateAppearance({ [key]: value as FontId })}>
              <SelectTrigger id={`appearance-${key}`}><SelectValue /></SelectTrigger>
              <SelectContent>{FONT_OPTIONS.map(font => <SelectItem key={font.id} value={font.id}><span style={{ fontFamily: font.family }}>{font.label}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>)}
        </div>
        <div className="space-y-3">
          <Label htmlFor="appearance-font-size">Base text size</Label>
          <div className="flex flex-wrap items-center gap-3">
            <input aria-label="Adjust base text size" type="range" min={12} max={24} step={0.5} value={preferences.fontSize} onChange={event => updateAppearance({ fontSize: Number(event.target.value) })} className="min-w-36 flex-1 accent-primary" />
            <Input key={preferences.fontSize} id="appearance-font-size" type="number" defaultValue={preferences.fontSize} min={12} max={24} step="any" className="w-24" onBlur={event => {
              const size = Number(event.target.value);
              if (event.target.value && Number.isFinite(size) && size >= 12 && size <= 24) updateAppearance({ fontSize: size });
              else event.target.value = String(preferences.fontSize);
            }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />
            <span className="text-sm text-muted-foreground">px</span>
          </div>
          <p className="text-xs text-muted-foreground">Choose any size from 12–24 px. Type a custom value and press Enter or leave the field to apply it.</p>
          <div className="flex flex-wrap gap-2">{[14, 16, 18, 20].map(size => <Button key={size} size="sm" variant={preferences.fontSize === size ? "default" : "outline"} onClick={() => updateAppearance({ fontSize: size })}>{size} px</Button>)}</div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={preferences.reducedMotion} onChange={event => updateAppearance({ reducedMotion: event.target.checked })} />Reduce animations and transitions</label>
        <div className="space-y-2 rounded-xl border bg-muted/20 p-4" aria-label="Typography preview">
          <h3 className="font-display text-xl">Make ColdTrack feel like yours</h3>
          <p className="text-base">Preview your fonts and text size. Your outreach, notes, and templates stay easy to read.</p>
          <p className="text-sm text-muted-foreground">Body: {FONT_OPTIONS.find(font => font.id === preferences.bodyFont)?.label} · Headings: {FONT_OPTIONS.find(font => font.id === preferences.headingFont)?.label} · {preferences.fontSize} px</p>
        </div>
        <Button variant="outline" onClick={() => { resetAppearance(); setTheme("light"); }}>Reset appearance</Button>
      </CardContent>
    </Card>
  );
}
