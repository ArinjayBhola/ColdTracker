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
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 pt-16 md:pt-0">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Statistics</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <FiTrendingUp className="w-4 h-4 text-primary" />
              Detailed analysis of your search lifecycle
            </p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
            {mainStats.map((stat) => (
              <Card 
                key={stat.title}
                className={cn(
                  "border-none ring-1 transition-all hover:shadow-md",
                  stat.borderColor.replace('border-', 'ring-'),
                  stat.bgColor
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 md:pb-3">
                  <CardTitle className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={cn("hidden md:flex p-2 rounded-lg bg-background/80 shadow-sm", stat.iconColor)}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                  <div className="text-2xl md:text-4xl font-extrabold tracking-tight mb-1 md:mb-2">{stat.value}</div>
                  <p className="text-[10px] md:text-[11px] font-medium text-muted-foreground/60 line-clamp-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Breakdown */}
          <div className="grid gap-6 md:grid-gap-8 md:grid-cols-2 animate-fade-in">
            {/* Conversion Funnel */}
            <Card className="border-none ring-1 ring-border/50 shadow-premium">
              <CardHeader className="pb-4 md:pb-8">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <FiTarget className="w-5 h-5 text-primary" />
                  Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8 p-4 md:p-6">
                {detailStats.map((stat, index) => {
                  const percentage = stats.sent > 0 ? (stat.value / stats.sent) * 100 : 0;
                  return (
                    <div key={stat.label} className="space-y-2 md:space-y-3">
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <span className="font-bold text-foreground/80">{stat.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 rounded-full bg-muted", stat.color)}>{stat.value}</span>
                          <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground/40">{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 md:h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000 ease-out", stat.color.replace('text-', 'bg-'))}
                          style={{ 
                            width: `${percentage}%`,
                            animationDelay: `${index * 150}ms`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Success Metrics */}
            <Card className="border-none ring-1 ring-border/50 shadow-premium">
              <CardHeader className="pb-4 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-bold">
                  <FiTrendingUp className="w-5 h-5 text-primary" />
                  Success Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
                <div className="grid gap-3 md:grid-cols-1">
                  <div className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Response Rate</p>
                      <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">{responseRate}%</p>
                    </div>
                    <FiMessageCircle className="w-8 h-8 md:w-10 md:h-10 text-purple-600/30 dark:text-purple-400/30" />
                  </div>

                  <div className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Interview Rate</p>
                      <p className="text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400">{interviewRate}%</p>
                    </div>
                    <FiVideo className="w-8 h-8 md:w-10 md:h-10 text-amber-600/30 dark:text-amber-400/30" />
                  </div>

                  <div className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Offer Rate</p>
                      <p className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{offerRate}%</p>
                    </div>
                    <FiAward className="w-8 h-8 md:w-10 md:h-10 text-emerald-600/30 dark:text-emerald-400/30" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          {stats.sent > 0 && (
            <Card className="border-2 border-primary/20 bg-primary/5 animate-fade-in">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <div className="w-2 h-6 rounded-full bg-primary" />
                  Quick Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="p-3 md:p-4 rounded-xl bg-background/50 backdrop-blur-sm border">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Average Success</p>
                    <p className="text-xl md:text-2xl font-bold">
                      {((stats.offers / Math.max(stats.sent, 1)) * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Sent to Offer conversion</p>
                  </div>
                  <div className="p-3 md:p-4 rounded-xl bg-background/50 backdrop-blur-sm border">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Active Pipeline</p>
                    <p className="text-xl md:text-2xl font-bold">
                      {stats.sent - stats.replies - stats.interviews - stats.offers}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Awaiting response</p>
                  </div>
                  <div className="p-3 md:p-4 rounded-xl bg-background/50 backdrop-blur-sm border">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Engagement Rate</p>
                    <p className="text-xl md:text-2xl font-bold">
                      {(((stats.replies + stats.interviews + stats.offers) / Math.max(stats.sent, 1)) * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Total engagement</p>
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
