"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FiLayout, FiPlusCircle, FiBarChart2, FiLogOut, FiCheckSquare } from "react-icons/fi";
import { Button } from "./ui/button";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: FiLayout },
  { href: "/follow-ups", label: "Follow-ups", icon: FiCheckSquare },
  { href: "/outreach/new", label: "Add Outreach", icon: FiPlusCircle },
  { href: "/stats", label: "Stats", icon: FiBarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-72 flex-col border-r border-border/50 bg-card/50 backdrop-blur-xl px-5 py-8 shadow-premium">
      {/* Logo & Theme Toggle */}
      <div className="mb-10 flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <span className="text-lg font-bold text-primary-foreground">CT</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">
              ColdTrack
            </h1>
            <p className="text-xs text-muted-foreground">Outreach Manager</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 group relative overflow-hidden",
                isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform duration-200 relative z-10",
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground group-hover:scale-110"
              )} />
              <span className="relative z-10">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign Out Button */}
      <div className="mt-auto pt-6 border-t border-border/50">
        <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 px-4 h-12 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
            onClick={() => signOut({ callbackUrl: "/signin" })}
        >
          <FiLogOut className="h-5 w-5" />
          <span className="font-semibold">Sign Out</span>
        </Button>
      </div>
    </div>
  );
}
