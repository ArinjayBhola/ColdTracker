"use client";
import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExportExcel } from "@/components/export-excel";
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button";
export function DashboardTools() {
  return <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Dashboard tools"><Ellipsis className="h-5 w-5" /></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-60 bg-card p-3"><p className="mb-3 px-1 text-xs text-muted-foreground">WORKSPACE TOOLS</p><div className="flex flex-col gap-2 [&>button]:w-full [&>button]:justify-start"><DashboardRefreshButton /><ExportExcel fileName="cold-track-export" /></div></PopoverContent>
  </Popover>;
}
