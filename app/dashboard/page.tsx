import { getOutreachItems, getStats } from "@/actions/outreach";
import { Sidebar } from "@/components/sidebar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { FiArrowUpRight, FiPlus, FiSend, FiMessageCircle, FiVideo, FiAward, FiTrendingUp } from "react-icons/fi";
import Link from "next/link";
import { OutreachActions } from "@/components/outreach-actions";
import { cn } from "@/lib/utils";
import { ExportExcel } from "@/components/export-excel";

export default async function DashboardPage() {
  const outreachItems = await getOutreachItems();
  const stats = await getStats();

  const statCards = [
    {
      title: "Total Sent",
      value: stats.sent,
      icon: FiSend,
      gradient: "from-blue-500/10 to-cyan-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Replies",
      value: stats.replies,
      icon: FiMessageCircle,
      gradient: "from-purple-500/10 to-pink-500/10",
      iconColor: "text-purple-600 dark:text-purple-400",
      borderColor: "border-purple-500/20",
    },
    {
      title: "Interviews",
      value: stats.interviews,
      icon: FiVideo,
      gradient: "from-amber-500/10 to-orange-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
      borderColor: "border-amber-500/20",
    },
    {
      title: "Offers",
      value: stats.offers,
      icon: FiAward,
      gradient: "from-emerald-500/10 to-green-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-500/20",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-10 animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-lg flex items-center gap-2">
              <FiTrendingUp className="w-5 h-5" />
              Track your job search progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportExcel data={outreachItems} fileName="cold-track-export" />
            <Button asChild className="gap-2 h-12 px-6 shadow-lg">
                <Link href="/outreach/new">
                <FiPlus className="h-5 w-5" />
                New Outreach
                </Link>
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10 animate-slide-in">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.title} 
              className={cn(
                "hover-lift border-2 overflow-hidden relative group",
                stat.borderColor
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={cn("absolute inset-0 opacity-50", stat.gradient)} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn("p-2.5 rounded-xl bg-background/80 backdrop-blur-sm", stat.iconColor)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
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
        <div className="rounded-2xl border-2 border-border/50 bg-card/50 backdrop-blur-sm shadow-premium overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-border/50 bg-muted/30">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full bg-primary" />
              Recent Outreach
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {outreachItems.length} total applications tracked
            </p>
          </div>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="border-b border-border/50 bg-muted/30">
                <tr>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Company</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Follow Up</th>
                  <th className="h-14 px-6 text-right align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {outreachItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                          <FiSend className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground mb-1">No outreach tracked yet</p>
                          <p className="text-muted-foreground">Start applying and track your progress!</p>
                        </div>
                        <Button asChild className="mt-2">
                          <Link href="/outreach/new">
                            <FiPlus className="w-4 h-4" />
                            Add Your First Outreach
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  outreachItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/30 transition-all duration-200 hover:bg-muted/30 group"
                    >
                      <td className="p-6 align-middle">
                          <div className="flex flex-col gap-1">
                              <span className="text-base font-semibold tracking-tight group-hover:text-primary transition-colors">{item.companyName}</span>
                              {item.companyLink && (
                                  <a 
                                    href={item.companyLink} 
                                    target="_blank" 
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors truncate max-w-[200px] flex items-center gap-1"
                                  >
                                      {item.companyLink.replace(/^https?:\/\//, '')}
                                      <FiArrowUpRight className="w-3 h-3" />
                                  </a>
                              )}
                          </div>
                      </td>
                      <td className="p-6 align-middle">
                        <div className="flex flex-col gap-1">
                            <span className="font-semibold text-foreground">{item.roleTargeted}</span>
                            <span className="text-xs text-muted-foreground">{item.personName} • {item.personRole}</span>
                        </div>
                      </td>
                      <td className="p-6 align-middle">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="p-6 align-middle">
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          {format(item.messageSentAt, "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="p-6 align-middle">
                         {item.status !== "REPLIED" && item.status !== "CLOSED" && item.status !== "REJECTED" ? (
                             <span className={cn(
                                 "text-xs font-semibold px-3 py-1.5 rounded-full border backdrop-blur-sm",
                                 new Date(item.followUpDueAt) < new Date() 
                                    ? "bg-destructive/10 text-destructive border-destructive/30" 
                                    : "bg-background text-muted-foreground border-border"
                             )}>
                                 {format(item.followUpDueAt, "MMM d")}
                             </span>
                         ) : (
                             <span className="text-muted-foreground">-</span>
                         )}
                      </td>
                      <td className="p-6 align-middle text-right">
                          <OutreachActions id={item.id} currentStatus={item.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
