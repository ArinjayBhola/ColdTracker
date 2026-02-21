"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const variant = props.variant || "default"
        
        return (
          <Toast key={id} {...props}>
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
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
