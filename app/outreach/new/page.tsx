"use client";

import { createOutreachAction } from "@/actions/outreach";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-2">
      <FiSave className="h-4 w-4" />
      {pending ? "Saving..." : "Create Outreach"}
    </Button>
  );
}

export default function NewOutreachPage() {
    const [state, formAction] = useActionState(createOutreachAction, {});

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 bg-muted/10">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                         <h1 className="text-3xl font-bold tracking-tight">Log New Outreach</h1>
                        <p className="text-muted-foreground">
                            Record details of your recent cold message or application.
                        </p>
                    </div>
                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
                        <Link href="/dashboard" className="gap-2">
                            <FiArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                </div>

                <form action={formAction} className="space-y-10">
                    <div className="rounded-xl border bg-card p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] md:p-8">
                        {state.error && (
                            <div className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                                {state.error}
                            </div>
                        )}
                        
                        {/* Company Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">1</div>
                                <h2 className="text-lg font-semibold tracking-tight">Company Details</h2>
                            </div>
                            
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="companyName">Company</label>
                                    <Input id="companyName" name="companyName" placeholder="Ex: Acme Inc." required className="h-10 bg-muted/5 focus:bg-background transition-colors" />
                                    {state.details?.companyName && <p className="text-destructive text-xs">{state.details.companyName[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="roleTargeted">Position</label>
                                    <Input id="roleTargeted" name="roleTargeted" placeholder="Ex: Senior Engineer" required className="h-10 bg-muted/5 focus:bg-background transition-colors" />
                                    {state.details?.roleTargeted && <p className="text-destructive text-xs">{state.details.roleTargeted[0]}</p>}
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                     <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="companyLink">Job URL</label>
                                     <Input id="companyLink" name="companyLink" placeholder="https://..." type="url" className="h-10 bg-muted/5 focus:bg-background transition-colors" />
                                </div>
                            </div>
                        </section>

                        {/* Contact Section */}
                        <section className="space-y-6 mt-10">
                             <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">2</div>
                                <h2 className="text-lg font-semibold tracking-tight">Contact</h2>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="personName">Contact Name</label>
                                    <Input id="personName" name="personName" placeholder="Ex: Sarah Smith" required className="h-10 bg-muted/5 focus:bg-background transition-colors" />
                                    {state.details?.personName && <p className="text-destructive text-xs">{state.details.personName[0]}</p>}
                                </div>
                                 <div className="space-y-2">
                                     <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="personRole">Role</label>
                                     <div className="relative">
                                         <select 
                                            id="personRole"
                                            name="personRole" 
                                            className="flex h-10 w-full rounded-md border border-input bg-muted/5 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
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
                                </div>
                                <div className="space-y-2">
                                     <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="contactMethod">Method</label>
                                      <div className="relative">
                                         <select
                                            id="contactMethod"
                                            name="contactMethod"
                                            className="flex h-10 w-full rounded-md border border-input bg-muted/5 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                            required
                                            defaultValue=""
                                         >
                                             <option value="" disabled>Select Method</option>
                                             <option value="EMAIL">Email</option>
                                             <option value="LINKEDIN">LinkedIn</option>
                                         </select>
                                     </div>
                                </div>
                                <div className="space-y-2">
                                     <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="emailAddress">Email</label>
                                     <Input id="emailAddress" name="emailAddress" placeholder="Optional" type="email" className="h-10 bg-muted/5 focus:bg-background transition-colors" />
                                </div>
                            </div>
                        </section>

                         {/* Notes Section */}
                         <section className="space-y-6 mt-10">
                            <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">3</div>
                                <h2 className="text-lg font-semibold tracking-tight">Notes</h2>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="notes">Context</label>
                                <Textarea
                                    id="notes"
                                    name="notes"
                                    className="min-h-[120px] bg-muted/5 focus:bg-background transition-colors resize-none"
                                    placeholder="Paste job description highlights or message context here..."
                                />
                            </div>
                        </section>

                        <div className="flex justify-end pt-6">
                            <SubmitButton />
                        </div>
                    </div>
                </form>
            </div>
        </main>
    </div>
  );
}
