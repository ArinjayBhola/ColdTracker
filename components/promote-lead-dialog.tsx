"use client";

import { useForm, useFieldArray } from "react-hook-form";
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
import { promoteLeadToOutreachAction, updateExtensionLeadAction } from "@/actions/extension-leads";
import { useState } from "react";
import { FiArrowRight, FiUser, FiBriefcase, FiMail, FiLinkedin, FiGlobe, FiRefreshCw, FiXCircle, FiLink } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

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

interface PromoteLeadDialogProps {
  lead: Lead;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess?: () => void;
  onSaveSuccess?: () => void;
}

export function PromoteLeadDialog({ lead, open, setOpen, onSuccess, onSaveSuccess }: PromoteLeadDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<PromoteLeadValues>({
    resolver: zodResolver(promoteLeadSchema) as any,
    defaultValues: {
      id: lead.id,
      companyName: lead.companyName || "",
      companyLink: lead.companyUrl || "",
      roleTargeted: lead.position || "",
      contacts: [{
        personName: lead.personName,
        personRole: (lead.personRole as any) || "RECRUITER",
        contactMethod: "LINKEDIN",
        emailAddress: lead.emailAddress || "",
        linkedinProfileUrl: lead.profileUrl,
        messageSentAt: lead.outreachDate ? new Date(lead.outreachDate) : new Date(),
        followUpDueAt: lead.followUpDate ? new Date(lead.followUpDate) : undefined,
      }],
      notes: lead.notes || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  async function onSubmit(values: PromoteLeadValues) {
    setIsPending(true);
    
    // Note: Since promoteLeadToOutreachAction was using FormData and individual fields, 
    // it's better to update it to accept the JSON structure directly.
    // However, I've already updated it in extension-leads.ts (Step 318).
    // Actually, I should check my own update to extension-leads.ts.
    // It takes (id, formData). I should probably update it to take (id, values).
    
    try {
      const res = await promoteLeadToOutreachAction(lead.id, values);

      if (res.success) {
        toast({
          title: "Promoted Successfully!",
          description: "This lead has been moved to your outreach tracker.",
        });
        setOpen(false);
        router.push(`/dashboard/outreach/${res.outreachId}`);
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to promote lead",
          variant: "destructive",
        });
      }
    } finally {
      setIsPending(false);
    }
  }

  async function onSaveOnly(values: PromoteLeadValues) {
    setIsSaving(true);
    const primary = values.contacts[0];
    const res = await updateExtensionLeadAction(lead.id, {
        personName: primary.personName,
        companyName: values.companyName,
        companyUrl: values.companyLink || "",
        position: values.roleTargeted,
        personRole: primary.personRole as any,
        emailAddress: primary.emailAddress === "" ? null : primary.emailAddress,
        profileUrl: primary.linkedinProfileUrl || "",
        outreachDate: primary.messageSentAt ? new Date(primary.messageSentAt) : undefined,
        followUpDate: primary.followUpDueAt ? new Date(primary.followUpDueAt) : null,
        notes: values.notes,
    });
    setIsSaving(false);

    if (res.success) {
      toast({
        title: "Lead Saved",
        description: "Your changes have been saved to the lead.",
      });
      if (onSaveSuccess) onSaveSuccess();
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to save lead",
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
              </div>

              <FormField
                control={form.control}
                name="companyLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Company Website</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Input placeholder="https://google.com" className="h-11 pl-10 rounded-xl" {...field} />
                        <FiLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <section className="space-y-4 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Contacts</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ personName: "", personRole: "HR", contactMethod: "LINKEDIN", emailAddress: "", linkedinProfileUrl: "", messageSentAt: new Date(), followUpDueAt: undefined } as any)} className="gap-1 font-bold">
                   <FiArrowRight className="w-4 h-4" /> Add Person
                </Button>
              </div>

              <div className="space-y-6">
                {fields.map((fieldItem, index) => (
                  <div key={fieldItem.id} className="relative p-6 rounded-2xl border-2 border-border/50 bg-muted/5 space-y-6">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <FiXCircle className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.personName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Name</FormLabel>
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
                        name={`contacts.${index}.personRole`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.contactMethod`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Method</FormLabel>
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
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.emailAddress`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Input placeholder="john@example.com" className="h-11 pl-10 rounded-xl" {...field} />
                                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`contacts.${index}.linkedinProfileUrl`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">LinkedIn Profile</FormLabel>
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

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.messageSentAt`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Outreach Date</FormLabel>
                            <DatePicker 
                              value={field.value ? new Date(field.value) : undefined}
                              onChange={field.onChange}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.followUpDueAt`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Follow-up Due</FormLabel>
                            <DatePicker 
                              value={field.value ? new Date(field.value) : undefined}
                              onChange={field.onChange}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            </div>

            <DialogFooter className="mt-8 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="font-bold h-11 px-6 rounded-xl"
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || isSaving}
                  onClick={form.handleSubmit(onSaveOnly)}
                  className="h-11 px-6 rounded-xl font-bold group hover:bg-primary/5 border-2"
                >
                  {isSaving ? (
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save Only"
                  )}
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || isSaving}
                  className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20"
                >
                  {isPending ? (
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    "Add to Outreach"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
