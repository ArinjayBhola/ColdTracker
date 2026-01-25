"use client";

import { updateOutreachStatus } from "@/actions/outreach";
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

export function OutreachActions({ id, currentStatus }: { id: string; currentStatus: string }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: (newStatus: string) => updateOutreachStatus(id, newStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["outreach"] });
            toast({
                title: "Status updated",
                description: "The outreach status has been successfully updated.",
            });
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "Failed to update status",
                description: "There was an error updating the outreach status.",
            });
        }
    });

    const handleStatusChange = (newStatus: string) => {
        if (newStatus === currentStatus) return;
        mutate(newStatus);
    };

    return (
        <div className="flex items-center gap-2">
            <Select value={currentStatus} onValueChange={handleStatusChange} disabled={isPending}>
                <SelectTrigger className={cn(
                    "h-9 min-w-[140px] px-3 py-2 rounded-lg border-2 border-border bg-background",
                    "text-sm font-semibold",
                    STATUS_OPTIONS.find(opt => opt.value === currentStatus)?.color
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
