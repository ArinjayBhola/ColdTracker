"use client";
import { usePreferences } from "@/components/preferences-provider";
import { NAV_ITEMS, DEFAULT_PREFERENCES } from "@/lib/preferences";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NavigationSettings() {
  const { preferences, update, ready } = usePreferences();
  const value = preferences.navigation;
  const order = [...new Set([...value.order, ...NAV_ITEMS.map(item => item.href)])];
  const move = (index: number, direction: number) => {
    const next = [...order];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    update("navigation", { ...value, order: next });
  };
  return <Card><CardHeader><CardTitle>Navigation</CardTitle><CardDescription>Choose your sign-in landing page and reorder or hide sidebar links. Settings always stays accessible; hiding a link does not disable its route or shortcut.</CardDescription></CardHeader><CardContent><fieldset disabled={!ready} className="min-w-0 space-y-6">
    <div className="space-y-2"><label htmlFor="landing-page" className="text-sm">Page after sign-in</label><Select value={value.landing} onValueChange={landing => update("navigation", { ...value, landing: landing as typeof value.landing })}><SelectTrigger id="landing-page"><SelectValue /></SelectTrigger><SelectContent>{NAV_ITEMS.map(item => <SelectItem key={item.href} value={item.href}>{item.label}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-2">{order.map((href, index) => <div key={href} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><label className="flex min-w-0 items-center gap-3 text-sm"><input type="checkbox" checked={!value.hidden.includes(href)} onChange={event => update("navigation", { ...value, hidden: event.target.checked ? value.hidden.filter(item => item !== href) : [...value.hidden, href] })} />{NAV_ITEMS.find(item => item.href === href)?.label}</label><div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" aria-label={`Move ${NAV_ITEMS.find(item => item.href === href)?.label} up`} disabled={index === 0} onClick={() => move(index, -1)}>Up</Button><Button size="sm" variant="outline" aria-label={`Move ${NAV_ITEMS.find(item => item.href === href)?.label} down`} disabled={index === order.length - 1} onClick={() => move(index, 1)}>Down</Button></div></div>)}</div>
    <Button variant="outline" onClick={() => update("navigation", DEFAULT_PREFERENCES.navigation)}>Reset navigation</Button>
  </fieldset></CardContent></Card>;
}
