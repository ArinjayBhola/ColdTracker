"use client";
import { usePreferences } from "@/components/preferences-provider";
import { DEFAULT_PREFERENCES, STATS_WIDGETS } from "@/lib/preferences";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
const labels = { metrics: "Summary metrics", comparison: "Sent-to-response chart", heatmap: "Activity heatmap", funnel: "Conversion funnel", pipeline: "Current pipeline", channels: "Performance by channel", pending: "Pending follow-ups summary" };
export function StatsSettings() {
  const { preferences, update, ready, saving, error } = usePreferences();
  const value = preferences.stats;
  return <Card><CardHeader><CardTitle>Statistics preferences</CardTitle><CardDescription>Choose which charts appear on Stats and the date range it opens with. The heatmap has its own year selection.</CardDescription></CardHeader><CardContent><fieldset disabled={!ready} className="min-w-0 space-y-5">
    <div className="space-y-2"><label htmlFor="stats-range">Default date range</label><Select value={value.range} onValueChange={range => update("stats", { ...value, range: range as typeof value.range })}><SelectTrigger id="stats-range"><SelectValue /></SelectTrigger><SelectContent>{["7", "30", "90", "all"].map(range => <SelectItem key={range} value={range}>{range === "all" ? "All time" : `Last ${range} days`}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-2"><label htmlFor="stats-week">Heatmap week starts on</label><Select value={String(value.weekStartsOn)} onValueChange={day => update("stats", { ...value, weekStartsOn: Number(day) as 0 | 1 })}><SelectTrigger id="stats-week"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Monday</SelectItem><SelectItem value="0">Sunday</SelectItem></SelectContent></Select></div>
    <div className="grid gap-3 sm:grid-cols-2">{STATS_WIDGETS.map(widget => <label key={widget} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={value.widgets.includes(widget)} disabled={value.widgets.length === 1 && value.widgets.includes(widget)} onChange={event => update("stats", { ...value, widgets: event.target.checked ? [...value.widgets, widget] : value.widgets.filter(item => item !== widget) })} />{labels[widget]}</label>)}</div>
    <p role="status" className="text-xs text-muted-foreground">{error ? "Could not save. Check Account sync in Data." : saving ? "Saving..." : "At least one widget must stay visible. Changes sync to your account."}</p><Button variant="outline" onClick={() => update("stats", DEFAULT_PREFERENCES.stats)}>Reset statistics preferences</Button>
  </fieldset></CardContent></Card>;
}
