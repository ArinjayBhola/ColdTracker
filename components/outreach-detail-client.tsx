"use client";
import { isBeforeLocalToday } from "@/lib/user-calendar";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { getOutreachById } from "@/actions/get-outreach";
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
import { type OutreachContact } from "@/db/schema";
import { FollowUpMessageCard } from "@/components/outreach/follow-up-message-card";

type OutreachDetailClientProps = {
  initialData: Awaited<ReturnType<typeof getOutreachById>>;
  id: string;
};

export function OutreachDetailClient({ initialData, id }: OutreachDetailClientProps) {
  const [activeContactIndex, setActiveContactIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: item, refetch: refetchItem } = useQuery({
    queryKey: ["outreach", id],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/outreach/${id}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("Could not load outreach");
      const data = await response.json();
      for (const key of ["createdAt", "updatedAt", "followUpSentAt", "followUp2DueAt", "followUp2SentAt"]) if (data[key]) data[key] = new Date(data[key]);
      return data as NonNullable<OutreachDetailClientProps["initialData"]>;
    },
    initialData,
    staleTime: 60 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchItem();
    setIsRefreshing(false);
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
      if (res.item) queryClient.setQueryData(["outreach", id], { ...res.item, isAutomated: item.isAutomated });
      else await refetchItem();
      void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
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
      if (res.item) queryClient.setQueryData(["outreach", id], { ...res.item, isAutomated: item.isAutomated });
      else await refetchItem();
      void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
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
      throw new Error(res.error || "Failed to update details");
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
  
  const pendingDue = item.followUpSentAt ? item.followUp2DueAt : followUpDueAt;
  const isOverdue = !item.followUp2SentAt && pendingDue && isBeforeLocalToday(pendingDue);

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pt-16 md:pt-0">
      <OutreachHeader 
        id={item.id}
        companyName={item.companyName}
        roleTargeted={item.roleTargeted}
        status={item.status}
        contacts={item.contacts as OutreachContact[]}
        activeContactIndex={activeContactIndex}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        outreachData={item}
      />

      <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <OutreachDetailsCard
            key={`${item.id}-${activeContactIndex}`}
            companyName={item.companyName}
            personName={activeContact.personName}
            personRole={activeContact.personRole}
            roleTargeted={item.roleTargeted}
            companyLink={item.companyLink}
            contactMethod={item.contacts?.[activeContactIndex]?.contactMethod || (item as unknown as {contactMethod?: string}).contactMethod}
            emailAddress={item.contacts?.[activeContactIndex]?.emailAddress || (item as unknown as {emailAddress?: string}).emailAddress}
            linkedinProfileUrl={item.contacts?.[activeContactIndex]?.linkedinProfileUrl || (item as unknown as {linkedinProfileUrl?: string}).linkedinProfileUrl}
            editable={true}
            onSave={handleSaveDetails}
          />

          <FollowUpMessageCard
            key={`${item.id}-${activeContactIndex}-${item.followUpSentAt ? 2 : 1}`}
            companyName={item.companyName}
            personName={activeContact.personName}
            roleTargeted={item.roleTargeted}
            status={item.status}
            contactMethod={activeContact.contactMethod}
            firstDue={followUpDueAt}
            followUpSentAt={item.followUpSentAt}
            followUp2DueAt={item.followUp2DueAt}
            followUp2SentAt={item.followUp2SentAt}
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
            contacts={item.contacts || []}
            activeIndex={activeContactIndex}
            onSelect={setActiveContactIndex}
            onDelete={handleDeleteContact}
          />
        </div>
      </div>
    </div>
  );
}
