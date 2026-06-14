import { Sidebar } from "@/components/sidebar";
import { TemplatesClient } from "@/components/templates-client";
import { getTemplatesAction } from "@/actions/templates";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FiFileText } from "react-icons/fi";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { data: initialTemplates = [] } = await getTemplatesAction();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 pt-16 md:pt-0">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Email Templates</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                <FiFileText className="w-4 h-4 text-primary" />
                Manage your saved email formats. Use {"{{companyName}}"}, {"{{personName}}"}, and {"{{position}}"}.
              </p>
            </div>
          </div>
          <TemplatesClient initialTemplates={initialTemplates} />
        </div>
      </main>
    </div>
  );
}
