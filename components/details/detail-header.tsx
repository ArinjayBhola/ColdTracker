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
            className="h-9 w-9 rounded-xl border-2"
            title="Refresh data"
          >
            <FiRefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>
    
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex items-start md:items-center gap-3">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5">
              {icon || <FiBriefcase className="w-6 h-6 text-primary" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h1>
                {badge}
              </div>
              <p className="text-lg text-muted-foreground mt-1 font-medium">{subtitle}</p>
            </div>
          </div>
          {infoBar && (
            <div className="flex items-center gap-3 text-muted-foreground md:ml-15 mt-2">
              {infoBar}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          {actions}
        </div>
      </div>
    </div>
  );
}
