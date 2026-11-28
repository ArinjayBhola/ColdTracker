import type { Metadata } from "next";
import Link from "next/link";
import { FiBookmark, FiMap, FiSend } from "react-icons/fi";
import { Sidebar } from "@/components/sidebar";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Home | ColdTrack" };

const apps = [
  { name: "Cold-track", href: "/workspace", host: "cold-track.arinjay.dev", description: "Pick up your outreach, track applications, and stay on top of follow-ups.", icon: FiSend, current: true },
  { name: "Mountain", href: "http://mountain.arinjay.dev/", host: "mountain.arinjay.dev", description: "Explore saved places, plan expeditions, and revisit your mountain discoveries.", icon: FiMap, current: false },
  { name: "Vault", href: "https://vault.arinjay.dev/", host: "vault.arinjay.dev", description: "Find your saved links, videos, books, and articles in one place.", icon: FiBookmark, current: false },
];

export default function HomePage() {
  return (
    <div className="app-page">
      <Sidebar />
      <main className="app-main">
        <div className="app-container">
          <header>
            <p className="mb-1 text-xs text-muted-foreground">YOUR WORKSPACE</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Home</h1>
            <p className="mt-2 text-base text-muted-foreground">Your everyday tools, one click away.</p>
          </header>
          <nav aria-label="Personal apps" className="grid gap-5 lg:grid-cols-3">
            {apps.map((app) => (
              <Link key={app.name} href={app.href} prefetch={false} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                <Card className="flex h-full flex-col p-6 group-hover:border-primary/40 group-hover:shadow-md">
                  <div className="mb-7 flex items-center justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><app.icon aria-hidden="true" className="h-6 w-6" /></span>
                    {app.current && <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">This app</span>}
                  </div>
                  <h2 className="font-display text-xl font-semibold">{app.name}</h2>
                  <p className="mt-2 flex-1 text-base leading-relaxed text-muted-foreground">{app.description}</p>
                  <p className="mt-6 break-all text-sm text-muted-foreground">{app.host}</p>
                  <span className="mt-5 border-t border-border pt-4 text-sm font-medium text-primary">Open {app.name}</span>
                </Card>
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </div>
  );
}
