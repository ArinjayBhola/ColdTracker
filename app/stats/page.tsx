import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { readStatsSnapshot } from "@/lib/stats-query";
import { getUserTimeZone } from "@/lib/user-time-zone";
import { OutreachAnalyticsDashboard } from "@/components/outreach-analytics";
import styles from "./stats.module.css";

async function StatsContent({ owner }: { owner: string }) {
  const timeZone = await getUserTimeZone();
  const snapshot = timeZone ? await readStatsSnapshot(owner, timeZone) : null;
  return (
    <div className={styles.workspace}>
      <OutreachAnalyticsDashboard owner={owner} initialSnapshot={snapshot} />
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
          <Suspense fallback={<div role="status" className="space-y-6"><p className="text-sm text-muted-foreground">Loading statistics...</p><div className="h-28 rounded-2xl bg-muted/60" /><div className="h-80 rounded-2xl bg-muted/40" /></div>}><StatsContent owner={session.user.id} /></Suspense>
        </div>
      </main>
    </div>
  );
}
