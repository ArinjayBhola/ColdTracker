"use client";

import { Button } from "@/components/ui/button";
import { FiRefreshCw, FiBriefcase, FiUser } from "react-icons/fi";
import Link from "next/link";
import { ReactNode } from "react";

interface DetailHeaderProps {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  badge?: ReactNode;
  infoBar?: ReactNode;
  actions?: ReactNode;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  backUrl?: string;
  backLabel?: string;
}

export function DetailHeader({
  title,
  subtitle,
  icon,
  badge,
  infoBar,
  actions,
  isRefreshing,
  onRefresh,
  backUrl = "/dashboard",
  backLabel = "Back to Dashboard",
}: DetailHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href={backUrl}>
            <FiUser className="h-5 w-5" />
            {backLabel}
          </Link>
        </Button>
        
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className="fixed right-28 top-4 z-40 h-9 w-9 rounded-full bg-background shadow-sm md:right-[7.5rem]"
            title="Refresh data"
            aria-label="Refresh data"
          >
            <FiRefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>
    
      <div className="grid min-w-0 gap-x-6 gap-y-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5">
              {icon || <FiBriefcase className="w-6 h-6 text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight [overflow-wrap:anywhere] md:text-4xl">{title}</h1>
                {badge}
              </div>
            </div>
          </div>
        <div data-detail-header-actions className="flex max-w-full flex-wrap items-center gap-2 xl:justify-end xl:pt-1">{actions}</div>
        <p className="line-clamp-2 min-w-0 text-base font-medium text-muted-foreground [overflow-wrap:anywhere] md:pl-15 md:text-lg xl:col-span-2" title={subtitle}>{subtitle}</p>
        {infoBar && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3 text-muted-foreground md:pl-15 xl:col-span-2">{infoBar}</div>}
      </div>
    </div>
  );
}
