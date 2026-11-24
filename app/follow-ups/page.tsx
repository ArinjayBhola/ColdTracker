import { Suspense } from "react";
import { getUserTimeZone, getUserDayBounds } from "@/lib/user-time-zone";
import { getPaginatedFollowUpItemsAction } from "@/actions/follow-ups";
import { Sidebar } from "@/components/sidebar";
import { FiCheckCircle } from "react-icons/fi";
import { FollowUpList } from "@/components/follow-up-list";
import { auth } from "@/lib/auth";
import { ServerQuerySnapshot } from "@/components/server-query-snapshot";

async function FollowUpContent() {
  const [timeZone, day, session] = await Promise.all([getUserTimeZone(), getUserDayBounds(), auth()]);
  if (!session?.user?.id) return null;
  // Request freshness belongs to this server read, not to the last row edit.
  // eslint-disable-next-line react-hooks/purity
  const updatedAt = Date.now();
  const initialPage = timeZone && day ? await getPaginatedFollowUpItemsAction("ALL_ACTIVE", 1, 15, "ALL", timeZone, { key: day.key, start: day.start.toISOString(), end: day.end.toISOString() }) : undefined;
  return <ServerQuerySnapshot queryKey={["follow-ups", session.user.id, "ALL_ACTIVE", "ALL", timeZone, day?.key, "", "ALL", "ALL", 1]} data={initialPage} updatedAt={updatedAt}>
    <FollowUpList owner={session.user.id} initialCategory="ALL_ACTIVE" initialTimeZone={timeZone} initialDay={day?.key} />
  </ServerQuerySnapshot>;
}

export default async function FollowUpsPage() {


  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
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
