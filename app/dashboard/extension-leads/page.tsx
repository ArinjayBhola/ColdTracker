import { ExtensionLeadsTable } from "@/components/extension-leads-table";
import { getExtensionLeadsAction } from "@/actions/extension-leads";
import { FiLinkedin, FiUsers, FiClock, FiPlus } from "react-icons/fi";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function ExtensionLeadsPage() {
  const leads = await getExtensionLeadsAction() as any[];

  const statCards = [
    {
      title: "Total Leads",
      value: leads.length,
      icon: FiUsers,
      iconColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
            {/* Header */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between pt-16 md:pt-0">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FiLinkedin className="w-6 h-6 text-primary" />
                        </div>
                        Extension Leads
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Manage profiles captured from the browser extension before adding them to outreach.
                    </p>
                </div>
            </div>

            {/* Stats Section */}
            <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <Card 
                    key={stat.title} 
                    className={cn(
                        "border-none ring-1 transition-all hover:shadow-md",
                        stat.borderColor.replace('border-', 'ring-'),
                        stat.bgColor
                    )}
                    >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 md:pb-3">
                        <CardTitle className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        {stat.title}
                        </CardTitle>
                        <div className={cn("hidden md:flex p-2.5 rounded-xl bg-background/80", stat.iconColor)}>
                        <stat.icon className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                        <div className="text-2xl md:text-4xl font-bold tracking-tight">{stat.value}</div>
                    </CardContent>
                    </Card>
                ))}
            </div>

            {/* Leads Table */}
            <div>
                <ExtensionLeadsTable initialLeads={leads} />
            </div>
        </div>
      </main>
    </div>
  );
}
