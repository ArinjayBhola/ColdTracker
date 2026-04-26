"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleStartupOutreachAction } from "@/actions/startups";
import { FiCheckCircle, FiCircle, FiLoader } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { useMutation, useQueryClient } from "@tanstack/react-query";

type OutreachToggleProps = {
  startupId: string;
  initialStatus: boolean;
};

export function OutreachToggle({ startupId, initialStatus }: OutreachToggleProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate, isPending, variables } = useMutation({
    mutationFn: async (newStatus: boolean) => {
      const res = await toggleStartupOutreachAction(startupId, newStatus);
      if (!res.success) throw new Error("Failed to update");
      return newStatus;
    },
    // Optimistic Update
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ["startup", startupId] });
      const previousStartup = queryClient.getQueryData(["startup", startupId]);
      
      // Update cache optimistically if data exists
      queryClient.setQueryData(["startup", startupId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          tracking: [{ ...old.tracking?.[0], outreachDone: newStatus }]
        };
      });

      return { previousStartup };
    },
    onError: (err, newStatus, context) => {
      queryClient.setQueryData(["startup", startupId], context?.previousStartup);
      toast({
        variant: "destructive",
        title: "Failed to update status",
      });
    },
    onSuccess: (data) => {
      toast({
        variant: "success",
        title: data ? "Marked as outreach done" : "Marked as no outreach",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["startup", startupId] });
      queryClient.invalidateQueries({ queryKey: ["startups"] });
    },
  });

  const currentStatus = variables !== undefined ? variables : initialStatus;

  const handleToggle = () => {
    mutate(!currentStatus);
  };

  return (
    <Button
      variant={currentStatus ? "default" : "outline"}
      className={cn(
        "rounded-2xl h-12 px-6 gap-3 font-bold transition-all shadow-lg",
        currentStatus ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20" : "border-2 hover:bg-blue-50"
      )}
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPending ? (
        <FiLoader className="w-5 h-5 animate-spin" />
      ) : currentStatus ? (
        <FiCheckCircle className="w-5 h-5" />
      ) : (
        <FiCircle className="w-5 h-5" />
      )}
      {currentStatus ? "Outreach Done" : "Mark as Outreach Done"}
    </Button>
  );
}

