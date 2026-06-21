import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/85",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-secondary/70",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/85",
        outline: "border-border text-foreground",
        // Custom status variants (soft tints + readable in dark)
        success: "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20",
        warning: "border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20",
        info: "border-blue-500/20 bg-blue-500/12 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
        neutral: "border-border bg-muted text-muted-foreground hover:bg-muted/70",
        purple: "border-purple-500/20 bg-purple-500/12 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
