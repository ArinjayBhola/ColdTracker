"use client";

import { signUpAction, googleSignIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useActionState } from "react";
import { FiUser, FiMail, FiLock } from "react-icons/fi";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -right-48 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg shadow-primary/20 mb-4">
            <span className="text-2xl font-bold text-primary-foreground">CT</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Create an account
          </h1>
          <p className="text-muted-foreground text-lg">
            Start tracking your job search journey
          </p>
        </div>

        {/* Sign Up Card */}
        <div className="glass-strong rounded-3xl p-8 shadow-premium space-y-6 animate-slide-in">
          <form action={formAction} className="space-y-5">
            {state?.error && (
              <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-xl font-medium border border-destructive/20 animate-fade-in">
                {state.error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground ml-1 flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-muted-foreground" />
                  Name
                </label>
                <Input
                  name="name"
                  placeholder="John Doe"
                  required
                  minLength={2}
                  type="text"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground ml-1 flex items-center gap-2">
                  <FiMail className="w-4 h-4 text-muted-foreground" />
                  Email
                </label>
                <Input
                  name="email"
                  placeholder="name@example.com"
                  required
                  type="email"
                  className="h-12"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground ml-1 flex items-center gap-2">
                  <FiLock className="w-4 h-4 text-muted-foreground" />
                  Password
                </label>
                <Input
                  name="password"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  type="password"
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground ml-1">
                  Use at least 6 characters with a mix of letters and numbers
                </p>
              </div>
            </div>
            
            <Button className="w-full h-12 text-base" type="submit" disabled={isPending}>
              {isPending ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-card px-3 text-muted-foreground font-semibold">
                Or continue with
              </span>
            </div>
          </div>

          <form action={googleSignIn}>
            <Button variant="outline" className="w-full h-12 gap-3" type="submit">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12.0003 20.45c-4.6667 0-8.45-3.7833-8.45-8.45 0-4.6667 3.7833-8.45 8.45-8.45 2.2833 0 4.2 0.8333 5.6667 2.2l-3.3 3.1c-0.6334-0.6167-1.5-0.9667-2.3667-0.9667-2.7333 0-4.95 2.2167-4.95 4.95 0 2.7333 2.2167 4.95 4.95 4.95 3.0167 0 4.15-2.1667 4.3167-3.2833h-4.3167v-3.3h7.8833c0.1 0.6 0.1667 1.2333 0.1667 1.9333 0 4.9167-3.2833 8.4167-8.05 8.4167z"></path>
              </svg>
              Continue with Google
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground pt-2">
            Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline">
              Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
