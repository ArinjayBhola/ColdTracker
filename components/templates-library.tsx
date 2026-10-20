"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { messageTemplates } from "@/db/schema";
import { deleteTemplate, saveTemplate, setTemplateFavorite, setTemplatePinned } from "@/actions/templates";
import { TemplateOptionPicker } from "@/components/template-option-picker";
import { characterCount, templateSchema, type TemplateInput } from "@/lib/template-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Copy, FileText, Plus, Search, Star, Pencil, Trash2, Files, Pin, LayoutGrid, Rows3 } from "lucide-react";

type Template = typeof messageTemplates.$inferSelect;
const empty: TemplateInput = { title: "", subject: "", body: "", category: "", tags: [], characterLimit: null, favorite: false, pinned: false };

function TemplateCopyButton({ text, label, onError, variant = "ghost" }: {
  text: string; label: string; onError: (message: string) => void; variant?: "ghost" | "outline";
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 5000);
    } catch {
      onError("Could not copy. Open Edit and select the text to copy manually.");
    }
  }

  return <Button size="sm" className="h-7 px-2 text-xs" variant={variant} onClick={copy} aria-label={copied ? `${label} copied` : label}>
    {copied ? <Check className="mr-1 h-3 w-3 text-green-600" /> : <Copy className="mr-1 h-3 w-3" />}{label}
  </Button>;
}

export function TemplatesLibrary({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [view, setView] = useState<"grid" | "column">("grid");
  const [editor, setEditor] = useState<{ id?: string; value: TemplateInput } | null>(null);
  const [limitText, setLimitText] = useState("");
  const [deleting, setDeleting] = useState<Template | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))].sort();
  const tags = [...new Set(templates.flatMap(t => t.tags))].sort();
  const visible = templates.filter(t =>
    (!favorites || t.favorite) && (!category || t.category === category) && (!tag || t.tags.includes(tag)) &&
    [t.title, t.subject, t.body, t.category, ...t.tags].join(" ").toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => Number(b.pinned) - Number(a.pinned) ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || a.id.localeCompare(b.id));

  function openEditor(template?: Template, duplicate = false) {
    setError("");
    setEditor({
      id: duplicate ? undefined : template?.id, value: template ? {
        title: duplicate ? `${template.title.slice(0, 193)} (copy)` : template.title,
        subject: template.subject, body: template.body, category: template.category,
        tags: template.tags, characterLimit: template.characterLimit, favorite: duplicate ? false : template.favorite,
        pinned: duplicate ? false : template.pinned,
      } : { ...empty }
    });
    setLimitText(template?.characterLimit?.toString() ?? "");
  }

  function update(value: Partial<TemplateInput>) {
    setEditor(current => current ? { ...current, value: { ...current.value, ...value } } : null);
  }

  function upsert(template: Template) {
    setTemplates(current => [...current.filter(t => t.id !== template.id), template]);
  }

  function save() {
    if (!editor) return;
    const value = { ...editor.value, characterLimit: limitText.trim() ? Number(limitText) : null };
    const parsed = templateSchema.safeParse(value);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setError("");
    startTransition(async () => {
      try {
        const result = await saveTemplate(value, editor.id);
        if (result.error) { setError(result.error); return; }
        if (result.template) upsert(result.template);
        setEditor(null);
        setNotice("Template saved.");
      } catch { setError("Could not save. Please try again."); }
    });
  }

  const count = characterCount(editor?.value.body ?? "");
  const limit = limitText.trim() ? Number(limitText) : null;
  const overLimit = limit !== null && count > limit;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{templates.length} templates · {templates.filter(t => t.favorite).length} favorites</p>
        <Button onClick={() => openEditor()}><Plus className="mr-2 h-4 w-4" />New template</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search templates" placeholder="Search templates, messages, tags…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category ? `category:${category}` : "all"} onValueChange={value => setCategory(value === "all" ? "" : value.slice(9))}>
          <SelectTrigger aria-label="Filter by category" className="h-10 w-full rounded-xl border-border/50 bg-background sm:w-[220px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={`category:${c}`}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tag ? `tag:${tag}` : "all"} onValueChange={value => setTag(value === "all" ? "" : value.slice(4))}>
          <SelectTrigger aria-label="Filter by tag" className="h-10 w-full rounded-xl border-border/50 bg-background sm:w-[180px]">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map(t => <SelectItem key={t} value={`tag:${t}`}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={favorites ? "default" : "outline"} aria-pressed={favorites} onClick={() => setFavorites(!favorites)}><Star className="mr-2 h-4 w-4" />Favorites</Button>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex gap-1 rounded-xl border p-1" role="group" aria-label="Template layout">
          <Button size="sm" variant={view === "grid" ? "default" : "ghost"} aria-pressed={view === "grid"} onClick={() => setView("grid")}><LayoutGrid className="mr-2 h-4 w-4" />Grid</Button>
          <Button size="sm" variant={view === "column" ? "default" : "ghost"} aria-pressed={view === "column"} onClick={() => setView("column")}><Rows3 className="mr-2 h-4 w-4" />Column</Button>
        </div>
      </div>
      <p role="status" className="text-sm text-muted-foreground">{notice}</p>
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{templates.length ? "No matching templates" : "Build your message library"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{templates.length ? "Try another search or clear your filters." : "Create your first template for any platform or purpose."}</p>
          <Button className="mt-5" variant="outline" onClick={() => templates.length ? (setSearch(""), setCategory(""), setTag(""), setFavorites(false)) : openEditor()}>{templates.length ? "Clear filters" : "Create a template"}</Button>
        </div>
      ) : <div className={`grid gap-3 ${view === "grid" ? "lg:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
        {visible.map(template => {
          const length = characterCount(template.body);
          const exceeded = template.characterLimit !== null && length > template.characterLimit;
          return <article key={template.id} className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1"><h2 className="line-clamp-2 break-words text-base font-semibold" title={template.title}>{template.title}</h2>{template.category && <p className="mt-0.5 truncate text-xs text-muted-foreground" title={template.category}>{template.category}</p>}</div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                <Button size="icon" className="h-7 w-7" title={template.pinned ? "Unpin" : "Pin to top"} variant="ghost" disabled={pending} aria-label={`${template.pinned ? "Unpin" : "Pin"} ${template.title}`} aria-pressed={template.pinned} onClick={() => startTransition(async () => {
                  try {
                    const result = await setTemplatePinned(template.id, !template.pinned);
                    if (result.template) upsert(result.template);
                    if (result.error) setNotice(result.error);
                  } catch { setNotice("Could not update pin. Please try again."); }
                })}><Pin className={`h-3.5 w-3.5 ${template.pinned ? "fill-primary text-primary" : ""}`} /></Button>
                <Button size="icon" className="h-7 w-7" title={template.favorite ? "Remove favorite" : "Favorite"} variant="ghost" disabled={pending} aria-label={`${template.favorite ? "Unfavorite" : "Favorite"} ${template.title}`} aria-pressed={template.favorite} onClick={() => startTransition(async () => {
                  try {
                    const result = await setTemplateFavorite(template.id, !template.favorite);
                    if (result.template) upsert(result.template);
                    if (result.error) setNotice(result.error);
                  } catch { setNotice("Could not update favorite. Please try again."); }
                })}><Star className={`h-3.5 w-3.5 ${template.favorite ? "fill-amber-400 text-amber-500" : ""}`} /></Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Created on {new Date(template.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</p>
            {template.subject && <p className="truncate text-sm" title={template.subject}><span className="font-medium">Subject: </span>{template.subject}</p>}
            <p className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 text-sm leading-relaxed">{template.body}</p>
            {template.tags.length > 0 && <div className="flex max-h-14 flex-wrap gap-1 overflow-y-auto">{template.tags.map(t => <button key={t} onClick={() => setTag(t)} className="max-w-full break-words rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">#{t}</button>)}</div>}
            <p className={`text-xs ${exceeded ? "text-destructive" : "text-muted-foreground"}`}>{length}{template.characterLimit !== null ? ` / ${template.characterLimit}` : ""} characters{exceeded ? " · Over limit" : ""}</p>
            <div className="mt-auto flex flex-wrap items-center gap-1 border-t pt-2">
              <TemplateCopyButton text={template.body} label="Copy" variant="outline" onError={setNotice} />
              {template.subject && <><TemplateCopyButton text={template.subject} label="Subject" onError={setNotice} /><TemplateCopyButton text={`Subject: ${template.subject}\n\n${template.body}`} label="Copy both" onError={setNotice} /></>}
              <Button size="icon" className="h-7 w-7" title="Edit" aria-label={`Edit ${template.title}`} variant="ghost" onClick={() => openEditor(template)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="icon" className="h-7 w-7" title="Duplicate" aria-label={`Duplicate ${template.title}`} variant="ghost" onClick={() => openEditor(template, true)}><Files className="h-3.5 w-3.5" /></Button>
              <Button size="icon" className="h-7 w-7" title="Delete" variant="ghost" aria-label={`Delete ${template.title}`} onClick={() => { setError(""); setDeleting(template); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </article>;
        })}
      </div>}

      <Dialog open={editor !== null} onOpenChange={open => { if (!open && !pending) setEditor(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit template" : "New template"}</DialogTitle><DialogDescription>Make it yours. Categories, tags, and character limits are optional.</DialogDescription></DialogHeader>
          {editor && <form className="space-y-4" onSubmit={e => { e.preventDefault(); save(); }}>
            <fieldset disabled={pending} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="template-title">Title</Label><Input id="template-title" required maxLength={200} autoFocus value={editor.value.title} onChange={e => update({ title: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="template-subject">Subject (optional)</Label><Input id="template-subject" maxLength={500} value={editor.value.subject} onChange={e => update({ subject: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="template-body">Message</Label><Textarea id="template-body" required rows={9} value={editor.value.body} onChange={e => update({ body: e.target.value })} aria-describedby="template-count" /><p id="template-count" aria-live="polite" className={`text-sm ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>{count}{limit !== null && Number.isFinite(limit) ? ` / ${limit}` : ""} characters{overLimit ? ` — ${count - limit!} over the limit. You can still save this draft.` : ""}</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="template-category">Category</Label><TemplateOptionPicker id="template-category" label="Category" options={categories} values={editor.value.category ? [editor.value.category] : []} onChange={values => update({ category: values[0] ?? "" })} maxLength={80} disabled={pending} /></div>
                <div className="space-y-2"><Label htmlFor="template-limit">Character limit</Label><Input id="template-limit" type="number" min={1} max={50000} step={1} placeholder="No limit" value={limitText} onChange={e => setLimitText(e.target.value)} /><p className="text-xs text-muted-foreground">Applies to the message body.</p></div>
              </div>
              <div className="space-y-2"><Label htmlFor="template-tags">Tags</Label><TemplateOptionPicker id="template-tags" label="Tags" options={tags} values={editor.value.tags} onChange={values => update({ tags: values })} multiple maxLength={40} disabled={pending} /><p className="text-xs text-muted-foreground">Choose existing tags or create new ones. Up to 20 tags, 40 characters each.</p></div>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editor.value.favorite} onChange={e => update({ favorite: e.target.checked })} />Favorite</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editor.value.pinned} onChange={e => update({ pinned: e.target.checked })} />Pin to top</label>
              </div>
            </fieldset>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => setEditor(null)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save template"}</Button></div>
          </form>}
        </DialogContent>
      </Dialog>
      <Dialog open={deleting !== null} onOpenChange={open => { if (!open && !pending) setDeleting(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Delete template?</DialogTitle><DialogDescription>“{deleting?.title}” will be permanently removed.</DialogDescription></DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={pending} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={pending} onClick={() => {
            if (!deleting) return;
            const id = deleting.id;
            startTransition(async () => {
              try {
                const result = await deleteTemplate(id);
                if (result.error) { setError(result.error); return; }
                setTemplates(current => current.filter(t => t.id !== id));
                setDeleting(null); setNotice("Template deleted.");
              } catch { setError("Could not delete. Please try again."); }
            });
          }}>{pending ? "Deleting…" : "Delete template"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
