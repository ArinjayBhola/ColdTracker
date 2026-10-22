import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getOutreachAnalyticsRecords } from "@/actions/analytics";
import { OutreachAnalyticsDashboard } from "@/components/outreach-analytics";

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/stats");
  const records = await getOutreachAnalyticsRecords();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-7xl pt-16 md:pt-0">
          <OutreachAnalyticsDashboard records={records} />
        </div>
      </main>
    </div>
  );
}
