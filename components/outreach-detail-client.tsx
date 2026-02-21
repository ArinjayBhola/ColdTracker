"use client";

import { useQuery } from "@tanstack/react-query";
import { getOutreachById } from "@/actions/get-outreach";
import { getCompanyContacts } from "@/actions/outreach";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiFileText } from "react-icons/fi";
import { NotesEditor } from "@/components/notes-editor";
import { useState } from "react";
import { toggleFollowUpSentAction, updateFollowUpDateAction } from "@/actions/follow-ups";
import { useToast } from "@/hooks/use-toast";
import { OutreachHeader } from "@/components/outreach/outreach-header";
import { OutreachDetailsCard } from "@/components/outreach/outreach-details-card";
import { OutreachTimelineCard } from "@/components/outreach/outreach-timeline-card";
import { OutreachContactsCard } from "@/components/outreach/outreach-contacts-card";

type OutreachDetailClientProps = {
  initialData: Awaited<ReturnType<typeof getOutreachById>>;
  initialContacts: Awaited<ReturnType<typeof getCompanyContacts>>;
  id: string;
};

export function OutreachDetailClient({ initialData, initialContacts, id }: OutreachDetailClientProps) {
  const [activeContactIndex, setActiveContactIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  const { data: item, refetch: refetchItem } = useQuery({
    queryKey: ["outreach", id],
    queryFn: () => getOutreachById(id),
    initialData,
    staleTime: 60 * 1000,
  });

  const { data: companyContacts = [], refetch: refetchContacts } = useQuery({
    queryKey: ["company-contacts", item?.companyName],
    queryFn: () => getCompanyContacts(item?.companyName || ""),
    initialData: initialContacts,
    enabled: !!item?.companyName,
    staleTime: 60 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchItem(), refetchContacts()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleToggleFollowUp = async () => {
    if (!item) return;
    
    setIsUpdatingFollowUp(true);
    const isSent = !!item.followUpSentAt;
    const res = await toggleFollowUpSentAction(item.id, !isSent);
    
    if (res.success) {
      toast({
        title: !isSent ? "Follow-up marked as sent" : "Follow-up marked as unsent",
        description: !isSent ? "The follow-up status has been updated." : "The follow-up status has been reverted.",
      });
      await refetchItem();
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to update follow-up status",
        variant: "destructive",
      });
    }
    setIsUpdatingFollowUp(false);
  };

  const handleUpdateDate = async () => {
    if (!item || !newDueDate) return;
    
    setIsUpdatingFollowUp(true);
    const res = await updateFollowUpDateAction(item.id, newDueDate);
    
    if (res.success) {
      toast({
        title: "Follow-up date updated",
        description: "The due date has been changed successfully.",
      });
      await refetchItem();
      setIsEditingDate(false);
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to update date",
        variant: "destructive",
      });
    }
    setIsUpdatingFollowUp(false);
  };

  const handleSaveDetails = async (data: Record<string, string>) => {
    if (!item) return;
    const { updateOutreachInlineAction } = await import("@/actions/outreach");
    const res = await updateOutreachInlineAction(item.id, activeContactIndex, data);
    
    if (res.success) {
      toast({
        title: "Details updated",
        description: "The outreach information has been saved.",
      });
      await refetchItem();
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to update details",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (index: number) => {
    if (!item) return;
    const { deleteContactAction } = await import("@/actions/outreach");
    const res = await deleteContactAction(item.id, index);
    
    if (res.success) {
      toast({
        title: "Contact deleted",
        description: "The contact has been removed from this outreach.",
      });
      
      if (index <= activeContactIndex && activeContactIndex > 0) {
        setActiveContactIndex(prev => Math.max(0, prev - 1));
      }
      
      await refetchItem();
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  if (!item) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Outreach not found</p>
      </div>
    );
  }

  const isOverdue = new Date(item.followUpDueAt) < new Date();

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pt-16 md:pt-0">
      <OutreachHeader 
        id={item.id}
        companyName={item.companyName}
        roleTargeted={item.roleTargeted}
        status={item.status}
        contacts={item.contacts as any[]}
        activeContactIndex={activeContactIndex}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        outreachData={item}
      />

      <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <OutreachDetailsCard 
            roleTargeted={item.roleTargeted}
            companyLink={item.companyLink}
            contactMethod={item.contacts?.[activeContactIndex]?.contactMethod || (item as any).contactMethod}
            emailAddress={item.contacts?.[activeContactIndex]?.emailAddress || (item as any).emailAddress}
            linkedinProfileUrl={item.contacts?.[activeContactIndex]?.linkedinProfileUrl || (item as any).linkedinProfileUrl}
            editable={true}
            onSave={handleSaveDetails}
          />

          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-extrabold">
                <FiFileText className="w-5 h-5 text-primary" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotesEditor 
                id={item.id} 
                initialNotes={item.notes} 
                onSave={async (id, notes) => {
                  const { updateOutreachNotes } = await import("@/actions/outreach");
                  const res = await updateOutreachNotes(id, notes);
                  if (res.success) {
                    toast({
                      title: "Notes saved",
                      description: "Your updates have been stored successfully.",
                    });
                    refetchItem();
                  } else {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: res.error || "Failed to save notes.",
                    });
                  }
                  return res;
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <OutreachTimelineCard 
            messageSentAt={item.messageSentAt}
            followUpDueAt={item.followUpDueAt}
            followUpSentAt={item.followUpSentAt}
            isOverdue={isOverdue}
            isEditingDate={isEditingDate}
            setIsEditingDate={setIsEditingDate}
            newDueDate={newDueDate}
            setNewDueDate={setNewDueDate}
            isUpdatingFollowUp={isUpdatingFollowUp}
            onUpdateDate={handleUpdateDate}
            onToggleFollowUp={handleToggleFollowUp}
          />

          <OutreachContactsCard 
            contacts={companyContacts[0]?.contacts || item.contacts || []} 
            activeIndex={activeContactIndex}
            onSelect={setActiveContactIndex}
            onDelete={handleDeleteContact}
          />
        </div>
      </div>
    </div>
  );
}
