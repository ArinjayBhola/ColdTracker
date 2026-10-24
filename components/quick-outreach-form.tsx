"use client";
import { useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown, Linkedin, Loader2, Mail, Plus } from "lucide-react";
import { createOutreachAction } from "@/actions/outreach";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { calendarKey } from "@/lib/user-calendar";
import { useToast } from "@/hooks/use-toast";

type Draft = { company: string; person: string; position: string; address: string; method: "EMAIL" | "LINKEDIN"; sent: string; followUp: string; notes: string };
function emptyDraft(): Draft { return { company: "", person: "", position: "", address: "", method: "EMAIL", sent: calendarKey(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone), followUp: "", notes: "" }; }
export default function QuickOutreachForm({ onSaved, onBusyChange }: { onSaved: () => void; onBusyChange: (busy: boolean) => void }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [keepCompany, setKeepCompany] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const companyRef = useRef<HTMLInputElement>(null);
  const personRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const update = (key: keyof Draft, value: string) => { setDraft(previous => ({ ...previous, [key]: value })); setError(""); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!draft.company.trim()) { setError("Enter a company name to continue."); companyRef.current?.focus(); return; }
    const another = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "another";
    setSaving(true); onBusyChange(true); setError("");
    const data = new FormData();
    const values = { companyName: draft.company.trim(), roleTargeted: draft.position.trim(), applicationSource: draft.method === "EMAIL" ? "DIRECT_EMAIL" : "DIRECT_LINKEDIN", status: "SENT", applicationStatus: "SENT", notes: draft.notes,
      "contacts.0.personName": draft.person.trim(), "contacts.0.personRole": "RECRUITER", "contacts.0.contactMethod": draft.method,
      "contacts.0.emailAddress": draft.method === "EMAIL" ? draft.address : "", "contacts.0.linkedinProfileUrl": draft.method === "LINKEDIN" ? draft.address : "",
      messageSentAt: draft.sent ? new Date(`${draft.sent}T12:00:00`).toISOString() : "", followUpDueAt: draft.followUp ? new Date(`${draft.followUp}T12:00:00`).toISOString() : "" };
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    try {
      const result = await createOutreachAction({}, data);
      if (!result.success) { setError(result.details ? Object.values(result.details).flat()[0] || result.error || "Check the details and try again." : result.error || "Could not save outreach."); return; }
      if (another) {
        setLastSaved(draft.company.trim());
        setDraft({ ...emptyDraft(), method: draft.method, company: keepCompany ? draft.company : "", position: keepCompany ? draft.position : "" });
        requestAnimationFrame(() => { (keepCompany ? personRef.current : companyRef.current)?.focus(); });
      } else { toast({ title: "Outreach saved", description: `${draft.company.trim()} is in your tracker.` }); onSaved(); }
    } catch { setError("Something went wrong. Your entries are still here. Try again."); }
    finally { setSaving(false); onBusyChange(false); }
  }
  return <form onSubmit={submit} onKeyDown={event => {
      if (event.key === "Enter" && !event.nativeEvent.isComposing && event.target instanceof HTMLInputElement && ["text", "email", "url"].includes(event.target.type)) {
        event.preventDefault();
        const save = event.currentTarget.querySelector<HTMLButtonElement>('button[value="save"]');
        if (save && !save.disabled) event.currentTarget.requestSubmit(save);
      }
    }} className="flex min-h-0 flex-1 flex-col">
    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
      <div className="flex gap-1 rounded-lg bg-muted/60 p-1" role="group" aria-label="Outreach channel">{([['EMAIL', Mail, 'Email'], ['LINKEDIN', Linkedin, 'LinkedIn']] as const).map(([method, Icon, label]) => <button key={method} disabled={saving} type="button" aria-pressed={draft.method === method} onClick={() => { update("method", method); update("address", ""); }} className={cn("flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors", draft.method === method ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><Icon className="h-4 w-4" />{label}</button>)}</div>
      <fieldset disabled={saving} className="space-y-5">
        <div className="space-y-2"><label htmlFor="quick-company" className="text-sm">Company <span className="text-primary">*</span></label><Input ref={companyRef} autoFocus id="quick-company" value={draft.company} onChange={e => update("company", e.target.value)} required maxLength={255} placeholder="Where did you reach out?" className="h-11 bg-card" /></div>
        <div className="space-y-2"><label htmlFor="quick-person" className="text-sm">Person <span className="ml-1 text-xs text-muted-foreground">optional</span></label><Input ref={personRef} id="quick-person" value={draft.person} onChange={e => update("person", e.target.value)} placeholder="Who did you contact?" className="h-11 bg-card" /></div>
        <div className="space-y-2"><label htmlFor="quick-address" className="text-sm">{draft.method === "EMAIL" ? "Email address" : "LinkedIn profile"} <span className="ml-1 text-xs text-muted-foreground">optional</span></label><Input id="quick-address" type={draft.method === "EMAIL" ? "email" : "text"} value={draft.address} onChange={e => update("address", e.target.value)} placeholder={draft.method === "EMAIL" ? "name@company.com" : "linkedin.com/in/name"} className="h-11 bg-card" /></div>
        <div className="space-y-2"><label htmlFor="quick-position" className="text-sm">Position <span className="ml-1 text-xs text-muted-foreground">optional</span></label><Input id="quick-position" value={draft.position} onChange={e => update("position", e.target.value)} placeholder="e.g. Product designer" className="h-11 bg-card" /></div>
        <details className="group border-t pt-4"><summary className="flex cursor-pointer list-none items-center justify-between text-sm text-muted-foreground">Dates & a note<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
          <div className="mt-5 space-y-4"><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label htmlFor="quick-sent" className="text-xs text-muted-foreground">Sent date</label><DatePicker id="quick-sent" displayFormat="MMM d, yyyy" value={draft.sent ? new Date(`${draft.sent}T12:00:00`) : undefined} onChange={date => update("sent", date ? format(date, "yyyy-MM-dd") : "")} placeholder="Sent date" /></div><div className="space-y-2"><label htmlFor="quick-follow-up" className="text-xs text-muted-foreground">Follow-up date</label><DatePicker id="quick-follow-up" displayFormat="MMM d, yyyy" value={draft.followUp ? new Date(`${draft.followUp}T12:00:00`) : undefined} onChange={date => update("followUp", date ? format(date, "yyyy-MM-dd") : "")} placeholder="Automatic" /></div></div><Textarea aria-label="Outreach note" value={draft.notes} onChange={e => update("notes", e.target.value)} placeholder="A little context for next time..." rows={3} /></div>
        </details>
      </fieldset>
      <p className="text-xs leading-relaxed text-muted-foreground">Logged as sent. Your follow-up rules take care of the reminder.</p>
      {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div aria-live="polite">{lastSaved && <p className="flex items-center gap-2 text-xs text-primary"><Check className="h-3.5 w-3.5" />Saved {lastSaved}. Ready for the next one.</p>}</div>
    </div>
    <footer className="shrink-0 space-y-4 border-t bg-card/70 px-6 py-5"><label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" disabled={saving} checked={keepCompany} onChange={e => setKeepCompany(e.target.checked)} className="accent-[var(--primary)]" />Keep company & position for the next entry</label>
      <div className="grid grid-cols-2 gap-3"><Button type="submit" name="intent" value="another" disabled={saving} variant="outline" className="h-auto min-h-11 gap-1.5 px-2 py-2.5 text-xs sm:text-sm"><Plus className="hidden h-3.5 w-3.5 sm:block" />Save & add another</Button><Button type="submit" name="intent" value="save" disabled={saving} className="h-auto min-h-11 gap-2 py-2.5">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving..." : "Save outreach"}</Button></div>
    </footer>
  </form>;
}
