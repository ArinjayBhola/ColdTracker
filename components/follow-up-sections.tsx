"use client";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FiCalendar, FiClock, FiMail, FiLinkedin, FiAlertCircle } from "react-icons/fi";
import Link from "next/link";
import { OutreachActions } from "@/components/outreach-actions";
import { DeleteArchiveActions } from "@/components/delete-archive-actions";
import { cn } from "@/lib/utils";
import { useState } from "react";

type FollowUpItem = {
  id: string;
  companyName: string;
  personName: string;
  roleTargeted: string;
  status: string;
  followUpDueAt: Date;
  contactMethod: string;
};

type FollowUpSectionProps = {
  title: string;
  items: FollowUpItem[];
  iconType: "alert" | "clock" | "calendar";
  color: string;
  dotColor: string;
  emptyMessage: string;
};

const iconMap = {
  alert: FiAlertCircle,
  clock: FiClock,
  calendar: FiCalendar,
};

export function FollowUpSections({ 
  sections 
}: { 
  sections: FollowUpSectionProps[] 
}) {
  const [filter, setFilter] = useState<"ALL" | "EMAIL" | "LINKEDIN">("ALL");

  return (
    <div className="space-y-8">
      {/* Filter Buttons */}
      <div className="flex items-center justify-end gap-2">
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
          if (filter === "ALL") return true;
          return item.contactMethod === filter;
        });

        const SectionIcon = iconMap[section.iconType];

        return (
          <section key={section.title}>
            <div className="flex items-center gap-3 mb-5">
              <div className={cn("w-3 h-3 rounded-full", section.dotColor)} />
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <SectionIcon className={cn("w-5 h-5", section.color)} />
                {section.title}
                <span className="text-sm font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  {filteredItems.length}
                </span>
              </h2>
            </div>

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
                      className="p-6 flex items-center justify-between hover:bg-muted/30 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-6 flex-1">
                        {/* Timeline Indicator */}
                        <div className="flex flex-col items-center gap-2">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2",
                            section.title === "Overdue" 
                              ? "bg-destructive/10 border-destructive/30 text-destructive"
                              : section.title === "Due Today"
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-muted border-border text-muted-foreground"
                          )}>
                            <FiCalendar className="w-5 h-5" />
                          </div>
                          {index < filteredItems.length - 1 && (
                            <div className="w-0.5 h-8 bg-border/50" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">
                                  {item.companyName}
                                </h3>
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border",
                                  item.contactMethod === "EMAIL"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                )}>
                                  {item.contactMethod === "EMAIL" ? (
                                    <><FiMail className="w-3 h-3" /> Email</>
                                  ) : (
                                    <><FiLinkedin className="w-3 h-3" /> LinkedIn</>
                                  )}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {item.personName} • {item.roleTargeted}
                              </p>
                            </div>
                            <StatusBadge status={item.status} />
                          </div>

                          <div className="flex items-center gap-4 text-xs">
                            <div className={cn(
                              "flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-full border backdrop-blur-sm",
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
                      <div className="flex items-center gap-3 ml-6">
                        <OutreachActions id={item.id} currentStatus={item.status} />
                        <Button variant="outline" size="sm" asChild className="h-9">
                          <Link href={`/outreach/${item.id}`}>View Details</Link>
                        </Button>
                        <DeleteArchiveActions id={item.id} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
