import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getOutreachAnalyticsRecords } from "@/actions/analytics";
import { getDashboardGoalsData } from "@/actions/goals";
import { GoalsStreaksCard } from "@/components/goals-streaks-card";
import { OutreachAnalyticsDashboard } from "@/components/outreach-analytics";
import styles from "./stats.module.css";

async function StatsContent() {
  const [records, goals] = await Promise.all([getOutreachAnalyticsRecords(), getDashboardGoalsData()]);
  return (
    <div className={styles.workspace}>
      <OutreachAnalyticsDashboard records={records} />
      <section id="goals" className="scroll-mt-8 space-y-5 border-t pt-8" aria-labelledby="goals-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1"><p className="eyebrow">Keep the momentum</p><h2 id="goals-heading" className="text-xl">Goals & consistency</h2></div>
          <p className="text-sm text-muted-foreground">Small steps, every day. Track your targets and streaks.</p>
        </div>
        <GoalsStreaksCard dailyProgress={goals.daily} weeklyProgress={goals.weekly} streakData={goals.streak} />
      </section>
    </div>
  );
}

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/stats");
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <Sidebar />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-12 pt-20 md:px-8 md:pt-10 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={<div role="status" className="space-y-6"><p className="text-sm text-muted-foreground">Loading statistics...</p><div className="h-28 rounded-2xl bg-muted/60" /><div className="h-80 rounded-2xl bg-muted/40" /></div>}><StatsContent /></Suspense>
        </div>
      </main>
    </div>
  );
}
