"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiActivity, FiRefreshCw } from "react-icons/fi";

interface Message {
  id: string; recipient: string; subject: string; kind: string; deliveryState: string;
  trackingEnabled: boolean; sentAt: string | null; createdAt: string; firstOpenAt: string | null;
  lastOpenAt: string | null; openCount: number | null; collectionExpired: boolean; recentEvents: { observedAt: string }[];
}
interface Activity { available: boolean; collectionEnabled?: boolean; messages: Message[]; reason?: string }
const date = (value: string | null) => value ? new Date(value).toLocaleString() : "None detected";
export function EmailActivityCard({ outreachId }: { outreachId: string }) {
  const query = useQuery<Activity>({ queryKey: ["outreach-email-activity", outreachId],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/outreach/${outreachId}/email-activity`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("Activity unavailable");
      return response.json();
    }, staleTime: 10000, refetchInterval: 30000, refetchIntervalInBackground: false, retry: 1 });
  return <Card><CardHeader className="flex flex-row items-center justify-between gap-3">
    <CardTitle className="flex items-center gap-2"><FiActivity /> Email activity</CardTitle>
    <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><FiRefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
  </CardHeader><CardContent className="space-y-4">
    <p className="text-xs text-muted-foreground">Detected image loads are estimates, not proof of reading or delivery. Privacy protection, forwarding, your own sent-folder views and caching can distort counts.</p>
    {query.isPending ? <p className="text-sm">Loading activity…</p> : query.isError ? <p role="alert" className="text-sm text-destructive">Activity temporarily unavailable. Previously displayed counts may be stale.</p> : !query.data?.available ?
      <p className="text-sm text-muted-foreground">Email tracking is not configured yet. Existing emails are not retrospectively tracked.</p> : <>
      {!query.data.collectionEnabled && <p className="text-sm text-muted-foreground">Collection is currently disabled. Historical activity is preserved.</p>}
      {!query.data.messages.length && <p className="text-sm text-muted-foreground">No tracked emails linked to this outreach. This does not mean your existing emails were unread.</p>}
      {query.data.messages.map(message => <article key={message.id} className="space-y-3 rounded-xl border p-4">
        <div><p className="break-all text-sm font-semibold">{message.recipient}</p><p className="text-sm">{message.subject}</p><p className="text-xs text-muted-foreground">{message.kind.replaceAll("_", " ")} · {message.deliveryState === "accepted" ? "Provider accepted" : message.deliveryState === "ambiguous" ? "Send outcome uncertain" : message.deliveryState} · {message.sentAt ? date(message.sentAt) : "No confirmed send time"}</p></div>
        {message.deliveryState === "accepted" ? <>
          <div className="grid gap-3 text-xs sm:grid-cols-3"><div><p className="text-muted-foreground">Detected opens</p><p className="mt-1 text-xl font-semibold">{message.openCount}</p></div><div><p className="text-muted-foreground">First detected</p><p className="mt-1">{date(message.firstOpenAt)}</p></div><div><p className="text-muted-foreground">Last detected</p><p className="mt-1">{date(message.lastOpenAt)}</p></div></div>
          {!message.trackingEnabled && <p className="text-xs text-muted-foreground">Tracking disabled for this message.</p>}
          {message.collectionExpired && <p className="text-xs text-muted-foreground">Collection window expired (90 days).</p>}
          {(message.openCount ?? 0) >= 10000 && <p className="text-xs text-muted-foreground">Safety event limit reached. Count is capped.</p>}
          <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Recent detected activity (up to 20 events)</summary><ol className="mt-2 space-y-1">{message.recentEvents.map((event, index) => <li key={`${event.observedAt}-${index}`}>{date(event.observedAt)}</li>)}</ol></details>
        </> : <p className="text-xs text-muted-foreground">Image requests are not evidence of a successful send. Activity is withheld until provider acceptance is recorded.</p>}
      </article>)}
      {query.data.messages.length === 50 && <p className="text-xs text-muted-foreground">Showing the latest 50 tracked emails.</p>}
    </>}
  </CardContent></Card>;
}
