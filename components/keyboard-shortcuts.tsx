"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const preferenceKey = "coldtrack-keyboard-shortcuts";
const preferenceEvent = "coldtrack-shortcuts-changed";
const shortcuts = [
  ["G then D", "Dashboard"], ["G then T", "Templates"],
  ["G then F", "Follow-ups"], ["G then S", "Settings"],
  ["G then L", "Startups"], ["N", "Add outreach"],
  ["/", "Focus search on the current page"], ["?", "Show keyboard shortcuts"],
];
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(preferenceEvent, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(preferenceEvent, callback); };
}
function snapshot() {
  try { return localStorage.getItem(preferenceKey) !== "false"; } catch { return true; }
}
function useShortcutsEnabled() { return useSyncExternalStore(subscribe, snapshot, () => true); }

function ShortcutList() {
  return <dl className="space-y-3">{shortcuts.map(([keys, description]) => <div key={keys} className="flex items-center justify-between gap-4 text-sm"><dt>{description}</dt><dd className="shrink-0 rounded-md border bg-muted px-2 py-1 font-mono text-xs">{keys}</dd></div>)}</dl>;
}

export function KeyboardShortcutSettings() {
  const enabled = useShortcutsEnabled();
  return <Card><CardHeader><CardTitle>Keyboard shortcuts</CardTitle><CardDescription>Navigate faster. Shortcuts pause while typing or using a dialog. This preference is saved in this browser.</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      <Button variant={enabled ? "default" : "outline"} aria-pressed={enabled} onClick={() => {
        try { localStorage.setItem(preferenceKey, String(!enabled)); } catch { return; }
        window.dispatchEvent(new Event(preferenceEvent));
      }}>{enabled ? "Shortcuts enabled" : "Shortcuts disabled"}</Button>
      <ShortcutList />
    </CardContent>
  </Card>;
}

export function KeyboardShortcuts() {
  const enabled = useShortcutsEnabled();
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);
  const sequence = useRef(0);

  useEffect(() => {
    sequence.current = 0;
    if (!enabled || pathname === "/" || pathname.startsWith("/signin") || pathname.startsWith("/signup")) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
        target?.closest("input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=combobox], [role=textbox], [role=menu], [role=listbox]") ||
        document.querySelector('[role="dialog"], [role="alertdialog"]')) { sequence.current = 0; return; }
      const key = event.key.toLowerCase();
      const withinSequence = Date.now() - sequence.current < 1200;
      sequence.current = 0;
      if (withinSequence) {
        const route = ({ d: "/dashboard", t: "/templates", f: "/follow-ups", s: "/settings", l: "/startups" } as Record<string, string>)[key];
        if (route) { event.preventDefault(); router.push(route); return; }
      }
      if (key === "g") { sequence.current = Date.now(); return; }
      if (key === "n") { event.preventDefault(); router.push("/outreach/new"); }
      if (key === "?") { event.preventDefault(); setHelpOpen(true); }
      if (key === "/") {
        const input = Array.from(document.querySelectorAll<HTMLInputElement>('main input[type="search"], main input[placeholder*="Search"], main input[aria-label*="Search"]')).find(input => !input.disabled && input.getClientRects().length > 0);
        if (input) { event.preventDefault(); input.focus(); }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, pathname, router]);

  return <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent><DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle><DialogDescription>Press the keys in sequence to navigate. Manage shortcuts in Settings.</DialogDescription></DialogHeader><ShortcutList /></DialogContent></Dialog>;
}
