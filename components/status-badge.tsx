import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const styles = {
    DRAFT: { wrapper: "bg-muted/50 text-muted-foreground border-muted-foreground/20", dot: "bg-muted-foreground" },
    SENT: { wrapper: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400", dot: "bg-blue-500" },
    REPLIED: { wrapper: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400", dot: "bg-purple-500" },
    INTERVIEW: { wrapper: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400", dot: "bg-amber-500" },
    OFFER: { wrapper: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 shadow-sm shadow-emerald-500/10", dot: "bg-emerald-500" },
    REJECTED: { wrapper: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400", dot: "bg-rose-500" },
    CLOSED: { wrapper: "bg-slate-100/50 text-slate-600 border-slate-300/30 dark:bg-slate-800/30 dark:text-slate-400", dot: "bg-slate-500" },
    GHOSTED: { wrapper: "bg-stone-100/50 text-stone-600 border-stone-300/30 dark:bg-stone-800/30 dark:text-stone-400", dot: "bg-stone-500" },
  };

  const style = styles[status as keyof typeof styles] || { wrapper: "bg-gray-100 text-gray-800", dot: "bg-gray-500" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm tracking-wider transition-all duration-200 hover:scale-105",
        style.wrapper
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dot)} />
      <span className="capitalize">{status.toLowerCase()}</span>
    </span>
  );
}
