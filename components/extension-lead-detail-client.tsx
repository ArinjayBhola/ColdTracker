"use client";

import { useQuery } from "@tanstack/react-query";
import { getExtensionLeadByIdAction, updateExtensionLeadAction, getCompanyExtensionLeads } from "@/actions/extension-leads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiFileText, FiLinkedin, FiBriefcase, FiExternalLink, FiTrash2, FiMail, FiCalendar, FiAlertTriangle } from "react-icons/fi";
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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DetailHeader } from "@/components/details/detail-header";
import { DetailContentCard, DetailItem } from "@/components/details/detail-content-card";
import { EditExtensionLeadDialog } from "./edit-extension-lead-dialog";
import { PromoteLeadDialog } from "./promote-lead-dialog";
import { Button } from "./ui/button";
import { deleteExtensionLeadAction } from "@/actions/extension-leads";
import { useRouter } from "next/navigation";
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
  const { toast } = useToast();
  const router = useRouter();

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

  if (!item) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Lead not found</p>
      </div>
    );
  }

  const detailItems: DetailItem[] = [
    {
      label: "Position",
      value: item.position || "Job inquiry",
      icon: <FiBriefcase className="w-3.5 h-3.5" />,
      copyValue: item.position || undefined,
    },
    {
      label: "Designation",
      value: item.personRole || "Contact",
      icon: <FiBriefcase className="w-3.5 h-3.5" />,
      copyValue: item.personRole || undefined,
    },
    {
      label: "Email Address",
      value: item.emailAddress || "-",
      icon: <FiMail className="w-3.5 h-3.5" />,
      copyValue: item.emailAddress || undefined,
    },
    {
      label: "Company Website",
      value: item.companyUrl ? "Visit Page" : "-",
      icon: <FiExternalLink className="w-3.5 h-3.5" />,
      isLink: !!item.companyUrl,
      href: item.companyUrl || undefined,
      copyValue: item.companyUrl || undefined,
    },
    {
      label: "Outreach Target",
      value: item.outreachDate ? format(new Date(item.outreachDate), "MMM d, yyyy") : "-",
      icon: <FiCalendar className="w-3.5 h-3.5" />,
    },
    {
      label: "Follow-up Target",
      value: item.followUpDate ? format(new Date(item.followUpDate), "MMM d, yyyy") : "-",
      icon: <FiCalendar className="w-3.5 h-3.5" />,
    },
    {
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
                <PromoteLeadDialog 
                    lead={item} 
                    onSuccess={() => router.push("/dashboard")}
                />
                <div className="h-8 w-px bg-border mx-1 hidden md:block" />
                <EditExtensionLeadDialog initialData={item} />
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
