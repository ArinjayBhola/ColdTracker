import { Bot } from "lucide-react";

export function AutomationOutreachBadge() {
  return <span title="This outreach includes a cold email logged by your automation." className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
    <Bot aria-hidden="true" className="h-3 w-3 shrink-0" />Automated cold email
  </span>;
}
