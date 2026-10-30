"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { getStartupByIdAction, saveStartupAction } from "@/actions/startups";
import { startupFormSchema, type StartupFormValues } from "@/lib/startup-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SideDrawerContent } from "@/components/ui/side-drawer";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const emptyMember = () => ({ name: "", role: "", email: "", linkedinUrl: "" });
const emptyForm = (): StartupFormValues => ({
  name: "", description: "", website: "", logoUrl: "", sector: "", location: "", teamSize: "",
  fundingRound: "", fundingAmount: "", fundingDate: "", isHiring: false, isTrending: false, employees: [emptyMember()],
});

export function StartupFormDialog({ startupId, startupName, compact = false }: {
  startupId?: string; startupName?: string; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<StartupFormValues>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const prefix = useId();
  async function load() {
    setErrors({}); setLoadError("");
    if (!startupId) { setValues(emptyForm()); return; }
    setLoading(true);
    try {
      const startup = await getStartupByIdAction(startupId);
      if (!startup) throw new Error("Startup no longer exists.");
      setValues({
        name: startup.name, description: startup.description ?? "", website: startup.website ?? "", logoUrl: startup.logoUrl ?? "",
        sector: startup.sector ?? "", location: startup.location ?? "", teamSize: startup.teamSize ?? "",
        fundingRound: startup.fundingRound ?? "", fundingAmount: startup.fundingAmount ?? "", fundingDate: startup.fundingDate ?? "",
        isHiring: startup.isHiring ?? false, isTrending: startup.isTrending ?? false,
        employees: startup.employees.length ? startup.employees.map(member => ({ id: member.id, name: member.name, role: member.role ?? "", email: member.email ?? "", linkedinUrl: member.linkedinUrl ?? "" })) : [emptyMember()],
      });
    } catch { setLoadError("Unable to load startup. Please try again."); }
    finally { setLoading(false); }
  }
  function field(key: keyof Omit<StartupFormValues, "employees" | "isHiring" | "isTrending">, label: string, type = "text", placeholder?: string) {
    const id = `${prefix}-${key}`;
    return <div className="space-y-1.5" key={key}>
      <label htmlFor={id} className="text-sm font-medium">{label}{key === "name" ? " *" : ""}</label>
      <Input id={id} type={type} placeholder={placeholder} value={values[key]} required={key === "name"} maxLength={key === "website" || key === "logoUrl" ? 2048 : 255}
        aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${id}-error` : undefined}
        onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))} />
      {errors[key] && <p id={`${id}-error`} className="text-xs text-destructive">{errors[key]}</p>}
    </div>;
  }
  return (
    <Dialog open={open} onOpenChange={value => {
      if (pending) return;
      setOpen(value);
      if (value) void load();
    }}>
      <DialogTrigger asChild>
        <Button variant={startupId ? "outline" : "default"} size={compact ? "icon" : "default"}
          className={compact ? "h-8 w-8 rounded-lg" : "gap-2 rounded-xl"}
          title={startupId ? `Edit ${startupName ?? "startup"}` : "Add startup"}
          aria-label={startupId ? `Edit ${startupName ?? "startup"}` : "Add startup"}>
          {startupId ? <FiEdit2 aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
          {!compact && (startupId ? "Edit startup" : "Add startup")}
        </Button>
      </DialogTrigger>
      <SideDrawerContent busy={pending} closeLabel="Close startup editor">
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-16 text-left">
          <DialogTitle>{startupId ? "Edit startup" : "Add startup"}</DialogTitle>
          <DialogDescription>A startup name and at least one named team member are required. All other fields are optional.</DialogDescription>
        </DialogHeader>
        {loading ? <p className="py-12 text-center text-muted-foreground" role="status">Loading startup...</p> : loadError ? <div role="alert" className="space-y-3"><p>{loadError}</p><Button onClick={() => void load()}>Try again</Button></div> : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => {
            event.preventDefault();
            const parsed = startupFormSchema.safeParse(values);
            if (!parsed.success) {
              setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), issue.message])));
              return;
            }
            setErrors({});
            startTransition(async () => {
              try {
                const result = await saveStartupAction(parsed.data, startupId);
                if (!result.success) { setErrors({ form: result.error }); return; }
                toast({ title: startupId ? "Startup updated" : "Startup created" });
                setOpen(false);
                if (!startupId) router.push(`/startups/${result.id}`);
                router.refresh();
              } catch { setErrors({ form: "Unable to save startup. Please try again." }); }
            });
          }}>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <fieldset disabled={pending} className="space-y-6 disabled:opacity-60">
              <div className="grid gap-4 sm:grid-cols-2">
                {field("name", "Startup name", "text", "e.g. Acme Labs")}
                {field("website", "Website", "text", "https://example.com")}
                {field("sector", "Sector", "text", "e.g. AI, Fintech")}
                {field("location", "Location", "text", "e.g. Bengaluru, India")}
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${prefix}-description`} className="text-sm font-medium">Description</label>
                <textarea id={`${prefix}-description`} value={values.description} placeholder="What does this startup do?" maxLength={10000} rows={3} className="w-full rounded-xl border border-input bg-transparent p-3 text-sm" onChange={event => setValues(previous => ({ ...previous, description: event.target.value }))} />
                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
              </div>
              <details className="rounded-xl border border-border/50 p-4">
                <summary className="cursor-pointer text-sm font-semibold">More company details</summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {field("teamSize", "Team size", "text", "e.g. 11-50")}
                  {field("logoUrl", "Logo URL", "text", "https://example.com/logo.png")}
                  {field("fundingRound", "Funding round", "text", "e.g. Seed, Series A")}
                  {field("fundingAmount", "Funding amount", "text", "e.g. $2M")}
                  <div className="space-y-1.5">
                    <label htmlFor={`${prefix}-fundingDate`} className="text-sm font-medium">Funding date</label>
                    <DatePicker id={`${prefix}-fundingDate`} displayFormat="MMM d, yyyy"
                      value={values.fundingDate && /^\d{4}-\d{2}-\d{2}$/.test(values.fundingDate) && Number.isFinite(Date.parse(values.fundingDate)) ? new Date(`${values.fundingDate}T12:00:00`) : undefined}
                      onChange={date => setValues(previous => ({ ...previous, fundingDate: date ? format(date, "yyyy-MM-dd") : "" }))}
                      placeholder="Select funding date" />
                    {errors.fundingDate && <p className="text-xs text-destructive">{errors.fundingDate}</p>}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.isHiring} onChange={event => setValues(previous => ({ ...previous, isHiring: event.target.checked }))} />Hiring</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.isTrending} onChange={event => setValues(previous => ({ ...previous, isTrending: event.target.checked }))} />Trending</label>
                </div>
              </details>
              <section className="space-y-4" aria-label="Team members">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">Team members <span className="text-destructive">*</span></h3>
                  <Button type="button" variant="outline" size="sm" disabled={values.employees.length >= 100} onClick={() => setValues(previous => ({ ...previous, employees: [...previous.employees, emptyMember()] }))}><FiPlus className="mr-2" />Add member</Button>
                </div>
                {values.employees.map((member, index) => (
                  <div key={member.id ?? `new-${index}`} className="space-y-3 rounded-xl border border-border/50 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Team member {index + 1}</h4>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={values.employees.length === 1} aria-label={`Remove team member ${index + 1}`} onClick={() => setValues(previous => ({ ...previous, employees: previous.employees.filter((_, position) => position !== index) }))}><FiTrash2 /></Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([['name', 'Name *'], ['role', 'Role'], ['email', 'Email'], ['linkedinUrl', 'LinkedIn URL']] as const).map(([key, label]) => {
                        const path = `employees.${index}.${key}`;
                        const id = `${prefix}-${path}`;
                        return <div key={key} className="space-y-1.5">
                          <label htmlFor={id} className="text-sm font-medium">{label}</label>
                          <Input id={id} type={key === "email" ? "email" : "text"} placeholder={{ name: "e.g. Priya Sharma", role: "e.g. Founder, CTO", email: "name@company.com", linkedinUrl: "linkedin.com/in/name" }[key]} required={key === "name"} value={member[key]} maxLength={key === "linkedinUrl" ? 2048 : 255} aria-invalid={!!errors[path]} aria-describedby={errors[path] ? `${id}-error` : undefined}
                            onChange={event => setValues(previous => ({ ...previous, employees: previous.employees.map((employee, position) => position === index ? { ...employee, [key]: event.target.value } : employee) }))} />
                          {errors[path] && <p id={`${id}-error`} className="text-xs text-destructive">{errors[path]}</p>}
                        </div>;
                      })}
                    </div>
                  </div>
                ))}
                {errors.employees && <p className="text-sm text-destructive">{errors.employees}</p>}
              </section>
            </fieldset>
            {Object.keys(errors).length > 0 && <p role="alert" className="text-sm text-destructive">{errors.form || "Please check the highlighted fields before saving."}</p>}
            </div>
            <footer className="flex shrink-0 justify-end gap-3 border-t bg-card/70 px-6 py-5">
              <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : startupId ? "Save changes" : "Create startup"}</Button>
            </footer>
          </form>
        )}
      </SideDrawerContent>
    </Dialog>
  );
}
