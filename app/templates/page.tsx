import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTemplates } from "@/actions/templates";
import { Sidebar } from "@/components/sidebar";
import { TemplatesLibrary } from "@/components/templates-library";

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ followUp?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/templates");
  const { followUp } = await searchParams;
  const templates = await getTemplates();
  const initialFollowUpStage = followUp === "1" || followUp === "2" ? Number(followUp) as 1 | 2 : undefined;
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-8 pt-16 md:pt-0">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Templates</h1>
            <p className="text-muted-foreground">Your words, ready when you need them. Save and organize messages for any platform.</p>
          </div>
          <TemplatesLibrary initialTemplates={templates} initialFollowUpStage={initialFollowUpStage} />
        </div>
      </main>
    </div>
  );
}
