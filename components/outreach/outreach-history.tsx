import type { OutreachContact, StatusEvent } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayDate, displayTime } from "@/lib/display-date";

function EventTime({ at }: { at: string }) {
  return <time dateTime={at} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
    <span>{displayDate(at)}</span><span>{displayTime(at)}</span>
  </time>;
}

export function OutreachHistory({ statusHistory = [], followUpHistory = [] }: {
  statusHistory?: StatusEvent[];
  followUpHistory?: OutreachContact["followUpHistory"];
}) {
  return <>
    <Card data-outreach-history className="min-w-0"><CardHeader className="pb-3"><CardTitle className="text-lg">Status history</CardTitle></CardHeader><CardContent>
      <ol className="space-y-4">{[...statusHistory].reverse().map((event, index) => <li key={`${event.at}-${index}`} className="space-y-1 border-l-2 border-primary/20 pl-3">
        <p className="text-sm font-medium">{event.status.charAt(0) + event.status.slice(1).toLowerCase().replaceAll("_", " ")}</p>
        <EventTime at={event.at} />
        {event.source === "baseline" && <p className="text-xs text-muted-foreground">First recorded state</p>}
      </li>)}</ol>
    </CardContent></Card>
    {followUpHistory.length > 0 && <Card className="min-w-0"><CardHeader className="pb-3"><CardTitle className="text-lg">Contact follow-up history</CardTitle></CardHeader><CardContent>
      <ol className="space-y-4">{[...followUpHistory].reverse().map((event, index) => <li key={`${event.at}-${index}`} className="space-y-1 border-l-2 border-primary/20 pl-3">
        <p className="text-sm font-medium">Follow-up {event.stage} {event.action}</p>
        <EventTime at={event.at} />
        {event.date && (event.action === "rescheduled" || displayDate(event.date) !== displayDate(event.at)) &&
          <p className="text-xs text-muted-foreground">{event.action === "rescheduled" ? "Due" : "Sent on"} {displayDate(event.date)}</p>}
      </li>)}</ol>
    </CardContent></Card>}
  </>;
}
