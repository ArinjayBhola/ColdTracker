"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEmailAccountStatus } from "@/actions/email";
import { signIn } from "next-auth/react";
import { FiMail, FiCheck } from "react-icons/fi";

export function EmailAccountSettings() {
  const [status, setStatus] = useState<{
    connected: boolean;
    provider: string | null;
  } | null>(null);

  useEffect(() => {
    getEmailAccountStatus().then(setStatus);
  }, []);

  const handleConnectGoogle = () => {
    signIn("google", { callbackUrl: "/settings" });
  };

  const handleConnectMicrosoft = () => {
    signIn("microsoft-entra-id", { callbackUrl: "/settings" });
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-extrabold">
          <FiMail className="text-primary" />
          Email Integration
        </CardTitle>
        <CardDescription>
          Connect your email account to send emails directly from ColdTrack with open and click tracking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
            <FiCheck className="text-success" />
            <span className="text-sm font-medium">
              Connected via{" "}
              {status.provider === "gmail" ? "Gmail" : "Outlook"}
            </span>
            <Badge variant="outline" className="ml-auto text-xs">
              Active
            </Badge>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant={
              status?.provider === "gmail" ? "secondary" : "outline"
            }
            onClick={handleConnectGoogle}
            className="flex-1"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {status?.provider === "gmail" ? "Gmail Connected" : "Connect Gmail"}
          </Button>

          <Button
            variant={
              status?.provider === "outlook" ? "secondary" : "outline"
            }
            onClick={handleConnectMicrosoft}
            className="flex-1"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M0 0h11.5v11.5H0z" />
              <path fill="currentColor" d="M12.5 0H24v11.5H12.5z" />
              <path fill="currentColor" d="M0 12.5h11.5V24H0z" />
              <path fill="currentColor" d="M12.5 12.5H24V24H12.5z" />
            </svg>
            {status?.provider === "outlook"
              ? "Outlook Connected"
              : "Connect Outlook"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
