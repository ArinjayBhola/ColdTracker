import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const styles = {
    DRAFT: "bg-muted/80 text-muted-foreground border-muted-foreground/20",
    SENT: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40",
    REPLIED: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/40",
    INTERVIEW: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40",
    OFFER: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40 shadow-sm shadow-emerald-500/10",
    REJECTED: "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40",
    CLOSED: "bg-slate-100/80 text-slate-600 border-slate-300/50 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50",
    GHOSTED: "bg-stone-100/80 text-stone-600 border-stone-300/50 dark:bg-stone-800/50 dark:text-stone-400 dark:border-stone-700/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm uppercase tracking-wider transition-all duration-200 hover:scale-105",
        styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"
      )}
    >
      {status}
    </span>
  );
}
