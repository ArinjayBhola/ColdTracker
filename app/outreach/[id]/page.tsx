import { getOutreachById } from "@/actions/get-outreach";
import { Sidebar } from "@/components/sidebar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { FiArrowLeft, FiExternalLink, FiMail, FiLinkedin, FiCalendar, FiClock, FiFileText, FiUser, FiBriefcase } from "react-icons/fi";
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

  const isOverdue = new Date(item.followUpDueAt) < new Date();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-6">
              <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
                  <Link href="/dashboard">
                      <FiArrowLeft className="h-5 w-5" />
                      Back to Dashboard
                  </Link>
              </Button>
            
              <div className="flex items-start justify-between gap-6">
                  <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md">
                          <FiBriefcase className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h1 className="text-4xl font-bold tracking-tight">{item.companyName}</h1>
                          <p className="text-lg text-muted-foreground mt-1">{item.roleTargeted}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground ml-15">
                          <FiUser className="w-4 h-4" />
                          <span className="font-medium">{item.personName}</span>
                          <span>•</span>
                          <span>{item.personRole}</span>
                      </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <StatusBadge status={item.status} />
                      <OutreachActions id={item.id} currentStatus={item.status} />
                  </div>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Details */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Details Card */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <div className="w-1.5 h-6 rounded-full bg-primary" />
                                Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <FiBriefcase className="w-3.5 h-3.5" />
                                        Target Role
                                    </label>
                                    <p className="font-semibold text-lg">{item.roleTargeted}</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <FiExternalLink className="w-3.5 h-3.5" />
                                        Website
                                    </label>
                                    {item.companyLink ? (
                                        <a 
                                          href={item.companyLink} 
                                          target="_blank" 
                                          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors group"
                                        >
                                            Visit Page 
                                            <FiExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        {item.contactMethod === 'EMAIL' ? <FiMail className="w-3.5 h-3.5" /> : <FiLinkedin className="w-3.5 h-3.5" />}
                                        Contact Method
                                    </label>
                                    <div className="flex items-center gap-2 font-semibold">
                                        {item.contactMethod}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <FiMail className="w-3.5 h-3.5" />
                                        Email
                                    </label>
                                    <p className="font-semibold">{item.emailAddress || "-"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                     {/* Notes Card */}
                     <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FiFileText className="w-5 h-5 text-primary" />
                                Notes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="min-h-[200px] whitespace-pre-wrap text-sm leading-relaxed p-6 rounded-xl bg-muted/30 border">
                                {item.notes || <span className="text-muted-foreground italic">No notes added.</span>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline Sidebar */}
                <div className="space-y-6">
                    {/* Dates Card */}
                    <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FiCalendar className="w-5 h-5 text-primary" />
                                Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-background/50 backdrop-blur-sm border">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sent Date</p>
                                        <p className="font-bold text-sm mt-0.5">{format(item.messageSentAt, "MMMM d, yyyy")}</p>
                                    </div>
                                </div>

                                <div className={cn(
                                    "flex items-center gap-3 p-4 rounded-xl backdrop-blur-sm border",
                                    isOverdue 
                                      ? "bg-destructive/10 border-destructive/30" 
                                      : "bg-background/50 border-border"
                                )}>
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                        isOverdue ? "bg-destructive/20" : "bg-amber-500/10"
                                    )}>
                                        <FiClock className={cn(
                                            "w-5 h-5",
                                            isOverdue ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                                        )} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Follow-up Due</p>
                                        <p className={cn(
                                            "font-bold text-sm mt-0.5",
                                            isOverdue && "text-destructive"
                                        )}>
                                            {format(item.followUpDueAt, "MMMM d, yyyy")}
                                        </p>
                                        {isOverdue && (
                                            <p className="text-xs text-destructive font-semibold mt-1">Overdue</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Card */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FiUser className="w-5 h-5 text-primary" />
                                Contact
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
                                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                                        {item.personName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold">{item.personName}</p>
                                        <p className="text-sm text-muted-foreground">{item.personRole}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
