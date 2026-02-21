"use client";

import { useState, useRef, useEffect } from "react";
import { FiTrash2, FiLinkedin, FiClock, FiMoreVertical, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import { format } from "date-fns";
import { promoteLeadToOutreachAction, deleteExtensionLeadAction, getExtensionLeadsAction } from "@/actions/extension-leads";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { TableShell, TableContent } from "@/components/ui/data-table/table-shell";
import { TableHeader } from "@/components/ui/data-table/table-header";
import { TablePagination } from "@/components/ui/data-table/table-pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2 } from "lucide-react";
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

interface Lead {
  id: string;
  userId: string;
  profileUrl: string;
  personName: string;
  companyName: string | null;
  companyUrl: string | null;
  position: string | null;
  createdAt: Date;
}

export function ExtensionLeadsTable({ initialLeads }: { initialLeads: Lead[] }) {
    const [leads, setLeads] = useState(initialLeads);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const itemsPerPage = 10;
    const { toast } = useToast();
    const router = useRouter();
    const [promotingId, setPromotingId] = useState<string | null>(null);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const updatedLeads = await getExtensionLeadsAction();
            setLeads(updatedLeads as Lead[]);
            toast({
                title: "Data Refreshed",
                description: "The latest leads have been loaded.",
            });
        } catch (error) {
            toast({
                title: "Refresh Failed",
                description: "Failed to fetch latest data. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handlePromote = async (lead: Lead) => {
        if (!lead.companyName || lead.companyName === "-" || !lead.position || lead.position === "-") {
            toast({
                title: "Missing Information",
                description: "This lead needs more details. Click 'View' to fill in Company Name and Position before promoting.",
                variant: "destructive",
            });
            return;
        }

        setPromotingId(lead.id);
        
        const promoteData = {
            id: lead.id,
            companyName: lead.companyName || "",
            companyLink: lead.companyUrl || "",
            roleTargeted: lead.position || "",
            contacts: [{
                personName: lead.personName || "",
                personRole: "OTHER",
                contactMethod: "LINKEDIN" as const,
                emailAddress: "",
                linkedinProfileUrl: lead.profileUrl || "",
                messageSentAt: new Date(),
                followUpDueAt: undefined,
            }],
            notes: "",
        };

        const res = await promoteLeadToOutreachAction(lead.id, promoteData);
        setPromotingId(null);

        if (res.success) {
            toast({
                title: "Added to Outreach",
                description: "The lead has been securely moved to your outreach tracker.",
            });
            router.push(`/outreach/${res.outreachId}`);
        } else {
            toast({
                title: "Missing Information",
                description: "This lead needs more details. Click 'View' to fill in missing fields before promoting.",
                variant: "destructive",
            });
        }
    };

    const filteredLeads = leads.filter(lead => 
        (lead.personName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (lead.companyName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (lead.position?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    if (initialLeads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/30 rounded-3xl border-2 border-dashed">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FiLinkedin className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold">No leads found</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                    Leads you capture using the browser extension will appear here.
                </p>
                <Button 
                    onClick={handleRefresh} 
                    disabled={isRefreshing}
                    variant="outline" 
                    className="mt-4 gap-2 border-2"
                >
                    {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FiRefreshCw className="w-4 h-4" />}
                    Check for New Leads
                </Button>
            </div>
        );
    }

    return (
        <TableShell>
            <TableHeader
                title="Captured Leads"
                subtitle={`Showing ${filteredLeads.length === 0 ? 0 : startIndex + 1}-${Math.min(endIndex, filteredLeads.length)} of ${filteredLeads.length} leads`}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                placeholder="Search leads by name, company, or role..."
            >
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-10 px-4 text-xs font-bold rounded-lg flex items-center gap-2 border-2 hover:bg-muted/50 transition-all ml-auto sm:ml-0"
                >
                    {isRefreshing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <FiRefreshCw className="w-4 h-4" />
                    )}
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
            </TableHeader>

            <TableContent>
                <thead className="border-b border-border/50 bg-muted/30">
                    <tr>
                        <th className="h-12 px-6 text-left align-middle font-semibold text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">Company</th>
                        <th className="hidden md:table-cell h-12 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                        <th className="h-12 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="hidden lg:table-cell h-12 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                        <th className="hidden sm:table-cell h-12 px-6 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Follow Up</th>
                        <th className="h-12 px-6 text-right align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredLeads.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-muted-foreground text-base italic">
                                No leads match your search.
                            </td>
                        </tr>
                    ) : (
                        paginatedLeads.map((lead) => (
                            <tr key={lead.id} className="border-b border-border/30 transition-all duration-200 hover:bg-muted/30 group">
                                <td className="p-6 align-middle">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-foreground text-base tracking-tight group-hover:text-primary transition-colors truncate max-w-[200px]">
                                                {lead.companyName || "Unknown Company"}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                                                Captured
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <FiLinkedin className="w-3 h-3" />
                                            {lead.personName}
                                        </div>
                                    </div>
                                </td>
                                <td className="hidden md:table-cell p-6 align-middle">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold text-foreground truncate max-w-[200px]">{lead.position || "Job inquiry"}</span>
                                    </div>
                                </td>
                                <td className="p-6 align-middle">
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold border bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30 uppercase tracking-widest">
                                        Captured
                                    </span>
                                </td>
                                <td className="hidden lg:table-cell p-6 align-middle">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium font-mono">
                                        <FiClock className="w-3.5 h-3.5" />
                                        {format(new Date(lead.createdAt), "MMM d, yyyy")}
                                    </div>
                                </td>
                                <td className="hidden sm:table-cell p-6 align-middle">
                                    <span className="text-[10px] md:text-xs font-semibold px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-border text-muted-foreground bg-background whitespace-nowrap inline-block">
                                        -
                                    </span>
                                </td>
                                <td className="p-6 align-middle text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="outline" size="sm" asChild className="h-9 px-4 text-xs font-bold rounded-xl flex items-center gap-2 border-2 hover:bg-muted/50 transition-all">
                                            <Link href={`/dashboard/extension-leads/${lead.id}`}>
                                                View
                                            </Link>
                                        </Button>

                                        <div className="hidden md:block">
                                            <ExtensionLeadActions id={lead.id} onDeleted={() => setLeads(leads.filter(l => l.id !== lead.id))} />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </TableContent>

            <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </TableShell>
    );
}

function ExtensionLeadActions({ id, onDeleted }: { id: string; onDeleted: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDeleting(true);
        const result = await deleteExtensionLeadAction(id);
        setIsDeleting(false);
        setShowDeleteDialog(false);
        if (result.success) {
            toast({ title: "Lead deleted", description: "Removed from captured leads." });
            onDeleted();
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error || "Failed to delete" });
        }
    };

    return (
        <div className="relative">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-2 border-transparent hover:border-border hover:bg-muted/50 data-[state=open]:bg-muted/50 data-[state=open]:border-border"
                    >
                        <FiMoreVertical className="w-4 h-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-40 p-1 rounded-xl shadow-xl">
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            setShowDeleteDialog(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors rounded-lg"
                    >
                        <FiTrash2 className="w-4 h-4" />
                        Delete
                    </button>
                </PopoverContent>
            </Popover>

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
