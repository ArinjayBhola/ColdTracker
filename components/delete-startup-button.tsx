"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiLoader, FiTrash2 } from "react-icons/fi";
import { deleteStartupAction } from "@/actions/startups";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DeleteStartupButtonProps = {
  startupId: string;
  startupName: string;
  redirectTo?: string;
  className?: string;
};

export function DeleteStartupButton({
  startupId,
  startupName,
  redirectTo,
  className,
}: DeleteStartupButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteStartupAction(startupId);
        toast({ title: "Startup deleted", description: `${startupName} was removed.` });
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } catch {
        toast({
          title: "Unable to delete startup",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Delete startup"
          aria-label={`Delete ${startupName}`}
          className={className}
          onClick={(event) => event.stopPropagation()}
          disabled={isPending}
        >
          {isPending ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiTrash2 className="h-4 w-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete <span className="font-bold text-primary">{startupName}</span>?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the startup, its team members, and its tracking data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(event) => {
              event.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete startup"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
