"use client"

import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, CheckCircle2, Eye, Info } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, href, onNavigate, ...props }) {
        const variant = props.variant || "default"
        
        return (
          <Toast key={id} {...props} className={cn(props.className, href && "rounded-2xl border-primary/20 bg-card p-0 pr-9")}>
            {href ? (
              <Link href={href} onClick={() => { onNavigate?.(); dismiss(id); }} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" aria-label={typeof title === "string" ? `${title}. Open outreach` : "Open outreach"}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Eye className="h-5 w-5" /></span>
                <div className="min-w-0 space-y-1">
                  {title && <ToastTitle className="break-words [overflow-wrap:anywhere]">{title}</ToastTitle>}
                  {description && <ToastDescription>{description}</ToastDescription>}
                </div>
              </Link>
            ) : (
            <div className="flex gap-3 items-start">
              <div className="mt-0.5">
                {variant === "destructive" && <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                {variant === "success" && <CheckCircle2 className="h-5 w-5 text-success-foreground" />}
                {variant === "warning" && <AlertCircle className="h-5 w-5 text-warning-foreground" />}
                {variant === "default" && <Info className="h-5 w-5 text-primary" />}
              </div>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            )}
            {action}
            <ToastClose aria-label="Dismiss notification" className={href ? "opacity-100" : undefined} />
          </Toast>
        )
      })}
      <ToastViewport className={toasts.some(item => item.href) ? "bottom-0 right-0 top-auto flex-col pb-[max(1rem,env(safe-area-inset-bottom))]" : undefined} />
    </ToastProvider>
  )
}
