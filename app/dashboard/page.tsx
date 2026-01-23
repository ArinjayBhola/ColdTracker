import { getOutreachItems, getStats } from "@/actions/outreach";
import { Sidebar } from "@/components/sidebar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { FiArrowUpRight, FiPlus } from "react-icons/fi";
import Link from "next/link";
import { OutreachActions } from "@/components/outreach-actions";
import { cn } from "@/lib/utils";
import { ExportExcel } from "@/components/export-excel";

export default async function DashboardPage() {
  const outreachItems = await getOutreachItems();
  const stats = await getStats();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-muted/5 p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Overview of your job search progress.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportExcel data={outreachItems} fileName="cold-track-export" />
            <Button asChild className="gap-2 shadow-sm rounded-lg">
                <Link href="/outreach/new">
                <FiPlus className="h-4 w-4" />
                New Outreach
                </Link>
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="shadow-none border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card className="shadow-none border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Replies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stats.replies}</div>
            </CardContent>
          </Card>
          <Card className="shadow-none border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stats.interviews}</div>
            </CardContent>
          </Card>
          <Card className="shadow-none border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Offers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stats.offers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Outreach Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-muted/5">
            <h2 className="text-lg font-semibold tracking-tight">Recent Outreach</h2>
          </div>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/5 data-[state=selected]:bg-muted">
                  <th className="h-12 px-6 text-left align-middle font-medium text-xs uppercase tracking-wider text-muted-foreground">Company</th>
                  <th className="h-12 px-6 text-left align-middle font-medium text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="h-12 px-6 text-left align-middle font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="h-12 px-6 text-left align-middle font-medium text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="h-12 px-6 text-left align-middle font-medium text-xs uppercase tracking-wider text-muted-foreground">Follow Up</th>
                  <th className="h-12 px-6 text-right align-middle font-medium text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {outreachItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No outreach tracked yet. Start applying!
                    </td>
                  </tr>
                ) : (
                  outreachItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b transition-colors hover:bg-muted/5 data-[state=selected]:bg-muted"
                    >
                      <td className="p-6 align-middle font-medium">
                          <div className="flex flex-col">
                              <span className="text-base font-semibold tracking-tight">{item.companyName}</span>
                              {item.companyLink && (
                                  <a href={item.companyLink} target="_blank" className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]">
                                      {item.companyLink.replace(/^https?:\/\//, '')}
                                  </a>
                              )}
                          </div>
                      </td>
                      <td className="p-6 align-middle">
                        <div className="flex flex-col">
                            <span className="font-medium text-foreground">{item.roleTargeted}</span>
                            <span className="text-xs text-muted-foreground">{item.personName} ({item.personRole})</span>
                        </div>
                      </td>
                      <td className="p-6 align-middle">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="p-6 align-middle text-muted-foreground font-mono text-xs">
                        {format(item.messageSentAt, "MMM d, yyyy")}
                      </td>
                      <td className="p-6 align-middle">
                         {item.status !== "REPLIED" && item.status !== "CLOSED" && item.status !== "REJECTED" ? (
                             <span className={cn(
                                 "text-xs font-medium px-2.5 py-1 rounded-md border",
                                 new Date(item.followUpDueAt) < new Date() 
                                    ? "bg-destructive/10 text-destructive border-destructive/20" 
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
