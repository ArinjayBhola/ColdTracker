"use client";

import { updateOutreachStatus } from "@/actions/outreach";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FiLoader } from "react-icons/fi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft", color: "text-gray-600 dark:text-gray-400" },
  { value: "SENT", label: "Sent", color: "text-blue-600 dark:text-blue-400" },
  { value: "REPLIED", label: "Replied", color: "text-purple-600 dark:text-purple-400" },
  { value: "GHOSTED", label: "Ghosted", color: "text-orange-600 dark:text-orange-400" },
  { value: "INTERVIEW", label: "Interview", color: "text-amber-600 dark:text-amber-400" },
  { value: "REJECTED", label: "Rejected", color: "text-red-600 dark:text-red-400" },
  { value: "OFFER", label: "Offer", color: "text-emerald-600 dark:text-emerald-400" },
  { value: "CLOSED", label: "Closed", color: "text-gray-600 dark:text-gray-400" },
];

export function OutreachActions({ id, currentStatus, compact = false }: { id: string; currentStatus: string; compact?: boolean }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [selection, setSelection] = useState<{ base: string; status: string } | null>(null);
    const displayedStatus = selection?.base === currentStatus ? selection.status : currentStatus;

    const { mutate, isPending } = useMutation({
        mutationFn: async (newStatus: string) => {
            const result = await updateOutreachStatus(id, newStatus);
            if (!result.success) throw new Error(result.error || "Could not update status");
            return result;
        },
        onMutate: async (status: string) => {
            await queryClient.cancelQueries({ queryKey: ["outreach", id] });
            const previous = selection;
            setSelection({ base: currentStatus, status });
            return { previous };
        },
        onSuccess: (_result, status) => {
            queryClient.setQueryData(["outreach", id], (previous: Record<string, unknown> | undefined) => previous ? { ...previous, status } : previous);
            void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
            toast({
                title: "Status updated",
                description: "The outreach status has been successfully updated.",
            });
        },
        onError: (_error, _status, context) => {
            setSelection(context?.previous ?? null);
            toast({
                variant: "destructive",
                title: "Failed to update status",
                description: "There was an error updating the outreach status.",
            });
        }
    });

    const handleStatusChange = (newStatus: string) => {
        if (newStatus === displayedStatus) return;
        mutate(newStatus);
    };

    return (
        <div className="flex shrink-0 items-center gap-2">
            <Select value={displayedStatus} onValueChange={handleStatusChange} disabled={isPending}>
                <SelectTrigger aria-label="Outreach status" className={cn(
                    "h-auto min-h-9 w-auto min-w-[10em] shrink-0 px-3 py-2 rounded-lg border-2 border-border bg-background",
                    "text-sm font-semibold",
                    compact && "min-w-[6.5em] px-3 py-1.5 text-sm",
                    STATUS_OPTIONS.find(opt => opt.value === displayedStatus)?.color
                )}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                        <SelectItem 
                            key={option.value} 
                            value={option.value}
                            className={option.color}
                        >
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {isPending && <FiLoader className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
    );
}
