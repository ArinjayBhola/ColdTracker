"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sendEmailAction, getEmailAccountStatus } from "@/actions/email";
import { FiMail, FiSend, FiAlertCircle } from "react-icons/fi";

type ComposeEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outreachId: string;
  contactIndex: number;
  to: string;
  companyName: string;
};

export function ComposeEmailDialog({
  open,
  onOpenChange,
  outreachId,
  contactIndex,
  to,
  companyName,
}: ComposeEmailDialogProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    connected: boolean;
    provider: string | null;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      getEmailAccountStatus().then(setEmailStatus);
    }
  }, [open]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in both subject and body.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    const result = await sendEmailAction({
      outreachId,
      contactIndex,
      to,
      subject,
      body,
    });

    if (result.success) {
      toast({
        title: "Email sent",
        description: `Email sent to ${to} successfully.`,
      });
      setSubject("");
      setBody("");
      onOpenChange(false);
    } else {
      toast({
        title: "Failed to send",
        description: result.error || "An error occurred while sending.",
        variant: "destructive",
      });
    }
    setIsSending(false);
  };

  if (emailStatus && !emailStatus.connected) {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FiAlertCircle className="text-warning" />
              Connect Email Account
            </DialogTitle>
            <DialogDescription>
              To send emails directly from ColdTrack, connect your Gmail or Outlook account in Settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => (window.location.href = "/settings")}>Go to Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FiMail className="text-primary" />
            Compose Email
          </DialogTitle>
          <DialogDescription>
            Send an email to {companyName} contact via {emailStatus?.provider === "gmail" ? "Gmail" : "Outlook"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              value={to}
              disabled
              className="bg-muted/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              placeholder="Write your email..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending}>
            <FiSend className="mr-1" />
            {isSending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
