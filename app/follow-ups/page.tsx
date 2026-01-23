import { getFollowUpItems } from "@/actions/follow-ups";
import { Sidebar } from "@/components/sidebar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { FiArrowRight, FiClock, FiAlertCircle, FiCalendar } from "react-icons/fi";
import Link from "next/link";
import { OutreachActions } from "@/components/outreach-actions";

export default async function FollowUpsPage() {
  const { today, overdue, upcoming } = await getFollowUpItems();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-muted/5 p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-8">Follow-up Queue</h1>

        <div className="space-y-10">
            {/* Overdue Section */}
            {overdue.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-2 w-2 rounded-full bg-destructive" />
                        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Overdue</h2>
                    </div>
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden divide-y divide-border">
                        {overdue.map(item => (
                            <div key={item.id} className="p-6 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                <div className="space-y-1">
                                    <div className="font-semibold text-lg tracking-tight">{item.companyName}</div>
                                    <div className="text-sm text-muted-foreground">{item.personName} • {item.roleTargeted}</div>
                                    <div className="flex items-center gap-2 mt-2 text-xs font-medium text-destructive">
                                        <FiAlertCircle className="h-3 w-3" />
                                        Due {format(item.followUpDueAt, "MMM d")}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <StatusBadge status={item.status} />
                                    <OutreachActions id={item.id} currentStatus={item.status} />
                                    <Button variant="outline" size="sm" asChild className="h-8">
                                        <Link href={`/outreach/${item.id}`}>View</Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Due Today Section */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Due Today</h2>
                </div>
                {today.length === 0 ? (
                    <div className="text-muted-foreground text-sm italic px-4">No follow-ups due today. You're all caught up!</div>
                ) : (
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden divide-y divide-border">
                        {today.map(item => (
                             <div key={item.id} className="p-6 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                <div className="space-y-1">
                                    <div className="font-semibold text-lg tracking-tight">{item.companyName}</div>
                                    <div className="text-sm text-muted-foreground">{item.personName} • {item.roleTargeted}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <StatusBadge status={item.status} />
                                    <OutreachActions id={item.id} currentStatus={item.status} />
                                    <Button variant="outline" size="sm" asChild className="h-8">
                                        <Link href={`/outreach/${item.id}`}>View</Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Upcoming Section */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Upcoming</h2>
                </div>
                 {upcoming.length === 0 ? (
                    <div className="text-muted-foreground text-sm italic px-4">No upcoming follow-ups.</div>
                ) : (
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden divide-y divide-border">
                        {upcoming.slice(0, 5).map(item => (
                            <div key={item.id} className="p-6 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                <div className="space-y-1">
                                    <div className="font-semibold text-lg tracking-tight">{item.companyName}</div>
                                    <div className="text-sm text-muted-foreground">{item.personName}</div>
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                        <FiCalendar className="h-3 w-3" />
                                        {format(item.followUpDueAt, "MMM d")}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <StatusBadge status={item.status} />
                                    <Button variant="ghost" size="sm" asChild className="h-8 text-muted-foreground hover:text-foreground">
                                        <Link href={`/outreach/${item.id}`}>View Details</Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
      </main>
    </div>
  );
}
