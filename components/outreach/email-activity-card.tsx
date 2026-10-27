"use client";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiActivity, FiRefreshCw, FiEye, FiChevronDown } from "react-icons/fi";

interface Message {
  id: string; recipient: string; subject: string; kind: string; deliveryState: string;
  trackingEnabled: boolean; sentAt: string | null; createdAt: string; firstOpenAt: string | null;
  lastOpenAt: string | null; openCount: number | null; collectionExpired: boolean; recentEvents: { observedAt: string }[];
}
interface Activity { available: boolean; collectionEnabled?: boolean; messages: Message[]; reason?: string }
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "long", year: "numeric",
  hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
});
const date = (value: string | null) => value ? dateFormatter.format(new Date(value)) : "None detected";
const dayFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });

function groupEvents(events: Message["recentEvents"]) {
  const groups = new Map<string, Message["recentEvents"]>();
  for (const event of events) {
    const day = dayFormatter.format(new Date(event.observedAt));
    const group = groups.get(day) ?? [];
    group.push(event);
    groups.set(day, group);
  }
  return Array.from(groups.entries());
}
export function EmailActivityCard({ outreachId }: { outreachId: string }) {
  const activityId = useId();
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(() => new Set());
  const toggleActivity = (messageId: string) => setExpandedMessages(previous => {
    const next = new Set(previous);
    if (next.has(messageId)) next.delete(messageId);
    else next.add(messageId);
    return next;
  });
  const query = useQuery<Activity>({ queryKey: ["outreach-email-activity", outreachId],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/outreach/${outreachId}/email-activity`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("Activity unavailable");
      return response.json();
    }, staleTime: 10000, refetchInterval: 30000, refetchIntervalInBackground: false, retry: 1 });
  return <Card id="email-activity" className="scroll-mt-20 overflow-hidden rounded-3xl border-2 shadow-sm"><CardHeader className="gap-2 px-5 pb-3">
    <div className="flex items-center justify-between gap-2">
      <CardTitle className="flex items-center gap-2 text-lg font-bold"><FiActivity className="h-5 w-5 shrink-0 text-primary" /> Email activity</CardTitle>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" aria-label="Refresh email activity" disabled={query.isFetching} onClick={() => void query.refetch()}><FiRefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /></Button>
    </div>
    <p className="text-xs text-muted-foreground">Across all company contacts</p>
  </CardHeader><CardContent className="space-y-3 px-5 pb-5">
    {query.isPending ? <p className="text-sm">Loading activity…</p> : query.isError ? <p role="alert" className="text-sm text-destructive">Activity temporarily unavailable. Previously displayed counts may be stale.</p> : !query.data?.available ?
      <p className="text-sm text-muted-foreground">Email tracking is not configured yet. Existing emails are not retrospectively tracked.</p> : <>
      {!query.data.collectionEnabled && <p className="text-sm text-muted-foreground">Collection is currently disabled. Historical activity is preserved.</p>}
      {!query.data.messages.length && <p className="text-sm text-muted-foreground">No tracked emails linked to this outreach. This does not mean your existing emails were unread.</p>}
      {query.data.messages.map(message => <article key={message.id} className="min-w-0 space-y-4 py-4 first:pt-1 [&+article]:border-t [&+article]:pt-5">
        <div className="space-y-2">
          <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">{message.kind === "initial" ? "Initial email" : message.kind.replaceAll("_", " ")}</span>
          <p className="break-words text-sm font-semibold leading-snug">{message.subject || "(No subject)"}</p>
          <p className="break-all text-xs text-muted-foreground">To {message.recipient}</p>
          <p className="text-xs text-muted-foreground">{message.deliveryState === "accepted" ? "Provider accepted" : message.deliveryState === "ambiguous" ? "Send outcome uncertain" : message.deliveryState}</p>
          <p className="text-xs text-muted-foreground">{message.sentAt ? `Sent ${date(message.sentAt)}` : "No confirmed send date"}</p>
        </div>
        {message.deliveryState === "accepted" ? <>
          <div className="flex items-center gap-2.5 rounded-xl bg-primary/5 px-3 py-3 text-primary">
            <FiEye className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold"><span className="tabular-nums">{message.openCount ?? "—"}</span> detected opens</span>
          </div>
          <dl className="space-y-2 text-xs">
            <div className="space-y-1"><dt className="text-muted-foreground">First detected</dt><dd className="font-medium tabular-nums">{date(message.firstOpenAt)}</dd></div>
            <div className="space-y-1"><dt className="text-muted-foreground">Last detected</dt><dd className="font-medium tabular-nums">{date(message.lastOpenAt)}</dd></div>
          </dl>
          {!message.trackingEnabled && <p className="text-xs text-muted-foreground">Tracking disabled for this message.</p>}
          {message.collectionExpired && <p className="text-xs text-muted-foreground">Collection window expired (90 days).</p>}
          {(message.openCount ?? 0) >= 10000 && <p className="text-xs text-muted-foreground">Safety event limit reached. Count is capped.</p>}
          <div className="border-t pt-3 text-xs">
            <button type="button" aria-expanded={expandedMessages.has(message.id)} aria-controls={`${activityId}-${message.id}`} onClick={() => toggleActivity(message.id)} className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm py-1 text-left font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              Recent activity<FiChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none ${expandedMessages.has(message.id) ? "rotate-180" : ""}`} />
            </button>
            <div id={`${activityId}-${message.id}`} aria-hidden={!expandedMessages.has(message.id)} inert={!expandedMessages.has(message.id)} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${expandedMessages.has(message.id) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="min-h-0 overflow-hidden">
            <p className="mt-2 text-[10px] text-muted-foreground">Latest detected image loads (up to 20)</p>
            {message.recentEvents.length ? <ol className="mt-4 space-y-4">{groupEvents(message.recentEvents).map(([day, events]) => (
              <li key={day}>
                <div className="flex flex-wrap items-center justify-between gap-1"><p className="font-semibold">{day}</p><span className="text-[10px] text-muted-foreground">{events.length} {events.length === 1 ? "detection" : "detections"}</span></div>
                <ol className="mt-3 ml-1 space-y-3 border-l border-primary/20 pl-4">{events.map((event, index) => <li className="relative tabular-nums text-muted-foreground before:absolute before:top-1 before:-left-[20px] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/40" key={`${event.observedAt}-${index}`}><time dateTime={event.observedAt}>{timeFormatter.format(new Date(event.observedAt))}</time></li>)}</ol>
              </li>
            ))}</ol> : <p className="mt-2 text-muted-foreground">No recent activity detected.</p>}
              </div>
            </div>
          </div>
        </> : <p className="text-xs text-muted-foreground">Image requests are not evidence of a successful send. Activity is withheld until provider acceptance is recorded.</p>}
      </article>)}
      {query.data.messages.length === 50 && <p className="text-xs text-muted-foreground">Showing the latest 50 tracked emails.</p>}
    </>}
  </CardContent></Card>;
}
