"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FiLayout, FiPlusCircle, FiBarChart2, FiLogOut, FiCheckSquare, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Button } from "./ui/button";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: FiLayout },
  { href: "/follow-ups", label: "Follow-ups", icon: FiCheckSquare },
  { href: "/outreach/new", label: "Add Outreach", icon: FiPlusCircle },
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
      setIsCollapsed(JSON.parse(saved));
    }
    setMounted(true);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
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
            "hidden md:flex h-screen flex-col border-r border-border/50 bg-card/50 backdrop-blur-xl py-8 shadow-premium transition-all duration-300 ease-in-out relative w-72 px-5 opacity-0"
        )} />
    );
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-[60] p-2 rounded-xl bg-primary text-primary-foreground shadow-lg active:scale-95 transition-all"
      >
        {isMobileOpen ? <FiChevronLeft size={20} /> : <FiLayout size={20} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-[55] animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-[56] md:relative flex h-screen flex-col border-r border-border/50 bg-card/50 backdrop-blur-xl py-8 shadow-premium transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20 px-3" : "w-72 px-5",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Collapse Toggle Button (Desktop) */}
        <button 
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3 top-10 w-6 h-6 rounded-full bg-primary items-center justify-center text-primary-foreground shadow-lg hover:scale-110 transition-transform z-50 border-2 border-background"
        >
          {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        {/* Logo & Theme Toggle */}
        <div className={cn(
          "mb-10 flex items-center justify-between px-3",
          isCollapsed && "flex-col gap-4"
        )}>
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform shrink-0">
            <Link href="/dashboard">
              <span className="text-lg font-bold text-primary-foreground italic tracking-tighter">CT</span>
            </Link>
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className={cn(isCollapsed && !isMobileOpen && "hidden")}>
                <Link href="/dashboard">
                <h1 className="text-xl font-bold tracking-tight text-foreground/90 leading-none mb-1">
                  ColdTrack
                </h1>
                </Link>
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">Outreach Manager</p>
              </div>
            )}
          </div>
          {(!isCollapsed || isMobileOpen) && <ThemeToggle />}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
            const showLabel = !isCollapsed || isMobileOpen;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 group relative overflow-hidden",
                  isActive 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  showLabel ? "px-4 gap-3" : "justify-center px-0"
                )}
                title={isCollapsed && !isMobileOpen ? link.label : undefined}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-200 relative z-10",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground group-hover:scale-110"
                )} />
                {showLabel && <span className="relative z-10">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="mt-auto pt-6 border-t border-border/50">
          <Button 
              variant="ghost" 
              className={cn(
                  "w-full flex items-center transition-all duration-200",
                  (isCollapsed && !isMobileOpen) ? "justify-center px-0 h-10" : "justify-start gap-3 px-4 h-12 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              )}
              onClick={() => signOut({ callbackUrl: "/signin" })}
              title={isCollapsed && !isMobileOpen ? "Sign Out" : undefined}
          >
            <FiLogOut className="h-5 w-5" />
            {(!isCollapsed || isMobileOpen) && <span className="font-semibold">Sign Out</span>}
          </Button>
        </div>
      </div>
    </>
  );
}
