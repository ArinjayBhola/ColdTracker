import { Suspense } from "react";
import { getGroupedOutreachByCompany, getStats } from "@/actions/outreach";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiPlus, FiSend, FiMessageCircle, FiVideo, FiAward, FiTrendingUp, FiLinkedin } from "react-icons/fi";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ExportExcel } from "@/components/export-excel";
import { OutreachTable } from "@/components/outreach-table";
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button";
import { getExtensionLeadsAction } from "@/actions/extension-leads";
import { getDashboardGoalsData } from "@/actions/goals";
import { GoalsStreaksCard } from "@/components/goals-streaks-card";
import { StaggerContainer, StaggerItem } from "@/components/motion-wrapper";

async function DashboardStatsCards() {
  const [stats, { totalCount: leadsCount }] = await Promise.all([
    getStats(),
    getExtensionLeadsAction(1, 1),
  ]);

  const statCards = [
    {
      title: "Total Sent",
      value: stats.sent,
      icon: FiSend,
      iconColor: "text-primary",
    },
    {
      title: "Replies",
      value: stats.replies,
      icon: FiMessageCircle,
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      title: "Interviews",
      value: stats.interviews,
      icon: FiVideo,
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Offers",
      value: stats.offers,
      icon: FiAward,
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Ext. Leads",
      value: leadsCount,
      icon: FiLinkedin,
      iconColor: "text-sky-600 dark:text-sky-400",
    },
  ];

  return (
    <StaggerContainer className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-5">
      {statCards.map((stat) => (
        <StaggerItem key={stat.title}>
          <Card
            className="h-[142px] md:h-[154px] flex flex-col justify-between"
          >
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                {stat.title}
              </CardTitle>

              <div
                className={cn(
                  "hidden md:flex h-9 w-9 items-center justify-center rounded-md border bg-background",
                  stat.iconColor
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 flex flex-col justify-end flex-1">
              <div className="text-3xl md:text-4xl font-bold">
                {stat.value}
              </div>

              {/* Always reserve space for percentage row */}
              <div className="h-5 mt-1 md:mt-2">
                {stats.sent > 0 &&
                  stat.title !== "Total Sent" &&
                  stat.title !== "Ext. Leads" && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <FiTrendingUp className="w-3 h-3" />
                      {((stat.value / stats.sent) * 100).toFixed(1)}%
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}

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
  const { items: outreachItems, totalCount } = await getGroupedOutreachByCompany(page, 10, filter);
  return (
    <OutreachTable 
      items={outreachItems} 
      totalCount={totalCount} 
      currentPage={page} 
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
  const filter = searchParams.filter || "ALL";

  return (
    <div className="app-page">
      <Sidebar />
      <main className="app-main">
        <div className="app-container">
            {/* Header */}
            <div className="flex flex-col gap-5 border-b pb-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-extrabold">Dashboard</h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <FiTrendingUp className="w-4 h-4" />
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

            {/* Stats Section */}
            <Suspense fallback={<div className="w-full h-[150px] md:h-[170px] bg-muted/50 animate-pulse rounded-xl" />}>
              <DashboardStatsCards />
            </Suspense>

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
