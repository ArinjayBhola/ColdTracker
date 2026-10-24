"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowUpRight, ChevronDown, Ellipsis, Inbox, Linkedin, Loader2, Mail, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { usePreferences } from "@/components/preferences-provider";
import { OutreachActions } from "@/components/outreach-actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TableShell, TableContent } from "@/components/ui/data-table/table-shell";
import { TablePagination } from "@/components/ui/data-table/table-pagination";
import { bulkDeleteOutreach } from "@/actions/outreach";
import { calendarKey } from "@/lib/user-calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type OutreachItem = { id: string; companyName: string; roleTargeted: string; personName: string; status: string; messageSentAt: Date | string; followUpDueAt: Date | string | null; contactMethod: string; contactCount: number };
type Props = { items: OutreachItem[]; totalCount: number; currentPage: number; pageSize?: number; timeZone?: string };
type FilterDraft = { method: string; start: string; end: string; preset: string };
const calendarDate = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : "";
const dateLabel = (value: string) => value ? format(new Date(`${value}T12:00:00`), "MMM d") : "Any date";
export function OutreachTable({ items, totalCount, currentPage, pageSize = 10, timeZone = "UTC" }: Props) {
  const todayKey = calendarKey(new Date(), timeZone);
  const formatDay = (value: Date | string) => { const key = calendarKey(value, timeZone); return format(new Date(`${key}T12:00:00`), key.slice(0, 4) === todayKey.slice(0, 4) ? "MMM d" : "MMM d, yyyy"); };
  const overdue = (value: Date | string) => calendarKey(value, timeZone) < todayKey;
  const router = useRouter();
  const params = useSearchParams();
  const { preferences } = usePreferences();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const appliedSearch = params.get("q") || "";
  const requestedMethod = params.get("filter") || preferences.table.defaultMethod;
  const method = ["ALL", "EMAIL", "LINKEDIN"].includes(requestedMethod) ? requestedMethod : "ALL";
  const start = calendarDate(params.get("start"));
  const end = calendarDate(params.get("end"));
  const [search, setSearch] = useState(appliedSearch);
  const lastSubmitted = useRef(appliedSearch);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scope = params.toString();
  const [selection, setSelection] = useState({ scope, ids: new Set<string>() });
  const selected = selection.scope === scope ? selection.ids : new Set<string>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>({ method, start, end, preset: start || end ? "custom" : "any" });
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const show = (column: typeof preferences.table.columns[number]) => preferences.table.columns.includes(column);
  const activeCount = Number(method !== "ALL") + Number(!!(start || end));
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);
  useEffect(() => {
    if (lastSubmitted.current !== appliedSearch) {
      lastSubmitted.current = appliedSearch;
      // Keep the input in sync with browser back/forward navigation.
          setSearch(appliedSearch);
    }
  }, [appliedSearch]);
  function navigate(changes: Record<string, string>, replace = true) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const next = new URLSearchParams(params.toString());
    next.set("q", search);
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    if (!next.get("q")) next.delete("q");
    if (!("page" in changes)) next.set("page", "1");
    lastSubmitted.current = next.get("q") || "";
    setSelection({ scope, ids: new Set() });
    startTransition(() => { const href = `/dashboard?${next.toString()}`; if (replace) router.replace(href, { scroll: false }); else router.push(href, { scroll: false }); });
  }
  function searchChanged(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => navigate({ q: value }), 350);
  }
  function openFilters(open: boolean) {
    if (open) setDraft({ method, start, end, preset: start || end ? "custom" : "any" });
    setFiltersOpen(open);
  }
  function choosePreset(value: string) {
    if (value === "custom") { setDraft(previous => ({ ...previous, preset: value })); return; }
    if (value === "any") { setDraft(previous => ({ ...previous, preset: value, start: "", end: "" })); return; }
    const now = new Date(); const beginning = new Date(); beginning.setDate(beginning.getDate() - Number(value));
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setDraft(previous => ({ ...previous, preset: value, start: calendarKey(beginning, zone), end: calendarKey(now, zone) }));
  }
  function toggle(id: string) { setSelection(previous => { const ids = previous.scope === scope ? new Set(previous.ids) : new Set<string>(); if (ids.has(id)) ids.delete(id); else ids.add(id); return { scope, ids }; }); }
  async function remove() {
    setDeleting(true);
    try {
      const result = await bulkDeleteOutreach(deleteIds);
      if (!result.success) throw new Error(result.error || "Could not delete outreach");
      toast({ title: deleteIds.length === 1 ? "Outreach deleted" : `${deleteIds.length} entries deleted` });
      setDeleteIds([]); setSelection({ scope, ids: new Set() });
    } catch (error) { toast({ title: "Could not delete", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }); }
    finally { setDeleting(false); }
  }
  return <TableShell className="shadow-none">
    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-4 sm:px-5">
      <h2 className="mr-auto flex items-center gap-2 text-base font-medium">Outreach<span className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{totalCount}</span></h2>
      <form onSubmit={event => { event.preventDefault(); navigate({ q: search }); }} role="search" className="relative order-3 w-full sm:order-none sm:w-64 lg:w-80">
        {pending ? <Loader2 className="absolute left-3 top-3 h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
        <input aria-label="Search all outreach" type="search" maxLength={200} placeholder="Search company, person, role..." value={search} onChange={event => searchChanged(event.target.value)} className="h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 [&::-webkit-search-cancel-button]:appearance-none" />
        {search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(""); navigate({ q: "" }); }} className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
      </form>
      <Popover open={filtersOpen} onOpenChange={openFilters}><PopoverTrigger asChild><Button variant="outline" className="h-10 gap-2 px-3 text-sm shadow-none"><SlidersHorizontal className="h-3.5 w-3.5" />Filters{activeCount > 0 && <span className="rounded bg-primary/10 px-1.5 text-xs text-primary">{activeCount}</span>}<ChevronDown className="h-3 w-3 text-muted-foreground" /></Button></PopoverTrigger>
        <PopoverContent align="end" className="w-[320px] max-w-[calc(100vw-2rem)] bg-card p-5">
          <h3 className="mb-5 text-sm font-medium">Narrow your view</h3>
          <div className="space-y-5"><div><p className="mb-2 text-xs text-muted-foreground">Channel</p><div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">{['ALL', 'EMAIL', 'LINKEDIN'].map(value => <button key={value} type="button" aria-pressed={draft.method === value} onClick={() => setDraft(previous => ({ ...previous, method: value }))} className={cn("rounded-md py-2 text-xs", draft.method === value ? "bg-card shadow-sm" : "text-muted-foreground")}>{value === "ALL" ? "All" : value === "EMAIL" ? "Email" : "LinkedIn"}</button>)}</div></div>
            <div className="space-y-2"><label htmlFor="sent-period" className="text-xs text-muted-foreground">Sent date</label><Select value={draft.preset} onValueChange={choosePreset}><SelectTrigger id="sent-period" className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any time</SelectItem><SelectItem value="0">Today</SelectItem><SelectItem value="6">Last 7 days</SelectItem><SelectItem value="29">Last 30 days</SelectItem><SelectItem value="custom">Custom range</SelectItem></SelectContent></Select></div>
            {draft.preset === "custom" && <div className="grid gap-3"><div className="space-y-2"><label htmlFor="sent-from" className="text-xs text-muted-foreground">From</label><DatePicker id="sent-from" displayFormat="MMM d, yyyy" value={draft.start ? new Date(`${draft.start}T12:00:00`) : undefined} onChange={date => setDraft(previous => ({ ...previous, start: date ? format(date, "yyyy-MM-dd") : "" }))} placeholder="Start date" /></div><div className="space-y-2"><label htmlFor="sent-to" className="text-xs text-muted-foreground">To</label><DatePicker id="sent-to" displayFormat="MMM d, yyyy" value={draft.end ? new Date(`${draft.end}T12:00:00`) : undefined} onChange={date => setDraft(previous => ({ ...previous, end: date ? format(date, "yyyy-MM-dd") : "" }))} placeholder="End date" /></div></div>}
            {draft.start && draft.end && draft.start > draft.end && <p role="alert" className="text-xs text-destructive">The end date must be on or after the start date.</p>}
            <div className="flex items-center justify-between border-t pt-4"><Button variant="ghost" size="sm" onClick={() => setDraft({ method: "ALL", start: "", end: "", preset: "any" })}>Reset</Button><Button size="sm" disabled={!!(draft.start && draft.end && draft.start > draft.end)} onClick={() => { navigate({ filter: draft.method, start: draft.start, end: draft.end }); setFiltersOpen(false); }}>Apply filters</Button></div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
    {(activeCount > 0 || appliedSearch || selected.size > 0) && <div className="flex flex-wrap items-center gap-2 border-b bg-muted/15 px-5 py-2.5 text-xs">
      {selected.size > 0 ? <><span className="mr-2">{selected.size} selected</span><button className="flex items-center gap-1.5 text-destructive" onClick={() => setDeleteIds([...selected])}><Trash2 className="h-3.5 w-3.5" />Delete selected</button><button onClick={() => setSelection({ scope, ids: new Set() })} className="ml-auto text-muted-foreground">Deselect</button></> : <>
        {method !== "ALL" && <button onClick={() => navigate({ filter: "ALL" })} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1">{method === "EMAIL" ? "Email" : "LinkedIn"}<X className="h-3 w-3" /></button>}
        {(start || end) && <button onClick={() => navigate({ start: "", end: "" })} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1">Sent: {dateLabel(start)} - {dateLabel(end)}<X className="h-3 w-3" /></button>}
        <span className="text-muted-foreground">{totalCount} matching {totalCount === 1 ? "entry" : "entries"}</span><button onClick={() => { setSearch(""); navigate({ filter: "ALL", start: "", end: "", q: "" }); }} className="ml-auto text-muted-foreground hover:text-foreground">Clear all</button>
      </>}
    </div>}
    <div aria-busy={pending} className={cn("transition-opacity", pending && "opacity-65")}><TableContent>
      <thead className="bg-muted/20 text-left text-[11px] text-muted-foreground"><tr>
        <th className="w-10 px-3 py-3"><Checkbox className="border-border data-[state=checked]:border-primary" aria-label="Select all entries on this page" checked={items.length > 0 && selected.size === items.length ? true : selected.size > 0 ? "indeterminate" : false} onCheckedChange={() => setSelection({ scope, ids: selected.size === items.length ? new Set() : new Set(items.map(item => item.id)) })} /></th>
        <th className="px-3 py-3 font-normal">{show("role") ? "Company & position" : "Company"}</th><th className="hidden px-3 py-3 font-normal sm:table-cell">Contact</th>
        {show("status") && <th className="px-3 py-3 font-normal">Status</th>}{show("date") && <th className="hidden px-3 py-3 font-normal lg:table-cell">Sent</th>}{show("followUp") && <th className="hidden px-3 py-3 font-normal md:table-cell">Next follow-up</th>}{show("actions") && <th className="w-10 px-2 py-3"><span className="sr-only">Actions</span></th>}
      </tr></thead>
      <tbody>{items.length === 0 ? <tr><td colSpan={7} className="px-5 py-16 text-center"><Inbox className="mx-auto mb-4 h-8 w-8 text-muted-foreground/50" /><p className="text-sm font-medium">{appliedSearch || activeCount ? "No matching conversations" : "Your next conversation starts here"}</p><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{appliedSearch || activeCount ? "Try a different search or clear a filter to see more outreach." : "Use Quick log above to save your first outreach. We'll keep track of what comes next."}</p></td></tr> : items.map(item => <tr key={item.id} className={cn("border-t border-border/60 transition-colors hover:bg-muted/25", selected.has(item.id) && "bg-primary/5")}>
        <td className="px-3 py-4"><Checkbox className="border-border data-[state=checked]:border-primary" aria-label={`Select ${item.companyName}`} checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} /></td>
        <td className="px-3 py-4"><div className="flex items-center gap-2">{item.followUpDueAt && calendarKey(item.followUpDueAt, timeZone) <= todayKey && <span role="img" aria-label={overdue(item.followUpDueAt) ? "Follow-up overdue" : "Follow-up due today"} title={overdue(item.followUpDueAt) ? "Follow-up overdue" : "Follow-up due today"} className={cn("h-2.5 w-2.5 shrink-0 rounded-full", overdue(item.followUpDueAt) ? "bg-destructive" : "bg-primary")} />}<Link href={`/outreach/${item.id}`} className="block max-w-[128px] truncate text-sm font-medium hover:text-primary sm:max-w-[240px]">{item.companyName}</Link></div>{show("role") && <p className="mt-1 max-w-[140px] sm:max-w-[260px] truncate text-xs text-muted-foreground" title={item.roleTargeted}>{item.roleTargeted}</p>}<p className="mt-1 max-w-[140px] truncate text-xs text-muted-foreground sm:hidden">{item.personName === "No Contact" ? (item.contactMethod === "EMAIL" ? "Email" : "LinkedIn") : item.personName}</p></td>
        <td className="hidden px-3 py-4 sm:table-cell"><span className="block max-w-[190px] truncate text-sm">{item.personName === "No Contact" ? "Not added" : item.personName}</span><span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">{item.contactMethod === "EMAIL" ? <Mail className="h-3 w-3" /> : <Linkedin className="h-3 w-3" />}{item.contactMethod === "EMAIL" ? "Email" : "LinkedIn"}{item.contactCount > 1 && <span className="ml-1">+{item.contactCount - 1} more</span>}</span></td>
        {show("status") && <td className="px-1 py-4"><OutreachActions compact id={item.id} currentStatus={item.status} /></td>}
        {show("date") && <td className="hidden whitespace-nowrap px-3 py-4 text-xs text-muted-foreground lg:table-cell">{formatDay(item.messageSentAt)}</td>}
        {show("followUp") && <td className="hidden whitespace-nowrap px-3 py-4 text-xs md:table-cell">{item.followUpDueAt ? <span className={cn("inline-flex items-center gap-1.5", overdue(item.followUpDueAt) ? "text-destructive" : "text-muted-foreground")}>{overdue(item.followUpDueAt) && <span className="h-1 w-1 rounded-full bg-destructive" />}{formatDay(item.followUpDueAt)}</span> : <span className="text-muted-foreground/50">-</span>}</td>}
        {show("actions") && <td className="px-2 py-4"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={`Actions for ${item.companyName}`}><Ellipsis className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={`/outreach/${item.id}`}><ArrowUpRight className="h-4 w-4" />Open outreach</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => setDeleteIds([item.id])}><Trash2 className="h-4 w-4" />Delete outreach</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>}
      </tr>)}</tbody>
    </TableContent></div>
    {items.length > 0 && <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground"><span>{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries</span><span>Sorted by newest</span></div>}
    <TablePagination currentPage={currentPage} totalPages={Math.ceil(totalCount / pageSize)} onPageChange={page => navigate({ page: String(page) }, false)} />
    <AlertDialog open={deleteIds.length > 0} onOpenChange={open => { if (!open && !deleting) setDeleteIds([]); }}><AlertDialogContent onEscapeKeyDown={event => { if (deleting) event.preventDefault(); }}><AlertDialogHeader><AlertDialogTitle>Delete {deleteIds.length === 1 ? "this outreach" : `${deleteIds.length} entries`}?</AlertDialogTitle><AlertDialogDescription>The selected outreach and its contacts will be permanently removed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Keep {deleteIds.length === 1 ? "it" : "them"}</AlertDialogCancel><AlertDialogAction asChild><Button variant="destructive" disabled={deleting} onClick={event => { event.preventDefault(); void remove(); }}>{deleting ? "Deleting..." : "Delete outreach"}</Button></AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </TableShell>;
}
