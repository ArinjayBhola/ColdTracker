import { getPaginatedFollowUpItemsAction } from "@/actions/follow-ups";
import { Sidebar } from "@/components/sidebar";
import { FiCheckCircle } from "react-icons/fi";
import { InfiniteOutreachList } from "@/components/infinite-outreach-list";

export default async function FollowUpsPage() {
  const initialCategory = "OVERDUE";
  const { items, hasMore } = await getPaginatedFollowUpItemsAction(initialCategory, 1);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 pt-16 md:pt-0">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Follow-up Queue</h1>
            <p className="text-muted-foreground text-base md:text-lg flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5" />
              Stay on top of your outreach timeline
            </p>
          </div>

          {/* Paginated List with Tabs */}
          <InfiniteOutreachList 
            initialItems={items as any} 
            initialHasMore={hasMore} 
            initialCategory={initialCategory} 
          />
        </div>
      </main>
    </div>
  );
}
