"use client";

import { useState } from "react";
import { FiPlus, FiUser, FiBriefcase, FiMail, FiLinkedin } from "react-icons/fi";
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
import { addContactToCompanyAction } from "@/actions/outreach";
import { useToast } from "@/hooks/use-toast";

export function AddContactDialog({ outreachId }: { outreachId: string }) {
    const [open, setOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);

        const formData = new FormData(e.currentTarget);
        const result = await addContactToCompanyAction(outreachId, formData);

        setIsPending(false);
        if (result.success) {
            toast({
                title: "Contact added successfully",
                description: "The new contact has been added to the company.",
            });
            setOpen(false);
        } else if (result.error) {
            toast({
                variant: "destructive",
                title: "Failed to add contact",
                description: result.error,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold">
                    <FiPlus className="w-4 h-4" />
                    Add Person
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl border-2 shadow-2xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <FiPlus className="w-6 h-6 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl font-extrabold tracking-tight">Add Another Contact</DialogTitle>
                        <p className="text-muted-foreground">Contact another person at this company for the same role.</p>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Person Name<span className="text-destructive ml-1">*</span></label>
                                <div className="relative group">
                                    <Input 
                                        name="personName" 
                                        placeholder="Example" 
                                        className="h-11 pl-10 rounded-xl" 
                                        required 
                                    />
                                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Role<span className="text-destructive ml-1">*</span></label>
                                <Select name="personRole" defaultValue="HR" required>
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
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Contact Method<span className="text-destructive ml-1">*</span></label>
                            <Select name="contactMethod" defaultValue="EMAIL" required>
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
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email Address (Optional)</label>
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
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">LinkedIn URL (Optional)</label>
                                <div className="relative group">
                                    <Input 
                                        name="linkedinProfileUrl" 
                                        type="text" 
                                        placeholder="linkedin.com/in/..." 
                                        className="h-11 pl-10 rounded-xl" 
                                    />
                                    <FiLinkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
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
                            className="h-11 px-8 rounded-xl font-bold font-primary shadow-lg shadow-primary/20"
                        >
                            {isPending ? "Adding..." : "Add Contact"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
