"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FiLayout, FiPlusCircle, FiBarChart2, FiLogOut, FiCheckSquare, FiChevronLeft, FiChevronRight, FiSettings, FiLinkedin, FiCalendar, FiTrendingUp, FiFileText } from "react-icons/fi";
import { Button } from "./ui/button";
import { signOutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import Image from "next/image";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: FiLayout },
  { href: "/startups", label: "Startups", icon: FiTrendingUp },
  { href: "/dashboard/extension-leads", label: "Extension Leads", icon: FiLinkedin },
  { href: "/follow-ups", label: "Follow-ups", icon: FiCheckSquare },
  { href: "/calendar", label: "Calendar", icon: FiCalendar },
  { href: "/outreach/new", label: "Add Outreach", icon: FiPlusCircle },
  { href: "/templates", label: "Templates", icon: FiFileText },
  { href: "/stats", label: "Stats", icon: FiBarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null && window.innerWidth > 768) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollapsed(JSON.parse(saved));
    }
    setMounted(true);
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

  if (!mounted) {
    return (
        <div className={cn(
            "hidden md:flex h-screen flex-col border-r bg-sidebar py-5 transition-all duration-300 ease-in-out relative w-72 px-4 opacity-0"
        )} />
    );
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
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
        "fixed inset-y-0 left-0 z-[36] md:relative flex h-screen flex-col border-r border-border bg-sidebar py-6 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20 px-3" : "w-72 px-4",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Collapse Toggle Button (Desktop) */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3 top-9 h-6 w-6 rounded-full border border-border bg-card items-center justify-center text-muted-foreground shadow-soft hover:text-foreground z-[37]"
        >
          {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        {/* Logo & Theme Toggle */}
        <div className={cn(
          "mb-8 flex items-center justify-between pb-6 px-1.5",
          isCollapsed && "flex-col gap-4"
        )}>
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <Link href="/dashboard" className="relative h-10 w-10 flex items-center justify-center shrink-0 rounded-xl border border-border bg-card shadow-soft">
              <Image
                src="/logo.png"
                alt="ColdTrack Logo"
                fill
                className="object-contain p-1.5 dark:invert dark:brightness-200"
                priority
              />
            </Link>
            {(!isCollapsed || isMobileOpen) && (
              <div>
                <Link href="/dashboard">
                  <h1 className="font-display text-lg font-semibold text-foreground leading-none mb-1 tracking-tight">
                    ColdTrack
                  </h1>
                </Link>
                <p className="eyebrow">Outreach CRM</p>
              </div>
            )}
          </div>
          {(!isCollapsed || isMobileOpen) && <ThemeToggle />}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5">
          {links.map((link) => {
            const Icon = link.icon;
            // Precise matching for the root dashboard to avoid matching sub-routes
            const isActive = link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === link.href || pathname?.startsWith(link.href + "/");
            const showLabel = !isCollapsed || isMobileOpen;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors duration-200 group relative",
                  isActive
                      ? "bg-primary/10 text-foreground font-semibold"
                      : "text-sidebar-foreground hover:text-foreground hover:bg-foreground/[0.04]",
                  showLabel ? "px-3.5 gap-3" : "justify-center px-0"
                )}
                title={isCollapsed && !isMobileOpen ? link.label : undefined}
              >
                {/* Active accent rail */}
                {isActive && showLabel && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
                )}
                <Icon className={cn(
                  "h-[18px] w-[18px] transition-colors duration-200 relative z-10",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {showLabel && <span className="relative z-10">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto pt-4 border-t border-border flex flex-col gap-0.5">
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
