import { getOutreachById } from "@/actions/get-outreach";
import { Sidebar } from "@/components/sidebar";
import { notFound } from "next/navigation";
import { OutreachDetailClient } from "@/components/outreach-detail-client";
import { ServerQuerySnapshot } from "@/components/server-query-snapshot";

export default async function OutreachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // eslint-disable-next-line react-hooks/purity -- Timestamp this server read for cache hydration.
  const updatedAt = Date.now();
  const item = await getOutreachById(id);

  if (!item) {
    notFound();
  }


  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
        <ServerQuerySnapshot queryKey={["outreach", id]} data={item} updatedAt={updatedAt}>
          <OutreachDetailClient id={id} />
        </ServerQuerySnapshot>
      </main>
    </div>
  );
}
