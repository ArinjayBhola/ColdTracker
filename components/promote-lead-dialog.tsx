"use client";

import { useState } from "react";
import { FiArrowRight, FiTrash2, FiUser, FiBriefcase, FiMail, FiLinkedin, FiGlobe } from "react-icons/fi";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { promoteLeadToOutreachAction } from "@/actions/extension-leads";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  personName: string;
  profileUrl: string;
  companyName: string | null;
  companyUrl: string | null;
  position: string | null;
}

export function PromoteLeadDialog({ lead }: { lead: Lead }) {
    const [open, setOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [showCustomRole, setShowCustomRole] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);

        const formData = new FormData(e.currentTarget);
        const result = await promoteLeadToOutreachAction(lead.id, formData);

        setIsPending(false);
        if (result.success) {
            toast({
                title: "Added to Outreach",
                description: "The lead has been moved to your outreach list.",
            });
            setOpen(false);
        } else if (result.error) {
            toast({
                variant: "destructive",
                title: "Failed to promote lead",
                description: result.error,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2 rounded-xl group hover:bg-primary hover:text-primary-foreground transition-all">
                    Move to Outreach
                    <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-3xl border-2 shadow-2xl overflow-y-auto max-h-[90vh]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <FiArrowRight className="w-6 h-6 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl font-extrabold tracking-tight">Convert Lead to Outreach</DialogTitle>
                        <p className="text-muted-foreground">Confirm and add details before saving to your outreach tracker.</p>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Person Name<span className="text-destructive ml-1">*</span></label>
                                <div className="relative group">
                                    <Input 
                                        name="personName" 
                                        defaultValue={lead.personName}
                                        className="h-11 pl-10 rounded-xl" 
                                        required 
                                    />
                                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Company Name<span className="text-destructive ml-1">*</span></label>
                                <div className="relative group">
                                    <Input 
                                        name="companyName" 
                                        defaultValue={lead.companyName || ""}
                                        className="h-11 pl-10 rounded-xl" 
                                        required 
                                    />
                                    <FiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Target Role<span className="text-destructive ml-1">*</span></label>
                                <div className="relative group">
                                    <Input 
                                        name="roleTargeted" 
                                        defaultValue={lead.position || ""}
                                        placeholder="Full Stack Dev, etc."
                                        className="h-11 pl-10 rounded-xl" 
                                        required 
                                    />
                                    <FiGlobe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Person's Role<span className="text-destructive ml-1">*</span></label>
                                <div className="space-y-2">
                                    <Select 
                                        name={!showCustomRole ? "personRole" : undefined} 
                                        defaultValue="RECRUITER" 
                                        onValueChange={(val) => setShowCustomRole(val === "OTHER")}
                                        required
                                    >
                                        <SelectTrigger className="h-11 rounded-xl">
                                            <SelectValue placeholder="Select Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HR">HR</SelectItem>
                                            <SelectItem value="CEO">CEO</SelectItem>
                                            <SelectItem value="CTO">CTO</SelectItem>
                                            <SelectItem value="RECRUITER">Recruiter</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {showCustomRole && (
                                        <Input
                                            name="personRole"
                                            placeholder="Specify role..."
                                            required
                                            className="h-11 rounded-xl animate-in fade-in slide-in-from-top-1"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Contact Method<span className="text-destructive ml-1">*</span></label>
                            <Select name="contactMethod" defaultValue="LINKEDIN" required>
                                <SelectTrigger className="h-11 rounded-xl">
                                    <SelectValue placeholder="Select Method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EMAIL">Email</SelectItem>
                                    <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email (Optional)</label>
                                <div className="relative group">
                                    <Input 
                                        name="emailAddress" 
                                        type="email" 
                                        placeholder="example@example.com" 
                                        className="h-11 pl-10 rounded-xl" 
                                    />
                                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">LinkedIn URL</label>
                                <div className="relative group">
                                    <Input 
                                        name="linkedinProfileUrl" 
                                        defaultValue={lead.profileUrl}
                                        className="h-11 pl-10 rounded-xl" 
                                    />
                                    <FiLinkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Company URL (Optional)</label>
                                <div className="relative group">
                                    <Input 
                                        name="companyLink" 
                                        defaultValue={lead.companyUrl || ""}
                                        className="h-11 pl-10 rounded-xl" 
                                    />
                                    <FiGlobe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Notes (Optional)</label>
                            <Textarea 
                                name="notes" 
                                placeholder="Add any initial thoughts..." 
                                className="rounded-xl min-h-[100px]" 
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-8">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setOpen(false)}
                            className="font-bold h-11 px-6 rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isPending}
                            className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20"
                        >
                            {isPending ? "Moving..." : "Add to Outreach"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
