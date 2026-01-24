import { getFollowUpItems } from "@/actions/follow-ups";
import { Sidebar } from "@/components/sidebar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FiAlertCircle, FiCalendar, FiClock, FiCheckCircle } from "react-icons/fi";
import Link from "next/link";
import { OutreachActions } from "@/components/outreach-actions";
import { cn } from "@/lib/utils";

export default async function FollowUpsPage() {
  const { today, overdue, upcoming } = await getFollowUpItems();

  const sections = [
    {
      title: "Overdue",
      items: overdue,
      icon: FiAlertCircle,
      color: "text-destructive",
      dotColor: "bg-destructive",
      emptyMessage: "No overdue follow-ups. Great job!",
    },
    {
      title: "Due Today",
      items: today,
      icon: FiClock,
      color: "text-primary",
      dotColor: "bg-primary",
      emptyMessage: "No follow-ups due today. You're all caught up!",
    },
    {
      title: "Upcoming",
      items: upcoming.slice(0, 10),
      icon: FiCalendar,
      color: "text-muted-foreground",
      dotColor: "bg-muted-foreground/30",
      emptyMessage: "No upcoming follow-ups scheduled.",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Header */}
          <div className="space-y-2 animate-fade-in">
            <h1 className="text-4xl font-bold tracking-tight">Follow-up Queue</h1>
            <p className="text-muted-foreground text-lg flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5" />
              Stay on top of your outreach timeline
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((section, sectionIndex) => (
              <section key={section.title} className="animate-slide-in" style={{ animationDelay: `${sectionIndex * 100}ms` }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={cn("w-3 h-3 rounded-full", section.dotColor)} />
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <section.icon className={cn("w-5 h-5", section.color)} />
                    {section.title}
                    <span className="text-sm font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                      {section.items.length}
                    </span>
                  </h2>
                </div>

                {section.items.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-8 text-center">
                    <p className="text-muted-foreground italic">{section.emptyMessage}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-border/50 bg-card/50 backdrop-blur-sm shadow-premium overflow-hidden">
                    <div className="divide-y divide-border/30">
                      {section.items.map((item, index) => (
                        <div 
                          key={item.id} 
                          className="p-6 flex items-center justify-between hover:bg-muted/30 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-6 flex-1">
                            {/* Timeline Indicator */}
                            <div className="flex flex-col items-center gap-2">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border-2",
                                section.title === "Overdue" 
                                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                                  : section.title === "Due Today"
                                  ? "bg-primary/10 border-primary/30 text-primary"
                                  : "bg-muted border-border text-muted-foreground"
                              )}>
                                <FiCalendar className="w-5 h-5" />
                              </div>
                              {index < section.items.length - 1 && (
                                <div className="w-0.5 h-8 bg-border/50" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <h3 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">
                                    {item.companyName}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {item.personName} • {item.roleTargeted}
                                  </p>
                                </div>
                                <StatusBadge status={item.status} />
                              </div>

                              <div className="flex items-center gap-4 text-xs">
                                <div className={cn(
                                  "flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-full border backdrop-blur-sm",
                                  section.title === "Overdue"
                                    ? "bg-destructive/10 text-destructive border-destructive/30"
                                    : "bg-muted text-muted-foreground border-border"
                                )}>
                                  <FiClock className="w-3.5 h-3.5" />
                                  {section.title === "Overdue" && "Overdue: "}
                                  {format(item.followUpDueAt, "MMM d, yyyy")}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-3 ml-6">
                            <OutreachActions id={item.id} currentStatus={item.status} />
                            <Button variant="outline" size="sm" asChild className="h-9">
                              <Link href={`/outreach/${item.id}`}>View Details</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
