import { Sidebar } from "@/components/sidebar";
import { getStats } from "@/actions/outreach";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiSend, FiMessageCircle, FiVideo, FiAward, FiTrendingUp, FiPercent, FiTarget } from "react-icons/fi";
import { cn } from "@/lib/utils";

export default async function StatsPage() {
  const stats = await getStats();

  const responseRate = stats.sent > 0 ? ((stats.replies / stats.sent) * 100).toFixed(1) : 0;
  const interviewRate = stats.sent > 0 ? ((stats.interviews / stats.sent) * 100).toFixed(1) : 0;
  const offerRate = stats.sent > 0 ? ((stats.offers / stats.sent) * 100).toFixed(1) : 0;

  const mainStats = [
    {
      title: "Total Outreach",
      value: stats.sent,
      icon: FiSend,
      iconColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      description: "Applications sent",
    },
    {
      title: "Response Rate",
      value: `${responseRate}%`,
      icon: FiPercent,
      iconColor: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      description: `${stats.replies} replies received`,
    },
    {
      title: "Interview Rate",
      value: `${interviewRate}%`,
      icon: FiVideo,
      iconColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      description: `${stats.interviews} interviews scheduled`,
    },
    {
      title: "Offer Rate",
      value: `${offerRate}%`,
      icon: FiAward,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      description: `${stats.offers} offers received`,
    },
  ];

  const detailStats = [
    { label: "Total Sent", value: stats.sent, color: "text-blue-600 dark:text-blue-400" },
    { label: "Replies", value: stats.replies, color: "text-purple-600 dark:text-purple-400" },
    { label: "Interviews", value: stats.interviews, color: "text-amber-600 dark:text-amber-400" },
    { label: "Offers", value: stats.offers, color: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Statistics</h1>
            <p className="text-muted-foreground text-lg flex items-center gap-2">
              <FiTrendingUp className="w-5 h-5" />
              Analyze your job search performance
            </p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {mainStats.map((stat) => (
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
                  <div className="text-4xl font-bold tracking-tight mb-2">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Breakdown */}
          <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
            {/* Conversion Funnel */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FiTarget className="w-5 h-5 text-primary" />
                  Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {detailStats.map((stat, index) => {
                  const percentage = stats.sent > 0 ? (stat.value / stats.sent) * 100 : 0;
                  return (
                    <div key={stat.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{stat.label}</span>
                        <span className={cn("font-bold", stat.color)}>{stat.value}</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000 ease-out", stat.color.replace('text-', 'bg-'))}
                          style={{ 
                            width: `${percentage}%`,
                            animationDelay: `${index * 200}ms`
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}% of total outreach
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Success Metrics */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FiTrendingUp className="w-5 h-5 text-primary" />
                  Success Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Response Rate</p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{responseRate}%</p>
                    </div>
                    <FiMessageCircle className="w-10 h-10 text-purple-600/30 dark:text-purple-400/30" />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Interview Rate</p>
                      <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{interviewRate}%</p>
                    </div>
                    <FiVideo className="w-10 h-10 text-amber-600/30 dark:text-amber-400/30" />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Offer Rate</p>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{offerRate}%</p>
                    </div>
                    <FiAward className="w-10 h-10 text-emerald-600/30 dark:text-emerald-400/30" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          {stats.sent > 0 && (
            <Card className="border-2 border-primary/20 bg-primary/5 animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-6 rounded-full bg-primary" />
                  Quick Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm border">
                    <p className="text-sm text-muted-foreground mb-1">Average Success</p>
                    <p className="text-2xl font-bold">
                      {((stats.offers / Math.max(stats.sent, 1)) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Sent to Offer conversion</p>
                  </div>
                  <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm border">
                    <p className="text-sm text-muted-foreground mb-1">Active Pipeline</p>
                    <p className="text-2xl font-bold">
                      {stats.sent - stats.replies - stats.interviews - stats.offers}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
                  </div>
                  <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm border">
                    <p className="text-sm text-muted-foreground mb-1">Engagement Rate</p>
                    <p className="text-2xl font-bold">
                      {(((stats.replies + stats.interviews + stats.offers) / Math.max(stats.sent, 1)) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total engagement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
