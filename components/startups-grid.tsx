"use client";

import { useState } from "react";
import { FiExternalLink, FiMapPin, FiUsers, FiDollarSign, FiTrendingUp } from "react-icons/fi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";

type StartupItem = {
  id: string;
  name: string;
  sector: string | null;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  location: string | null;
  teamSize: string | null;
  fundingAmount: string | null;
  isHiring: boolean;
  isTrending: boolean;
  tracking?: {
    outreachDone: boolean;
  }[];
};


type StartupsGridProps = {
  items: StartupItem[];
};

export function StartupsGrid({ items }: StartupsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <Link key={item.id} href={`/startups/${item.id}`} className="block group">
          <Card className="h-full border-border/50 bg-card hover:bg-muted/30 hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden relative group-hover:shadow-xl group-hover:shadow-primary/5">
            <CardHeader className="p-6 pb-2 flex flex-row items-start justify-between space-y-0">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-muted shrink-0 rounded-xl">
                  <AvatarImage src={item.logoUrl || ""} alt={item.name} className="object-cover" />
                  <AvatarFallback className="rounded-xl font-bold bg-primary/5 text-primary">
                    {item.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                </div>
              </div>
              <div className="text-primary/40 group-hover:text-primary transition-colors">
                <FiTrendingUp className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                {item.description || "No description available."}
              </p>
              
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted-foreground/80 font-medium">
                <div className="flex items-center gap-1.5">
                  <FiMapPin className="w-3.5 h-3.5" />
                  <span>{item.location || "Global"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FiUsers className="w-3.5 h-3.5" />
                  <span>{item.teamSize || "1-10"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FiDollarSign className="w-3.5 h-3.5" />
                  <span>{item.fundingAmount || "Bootstrapped"}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {item.tracking?.[0]?.outreachDone ? (
                  <Badge className="rounded-lg bg-blue-500 text-white border-none text-[10px] py-0 px-2 h-6 hover:bg-blue-600">
                    Outreach Done
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-lg border-blue-500/30 text-blue-500 text-[10px] py-0 px-2 h-6 hover:bg-blue-500/5">
                    No Outreach
                  </Badge>
                )}
                {item.sector && (
                  <Badge variant="secondary" className="rounded-lg bg-muted/50 border-none text-[10px] py-0 px-2 h-6">
                    {item.sector}
                  </Badge>
                )}
                {item.isHiring && (
                  <Badge className="rounded-lg bg-emerald-500/10 text-emerald-600 border-none text-[10px] py-0 px-2 h-6 hover:bg-emerald-500/20">
                    Hiring
                  </Badge>
                )}
              </div>

            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
