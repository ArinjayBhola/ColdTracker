"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { getCalendarSyncStatus, toggleCalendarSync, syncAllFollowUpsToCalendar } from "@/actions/calendar";
import { signIn } from "next-auth/react";
import { FiCalendar, FiCheck, FiRefreshCw, FiAlertCircle } from "react-icons/fi";

export function CalendarSettings() {
  const [status, setStatus] = useState<{
    enabled: boolean;
    hasGoogle: boolean;
  } | null>(null);
  const [syncing, startSyncing] = useTransition();
  const [syncResult, setSyncResult] = useState<{
    synced?: number;
    errors?: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    getCalendarSyncStatus().then(setStatus);
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setStatus((prev) => (prev ? { ...prev, enabled } : null));
    await toggleCalendarSync(enabled);
  };

  const handleSyncAll = () => {
    setSyncResult(null);
    startSyncing(async () => {
      const result = await syncAllFollowUpsToCalendar();
      setSyncResult(result);
    });
  };

  const handleConnectGoogle = () => {
    signIn("google", { callbackUrl: "/settings" });
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-extrabold">
          <FiCalendar className="text-primary" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Sync follow-up dates to your Google Calendar so you never miss a follow-up.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.hasGoogle ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <FiAlertCircle className="text-amber-500 shrink-0" />
              <span className="text-sm">
                Connect your Google account first to enable calendar sync.
              </span>
            </div>
            <Button variant="outline" onClick={handleConnectGoogle}>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Connect Google Account
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
              <div className="flex items-center gap-3">
                <FiCalendar className="text-primary" />
                <div>
                  <p className="text-sm font-semibold">Auto-sync follow-ups</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically create calendar events for new follow-up dates
                  </p>
                </div>
              </div>
              <Switch
                checked={status?.enabled ?? false}
                onCheckedChange={handleToggle}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleSyncAll}
                disabled={syncing}
                className="gap-2"
              >
                <FiRefreshCw className={syncing ? "animate-spin" : ""} size={14} />
                {syncing ? "Syncing..." : "Sync All Follow-ups Now"}
              </Button>

              {syncResult && !syncResult.error && (
                <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <FiCheck size={14} />
                  {syncResult.synced} synced
                  {(syncResult.errors ?? 0) > 0 && (
                    <span className="text-amber-500">
                      , {syncResult.errors} failed
                    </span>
                  )}
                </div>
              )}

              {syncResult?.error && (
                <span className="text-sm text-destructive">{syncResult.error}</span>
              )}
            </div>

            {status?.enabled && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                <FiCheck className="text-success" />
                <span className="text-sm font-medium">Calendar sync is active</span>
                <Badge variant="outline" className="ml-auto text-xs">Active</Badge>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
