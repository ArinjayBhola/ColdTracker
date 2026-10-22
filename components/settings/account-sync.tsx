"use client";
import { usePreferences } from "@/components/preferences-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function AccountSync() {
  const { ready, saving, error, reload } = usePreferences();
  return <Card><CardHeader><CardTitle>Account sync</CardTitle><CardDescription>Appearance, navigation, stats, table preferences, and follow-up rules follow your account across devices. Keyboard shortcuts already sync separately.</CardDescription></CardHeader><CardContent className="space-y-3"><p role="status" className="text-sm">{error ? "Could not sync. Your latest changes may not be saved. Retry when connected." : saving ? "Saving preferences..." : ready ? "Preferences synced to your account." : "Loading account preferences..."}</p><p className="text-xs text-muted-foreground">Other devices refresh on focus or within a minute. Your current device determines your timezone.</p><Button variant="outline" onClick={reload} disabled={saving}>Sync now</Button></CardContent></Card>;
}
