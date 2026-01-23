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
    <div className="flex h-screen w-64 flex-col border-r bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 px-4 py-8">
      <div className="mb-8 flex items-center justify-between px-4">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          ColdTrack
        </h1>
        <ThemeToggle />
      </div>
      
      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group",
                isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2">
        <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 pl-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => signOut({ callbackUrl: "/signin" })}
        >
          <FiLogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
