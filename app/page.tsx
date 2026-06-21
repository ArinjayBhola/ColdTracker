"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowRight, FiCheckCircle, FiClock, FiGrid, FiMenu, FiSend, FiX } from "react-icons/fi";
import { useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";

const rows = [
  { company: "Northstar Labs", contact: "Maya Chen", status: "Replied", due: "Today" },
  { company: "VectorOps", contact: "Arun Patel", status: "Follow-up", due: "Jun 24" },
  { company: "Clearbit Systems", contact: "Elena Ruiz", status: "Sent", due: "Jun 26" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-md border bg-card">
              <Image src="/logo.png" alt="ColdTrack Logo" fill className="object-contain p-1 dark:invert" priority />
            </span>
            <span className="text-lg font-bold">ColdTrack</span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" asChild>
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>

          <MobileMenu />
        </div>
      </nav>

      <main>
        <section className="border-b">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[0.9fr_1.1fr] md:px-6 md:py-20">
            <div className="flex flex-col justify-center">
              <p className="eyebrow mb-5 w-fit rounded-full border border-border bg-card px-3 py-1.5 shadow-soft">
                Outreach pipeline
              </p>
              <h1 className="font-display max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
                ColdTrack
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
                A focused workspace for tracking cold outreach, follow-ups, replies, interviews, and active leads without spreadsheet drift.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild className="h-11 px-5">
                  <Link href="/signup">
                    Start tracking <FiArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-11 px-5">
                  <Link href="/signin">Open dashboard</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-raise">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <p className="font-display text-base font-semibold">Today&apos;s queue</p>
                  <p className="text-xs text-muted-foreground">3 active follow-ups</p>
                </div>
                <Button size="sm">
                  <FiSend /> Add outreach
                </Button>
              </div>
              <div className="divide-y">
                {rows.map((row) => (
                  <div key={row.company} className="grid grid-cols-[1fr_auto] gap-4 p-4 md:grid-cols-[1.2fr_1fr_auto_auto] md:items-center">
                    <div>
                      <p className="font-semibold">{row.company}</p>
                      <p className="text-sm text-muted-foreground">{row.contact}</p>
                    </div>
                    <span className="hidden text-sm text-muted-foreground md:block">LinkedIn</span>
                    <span className="w-fit rounded-md border bg-muted px-2.5 py-1 text-xs font-semibold">{row.status}</span>
                    <span className="text-sm font-semibold">{row.due}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 border-t text-center">
                <Metric value="42" label="sent" />
                <Metric value="11" label="replies" />
                <Metric value="5" label="interviews" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-10 md:grid-cols-3 md:px-6">
          <Feature icon={<FiGrid />} title="Single pipeline" text="See every company, contact, status, and next step in one operational view." />
          <Feature icon={<FiClock />} title="Follow-up discipline" text="Keep daily and weekly outreach targets visible beside your actual activity." />
          <Feature icon={<FiCheckCircle />} title="Decision-ready stats" text="Measure replies, interviews, offers, and stale leads without manual cleanup." />
        </section>
      </main>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-4 border-r border-border last:border-r-0">
      <p className="num-display text-3xl font-semibold">{value}</p>
      <p className="eyebrow mt-1">{label}</p>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft transition-all hover-lift">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/40 text-primary">{icon}</div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="rounded-md border p-2 text-foreground">
        {isOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-16 flex w-full flex-col gap-3 border-b bg-background p-4 shadow-sm">
          <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button asChild onClick={() => setIsOpen(false)}>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
