"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { PromoteLeadValues, promoteLeadSchema } from "@/lib/validations";
import { promoteLeadToOutreachAction } from "@/actions/extension-leads";
import { useState } from "react";
import { FiArrowRight, FiUser, FiBriefcase, FiMail, FiLinkedin, FiGlobe, FiRefreshCw } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  personName: string;
  profileUrl: string;
  companyName: string | null;
  companyUrl: string | null;
  position: string | null;
  personRole?: string | null;
  emailAddress?: string | null;
  outreachDate?: Date | null;
  followUpDate?: Date | null;
  notes?: string | null;
}

export function PromoteLeadDialog({ lead, onSuccess }: { lead: Lead; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [showCustomRole, setShowCustomRole] = useState(() => {
    const predefinedRoles = ["HR", "CEO", "CTO", "RECRUITER", "OTHER"];
    return lead.personRole && !predefinedRoles.includes(lead.personRole);
  });
  const { toast } = useToast();

  const form = useForm<PromoteLeadValues>({
    resolver: zodResolver(promoteLeadSchema) as any,
    defaultValues: {
      id: lead.id,
      personName: lead.personName,
      companyName: lead.companyName || "",
      companyLink: lead.companyUrl || "",
      roleTargeted: lead.position || "",
      personRole: lead.personRole || "RECRUITER",
      contactMethod: "LINKEDIN",
      emailAddress: lead.emailAddress || "",
      linkedinProfileUrl: lead.profileUrl,
      outreachDate: lead.outreachDate 
        ? new Date(lead.outreachDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      followUpDate: lead.followUpDate 
        ? new Date(lead.followUpDate).toISOString().split('T')[0] 
        : "",
      notes: lead.notes || "",
    },
  });

  async function onSubmit(values: PromoteLeadValues) {
    setIsPending(true);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const res = await promoteLeadToOutreachAction(lead.id, formData);
    setIsPending(false);

    if (res.success) {
      toast({
        title: "Added to Outreach",
        description: "The lead has been moved to your outreach list.",
      });
      setOpen(false);
      if (onSuccess) onSuccess();
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to promote lead",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 rounded-xl group hover:bg-primary hover:text-primary-foreground transition-all">
          Move to Outreach
          <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-3xl border-2 shadow-2xl overflow-y-auto max-h-[90vh]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <FiArrowRight className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-extrabold tracking-tight">Convert Lead to Outreach</DialogTitle>
              <p className="text-muted-foreground">Confirm and add details before saving to your outreach tracker.</p>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="personName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Person Name</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input placeholder="John Doe" className="h-11 pl-10 rounded-xl" {...field} />
                          <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Company Name</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input placeholder="Google" className="h-11 pl-10 rounded-xl" {...field} />
                          <FiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="roleTargeted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Target Role</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input placeholder="Full Stack Dev, etc." className="h-11 pl-10 rounded-xl" {...field} />
                          <FiGlobe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Person's Role</FormLabel>
                      <div className="space-y-2">
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setShowCustomRole(value === "OTHER");
                          }}
                          defaultValue={showCustomRole ? "OTHER" : field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="CEO">CEO</SelectItem>
                            <SelectItem value="CTO">CTO</SelectItem>
                            <SelectItem value="RECRUITER">Recruiter</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {showCustomRole && (
                          <FormControl>
                            <Input
                              placeholder="Specify role..."
                              value={field.value === "OTHER" ? "" : field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              required
                              className="h-11 rounded-xl animate-in fade-in slide-in-from-top-1"
                            />
                          </FormControl>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Contact Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Select Method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="emailAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input type="email" placeholder="john@example.com" className="h-11 pl-10 rounded-xl" {...field} />
                          <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="linkedinProfileUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">LinkedIn URL</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input placeholder="https://linkedin.com/in/..." className="h-11 pl-10 rounded-xl" {...field} />
                          <FiLinkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Company URL (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input placeholder="https://..." className="h-11 pl-10 rounded-xl" {...field} />
                          <FiGlobe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <FormField
                  control={form.control}
                  name="outreachDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-1">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Outreach Date</FormLabel>
                      <DatePicker 
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-1">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Follow-up Date</FormLabel>
                      <DatePicker 
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add any initial thoughts..." className="rounded-xl min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                {isPending ? (
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  "Add to Outreach"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
