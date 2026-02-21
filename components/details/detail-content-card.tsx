"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FiExternalLink } from "react-icons/fi";
import { CopyButton } from "../copy-button";
import Link from "next/link";
import { ReactNode } from "react";
import { FiEdit2, FiCheck, FiX, FiRefreshCw } from "react-icons/fi";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { DatePicker } from "../ui/date-picker";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DetailItem {
  id: string;
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
  copyValue?: string;
  inputType?: "text" | "date" | "select" | "select-with-custom";
  options?: { label: string; value: string }[];
  isLink?: boolean;
  href?: string;
  fullWidth?: boolean;
  required?: boolean;
}

interface DetailContentCardProps {
  title?: string;
  items: DetailItem[];
  action?: ReactNode;
  editable?: boolean;
  highlightIds?: string[];
  onSave?: (data: Record<string, string>) => Promise<void>;
}

export function DetailContentCard({
  title = "Details",
  items,
  action,
  editable = false,
  highlightIds = [],
  onSave,
}: DetailContentCardProps) {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const handleEditStart = () => {
    const initialValues: Record<string, string> = {};
    items.forEach(item => {
      // Use copyValue (even if empty string) or raw string as the editable source
      initialValues[item.id] = (item.copyValue ?? (typeof item.value === 'string' ? item.value : "")) as string;
    });
    setEditValues(initialValues);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      await onSave(editValues);
      setIsSaving(false);
    }
    setIsEditing(false);
  };

  const copyToClipboard = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedStates((prev) => ({ ...prev, [label]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [label]: false }));
    }, 1500);
  };

  return (
    <Card className="border border-border/60 shadow-sm rounded-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 border-b border-border/50 bg-muted/10">
        <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
          <div className="w-1 h-4 rounded-full bg-primary shadow-sm shadow-primary/30" />
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {editable && !isEditing && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEditStart}
              className="h-7 rounded-full px-3 text-[10px] font-bold hover:bg-muted font-sans border-border/80"
            >
              <FiEdit2 className="w-3 h-3 mr-1.5" />
              Edit details
            </Button>
          )}
          {editable && isEditing && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="h-8 w-8 rounded-full hover:bg-muted"
              >
                <FiX className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 gap-1 rounded-full px-3 text-xs"
              >
                {isSaving ? <FiRefreshCw className="w-3 h-3 animate-spin" /> : <FiCheck className="w-3 h-3" />}
                Save
              </Button>
            </>
          )}
          {action && !isEditing && <div>{action}</div>}
        </div>
      </CardHeader>

      <CardContent className="pt-3 px-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map((item, index) => {
            const isHighlighted = highlightIds.includes(item.id);
            return (
            <div 
              key={`${item.label}-${index}`} 
              className={cn(
                item.fullWidth ? "md:col-span-2" : "",
                "flex flex-col space-y-0.5 px-2 py-1.5 rounded-lg border border-border/50 bg-background hover:bg-muted/40 transition-colors shadow-none relative overflow-hidden",
                isHighlighted ? "ring-1 ring-red-500/50 bg-red-500/5 border-red-500/30" : ""
              )}
            >
              {isHighlighted && <div className="absolute top-0 left-0 w-0.5 h-full bg-red-500" />}
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <span className="p-1 rounded bg-muted/60 text-foreground/70">
                  {item.icon}
                </span>
                {item.label}
                {item.required && <span className="text-destructive text-xs leading-none ml-0.5">*</span>}
              </label>

              <div className="flex items-center gap-2 font-semibold text-sm text-foreground transition-all group min-h-[20px] pl-0.5">
                {isEditing ? (
                  item.inputType === "date" ? (
                    <DatePicker 
                      value={editValues[item.id] && !isNaN(new Date(editValues[item.id]).getTime()) ? new Date(editValues[item.id]) : undefined}
                      onChange={(date) => setEditValues({ ...editValues, [item.id]: date ? format(date, "yyyy-MM-dd") : "" })}
                      className="w-full"
                    />
                  ) : item.inputType === "select" ? (
                    <Select 
                      value={editValues[item.id] || ""} 
                      onValueChange={(val) => setEditValues({ ...editValues, [item.id]: val })}
                    >
                      <SelectTrigger className="w-full h-8 text-sm bg-muted/50 focus:bg-background">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {item.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : item.inputType === "select-with-custom" ? (
                    <div className="w-full space-y-1.5">
                      <Select 
                        value={(item.options?.some(o => o.value === editValues[item.id]) && editValues[item.id] !== "OTHER") ? editValues[item.id] : "OTHER"} 
                        onValueChange={(val) => {
                          setEditValues({ ...editValues, [item.id]: val });
                        }}
                      >
                        <SelectTrigger className="w-full h-7 text-sm bg-muted/50 focus:bg-background">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {item.options?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-sm">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(!item.options?.some(o => o.value === editValues[item.id]) || editValues[item.id] === "OTHER") && (
                        <Input 
                          placeholder="Please specify..."
                          value={editValues[item.id] === "OTHER" ? "" : (editValues[item.id] || "")}
                          onChange={(e) => setEditValues({ ...editValues, [item.id]: e.target.value })}
                          className="h-8 w-full text-sm bg-muted/50 focus-visible:bg-background"
                        />
                      )}
                    </div>
                  ) : (
                    <Input 
                      value={editValues[item.id] || ""}
                      onChange={(e) => setEditValues({ ...editValues, [item.id]: e.target.value })}
                      className="h-8 w-full text-sm bg-muted/50 focus-visible:bg-background"
                    />
                  )
                ) : item.isLink && item.href ? (
                  <div className="flex items-center gap-3">
                    <Link
                      href={item.href.startsWith("http") ? item.href : `https://${item.href}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold transition-all group"
                    >
                      {item.value}
                      <FiExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Link>
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate" title={typeof item.value === 'string' ? item.value : undefined}>
                      {item.value || <span className="text-muted-foreground">-</span>}
                    </div>
                  </div>
                )}

                {item.copyValue && !isEditing && (
                  <CopyButton
                    copied={!!copiedStates[item.label]}
                    onClick={() => copyToClipboard(item.copyValue!, item.label)}
                  />
                )}
              </div>
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
