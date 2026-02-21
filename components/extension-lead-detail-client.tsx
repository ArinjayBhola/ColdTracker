"use client";

import { useQuery } from "@tanstack/react-query";
import { getExtensionLeadByIdAction, updateExtensionLeadAction, getCompanyExtensionLeads, promoteLeadToOutreachAction } from "@/actions/extension-leads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiFileText, FiLinkedin, FiBriefcase, FiExternalLink, FiTrash2, FiMail, FiCalendar, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
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
import { NotesEditor } from "@/components/notes-editor";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DetailHeader } from "@/components/details/detail-header";
import { DetailContentCard, DetailItem } from "@/components/details/detail-content-card";
import { Button } from "./ui/button";
import { deleteExtensionLeadAction } from "@/actions/extension-leads";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ExtensionLeadContactsCard } from "./extension-lead-contacts-card";
import { AddExtensionLeadContactDialog } from "./add-extension-lead-contact-dialog";

interface ExtensionLeadDetailClientProps {
  initialData: any;
  id: string;
}

export function ExtensionLeadDetailClient({ initialData, id }: ExtensionLeadDetailClientProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightQuery = searchParams.get("highlight");
  const [highlightMissingFields, setHighlightMissingFields] = useState<string[]>([]);

  const { data: item, refetch: refetchItem } = useQuery({
    queryKey: ["extension-lead", id],
    queryFn: () => getExtensionLeadByIdAction(id),
    initialData,
    staleTime: 60 * 1000,
  });

  const { data: companyLeads = [], refetch: refetchCompanyLeads } = useQuery({
    queryKey: ["company-extension-leads", item?.companyName],
    queryFn: () => getCompanyExtensionLeads(item?.companyName || ""),
    enabled: !!item?.companyName,
    staleTime: 60 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchItem();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    const result = await deleteExtensionLeadAction(id);
    setIsDeleting(false);
    setShowDeleteDialog(false);
    if (result.success) {
      toast({ title: "Lead deleted", description: "Removed from captured leads." });
      router.push("/dashboard/extension-leads");
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error || "Failed to delete" });
    }
  };

  useEffect(() => {
    if (highlightQuery === "true" && item) {
      const missingFields: string[] = [];
      if (!item.companyName || item.companyName === "-") missingFields.push("companyName");
      if (!item.position || item.position === "-") missingFields.push("position");
      
      if (missingFields.length > 0) {
        setHighlightMissingFields(missingFields);
        setTimeout(() => setHighlightMissingFields([]), 3000);
      }
    }
  }, [highlightQuery, item]);

  const handlePromote = async () => {
    const missingFields: string[] = [];
    if (!item.personName || item.personName === "-") missingFields.push("personName");
    if (!item.companyName || item.companyName === "-") missingFields.push("companyName");
    if (!item.position || item.position === "-") missingFields.push("position");
    if (!item.personRole || item.personRole === "-") missingFields.push("personRole");
    if (!item.contactMethod || item.contactMethod === "-") missingFields.push("contactMethod");
    
    if (missingFields.length > 0) {
      setHighlightMissingFields(missingFields);
      toast({
        title: "Missing Information",
        description: "Please fill in the highlighted details before promoting.",
        variant: "destructive",
      });
      setTimeout(() => setHighlightMissingFields([]), 3000);
      return;
    }

    setIsPromoting(true);
    
    const promoteData = {
      id,
      companyName: item.companyName || "",
      companyLink: item.companyUrl || "",
      roleTargeted: item.position || "",
      contacts: [{
        personName: item.personName || "",
        personRole: item.personRole || "OTHER",
        contactMethod: item.contactMethod || "LINKEDIN",
        emailAddress: item.emailAddress || "",
        linkedinProfileUrl: item.profileUrl || "",
        messageSentAt: item.outreachDate ? new Date(item.outreachDate) : new Date(),
        followUpDueAt: item.followUpDate ? new Date(item.followUpDate) : undefined,
      }],
      notes: item.notes || "",
    };

    const res = await promoteLeadToOutreachAction(id, promoteData);
    setIsPromoting(false);

    if (res.success) {
      toast({
        title: "Added to Outreach",
        description: "The lead has been securely moved to your outreach tracker.",
      });
      router.push(`/outreach/${res.outreachId}`);
    } else {
      toast({
        title: "Missing Information",
        description: "Please fill in all details (Company Name, etc) before promoting.",
        variant: "destructive",
      });
    }
  };

  if (!item) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Lead not found</p>
      </div>
    );
  }

  const detailItems: DetailItem[] = [
    {
      id: "personName",
      label: "Person Name",
      value: item.personName || "-",
      icon: <FiFileText className="w-3.5 h-3.5" />,
      copyValue: item.personName || undefined,
      required: true,
    },
    {
      id: "companyName",
      label: "Company Name",
      value: item.companyName || "-",
      icon: <FiBriefcase className="w-3.5 h-3.5" />,
      copyValue: item.companyName || undefined,
      required: true,
    },
    {
      id: "position",
      label: "Position",
      value: item.position || "Job inquiry",
      icon: <FiBriefcase className="w-3.5 h-3.5" />,
      copyValue: item.position || undefined,
      required: true,
    },
    {
      id: "personRole",
      label: "Designation",
      value: item.personRole || "Other",
      icon: <FiBriefcase className="w-3.5 h-3.5" />,
      copyValue: item.personRole || "OTHER",
      inputType: "select-with-custom",
      options: [
        { label: "HR", value: "HR" },
        { label: "CEO", value: "CEO" },
        { label: "CTO", value: "CTO" },
        { label: "Recruiter", value: "RECRUITER" },
        { label: "Other", value: "OTHER" },
      ],
      required: true,
    },
    {
      id: "emailAddress",
      label: "Email Address",
      value: item.emailAddress || "-",
      icon: <FiMail className="w-3.5 h-3.5" />,
      copyValue: item.emailAddress || undefined,
    },
    {
      id: "companyUrl",
      label: "Company Website",
      value: item.companyUrl ? "Visit Page" : "-",
      icon: <FiExternalLink className="w-3.5 h-3.5" />,
      isLink: !!item.companyUrl,
      href: item.companyUrl || undefined,
      copyValue: item.companyUrl || undefined,
    },
    {
      id: "outreachDate",
      label: "Outreach Target",
      value: item.outreachDate ? format(new Date(item.outreachDate), "MMM d, yyyy") : "-",
      copyValue: item.outreachDate ? format(new Date(item.outreachDate), "yyyy-MM-dd") : "",
      icon: <FiCalendar className="w-3.5 h-3.5" />,
      inputType: "date",
    },
    {
      id: "followUpDate",
      label: "Follow-up Target",
      value: item.followUpDate ? format(new Date(item.followUpDate), "MMM d, yyyy") : "-",
      copyValue: item.followUpDate ? format(new Date(item.followUpDate), "yyyy-MM-dd") : "",
      icon: <FiCalendar className="w-3.5 h-3.5" />,
      inputType: "date",
    },
    {
      id: "contactMethod",
      label: "Contact Method",
      value: item.contactMethod === "EMAIL" ? "Email" : "LinkedIn",
      copyValue: item.contactMethod || "LINKEDIN",
      icon: item.contactMethod === "EMAIL" ? <FiMail className="w-3.5 h-3.5" /> : <FiLinkedin className="w-3.5 h-3.5" />,
      inputType: "select",
      options: [
        { label: "LinkedIn", value: "LINKEDIN" },
        { label: "Email", value: "EMAIL" }
      ],
      required: true,
    },
    {
      id: "profileUrl",
      label: "LinkedIn Profile",
      value: "View LinkedIn Profile",
      icon: <FiLinkedin className="w-3.5 h-3.5" />,
      isLink: true,
      href: item.profileUrl,
      copyValue: item.profileUrl,
      fullWidth: true,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pt-16 md:pt-0">
      <DetailHeader 
        title={item.companyName || "Unknown Company"}
        subtitle={item.position || "Job inquiry"}
        backUrl="/dashboard/extension-leads"
        backLabel="Back to Leads"
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        badge={
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Captured
            </span>
        }
        infoBar={
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <FiLinkedin className="w-4 h-4 text-[#0A66C2]" />
                <span className="font-bold text-foreground text-sm">{item.personName}</span>
            </div>
        }
        actions={
            <>
                <AddExtensionLeadContactDialog leadId={id} />
                <div className="h-8 w-px bg-border mx-1 hidden md:block" />
                <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handlePromote}
                    disabled={isPromoting}
                    className="gap-2 h-9 rounded-xl font-bold shadow-lg shadow-primary/20"
                >
                    {isPromoting ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : "Move to Outreach"}
                </Button>
                <div className="h-8 w-px bg-border mx-1 hidden md:block" />
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowDeleteDialog(true)}
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-9 font-bold border-2"
                >
                    <FiTrash2 className="w-4 h-4" />
                    Delete
                </Button>
            </>
        }
      />

      <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <DetailContentCard 
            items={detailItems}
            editable={true}
            highlightIds={highlightMissingFields}
            onSave={async (data) => {
              const res = await updateExtensionLeadAction(id, {
                personName: data.personName,
                companyName: data.companyName,
                position: data.position,
                personRole: data.personRole,
                emailAddress: data.emailAddress,
                companyUrl: data.companyUrl,
                outreachDate: data.outreachDate ? new Date(data.outreachDate) : undefined,
                followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
                profileUrl: data.profileUrl,
                contactMethod: data.contactMethod,
              });
              if (res.success) {
                toast({ title: "Details updated", description: "Lead details have been saved." });
                refetchItem();
                router.refresh();
              } else {
                toast({ variant: "destructive", title: "Update failed", description: res.error || "Failed to save details." });
              }
            }}
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
                  const res = await updateExtensionLeadAction(id, { notes });
                  if (res.success) {
                    toast({
                      title: "Notes saved",
                      description: "Your draft notes have been updated.",
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
            <ExtensionLeadContactsCard 
                contacts={companyLeads} 
                activeId={id} 
            />

            <Card className="border-2 border-dashed bg-muted/30 rounded-3xl">
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Drafting Tip</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    Use this space to refine your outreach strategy. You can track multiple people at the same company and draft personalized notes for each before moving them to active outreach.
                </CardContent>
            </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <FiAlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <AlertDialogTitle className="text-xl">Delete Lead?</AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-base">
                    This action cannot be undone. This will permanently delete this lead and all associated data.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
