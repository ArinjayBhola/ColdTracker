import { Suspense } from "react";
import { getUserTimeZone, getUserDayBounds } from "@/lib/user-time-zone";
import { getPaginatedFollowUpItemsAction } from "@/actions/follow-ups";
import { Sidebar } from "@/components/sidebar";
import { FiCheckCircle } from "react-icons/fi";
import { InfiniteOutreachList } from "@/components/infinite-outreach-list";

async function FollowUpContent() {
  const [timeZone, day] = await Promise.all([getUserTimeZone(), getUserDayBounds()]);
  const initialPage = timeZone && day ? await getPaginatedFollowUpItemsAction("ALL_ACTIVE", 1, 15, "ALL", timeZone, { key: day.key, start: day.start.toISOString(), end: day.end.toISOString() }) : undefined;
  return <InfiniteOutreachList initialCategory="ALL_ACTIVE" initialPage={initialPage} initialTimeZone={timeZone} initialDay={day?.key} />;
}

export default async function FollowUpsPage() {


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
          <Suspense fallback={<p className="text-muted-foreground" role="status">Loading follow-ups...</p>}><FollowUpContent /></Suspense>
        </div>
      </main>
    </div>
  );
}
