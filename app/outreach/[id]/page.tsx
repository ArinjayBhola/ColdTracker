import { getOutreachById } from "@/actions/get-outreach";
import { Sidebar } from "@/components/sidebar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { FiArrowLeft, FiExternalLink, FiMail, FiLinkedin, FiCalendar, FiClock } from "react-icons/fi";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OutreachActions } from "@/components/outreach-actions";
import { cn } from "@/lib/utils";

export default async function OutreachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getOutreachById(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-muted/5 p-8">
        <div className="max-w-4xl mx-auto">
            <div className="mb-10">
            <Button variant="ghost" size="sm" asChild className="mb-6 -ml-4 text-muted-foreground hover:text-foreground">
                <Link href="/dashboard" className="gap-2">
                        <FiArrowLeft className="h-4 w-4" />
                Back to Dashboard
                </Link>
            </Button>
            
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{item.companyName}</h1>
                    <div className="flex items-center gap-2 text-lg text-muted-foreground">
                        <span>{item.personName}</span>
                        <span className="text-border">•</span>
                        <span>{item.personRole}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <StatusBadge status={item.status} />
                    <OutreachActions id={item.id} currentStatus={item.status} />
                </div>
            </div>
            </div>

            <div className="grid gap-10 md:grid-cols-3">
                <div className="md:col-span-2 space-y-10">
                    {/* Details Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Details</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                            <div>
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">Target Role</label>
                                <span className="font-medium text-foreground">{item.roleTargeted}</span>
                            </div>
                            <div>
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">Website</label>
                                {item.companyLink ? (
                                    <a href={item.companyLink} target="_blank" className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors">
                                        Visit Page <FiExternalLink className="h-3 w-3" />
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">Contact Method</label>
                                <div className="flex items-center gap-2 font-medium">
                                    {item.contactMethod === 'EMAIL' ? <FiMail className="h-4 w-4" /> : <FiLinkedin className="h-4 w-4" />}
                                    {item.contactMethod}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">Email</label>
                                <span className="font-medium">{item.emailAddress || "-"}</span>
                            </div>
                            <div>
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">Sent Date</label>
                                <div className="flex items-center gap-2 font-medium">
                                    <FiCalendar className="h-4 w-4 text-muted-foreground" />
                                    {format(item.messageSentAt, "MMMM d, yyyy")}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">Follow-up Due</label>
                                <div className={cn("flex items-center gap-2 font-medium", new Date(item.followUpDueAt) < new Date() ? "text-destructive" : "")}>
                                    <FiClock className="h-4 w-4" />
                                    {format(item.followUpDueAt, "MMMM d, yyyy")}
                                </div>
                            </div>
                        </div>
                    </div>

                     {/* Notes Section */}
                     <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Notes</h2>
                        </div>
                         <div className="min-h-[150px] whitespace-pre-wrap text-sm leading-relaxed text-foreground bg-card border shadow-sm p-6 rounded-xl">
                            {item.notes || <span className="text-muted-foreground italic">No notes added.</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
