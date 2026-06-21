"use client";

import { signUpAction, googleSignIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import Link from "next/link";
import { useActionState, useTransition } from "react";
import { FiUser, FiMail, FiLock, FiArrowLeft } from "react-icons/fi";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);
  const [isGooglePending, startGoogleTransition] = useTransition();

  const isAnyPending = isPending || isGooglePending;

  const handleGoogleSignIn = async () => {
    startGoogleTransition(async () => {
      await googleSignIn();
    });
  };

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-[0.85fr_1.15fr]">
      <aside className="hidden border-r bg-sidebar p-8 md:flex md:flex-col md:justify-between">
        <Link href="/" className="flex items-center gap-3 text-sm font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">CT</span>
          ColdTrack
        </Link>
        <div className="max-w-sm">
          <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">New workspace</p>
          <h2 className="text-3xl font-extrabold leading-tight">Set up a clean pipeline for every outreach motion.</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">Track prospects, schedule follow-ups, and measure conversion from the first message.</p>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Button variant="ghost" asChild className="px-0 text-muted-foreground">
            <Link href="/"><FiArrowLeft /> Back to home</Link>
          </Button>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Create an account
            </h1>
            <p className="text-muted-foreground">
              Join ColdTrack and start tracking your success
            </p>
          </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm md:p-8 space-y-6">
          <form action={formAction} className="space-y-5">
            {state?.error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {state.error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1 flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-muted-foreground" />
                  Full name
                </label>
                <Input
                  name="name"
                  placeholder="Name"
                  required
                  minLength={2}
                  type="text"
                  className="h-11"
                />
              </div>

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
                <label className="text-sm font-medium text-foreground ml-1 flex items-center gap-2">
                  <FiLock className="w-4 h-4 text-muted-foreground" />
                  Password
                </label>
                <PasswordInput
                  name="password"
                  placeholder="Password"
                  required
                  minLength={6}
                  className="h-11"
                />
                <p className="text-[11px] text-muted-foreground ml-1 leading-relaxed">
                  Minimum 6 characters with letters and numbers
                </p>
              </div>
            </div>
            
            <Button className="w-full h-11 text-base" type="submit" disabled={isAnyPending}>
              {isPending ? "Creating account..." : "Create account"}
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
            Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground leading-relaxed px-8">
          By creating an account, you agree to our <Link href="#" className="underline decoration-border/60 hover:text-foreground">Terms of Service</Link> and <Link href="#" className="underline decoration-border/60 hover:text-foreground">Privacy Policy</Link>
        </p>
      </div>
      </main>
    </div>
  );
}
