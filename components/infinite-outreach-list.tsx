"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback, useState } from "react";
import { getPaginatedFollowUpItemsAction, toggleFollowUpSentAction } from "@/actions/follow-ups";
import { cn } from "@/lib/utils";
import { FiCalendar, FiClock, FiMail, FiLinkedin, FiRefreshCw, FiCheckCircle, FiSearch, FiFilter, FiX } from "react-icons/fi";
import { format } from "date-fns";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { OutreachActions } from "@/components/outreach-actions";
import { DeleteArchiveActions } from "@/components/delete-archive-actions";
import { useToast } from "@/hooks/use-toast";

type OutreachItem = {
  id: string;
  companyName: string;
  personName: string;
  roleTargeted: string;
  status: string;
  followUpDueAt: Date;
  contactMethod: string;
  followUpSentAt?: Date | null;
  contacts: any[];
};

type Category = "OVERDUE" | "TODAY" | "UPCOMING" | "SENT";

export function InfiniteOutreachList({ 
  initialItems, 
  initialHasMore,
  initialCategory
}: { 
  initialItems: OutreachItem[],
  initialHasMore: boolean,
  initialCategory: Category
}) {
  const [category, setCategory] = useState<Category>(initialCategory);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // No debouncing needed for frontend-only search if we want instant feedback, 
  // but let's keep it for performance if the list is large.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ["follow-ups", category], // Only category in key now
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getPaginatedFollowUpItemsAction(category, pageParam as number, 15);
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    // Only use initialData if we are on the initial category
    initialData: (category === initialCategory) ? {
      pages: [{ items: initialItems, hasMore: initialHasMore }],
      pageParams: [1]
    } as any : undefined,
    staleTime: 5 * 60 * 1000,
  });

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isFetchingNextPage) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const handleToggleFollowUp = async (id: string, currentlySent: boolean) => {
    setUpdatingId(id);
    const res = await toggleFollowUpSentAction(id, !currentlySent);
    
    if (res.success) {
      toast({
        title: !currentlySent ? "Follow-up marked as sent" : "Follow-up marked as unsent",
        description: "The list will update momentarily.",
      });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
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
    setMethodFilter("ALL");
    setStatusFilter("ALL");
  };

  const tabs: { id: Category; label: string }[] = [
    { id: "OVERDUE", label: "Overdue" },
    { id: "TODAY", label: "Due Today" },
    { id: "UPCOMING", label: "Upcoming" },
    { id: "SENT", label: "Sent" },
  ];

  const allRawItems = data?.pages.flatMap(page => page.items) || [];

  // Frontend Filtering logic (Same pattern as dashboard)
  const filteredItems = allRawItems.filter((item) => {
    // Search Filter
    const matchesSearch = 
        !debouncedSearch || 
        item.companyName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        item.personName.toLowerCase().includes(debouncedSearch.toLowerCase());

    // Contact Method Filter
    const matchesMethod = methodFilter === "ALL" || item.contactMethod === methodFilter;

    // Status Filter
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const hasActiveFilters = !!(searchTerm || methodFilter !== "ALL" || statusFilter !== "ALL");

  return (
    <div className="space-y-6">
      {/* Tabs UI */}
      <div className="border-b border-border/50">
        <div className="flex gap-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
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
            placeholder="Search company or contact..." 
            className="pl-10 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="h-11 border-2">
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 border-2">
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

        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-11 px-4 gap-2 font-bold text-destructive hover:bg-destructive/10 rounded-xl transition-all"
            >
              <FiX className="w-4 h-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {isLoading && allRawItems.length === 0 ? (
          <div className="flex justify-center p-12">
            <FiRefreshCw className="w-8 h-8 animate-spin text-primary/40" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-8 text-center">
            <p className="text-muted-foreground italic">
              {hasActiveFilters 
                ? "No follow-ups match your current filters." 
                : "No follow-ups found for this category."}
            </p>
            {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2 text-primary">
                    Clear all filters
                </Button>
            )}
            {/* If we have no visible results but more data is on server, we should let user load more */}
            {hasNextPage && (
              <div ref={lastElementRef} className="h-4 w-full" />
            )}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-border/50 bg-card overflow-hidden">
            <div className="divide-y divide-border/30">
              {filteredItems.map((item, index) => (
                <div 
                  key={item.id}
                  ref={index === filteredItems.length - 1 ? lastElementRef : null}
                  className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/30 transition-all duration-200 group gap-4 md:gap-0"
                >
                    <div className="flex items-start gap-4 md:gap-6 flex-1">
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
                                {category === "SENT" ? <FiCheckCircle className="w-4 h-4 md:w-5 md:h-5" /> : <FiCalendar className="w-4 h-4 md:w-5 md:h-5" />}
                            </div>
                        </div>

                        <div className="flex-1 space-y-2 min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="space-y-0.5 md:space-y-1 min-w-0">
                                    <h3 className="text-base md:text-lg font-bold tracking-tight group-hover:text-primary transition-colors truncate">
                                        {item.companyName}
                                    </h3>
                                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                                        {item.contacts[0]?.personName || item.personName} {item.contacts.length > 1 ? `(+${item.contacts.length - 1} more)` : ""} • {item.roleTargeted}
                                    </p>
                                </div>
                                <div className="scale-90 md:scale-100 origin-top-right shrink-0">
                                    <StatusBadge status={item.status} />
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <FiClock className="w-3.5 h-3.5" />
                                    {format(new Date(item.followUpDueAt), "MMM d, yyyy")}
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

                    <div className="flex items-center justify-end gap-2 md:gap-3 pl-12 md:pl-6 w-full md:w-auto">
                        <OutreachActions id={item.id} currentStatus={item.status} />
                        {category !== "SENT" && (
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
        
        {isFetchingNextPage && (
          <div className="flex justify-center p-4">
            <FiRefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
