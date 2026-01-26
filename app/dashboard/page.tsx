import { getGroupedOutreachByCompany, getStats } from "@/actions/outreach";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiPlus, FiSend, FiMessageCircle, FiVideo, FiAward, FiTrendingUp } from "react-icons/fi";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ExportExcel } from "@/components/export-excel";
import { OutreachTable } from "@/components/outreach-table";
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button";

export default async function DashboardPage() {
  const outreachItems = await getGroupedOutreachByCompany();
  const stats = await getStats();

  const statCards = [
    {
      title: "Total Sent",
      value: stats.sent,
      icon: FiSend,
      iconColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Replies",
      value: stats.replies,
      icon: FiMessageCircle,
      iconColor: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
    {
      title: "Interviews",
      value: stats.interviews,
      icon: FiVideo,
      iconColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      title: "Offers",
      value: stats.offers,
      icon: FiAward,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
            {/* Header */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between pt-12 md:pt-0">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <FiTrendingUp className="w-4 h-4 text-primary" />
                        Real-time job search performance metrics
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <DashboardRefreshButton />
                    <ExportExcel data={outreachItems} fileName="cold-track-export" />
                    <Button asChild className="gap-2 h-11 px-6 font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all flex-1 md:flex-none justify-center">
                        <Link href="/outreach/new">
                        <FiPlus className="h-5 w-5" />
                        New Outreach
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Section */}
            <div className="grid gap-4 md:grid-gap-6 grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <Card 
                    key={stat.title} 
                    className={cn(
                        "border-none ring-1 transition-all hover:shadow-md",
                        stat.borderColor.replace('border-', 'ring-'),
                        stat.bgColor
                    )}
                    >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 md:pb-3">
                        <CardTitle className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        {stat.title}
                        </CardTitle>
                        <div className={cn("hidden md:flex p-2.5 rounded-xl bg-background/80", stat.iconColor)}>
                        <stat.icon className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                        <div className="text-2xl md:text-4xl font-bold tracking-tight">{stat.value}</div>
                        {stats.sent > 0 && stat.title !== "Total Sent" && (
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2 flex items-center gap-1">
                            <FiTrendingUp className="w-3 h-3" />
                            {((stat.value / stats.sent) * 100).toFixed(1)}%
                        </p>
                        )}
                    </CardContent>
                    </Card>
                ))}
            </div>

            {/* Outreach Table */}
            <div className="hidden md:block">
                <OutreachTable items={outreachItems} />
            </div>

            {/* Mobile View Placeholder or Mobile Table */}
            <div className="md:hidden">
                <OutreachTable items={outreachItems} />
            </div>
        </div>
      </main>
    </div>
  );
}
