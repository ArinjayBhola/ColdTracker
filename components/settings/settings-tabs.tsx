"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/components/preferences-provider";

export function SettingsTabs({ tabs, initialTab }: { tabs: { id: string; label: string; content: ReactNode }[]; initialTab?: string }) {
  const [active, setActive] = useState(tabs.some(tab => tab.id === initialTab) ? initialTab! : tabs[0].id);
  const { ready, saving, error } = usePreferences();
  return <div className="min-w-0 space-y-6">
    <div role="tablist" aria-label="Settings sections" className="flex gap-7 overflow-x-auto border-b border-border">
      {tabs.map((tab, index) => <button key={tab.id} id={`settings-tab-${tab.id}`} type="button" role="tab" aria-selected={active === tab.id} aria-controls={`settings-panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        setActive(tabs[next].id);
        document.getElementById(`settings-tab-${tabs[next].id}`)?.focus();
      }} onClick={() => setActive(tab.id)} className={cn("relative shrink-0 whitespace-nowrap pb-4 text-sm transition-colors", active === tab.id ? "text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary" : "text-muted-foreground hover:text-foreground")}>{tab.label}</button>)}
    </div>
    <p role="status" className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>{error ? "Preferences could not sync. Check Account sync in Data and retry." : saving ? "Saving preferences..." : ready ? "Preferences synced to your account." : "Loading account preferences..."}</p>
    {tabs.map(tab => <section key={tab.id} id={`settings-panel-${tab.id}`} role="tabpanel" aria-labelledby={`settings-tab-${tab.id}`} hidden={active !== tab.id} tabIndex={0} className="min-w-0 space-y-6 outline-none">{active === tab.id && tab.content}</section>)}
  </div>;
}
