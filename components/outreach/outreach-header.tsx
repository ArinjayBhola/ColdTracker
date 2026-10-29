"use client";

import { FiMail, FiLinkedin } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { AddContactDialog } from "@/components/add-contact-dialog";
import { StatusBadge } from "@/components/status-badge";
import { OutreachActions } from "@/components/outreach-actions";
import { DeleteArchiveActions } from "@/components/delete-archive-actions";
import { DetailHeader } from "@/components/details/detail-header";
import { AutomationOutreachBadge } from "@/components/automation-outreach-badge";
import { OutreachContactPicker } from "@/components/outreach/outreach-contact-picker";
import type { OutreachContact } from "@/db/schema";

interface OutreachHeaderProps {
  id: string;
  companyName: string;
  roleTargeted: string;
  status: string;
  contacts: OutreachContact[];
  activeContactIndex: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  outreachData: { isAutomated?: boolean };
  onSelectContact: (index: number) => void;
  onDeleteContact: (index: number) => void;
}

export function OutreachHeader({
  id,
  companyName,
  roleTargeted,
  status,
  contacts,
  activeContactIndex,
  isRefreshing,
  onRefresh,
  outreachData,
  onSelectContact,
  onDeleteContact,
}: OutreachHeaderProps) {
  const activeContact: Partial<OutreachContact> = contacts[activeContactIndex] || contacts[0] || {};
  const contactMethod = activeContact.contactMethod || "EMAIL";

  return (
    <DetailHeader
      title={companyName}
      subtitle={roleTargeted}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh}
      badge={
        <span className="flex flex-wrap items-center gap-2">
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
        {outreachData.isAutomated && <AutomationOutreachBadge />}
        </span>
      }
      infoBar={
        <OutreachContactPicker contacts={contacts} activeIndex={activeContactIndex} onSelect={onSelectContact} onDelete={onDeleteContact} />
      }
      actions={
        <>
          <AddContactDialog outreachId={id} />
          <div className="h-8 w-px bg-border mx-1 hidden md:block" />
          <StatusBadge status={status} />
          <OutreachActions id={id} currentStatus={status} compact />
          <DeleteArchiveActions id={id} />
        </>
      }
    />
  );
}
