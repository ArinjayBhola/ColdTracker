"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, Download, MessageCircle, Send, Target, Trophy, Clock3 } from "lucide-react";
import { buildOutreachAnalytics, percent, type AnalyticsRecord, type AnalyticsRange, type OutreachAnalytics } from "@/lib/outreach-analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";

const number = (value: number) => value.toLocaleString("en-US");
const rate = (value: number) => `${value.toFixed(1)}%`;
const date = (value: string, full = false) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(full ? { year: "numeric" } : {}) });
const rangeLabels = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days", all: "All time" };

function ComparisonChart({ analytics }: { analytics: OutreachAnalytics }) {
  const [mode, setMode] = useState<"count" | "rate">("count");
  const [active, setActive] = useState<number | null>(null);
  const buckets = analytics.buckets;
  const selected = buckets[active ?? buckets.length - 1] ?? buckets[0];
  const width = 760, height = 280, left = 48, right = 20, top = 24, bottom = 48;
  const plotHeight = height - top - bottom;
  const step = (width - left - right) / buckets.length;
  const max = mode === "rate" ? 100 : Math.max(4, Math.ceil(Math.max(...buckets.map(bucket => bucket.sent), 0) / 4) * 4);
  const y = (value: number) => top + plotHeight * (1 - value / max);
  const x = (index: number) => left + step * (index + 0.5);
  const path = buckets.map((bucket, index) => {
    if (!bucket.sent) return "";
    return `${index > 0 && buckets[index - 1].sent > 0 ? "L" : "M"} ${x(index)} ${y(bucket.responseRate)}`;
  }).join(" ");
  return <Card>
    <CardHeader className="gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2"><CardTitle>Sent → response</CardTitle><CardDescription>Compare outreach volume with recorded responses in each sent-date cohort.</CardDescription></div>
        <div role="group" aria-label="Chart view" className="flex flex-wrap gap-1 rounded-lg border p-1">
          <Button size="sm" variant={mode === "count" ? "default" : "ghost"} aria-pressed={mode === "count"} onClick={() => setMode("count")}>Counts</Button>
          <Button size="sm" variant={mode === "rate" ? "default" : "ghost"} aria-pressed={mode === "rate"} onClick={() => setMode("rate")}>Response rate</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {mode === "count" ? <><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-primary" />Sent</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-400" />Recorded responses</span></> : <span>Recorded responses ÷ sent × 100</span>}
        <span>{analytics.bucketDays}-day groups (local dates)</span>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="overflow-x-auto" role="region" aria-label="Scrollable outreach chart" tabIndex={0}>
        <svg viewBox={`0 0 ${width} ${height}`} className="block w-full min-w-[640px]" role="group" aria-label={mode === "count" ? "Sent outreach and recorded response counts by sent date" : "Recorded response rate by sent date"}>
          <title>Outreach performance by sent date</title>
          <desc>Focus or hover a group to inspect exact counts. Response outcomes reflect current statuses, not the date a reply arrived.</desc>
          {[0, 1, 2, 3, 4].map(index => {
            const value = index * max / 4;
            return <g key={index}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} className="stroke-border" strokeDasharray="4 4" /><text x={left - 10} y={y(value) + 4} textAnchor="end" fontSize="12" className="fill-muted-foreground">{value}{mode === "rate" ? "%" : ""}</text></g>;
          })}
          {mode === "rate" && <path d={path} fill="none" className="stroke-primary" strokeWidth="3" strokeLinejoin="round" />}
          {buckets.map((bucket, index) => {
            const barWidth = Math.min(24, step * 0.24);
            const label = `${date(bucket.start, true)} to ${date(bucket.end, true)}: ${bucket.sent} sent, ${bucket.responded} recorded responses, ${bucket.sent ? rate(bucket.responseRate) : "no outreach"}`;
            return <g key={bucket.start} tabIndex={0} role="button" aria-label={label} data-bucket={index} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)} onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(index); }
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                const next = Math.max(0, Math.min(buckets.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
                event.currentTarget.ownerSVGElement?.querySelector<SVGGElement>(`[data-bucket="${next}"]`)?.focus();
              }
            }} className="cursor-pointer outline-none [&:focus-visible>rect:first-of-type]:stroke-primary">
              <title>{label}</title>
              <rect x={left + step * index + 3} y={top - 8} width={step - 6} height={plotHeight + 18} rx={6} fill={active === index ? "currentColor" : "transparent"} fillOpacity={active === index ? 0.035 : 0} stroke="transparent" strokeWidth={2} />
              {mode === "count" ? <>
                <rect x={x(index) - barWidth - 2} y={y(bucket.sent)} width={barWidth} height={plotHeight * bucket.sent / max} rx={3} className="fill-primary" />
                <rect x={x(index) + 2} y={y(bucket.responded)} width={barWidth} height={plotHeight * bucket.responded / max} rx={3} className="fill-emerald-600 dark:fill-emerald-400" />
              </> : bucket.sent > 0 && <circle cx={x(index)} cy={y(bucket.responseRate)} r={5} className="fill-primary stroke-background" strokeWidth={2} />}
              <text x={x(index)} y={height - 16} textAnchor="middle" fontSize="12" className="fill-muted-foreground">{date(bucket.start)}</text>
            </g>;
          })}
        </svg>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm" aria-live="polite">
        <span className="text-muted-foreground">{date(selected.start)} – {date(selected.end, true)}</span>
        <span>{number(selected.sent)} sent · {number(selected.responded)} responses · <strong>{selected.sent ? rate(selected.responseRate) : "No outreach"}</strong></span>
      </div>
      <p className="text-xs text-muted-foreground">Groups use the first saved sent date, falling back to creation date. These are current outcomes of that outreach—not replies received during that week.</p>
    </CardContent>
  </Card>;
}

export function OutreachAnalyticsDashboard({ records }: { records: AnalyticsRecord[] }) {
  const [asOf, setAsOf] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setAsOf(new Date().toISOString());
    sync();
    const timer = setInterval(sync, 30_000);
    window.addEventListener("focus", sync);
    return () => { clearInterval(timer); window.removeEventListener("focus", sync); };
  }, []);
  if (!asOf) return <p className="text-muted-foreground" role="status">Loading your local statistics...</p>;
  return <LocalOutreachAnalytics records={records} asOf={asOf} />;
}

function LocalOutreachAnalytics({ records, asOf }: { records: AnalyticsRecord[]; asOf: string }) {
  const [range, setRange] = useState<AnalyticsRange>("30");
  const analytics = useMemo(() => buildOutreachAnalytics(records, range, asOf, Intl.DateTimeFormat().resolvedOptions().timeZone), [records, range, asOf]);
  const a = analytics;
  const previousRate = a.previous ? percent(a.previous.responded, a.previous.sent) : null;
  const change = previousRate !== null && a.previous!.sent > 0 && a.sent > 0 ? a.responseRate - previousRate : null;
  const metrics = [
    { label: "Outreach sent", value: number(a.sent), detail: "Outreach records · drafts excluded", icon: Send },
    { label: "Recorded response rate", value: rate(a.responseRate), detail: `${number(a.responded)} of ${number(a.sent)} sent`, icon: MessageCircle },
    { label: "Interview rate", value: rate(a.interviewRate), detail: `${number(a.interviews)} reached interview or offer`, icon: Target },
    { label: "Offer rate", value: rate(a.offerRate), detail: `${number(a.offers)} currently at offer`, icon: Trophy },
  ];

  function exportSummary() {
    const rows: (string | number)[][] = [["Period", rangeLabels[range]], ["As of", asOf], ["Metric", "Count"], ["Sent", a.sent], ["Recorded responses", a.responded], ["Interview or offer", a.interviews], ["Offers", a.offers], ["Response rate (%)", a.responseRate.toFixed(1)], [], ["Sent cohort start", "Sent cohort end", "Sent", "Current recorded responses", "Response rate (%)"], ...a.buckets.map(bucket => [bucket.start, bucket.end, bucket.sent, bucket.responded, bucket.responseRate.toFixed(1)])];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `coldtrack-stats-${range}-${asOf.slice(0, 10)}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2"><p className="text-xs uppercase tracking-wider text-primary">Outreach intelligence</p><h1 className="text-3xl tracking-tight">Statistics</h1><p className="text-sm text-muted-foreground">Understand what you send, what gets a response, and what moves forward.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={range} onValueChange={value => setRange(value as AnalyticsRange)}><SelectTrigger className="w-auto min-w-[10em]" aria-label="Statistics date range"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(rangeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" onClick={exportSummary}><Download className="h-4 w-4" />Export CSV</Button>
      </div>
    </div>
    <div className="rounded-xl border bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">One outreach record is counted once, even with multiple contacts. Recorded responses include <strong className="text-foreground">Replied, Interview, and Offer</strong>; interviews include offers. Rejected and Closed records have no confirmed reply history, so they aren’t counted as responses.</div>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
      {metrics.map(metric => <Card key={metric.label}><CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3"><CardTitle className="text-sm [overflow-wrap:normal]">{metric.label}</CardTitle><metric.icon className="h-5 w-5 shrink-0 text-primary" /></CardHeader><CardContent className="space-y-2"><p className="text-3xl tabular-nums">{metric.value}</p><p className="text-xs text-muted-foreground">{metric.detail}</p></CardContent></Card>)}
    </div>
    {a.previous && <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span>Previous {range} days: {number(a.previous.sent)} sent · {rate(percent(a.previous.responded, a.previous.sent))} recorded response rate</span>{change !== null && <span className="inline-flex items-center gap-1 text-foreground"><ArrowUpRight className={`h-3.5 w-3.5 ${change < 0 ? "rotate-90" : ""}`} />{change > 0 ? "+" : ""}{change.toFixed(1)} percentage points</span>}</p>}

    {a.sent === 0 ? <Card><CardContent className="space-y-3 py-10 text-center"><BarChart3 className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="text-xl">No sent outreach in this period</h2><p className="text-sm text-muted-foreground">{records.length ? "Choose a wider date range, or send an outreach to start seeing trends." : "Add your first outreach to build your performance picture."}</p><Button asChild><Link href="/outreach/new">Add outreach</Link></Button></CardContent></Card> : <ComparisonChart analytics={a} />}

    <div className="grid min-w-0 gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Conversion funnel</CardTitle><CardDescription>Each stage includes the later stages we can confirm.</CardDescription></CardHeader><CardContent className="space-y-5">
        {[{ label: "Sent", count: a.sent }, { label: "Recorded response", count: a.responded }, { label: "Interview or offer", count: a.interviews }, { label: "Offer", count: a.offers }].map(stage => <div key={stage.label} className="space-y-2"><div className="flex flex-wrap justify-between gap-2 text-sm"><span>{stage.label}</span><span className="tabular-nums">{number(stage.count)} <span className="text-muted-foreground">· {rate(percent(stage.count, a.sent))}</span></span></div><div role="meter" aria-label={stage.label} aria-valuenow={stage.count} aria-valuemin={0} aria-valuemax={Math.max(1, a.sent)} className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percent(stage.count, a.sent)}%` }} /></div></div>)}
        <p className="border-t pt-4 text-xs text-muted-foreground">Interview → offer conversion: {a.interviews ? rate(a.interviewToOfferRate) : "No interviews recorded yet"}.</p>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Current pipeline</CardTitle><CardDescription>Latest status of records in this period.</CardDescription></CardHeader><CardContent className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-3">{a.statuses.map(item => <div key={item.status} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3"><StatusBadge status={item.status} /><span className="tabular-nums">{number(item.count)}</span></div>)}</CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Performance by channel</CardTitle><CardDescription>Each outreach belongs to one channel. Multiple contact methods appear under Mixed.</CardDescription></CardHeader><CardContent>
      {a.channels.length ? <div className="overflow-x-auto"><table className="w-full text-sm [overflow-wrap:normal]"><caption className="sr-only">Outreach conversion by contact channel</caption><thead><tr className="border-b text-left text-muted-foreground">{["Channel", "Sent", "Responses", "Response rate", "Interview / offer"].map(label => <th key={label} className="whitespace-nowrap px-3 py-3 font-normal">{label}</th>)}</tr></thead><tbody>{a.channels.map(channel => <tr key={channel.channel} className="border-b last:border-0"><th scope="row" className="whitespace-nowrap px-3 py-4 text-left font-normal">{channel.channel}</th><td className="px-3 py-4 tabular-nums">{number(channel.sent)}</td><td className="px-3 py-4 tabular-nums">{number(channel.responded)}</td><td className="whitespace-nowrap px-3 py-4 tabular-nums">{rate(channel.responseRate)}</td><td className="px-3 py-4 tabular-nums">{number(channel.interviews)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Channel comparisons will appear after you send outreach.</p>}
    </CardContent></Card>
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4 text-sm"><p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 shrink-0 text-primary" />{number(a.awaiting)} awaiting a response · {number(a.overdue)} with overdue follow-ups now</p><Button variant="outline" size="sm" asChild><Link href="/follow-ups">Open follow-ups</Link></Button></div>
    <p className="text-xs text-muted-foreground">As of {date(asOf, true)} · Date filters use sent-date cohorts in your device timezone, with drafts grouped by creation date. Outcomes reflect today’s saved statuses; this app does not currently store reply timestamps or a full status history.</p>
  </div>;
}
