"use client";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FiMail, FiLinkedin, FiCalendar, FiXCircle } from "react-icons/fi";
import Link from "next/link";
import { OutreachActions } from "@/components/outreach-actions";
import { DeleteArchiveActions } from "@/components/delete-archive-actions";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { TableShell, TableContent } from "@/components/ui/data-table/table-shell";
import { TableHeader } from "@/components/ui/data-table/table-header";
import { TablePagination } from "@/components/ui/data-table/table-pagination";

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
  followUpSentAt?: Date | null;
  contactMethod: string;
  contactCount?: number;
};

export function OutreachTable({ items }: { items: OutreachItem[] }) {
  const [filter, setFilter] = useState<"ALL" | "EMAIL" | "LINKEDIN">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = filter === "ALL" || item.contactMethod === filter;
    
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

    return matchesSearch && matchesMethod && matchesDate;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const handleFilterChange = (newFilter: "ALL" | "EMAIL" | "LINKEDIN") => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleDateChange = (type: "start" | "end", date: string) => {
    if (type === "start") {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
    setCurrentPage(1);
  };

  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  return (
    <TableShell>
      <TableHeader
        title="Recent Outreach"
        subtitle={`Showing ${filteredItems.length === 0 ? 0 : startIndex + 1}-${Math.min(endIndex, filteredItems.length)} of ${filteredItems.length} ${filteredItems.length !== items.length ? `(filtered from ${items.length} total)` : "applications"}`}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        placeholder="Search by company..."
      >
        {/* Filter Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => handleFilterChange("ALL")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors whitespace-nowrap",
              filter === "ALL"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted/50"
            )}
          >
            All
          </button>
          <button
            onClick={() => handleFilterChange("EMAIL")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors flex items-center gap-2 whitespace-nowrap",
              filter === "EMAIL"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted/50"
            )}
          >
            <FiMail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={() => handleFilterChange("LINKEDIN")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors flex items-center gap-2 whitespace-nowrap",
              filter === "LINKEDIN"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted/50"
            )}
          >
            <FiLinkedin className="w-4 h-4" />
            LinkedIn
          </button>
        </div>
      </TableHeader>

      <div className="px-6 py-4 bg-muted/30 border-b border-border/50">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FiCalendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date Range:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <span className="absolute -top-2 left-2 bg-card px-1 text-[10px] font-bold text-muted-foreground uppercase z-10">From</span>
              <DatePicker 
                value={startDate ? new Date(startDate) : undefined}
                onChange={(date) => handleDateChange("start", date ? format(date, "yyyy-MM-dd") : "")}
                placeholder="Start Date"
                className="w-[180px]"
              />
            </div>
            <div className="relative">
              <span className="absolute -top-2 left-2 bg-card px-1 text-[10px] font-bold text-muted-foreground uppercase z-10">To</span>
               <DatePicker 
                value={endDate ? new Date(endDate) : undefined}
                onChange={(date) => handleDateChange("end", date ? format(date, "yyyy-MM-dd") : "")}
                placeholder="End Date"
                className="w-[180px]"
              />
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
      
      <TableContent>
        <thead className="border-b border-border/50 bg-muted/30">
          <tr>
            <th className="h-12 px-4 md:px-6 text-left align-middle font-semibold text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">Company</th>
            <th className="hidden md:table-cell h-12 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Role</th>
            <th className="h-12 px-4 md:px-6 text-left align-middle font-semibold text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="hidden lg:table-cell h-12 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
            <th className="hidden sm:table-cell h-12 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Follow Up</th>
            <th className="h-12 px-4 md:px-6 text-right align-middle font-semibold text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 md:p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <FiMail className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-base md:text-lg font-semibold text-foreground mb-1">
                      {searchQuery 
                        ? `No results found for "${searchQuery}"`
                        : `No ${filter === "ALL" ? "" : filter.toLowerCase()} outreach tracked yet`}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {searchQuery
                        ? "Try adjusting your search or filters."
                        : filter === "ALL" 
                          ? "Start applying and track your progress!" 
                          : `No ${filter.toLowerCase()} messages found.`}
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            paginatedItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border/30 transition-all duration-200 hover:bg-muted/30 group"
              >
                <td className="p-3 md:p-6 align-middle">
                  <div className="flex flex-col gap-1 md:gap-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                      <div className="flex items-center gap-2">
                        {!["REPLIED", "REJECTED", "OFFER", "CLOSED"].includes(item.status) && !item.followUpSentAt && (
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse",
                            new Date(item.followUpDueAt) < new Date()
                              ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                              : new Date(item.followUpDueAt).toDateString() === new Date().toDateString()
                              ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                              : "hidden"
                          )} />
                        )}
                        {item.followUpSentAt && (
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" title="Follow-up Sent" />
                        )}
                        <span className="text-sm md:text-base font-semibold tracking-tight group-hover:text-primary transition-colors truncate max-w-[120px] md:max-w-none">{item.companyName}</span>
                        {item.contactCount && item.contactCount > 1 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                            {item.contactCount}
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "inline-flex w-fit items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                        item.contactMethod === "EMAIL"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      )}>
                        {item.contactMethod === "EMAIL" ? (
                          <><FiMail className="w-2.5 h-2.5 md:w-3 md:h-3" /> <span className="hidden md:inline">Email</span></>
                        ) : (
                          <><FiLinkedin className="w-2.5 h-2.5 md:w-3 md:h-3" /> <span className="hidden md:inline">LinkedIn</span></>
                        )}
                      </span>
                    </div>
                    <div className="md:hidden text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {item.roleTargeted}
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell p-6 align-middle">
                  <span className="font-semibold text-foreground">{item.roleTargeted}</span>
                </td>
                <td className="p-3 md:p-6 align-middle">
                  <div className="scale-90 md:scale-100 origin-left">
                      <StatusBadge status={item.status} />
                  </div>
                </td>
                <td className="hidden lg:table-cell p-6 align-middle">
                  <span className="font-mono text-xs text-muted-foreground font-medium whitespace-nowrap">
                    {format(item.messageSentAt, "MMM d, yyyy")}
                  </span>
                </td>
                <td className="hidden sm:table-cell p-6 align-middle">
                  {item.status !== "REPLIED" && item.status !== "CLOSED" && item.status !== "REJECTED" ? (
                    <span className={cn(
                      "text-[10px] md:text-xs font-semibold px-2 md:px-3 py-1 md:py-1.5 rounded-full border whitespace-nowrap inline-block",
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
                <td className="p-3 md:p-6 align-middle text-right">
                  <div className="flex items-center justify-end gap-1 md:gap-2">
                     <div className="hidden md:block">
                          <OutreachActions id={item.id} currentStatus={item.status} />
                     </div>
                    <Button variant="outline" size="sm" asChild className="h-8 md:h-9 px-2 md:px-3">
                      <Link href={`/outreach/${item.id}`} className="text-[10px] md:text-sm">View</Link>
                    </Button>
                    <div className="hidden md:block">
                      <DeleteArchiveActions id={item.id} />
                    </div>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </TableContent>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </TableShell>
  );
}
