"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createTemplateAction, updateTemplateAction } from "@/actions/templates";

type Template = {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
};

type TemplateFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  onSuccess: (saved: Template) => void;
};

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: TemplateFormDialogProps) {
  const [name, setName] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [prevOpen, setPrevOpen] = useState(false);
  const [prevTemplateId, setPrevTemplateId] = useState<string | undefined>(undefined);

  // Derive state directly during render instead of using useEffect
  // This avoids cascading renders and satisfies React's strict rules
  if (open !== prevOpen || template?.id !== prevTemplateId) {
    setPrevOpen(open);
    setPrevTemplateId(template?.id);
    if (open) {
      setName(template?.name || "");
      setSubjectTemplate(template?.subjectTemplate || "");
      setBodyTemplate(template?.bodyTemplate || "");
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !subjectTemplate.trim() || !bodyTemplate.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const data = { name, subjectTemplate, bodyTemplate };
    let result;

    if (template?.id) {
      result = await updateTemplateAction(template.id, data);
    } else {
      result = await createTemplateAction(data);
    }

    if (result.success && result.data) {
      toast({ title: "Template saved" });
      onSuccess(result.data);
      onOpenChange(false);
    } else {
      toast({
        title: "Failed to save",
        description: result.error || "An error occurred.",
        variant: "destructive",
      });
    }
    
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template?.id ? "Edit Template" : "Create Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              placeholder="e.g., Software Engineer Outreach"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="e.g., Joining {{companyName}} as a {{position}}..."
              value={subjectTemplate}
              onChange={(e) => setSubjectTemplate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Available variables: {"{{companyName}}, {{personName}}, {{position}}"}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              placeholder="Hi {{personName}},&#10;&#10;I love what {{companyName}} is building..."
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              rows={8}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
