"use client";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FiArrowUpRight, FiMail, FiLinkedin, FiCalendar, FiXCircle } from "react-icons/fi";
import Link from "next/link";
import { OutreachActions } from "@/components/outreach-actions";
import { DeleteArchiveActions } from "@/components/delete-archive-actions";
import { cn } from "@/lib/utils";
import { useState } from "react";

type OutreachItem = {
  id: string;
  companyName: string;
  companyLink: string | null;
  roleTargeted: string;
  personName: string;
  personRole: string;
  status: string;
  messageSentAt: Date;
  followUpDueAt: Date;
  contactMethod: string;
};

export function OutreachTable({ items }: { items: OutreachItem[] }) {
  const [filter, setFilter] = useState<"ALL" | "EMAIL" | "LINKEDIN">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const filteredItems = items.filter((item) => {
    // Contact Method Filter
    const matchesMethod = filter === "ALL" || item.contactMethod === filter;
    
    // Date Filter
    let matchesDate = true;
    const itemDate = new Date(item.messageSentAt);
    itemDate.setHours(0, 0, 0, 0);

    if (startDate) {
      const start = new Date(startDate + "T00:00:00");
      if (itemDate < start) matchesDate = false;
    }

    if (endDate) {
      const end = new Date(endDate + "T00:00:00");
      if (itemDate > end) matchesDate = false;
    }

    return matchesMethod && matchesDate;
  });

  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="rounded-2xl border-2 border-border/50 bg-card overflow-hidden">
      <div className="p-6 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full bg-primary" />
              Recent Outreach
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredItems.length} of {items.length} applications
            </p>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
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
        </div>

        {/* Date Filters Row */}
        <div className="mt-6 flex flex-wrap items-center gap-4 pt-6 border-t border-border/50">
          <div className="flex items-center gap-2">
            <FiCalendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Date Range:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background border-2 border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors h-10"
                placeholder="Start Date"
              />
              <span className="absolute -top-2 left-2 bg-card px-1 text-[10px] font-bold text-muted-foreground uppercase">From</span>
            </div>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background border-2 border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors h-10"
                placeholder="End Date"
              />
              <span className="absolute -top-2 left-2 bg-card px-1 text-[10px] font-bold text-muted-foreground uppercase">To</span>
            </div>
            {(startDate || endDate) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearDateFilters}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 h-10"
              >
                <FiXCircle className="w-4 h-4" />
                Clear Dates
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="border-b border-border/50 bg-muted/30">
            <tr>
              <th className="h-14 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Company</th>
              <th className="h-14 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Role</th>
              <th className="h-14 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="h-14 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="h-14 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Follow Up</th>
              <th className="h-14 px-6 text-right align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                      {filter === "EMAIL" ? (
                        <FiMail className="w-8 h-8 text-muted-foreground/50" />
                      ) : filter === "LINKEDIN" ? (
                        <FiLinkedin className="w-8 h-8 text-muted-foreground/50" />
                      ) : (
                        <FiMail className="w-8 h-8 text-muted-foreground/50" />
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground mb-1">
                        No {filter === "ALL" ? "" : filter.toLowerCase()} outreach tracked yet
                      </p>
                      <p className="text-muted-foreground">
                        {filter === "ALL" 
                          ? "Start applying and track your progress!" 
                          : `No ${filter.toLowerCase()} messages found. Try a different filter.`}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border/30 transition-all duration-200 hover:bg-muted/30 group"
                >
                  <td className="p-6 align-middle">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold tracking-tight group-hover:text-primary transition-colors">{item.companyName}</span>
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
                      {item.companyLink && (
                        <a 
                          href={item.companyLink} 
                          target="_blank" 
                          className="text-xs text-muted-foreground hover:text-primary transition-colors truncate max-w-[200px] flex items-center gap-1"
                        >
                          {item.companyLink.replace(/^https?:\/\//, '')}
                          <FiArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-6 align-middle">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">{item.roleTargeted}</span>
                      <span className="text-xs text-muted-foreground">{item.personName} • {item.personRole}</span>
                    </div>
                  </td>
                  <td className="p-6 align-middle">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="p-6 align-middle">
                    <span className="font-mono text-xs text-muted-foreground font-medium whitespace-nowrap">
                      {format(item.messageSentAt, "MMM d, yyyy")}
                    </span>
                  </td>
                  <td className="p-6 align-middle">
                    {item.status !== "REPLIED" && item.status !== "CLOSED" && item.status !== "REJECTED" ? (
                      <span className={cn(
                        "text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap inline-block",
                        new Date(item.followUpDueAt) < new Date() 
                          ? "bg-destructive/10 text-destructive border-destructive/30" 
                          : "bg-background text-muted-foreground border-border"
                      )}>
                        {format(item.followUpDueAt, "MMM d")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-6 align-middle text-right">
                    <div className="flex items-center justify-end gap-2">
                       <OutreachActions id={item.id} currentStatus={item.status} />
                      <Button variant="outline" size="sm" asChild className="h-9">
                        <Link href={`/outreach/${item.id}`}>View Details</Link>
                      </Button>
                      <DeleteArchiveActions id={item.id} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
