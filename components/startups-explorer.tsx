"use client";

import { useState } from "react";
import { FiGrid, FiList, FiSearch, FiChevronDown } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StartupsGrid } from "./startups-grid";
import { StartupsTable } from "./startups-table";
import { TablePagination } from "@/components/ui/data-table/table-pagination";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type StartupItem = any; // Simplified for now

type StartupsExplorerProps = {
  items: StartupItem[];
  totalCount: number;
  currentPage: number;
  sectorCounts: Record<string, number>;
};

export function StartupsExplorer({ items, totalCount, currentPage, sectorCounts }: StartupsExplorerProps) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();


  const pageSize = 50;
  const totalPages = Math.ceil(totalCount / pageSize);

  const filteredItems = items.filter(item => {
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           item.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handlePageChange = (page: number) => {
    router.push(`/startups?page=${page}`);
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
          <StartupsGrid items={filteredItems} />
        ) : (
          <StartupsTable items={filteredItems} totalCount={totalCount} currentPage={currentPage} />
        )}
      </div>

      {totalPages > 1 && (
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

