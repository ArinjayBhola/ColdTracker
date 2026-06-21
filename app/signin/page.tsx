"use client";

import { credentialsSignIn, googleSignIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import Link from "next/link";
import { useActionState, useTransition } from "react";
import { FiMail, FiLock, FiArrowLeft } from "react-icons/fi";

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(credentialsSignIn, null);
  const [isGooglePending, startGoogleTransition] = useTransition();

  const isAnyPending = isPending || isGooglePending;

  const handleGoogleSignIn = () => {
    startGoogleTransition(async () => {
      await googleSignIn();
    });
  };

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-[0.85fr_1.15fr]">
      <aside className="hidden border-r border-border bg-sidebar p-10 md:flex md:flex-col md:justify-between">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold">
          <span className="font-display flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">CT</span>
          ColdTrack
        </Link>
        <div className="max-w-sm">
          <p className="eyebrow mb-4">Workspace access</p>
          <h2 className="font-display text-4xl font-semibold leading-[1.15] tracking-tight">Pick up your outreach queue where you left off.</h2>
          <p className="mt-5 text-[0.9375rem] leading-7 text-muted-foreground">Review active leads, send follow-ups, and keep your pipeline current.</p>
        </div>
        <p className="text-xs text-muted-foreground">Outreach CRM · Built for the job hunt</p>
      </aside>

      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Button variant="ghost" asChild className="px-0 text-muted-foreground">
            <Link href="/"><FiArrowLeft /> Back to home</Link>
          </Button>
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-soft md:p-8 space-y-6">
          <form action={formAction} className="space-y-5">
            {state?.error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {state.error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1 flex items-center gap-2">
                  <FiMail className="w-4 h-4 text-muted-foreground" />
                  Email address
                </label>
                <Input
                  name="email"
                  placeholder="name@example.com"
                  required
                  type="email"
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <FiLock className="w-4 h-4 text-muted-foreground" />
                    Password
                  </label>
                </div>
                <PasswordInput
                  name="password"
                  placeholder="Password"
                  required
                  className="h-11"
                />
              </div>
            </div>
            
            <Button className="w-full h-11 text-base" type="submit" disabled={isAnyPending}>
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-card px-3 text-muted-foreground font-bold">
                Or continue with
              </span>
            </div>
          </div>

          <form action={handleGoogleSignIn}>
            <Button 
                variant="outline" 
                className="w-full h-11 gap-3" 
                type="submit"
                disabled={isAnyPending}
            >
              {isGooglePending ? (
                "Connecting..."
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
                    <path d="M12.0003 20.45c-4.6667 0-8.45-3.7833-8.45-8.45 0-4.6667 3.7833-8.45 8.45-8.45 2.2833 0 4.2 0.8333 5.6667 2.2l-3.3 3.1c-0.6334-0.6167-1.5-0.9667-2.3667-0.9667-2.7333 0-4.95 2.2167-4.95 4.95 0 2.7333 2.2167 4.95 4.95 4.95 3.0167 0 4.15-2.1667 4.3167-3.2833h-4.3167v-3.3h7.8833c0.1 0.6 0.1667 1.2333 0.1667 1.9333 0 4.9167-3.2833 8.4167-8.05 8.4167z"></path>
                  </svg>
                  Google
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground pt-2">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground leading-relaxed px-8">
          By signing in, you agree to our <Link href="#" className="underline decoration-border/60 hover:text-foreground">Terms of Service</Link> and <Link href="#" className="underline decoration-border/60 hover:text-foreground">Privacy Policy</Link>
        </p>
      </div>
      </main>
    </div>
  );
}
