"use client";

import { Button } from "@/components/ui/button";
import { FiRefreshCw, FiBriefcase, FiMail, FiLinkedin, FiUser } from "react-icons/fi";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AddContactDialog } from "@/components/add-contact-dialog";
import { EditOutreachDialog } from "@/components/edit-outreach-dialog";
import { StatusBadge } from "@/components/status-badge";
import { OutreachActions } from "@/components/outreach-actions";
import { DeleteArchiveActions } from "@/components/delete-archive-actions";
import { EditOutreachValues } from "@/lib/validations";

interface OutreachHeaderProps {
  companyName: string;
  roleTargeted: string;
  personName: string;
  personRole: string;
  contactMethod: string;
  status: string;
  id: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  outreachData: any; // Using any for now to simplify, but ideally should be typed matches EditOutreachValues
}

export function OutreachHeader({
  companyName,
  roleTargeted,
  personName,
  personRole,
  contactMethod,
  status,
  id,
  isRefreshing,
  onRefresh,
  outreachData,
}: OutreachHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/dashboard">
            <FiUser className="h-5 w-5" />
            Back to Dashboard
          </Link>
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="h-9 w-9 rounded-xl border-2"
          title="Refresh data"
        >
          <FiRefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>
    
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex items-start md:items-center gap-3">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5">
              <FiBriefcase className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{companyName}</h1>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border",
                  contactMethod === "EMAIL"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                )}>
                  {contactMethod === "EMAIL" ? (
                    <><FiMail className="w-4 h-4" /> Email</>
                  ) : (
                    <><FiLinkedin className="w-4 h-4" /> LinkedIn</>
                  )}
                </span>
              </div>
              <p className="text-lg text-muted-foreground mt-1 font-medium">{roleTargeted}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground md:ml-15 mt-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
              <FiUser className="w-4 h-4" />
              <span className="font-bold text-foreground text-sm">{personName}</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-sm font-semibold">{personRole}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <AddContactDialog outreachId={id} />
          <div className="h-8 w-px bg-border mx-1 hidden md:block" />
          <EditOutreachDialog initialData={outreachData as unknown as EditOutreachValues} />
          <div className="h-8 w-px bg-border mx-1 hidden md:block" />
          <StatusBadge status={status} />
          <OutreachActions id={id} currentStatus={status} />
          <DeleteArchiveActions id={id} />
        </div>
      </div>
    </div>
  );
}
