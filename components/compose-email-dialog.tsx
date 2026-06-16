"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { generateEmailDraftAction } from "@/actions/ai";
import { getTemplatesAction } from "@/actions/templates";
import { FiMail, FiSend, FiAlertCircle, FiPaperclip, FiX, FiZap, FiEdit2 } from "react-icons/fi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ComposeEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outreachId: string;
  contactIndex: number;
  to: string;
  companyName: string;
  companyUrl?: string;
  personName?: string;
  personRole?: string;
  roleTargeted?: string;
};

type EmailTemplate = {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
};

export function ComposeEmailDialog({
  open,
  onOpenChange,
  outreachId,
  contactIndex,
  to,
  companyName,
  companyUrl,
  personName,
  personRole,
  roleTargeted,
}: ComposeEmailDialogProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [editableTo, setEditableTo] = useState(to);
  const [isEditingTo, setIsEditingTo] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    connected: boolean;
    provider: string | null;
  } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("none");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [prevOpen, setPrevOpen] = useState(false);
  const [prevTo, setPrevTo] = useState("");

  // Derive state during render to avoid cascading updates in useEffect
  if (open !== prevOpen || to !== prevTo) {
    setPrevOpen(open);
    setPrevTo(to);
    if (open) {
      setEditableTo(to);
      setIsEditingTo(false);
    }
  }

  useEffect(() => {
    if (open) {
      getEmailAccountStatus().then(setEmailStatus);
      getTemplatesAction().then(res => {
        if (res.success && res.data) setTemplates(res.data);
      });
    }
  }, [open]);

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === "none") return;
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const pName = personName || "there";
      const cName = companyName || "your company";
      const rName = roleTargeted || "the open position";
      
      setSubject(template.subjectTemplate
        .replace(/\{\{companyName\}\}/g, cName)
        .replace(/\{\{personName\}\}/g, pName)
        .replace(/\{\{position\}\}/g, rName)
      );
      setBody(template.bodyTemplate
        .replace(/\{\{companyName\}\}/g, cName)
        .replace(/\{\{personName\}\}/g, pName)
        .replace(/\{\{position\}\}/g, rName)
      );
    }
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    toast({ title: "Generating email...", description: "Hermes AI is thinking..." });
    const res = await generateEmailDraftAction({
      companyName,
      companyUrl: companyUrl || "",
      position: roleTargeted || "any position",
      personName: personName || "there",
      personRole: personRole || "Recruiter/Hiring Manager"
    });
    
    if (res.success && res.data) {
      setSubject(res.data.subject);
      setBody(res.data.body);
      toast({ title: "Email generated!" });
    } else {
      toast({ title: "Failed to generate", description: res.error || "Unknown error", variant: "destructive" });
    }
    setIsGenerating(false);
  };

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
    formData.append("to", editableTo);
    formData.append("subject", subject);
    formData.append("body", body);

    files.forEach((file) => {
      formData.append("attachments", file);
    });

    const result = await sendEmailAction(formData);

    if (result.success) {
      toast({
        title: "Email sent",
        description: `Email sent to ${editableTo} successfully.`,
      });
      // Refresh the Sent Emails card without a full page reload.
      queryClient.invalidateQueries({ queryKey: ["sent-emails", outreachId] });
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

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="secondary" 
            className="flex-1 h-11"
            onClick={handleGenerateAI}
            disabled={isGenerating}
          >
            <FiZap className="mr-2 text-primary" />
            {isGenerating ? "Generating..." : "Generate with AI"}
          </Button>
          
          <div className="flex-1">
            <Select value={selectedTemplate} onValueChange={handleApplyTemplate}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Use a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <div className="flex items-center gap-2">
              {isEditingTo ? (
                <Input
                  id="to"
                  value={editableTo}
                  onChange={(e) => setEditableTo(e.target.value)}
                  className="flex-1"
                  autoFocus
                  onBlur={() => setIsEditingTo(false)}
                />
              ) : to && to.includes(",") ? (
                <Select value={editableTo} onValueChange={setEditableTo}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select email..." />
                  </SelectTrigger>
                  <SelectContent>
                    {to.split(",").map(e => e.trim()).filter(Boolean).map(email => (
                      <SelectItem key={email} value={email}>{email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="to"
                  value={editableTo}
                  placeholder="Enter email address..."
                  disabled={!isEditingTo}
                  className={`flex-1 ${!isEditingTo ? 'bg-muted/50' : ''}`}
                  onChange={(e) => setEditableTo(e.target.value)}
                />
              )}
              {!isEditingTo && (
                <Button variant="outline" size="icon" onClick={() => setIsEditingTo(true)} className="shrink-0" title="Edit email">
                  <FiEdit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
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

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <FiPaperclip className="w-4 h-4" />
              Attach Files
            </Button>
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
            <span className="text-xs text-muted-foreground">
              {files.length > 0 ? `${files.length} file(s) selected` : "No files attached"}
            </span>
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
