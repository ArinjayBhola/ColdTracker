"use client";

import { useQuery } from "@tanstack/react-query";
import { getSentEmailsForOutreach } from "@/actions/email";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiMail, FiEye, FiMousePointer } from "react-icons/fi";
import { format } from "date-fns";

type SentEmailsCardProps = {
  outreachId: string;
};

export function SentEmailsCard({ outreachId }: SentEmailsCardProps) {
  const { data: emails = [] } = useQuery({
    queryKey: ["sent-emails", outreachId],
    queryFn: () => getSentEmailsForOutreach(outreachId),
    staleTime: 30 * 1000,
  });

  if (emails.length === 0) return null;

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
          <FiMail className="w-5 h-5 text-primary" />
          Sent Emails
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {emails.map((email) => (
          <div
            key={email.id}
            className="rounded-lg border border-border/50 p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold truncate max-w-[250px]">{email.subject}</p>
                <p className="text-xs text-muted-foreground">To: {email.to}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(email.sentAt), "MMM d, h:mm a")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span
                className={`flex items-center gap-1 ${
                  email.openedAt ? "text-success font-medium" : "text-muted-foreground"
                }`}>
                <FiEye className="w-3 h-3" />
                {email.openedAt ? "Opened" : "Not opened"}
              </span>
              <span
                className={`flex items-center gap-1 ${
                  email.clickedAt ? "text-success font-medium" : "text-muted-foreground"
                }`}>
                <FiMousePointer className="w-3 h-3" />
                {email.clickedAt ? "Clicked" : "No clicks"}
              </span>
              <span className="text-muted-foreground capitalize">via {email.provider}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
