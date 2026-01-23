"use client";

import { updateOutreachStatus } from "@/actions/outreach";
import { Button } from "@/components/ui/button";
import { FiLoader } from "react-icons/fi";
import { useState } from "react";

// Simplified action menu without installing all Radix primitive deps for Dropdown if I can avoid it.
// Ah, shadcn/ui Dropdown requires @radix-ui/react-dropdown-menu.
// I haven't installed it. I should use a native select or just simple buttons for now to avoid dependency issues.
// OR I can quickly install it. The user wants "Production-ready patterns".
// Using a native select for status change is robust and fast.

export function OutreachActions({ id, currentStatus }: { id: string; currentStatus: string }) {
    const [loading, setLoading] = useState(false);

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === currentStatus) return;
        setLoading(true);
        await updateOutreachStatus(id, newStatus);
        setLoading(false);
    };

    return (
        <div className="flex items-center gap-2">
            <select
                disabled={loading}
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="h-8 w-[130px] rounded-md border border-input bg-background px-2 py-1 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            >
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="REPLIED">Replied</option>
                <option value="GHOSTED">Ghosted</option>
                <option value="INTERVIEW">Interview</option>
                <option value="REJECTED">Rejected</option>
                <option value="OFFER">Offer</option>
                <option value="CLOSED">Closed</option>
            </select>
            {loading && <FiLoader className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
    );
}
