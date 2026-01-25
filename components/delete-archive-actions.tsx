"use client";

import { deleteOutreach } from "@/actions/outreach";
import { FiTrash2, FiMoreVertical, FiAlertTriangle } from "react-icons/fi";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export function DeleteArchiveActions({ id }: { id: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleDeleteClick = () => {
        setIsOpen(false);
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await deleteOutreach(id);
        router.push("/dashboard");
        router.refresh();
    };

    return (
        <>
            <div className="relative" ref={dropdownRef}>
                <button
                    disabled={isDeleting}
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "h-9 w-9 rounded-lg border-2 border-border bg-background",
                        "flex items-center justify-center",
                        "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    aria-label="More actions"
                >
                    <FiMoreVertical className="w-4 h-4" />
                </button>

                {isOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 z-50">
                        <div className="rounded-lg border-2 border-border bg-background shadow-lg overflow-hidden">
                            <button
                                onClick={handleDeleteClick}
                                className={cn(
                                    "w-full px-4 py-2.5 text-left text-sm font-medium",
                                    "hover:bg-destructive/10 flex items-center gap-2",
                                    "text-destructive"
                                )}
                            >
                                <FiTrash2 className="w-4 h-4" />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                <FiAlertTriangle className="w-6 h-6 text-destructive" />
                            </div>
                            <AlertDialogTitle className="text-xl">Delete Job Opportunity?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-base">
                            This action cannot be undone. This will permanently delete this job tracking entry and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
