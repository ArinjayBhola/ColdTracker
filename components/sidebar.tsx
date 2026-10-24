"use client";

import { NAV_GROUPS } from "@/lib/preferences";
import { usePreferences } from "@/components/preferences-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FiLayout, FiPlusCircle, FiBarChart2, FiLogOut, FiCheckSquare, FiChevronLeft, FiChevronRight, FiSettings, FiLinkedin, FiTrendingUp, FiFileText } from "react-icons/fi";
import { Button } from "./ui/button";
import { signOutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import Image from "next/image";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: FiLayout },
  { href: "/startups", label: "Startups", icon: FiTrendingUp },
  { href: "/dashboard/extension-leads", label: "Leads", icon: FiLinkedin },
  { href: "/follow-ups", label: "Follow-ups", icon: FiCheckSquare },
  { href: "/templates", label: "Templates", icon: FiFileText },
  { href: "/outreach/new", label: "Add Outreach", icon: FiPlusCircle },
  { href: "/stats", label: "Stats", icon: FiBarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { preferences } = usePreferences();
  const orderedLinks = [...new Set([...preferences.navigation.order, ...links.map(link => link.href)])].map(href => links.find(link => link.href === href)!).filter(link => link && !preferences.navigation.hidden.includes(link.href as typeof preferences.navigation.hidden[number]));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null && window.innerWidth > 768) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollapsed(saved === "true");
    }
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileOpen(false);
  }, [pathname]);

  // Save state to localStorage whenever it changes
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label={isMobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isMobileOpen}
        className="md:hidden fixed top-4 left-4 z-[100] p-2.5 rounded-lg border border-border bg-card text-foreground shadow-soft"
      >
        {isMobileOpen ? <FiChevronLeft size={20} /> : <FiLayout size={20} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-foreground/30 z-[35] animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-[36] md:relative flex h-screen shrink-0 flex-col border-r border-border bg-sidebar py-6 transition-colors duration-300",
        isCollapsed && !isMobileOpen ? "w-20 px-3" : "max-w-[calc(100vw-2rem)] px-4",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )} style={isCollapsed && !isMobileOpen ? undefined : { width: "calc(152px + var(--app-text-size, 16px) * 4)" }}>
        {/* Collapse Toggle Button (Desktop) */}
        <button
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          className="hidden md:flex absolute -right-3 top-9 h-6 w-6 rounded-full border border-border bg-card items-center justify-center text-muted-foreground shadow-soft hover:text-foreground z-[37]"
        >
          {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        {/* Logo & Theme Toggle */}
        <div className={cn(
          "mb-8 flex w-0 min-w-full shrink-0 items-center justify-between gap-3 pb-6 px-1.5",
          isCollapsed && "flex-col gap-4"
        )}>
          <div className="flex min-w-0 items-center gap-2.5 group cursor-pointer">
            <Link href="/dashboard" className="relative h-8 w-8 flex items-center justify-center shrink-0 rounded-xl border border-border bg-card shadow-soft">
              <Image
                src="/logo.png"
                alt="ColdTrack Logo"
                fill
                className="object-contain p-1.5 dark:invert dark:brightness-200"
                priority
              />
            </Link>
            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0">
                <Link href="/dashboard">
                  <span className="block truncate font-display text-lg font-semibold text-foreground leading-none mb-1 tracking-tight">
                    ColdTrack
                  </span>
                </Link>
                <p className="eyebrow truncate">Outreach</p>
              </div>
            )}
          </div>
          {(!isCollapsed || isMobileOpen) && <ThemeToggle />}
        </div>

        <nav aria-label="Main navigation" className="min-h-0 flex-1 space-y-6 overflow-y-auto">
          {orderedLinks.some(link => link.href === "/outreach/new") && <Button variant="outline" asChild className={cn("mb-1 h-10 w-full bg-card shadow-none", isCollapsed && !isMobileOpen ? "px-0" : "justify-start gap-2.5 px-3")}>
            <Link href="/outreach/new" title="New outreach"><FiPlusCircle className="h-4 w-4 shrink-0" /><span className={isCollapsed && !isMobileOpen ? "sr-only" : ""}>New outreach</span></Link>
          </Button>}
          {NAV_GROUPS.map(group => {
            const groupLinks = orderedLinks.filter(link => group.paths.includes(link.href));
            if (!groupLinks.length) return null;
            return <div key={group.label} className="space-y-1">
              <p className={cn("mb-2 px-3 text-[10px] tracking-widest text-muted-foreground/70", isCollapsed && !isMobileOpen && "sr-only")}>{group.label.toUpperCase()}</p>
              {groupLinks.map(link => {
                const Icon = link.icon;
                const active = link.href === "/dashboard" ? pathname === "/dashboard" : pathname === link.href || pathname.startsWith(link.href + "/");
                const expanded = !isCollapsed || isMobileOpen;
                return <Link key={link.href} href={link.href} title={link.label} aria-current={active ? "page" : undefined} className={cn("flex items-center rounded-lg py-2.5 text-sm transition-colors", expanded ? "gap-3 px-3" : "justify-center", active ? "bg-primary/8 text-primary font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
                  <Icon className="h-[17px] w-[17px] shrink-0" /><span className={!expanded ? "sr-only" : ""}>{link.label}</span>
                </Link>;
              })}
            </div>;
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto shrink-0 pt-4 border-t border-border flex flex-col gap-0.5">
          <Link
            href="/settings"
            className={cn(
              "flex items-center rounded-lg transition-colors duration-200 group text-sm font-medium",
              pathname === "/settings"
                ? "bg-primary/10 text-foreground font-semibold"
                : "text-sidebar-foreground hover:text-foreground hover:bg-foreground/[0.04]",
              (isCollapsed && !isMobileOpen) ? "justify-center p-2.5" : "px-3.5 py-2.5 gap-3"
            )}
            title="Settings"
          >
            <FiSettings className={cn("h-[18px] w-[18px]", pathname === "/settings" ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            {(!isCollapsed || isMobileOpen) && <span>Settings</span>}
          </Link>

          <form action={signOutAction} className="w-full">
            <Button
              type="submit"
              variant="ghost"
              className={cn(
                  "w-full flex items-center transition-colors duration-200 text-sidebar-foreground font-medium",
                  (isCollapsed && !isMobileOpen) ? "justify-center px-0 h-10" : "justify-start gap-3 px-3.5 h-11 hover:text-destructive hover:bg-destructive/[0.06]"
              )}
              title={isCollapsed && !isMobileOpen ? "Sign Out" : undefined}
            >
              <FiLogOut className="h-[18px] w-[18px]" />
              {(!isCollapsed || isMobileOpen) && <span>Sign Out</span>}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
