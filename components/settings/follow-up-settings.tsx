"use client";
import { usePreferences } from "@/components/preferences-provider";
import { DEFAULT_PREFERENCES } from "@/lib/preferences";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function FollowUpSettings() {
  const { preferences, ready, update, saving, error } = usePreferences();
  const value = preferences.followUp;
  return <Card><CardHeader><CardTitle>Follow-up rules</CardTitle><CardDescription>Set the defaults for newly scheduled follow-ups. Existing due dates and dates you choose manually stay unchanged.</CardDescription></CardHeader><CardContent><fieldset disabled={!ready} className="min-w-0 space-y-5">
    {(["firstDelay", "secondDelay"] as const).map(key => <div key={key} className="space-y-2"><label htmlFor={`rule-${key}`} className="text-sm">{key === "firstDelay" ? "First follow-up: days after the initial message" : "Second follow-up: days after sending the first follow-up"}</label><Input key={`${key}-${value[key]}`} id={`rule-${key}`} type="number" min={1} max={90} step={1} defaultValue={value[key]} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} onBlur={event => { const delay = Number(event.target.value); if (event.target.value && Number.isInteger(delay) && delay >= 1 && delay <= 90) update("followUp", { ...value, [key]: delay }); else event.target.value = String(value[key]); }} /><p className="text-xs text-muted-foreground">1-90 calendar days, calculated in your device timezone.</p></div>)}
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={value.skipWeekends} onChange={event => update("followUp", { ...value, skipWeekends: event.target.checked })} /><span>Move automatically scheduled Saturday and Sunday due dates to Monday.</span></label>
    <p role="status" className="text-xs text-muted-foreground">{error ? "Could not save. Check Account sync in Data." : saving ? "Saving..." : "These defaults also apply when promoting extension leads or adding contacts."}</p><Button variant="outline" onClick={() => update("followUp", DEFAULT_PREFERENCES.followUp)}>Reset follow-up rules</Button>
  </fieldset></CardContent></Card>;
}
