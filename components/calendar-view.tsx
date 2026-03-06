"use client";

import { useState, useMemo, useTransition } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parseISO, isToday, isPast, differenceInCalendarDays } from "date-fns";
import { FiClock, FiVideo, FiCloud, FiCloudOff, FiAlertTriangle, FiChevronRight } from "react-icons/fi";
import { syncOutreachToCalendar, removeOutreachFromCalendar } from "@/actions/calendar";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: "follow-up-1" | "follow-up-2" | "interview";
  status: string;
  companyName: string;
  roleTargeted: string;
  outreachId: string;
  synced: boolean;
};

type CalendarViewProps = {
  events: CalendarEvent[];
  calendarSyncEnabled: boolean;
};

const typeConfig = {
  "follow-up-1": {
    label: "1st Follow-up",
    shortLabel: "F1",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dot: "bg-blue-500",
    badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    icon: FiClock,
  },
  "follow-up-2": {
    label: "2nd Follow-up",
    shortLabel: "F2",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    dot: "bg-purple-500",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    icon: FiClock,
  },
  interview: {
    label: "Interview",
    shortLabel: "INT",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
    badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    icon: FiVideo,
  },
};

function RelativeDate({ dateStr }: { dateStr: string }) {
  const d = parseISO(dateStr);
  const diff = differenceInCalendarDays(d, new Date());

  if (diff === 0) return <span className="text-blue-600 dark:text-blue-400 font-bold">Today</span>;
  if (diff === 1) return <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tomorrow</span>;
  if (diff === -1) return <span className="text-red-500 font-semibold">Yesterday</span>;
  if (diff < -1) return <span className="text-red-500 font-semibold">{Math.abs(diff)}d overdue</span>;
  if (diff <= 7) return <span className="text-muted-foreground font-medium">In {diff} days</span>;
  return <span className="text-muted-foreground font-medium">{format(d, "MMM d")}</span>;
}

export function CalendarView({ events, calendarSyncEnabled }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [localEvents, setLocalEvents] = useState(events);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"date" | "overdue" | "upcoming">("date");

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of localEvents) {
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [localEvents]);

  // Selected date events
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const selectedEvents = eventsByDate.get(selectedDateStr) || [];

  // Overdue events
  const overdueEvents = useMemo(
    () =>
      localEvents
        .filter((e) => e.date < todayStr)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [localEvents, todayStr]
  );

  // Upcoming events (today + future, next 30 days)
  const upcomingEvents = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    const limitStr = format(limit, "yyyy-MM-dd");
    return localEvents
      .filter((e) => e.date >= todayStr && e.date <= limitStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [localEvents, todayStr]);

  const handleSyncToggle = (outreachId: string, currentlySynced: boolean) => {
    setSyncingId(outreachId);
    startTransition(async () => {
      if (currentlySynced) {
        await removeOutreachFromCalendar(outreachId);
      } else {
        await syncOutreachToCalendar(outreachId);
      }
      setLocalEvents((prev) =>
        prev.map((e) =>
          e.outreachId === outreachId ? { ...e, synced: !currentlySynced } : e
        )
      );
      setSyncingId(null);
    });
  };

  // Which events list to show
  const displayEvents =
    activeTab === "overdue"
      ? overdueEvents
      : activeTab === "upcoming"
        ? upcomingEvents
        : selectedEvents;

  const displayTitle =
    activeTab === "overdue"
      ? `Overdue (${overdueEvents.length})`
      : activeTab === "upcoming"
        ? `Upcoming (${upcomingEvents.length})`
        : isToday(selectedDate)
          ? `Today (${selectedEvents.length})`
          : `${format(selectedDate, "EEE, MMM d")} (${selectedEvents.length})`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Calendar + Legend */}
      <div className="lg:col-span-4 space-y-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-premium overflow-hidden">
          <CardContent className="p-3 md:p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) {
                  setSelectedDate(d);
                  setActiveTab("date");
                }
              }}
              month={month}
              onMonthChange={setMonth}
              components={{
                DayButton: ({ day, ...props }) => {
                  const dateStr = format(day.date, "yyyy-MM-dd");
                  const dayEvents = eventsByDate.get(dateStr) || [];
                  const types = [...new Set(dayEvents.map((e) => e.type))];
                  const isOverdue = dateStr < todayStr && dayEvents.length > 0;

                  return (
                    <button
                      {...props}
                      className={cn(
                        props.className,
                        isOverdue && "text-red-500 dark:text-red-400"
                      )}
                    >
                      <span>{day.date.getDate()}</span>
                      {types.length > 0 && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-[3px]">
                          {types.map((type) => (
                            <span
                              key={type}
                              className={cn("w-[5px] h-[5px] rounded-full", typeConfig[type].dot)}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                },
              }}
              className="w-full"
            />

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
              {Object.entries(typeConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={cn("w-[6px] h-[6px] rounded-full", config.dot)} />
                  <span className="text-[11px] text-muted-foreground font-medium">{config.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedDate(new Date());
              setMonth(new Date());
              setActiveTab("date");
            }}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border",
              activeTab === "date"
                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                : "bg-card/50 text-muted-foreground border-border/50 hover:bg-muted/50"
            )}
          >
            Selected Day
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border relative",
              activeTab === "overdue"
                ? "bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20"
                : "bg-card/50 text-muted-foreground border-border/50 hover:bg-muted/50"
            )}
          >
            Overdue
            {overdueEvents.length > 0 && activeTab !== "overdue" && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {overdueEvents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border",
              activeTab === "upcoming"
                ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                : "bg-card/50 text-muted-foreground border-border/50 hover:bg-muted/50"
            )}
          >
            Upcoming
          </button>
        </div>
      </div>

      {/* Right: Event list */}
      <div className="lg:col-span-8">
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-premium">
          <CardContent className="p-4 md:p-6">
            {/* Title */}
            <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
              {activeTab === "overdue" && <FiAlertTriangle className="text-red-500" size={18} />}
              {displayTitle}
            </h2>

            {/* Event list */}
            {displayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FiClock className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {activeTab === "overdue"
                    ? "No overdue follow-ups"
                    : activeTab === "upcoming"
                      ? "No upcoming events"
                      : "Nothing scheduled for this day"}
                </p>
                <p className="text-xs mt-1 opacity-60">
                  {activeTab === "date" && "Select a date with dots to see events"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayEvents.map((event) => {
                  const config = typeConfig[event.type];
                  const Icon = config.icon;
                  const eventDate = parseISO(event.date);
                  const isEventOverdue = event.date < todayStr;

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "group flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm",
                        isEventOverdue
                          ? "border-red-500/20 bg-red-500/5"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      {/* Type indicator */}
                      <div className={cn("shrink-0 p-2 rounded-lg border", config.color)}>
                        <Icon size={16} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate">{event.companyName}</p>
                          <Badge className={cn("text-[9px] px-1.5 py-0 h-4 border shrink-0", config.badgeColor)}>
                            {config.shortLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {event.roleTargeted}
                        </p>
                      </div>

                      {/* Date + Actions */}
                      <div className="shrink-0 flex items-center gap-2">
                        {activeTab !== "date" && (
                          <div className="text-xs text-right">
                            <RelativeDate dateStr={event.date} />
                          </div>
                        )}

                        {calendarSyncEnabled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 w-7 p-0 rounded-lg transition-all",
                              event.synced
                                ? "text-emerald-500 hover:text-red-500"
                                : "text-muted-foreground/30 hover:text-primary"
                            )}
                            onClick={() => handleSyncToggle(event.outreachId, event.synced)}
                            disabled={syncingId === event.outreachId}
                            title={event.synced ? "Synced to Google Calendar — click to remove" : "Sync to Google Calendar"}
                          >
                            {event.synced ? <FiCloud size={14} /> : <FiCloudOff size={14} />}
                          </Button>
                        )}

                        <FiChevronRight size={14} className="text-muted-foreground/30 hidden md:block" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
