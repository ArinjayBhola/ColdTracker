"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiLink, FiCheckCircle } from "react-icons/fi";

export function AccountConnections({ googleConnected }: { googleConnected: boolean }) {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectGoogle = async () => {
    setIsConnecting(true);
    await signIn("google", { callbackUrl: "/settings" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>Use Google and email/password with the same account email.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted font-bold">G</div>
            <div>
              <p className="font-semibold">Google</p>
              <p className="text-xs text-muted-foreground">{googleConnected ? "Connected" : "Not connected"}</p>
            </div>
          </div>
          {googleConnected ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <FiCheckCircle /> Connected
            </span>
          ) : (
            <Button type="button" variant="outline" onClick={connectGoogle} disabled={isConnecting} className="gap-2">
              <FiLink /> {isConnecting ? "Connecting..." : "Connect Google"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
