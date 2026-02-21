"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiUsers, FiMail, FiLinkedin, FiLink, FiTrash2 } from "react-icons/fi";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { deleteExtensionLeadAction } from "@/actions/extension-leads";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Contact {
  id: string;
  personName: string;
  personRole: string | null;
  emailAddress: string | null;
}

interface ExtensionLeadContactsCardProps {
  contacts: Contact[];
  activeId: string;
}

export function ExtensionLeadContactsCard({ contacts, activeId }: ExtensionLeadContactsCardProps) {
  return (
    <Card className="border-2 shadow-sm rounded-3xl overflow-hidden">
      <CardHeader className="bg-muted/10 border-b">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <FiUsers className="w-5 h-5 text-primary" />
          Draft Leads
        </CardTitle>
        <p className="text-xs text-muted-foreground font-medium">Other potential contacts at this company.</p>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {contacts.length <= 1 && (
            <div className="py-8 text-center border-2 border-dashed rounded-2xl">
                <p className="text-sm text-muted-foreground italic">No other draft leads for this company.</p>
            </div>
        )}
        {contacts.filter(c => c.id !== activeId).map((contact) => (
          <ContactItem key={contact.id} contact={contact} />
        ))}
      </CardContent>
    </Card>
  );
}

function ContactItem({ contact }: { contact: Contact }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!confirm(`Are you sure you want to delete ${contact.personName}?`)) return;

        setIsDeleting(true);
        const result = await deleteExtensionLeadAction(contact.id);
        setIsDeleting(false);

        if (result.success) {
            toast({ title: "Lead deleted" });
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
    };

    return (
        <Link 
            href={`/dashboard/extension-leads/${contact.id}`}
            className="flex items-center gap-4 p-3 rounded-2xl border-2 border-transparent hover:border-border hover:bg-muted/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-extrabold text-sm text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              {contact.personName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate group-hover:text-primary transition-colors">{contact.personName}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <span>{contact.personRole || "Contact"}</span>
                {contact.emailAddress && (
                    <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                            <FiMail className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">{contact.emailAddress}</span>
                        </div>
                    </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <FiTrash2 className="w-4 h-4" />
              </Button>
              <FiLink className="w-4 h-4 text-muted-foreground mr-1" />
            </div>
        </Link>
    );
}
