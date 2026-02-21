"use client";

import { cn } from "@/lib/utils";

interface TableShellProps {
  children: React.ReactNode;
  className?: string;
}

export function TableShell({ children, className }: TableShellProps) {
  return (
    <div className={cn("rounded-2xl border-2 border-border/50 bg-card overflow-hidden", className)}>
      {children}
    </div>
  );
}

interface TableContentProps {
  children: React.ReactNode;
  className?: string;
}

export function TableContent({ children, className }: TableContentProps) {
  return (
    <div className={cn("relative w-full overflow-auto", className)}>
      <table className="w-full caption-bottom text-sm">
        {children}
      </table>
    </div>
  );
}
