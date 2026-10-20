"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TemplateOptionPicker({ id, label, options, values, onChange, multiple = false, maxLength, disabled }: {
  id: string; label: string; options: string[]; values: string[];
  onChange: (values: string[]) => void; multiple?: boolean; maxLength: number; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const choices = [...new Set([...options, ...values])].sort();
  const filtered = choices.filter(option => option.toLowerCase().includes(query.trim().toLowerCase()));
  const candidate = query.trim();
  const existing = choices.find(option => option.toLowerCase() === candidate.toLowerCase());
  const full = multiple && values.length >= 20;
  function select(option: string) {
    onChange(multiple ? values.includes(option) ? values.filter(value => value !== option) : [...values, option] : [option]);
    setQuery("");
    if (!multiple) setOpen(false);
  }
  return <div className="space-y-2">
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" disabled={disabled} aria-label={label} aria-expanded={open} className="h-12 w-full justify-between rounded-xl border-2 px-4 font-normal">
          <span className="truncate">{values.length ? multiple ? `${values.length} tags selected` : values[0] : `Choose or create ${multiple ? "tags" : "a category"}`}</span><ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-60 max-w-[calc(100vw-2rem)] space-y-2 bg-popover p-2">
        <Input aria-label={`Search or create ${label.toLowerCase()}`} placeholder="Search or type a new name…" value={query} maxLength={maxLength} onChange={e => setQuery(e.target.value)} onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (candidate && (!full || (existing && values.includes(existing)))) select(existing ?? candidate);
          }
        }} />
        <div className="max-h-52 overflow-y-auto">
          {!multiple && <button type="button" onClick={() => { onChange([]); setOpen(false); }} className="w-full rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-accent">No category</button>}
          {filtered.map(option => <button type="button" key={option} disabled={full && !values.includes(option)} aria-pressed={values.includes(option)} onClick={() => select(option)} className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent disabled:opacity-50">
            <span className="break-words">{option}</span>{values.includes(option) && <Check className="h-4 w-4 shrink-0" />}
          </button>)}
          {candidate && !existing && <button type="button" disabled={full} onClick={() => select(candidate)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-primary hover:bg-accent disabled:opacity-50"><Plus className="h-4 w-4 shrink-0" /><span className="break-words">Create “{candidate}”</span></button>}
          {!filtered.length && !candidate && <p className="p-2 text-sm text-muted-foreground">Type a name to create your first {multiple ? "tag" : "category"}.</p>}
        </div>
        {full && <p className="px-2 text-xs text-muted-foreground">Maximum 20 tags per template.</p>}
      </PopoverContent>
    </Popover>
    {multiple && <div className="flex flex-wrap gap-2">{values.map(value => <button type="button" key={value} disabled={disabled} onClick={() => onChange(values.filter(v => v !== value))} aria-label={`Remove tag ${value}`} className="flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"><span className="break-words">{value}</span><X className="h-3 w-3 shrink-0" /></button>)}</div>}
  </div>;
}
