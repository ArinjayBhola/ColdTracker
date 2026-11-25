import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { readTemplateLibrary, readTemplate } from "@/lib/template-query";
import { followUpTemplateId } from "@/lib/follow-up-template-slots";
import { Sidebar } from "@/components/sidebar";
import { TemplatesLibrary } from "@/components/templates-library";

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ followUp?: string; page?:string; q?:string; category?:string; tag?:string; favorites?:string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/templates");
  const params=await searchParams;
  const {followUp}=params;
  const requestedPage=Number(params.page);
  const filters={page:Number.isFinite(requestedPage)?Math.max(1,Math.floor(requestedPage)||1):1,q:(params.q??'').trim().slice(0,200),category:(params.category??'').slice(0,80),tag:(params.tag??'').slice(0,40),favorites:params.favorites==='1'};
  const page=await readTemplateLibrary(session.user.id,filters);
  const initialFollowUpStage = followUp === "1" || followUp === "2" ? Number(followUp) as 1 | 2 : undefined;
  const initialFollowUpTemplate=initialFollowUpStage ? await readTemplate(session.user.id,followUpTemplateId(session.user.id,initialFollowUpStage)) : null;
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-8 pt-16 md:pt-0">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Templates</h1>
            <p className="text-muted-foreground">Your words, ready when you need them. Save and organize messages for any platform.</p>
          </div>
          <TemplatesLibrary owner={session.user.id} initialPage={page} initialFilters={filters} initialFollowUpTemplate={initialFollowUpTemplate} />
        </div>
      </main>
    </div>
  );
}
