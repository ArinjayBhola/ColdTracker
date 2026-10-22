"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiUsers, FiUser, FiMail, FiLinkedin, FiTrash2, FiLink, FiAlertTriangle } from "react-icons/fi";
import { contactDisplayName } from "@/lib/contact-display";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Contact {
  personName: string;
  personRole: string;
  contactMethod: string;
  emailAddress?: string | null;
  linkedinProfileUrl?: string | null;
}

interface OutreachContactsCardProps {
  contacts: Contact[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onDelete?: (index: number) => void;
}

export function OutreachContactsCard({ contacts, activeIndex, onSelect, onDelete }: OutreachContactsCardProps) {
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);

  const handleDelete = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setDeleteIdx(idx);
  };

  const confirmDelete = () => {
    if (deleteIdx !== null && onDelete) {
      onDelete(deleteIdx);
      setDeleteIdx(null);
    }
  };

  return (
    <>
      <Card className="border-2 shadow-sm rounded-3xl overflow-hidden bg-card">
        <CardHeader className="pb-3 px-6 pt-6">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <FiUsers className="w-5 h-5 text-primary" />
            Company Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-6">
          {contacts.map((contact, idx) => {
            const isActive = idx === activeIndex;
            const name = contact.personName?.trim();
            const displayName = contactDisplayName(contact);
            return (
              <div 
                key={idx} 
                onClick={() => onSelect(idx)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer group relative",
                  isActive 
                    ? "bg-primary/5 border-primary/50 shadow-sm" 
                    : "bg-muted/20 border-transparent hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-primary/10 text-primary"
                )}>
                  {name ? Array.from(name)[0].toUpperCase() : <FiUser className="h-5 w-5" aria-label="Unnamed contact" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className="font-extrabold truncate text-base text-foreground" title={displayName}>
                      {displayName}
                    </p>
                    {isActive && <span className="shrink-0 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase text-primary">Active</span>}
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                    <span className="truncate">{contact.personRole?.trim() || "Position not added"}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <div className="flex shrink-0 items-center gap-1 text-[10px] uppercase font-black tracking-wider text-primary">
                      {contact.contactMethod === "LINKEDIN" ? <FiLinkedin className="w-2.5 h-2.5" /> : <FiMail className="w-2.5 h-2.5" />}
                      {contact.contactMethod}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {contacts.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => handleDelete(e, idx)}
                      aria-label={`Delete ${displayName}`}
                      className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                    <FiLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog open={deleteIdx !== null} onOpenChange={(open) => !open && setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Remove Contact?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-muted-foreground">
              Are you sure you want to remove <span className="font-bold text-foreground">
                {deleteIdx !== null && contacts[deleteIdx] ? contactDisplayName(contacts[deleteIdx]) : "this contact"}
              </span>? This will only remove them from this company&apos;s list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
