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
        className="md:hidden fixed top-4 left-4 z-[100] p-2 rounded-md border bg-card text-foreground shadow-sm"
      >
        {isMobileOpen ? <FiChevronLeft size={20} /> : <FiLayout size={20} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 z-[35] animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-[36] md:relative flex h-screen flex-col border-r bg-sidebar py-5 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20 px-3" : "w-72 px-4",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Collapse Toggle Button (Desktop) */}
        <button 
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3 top-8 h-6 w-6 rounded-md border bg-card items-center justify-center text-muted-foreground shadow-sm z-[37]"
        >
          {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        {/* Logo & Theme Toggle */}
        <div className={cn(
          "mb-7 flex items-center justify-between border-b pb-5 px-1",
          isCollapsed && "flex-col gap-4"
        )}>
          <div className="flex items-center gap-2 group cursor-pointer">
            <Link href="/dashboard" className="relative h-10 w-10 flex items-center justify-center shrink-0 rounded-md border bg-card">
              <Image 
                src="/logo.png" 
                alt="ColdTrack Logo" 
                fill
                className="object-contain p-1 dark:invert dark:brightness-200"
                priority
              />
            </Link>
            {(!isCollapsed || isMobileOpen) && (
              <div>
                <Link href="/dashboard">
                  <h1 className="text-base font-bold text-foreground leading-none mb-1">
                    ColdTrack
                  </h1>
                </Link>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Outreach CRM</p>
              </div>
            )}
          </div>
          {(!isCollapsed || isMobileOpen) && <ThemeToggle />}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-1">
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
                  "flex items-center rounded-md py-3 text-sm font-semibold transition-colors duration-200 group relative overflow-hidden",
                  isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-sidebar-foreground hover:text-foreground hover:bg-card",
                  showLabel ? "px-4 gap-3" : "justify-center px-0"
                )}
                title={isCollapsed && !isMobileOpen ? link.label : undefined}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-200 relative z-10",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {showLabel && <span className="relative z-10">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto pt-4 border-t flex flex-col gap-1">
          <Link
            href="/settings"
            className={cn(
              "flex items-center rounded-md transition-colors duration-200 group",
              pathname === "/settings" 
                ? "bg-card text-primary border border-border" 
                : "text-muted-foreground hover:text-foreground hover:bg-card",
              (isCollapsed && !isMobileOpen) ? "justify-center p-2.5" : "px-4 py-3 gap-3"
            )}
            title="Settings"
          >
            <FiSettings className={cn("h-5 w-5", pathname === "/settings" && "animate-spin-slow")} />
            {(!isCollapsed || isMobileOpen) && <span className="font-semibold text-sm">Settings</span>}
          </Link>

          <form action={signOutAction} className="w-full">
            <Button
              type="submit"
              variant="ghost"
              className={cn(
                  "w-full flex items-center transition-all duration-200",
                  (isCollapsed && !isMobileOpen) ? "justify-center px-0 h-10" : "justify-start gap-3 px-4 h-12 text-muted-foreground hover:text-destructive hover:bg-card"
              )}
              title={isCollapsed && !isMobileOpen ? "Sign Out" : undefined}
            >
              <FiLogOut className="h-5 w-5" />
              {(!isCollapsed || isMobileOpen) && <span className="font-semibold">Sign Out</span>}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
