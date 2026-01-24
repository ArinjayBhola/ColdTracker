"use client";

import { createOutreachAction } from "@/actions/outreach";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { FiArrowLeft, FiSave, FiBriefcase, FiUser, FiFileText } from "react-icons/fi";
import { Sidebar } from "@/components/sidebar";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-2 h-12 px-8">
      <FiSave className="h-5 w-5" />
      {pending ? "Saving..." : "Create Outreach"}
    </Button>
  );
}

export default function NewOutreachPage() {
    const [state, formAction] = useActionState(createOutreachAction, {});

  return (
    <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                         <h1 className="text-4xl font-bold tracking-tight">Log New Outreach</h1>
                        <p className="text-muted-foreground text-lg">
                            Record details of your recent cold message or application
                        </p>
                    </div>
                    <Button variant="ghost" asChild className="gap-2">
                        <Link href="/dashboard">
                            <FiArrowLeft className="h-5 w-5" />
                            Back
                        </Link>
                    </Button>
                </div>

                {/* Form */}
                <form action={formAction} className="space-y-8">
                    <div className="rounded-3xl border-2 border-border/50 bg-card/50 backdrop-blur-sm p-8 md:p-10 shadow-premium space-y-10">
                        {state.error && (
                            <div className="rounded-xl bg-destructive/10 px-5 py-4 text-sm font-semibold text-destructive border border-destructive/20 animate-fade-in">
                                {state.error}
                            </div>
                        )}
                        
                        {/* Company Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-4 pb-3 border-b-2 border-border/30">
                                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
                                    1
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                        <FiBriefcase className="w-6 h-6 text-primary" />
                                        Company Details
                                    </h2>
                                    <p className="text-sm text-muted-foreground">Information about the company and role</p>
                                </div>
                            </div>
                            
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground ml-1" htmlFor="companyName">Company Name</label>
                                    <Input id="companyName" name="companyName" placeholder="e.g., Acme Inc." required className="h-12" />
                                    {state.details?.companyName && <p className="text-destructive text-xs ml-1">{state.details.companyName[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground ml-1" htmlFor="roleTargeted">Position</label>
                                    <Input id="roleTargeted" name="roleTargeted" placeholder="e.g., Senior Engineer" required className="h-12" />
                                    {state.details?.roleTargeted && <p className="text-destructive text-xs ml-1">{state.details.roleTargeted[0]}</p>}
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                     <label className="text-sm font-semibold text-foreground ml-1" htmlFor="companyLink">Job URL (Optional)</label>
                                     <Input id="companyLink" name="companyLink" placeholder="https://..." type="url" className="h-12" />
                                </div>
                            </div>
                        </section>

                        {/* Contact Section */}
                        <section className="space-y-6">
                             <div className="flex items-center gap-4 pb-3 border-b-2 border-border/30">
                                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
                                    2
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                        <FiUser className="w-6 h-6 text-primary" />
                                        Contact Information
                                    </h2>
                                    <p className="text-sm text-muted-foreground">Details about your point of contact</p>
                                </div>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground ml-1" htmlFor="personName">Contact Name</label>
                                    <Input id="personName" name="personName" placeholder="e.g., Sarah Smith" required className="h-12" />
                                    {state.details?.personName && <p className="text-destructive text-xs ml-1">{state.details.personName[0]}</p>}
                                </div>
                                 <div className="space-y-2">
                                     <label className="text-sm font-semibold text-foreground ml-1" htmlFor="personRole">Their Role</label>
                                     <select 
                                        id="personRole"
                                        name="personRole" 
                                        className="flex h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-2.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 hover:border-muted-foreground/30"
                                        required
                                        defaultValue=""
                                     >
                                         <option value="" disabled>Select Role</option>
                                         <option value="HR">HR / Talent</option>
                                         <option value="RECRUITER">Recruiter</option>
                                         <option value="CEO">CEO / Founder</option>
                                         <option value="CTO">Engineering Lead</option>
                                         <option value="OTHER">Other</option>
                                     </select>
                                </div>
                                <div className="space-y-2">
                                     <label className="text-sm font-semibold text-foreground ml-1" htmlFor="contactMethod">Contact Method</label>
                                      <select
                                        id="contactMethod"
                                        name="contactMethod"
                                        className="flex h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-2.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 hover:border-muted-foreground/30"
                                        required
                                        defaultValue=""
                                     >
                                         <option value="" disabled>Select Method</option>
                                         <option value="EMAIL">Email</option>
                                         <option value="LINKEDIN">LinkedIn</option>
                                     </select>
                                </div>
                                <div className="space-y-2">
                                     <label className="text-sm font-semibold text-foreground ml-1" htmlFor="emailAddress">Email (Optional)</label>
                                     <Input id="emailAddress" name="emailAddress" placeholder="contact@company.com" type="email" className="h-12" />
                                </div>
                            </div>
                        </section>

                         {/* Notes Section */}
                         <section className="space-y-6">
                            <div className="flex items-center gap-4 pb-3 border-b-2 border-border/30">
                                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
                                    3
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                        <FiFileText className="w-6 h-6 text-primary" />
                                        Additional Notes
                                    </h2>
                                    <p className="text-sm text-muted-foreground">Context and key details</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground ml-1" htmlFor="notes">Notes & Context</label>
                                <Textarea
                                    id="notes"
                                    name="notes"
                                    className="min-h-[160px] resize-none"
                                    placeholder="Paste job description highlights, message context, or any relevant notes..."
                                />
                            </div>
                        </section>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-6 border-t-2 border-border/30">
                            <SubmitButton />
                        </div>
                    </div>
                </form>
            </div>
        </main>
    </div>
  );
}
