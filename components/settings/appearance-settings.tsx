"use client";

import { PALETTES } from "@/lib/palettes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/components/preferences-provider";
import { useAppearance } from "@/components/appearance-provider";
import { useTheme } from "next-themes";
import { FiSun, FiMoon } from "react-icons/fi";
import { FONT_OPTIONS, FONT_WEIGHTS, availableFontWeights, type FontId } from "@/lib/appearance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AppearanceSettings() {
  const { preferences, updateAppearance, resetAppearance } = useAppearance();
  const { theme, setTheme } = useTheme();
  const { ready, update } = usePreferences();
  const changeMode = (mode: "light" | "dark" | "system") => { setTheme(mode); update("mode", mode); };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the look and feel of ColdTrack. Changes apply immediately and sync to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!ready && <p role="status" className="text-sm text-muted-foreground">Loading account preferences...</p>}
        <fieldset disabled={!ready} className="min-w-0 space-y-6">
        <div className="space-y-3"><Label>Theme palette</Label><div role="group" aria-label="Theme palette" className="flex flex-wrap gap-2">{PALETTES.map(palette => <Button key={palette.id} type="button" variant={preferences.colorTheme === palette.id ? "default" : "outline"} aria-pressed={preferences.colorTheme === palette.id} onClick={() => updateAppearance({ colorTheme: palette.id })}><span className="h-3 w-3 shrink-0 rounded-full border border-current" style={{ backgroundColor: `oklch(0.55 0.12 ${palette.hue})` }} />{palette.label}</Button>)}</div><p className="text-xs text-muted-foreground">Every palette supports light, dark, and system mode.</p></div>
        {/* Dark Mode */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Mode
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => changeMode("system")}>System</Button>
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => changeMode("light")}
            >
              <FiSun className="mr-1.5" />
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => changeMode("dark")}
            >
              <FiMoon className="mr-1.5" />
              Dark
            </Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-5">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="appearance-font">App font</Label>
            <Select value={preferences.font} onValueChange={value => updateAppearance({ font: value as FontId })}>
              <SelectTrigger id="appearance-font"><SelectValue /></SelectTrigger>
              <SelectContent>{FONT_OPTIONS.map(font => <SelectItem key={font.id} value={font.id}><span style={{ fontFamily: font.family }}>{font.label}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="appearance-weight">Font weight</Label>
            <Select value={String(preferences.fontWeight)} onValueChange={value => updateAppearance({ fontWeight: Number(value) })}>
              <SelectTrigger id="appearance-weight"><SelectValue /></SelectTrigger>
              <SelectContent>{FONT_WEIGHTS.map(weight => <SelectItem key={weight.value} value={String(weight.value)} disabled={!availableFontWeights(preferences.font).includes(weight.value)}>{weight.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">One font and weight for the whole app. Unavailable weights are disabled for the selected font.</p>
          </div>
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
          <p className="text-xs text-muted-foreground">Choose any size from 12–24 px. Text wraps and controls adapt without widening the sidebar or page. Press Enter or leave the field to apply a custom value.</p>
          <div className="flex flex-wrap gap-2">{[14, 16, 18, 20].map(size => <Button key={size} size="sm" variant={preferences.fontSize === size ? "default" : "outline"} onClick={() => updateAppearance({ fontSize: size })}>{size} px</Button>)}</div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={preferences.reducedMotion} onChange={event => updateAppearance({ reducedMotion: event.target.checked })} />Reduce animations and transitions</label>
        <div className="space-y-2 rounded-xl border bg-muted/20 p-4" aria-label="Typography preview">
          <h3 className="font-display text-xl">Make ColdTrack feel like yours</h3>
          <p className="text-base">Preview your fonts and text size. Your outreach, notes, and templates stay easy to read.</p>
          <p className="text-sm text-muted-foreground">{FONT_OPTIONS.find(font => font.id === preferences.font)?.label} · {FONT_WEIGHTS.find(weight => weight.value === preferences.fontWeight)?.label} · {preferences.fontSize} px</p>
        </div>
        <Button variant="outline" onClick={() => { resetAppearance(); changeMode("light"); }}>Reset appearance</Button>
      </fieldset>
      </CardContent>
    </Card>
  );
}
