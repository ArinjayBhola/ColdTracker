import { getOutreachItems, getStats } from "@/actions/outreach";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiPlus, FiSend, FiMessageCircle, FiVideo, FiAward, FiTrendingUp } from "react-icons/fi";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ExportExcel } from "@/components/export-excel";
import { OutreachTable } from "@/components/outreach-table";

export default async function DashboardPage() {
  const outreachItems = await getOutreachItems();
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
      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-10">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-lg flex items-center gap-2">
              <FiTrendingUp className="w-5 h-5" />
              Track your job search progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportExcel data={outreachItems} fileName="cold-track-export" />
            <Button asChild className="gap-2 h-12 px-6">
                <Link href="/outreach/new">
                <FiPlus className="h-5 w-5" />
                New Outreach
                </Link>
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
          {statCards.map((stat) => (
            <Card 
              key={stat.title} 
              className={cn(
                "border-2 overflow-hidden",
                stat.borderColor,
                stat.bgColor
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn("p-2.5 rounded-xl bg-background/80", stat.iconColor)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold tracking-tight">{stat.value}</div>
                {stats.sent > 0 && stat.title !== "Total Sent" && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <FiTrendingUp className="w-3 h-3" />
                    {((stat.value / stats.sent) * 100).toFixed(1)}% conversion
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Outreach Table */}
        <OutreachTable items={outreachItems} />
      </main>
    </div>
  );
}
