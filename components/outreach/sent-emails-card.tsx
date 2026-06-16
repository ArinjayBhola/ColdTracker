"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getSentEmailsForOutreach,
  deleteSentEmailAction,
} from "@/actions/email";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  FiMail,
  FiEye,
  FiEyeOff,
  FiMousePointer,
  FiClock,
  FiSend,
  FiTrash2,
} from "react-icons/fi";
import { format, formatDistanceToNow } from "date-fns";

type SentEmailsCardProps = {
  outreachId: string;
};

type EmailEvent = {
  id: string;
  type: "open" | "click";
  url: string | null;
  timestamp: string | Date;
};

export function SentEmailsCard({ outreachId }: SentEmailsCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [live, setLive] = useState(false);

  const { data: emails = [] } = useQuery({
    queryKey: ["sent-emails", outreachId],
    queryFn: () => getSentEmailsForOutreach(outreachId),
    staleTime: 30 * 1000,
    // Fallback poll in case the live stream drops; the SSE push handles the
    // instant updates, so this can stay infrequent.
    refetchInterval: 5 * 60 * 1000,
  });

  const queryKey = ["sent-emails", outreachId];

  const { mutate: deleteEmail } = useMutation({
    mutationFn: (id: string) => deleteSentEmailAction(id),
    // Optimistic: drop the row from the UI immediately on click.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<typeof emails>(queryKey);
      queryClient.setQueryData<typeof emails>(queryKey, (old) =>
        (old ?? []).filter((e) => e.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      // Roll back if the server rejected the delete.
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({ title: "Couldn't remove email", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Live updates: subscribe to this outreach's tracking stream (SSE). When the
  // recipient opens/clicks, the server pushes an event and we refetch the
  // authoritative data so opens appear without a manual refresh.
  useEffect(() => {
    const source = new EventSource(`/api/track/stream/${outreachId}`);

    source.onopen = () => {
      setLive(true);
      // Catch up on anything that landed during a (re)connect gap.
      queryClient.invalidateQueries({ queryKey: ["sent-emails", outreachId] });
    };
    source.addEventListener("tracking", () => {
      queryClient.invalidateQueries({ queryKey: ["sent-emails", outreachId] });
    });
    source.onerror = () => {
      // EventSource auto-reconnects; reflect the transient drop in the UI.
      setLive(false);
    };

    return () => source.close();
  }, [outreachId, queryClient]);

  if (emails.length === 0) return null;

  // Aggregate stats for the header summary.
  const totalOpened = emails.filter(
    (e) => !!e.openedAt || ((e.events ?? []) as EmailEvent[]).some((x) => x.type === "open")
  ).length;

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-extrabold">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <FiMail className="h-4 w-4 text-primary" />
            </span>
            Sent Emails
          </span>

          <span
            className="ml-auto flex items-center gap-1.5 rounded-full border border-border/50 px-2 py-0.5 text-xs font-semibold text-muted-foreground"
            title={live ? "Live updates active" : "Reconnecting…"}>
            <span className="relative flex h-2 w-2">
              {live && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500/70" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  live ? "bg-green-500" : "bg-muted-foreground/40"
                }`}
              />
            </span>
            {live ? "Live" : "Offline"}
          </span>
        </CardTitle>

        {/* Summary line */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FiSend className="h-3 w-3" />
            {emails.length} sent
          </span>
          <span className="text-border">•</span>
          <span className="inline-flex items-center gap-1 text-green-600">
            <FiEye className="h-3 w-3" />
            {totalOpened} opened
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {emails.map((email) => {
          const events = (email.events ?? []) as EmailEvent[];
          const openEvents = events.filter((e) => e.type === "open");
          const clickEvents = events.filter((e) => e.type === "click");
          const isOpened = !!email.openedAt || openEvents.length > 0;
          // Legacy emails may have openedAt set without per-open event rows.
          const openCount = Math.max(openEvents.length, isOpened ? 1 : 0);

          return (
            <div
              key={email.id}
              className="group rounded-xl border border-border/50 bg-card/40 p-3 transition-all hover:border-primary/30 hover:bg-card/70 sm:p-4">
              {/* Top row: subject + sent time */}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold leading-snug break-words sm:truncate">
                    {email.subject}
                  </p>
                  <p className="text-xs text-muted-foreground break-all">
                    To: {email.to}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-start">
                  <span
                    className="text-xs text-muted-foreground whitespace-nowrap"
                    title={format(new Date(email.sentAt), "PPpp")}>
                    {format(new Date(email.sentAt), "MMM d, h:mm a")}
                  </span>

                  <button
                    type="button"
                    onClick={() => deleteEmail(email.id)}
                    title="Remove from list"
                    aria-label="Remove email"
                    className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 sm:opacity-0 sm:group-hover:opacity-100">
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Tracking badges */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {/* Open status — count sits right next to the label */}
                {isOpened ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="focus:outline-none"
                        aria-label="View open details">
                        <Badge
                          variant="success"
                          className="cursor-pointer gap-1.5 py-1 hover:bg-green-500/25">
                          <FiEye className="h-3 w-3" />
                          Opened
                          <span className="rounded-full bg-green-600/20 px-1.5 font-bold tabular-nums">
                            {openCount}
                          </span>
                        </Badge>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-64">
                      <OpenTimeline
                        firstOpen={email.openedAt}
                        openEvents={openEvents}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Badge variant="neutral" className="gap-1.5 py-1">
                    <FiEyeOff className="h-3 w-3" />
                    Not opened
                    <span className="rounded-full bg-muted-foreground/15 px-1.5 font-bold tabular-nums">
                      0
                    </span>
                  </Badge>
                )}

                {/* Click status */}
                {clickEvents.length > 0 && (
                  <Badge variant="info" className="gap-1.5 py-1">
                    <FiMousePointer className="h-3 w-3" />
                    Clicked
                    <span className="rounded-full bg-blue-600/20 px-1.5 font-bold tabular-nums">
                      {clickEvents.length}
                    </span>
                  </Badge>
                )}

                {/* First-open relative time for quick scanning */}
                {isOpened && email.openedAt && (
                  <span className="text-muted-foreground">
                    · opened {formatDistanceToNow(new Date(email.openedAt), { addSuffix: true })}
                  </span>
                )}

                <span className="ml-auto capitalize text-muted-foreground/70">
                  via {email.provider}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function OpenTimeline({
  firstOpen,
  openEvents,
}: {
  firstOpen: string | Date | null;
  openEvents: EmailEvent[];
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm font-bold">Open activity</p>
        <p className="text-xs text-muted-foreground">
          {openEvents.length || (firstOpen ? 1 : 0)}{" "}
          {openEvents.length === 1 ? "open" : "opens"}
          {firstOpen && (
            <> · first {format(new Date(firstOpen), "MMM d, h:mm a")}</>
          )}
        </p>
      </div>

      <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
        {openEvents.length > 0 ? (
          openEvents.map((event, i) => (
            <div
              key={event.id}
              className="flex items-center gap-2 text-xs text-muted-foreground">
              <FiClock className="h-3 w-3 shrink-0 text-green-600" />
              <span className="font-medium text-foreground">
                {format(new Date(event.timestamp), "MMM d, yyyy · h:mm:ss a")}
              </span>
              {i === 0 && (
                <span className="ml-auto text-[10px] uppercase tracking-wide text-green-600">
                  first
                </span>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">
            This open was recorded before detailed timestamps were tracked.
          </p>
        )}
      </div>
    </div>
  );
}
