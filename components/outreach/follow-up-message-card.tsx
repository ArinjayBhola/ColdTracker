"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, Mail } from "lucide-react";
import { getFollowUpTemplates } from "@/actions/follow-up-templates";
import { suggestedFollowUpStage, personalizeFollowUp, type FollowUpStage } from "@/lib/follow-up-templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Props = {
  companyName: string; personName?: string; roleTargeted: string; status: string;
  contactMethod?: string; firstDue?: Date | string;
  followUpSentAt: Date | string | null; followUp2DueAt: Date | string | null; followUp2SentAt: Date | string | null;
};

export function FollowUpMessageCard(props: Props) {
  const [selectedStage, setSelectedStage] = useState<FollowUpStage | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewId = useId();
  const { toast } = useToast();
  const stage = selectedStage ?? suggestedFollowUpStage(props);
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ["follow-up-templates"], queryFn: () => getFollowUpTemplates(), staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true });
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("coldtrack-templates");
    channel.onmessage = () => void queryClient.invalidateQueries({ queryKey: ["follow-up-templates"] });
    return () => channel.close();
  }, [queryClient]);
  const template = data?.find(t => t.stage === stage);
  const subject = template ? personalizeFollowUp(template.subject, props) : "";
  const body = template ? personalizeFollowUp(template.body, props) : "";
  async function copy(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); toast({ title: `${label} copied` }); }
    catch { toast({ title: "Could not copy", description: "Open the email preview and select the text to copy manually.", variant: "destructive" }); }
  }
  return <Card className="border-2 shadow-sm">
    <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-xl"><Mail className="h-5 w-5 text-primary" />Follow-up {stage} email</CardTitle><Button variant="ghost" size="sm" asChild><Link href={`/templates?followUp=${stage}`}>Edit this template</Link></Button></div><p className="text-sm text-muted-foreground">Ready for {props.personName?.trim() || "your contact"} at {props.companyName}. Copy into your existing email thread.</p></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b pb-4">
        <Button size="sm" disabled={!template || isError} onClick={() => void copy(body, "Body")}><Copy className="mr-2 h-4 w-4" />Copy body</Button>
        <Button variant="outline" size="sm" disabled={!template || !subject || isError} onClick={() => void copy(subject, "Subject")}><Copy className="mr-2 h-4 w-4" />Copy subject</Button>
        <Button variant="ghost" size="sm" disabled={!template || isError} aria-expanded={previewOpen} aria-controls={previewId} onClick={() => setPreviewOpen(open => !open)}>{previewOpen ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}{previewOpen ? "Hide preview" : "Preview email"}</Button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Follow-up stage">{([1, 2] as const).map(value => <Button key={value} size="sm" variant={stage === value ? "default" : "outline"} aria-pressed={stage === value} onClick={() => setSelectedStage(value)}>Follow-up {value}</Button>)}</div>
      <p className="text-xs text-muted-foreground">Uses your saved Follow-up {stage} template, personalized with this contact, company, and target role.</p>
      {isPending ? <p role="status" className="text-sm text-muted-foreground">Loading your template...</p> : isError ? <div role="alert" className="space-y-2 text-sm"><p>Could not load your follow-up templates.</p><Button variant="outline" size="sm" onClick={() => void refetch()}>Try again</Button></div> : !template ? <p className="text-sm text-muted-foreground">Your follow-up template is unavailable. Manage your messages in Templates.</p> : <>
        <div id={previewId} hidden={!previewOpen} className="space-y-4 rounded-xl border p-4">
          {subject && <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">Subject</p><p className="break-words text-sm">{subject}</p></div>}
          <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">Message</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{body}</p></div>
        </div>
        <p className="text-xs text-muted-foreground">Copying does not send the email or mark it sent. Update the timeline after sending.</p>
      </>}
    </CardContent>
  </Card>;
}
