import { getFollowUpItems } from "@/actions/follow-ups";
import { Sidebar } from "@/components/sidebar";
import { FiCheckCircle } from "react-icons/fi";
import { FollowUpSections } from "@/components/follow-up-sections";

export default async function FollowUpsPage() {
  const { today, overdue, upcoming, sent } = await getFollowUpItems();

  const sections = [
    {
      title: "Overdue",
      items: overdue,
      iconType: "alert" as const,
      color: "text-destructive",
      dotColor: "bg-destructive",
      emptyMessage: "No overdue follow-ups. Great job!",
    },
    {
      title: "Due Today",
      items: today,
      iconType: "clock" as const,
      color: "text-primary",
      dotColor: "bg-primary",
      emptyMessage: "No follow-ups due today. You're all caught up!",
    },
    {
      title: "Upcoming",
      items: upcoming.slice(0, 10),
      iconType: "calendar" as const,
      color: "text-muted-foreground",
      dotColor: "bg-muted-foreground/30",
      emptyMessage: "No upcoming follow-ups scheduled.",
    },
    {
      title: "Sent",
      items: sent,
      iconType: "check" as const,
      color: "text-emerald-500",
      dotColor: "bg-emerald-500",
      emptyMessage: "No follow-ups marked as sent yet.",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 pt-12 md:pt-0">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Follow-up Queue</h1>
            <p className="text-muted-foreground text-base md:text-lg flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5" />
              Stay on top of your outreach timeline
            </p>
          </div>

          {/* Sections */}
          <FollowUpSections sections={sections} />
        </div>
      </main>
    </div>
  );
}
