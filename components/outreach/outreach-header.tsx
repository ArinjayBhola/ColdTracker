"use client";

import { Button } from "@/components/ui/button";
import { FiMail, FiLinkedin, FiUser, FiBriefcase } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { AddContactDialog } from "@/components/add-contact-dialog";
import { EditOutreachDialog } from "@/components/edit-outreach-dialog";
import { StatusBadge } from "@/components/status-badge";
import { OutreachActions } from "@/components/outreach-actions";
import { DeleteArchiveActions } from "@/components/delete-archive-actions";
import { EditOutreachValues } from "@/lib/validations";
import { DetailHeader } from "@/components/details/detail-header";

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
  outreachData: any;
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
    <DetailHeader
      title={companyName}
      subtitle={roleTargeted}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh}
      badge={
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
      }
      infoBar={
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
          <FiUser className="w-4 h-4" />
          <span className="font-bold text-foreground text-sm">{personName}</span>
          <span className="text-muted-foreground/30">•</span>
          <span className="text-sm font-semibold">{personRole}</span>
        </div>
      }
      actions={
        <>
          <AddContactDialog outreachId={id} />
          <div className="h-8 w-px bg-border mx-1 hidden md:block" />
          <EditOutreachDialog initialData={outreachData as unknown as EditOutreachValues} />
          <div className="h-8 w-px bg-border mx-1 hidden md:block" />
          <StatusBadge status={status} />
          <OutreachActions id={id} currentStatus={status} />
          <DeleteArchiveActions id={id} />
        </>
      }
    />
  );
}
