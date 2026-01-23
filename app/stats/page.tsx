import { Sidebar } from "@/components/sidebar";
import { getStats } from "@/actions/outreach";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StatsPage() {
  const stats = await getStats();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 bg-muted/5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-8">Statistics</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
             <Card className="shadow-none border bg-card">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Outreach</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <div className="text-3xl font-bold tracking-tight">{stats.sent}</div>
                 </CardContent>
             </Card>
             <Card className="shadow-none border bg-card">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Response Rate</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <div className="text-3xl font-bold tracking-tight">
                        {stats.sent > 0 ? ((stats.replies / stats.sent) * 100).toFixed(1) : 0}%
                     </div>
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
      </main>
    </div>
  );
}
