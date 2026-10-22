"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { exportAccountBackup, restoreAccountBackup } from "@/actions/backup";
import { MAX_BACKUP_BYTES, readBackup, type AccountBackup } from "@/lib/backup";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function BackupRestore() {
  const [backup, setBackup] = useState<AccountBackup | null>(null);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const client = useQueryClient();
  const download = async () => {
    setBusy(true); setMessage("");
    try {
      const data = await exportAccountBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `coldtrack-backup-${new Date().toLocaleDateString("en-CA")}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Backup downloaded.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Backup failed. Please try again."); }
    finally { setBusy(false); }
  };
  const restore = async () => {
    if (!backup) return;
    setBusy(true); setMessage("");
    try {
      const result = await restoreAccountBackup(backup, includeSettings);
      setBackup(null); if (input.current) input.current.value = "";
      await client.invalidateQueries(); router.refresh();
      setMessage(`Restore complete.${result.skippedStartupTracking ? ` ${result.skippedStartupTracking} startup tracking entries were skipped because their catalog startups no longer exist.` : ""}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Restore failed; no changes were applied."); }
    finally { setBusy(false); }
  };
  return <Card><CardHeader><CardTitle>Backup and restore</CardTitle><CardDescription>Download a restorable JSON backup of your outreach, templates, extension leads, startup tracking, and settings. Passwords and connected-account tokens are excluded.</CardDescription></CardHeader><CardContent className="space-y-5">
    <div className="flex flex-wrap gap-3"><Button onClick={download} disabled={busy}>Download backup</Button><Button variant="outline" onClick={() => input.current?.click()} disabled={busy}>Choose backup to restore</Button></div>
    <input ref={input} type="file" accept="application/json,.json" aria-label="Choose a ColdTrack backup" className="sr-only" disabled={busy} onChange={async event => {
      const file = event.target.files?.[0]; setBackup(null); setMessage(""); if (!file) return;
      try { if (file.size > MAX_BACKUP_BYTES) throw new Error("Choose a backup smaller than 5 MB."); setBackup(readBackup(JSON.parse(await file.text()))); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Invalid backup file."); }
    }} />
    {backup && <div className="space-y-4 rounded-xl border p-4"><h3 className="text-lg">Review restore</h3><p className="text-sm">Backup from {new Date(backup.exportedAt).toLocaleString()}: {backup.outreach.length} outreach records, {backup.templates.length} templates, {backup.extensionLeads.length} extension leads, and {backup.startupTracking.length} startup tracking entries.</p><p className="text-sm text-muted-foreground">Restore merges records into this account and updates matching records from this backup. Other existing records stay in place. The restore is applied as one transaction.</p><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={includeSettings} disabled={busy} onChange={event => setIncludeSettings(event.target.checked)} />Also restore preferences, shortcuts, notification settings, and goals</label><div className="flex flex-wrap gap-2"><Button onClick={restore} disabled={busy}>{busy ? "Restoring..." : "Confirm restore"}</Button><Button variant="outline" disabled={busy} onClick={() => { setBackup(null); if (input.current) input.current.value = ""; }}>Cancel</Button></div></div>}
    <p role="status" className="text-sm text-muted-foreground">{busy && !backup ? "Preparing backup..." : message}</p><p className="text-xs text-muted-foreground">Up to 5 MB and 5,000 records per data type. Daily activity is recalculated from your outreach. Startup tracking requires the referenced catalog startups to still exist.</p>
  </CardContent></Card>;
}
