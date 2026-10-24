import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getOutreachAnalyticsRecords } from "@/actions/analytics";
import { OutreachAnalyticsDashboard } from "@/components/outreach-analytics";

async function StatsContent() {
  const records = await getOutreachAnalyticsRecords();
  return <OutreachAnalyticsDashboard records={records} />;
}

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/stats");
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <Sidebar />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-8">
        <div className="mx-auto max-w-7xl pt-16 md:pt-0">
          <Suspense fallback={<p className="text-muted-foreground" role="status">Loading statistics...</p>}><StatsContent /></Suspense>
        </div>
      </main>
    </div>
  );
}
