"use client";

import { signUpAction, googleSignIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useActionState } from "react";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/5">
      <div className="w-full max-w-sm space-y-8 rounded-xl border bg-card p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.02)]">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to create your account
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md font-medium">
              {state.error}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Name</label>
                <Input
                name="name"
                placeholder="John Doe"
                required
                minLength={2}
                type="text"
                className="bg-muted/5 focus:bg-background transition-colors"
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Email</label>
                <Input
                name="email"
                placeholder="name@example.com"
                required
                type="email"
                className="bg-muted/5 focus:bg-background transition-colors"
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Password</label>
                <Input
                name="password"
                placeholder="Password"
                required
                minLength={6}
                type="password"
                className="bg-muted/5 focus:bg-background transition-colors"
                />
            </div>
          </div>
          <Button className="w-full gap-2" type="submit" disabled={isPending}>
            {isPending ? "Signing up..." : "Sign Up"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <form action={googleSignIn}>
          <Button variant="outline" className="w-full gap-2" type="submit">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12.0003 20.45c-4.6667 0-8.45-3.7833-8.45-8.45 0-4.6667 3.7833-8.45 8.45-8.45 2.2833 0 4.2 0.8333 5.6667 2.2l-3.3 3.1c-0.6334-0.6167-1.5-0.9667-2.3667-0.9667-2.7333 0-4.95 2.2167-4.95 4.95 0 2.7333 2.2167 4.95 4.95 4.95 3.0167 0 4.15-2.1667 4.3167-3.2833h-4.3167v-3.3h7.8833c0.1 0.6 0.1667 1.2333 0.1667 1.9333 0 4.9167-3.2833 8.4167-8.05 8.4167z"></path></svg>
            Google
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/signin" className="underline underline-offset-4 text-foreground hover:text-primary">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
