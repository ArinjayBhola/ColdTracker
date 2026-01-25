"use client";

import { useState } from "react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAccountAction } from "@/actions/settings";
import { useToast } from "@/hooks/use-toast";
import { FiTrash2, FiAlertTriangle } from "react-icons/fi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { signOut } from "next-auth/react";

export function DeleteAccountButton() {
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    const trimmedConfirm = confirmText.trim().toUpperCase();
    if (trimmedConfirm !== "DELETE") {
      toast({
        title: "Error",
        description: "Please type DELETE to confirm.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteAccountAction(trimmedConfirm);
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Deleted",
          description: "Your account has been successfully removed.",
        });
        // Sign out on the client to handle redirect correctly
        await signOut({ callbackUrl: "/signin" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/10 bg-destructive/5 backdrop-blur-xl shadow-premium overflow-hidden group">
      <CardHeader className="p-4">
        <div className="flex items-center gap-2.5 text-destructive/80">
          <div className="p-2 rounded-lg bg-destructive/10 group-hover:scale-105 transition-transform">
            <FiTrash2 size={16} />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Danger Zone</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/10">
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-foreground">Delete Account</h4>
            <p className="text-xs text-muted-foreground max-w-[360px]">
              This will permanently delete your account and all associated data.
            </p>
          </div>
          
          <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="h-9 px-4 rounded-lg font-semibold shadow-sm active:scale-95 transition-all shrink-0 text-sm">
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[380px] border-border/50 bg-card/95 backdrop-blur-2xl px-6 py-8 shadow-premium rounded-2xl">
              <AlertDialogHeader className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                  <FiAlertTriangle size={24} />
                </div>
                <AlertDialogTitle className="text-lg font-bold text-center tracking-tight">Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-xs text-muted-foreground leading-relaxed">
                  This action cannot be undone. To confirm, please type <span className="text-foreground font-bold">DELETE</span> in the box below.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-5">
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="h-10 text-center font-bold tracking-widest text-sm uppercase bg-background border border-destructive/20 focus-visible:border-destructive transition-all rounded-lg"
                />
              </div>
              <AlertDialogFooter className="sm:flex-col gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={confirmText.trim().toUpperCase() !== "DELETE" || isDeleting}
                  className="w-full h-10 rounded-lg font-bold shadow-md shadow-destructive/20 text-sm"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete Account"}
                </Button>
                <AlertDialogCancel asChild>
                  <Button variant="ghost" className="w-full h-10 rounded-lg font-medium text-xs text-muted-foreground hover:text-foreground">
                    Cancel
                  </Button>
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
