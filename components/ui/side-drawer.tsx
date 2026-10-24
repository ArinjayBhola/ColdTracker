"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";
export function SideDrawerContent({ children, className, busy = false, ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { busy?: boolean }) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-[140] bg-black/25 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
    <DialogPrimitive.Content {...props} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onInteractOutside={event => { if (busy) event.preventDefault(); }} className={cn("fixed inset-y-0 right-0 z-[150] flex h-dvh w-full max-w-[560px] flex-col border-l bg-background shadow-2xl outline-none duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right", className)}>
      {children}<DialogPrimitive.Close disabled={busy} aria-label="Close template editor" className="absolute right-5 top-5 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><X className="h-4 w-4" /></DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}
