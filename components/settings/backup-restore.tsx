"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { exportAccountBackup, restoreAccountBackup } from "@/actions/backup";
import { MAX_BACKUP_BYTES, readBackup, type AccountBackup } from "@/lib/backup";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExportExcel } from "@/components/export-excel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FiDatabase, FiDownload } from "react-icons/fi";
export function BackupRestore() {
  const [backup, setBackup] = useState<AccountBackup | null>(null);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [exportFormat, setExportFormat] = useState("json");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const client = useQueryClient();
  const download = async () => {
    setBusy(true); setMessage("");
    try {
      const result = await exportAccountBackup();
      if (!result.success) throw new Error(result.error);
      const data = result.data;
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
  return <Card><CardHeader><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><FiDatabase size={20} /></div><div><CardTitle>Data Management</CardTitle><CardDescription>Export your data or restore a JSON backup.</CardDescription></div></div></CardHeader><CardContent className="space-y-5">
    <div className="space-y-4 rounded-2xl border border-border/50 bg-muted/30 p-4">
      <div className="space-y-1"><h3 className="font-semibold">Export data</h3><p id="export-description" className="text-sm text-muted-foreground">{exportFormat === "json" ? "Restorable backup of outreach, templates, leads, startup tracking, and settings. Passwords and connected-account tokens are excluded." : "Outreach history in a spreadsheet for viewing and analysis. Excel files cannot be restored here."}</p></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={exportFormat} onValueChange={value => { setExportFormat(value); setMessage(""); }} disabled={busy}><SelectTrigger aria-label="Export format" aria-describedby="export-description" className="w-full sm:w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="json">JSON backup (.json)</SelectItem><SelectItem value="excel">Excel spreadsheet (.xlsx)</SelectItem></SelectContent></Select>
        {exportFormat === "json" ? <Button onClick={download} disabled={busy}><FiDownload />{busy ? "Preparing..." : "Download export"}</Button> : <ExportExcel fileName="cold-track-full-export" label="Download export" disabled={busy} />}
      </div>
    </div>
    <div className="space-y-2 border-t pt-5"><h3 className="font-semibold">Restore backup</h3><p className="text-sm text-muted-foreground">Choose a ColdTrack JSON backup to review before restoring.</p><Button variant="outline" onClick={() => input.current?.click()} disabled={busy}>Choose backup to restore</Button></div>
    <input ref={input} type="file" accept="application/json,.json" aria-label="Choose a ColdTrack backup" className="sr-only" disabled={busy} onChange={async event => {
      const file = event.target.files?.[0]; setBackup(null); setMessage(""); if (!file) return;
      try { if (file.size > MAX_BACKUP_BYTES) throw new Error("Choose a backup smaller than 5 MB."); setBackup(readBackup(JSON.parse(await file.text()))); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Invalid backup file."); }
    }} />
    {backup && <div className="space-y-4 rounded-xl border p-4"><h3 className="text-lg">Review restore</h3><p className="text-sm">Backup from {new Date(backup.exportedAt).toLocaleString()}: {backup.outreach.length} outreach records, {backup.templates.length} templates, {backup.extensionLeads.length} extension leads, and {backup.startupTracking.length} startup tracking entries.</p><p className="text-sm text-muted-foreground">Restore merges records into this account and updates matching records from this backup. Other existing records stay in place. The restore is applied as one transaction.</p><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={includeSettings} disabled={busy} onChange={event => setIncludeSettings(event.target.checked)} />Also restore preferences, shortcuts, notification settings, and goals</label><div className="flex flex-wrap gap-2"><Button onClick={restore} disabled={busy}>{busy ? "Restoring..." : "Confirm restore"}</Button><Button variant="outline" disabled={busy} onClick={() => { setBackup(null); if (input.current) input.current.value = ""; }}>Cancel</Button></div></div>}
    <p role="status" className="text-sm text-muted-foreground">{busy && !backup ? "Preparing backup..." : message}</p><p className="text-xs text-muted-foreground">Up to 5 MB and 5,000 records per data type. Daily activity is recalculated from your outreach. Startup tracking requires the referenced catalog startups to still exist.</p>
  </CardContent></Card>;
}
