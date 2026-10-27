"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiActivity, FiRefreshCw, FiEye } from "react-icons/fi";

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
export function EmailActivityCard({ outreachId }: { outreachId: string }) {
  const query = useQuery<Activity>({ queryKey: ["outreach-email-activity", outreachId],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/outreach/${outreachId}/email-activity`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("Activity unavailable");
      return response.json();
    }, staleTime: 10000, refetchInterval: 30000, refetchIntervalInBackground: false, retry: 1 });
  return <Card className="overflow-hidden rounded-3xl border-2 shadow-sm"><CardHeader className="gap-2 px-5 pb-3">
    <div className="flex items-center justify-between gap-2">
      <CardTitle className="flex items-center gap-2 text-lg font-bold"><FiActivity className="h-5 w-5 shrink-0 text-primary" /> Email activity</CardTitle>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" aria-label="Refresh email activity" disabled={query.isFetching} onClick={() => void query.refetch()}><FiRefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /></Button>
    </div>
    <p className="text-xs text-muted-foreground">Across all company contacts</p>
  </CardHeader><CardContent className="space-y-3 px-4 pb-5">
    {query.isPending ? <p className="text-sm">Loading activity…</p> : query.isError ? <p role="alert" className="text-sm text-destructive">Activity temporarily unavailable. Previously displayed counts may be stale.</p> : !query.data?.available ?
      <p className="text-sm text-muted-foreground">Email tracking is not configured yet. Existing emails are not retrospectively tracked.</p> : <>
      {!query.data.collectionEnabled && <p className="text-sm text-muted-foreground">Collection is currently disabled. Historical activity is preserved.</p>}
      {!query.data.messages.length && <p className="text-sm text-muted-foreground">No tracked emails linked to this outreach. This does not mean your existing emails were unread.</p>}
      {query.data.messages.map(message => <article key={message.id} className="min-w-0 space-y-3 overflow-hidden rounded-2xl border bg-muted/10 p-4">
        <div className="space-y-2">
          <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold capitalize tracking-wide text-primary">{message.kind.replaceAll("_", " ")}</span>
          <p className="break-words text-sm font-semibold leading-snug">{message.subject || "(No subject)"}</p>
          <p className="break-all text-xs text-muted-foreground">To {message.recipient}</p>
          <p className="text-xs text-muted-foreground">{message.deliveryState === "accepted" ? "Provider accepted" : message.deliveryState === "ambiguous" ? "Send outcome uncertain" : message.deliveryState}</p>
          <p className="text-xs text-muted-foreground">{message.sentAt ? `Sent ${date(message.sentAt)}` : "No confirmed send date"}</p>
        </div>
        {message.deliveryState === "accepted" ? <>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/5 px-3 py-2.5">
            <span className="flex items-center gap-2 text-xs font-medium"><FiEye className="h-4 w-4 text-primary" />Detected opens</span>
            <span className="text-xl font-bold tabular-nums text-primary">{message.openCount ?? "—"}</span>
          </div>
          <dl className="space-y-2 text-xs">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt className="text-muted-foreground">First detected</dt><dd className="font-medium">{date(message.firstOpenAt)}</dd></div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt className="text-muted-foreground">Last detected</dt><dd className="font-medium">{date(message.lastOpenAt)}</dd></div>
          </dl>
          {!message.trackingEnabled && <p className="text-xs text-muted-foreground">Tracking disabled for this message.</p>}
          {message.collectionExpired && <p className="text-xs text-muted-foreground">Collection window expired (90 days).</p>}
          {(message.openCount ?? 0) >= 10000 && <p className="text-xs text-muted-foreground">Safety event limit reached. Count is capped.</p>}
          <details className="border-t pt-3 text-xs"><summary className="cursor-pointer font-medium text-muted-foreground">Recent activity</summary>
            <p className="mt-2 text-[10px] text-muted-foreground">Up to 20 detected image loads</p>
            {message.recentEvents.length ? <ol className="mt-3 ml-1 space-y-3 border-l border-primary/20 pl-4">{message.recentEvents.map((event, index) => <li className="relative before:absolute before:top-1 before:-left-[21px] before:h-2 before:w-2 before:rounded-full before:bg-primary/50" key={`${event.observedAt}-${index}`}>{date(event.observedAt)}</li>)}</ol> : <p className="mt-2 text-muted-foreground">No recent activity detected.</p>}
          </details>
        </> : <p className="text-xs text-muted-foreground">Image requests are not evidence of a successful send. Activity is withheld until provider acceptance is recorded.</p>}
      </article>)}
      {query.data.messages.length === 50 && <p className="text-xs text-muted-foreground">Showing the latest 50 tracked emails.</p>}
    </>}
  </CardContent></Card>;
}
