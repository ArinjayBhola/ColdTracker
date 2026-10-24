import { Suspense } from "react";
import { getDashboardOutreachPage } from "@/actions/outreach";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { FiPlus, FiTrendingUp } from "react-icons/fi";
import Link from "next/link";
import { ExportExcel } from "@/components/export-excel";
import { OutreachTable } from "@/components/outreach-table";
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button";
import { getDashboardGoalsData } from "@/actions/goals";
import { GoalsStreaksCard } from "@/components/goals-streaks-card";


async function DashboardGoalsSection() {
  const { daily, weekly, streak, last7Days } = await getDashboardGoalsData();

  return (
    <GoalsStreaksCard
      dailyProgress={daily}
      weeklyProgress={weekly}
      streakData={streak}
      last7Days={last7Days}
    />
  );
}

async function DashboardOutreachTableSection({ page, filter }: { page: number, filter: string }) {
  const { items: outreachItems, totalCount, currentPage, pageSize } = await getDashboardOutreachPage(page, filter);
  return (
    <OutreachTable 
      items={outreachItems} 
      totalCount={totalCount} 
      currentPage={currentPage}
      pageSize={pageSize} 
    />
  );
}

export default async function DashboardPage(
  props: {
    searchParams: Promise<{ page?: string; filter?: string }>;
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
            {/* Header */}
            <div className="flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                    <p className="eyebrow">Overview</p>
                    <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <FiTrendingUp className="w-4 h-4 text-primary" />
                        Real-time job search performance metrics
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <DashboardRefreshButton />
                    <ExportExcel fileName="cold-track-export" />
                    <Button asChild className="gap-2 h-11 px-5 flex-1 md:flex-none justify-center">
                        <Link href="/outreach/new">
                        <FiPlus className="h-5 w-5" />
                        New Outreach
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Goals & Streaks */}
            <Suspense fallback={<div className="w-full h-[300px] bg-muted/50 animate-pulse rounded-xl" />}>
              <DashboardGoalsSection />
            </Suspense>

            {/* Outreach Table */}
            <div>
              <Suspense fallback={<div className="w-full h-[400px] bg-muted/50 animate-pulse rounded-xl" />}>
                <DashboardOutreachTableSection page={page} filter={filter} />
              </Suspense>
            </div>
        </div>
      </main>
    </div>
  );
}
