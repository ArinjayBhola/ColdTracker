import { Sidebar } from "@/components/sidebar";
import { CalendarView } from "@/components/calendar-view";
import { getCalendarEvents, getCalendarSyncStatus } from "@/actions/calendar";
import { FiCalendar, FiClock, FiAlertTriangle, FiArrowRight } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function CalendarPage() {
  const [{ events }, syncStatus] = await Promise.all([
    getCalendarEvents(),
    getCalendarSyncStatus(),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const todayCount = events.filter((e) => e.date === today).length;
  const overdueCount = events.filter((e) => e.date < today).length;
  const upcomingCount = events.filter((e) => e.date > today).length;
  const interviewCount = events.filter((e) => e.type === "interview").length;

  const statCards = [
    {
      title: "Today",
      value: todayCount,
      icon: FiClock,
      iconColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "ring-blue-500/20",
    },
    {
      title: "Overdue",
      value: overdueCount,
      icon: FiAlertTriangle,
      iconColor: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "ring-red-500/20",
    },
    {
      title: "Upcoming",
      value: upcomingCount,
      icon: FiArrowRight,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "ring-emerald-500/20",
    },
    {
      title: "Interviews",
      value: interviewCount,
      icon: FiCalendar,
      iconColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "ring-amber-500/20",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
          {/* Header */}
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between pt-16 md:pt-0">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Calendar</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                <FiCalendar className="w-4 h-4 text-primary" />
                Your follow-up schedule at a glance
              </p>
            </div>
            {!syncStatus.hasGoogle && (
              <Link
                href="/settings"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Connect Google to sync to Calendar &rarr;
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card
                key={stat.title}
                className={cn(
                  "h-[120px] md:h-[140px] border-none ring-1 transition-all hover:shadow-md flex flex-col justify-between",
                  stat.borderColor,
                  stat.bgColor
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                  <CardTitle className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={cn("hidden md:flex p-2 rounded-xl bg-background/80", stat.iconColor)}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 md:px-6 md:pb-5">
                  <div className="text-2xl md:text-4xl font-bold tracking-tight">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Calendar + Events */}
          <CalendarView
            events={events}
            calendarSyncEnabled={syncStatus.enabled && syncStatus.hasGoogle}
          />
        </div>
      </main>
    </div>
  );
}
