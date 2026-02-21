import { getExtensionLeadByIdAction } from "@/actions/extension-leads";
import { Sidebar } from "@/components/sidebar";
import { notFound } from "next/navigation";
import { ExtensionLeadDetailClient } from "@/components/extension-lead-detail-client";

export default async function ExtensionLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getExtensionLeadByIdAction(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <ExtensionLeadDetailClient 
          initialData={item} 
          id={id}
        />
      </main>
    </div>
  );
}
