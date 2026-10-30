"use client";

import { useEffect, useRef, useState } from "react";
import { FiGrid, FiList, FiSearch } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteStartupsButton } from "@/components/delete-startups-button";
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
  teamSizeCounts: { value: string; label: string; count: number }[];
  selectedTeamSize: string;
};

export function StartupsExplorer({ items, totalCount, currentPage, initialSearch, initialSort, teamSizeCounts, selectedTeamSize }: StartupsExplorerProps) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const selectionScope = JSON.stringify([currentPage, initialSearch, initialSort, selectedTeamSize, items.map(item => item.id)]);
  const [selection, setSelection] = useState<{ scope: string; ids: string[] }>({ scope: selectionScope, ids: [] });
  const selectedIds = selection.scope === selectionScope ? selection.ids : [];
  const selectedItems = items.filter(item => selectedIds.includes(item.id));
  const toggleSelection = (id: string, checked: boolean) => {
    setSelection(previous => {
      const ids = previous.scope === selectionScope ? previous.ids : [];
      return { scope: selectionScope, ids: checked ? [...new Set([...ids, id])] : ids.filter(value => value !== id) };
    });
  };
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

      <div className="space-y-3">
        <p className="text-sm font-semibold">Team size <span className="font-normal text-muted-foreground">· employees</span></p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter startups by team size">
          {[{ value: "all", label: "All sizes", count: teamSizeCounts.reduce((sum, filter) => sum + filter.count, 0) }, ...teamSizeCounts].map(filter => (
            <Button
              key={filter.value}
              variant={selectedTeamSize === filter.value ? "default" : "outline"}
              size="sm"
              className="gap-2 rounded-xl"
              aria-pressed={selectedTeamSize === filter.value}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                if (filter.value === "all") params.delete("size");
                else params.set("size", filter.value);
                if (searchQuery.trim()) params.set("q", searchQuery.trim());
                else params.delete("q");
                params.set("sort", sort);
                params.set("page", "1");
                router.push(`/startups?${params.toString()}`);
              }}
            >
              {filter.label}
              <span className={cn(
                "inline-flex min-w-6 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                selectedTeamSize === filter.value ? "bg-background/20" : "bg-muted text-muted-foreground"
              )}>{filter.count}</span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Reported ranges are grouped by their upper limit. Open-ended sizes include values such as 100+.</p>
      </div>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/20 p-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
            <Checkbox
              checked={selectedItems.length === items.length ? true : selectedItems.length ? "indeterminate" : false}
              onCheckedChange={checked => setSelection({ scope: selectionScope, ids: checked === true ? items.map(item => item.id) : [] })}
            />
            Select this page ({items.length})
          </label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground" aria-live="polite">{selectedItems.length} selected</span>
            {selectedItems.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSelection({ scope: selectionScope, ids: [] })}>Clear</Button>}
            <DeleteStartupsButton items={selectedItems} onDeleted={count => {
              setSelection({ scope: selectionScope, ids: [] });
              const lastPage = Math.max(1, Math.ceil((totalCount - count) / pageSize));
              if (currentPage > lastPage) handlePageChange(lastPage);
              router.refresh();
            }} />
          </div>
        </div>
      )}

      <div className="min-h-[400px]">

        {items.length === 0 ? (
          <div className="rounded-2xl border border-border/50 p-12 text-center text-muted-foreground">No startups match your search and team size.</div>
        ) : view === "grid" ? (
        <StartupsGrid items={items} selectedIds={selectedIds} onSelect={toggleSelection} />
      ) : (
          <StartupsTable items={items} totalCount={totalCount} currentPage={currentPage} selectedIds={selectedIds} onSelect={toggleSelection} />
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
