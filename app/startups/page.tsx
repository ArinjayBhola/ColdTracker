import { Sidebar } from "@/components/sidebar";
import { StartupsExplorer } from "@/components/startups-explorer";
import { getStartupsAction } from "@/actions/startups";


export default async function StartupsPage(
  props: {
    searchParams: Promise<{ page?: string; q?: string; sort?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = searchParams.q || "";
  const sort = searchParams.sort || "NOT_OUTREACHED";
  const { items, totalCount } = await getStartupsAction(page, 21, search, sort);

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

          {/* Explorer */}
          <StartupsExplorer 
            items={items} 
            totalCount={totalCount} 
            currentPage={page} 
            initialSearch={search}
            initialSort={sort}
          />
        </div>
      </main>
    </div>
  );
}
