"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CircleHelp, Plus, X } from "lucide-react";
import { getKeyboardShortcuts, saveKeyboardShortcuts } from "@/actions/keyboard-shortcuts";
import { defaultShortcutPreferences, formatBinding, keyboardStroke, normalizeBinding, shortcutActions, shortcutPreferencesSchema, type ShortcutPreferences } from "@/lib/keyboard-shortcuts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const queryKey = ["keyboard-shortcut-preferences"];
const syncEvent = "coldtrack-shortcuts-saved";

function useShortcutPreferences(enabled = true) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) { queryClient.removeQueries({ queryKey }); return; }
    const refresh = () => { void queryClient.invalidateQueries({ queryKey }); };
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(syncEvent) : null;
    if (channel) channel.onmessage = refresh;
    return () => channel?.close();
  }, [enabled, queryClient]);
  return useQuery({ queryKey, queryFn: getKeyboardShortcuts, enabled, staleTime: 60_000, retry: 1, refetchOnWindowFocus: true });
}

function ShortcutList({ preferences }: { preferences: ShortcutPreferences }) {
  return <dl className="space-y-3">{shortcutActions.map(action => <div key={action.id} className="flex items-center justify-between gap-4 text-sm"><dt>{action.label}</dt><dd className="shrink-0 rounded-md border bg-muted px-2 py-1 font-mono text-xs">{formatBinding(preferences.bindings[action.id])}</dd></div>)}</dl>;
}

function ShortcutKeyInputs({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  const [captureError, setCaptureError] = useState("");
  const steps = value.split(" ");
  const hasSecond = steps.length > 1;
  return <div className="space-y-1">
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => <div key={index} className="flex items-center gap-2">
        {index > 0 && <span className="text-xs text-muted-foreground">then</span>}
        <Input id={index === 0 ? id : `${id}-second`} className="w-32 text-center text-sm" aria-label={`${label}: ${index === 0 ? "first" : "second"} key`} aria-describedby={`${id}-hint`} readOnly autoFocus={index === 1 && !step} value={step ? formatBinding(step) : ""} placeholder="Press key" onKeyDown={event => {
          if (event.key === "Tab") return;
          if (event.key === "Escape") { event.currentTarget.blur(); return; }
          event.preventDefault(); event.stopPropagation();
          if (["Control", "Alt", "Meta", "Shift"].includes(event.key) || event.repeat || event.nativeEvent.isComposing) return;
          const stroke = ["Backspace", "Delete"].includes(event.key) ? "" : keyboardStroke(event);
          if (normalizeBinding(stroke) === null) { setCaptureError("Choose a letter, number, or symbol. Browser-reserved keys are unavailable."); return; }
          setCaptureError("");
          const updated = [...steps]; updated[index] = stroke;
          onChange(updated.join(" "));
        }} />
      </div>)}
      {hasSecond ? <Button type="button" size="icon" variant="ghost" title="Remove second key" aria-label={`Remove second key for ${label}`} onClick={() => { setCaptureError(""); onChange(steps[0]); }}><X className="h-4 w-4" /></Button> : <Button type="button" size="sm" variant="outline" disabled={!steps[0]} onClick={() => { setCaptureError(""); onChange(`${steps[0]} `); }}><Plus className="mr-1 h-3 w-3" />Add second key</Button>}
      {value && <Button type="button" size="sm" variant="ghost" onClick={() => { setCaptureError(""); onChange(""); }}>Clear</Button>}
    </div>
    <p id={`${id}-hint`} className="text-xs text-muted-foreground">{captureError || (hasSecond ? "Press the first key, then the second key." : "Click the box and press a key or combination.")}</p>
  </div>;
}

function ShortcutEditor({ initial }: { initial: ShortcutPreferences }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const validation = shortcutPreferencesSchema.safeParse(draft);
  const incomplete = Object.values(draft.bindings).some(binding => binding.includes(" ") && binding.split(" ").some(step => !step));
  function save() {
    if (incomplete) { setMessage("Capture both keys, or remove the empty second key."); return; }
    if (!validation.success) { setMessage(validation.error.issues[0].message); return; }
    setMessage("");
    startTransition(async () => {
      try {
        const result = await saveKeyboardShortcuts(validation.data);
        if (result.error) { setMessage(result.error); return; }
        if (result.preferences) {
          setDraft(result.preferences);
          queryClient.setQueryData(queryKey, result.preferences);
          if (typeof BroadcastChannel !== "undefined") {
            const channel = new BroadcastChannel(syncEvent);
            channel.postMessage("updated"); channel.close();
          }
          setMessage("Shortcuts saved.");
        }
      } catch { setMessage("Could not save shortcuts. Please try again."); }
    });
  }
  return <form className="space-y-5" onSubmit={event => { event.preventDefault(); save(); }}>
    <fieldset disabled={pending} className="space-y-5">
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={draft.enabled} onChange={event => setDraft({ ...draft, enabled: event.target.checked })} />Enable keyboard shortcuts</label>
      <p id="shortcut-format" className="text-sm text-muted-foreground">Click a key box and press your shortcut, including modifiers such as Ctrl or Shift. Use Add second key for a sequence. Clear unassigns the action.</p>
      <div className="space-y-4">{shortcutActions.map(action => <div key={action.id} className="space-y-2 border-b border-border/40 pb-4 last:border-0">
        <Label htmlFor={`shortcut-${action.id}`}>{action.label}</Label>
        <ShortcutKeyInputs id={`shortcut-${action.id}`} label={action.label} value={draft.bindings[action.id]} onChange={value => { setMessage(""); setDraft({ ...draft, bindings: { ...draft.bindings, [action.id]: value } }); }} />
      </div>)}</div>
    </fieldset>
    {!validation.success && <p role="alert" className="text-sm text-destructive">{validation.error.issues[0].message}</p>}
    {incomplete && <p role="alert" className="text-sm text-destructive">Capture both keys, or remove the empty second key.</p>}
    <p role="status" className="text-sm text-muted-foreground">{message}</p>
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" disabled={pending} onClick={() => { setDraft({ enabled: initial.enabled, bindings: { ...defaultShortcutPreferences.bindings } }); setMessage("Default keys restored. Save to apply."); }}>Reset keys</Button>
      <Button type="submit" disabled={pending || !validation.success || incomplete}>{pending ? "Saving…" : "Save shortcuts"}</Button>
    </div>
  </form>;
}

export function KeyboardShortcutSettings() {
  const { data, isPending, error, refetch } = useShortcutPreferences();
  return <Card id="keyboard-shortcuts"><CardHeader><CardTitle>Keyboard shortcuts</CardTitle><CardDescription>Customize your keys. Saved shortcuts follow your account across devices.</CardDescription></CardHeader>
    <CardContent>{isPending ? <p className="text-sm text-muted-foreground">Loading shortcuts…</p> : error ? <div className="space-y-3"><p role="alert" className="text-sm text-destructive">Could not load shortcuts.</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div> : data ? <ShortcutEditor initial={data} /> : null}</CardContent>
  </Card>;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const inApp = pathname !== "/" && !pathname.startsWith("/signin") && !pathname.startsWith("/signup");
  const { data: preferences, error, refetch } = useShortcutPreferences(inApp);
  const [helpOpen, setHelpOpen] = useState(false);
  const sequence = useRef({ stroke: "", at: 0 });

  useEffect(() => {
    sequence.current = { stroke: "", at: 0 };
    if (!inApp || !preferences?.enabled) return;
    const bindings = shortcutActions.flatMap(action => preferences.bindings[action.id] ? [{ ...action, binding: preferences.bindings[action.id] }] : []);
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (event.defaultPrevented || event.repeat || event.isComposing ||
        target?.closest("input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=combobox], [role=textbox], [role=menu], [role=listbox]") ||
        document.querySelector('[role="dialog"], [role="alertdialog"]')) { sequence.current = { stroke: "", at: 0 }; return; }
      if (["Control", "Meta", "Alt", "Shift"].includes(event.key)) return;
      const stroke = keyboardStroke(event);
      const previous = sequence.current;
      sequence.current = { stroke: "", at: 0 };
      const combined = previous.stroke && Date.now() - previous.at < 1200 ? `${previous.stroke} ${stroke}` : stroke;
      const action = bindings.find(action => action.binding === combined) ?? bindings.find(action => action.binding === stroke);
      if (action) {
        event.preventDefault();
        if (action.route) router.push(action.route);
        else if (action.id === "help") setHelpOpen(true);
        else if (action.id === "search") {
          const input = Array.from(document.querySelectorAll<HTMLInputElement>('main input[type="search"], main input[placeholder*="Search"], main input[aria-label*="Search"]')).find(input => !input.disabled && input.getClientRects().length > 0);
          input?.focus();
        }
      } else if (bindings.some(action => action.binding.startsWith(`${stroke} `))) {
        event.preventDefault();
        sequence.current = { stroke, at: Date.now() };
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inApp, preferences, pathname, router]);

  if (!inApp) return null;
  return <>
    <Button type="button" size="icon" variant="outline" className="fixed right-4 top-4 z-40 h-9 w-9 rounded-full bg-background shadow-sm md:right-6" title="Your keyboard shortcuts" aria-label="Show your keyboard shortcuts" onClick={() => setHelpOpen(true)}><CircleHelp className="h-4 w-4" /></Button>
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Your keyboard shortcuts</DialogTitle><DialogDescription>{preferences ? preferences.enabled ? "Your saved keys. Press sequence keys within 1.2 seconds." : "Keyboard shortcuts are currently disabled. You can enable them in Settings." : "View your saved keys and customize them in Settings."}</DialogDescription></DialogHeader>
      {preferences ? <ShortcutList preferences={preferences} /> : error ? <div><p role="alert">Could not load shortcuts.</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div> : <p>Loading shortcuts…</p>}
      <Button variant="outline" asChild><Link href="/settings#keyboard-shortcuts" onClick={() => setHelpOpen(false)}>Customize shortcuts</Link></Button>
    </DialogContent></Dialog>
  </>;
}
