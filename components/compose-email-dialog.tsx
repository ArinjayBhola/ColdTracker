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
import { FiMail, FiSend, FiAlertCircle, FiPaperclip, FiX } from "react-icons/fi";

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
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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

    const formData = new FormData();
    formData.append("outreachId", outreachId);
    formData.append("contactIndex", contactIndex.toString());
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("body", body);

    files.forEach((file) => {
      formData.append("attachments", file);
    });

    const result = await sendEmailAction(formData);

    if (result.success) {
      toast({
        title: "Email sent",
        description: `Email sent to ${to} successfully.`,
      });
      setSubject("");
      setBody("");
      setFiles([]);
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
              rows={8}
              className="resize-y"
            />
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const droppedFiles = Array.from(e.dataTransfer.files);
              setFiles((prev) => [...prev, ...droppedFiles]);
            }}
          >
            <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <FiPaperclip className="w-6 h-6 mb-1 opacity-50" />
              <p>Drag and drop files here, or click to select</p>
              <Input
                type="file"
                multiple
                className="hidden"
                id="file-upload"
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
              />
              <Label
                htmlFor="file-upload"
                className="cursor-pointer text-primary font-medium hover:underline"
              >
                Browse files
              </Label>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Attachments ({files.length})
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded bg-muted/50 border text-xs"
                  >
                    <div className="truncate flex-1 pr-2" title={file.name}>
                      {file.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
