"use client";

import { useEffect, useRef, useState } from "react";
import { FiGrid, FiList, FiSearch } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StartupsGrid } from "./startups-grid";
import { StartupsTable } from "./startups-table";
import { TablePagination } from "@/components/ui/data-table/table-pagination";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StartupItem = {
  id: string;
  name: string;
  sector: string | null;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  location: string | null;
  teamSize: string | null;
  fundingAmount: string | null;
  isHiring: boolean | null;
  isTrending: boolean | null;
  tracking: { outreachDone: boolean; followUpDate: Date | null; notes: string | null }[];
  employees: { id: string; name: string; role: string | null; email: string | null; linkedinUrl: string | null }[];
};

type StartupsExplorerProps = {
  items: StartupItem[];
  totalCount: number;
  currentPage: number;
  initialSearch: string;
  initialSort: string;
};

export function StartupsExplorer({ items, totalCount, currentPage, initialSearch, initialSort }: StartupsExplorerProps) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const isFirstSearchEffect = useRef(true);
  const router = useRouter();

  const pageSize = 21;
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    if (isFirstSearchEffect.current) {
      isFirstSearchEffect.current = false;
      return;
    }
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      else params.delete("q");
      params.set("sort", sort);
      params.set("page", "1");
      router.replace(`/startups?${params.toString()}`);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchQuery, sort, router]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(page));
    router.push(`/startups?${params.toString()}`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Search and View Toggles */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-2xl group">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search startups..."
            className="pl-11 h-12 bg-muted/30 border-border/50 rounded-2xl focus:bg-background transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-10 w-[220px] rounded-xl border-border/50 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NOT_OUTREACHED">Not outreach done</SelectItem>
            <SelectItem value="OUTREACHED">Outreach done first</SelectItem>
            <SelectItem value="A_Z">Alphabetical A-Z</SelectItem>
            <SelectItem value="Z_A">Reverse alphabetical Z-A</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-2xl border border-border/50 shrink-0 self-end md:self-auto">
          <Button 
            variant={view === "grid" ? "default" : "ghost"} 
            size="sm" 
            className={cn("rounded-xl h-9 px-4 gap-2", view === "grid" && "shadow-lg")}
            onClick={() => setView("grid")}
          >
            <FiGrid className="w-4 h-4" />
            Grid
          </Button>
          <Button 
            variant={view === "list" ? "default" : "ghost"} 
            size="sm" 
            className={cn("rounded-xl h-9 px-4 gap-2", view === "list" && "shadow-lg")}
            onClick={() => setView("list")}
          >
            <FiList className="w-4 h-4" />
            Details
          </Button>
        </div>
      </div>

      <div className="min-h-[400px]">

        {view === "grid" ? (
        <StartupsGrid items={items} />
      ) : (
          <StartupsTable items={items} totalCount={totalCount} currentPage={currentPage} />
        )}
      </div>

      {view === "grid" && totalPages > 1 && (
        <div className="pt-8 border-t border-border/30">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
