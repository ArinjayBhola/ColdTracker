"use client";

import { usePreferences } from "@/components/preferences-provider";
import { useMemo, useState } from "react";
import { buildActivityHeatmap } from "@/lib/outreach-heatmap";
import { calendarKey } from "@/lib/user-calendar";
import type { AnalyticsRecord } from "@/lib/outreach-analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const shades = ["bg-muted", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"];
const label = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function ActivityHeatmap({ records, asOf }: { records: AnalyticsRecord[]; asOf: string }) {
  const { preferences } = usePreferences();
  const weekStartsOn = preferences.stats.weekStartsOn;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentYear = Number(calendarKey(asOf, timeZone).slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [selected, setSelected] = useState<string | null>(null);
  const data = useMemo(() => buildActivityHeatmap(records, year, asOf, timeZone, weekStartsOn), [records, year, asOf, timeZone, weekStartsOn]);
  const years = useMemo(() => [...new Set([currentYear, ...records.filter(record => record.status !== "DRAFT" && Number.isFinite(Date.parse(record.sentAt)) && Date.parse(record.sentAt) <= Date.parse(asOf)).map(record => Number(calendarKey(record.sentAt, timeZone).slice(0, 4)))])].sort((a, b) => b - a), [currentYear, records, asOf, timeZone]);
  const day = data.days.find(day => day.key === selected && day.available);
  const todayKey = calendarKey(asOf, timeZone);
  const defaultDay = data.days.find(day => day.key === todayKey && day.available) ?? data.days.findLast(day => day.available);
  const inspected = day ?? defaultDay;
  const cellSize = 14, gap = 4, columnWidth = cellSize + gap;
  const width = data.weeks.length * columnWidth;

  return <Card>
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2"><CardTitle>Activity heatmap</CardTitle><CardDescription>Your outreach consistency, one day at a time. Uses your device timezone and its own year selection.</CardDescription></div>
        <Select value={String(year)} onValueChange={value => { setYear(Number(value)); setSelected(null); }}><SelectTrigger className="w-auto min-w-[6em]" aria-label="Activity heatmap year"><SelectValue /></SelectTrigger><SelectContent>{years.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><span><strong className="tabular-nums">{data.total.toLocaleString()}</strong> outreach sent</span><span><strong>{data.activeDays}</strong> active days</span><span>Busiest day: <strong>{data.busiest ? `${label(data.busiest[0])} (${data.busiest[1]})` : "No activity yet"}</strong></span></div>
    </CardHeader>
    <CardContent className="min-w-0 space-y-4">
      <div className="max-w-full overflow-x-auto pb-2" role="region" aria-label="Scrollable yearly outreach activity calendar" tabIndex={0}>
        <div className="flex gap-3" style={{ minWidth: width + 48 }}>
          <div className="grid shrink-0 pt-7 text-[11px] leading-none text-muted-foreground" style={{ gridTemplateRows: `repeat(7, ${cellSize}px)`, rowGap: gap }} aria-hidden="true">{(weekStartsOn === 1 ? ["Mon", "", "Wed", "", "Fri", "", "Sun"] : ["Sun", "", "Tue", "", "Thu", "", "Sat"]).map((name, index) => <span key={index}>{name}</span>)}</div>
          <div className="shrink-0" style={{ width }}>
            <div className="relative h-7 text-[11px] text-muted-foreground" aria-hidden="true">{data.weeks.map((week, index) => {
              const monthStart = week.find(day => day.inYear && day.key.endsWith("-01"));
              if (!monthStart) return null;
              return <span key={monthStart.key} className="absolute whitespace-nowrap" style={{ left: index * columnWidth }}>{new Date(`${monthStart.key}T12:00:00Z`).toLocaleDateString("en", { month: "short", timeZone: "UTC" })}</span>;
            })}</div>
            <div className="grid grid-flow-col" style={{ gridTemplateRows: `repeat(7, ${cellSize}px)`, gridAutoColumns: cellSize, gap }}>
              {data.days.map((day, index) => {
                if (!day.available) return <span key={day.key} aria-hidden="true" className={cn("rounded-[3px]", day.inYear && "border border-dashed border-border/60")} />;
                const level = day.count ? Math.max(1, Math.ceil(day.count / Math.max(1, data.max) * 4)) : 0;
                const description = `${label(day.key)}: ${day.count} outreach sent`;
                return <button key={day.key} type="button" tabIndex={inspected?.key === day.key ? 0 : -1} data-activity-day={day.key} aria-label={description} aria-pressed={inspected?.key === day.key} title={description} onClick={() => setSelected(day.key)} onMouseEnter={() => setSelected(day.key)} onFocus={() => setSelected(day.key)} onKeyDown={event => {
                  const offset = { ArrowRight: 7, ArrowLeft: -7, ArrowUp: -1, ArrowDown: 1 }[event.key];
                  if (!offset) return;
                  event.preventDefault();
                  const next = data.days[index + offset];
                  if (next?.available) event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-activity-day="${next.key}"]`)?.focus();
                }} className={cn("h-[14px] w-[14px] rounded-[3px] border border-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", shades[level], inspected?.key === day.key && "ring-1 ring-foreground ring-offset-1 ring-offset-background")} />;
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <p aria-live="polite" className="text-muted-foreground">{inspected ? `${label(inspected.key)}: ${inspected.count} outreach sent` : "No activity in this year."}</p>
        <div className="flex items-center gap-1.5 text-muted-foreground" aria-label="Darker squares indicate more outreach"><span className="mr-1">Less</span>{shades.map(shade => <span key={shade} className={cn("h-[14px] w-[14px] rounded-[3px] border border-foreground/10", shade)} aria-hidden="true" />)}<span className="ml-1">More</span></div>
      </div>
      <p className="text-xs text-muted-foreground">Counts each non-draft outreach once on its first saved sent date, falling back to creation date. Follow-up messages are not included. Future days are outlined.</p>
    </CardContent>
  </Card>;
}
