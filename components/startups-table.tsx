"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FiCheckCircle, FiCircle, FiCalendar, FiExternalLink, FiSearch, FiMoreVertical, FiLinkedin, FiMail } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TableShell, TableContent } from "@/components/ui/data-table/table-shell";
import { TableHeader } from "@/components/ui/data-table/table-header";
import { TablePagination } from "@/components/ui/data-table/table-pagination";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { toggleStartupOutreachAction, updateStartupFollowUpAction } from "@/actions/startups";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type StartupItem = {
  id: string;
  name: string;
  sector: string | null;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  tracking: {
    outreachDone: boolean;
    followUpDate: Date | null;
    notes: string | null;
  }[];
  employees: {
    id: string;
    name: string;
    role: string | null;
    email: string | null;
    linkedinUrl: string | null;
  }[];
};


type StartupsTableProps = {
  items: StartupItem[];
  totalCount: number;
  currentPage: number;
};

export function StartupsTable({ items, totalCount, currentPage }: StartupsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sector?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleOutreach = async (startupId: string, currentStatus: boolean) => {
    try {
      await toggleStartupOutreachAction(startupId, !currentStatus);
      toast({
        title: !currentStatus ? "Marked as contacted" : "Marked as not contacted",
        description: "Status updated successfully.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    }
  };

  const handleDateChange = async (startupId: string, date: Date | undefined) => {
    try {
      await updateStartupFollowUpAction(startupId, date || null);
      toast({
        title: "Follow-up date updated",
        description: date ? `Set to ${format(date, "MMM d, yyyy")}` : "Date cleared",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update follow-up date.",
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    router.push(`/startups?page=${newPage}`);
  };

  return (
    <TableShell>
      <TableHeader
        title="Startups Ecosystem"
        subtitle={`Showing ${items.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalCount)} of ${totalCount} startups`}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search startups or sectors..."
      />

      <TableContent>
        <thead className="border-b border-border/50 bg-muted/30">
          <tr>
            <th className="h-12 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Startup</th>
            <th className="h-12 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Founders</th>
            <th className="h-12 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="h-12 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Follow Up</th>
            <th className="h-12 px-6 text-right align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-12 text-center text-muted-foreground italic">
                No startups found.
              </td>
            </tr>
          ) : (
            filteredItems.map((item) => {
              const tracking = item.tracking[0] || { outreachDone: false, followUpDate: null };
              return (
                <tr key={item.id} className="border-b border-border/30 transition-all hover:bg-muted/30 group">
                  <td className="p-6 align-middle">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border-2 border-muted shrink-0 rounded-xl">
                        <AvatarImage src={item.logoUrl || ""} alt={item.name} className="object-cover" />
                        <AvatarFallback className="rounded-xl font-bold bg-primary/5 text-primary">{item.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{item.name}</span>
                           <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold bg-primary/5 text-primary/70 border border-primary/10 whitespace-nowrap">
                            {item.sector || "N/A"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{item.description}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 align-middle">
                    <div className="flex flex-col gap-1">
                      {item.employees.slice(0, 2).map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-foreground/80 truncate max-w-[100px]">{emp.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {emp.linkedinUrl && (
                              <a href={emp.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                                <FiLinkedin className="w-3 h-3" />
                              </a>
                            )}
                            {emp.email && (
                              <a href={`mailto:${emp.email}`} className="text-muted-foreground hover:text-foreground">
                                <FiMail className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                      {item.employees.length > 2 && (
                        <span className="text-[10px] text-muted-foreground font-medium">+{item.employees.length - 2} more</span>
                      )}
                      {item.employees.length === 0 && <span className="text-[10px] text-muted-foreground italic">No founders listed</span>}
                    </div>
                  </td>
                  <td className="p-6 align-middle">
                    <button
                      onClick={() => handleToggleOutreach(item.id, tracking.outreachDone)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                        tracking.outreachDone
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                      )}
                    >
                      {tracking.outreachDone ? <FiCheckCircle className="w-4 h-4" /> : <FiCircle className="w-4 h-4" />}
                      {tracking.outreachDone ? "Contacted" : "To Outreach"}
                    </button>
                  </td>
                  <td className="p-6 align-middle">
                    <DatePicker
                      value={tracking.followUpDate ? new Date(tracking.followUpDate) : undefined}
                      onChange={(date) => handleDateChange(item.id, date)}
                      placeholder="Set Date"
                      className="w-[130px]"
                    />
                  </td>
                  <td className="p-6 align-middle text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.website && (
                        <Button variant="ghost" size="icon" asChild title="Visit Website" className="h-8 w-8">
                          <a href={item.website} target="_blank" rel="noopener noreferrer">
                            <FiExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FiMoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-2">
                          <DropdownMenuItem asChild>
                            <Link href={`/outreach/new?company=${encodeURIComponent(item.name)}`}>
                              Create Outreach entry
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>

      </TableContent>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </TableShell>
  );
}
