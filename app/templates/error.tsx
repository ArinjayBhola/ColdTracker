"use client";

import { Button } from "@/components/ui/button";

export default function TemplatesError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl space-y-4 p-8">
    <h1 className="text-2xl font-semibold">Templates could not be loaded</h1>
    <p className="text-muted-foreground">Please try again in a moment.</p>
    <Button onClick={reset}>Try again</Button>
  </main>;
}
