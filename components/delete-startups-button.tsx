"use client";

import { useState, useTransition } from "react";
import { FiTrash2 } from "react-icons/fi";
import { deleteStartupsAction } from "@/actions/startups";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function DeleteStartupsButton({ items, onDeleted }: {
  items: { id: string; name: string }[];
  onDeleted: (count: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  return (
    <AlertDialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={!items.length || pending} className="gap-2 rounded-xl">
          <FiTrash2 aria-hidden="true" /> Delete selected ({items.length})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {items.length} selected startups?</AlertDialogTitle>
          <AlertDialogDescription>This permanently removes these startups from the shared catalog for all users, including their team members and tracking data.</AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="max-h-48 list-disc overflow-y-auto pl-5 text-sm">
          {items.map(item => <li key={item.id}>{item.name}</li>)}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending || !items.length} onClick={event => {
            event.preventDefault();
            startTransition(async () => {
              try {
                const result = await deleteStartupsAction(items.map(item => item.id));
                setOpen(false);
                toast({ title: `${result.deletedCount} startups deleted` });
                onDeleted(result.deletedCount);
              } catch {
                toast({ title: "Unable to delete startups", description: "Please try again.", variant: "destructive" });
              }
            });
          }}>{pending ? "Deleting..." : "Delete startups"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
