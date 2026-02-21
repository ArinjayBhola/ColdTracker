"use client";

import { FiSearch, FiXCircle } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface TableHeaderProps {
  title: string;
  subtitle: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function TableHeader({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  placeholder = "Search...",
  children,
}: TableHeaderProps) {
  return (
    <div className="p-6 border-b border-border/50 bg-muted/30">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-64 lg:w-80">
            <input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-10 rounded-lg border-2 border-border bg-background text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <FiXCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
