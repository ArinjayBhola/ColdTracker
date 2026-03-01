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
    // If both are sent, we are reverting 2nd. If only 1st is sent, we are reverting 1st or marking 2nd.
    // The server action now handles toggle better.
    const currentlySent = !!item.followUp2SentAt || (!!item.followUpSentAt && !item.followUp2SentAt);
    
    // In details page, we usually Toggle the "next" logical action.
    // But the user requested "Mark as Unsent" fix.
    // Let's make it smarter: if 1st is sent, button is "Mark Sent (Stage 2)" or "Mark Unsent (Stage 1)".
    
    // For simplicity, let's keep the toggle logic but make it aware of the stages.
    // If all sent, isSent is true (we want to unsent).
    // If none sent, isSent is false (we want to sent).
    const isSent = !!item.followUp2SentAt; 
    
    // Actually, let's just use the logic from InfiniteOutreachList which worked well.
    // But here we have an "Unsent" button too.
    
    // The server action `toggleFollowUpSentAction(id, isSent)`:
    // If isSent=true: 
    //    if !followUpSentAt -> set followUpSentAt
    //    else if !followUp2SentAt -> set followUp2SentAt
    // If isSent=false:
    //    if followUp2SentAt -> nullify followUp2SentAt
    //    else if followUpSentAt -> nullify followUpSentAt
    
    // If the button clicked is "Mark as Sent", we pass true.
    // If the button clicked is "Mark as Unsent", we pass false.
    
    // How do we know which one was clicked? 
    // Let's change handleToggleFollowUp to accept a boolean.
  };

  const [isEditingSentDate, setIsEditingSentDate] = useState<number | null>(null); // null, 1 or 2
  const [newSentDate, setNewSentDate] = useState<Date | undefined>(undefined);

  const onToggleAction = async (isMarkingSent: boolean, date?: Date) => {
    if (!item) return;
    setIsUpdatingFollowUp(true);
    const res = await toggleFollowUpSentAction(item.id, isMarkingSent, date);
    
    if (res.success) {
      toast({
        title: isMarkingSent ? "Follow-up status updated" : "Follow-up marked as unsent",
        description: "The status has been updated.",
      });
      await refetchItem();
      setIsEditingSentDate(null);
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to update status",
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

  const activeContact = item.contacts?.[activeContactIndex] || item.contacts?.[0] || {};
  const messageSentAt = activeContact.messageSentAt;
  const followUpDueAt = activeContact.followUpDueAt;
  
  const isOverdue = followUpDueAt && new Date(followUpDueAt) < new Date();

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
            messageSentAt={messageSentAt}
            followUpDueAt={followUpDueAt}
            followUpSentAt={item.followUpSentAt}
            followUp2DueAt={item.followUp2DueAt}
            followUp2SentAt={item.followUp2SentAt}
            isOverdue={!!isOverdue}
            isEditingDate={isEditingDate}
            setIsEditingDate={setIsEditingDate}
            newDueDate={newDueDate}
            setNewDueDate={setNewDueDate}
            isUpdatingFollowUp={isUpdatingFollowUp}
            onUpdateDate={handleUpdateDate}
            onToggleFollowUp={onToggleAction}
            isEditingSentDate={isEditingSentDate}
            setIsEditingSentDate={setIsEditingSentDate}
            newSentDate={newSentDate}
            setNewSentDate={setNewSentDate}
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
