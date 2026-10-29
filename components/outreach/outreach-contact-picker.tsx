"use client";

import { useState } from "react";
import { ChevronDown, Check, Trash2, UserRound } from "lucide-react";
import type { OutreachContact } from "@/db/schema";
import { contactDisplayName } from "@/lib/contact-display";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type Props = {
  contacts: OutreachContact[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
};

export function OutreachContactPicker({ contacts, activeIndex, onSelect, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const active = contacts[activeIndex] ?? contacts[0];
  if (!active) return null;
  return <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label="Select contact" className="h-auto min-h-10 max-w-full gap-2 rounded-xl px-3 py-2 text-left">
          <UserRound className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 whitespace-normal break-words">{contactDisplayName(active)}
            <span className="ml-2 font-normal text-muted-foreground">{activeIndex + 1} of {contacts.length}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-2">
        <p className="px-3 py-2 text-xs font-medium text-muted-foreground">Contacts · {contacts.length}</p>
        <ul aria-label="Company contacts" className="max-h-80 space-y-1 overflow-y-auto">
          {contacts.map((contact, index) => <li key={contact.id ?? index} className={cn("flex min-w-0 items-center gap-1 rounded-lg p-1", index === activeIndex && "bg-primary/5")}>
            <button type="button" aria-pressed={index === activeIndex} onClick={() => { onSelect(index); setOpen(false); }}
              className="flex min-w-0 flex-1 items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Check aria-hidden="true" className={cn("mt-1 h-4 w-4 shrink-0 text-primary", index !== activeIndex && "invisible")} />
              <span className="min-w-0 space-y-1">
                <span className="block font-medium [overflow-wrap:anywhere]">{contactDisplayName(contact)}</span>
                <span className="block text-xs text-muted-foreground [overflow-wrap:anywhere]">{contact.personRole || "Position not added"} · {contact.contactMethod === "LINKEDIN" ? "LinkedIn" : "Email"}</span>
              </span>
            </button>
            {contacts.length > 1 && <Button variant="ghost" size="icon" aria-label={`Delete ${contactDisplayName(contact)}`} className="h-8 w-8 shrink-0 hover:text-destructive" onClick={() => { setOpen(false); setDeleteIndex(index); }}><Trash2 className="h-4 w-4" /></Button>}
          </li>)}
        </ul>
      </PopoverContent>
    </Popover>
    <AlertDialog open={deleteIndex !== null} onOpenChange={next => { if (!next) setDeleteIndex(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Remove contact?</AlertDialogTitle><AlertDialogDescription>
          Remove {deleteIndex !== null && contacts[deleteIndex] ? contactDisplayName(contacts[deleteIndex]) : "this contact"} from this outreach?
        </AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteIndex !== null) onDelete(deleteIndex); setDeleteIndex(null); }}>Remove contact</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
