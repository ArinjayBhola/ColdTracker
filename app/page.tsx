"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowRight, FiTarget, FiZap, FiLayout } from "react-icons/fi";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <span className="text-primary-foreground font-bold italic tracking-tighter">CT</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground/90">ColdTrack</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mr-2">
              Sign in
            </Link>
            <Link href="/signup">
              <Button size="sm" className="h-9 px-5 rounded-lg font-medium shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[10%] right-[5%] w-[30%] h-[30%] bg-accent/5 rounded-full blur-[100px] animate-pulse delay-1000" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Now in Private Beta
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] animate-fade-in px-4 text-foreground">
              Professional <span className="text-primary italic">Outreach</span> <br className="hidden md:block" />
              Tracking Simplified.
            </h1>
            
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground/80 leading-relaxed mb-12 animate-fade-in delay-100">
              ColdTrack is a high-performance CRM designed specifically for outreach professionals. Manage prospects, automate follow-up schedules, and optimize your conversion funnel in one unified dashboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in delay-200">
              <Link href="/signup">
                <Button size="lg" className="h-14 px-8 text-lg rounded-2xl font-bold gap-3 shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-[0.97]">
                  Launch Dashboard <FiArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/signin">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl font-bold border-border/60 hover:bg-muted/50 transition-all active:scale-[0.97]">
                  View live demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Precision Tracking, Professional Results</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Everything you need to turn cold outreach into warm relationships.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <FiTarget className="w-6 h-6" />,
                  title: "Smart Targeting",
                  description: "Keep track of high-value prospects and where they are in your funnel at any given time."
                },
                {
                  icon: <FiZap className="w-6 h-6" />,
                  title: "Rapid Follow-ups",
                  description: "Never miss a beat with an automated schedule for your follow-up sequence."
                },
                {
                  icon: <FiLayout className="w-6 h-6" />,
                  title: "Unified CRM",
                  description: "A single, focused view of all your outreach activities across every channel."
                }
              ].map((feat, i) => (
                <div key={i} className="p-8 rounded-3xl bg-background border border-border/40 hover:border-primary/20 hover:shadow-premium transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {feat.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="relative rounded-[2.5rem] bg-foreground text-background overflow-hidden p-12 md:p-24 text-center">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-[100px]" />
              
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-8 relative z-10">Ready to scale your <br /> outreach performance?</h2>
              <p className="text-background/70 max-w-lg mx-auto mb-12 text-lg relative z-10">Join 500+ professionals using ColdTrack to streamline their daily workflow and close more deals.</p>
              
              <Link href="/signup" className="relative z-10 inline-block">
                <Button size="lg" className="h-16 px-10 text-xl rounded-2xl font-bold bg-white text-black hover:bg-white/90 transition-all active:scale-[0.98]">
                  Start for Free
                </Button>
              </Link>
              
              <p className="mt-8 text-sm text-background/40 relative z-10">No credit card required • 14-day free trial • Cancel anytime</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 grayscale brightness-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold italic tracking-tighter text-xs">CT</span>
            </div>
            <span className="text-lg font-bold tracking-tight">ColdTrack</span>
          </div>
          
          <div className="flex gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
          
          <p className="text-xs text-muted-foreground">© 2026 ColdTrack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
