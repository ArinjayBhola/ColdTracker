import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { getDashboardFocus } from "@/actions/dashboard-focus";
export async function DashboardFocus() {
  const data = await getDashboardFocus();
  return <section aria-label="Your outreach at a glance" className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-3">
    {[{ label: "Today", count: data.daily, target: data.dailyTarget, detail: "daily goal" }, { label: "This week", count: data.weekly, target: data.weeklyTarget, detail: "weekly goal" }].map((goal, index) =>
      <div key={goal.label} className={`px-4 py-4 sm:px-5 ${index ? "border-l" : ""}`}>
        <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{goal.label}</span><span className="hidden text-xs text-muted-foreground sm:inline">{goal.detail}</span></div>
        <div className="mt-2 flex items-baseline gap-1.5"><strong className="text-2xl tabular-nums">{goal.count}</strong><span className="text-sm text-muted-foreground">/ {goal.target} <span className="hidden min-[380px]:inline">outreach</span></span></div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, goal.count / Math.max(1, goal.target) * 100)}%` }} /></div>
      </div>)}
    <div className="col-span-2 flex flex-col justify-between border-t px-4 py-4 sm:col-span-1 sm:border-l sm:border-t-0 sm:px-5">
      <div className="hidden items-center justify-between text-xs text-muted-foreground sm:flex"><span>Next up</span><CalendarClock className="h-3.5 w-3.5" /></div>
      <div className="flex items-center justify-between gap-3 sm:block">
        <Link href="/follow-ups" className="flex items-baseline gap-1.5 hover:text-primary sm:mt-2"><strong className="text-xl tabular-nums sm:text-2xl">{data.due}</strong><span className="text-xs text-muted-foreground sm:text-sm">follow-ups due</span></Link>
        <Link href="/stats#goals" className="flex items-center gap-1 whitespace-nowrap text-xs text-primary sm:mt-3">Activity & goals <ArrowUpRight className="h-3 w-3" /></Link>
      </div>
    </div>
  </section>;
}
