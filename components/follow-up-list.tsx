"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toggleFollowUpSentAction } from "@/actions/follow-ups";
import { calendarKey } from "@/lib/user-calendar";
import type { getPaginatedFollowUpItemsAction } from "@/actions/follow-ups";
import { cn } from "@/lib/utils";
import { FiCalendar, FiClock, FiMail, FiLinkedin, FiRefreshCw, FiCheckCircle, FiSearch, FiFilter, FiX } from "react-icons/fi";
import { displayDate } from "@/lib/display-date";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { OutreachActions } from "@/components/outreach-actions";
import { DeleteArchiveActions } from "@/components/delete-archive-actions";
import { useToast } from "@/hooks/use-toast";
import { invalidateOutreachLists } from "@/lib/outreach-cache";

type Category = "OVERDUE" | "TODAY" | "UPCOMING" | "SENT" | "ALL_ACTIVE";

export function FollowUpList({
  owner, initialCategory, initialTimeZone = null, initialDay
}: {
  initialCategory: Category;
  owner: string;
  initialTimeZone?: string | null;
  initialDay?: string;
}) {
  const [localDate, setLocalDate] = useState(initialDay || "");
  const [timeZone, setTimeZone] = useState<string | null>(initialTimeZone);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    const sync = () => {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const date = calendarKey(new Date(), zone);
      if (zone !== timeZone || date !== localDate) setCurrentPage(1);
      setTimeZone(zone);
      setLocalDate(date);
    };
    sync();
    window.addEventListener("coldtrack-calendar-change", sync);
    return () => window.removeEventListener("coldtrack-calendar-change", sync);
  }, [timeZone, localDate]);
  const [category, setCategory] = useState<Category>(initialCategory);
  const [stageFilter, setStageFilter] = useState<"ALL" | "1" | "2">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // One server request after typing settles, rather than loading history pages
  // until a locally filtered match happens to appear.
  useEffect(() => {
    if (searchTerm.trim() === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearch]);

  const {
    data,
    isFetching,
    isLoading,
    isError,
    refetch
  } = useQuery({
    enabled: !!timeZone && !!localDate,
    queryKey: ["follow-ups", owner, category, stageFilter, timeZone, localDate, debouncedSearch, methodFilter, statusFilter, currentPage],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ category, page: String(currentPage), stage: stageFilter, timeZone: timeZone!, q: debouncedSearch, method: methodFilter, status: statusFilter });
      const response = await fetch(`/api/follow-ups?${params}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("Could not load follow-ups");
      return await response.json() as Awaited<ReturnType<typeof getPaginatedFollowUpItemsAction>>;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const handleToggleFollowUp = async (id: string, currentlySent: boolean, contactId: string, stage: 1 | 2) => {
    setUpdatingId(contactId);
    const res = await toggleFollowUpSentAction(id, !currentlySent, undefined, contactId, stage);
    
    if (res.success) {
      toast({
        title: !currentlySent ? "Follow-up marked as sent" : "Follow-up marked as unsent",
        description: "The list will update momentarily.",
      });
      void invalidateOutreachLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["outreach", id] });
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to update follow-up",
        variant: "destructive",
      });
    }
    setUpdatingId(null);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setMethodFilter("ALL");
    setStatusFilter("ALL");
    setStageFilter("ALL");
    setCurrentPage(1);
  };

  const tabs: { id: Category; label: string }[] = [
    { id: "OVERDUE", label: "Overdue" },
    { id: "TODAY", label: "Due Today" },
    { id: "UPCOMING", label: "Upcoming" },
    { id: "SENT", label: "Sent" },
    { id: "ALL_ACTIVE", label: "Active Follow-ups" },
  ];

  const items = data?.items ?? [];

  const hasActiveFilters = !!(searchTerm || methodFilter !== "ALL" || statusFilter !== "ALL" || stageFilter !== "ALL");

  return (
    <div className="min-w-0 space-y-6">
      {/* Tabs UI */}
      <div className="border-b border-border/50">
        <div className="flex gap-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setCategory(tab.id); setCurrentPage(1); }}
              className={cn(
                "pb-3 text-sm font-semibold transition-all relative whitespace-nowrap",
                category === tab.id 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {category === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/50">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            aria-label="Search follow-ups"
            maxLength={200}
            placeholder="Search company or contact..." 
            className="pl-10 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={methodFilter} onValueChange={value => { setMethodFilter(value); setCurrentPage(1); }}>
          <SelectTrigger aria-label="Follow-up contact method" className="h-11 border-2">
            <div className="flex items-center gap-2">
              <FiFilter className="w-4 h-4 text-muted-foreground" />
              <SelectValue placeholder="Method" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Methods</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={value => { setStatusFilter(value); setCurrentPage(1); }}>
          <SelectTrigger aria-label="Follow-up status" className="h-11 border-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary/20" />
              <SelectValue placeholder="Status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="REPLIED">Replied</SelectItem>
            <SelectItem value="GHOSTED">Ghosted</SelectItem>
            <SelectItem value="INTERVIEW">Interview</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="OFFER">Offer</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={stageFilter} 
          onValueChange={(v: "ALL" | "1" | "2") => { setStageFilter(v); setCurrentPage(1); }}
          disabled={category === "SENT"}
        >
          <SelectTrigger aria-label="Follow-up stage" className="h-11 border-2">
            <div className="flex items-center gap-2">
              <FiClock className="w-4 h-4 text-muted-foreground" />
              <SelectValue placeholder="Stage" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Stages</SelectItem>
            <SelectItem value="1">1st Follow-up</SelectItem>
            <SelectItem value="2">2nd Follow-up</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && <div className="col-span-full flex gap-2">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-11 px-4 gap-2 font-bold text-destructive hover:bg-destructive/10 rounded-xl transition-all"
            >
              <FiX className="w-4 h-4" />
              Clear Filters
            </Button>
        </div>}
      </div>

      {/* List */}
      <div className="space-y-4" aria-busy={isFetching}>
        {(!timeZone || !localDate || isLoading) && items.length === 0 ? (
          <div role="status" aria-label="Loading follow-ups" className="flex justify-center p-12">
            <FiRefreshCw className="w-8 h-8 animate-spin text-primary/40" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 p-8 text-center">
            <p>We could not load your follow-ups. Please try again.</p>
            <Button variant="outline" className="mt-3" onClick={() => void refetch()}>Retry</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-8 text-center">
            <p className="text-muted-foreground italic">
              {currentPage > 1 ? "No follow-ups on this page. Go back to the previous page." : hasActiveFilters
                ? "No follow-ups match your current filters." 
                : "No follow-ups found for this category."}
            </p>
            {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2 text-primary">
                    Clear all filters
                </Button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-border/50 bg-card overflow-hidden">
            <div className="divide-y divide-border/30">
              {items.map((item) => (
                <div 
                  key={`${item.id}-${item.contactId}`}
                  data-follow-up-row
                  className="grid min-w-0 gap-4 p-4 transition-colors hover:bg-muted/30 md:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
                >
                    <div className="flex min-w-0 items-start gap-3 md:gap-4">
                        <div className="flex flex-col items-center gap-2 pt-1 md:pt-0">
                            <div className={cn(
                                "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 shrink-0",
                                category === "OVERDUE" 
                                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                                    : category === "TODAY"
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : category === "SENT"
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                                    : "bg-muted border-border text-muted-foreground"
                            )}>
                                {category === "SENT" ? <FiCheckCircle className="w-4 h-4 md:w-5 md:h-5" /> : (
                                    <div className="relative">
                                        <FiCalendar className="w-4 h-4 md:w-5 md:h-5" />
                                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-background">
                                            {item.followUpSentAt ? "2" : "1"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 space-y-2 min-w-0">
                            <div className="space-y-2">
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="min-w-0 text-base font-bold tracking-tight [overflow-wrap:anywhere] md:text-lg">{item.companyName}</h3>
                                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                            {item.followUpSentAt ? "Follow-up 2" : "Follow-up 1"}
                                        </span>
                                    </div>
                                    <p className="line-clamp-2 text-xs text-muted-foreground [overflow-wrap:anywhere] md:text-sm" title={`${item.personName} · ${item.roleTargeted}`}>
                                        {item.personName} {item.contacts.length > 1 ? `(+${item.contacts.length - 1} more)` : ""} • {item.roleTargeted}
                                    </p>
                                </div>
                                <div>
                                    <StatusBadge status={item.status} />
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <FiClock className="w-3.5 h-3.5" />
                                    {item.followUpDueAt ? displayDate(item.followUpDueAt) : "N/A"}
                                </span>
                                <span className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border",
                                    item.contactMethod === "EMAIL"
                                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                        : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                )}>
                                    {item.contactMethod === "EMAIL" ? <FiMail /> : <FiLinkedin />}
                                    {item.contactMethod}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div data-follow-up-actions className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                        <OutreachActions id={item.id} currentStatus={item.status} compact />
                        {category !== "SENT" && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-auto min-h-10 shrink-0 gap-2 whitespace-nowrap border-emerald-200 py-2 font-bold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                onClick={() => handleToggleFollowUp(item.id, false, item.contactId, item.followUpSentAt ? 2 : 1)}
                                disabled={updatingId === item.contactId}
                            >
                                {updatingId === item.contactId ? (
                                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <FiCheckCircle className="w-4 h-4" />
                                )}
                                Mark Sent
                            </Button>
                        )}
                        <Button variant="outline" size="sm" asChild className="h-auto min-h-10 shrink-0 py-2">
                            <Link href={`/outreach/${item.id}?contact=${item.contactId}`}>View</Link>
                        </Button>
                        <DeleteArchiveActions id={item.id} />
                    </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <nav aria-label="Follow-up pages" className="flex items-center justify-between gap-3 pt-2">
          <Button variant="outline" disabled={currentPage === 1 || isFetching} onClick={() => setCurrentPage(currentPage - 1)}>Previous</Button>
          <span role="status" className="text-sm text-muted-foreground">Page {currentPage}</span>
          <Button variant="outline" disabled={!data?.hasMore || isFetching} onClick={() => setCurrentPage(currentPage + 1)}>Next</Button>
        </nav>
      </div>
    </div>
  );
}
