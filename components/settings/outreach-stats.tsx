"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOutreachStatsAction } from "@/actions/settings";
import { FiTarget, FiTrendingUp } from "react-icons/fi";

export function OutreachStats() {
  const [stats, setStats] = useState<{ count: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await getOutreachStatsAction();
        if ("count" in result) {
          setStats({ count: Number(result.count) });
        }
      } catch (error) {
        console.error("Failed to fetch statistics", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-premium overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 text-primary/5 group-hover:text-primary/10 transition-colors pointer-events-none">
        <FiTarget size={60} />
      </div>
      
      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <FiTrendingUp size={16} />
          </div>
          <CardTitle className="text-sm font-bold">Outreach Impact</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 pt-2 pb-6">
        {isLoading ? (
          <div className="h-10 w-20 bg-muted/50 animate-pulse rounded-xl" />
        ) : (
          <div className="text-5xl font-bold tracking-tighter text-foreground">
            {stats?.count || 0}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
