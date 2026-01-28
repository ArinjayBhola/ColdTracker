"use client";

import { useQuery } from "@tanstack/react-query";
import { getOutreachById } from "@/actions/get-outreach";
import { getCompanyContacts } from "@/actions/outreach";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { FiExternalLink, FiMail, FiLinkedin, FiCalendar, FiClock, FiFileText, FiUser, FiBriefcase, FiUsers, FiLink, FiRefreshCw, FiCheckCircle, FiX } from "react-icons/fi";
import Link from "next/link";
import { OutreachActions } from "@/components/outreach-actions";
import { DeleteArchiveActions } from "@/components/delete-archive-actions";
import { NotesEditor } from "@/components/notes-editor";
import { AddContactDialog } from "@/components/add-contact-dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toggleFollowUpSentAction, updateFollowUpDateAction } from "@/actions/follow-ups";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { EditOutreachDialog } from "@/components/edit-outreach-dialog";

import { EditOutreachValues } from "@/lib/validations";

type OutreachDetailClientProps = {
  initialData: Awaited<ReturnType<typeof getOutreachById>>;
  initialContacts: Awaited<ReturnType<typeof getCompanyContacts>>;
  id: string;
};

export function OutreachDetailClient({ initialData, initialContacts, id }: OutreachDetailClientProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  const { data: item, refetch: refetchItem } = useQuery({
    queryKey: ["outreach", id],
    queryFn: () => getOutreachById(id),
    initialData,
    staleTime: 60 * 1000, // 1 minute
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

  if (!item) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Outreach not found</p>
      </div>
    );
  }

  const otherContacts = companyContacts.filter(c => c.id !== item.id);
  const isOverdue = new Date(item.followUpDueAt) < new Date();

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pt-12 md:pt-0">
      {/* Header */}
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
            onClick={handleRefresh}
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
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{item.companyName}</h1>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border",
                    item.contactMethod === "EMAIL"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                  )}>
                    {item.contactMethod === "EMAIL" ? (
                      <><FiMail className="w-4 h-4" /> Email</>
                    ) : (
                      <><FiLinkedin className="w-4 h-4" /> LinkedIn</>
                    )}
                  </span>
                </div>
                <p className="text-lg text-muted-foreground mt-1 font-medium">{item.roleTargeted}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground md:ml-15 mt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <FiUser className="w-4 h-4" />
                <span className="font-bold text-foreground text-sm">{item.personName}</span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-sm font-semibold">{item.personRole}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <AddContactDialog outreachId={item.id} />
            <div className="h-8 w-px bg-border mx-1 hidden md:block" />
            <EditOutreachDialog initialData={item as unknown as EditOutreachValues} />
            <div className="h-8 w-px bg-border mx-1 hidden md:block" />
            <StatusBadge status={item.status} />
            <OutreachActions id={item.id} currentStatus={item.status} />
            <DeleteArchiveActions id={item.id} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Details Card */}
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-extrabold">
                <div className="w-1.5 h-6 rounded-full bg-primary" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <FiBriefcase className="w-3.5 h-3.5" />
                    Target Role
                  </label>
                  <p className="font-bold text-lg">{item.roleTargeted}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <FiExternalLink className="w-3.5 h-3.5" />
                    Website
                  </label>
                  {item.companyLink ? (
                    <a 
                      href={item.companyLink} 
                      target="_blank" 
                      className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold transition-all group"
                    >
                      Visit Page 
                      <FiExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    {item.contactMethod === 'EMAIL' ? <FiMail className="w-3.5 h-3.5" /> : <FiLinkedin className="w-3.5 h-3.5" />}
                    Contact Method
                  </label>
                  <div className="flex items-center gap-2 font-bold">
                    {item.contactMethod}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <FiMail className="w-3.5 h-3.5" />
                    Email
                  </label>
                  <p className="font-bold">{item.emailAddress || "-"}</p>
                </div>
                {item.linkedinProfileUrl && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <FiLinkedin className="w-3.5 h-3.5" />
                      LinkedIn Profile
                    </label>
                    <a 
                      href={item.linkedinProfileUrl} 
                      target="_blank" 
                      className="text-primary hover:underline font-bold text-sm block truncate max-w-full"
                    >
                      {item.linkedinProfileUrl}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-extrabold">
                <FiFileText className="w-5 h-5 text-primary" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotesEditor id={item.id} initialNotes={item.notes} />
            </CardContent>
          </Card>
        </div>

        {/* Timeline Sidebar */}
        <div className="space-y-6">
          {/* Dates Card */}
          <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FiCalendar className="w-5 h-5 text-primary" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-background/50 backdrop-blur-sm border shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sent Date</p>
                    <p className="font-bold text-sm mt-0.5">{format(item.messageSentAt, "MMMM d, yyyy")}</p>
                  </div>
                </div>

                <div className={cn(
                  "flex items-center gap-3 p-4 rounded-xl backdrop-blur-sm border shadow-sm",
                  isOverdue 
                    ? "bg-destructive/10 border-destructive/30" 
                    : "bg-background/50 border-border"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                    isOverdue ? "bg-destructive/20 border-destructive/30" : "bg-amber-500/10 border-amber-500/20"
                  )}>
                    <FiClock className={cn(
                      "w-5 h-5",
                      isOverdue ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Follow-up Due</p>
                        {!item.followUpSentAt && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                    setIsEditingDate(!isEditingDate);
                                    setNewDueDate(new Date(item.followUpDueAt));
                                }}
                            >
                                <FiEdit2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    {isEditingDate ? (
                        <div className="mt-2 space-y-3">
                            <DatePicker 
                                value={newDueDate}
                                onChange={setNewDueDate}
                                className="h-9"
                            />
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm" 
                                    className="h-8 flex-1 font-bold"
                                    onClick={handleUpdateDate}
                                    disabled={isUpdatingFollowUp}
                                >
                                    Save
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 flex-1 font-bold"
                                    onClick={() => setIsEditingDate(false)}
                                    disabled={isUpdatingFollowUp}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className={cn(
                              "font-bold text-sm mt-0.5",
                              isOverdue && !item.followUpSentAt && "text-destructive"
                            )}>
                              {format(item.followUpDueAt, "MMMM d, yyyy")}
                            </p>
                            {isOverdue && !item.followUpSentAt && (
                              <p className="text-[10px] text-destructive font-extrabold mt-1 tracking-wider uppercase">Action Overdue</p>
                            )}
                        </>
                    )}
                  </div>
                </div>

                {/* Follow-up Sent Toggle */}
                <div className={cn(
                  "flex flex-col gap-3 p-4 rounded-xl border-2 transition-all shadow-sm",
                  item.followUpSentAt 
                    ? "bg-emerald-500/5 border-emerald-500/20" 
                    : "bg-background/50 border-border"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border",
                        item.followUpSentAt ? "bg-emerald-500/20 border-emerald-500/30" : "bg-muted border-border"
                      )}>
                        <FiCheckCircle className={cn(
                          "w-5 h-5",
                          item.followUpSentAt ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Follow-up Sent</p>
                        <p className="font-bold text-sm mt-0.5">
                          {item.followUpSentAt ? format(new Date(item.followUpSentAt), "MMM d, yyyy") : "Not sent yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant={item.followUpSentAt ? "outline" : "default"}
                    size="sm"
                    className={cn(
                       "w-full h-9 font-bold transition-all",
                       item.followUpSentAt ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" : ""
                    )}
                    onClick={handleToggleFollowUp}
                    disabled={isUpdatingFollowUp}
                  >
                    {isUpdatingFollowUp ? (
                      <FiRefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : item.followUpSentAt ? (
                      <FiX className="w-4 h-4 mr-2" />
                    ) : (
                      <FiCheckCircle className="w-4 h-4 mr-2" />
                    )}
                    {item.followUpSentAt ? "Mark as Unsent" : "Mark as Sent"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Company Contacts Card */}
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FiUsers className="w-5 h-5 text-primary" />
                Company Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {companyContacts.map((contact) => (
                <Link 
                  key={contact.id} 
                  href={`/outreach/${contact.id}`}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-xl border-2 transition-all group",
                    contact.id === item.id 
                      ? "bg-primary/5 border-primary/20 shadow-primary/5 shadow-inner" 
                      : "hover:bg-muted/50 border-transparent hover:border-border"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm",
                    contact.id === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {contact.personName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold truncate">{contact.personName}</p>
                      {contact.id === item.id && <span className="text-[10px] font-black text-primary px-1.5 py-0.5 bg-primary/10 rounded uppercase tracking-tighter shadow-sm shrink-0">Active</span>}
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
                  {contact.id !== item.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteArchiveActions id={contact.id} isIcon />
                      <FiLink className="w-4 h-4 text-muted-foreground mr-1" />
                    </div>
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
