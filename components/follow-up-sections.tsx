"use client";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FiCalendar, FiClock, FiMail, FiLinkedin, FiAlertCircle, FiX, FiChevronDown, FiChevronUp } from "react-icons/fi";
import Link from "next/link";
import { OutreachActions } from "@/components/outreach-actions";
import { DeleteArchiveActions } from "@/components/delete-archive-actions";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toggleFollowUpSentAction } from "@/actions/follow-ups";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { FiCheckCircle, FiRefreshCw } from "react-icons/fi";

type FollowUpItem = {
  id: string;
  companyName: string;
  personName: string;
  roleTargeted: string;
  status: string;
  followUpDueAt: Date;
  contactMethod: string;
  followUpSentAt?: Date | null;
};

type FollowUpSectionProps = {
  title: string;
  items: FollowUpItem[];
  iconType: "alert" | "clock" | "calendar" | "check";
  color: string;
  dotColor: string;
  emptyMessage: string;
};

const iconMap = {
  alert: FiAlertCircle,
  clock: FiClock,
  calendar: FiCalendar,
  check: FiCheckCircle,
};

export function FollowUpSections({ 
  sections 
}: { 
  sections: FollowUpSectionProps[] 
}) {
  const [filter, setFilter] = useState<"ALL" | "EMAIL" | "LINKEDIN">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const router = useRouter();

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleToggleFollowUp = async (id: string, currentlySent: boolean) => {
    setUpdatingId(id);
    const res = await toggleFollowUpSentAction(id, !currentlySent);
    
    if (res.success) {
      toast({
        title: !currentlySent ? "Follow-up marked as sent" : "Follow-up marked as unsent",
        description: "The queue will update momentarily.",
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to update follow-up",
        variant: "destructive",
      });
    }
    setUpdatingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors",
            filter === "ALL"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:bg-muted/50"
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilter("EMAIL")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors flex items-center gap-2",
            filter === "EMAIL"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:bg-muted/50"
          )}
        >
          <FiMail className="w-4 h-4" />
          Email
        </button>
        <button
          onClick={() => setFilter("LINKEDIN")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors flex items-center gap-2",
            filter === "LINKEDIN"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:bg-muted/50"
          )}
        >
          <FiLinkedin className="w-4 h-4" />
          LinkedIn
        </button>
      </div>

      {sections.map((section) => {
        const filteredItems = section.items.filter((item) => {
          // If it's the "Sent" section, we only show sent items.
          // For other sections, we only show non-sent items (already handled by getFollowUpItems, but double checking here)
          if (section.title === "Sent") {
            if (!item.followUpSentAt) return false;
          } else {
            if (item.followUpSentAt) return false;
          }
          
          if (filter === "ALL") return true;
          return item.contactMethod === filter;
        });

        const SectionIcon = iconMap[section.iconType];
        const isCollapsed = collapsedSections[section.title];

        return (
          <section key={section.title}>
            <div 
              className="flex items-center justify-between mb-5 cursor-pointer group/header"
              onClick={() => toggleSection(section.title)}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", section.dotColor)} />
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 group-hover/header:text-primary transition-colors">
                  <SectionIcon className={cn("w-5 h-5", section.color)} />
                  {section.title}
                  <span className="text-sm font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {filteredItems.length}
                  </span>
                </h2>
              </div>
              <div className="text-muted-foreground group-hover/header:text-primary transition-colors">
                {isCollapsed ? <FiChevronDown className="w-5 h-5" /> : <FiChevronUp className="w-5 h-5" />}
              </div>
            </div>

            {!isCollapsed && (
              <>
                {filteredItems.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-8 text-center">
                <p className="text-muted-foreground italic">
                  {filter === "ALL" 
                    ? section.emptyMessage 
                    : `No ${filter.toLowerCase()} ${section.title.toLowerCase()} follow-ups.`}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-border/50 bg-card overflow-hidden">
                <div className="divide-y divide-border/30">
                  {filteredItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/30 transition-all duration-200 group gap-4 md:gap-0"
                    >
                      <div className="flex items-start gap-4 md:gap-6 flex-1">
                        {/* Timeline Indicator */}
                        <div className="flex flex-col items-center gap-2 pt-1 md:pt-0">
                          <div className={cn(
                            "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 shrink-0",
                            section.title === "Overdue" 
                              ? "bg-destructive/10 border-destructive/30 text-destructive"
                              : section.title === "Due Today"
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : section.title === "Sent"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                              : "bg-muted border-border text-muted-foreground"
                          )}>
                            {section.title === "Sent" ? <FiCheckCircle className="w-4 h-4 md:w-5 md:h-5" /> : <FiCalendar className="w-4 h-4 md:w-5 md:h-5" />}
                          </div>
                          {index < filteredItems.length - 1 && (
                            <div className="w-0.5 h-full min-h-[20px] bg-border/50" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-0.5 md:space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base md:text-lg font-bold tracking-tight group-hover:text-primary transition-colors truncate">
                                  {item.companyName}
                                </h3>
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] md:text-xs font-semibold border shrink-0",
                                  item.contactMethod === "EMAIL"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                )}>
                                  {item.contactMethod === "EMAIL" ? (
                                    <><FiMail className="w-3 h-3" /> <span className="hidden sm:inline">Email</span></>
                                  ) : (
                                    <><FiLinkedin className="w-3 h-3" /> <span className="hidden sm:inline">LinkedIn</span></>
                                  )}
                                </span>
                              </div>
                              <p className="text-xs md:text-sm text-muted-foreground truncate">
                                {item.personName} • {item.roleTargeted}
                              </p>
                            </div>
                            <div className="scale-90 md:scale-100 origin-top-right shrink-0">
                                <StatusBadge status={item.status} />
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs">
                            <div className={cn(
                              "flex items-center gap-1.5 font-semibold px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border backdrop-blur-sm whitespace-nowrap",
                              section.title === "Overdue"
                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                : "bg-muted text-muted-foreground border-border"
                            )}>
                              <FiClock className="w-3.5 h-3.5" />
                              {section.title === "Overdue" && "Overdue: "}
                              {format(item.followUpDueAt, "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 md:gap-3 pl-12 md:pl-6 w-full md:w-auto">
                        <OutreachActions id={item.id} currentStatus={item.status} />
                        {section.title !== "Sent" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 gap-2 font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            onClick={() => handleToggleFollowUp(item.id, false)}
                            disabled={updatingId === item.id}
                          >
                            {updatingId === item.id ? (
                              <FiRefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FiCheckCircle className="w-4 h-4" />
                            )}
                            Mark Sent
                          </Button>
                        )}
                        {section.title === "Sent" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 gap-2 font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/5 hover:border-destructive/20"
                            onClick={() => handleToggleFollowUp(item.id, true)}
                            disabled={updatingId === item.id}
                          >
                            {updatingId === item.id ? (
                              <FiRefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FiX className="w-4 h-4" />
                            )}
                            Undo
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild className="h-9">
                          <Link href={`/outreach/${item.id}`}>View</Link>
                        </Button>
                        <DeleteArchiveActions id={item.id} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>
            )}
          </section>
        );
      })}
    </div>
  );
}
