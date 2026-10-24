import { Suspense } from "react";
import { getDashboardOutreachPage } from "@/actions/outreach";
import { Sidebar } from "@/components/sidebar";
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button";
import { OutreachTable } from "@/components/outreach-table";
import { DashboardFocus } from "@/components/dashboard-focus";
import { QuickOutreach } from "@/components/quick-outreach";


async function DashboardOutreachTableSection({ page, filter, q, start, end }: { page: number; filter: string; q?: string; start?: string; end?: string }) {
  const { items: outreachItems, totalCount, currentPage, pageSize, timeZone } = await getDashboardOutreachPage(page, filter, { q, start, end });
  return (
    <OutreachTable
      items={outreachItems}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={pageSize}
      timeZone={timeZone}
    />
  );
}

export default async function DashboardPage(
  props: {
    searchParams: Promise<{ page?: string; filter?: string; q?: string; start?: string; end?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const filter = searchParams.filter || "";

  return (
    <div className="app-page">
      <Sidebar />
      <main className="app-main">
        <div className="app-container">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="mb-1 text-xs text-muted-foreground">YOUR WORKSPACE</p><h1 className="font-display text-3xl font-semibold tracking-tight">Dashboard</h1><p className="mt-2 text-sm text-muted-foreground">A little less tracking. A little more connecting.</p></div>
              <div className="flex items-center gap-2"><DashboardRefreshButton /><QuickOutreach /></div>
            </header>
            <Suspense fallback={<div className="h-28 animate-pulse rounded-xl bg-muted/50" />}><DashboardFocus /></Suspense>

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
