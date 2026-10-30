import { Sidebar } from "@/components/sidebar";
import { StartupsExplorer } from "@/components/startups-explorer";
import { getStartupsAction } from "@/actions/startups";
import { FiBriefcase, FiCheckCircle, FiCircle } from "react-icons/fi";


export default async function StartupsPage(
  props: {
    searchParams: Promise<{ page?: string; q?: string; sort?: string; size?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = searchParams.q || "";
  const sort = searchParams.sort || "NOT_OUTREACHED";
  const { items, totalCount, summary, teamSizeCounts, selectedTeamSize } = await getStartupsAction(page, 21, search, sort, searchParams.size);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between pt-16 md:pt-0">
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold tracking-tight">Startups</h1>
              <p className="text-muted-foreground text-sm font-medium">
                Discover and explore startups and their opportunities
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Your startup outreach summary">
            {[
              { label: "Total startups", value: summary.total, icon: FiBriefcase, color: "bg-primary/10 text-primary" },
              { label: "Outreach done", value: summary.done, icon: FiCheckCircle, color: "bg-emerald-500/10 text-emerald-600" },
              { label: "Outreach left", value: summary.left, icon: FiCircle, color: "bg-amber-500/10 text-amber-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-3xl font-bold tabular-nums tracking-tight">{value.toLocaleString("en-US")}</dd>
                </div>
              </div>
            ))}
          </dl>

          {/* Explorer */}
          <StartupsExplorer 
            items={items} 
            totalCount={totalCount} 
            currentPage={page} 
            initialSearch={search}
            initialSort={sort}
            teamSizeCounts={teamSizeCounts}
            selectedTeamSize={selectedTeamSize}
          />
        </div>
      </main>
    </div>
  );
}
