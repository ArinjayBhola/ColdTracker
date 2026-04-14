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
import { Checkbox } from "@/components/ui/checkbox";
import { bulkDeleteOutreach } from "@/actions/outreach";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FiTrash2, FiAlertTriangle, FiCheck } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type OutreachItem = {
  id: string;
  companyName: string;
  companyLink: string | null;
  roleTargeted: string;
  personName: string;
  personRole: string;
  status: string;
  messageSentAt: Date | string;
  followUpDueAt: Date | string;
  followUpSentAt?: Date | null;
  contactMethod: string;
  contactCount: number;
  contacts: any[];
};

type OutreachTableProps = {
  items: OutreachItem[];
  totalCount: number;
  currentPage: number;
};

export function OutreachTable({ items, totalCount, currentPage }: OutreachTableProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const itemsPerPage = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "ALL";

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.personName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleFilterChange = (newFilter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", newFilter);
    params.set("page", "1");
    router.push(`/dashboard?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleDateChange = (type: "start" | "end", date: string) => {
    if (type === "start") {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  };

  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    try {
      const res = await bulkDeleteOutreach(Array.from(selectedIds));
      if (res.success) {
        toast({
          title: "Delete Successful",
          description: `Successfully deleted ${selectedIds.size} outreach items.`,
        });
        setSelectedIds(new Set());
        setShowDeleteDialog(false);
        router.refresh();
      } else {
        toast({
          title: "Delete Failed",
          description: res.error || "Failed to delete items.",
          variant: "destructive",
        });
      }
    } catch (error) {
       toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <TableShell>
      <TableHeader
        title="Recent Outreach"
        subtitle={`Showing ${totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalCount)} of ${totalCount} applications`}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        placeholder="Search by company or person..."
      >
        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="h-10 px-4 gap-2 font-bold shadow-lg shadow-destructive/20 animate-in fade-in slide-in-from-right-2"
            >
              <FiTrash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </Button>
          )}

          <div className="flex items-center gap-2">
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
            <th className="h-12 w-[40px] px-4 align-middle">
              <Checkbox
                checked={items.length > 0 && selectedIds.size === items.length}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </th>
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
              <td colSpan={7} className="p-12 text-center text-muted-foreground text-base italic">
                No outreach items match your search.
              </td>
            </tr>
          ) : (
            filteredItems.map((item) => (
              <tr
                key={item.id}
                className={cn(
                  "border-b border-border/30 transition-all duration-200 hover:bg-muted/30 group",
                  selectedIds.has(item.id) && "bg-primary/5 hover:bg-primary/10"
                )}
              >
                <td className="p-3 md:p-6 align-middle">
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelectItem(item.id)}
                    aria-label={`Select ${item.companyName}`}
                  />
                </td>
                <td className="p-3 md:p-6 align-middle">
                  <div className="flex flex-col gap-1 md:gap-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                      <div className="flex items-center gap-2">
                        {!["REPLIED", "REJECTED", "OFFER", "CLOSED"].includes(item.status) && !item.followUpSentAt && (
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse",
                            item.followUpDueAt && new Date(item.followUpDueAt) < new Date()
                              ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                              : item.followUpDueAt && new Date(item.followUpDueAt).toDateString() === new Date().toDateString()
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
                    {item.messageSentAt ? format(new Date(item.messageSentAt), "MMM d, yyyy") : "-"}
                  </span>
                </td>
                <td className="hidden sm:table-cell p-6 align-middle">
                  {item.status !== "REPLIED" && item.status !== "CLOSED" && item.status !== "REJECTED" ? (
                    <span className={cn(
                      "text-[10px] md:text-xs font-semibold px-2 md:px-3 py-1 md:py-1.5 rounded-full border whitespace-nowrap inline-block",
                      item.followUpDueAt && new Date(item.followUpDueAt) < new Date() 
                        ? "bg-destructive/10 text-destructive border-destructive/30" 
                        : "bg-background text-muted-foreground border-border"
                    )}>
                      {item.followUpDueAt ? format(new Date(item.followUpDueAt), "MMM d") : "-"}
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
        onPageChange={handlePageChange}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-[2.5rem] border-2 shadow-2xl backdrop-blur-2xl bg-card/95 max-w-[440px] p-8">
          <AlertDialogHeader className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-[2rem] bg-destructive/5 flex items-center justify-center border-2 border-destructive/10 shadow-inner">
                <FiAlertTriangle className="w-10 h-10 text-destructive animate-pulse" />
              </div>
              <div className="space-y-2">
                <AlertDialogTitle className="text-3xl font-extrabold tracking-tight">Mass Delete?</AlertDialogTitle>
                <AlertDialogDescription className="text-base font-medium text-muted-foreground">
                  You are about to permanently remove <span className="font-bold text-foreground underline decoration-destructive/30 decoration-2 underline-offset-2">{selectedIds.size}</span> entries.
                </AlertDialogDescription>
              </div>
            </div>

            <div className="bg-destructive/10 border-2 border-destructive/20 rounded-2xl p-4 flex gap-3 items-start animate-in fade-in zoom-in-95 duration-500">
               <FiAlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
               <p className="text-sm font-bold text-destructive leading-relaxed">
                 Critical: This action cannot be undone. All associated contacts and status history will be lost forever.
               </p>
            </div>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="grid grid-cols-2 gap-4 mt-8 sm:flex-none">
            <AlertDialogCancel asChild>
              <Button 
                variant="outline" 
                disabled={isDeleting}
                className="h-14 rounded-2xl font-bold border-2 hover:bg-muted transition-all active:scale-95"
              >
                Keep them
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction
              asChild
            >
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="h-14 rounded-2xl font-bold shadow-xl shadow-destructive/20 bg-destructive hover:bg-destructive/90 transition-all active:scale-95"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableShell>
  );
}
