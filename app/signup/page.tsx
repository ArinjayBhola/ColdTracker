"use client";

import { signUpAction, googleSignIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import Link from "next/link";
import { useActionState, useTransition } from "react";
import { FiUser, FiMail, FiLock } from "react-icons/fi";

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -right-48 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 -left-48 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 mb-2">
            <span className="text-xl font-bold text-primary-foreground italic tracking-tighter">CT</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Create an account
          </h1>
          <p className="text-muted-foreground">
            Join ColdTrack and start tracking your success
          </p>
        </div>

        {/* Sign Up Card */}
        <div className="glass-strong rounded-3xl p-8 shadow-premium space-y-6 animate-slide-in border border-border/40">
          <form action={formAction} className="space-y-5">
            {state?.error && (
              <div className="text-sm text-destructive bg-destructive/5 p-4 rounded-xl font-medium border border-destructive/10 animate-fade-in">
                {state.error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1 flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-muted-foreground/70" />
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
                  <FiMail className="w-4 h-4 text-muted-foreground/70" />
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
                  <FiLock className="w-4 h-4 text-muted-foreground/70" />
                  Password
                </label>
                <PasswordInput
                  name="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="h-11"
                />
                <p className="text-[11px] text-muted-foreground/70 ml-1 leading-relaxed">
                  Minimum 6 characters with letters and numbers
                </p>
              </div>
            </div>
            
            <Button className="w-full h-11 text-base font-medium shadow-sm hover:shadow-md transition-all active:scale-[0.98]" type="submit" disabled={isAnyPending}>
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
                className="w-full h-11 gap-3 font-medium border-border/60 hover:bg-muted/50 hover:border-border transition-all active:scale-[0.98]" 
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
            <Link href="/signin" className="font-semibold text-primary hover:text-primary/80 transition-all underline-offset-4 hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60 leading-relaxed px-8">
          By creating an account, you agree to our <Link href="#" className="underline decoration-border/60 hover:text-foreground">Terms of Service</Link> and <Link href="#" className="underline decoration-border/60 hover:text-foreground">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
