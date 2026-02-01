"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiUsers, FiMail, FiLinkedin, FiLink } from "react-icons/fi";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DeleteArchiveActions } from "@/components/delete-archive-actions";

interface Contact {
  id: string;
  personName: string;
  personRole: string;
  contactMethod: string;
}

interface OutreachContactsCardProps {
  contacts: Contact[];
  activeId: string;
}

export function OutreachContactsCard({ contacts, activeId }: OutreachContactsCardProps) {
  return (
    <Card className="border-2 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <FiUsers className="w-5 h-5 text-primary" />
          Company Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {contacts.map((contact) => (
          <Link 
            key={contact.id} 
            href={`/outreach/${contact.id}`}
            className={cn(
              "flex items-center gap-4 p-3 rounded-xl border-2 transition-all group",
              contact.id === activeId 
                ? "bg-primary/5 border-primary/20 shadow-primary/5 shadow-inner" 
                : "hover:bg-muted/50 border-transparent hover:border-border"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm",
              contact.id === activeId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {contact.personName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold truncate">{contact.personName}</p>
                {contact.id === activeId && <span className="text-[10px] font-black text-primary px-1.5 py-0.5 bg-primary/10 rounded uppercase tracking-tighter shadow-sm shrink-0">Active</span>}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <span>{contact.personRole}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {contact.contactMethod === 'EMAIL' ? <FiMail className="w-3 h-3" /> : <FiLinkedin className="w-3 h-3" />}
                  <span>{contact.contactMethod}</span>
                </div>
              </div>
            </div>
            {contact.id !== activeId && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DeleteArchiveActions id={contact.id} isIcon />
                <FiLink className="w-4 h-4 text-muted-foreground mr-1" />
              </div>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
