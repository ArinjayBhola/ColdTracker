"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
const loadForm = () => import("@/components/quick-outreach-form");
const QuickForm = dynamic(loadForm, { ssr: false, loading: () => <div className="flex-1 space-y-6 p-6" role="status"><span className="sr-only">Loading quick entry</span>{[1, 2, 3].map(row => <div key={row} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div> });
export function QuickOutreach() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return <Dialog.Root open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
    <Dialog.Trigger asChild><Button className="h-10 gap-2 px-4" onPointerEnter={() => { void loadForm(); }} onFocus={() => { void loadForm(); }}><Plus className="h-4 w-4" />Quick log</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[140] bg-black/25 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <Dialog.Content className="fixed inset-y-0 right-0 z-[150] flex h-dvh w-full max-w-[460px] flex-col border-l bg-background shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-200" onInteractOutside={event => { if (busy) event.preventDefault(); }}>
        <header className="shrink-0 border-b px-6 py-5"><div className="mb-4 flex items-center justify-between"><span className="text-xs tracking-wider text-muted-foreground">A NEW CONVERSATION</span><Dialog.Close asChild><Button disabled={busy} variant="ghost" size="icon" className="h-8 w-8" aria-label="Close quick log"><X className="h-4 w-4" /></Button></Dialog.Close></div>
          <Dialog.Title className="text-2xl font-semibold tracking-tight">Log your outreach</Dialog.Title><Dialog.Description className="mt-2 text-sm text-muted-foreground">Just the essentials. You can add the rest later.</Dialog.Description>
          <Link href="/outreach/new" onClick={() => setOpen(false)} className="mt-4 inline-flex items-center gap-1 text-xs text-primary">Need the full form? <ArrowUpRight className="h-3 w-3" /></Link>
        </header>
        <QuickForm onSaved={() => setOpen(false)} onBusyChange={setBusy} />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
