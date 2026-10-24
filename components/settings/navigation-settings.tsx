"use client";
import { usePreferences } from "@/components/preferences-provider";
import { NAV_ITEMS, NAV_GROUPS, DEFAULT_PREFERENCES } from "@/lib/preferences";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NavigationSettings() {
  const { preferences, update, ready } = usePreferences();
  const value = preferences.navigation;
  const order = [...new Set([...value.order, ...NAV_ITEMS.map(item => item.href)])];
  const label = (href: typeof order[number]) => NAV_ITEMS.find(item => item.href === href)?.label;
  const toggle = (href: typeof order[number], checked: boolean) => update("navigation", { ...value, hidden: checked ? value.hidden.filter(item => item !== href) : [...value.hidden, href] });
  function move(href: typeof order[number], other: typeof order[number]) {
    const next = [...order]; const index = next.indexOf(href); const destination = next.indexOf(other);
    [next[index], next[destination]] = [next[destination], next[index]];
    update("navigation", { ...value, order: next });
  }
  return <Card><CardHeader><CardTitle>Navigation</CardTitle><CardDescription>Reorder links within the same groups shown in your sidebar. New outreach stays above the groups. Hidden pages remain accessible by URL or shortcut.</CardDescription></CardHeader><CardContent><fieldset disabled={!ready} className="min-w-0 space-y-6">
    <div className="space-y-2"><label htmlFor="landing-page" className="text-sm">Page after sign-in</label><Select value={value.landing} onValueChange={landing => update("navigation", { ...value, landing: landing as typeof value.landing })}><SelectTrigger id="landing-page"><SelectValue /></SelectTrigger><SelectContent>{NAV_ITEMS.map(item => <SelectItem key={item.href} value={item.href}>{item.label}</SelectItem>)}</SelectContent></Select></div>
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3"><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={!value.hidden.includes("/outreach/new")} onChange={event => toggle("/outreach/new", event.target.checked)} />New outreach</label><span className="text-xs text-muted-foreground">Top action</span></div>
    {NAV_GROUPS.map(group => {
      const links = order.filter(href => group.paths.includes(href));
      return <section key={group.label} className="space-y-2"><h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">{group.label}</h3>{links.map((href, index) => <div key={href} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
        <label className="flex min-w-0 items-center gap-3 text-sm"><input type="checkbox" checked={!value.hidden.includes(href)} onChange={event => toggle(href, event.target.checked)} />{label(href)}</label>
        <div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" aria-label={`Move ${label(href)} up`} disabled={index === 0} onClick={() => move(href, links[index - 1])}>Up</Button><Button size="sm" variant="outline" aria-label={`Move ${label(href)} down`} disabled={index === links.length - 1} onClick={() => move(href, links[index + 1])}>Down</Button></div>
      </div>)}</section>;
    })}
    <Button variant="outline" onClick={() => update("navigation", DEFAULT_PREFERENCES.navigation)}>Reset navigation</Button>
  </fieldset></CardContent></Card>;
}
