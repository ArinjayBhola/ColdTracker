"use client";
import { Suspense, useState } from "react";
import { OutreachForm } from "@/components/outreach-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
export function QuickLog({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="gap-2" title="Log outreach">{compact ? "+" : "+ Log outreach"}</Button></DialogTrigger>
    <DialogContent className="inset-y-0 left-auto right-0 top-0 h-dvh max-h-dvh w-full max-w-2xl translate-x-0 translate-y-0 overflow-y-auto rounded-none sm:rounded-none">
      <DialogTitle>Log outreach</DialogTitle><DialogDescription>Sent today. Follow-up is scheduled automatically unless you choose a date.</DialogDescription>
      <Suspense fallback={<p>Loading...</p>}><OutreachForm embedded onSaved={() => setOpen(false)} /></Suspense>
    </DialogContent>
  </Dialog>;
}
