"use client";

import { updateOutreachNotes } from "@/actions/outreach";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FiEdit2, FiSave, FiX } from "react-icons/fi";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function NotesEditor({ id, initialNotes }: { id: string; initialNotes: string | null }) {
    const [isEditing, setIsEditing] = useState(false);
    const [notes, setNotes] = useState(initialNotes || "");
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateOutreachNotes(id, notes);
        
        setIsSaving(false);
        if (result.success) {
            setIsEditing(false);
            toast({
                title: "Notes saved",
                description: "Your updates have been stored successfully.",
            });
            router.refresh();
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: result.error || "Failed to save notes.",
            });
        }
    };

    const handleCancel = () => {
        setNotes(initialNotes || "");
        setIsEditing(false);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Notes</h3>
                {!isEditing && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="gap-2 h-8"
                    >
                        <FiEdit2 className="w-3.5 h-3.5" />
                        Edit
                    </Button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-3">
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this opportunity..."
                        className="min-h-[200px] resize-none"
                    />
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="gap-2 h-9"
                            size="sm"
                        >
                            <FiSave className="w-4 h-4" />
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="gap-2 h-9"
                            size="sm"
                        >
                            <FiX className="w-4 h-4" />
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="min-h-[200px] whitespace-pre-wrap text-sm leading-relaxed p-6 rounded-xl bg-muted/30 border">
                    {notes || <span className="text-muted-foreground italic">No notes added. Click Edit to add notes.</span>}
                </div>
            )}
        </div>
    );
}
