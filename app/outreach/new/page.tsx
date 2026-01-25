"use client";

import { createOutreachAction } from "@/actions/outreach";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Sidebar } from "@/components/sidebar";
import { FiArrowLeft, FiSave, FiBriefcase, FiUser, FiFileText, FiCalendar, FiPlus, FiTrash2 } from "react-icons/fi";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-2 h-12 px-8">
      <FiSave className="h-5 w-5" />
      {pending ? "Creating..." : "Create Outreach"}
    </Button>
  );
}

export default function NewOutreachPage() {
    const [state, formAction] = useActionState(createOutreachAction, { error: undefined, details: undefined, success: false });
    const [contacts, setContacts] = useState([{ id: Date.now() }]);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (state.success && state.outreachId) {
            toast({
                title: "Outreach created!",
                description: "Your job application has been logged successfully.",
            });
            router.push(`/outreach/${state.outreachId}`);
        }
    }, [state.success, state.outreachId, router, toast]);

    const addContact = () => {
        setContacts([...contacts, { id: Date.now() }]);
    };

    const removeContact = (id: number) => {
        if (contacts.length > 1) {
            setContacts(contacts.filter(c => c.id !== id));
        }
    };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                         <h1 className="text-3xl md:text-4xl font-bold tracking-tight">New Outreach</h1>
                        <p className="text-muted-foreground text-base md:text-lg">
                            Log a new contact or application
                        </p>
                    </div>
                    <Button variant="ghost" asChild className="gap-2 self-start md:self-center">
                        <Link href="/dashboard">
                            <FiArrowLeft className="h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                </div>

                {/* Form */}
                <form action={formAction} className="space-y-6 md:space-y-8">
                    <div className="rounded-2xl md:rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 md:p-8 shadow-premium space-y-8 md:space-y-10">
                        {state.error && (
                            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive border border-destructive/20 animate-fade-in">
                                {state.error}
                            </div>
                        )}
                        
                        <div className="grid gap-8 lg:grid-cols-2">
                            {/* Left Column: Company & Timing */}
                            <div className="space-y-8">
                                {/* Company Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-3 pb-2 border-b border-border/30">
                                        <FiBriefcase className="w-5 h-5 text-primary" />
                                        <h2 className="text-xl font-bold tracking-tight">Company Details</h2>
                                    </div>
                                    
                                    <div className="grid gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1" htmlFor="companyName">Company Name<span className="text-destructive ml-1">*</span></label>
                                            <Input id="companyName" name="companyName" placeholder="e.g., Google" required className="h-11" />
                                            {state.details?.companyName && <p className="text-destructive text-[10px] ml-1">{state.details.companyName[0]}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1" htmlFor="roleTargeted">Position<span className="text-destructive ml-1">*</span></label>
                                            <Input id="roleTargeted" name="roleTargeted" placeholder="e.g., Software Engineer" required className="h-11" />
                                            {state.details?.roleTargeted && <p className="text-destructive text-[10px] ml-1">{state.details.roleTargeted[0]}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                             <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1" htmlFor="companyLink">Company URL (Optional)</label>
                                             <Input id="companyLink" name="companyLink" placeholder="example.com" type="text" className="h-11" />
                                             {state.details?.companyLink && <p className="text-destructive text-[10px] ml-1">{state.details.companyLink[0]}</p>}
                                         </div>
                                     </div>
                                 </section>

                                 {/* Timing Section */}
                                 <section className="space-y-4">
                                     <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                         <div className="flex items-center gap-3">
                                             <FiCalendar className="w-5 h-5 text-primary" />
                                             <h2 className="text-xl font-bold tracking-tight">Timing(Optional)</h2>
                                         </div>
                                         <div className="w-28">
                                             <Select name="status" defaultValue="SENT">
                                                 <SelectTrigger className="h-8 text-xs rounded-lg bg-background/50 border-border/50">
                                                     <SelectValue />
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                     <SelectItem value="DRAFT">Draft</SelectItem>
                                                     <SelectItem value="SENT">Sent</SelectItem>
                                                     <SelectItem value="REPLIED">Replied</SelectItem>
                                                 </SelectContent>
                                             </Select>
                                         </div>
                                     </div>
                                     
                                     <div className="grid gap-4 md:grid-cols-2">
                                         <div className="space-y-1.5">
                                             <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1" htmlFor="messageSentAt">Sent Date</label>
                                             <DatePicker 
                                                 name="messageSentAt"
                                                 value={new Date()}
                                                 placeholder="Pick sent date"
                                             />
                                             {state.details?.messageSentAt && <p className="text-destructive text-[10px] ml-1">{state.details.messageSentAt[0]}</p>}
                                         </div>
                                         <div className="space-y-1.5">
                                             <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1" htmlFor="followUpDueAt">Follow-up Due</label>
                                             <DatePicker 
                                                 name="followUpDueAt"
                                                 placeholder="Pick follow-up date"
                                             />
                                             {state.details?.followUpDueAt && <p className="text-destructive text-[10px] ml-1">{state.details.followUpDueAt[0]}</p>}
                                         </div>
                                     </div>
                                     <p className="text-[10px] text-muted-foreground ml-1 italic">Calculates automatically if dates are left blank.</p>
                                 </section>
                             </div>

                             {/* Right Column: Contacts */}
                             <div className="space-y-6">
                                 <section className="space-y-4">
                                      <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                         <div className="flex items-center gap-3">
                                             <FiUser className="w-5 h-5 text-primary" />
                                             <h2 className="text-xl font-bold tracking-tight">Contacts</h2>
                                         </div>
                                         <Button type="button" onClick={addContact} variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg border-primary/20 hover:bg-primary/5 text-primary font-bold">
                                             <FiPlus className="w-3.5 h-3.5" />
                                             Add Person
                                         </Button>
                                     </div>

                                     <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                         {contacts.map((contact, index) => (
                                             <div key={contact.id} className="relative p-4 rounded-xl border border-border/40 bg-background/40 hover:bg-background/60 transition-colors space-y-4 animate-in fade-in slide-in-from-top-2">
                                                 {contacts.length > 1 && (
                                                     <Button 
                                                         type="button" 
                                                         variant="ghost" 
                                                         size="icon" 
                                                         onClick={() => removeContact(contact.id)}
                                                         className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background shadow-sm border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
                                                     >
                                                         <FiTrash2 className="w-3.5 h-3.5" />
                                                     </Button>
                                                 )}
                                                 <div className="grid gap-4 md:grid-cols-2">
                                                     <div className="space-y-1.5">
                                                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Name<span className="text-destructive ml-1">*</span></label>
                                                         <Input 
                                                             name={`contacts.${index}.personName`} 
                                                             placeholder="e.g., Example" 
                                                             required 
                                                             className="h-10 text-sm" 
                                                         />
                                                          {state.details?.[`contacts.${index}.personName`] && <p className="text-destructive text-[9px] ml-1">{state.details[`contacts.${index}.personName`][0]}</p>}
                                                     </div>
                                                      <div className="space-y-1.5">
                                                           <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Role<span className="text-destructive ml-1">*</span></label>
                                                          <Select name={`contacts.${index}.personRole`} required>
                                                             <SelectTrigger className="h-10 rounded-lg text-sm">
                                                                 <SelectValue placeholder="Select" />
                                                             </SelectTrigger>
                                                             <SelectContent>
                                                                 <SelectItem value="HR">HR / Talent</SelectItem>
                                                                 <SelectItem value="RECRUITER">Recruiter</SelectItem>
                                                                 <SelectItem value="CEO">CEO / Founder</SelectItem>
                                                                 <SelectItem value="CTO">Engineering Lead</SelectItem>
                                                                 <SelectItem value="OTHER">Other</SelectItem>
                                                             </SelectContent>
                                                          </Select>
                                                     </div>
                                                     <div className="space-y-1.5">
                                                           <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Method<span className="text-destructive ml-1">*</span></label>
                                                           <Select name={`contacts.${index}.contactMethod`} required>
                                                             <SelectTrigger className="h-10 rounded-lg text-sm">
                                                                 <SelectValue placeholder="Select" />
                                                             </SelectTrigger>
                                                             <SelectContent>
                                                                 <SelectItem value="EMAIL">Email</SelectItem>
                                                                 <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                                                             </SelectContent>
                                                           </Select>
                                                     </div>
                                                      <div className="space-y-1.5">
                                                           <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Email</label>
                                                           <Input 
                                                             name={`contacts.${index}.emailAddress`} 
                                                             placeholder="example@company.com" 
                                                             type="email" 
                                                             className="h-10 text-sm" 
                                                           />
                                                           {state.details?.[`contacts.${index}.emailAddress`] && <p className="text-destructive text-[9px] ml-1">{state.details[`contacts.${index}.emailAddress`][0]}</p>}
                                                      </div>
                                                      <div className="space-y-1.5 md:col-span-2">
                                                           <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">LinkedIn URL</label>
                                                           <Input 
                                                             name={`contacts.${index}.linkedinProfileUrl`} 
                                                             placeholder="https://linkedin.com/in/..." 
                                                             type="text" 
                                                             className="h-10 text-sm" 
                                                           />
                                                           {state.details?.[`contacts.${index}.linkedinProfileUrl`] && <p className="text-destructive text-[9px] ml-1">{state.details[`contacts.${index}.linkedinProfileUrl`][0]}</p>}
                                                      </div>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </section>
                             </div>
                        </div>

                        {/* Notes Section (Full Width Bottom) */}
                        <section className="space-y-4 pt-4 border-t border-border/30">
                            <div className="flex items-center gap-3">
                                <FiFileText className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-bold tracking-tight">Additional Notes</h2>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1" htmlFor="notes">Notes & Context</label>
                                <Textarea
                                    id="notes"
                                    name="notes"
                                    className="min-h-[120px] md:min-h-[160px] resize-none text-sm p-4 rounded-xl"
                                    placeholder="Paste job description highlights, message context, or any relevant notes..."
                                />
                            </div>
                        </section>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-6 border-t border-border/30">
                            <SubmitButton />
                        </div>
                    </div>
                </form>
            </div>
        </main>
    </div>
  );
}
