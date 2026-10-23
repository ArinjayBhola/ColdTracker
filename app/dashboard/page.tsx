import { getAccountPreferences } from "@/actions/preferences";
import { DEFAULT_PREFERENCES } from "@/lib/preferences";
import { Suspense } from "react";
import { getGroupedOutreachByCompany } from "@/actions/outreach";
import { Sidebar } from "@/components/sidebar";
import { FiTrendingUp } from "react-icons/fi";
import Link from "next/link";
import { ExportExcel } from "@/components/export-excel";
import { OutreachTable } from "@/components/outreach-table";
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button";
import { getDashboardGoalsData } from "@/actions/goals";
import { QuickLog } from "@/components/quick-log";
import { getDashboardDueCount } from "@/actions/follow-ups";


async function DashboardGoalsSection() {
  const [{ daily, weekly }, due] = await Promise.all([getDashboardGoalsData(), getDashboardDueCount()]);
  return <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-card px-5 py-3 text-sm">
    <span>Today: <strong>{daily.current}/{daily.target}</strong></span>
    <span>This week: <strong>{weekly.current}/{weekly.target}</strong></span>
    <Link href="/follow-ups">Follow-ups due: <strong>{due}</strong></Link>
    <Link href="/stats" className="text-primary md:ml-auto">View stats &rarr;</Link>
  </div>;
}

async function DashboardOutreachTableSection({ page, filter, q, start, end }: { page: number; filter: string; q?: string; start?: string; end?: string }) {
  const preferences = (await getAccountPreferences())?.preferences ?? DEFAULT_PREFERENCES;
  const pageSize = preferences.table.pageSize;
  const activeFilter = filter || preferences.table.defaultMethod;
  let result = await getGroupedOutreachByCompany(page, pageSize, activeFilter, { q, start, end });
  const currentPage = Math.min(Math.max(1, page), Math.max(1, Math.ceil(result.totalCount / pageSize)));
  if (currentPage !== page) result = await getGroupedOutreachByCompany(currentPage, pageSize, activeFilter, { q, start, end });
  const { items: outreachItems, totalCount } = result;
  return (
    <OutreachTable key={`${q || ""}:${start || ""}:${end || ""}:${activeFilter}:${currentPage}`}
      items={outreachItems} 
      totalCount={totalCount} 
      currentPage={currentPage}
      pageSize={pageSize} 
    />
  );
}

export default async function DashboardPage(
  props: {
    searchParams: Promise<{ page?: string; filter?: string; q?: string; start?: string; end?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Math.floor(Number(searchParams.page) || 1));
  const filter = searchParams.filter || "";

  return (
    <div className="app-page">
      <Sidebar />
      <main className="app-main">
        <div className="app-container">
            {/* Header */}
            <div className="flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                    <p className="eyebrow">Overview</p>
                    <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">Outreach</h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <FiTrendingUp className="w-4 h-4 text-primary" />
                        Log conversations and keep your next steps in view
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <DashboardRefreshButton />
                    <details className="relative"><summary className="cursor-pointer text-sm text-muted-foreground">More</summary><div className="absolute right-0 top-8 z-20 rounded-xl border bg-card p-3 shadow-lg"><ExportExcel fileName="cold-track-export" /></div></details>
                    <QuickLog />
                </div>
            </div>

            {/* Goals & Streaks */}
            <Suspense fallback={<div className="w-full h-12 bg-muted/50 animate-pulse rounded-xl" />}>
              <DashboardGoalsSection />
            </Suspense>

            {/* Outreach Table */}
            <div>
              <Suspense fallback={<div className="w-full h-[400px] bg-muted/50 animate-pulse rounded-xl" />}>
                <DashboardOutreachTableSection page={page} filter={filter} q={searchParams.q} start={searchParams.start} end={searchParams.end} />
              </Suspense>
            </div>
        </div>
      </main>
    </div>
  );
}
