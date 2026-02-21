"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiExternalLink } from "react-icons/fi";
import { CopyButton } from "../copy-button";
import Link from "next/link";
import { ReactNode } from "react";

export interface DetailItem {
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
  copyValue?: string;
  isLink?: boolean;
  href?: string;
  fullWidth?: boolean;
}

interface DetailContentCardProps {
  title?: string;
  items: DetailItem[];
}

export function DetailContentCard({
  title = "Details",
  items,
}: DetailContentCardProps) {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const copyToClipboard = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedStates((prev) => ({ ...prev, [label]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [label]: false }));
    }, 1500);
  };

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-extrabold">
          <div className="w-1.5 h-6 rounded-full bg-primary" />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item, index) => (
            <div 
              key={`${item.label}-${index}`} 
              className={item.fullWidth ? "md:col-span-2 space-y-2" : "space-y-2"}
            >
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                {item.icon}
                {item.label}
              </label>

              <div className="flex items-center gap-2 font-bold transition-all group">
                {item.isLink && item.href ? (
                  <div className="flex items-center gap-3">
                    <Link
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold transition-all group"
                    >
                      {item.value}
                      <FiExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Link>
                  </div>
                ) : (
                  <div className="truncate flex-1">
                    {item.value || <span className="text-muted-foreground">-</span>}
                  </div>
                )}

                {item.copyValue && (
                  <CopyButton
                    copied={!!copiedStates[item.label]}
                    onClick={() => copyToClipboard(item.copyValue!, item.label)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
