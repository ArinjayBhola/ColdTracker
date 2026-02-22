"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiCalendar, FiClock, FiEdit2, FiCheckCircle, FiRefreshCw, FiX } from "react-icons/fi";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

interface OutreachTimelineCardProps {
  messageSentAt: Date | string;
  followUpDueAt: Date | string;
  followUpSentAt?: Date | string | null;
  isOverdue: boolean;
  isEditingDate: boolean;
  setIsEditingDate: (val: boolean) => void;
  newDueDate?: Date;
  setNewDueDate: (val?: Date) => void;
  isUpdatingFollowUp: boolean;
  onUpdateDate: () => Promise<void>;
  onToggleFollowUp: () => Promise<void>;
}

export function OutreachTimelineCard({
  messageSentAt,
  followUpDueAt,
  followUpSentAt,
  isOverdue,
  isEditingDate,
  setIsEditingDate,
  newDueDate,
  setNewDueDate,
  isUpdatingFollowUp,
  onUpdateDate,
  onToggleFollowUp,
}: OutreachTimelineCardProps) {
  return (
    <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <FiCalendar className="w-5 h-5 text-primary" />
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-background/50 backdrop-blur-sm border shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sent Date</p>
              <p className="font-bold text-sm mt-0.5">
                {messageSentAt ? format(new Date(messageSentAt), "MMMM d, yyyy") : "Date not set"}
              </p>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-3 p-4 rounded-xl backdrop-blur-sm border shadow-sm",
            isOverdue 
              ? "bg-destructive/10 border-destructive/30" 
              : "bg-background/50 border-border"
          )}>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border",
              isOverdue ? "bg-destructive/20 border-destructive/30" : "bg-amber-500/10 border-amber-500/20"
            )}>
              <FiClock className={cn(
                "w-5 h-5",
                isOverdue ? "text-destructive" : "text-amber-600 dark:text-amber-400"
              )} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Follow-up Due</p>
                  {!followUpSentAt && (
                      <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          onClick={() => {
                              setIsEditingDate(!isEditingDate);
                              setNewDueDate(new Date(followUpDueAt));
                          }}
                      >
                          <FiEdit2 className="h-3 w-3" />
                      </Button>
                  )}
              </div>
              {isEditingDate ? (
                  <div className="mt-2 space-y-3">
                      <DatePicker 
                          value={newDueDate}
                          onChange={setNewDueDate}
                          className="h-9"
                      />
                      <div className="flex items-center gap-2">
                          <Button 
                              size="sm" 
                              className="h-8 flex-1 font-bold"
                              onClick={onUpdateDate}
                              disabled={isUpdatingFollowUp}
                          >
                              Save
                          </Button>
                          <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 flex-1 font-bold"
                              onClick={() => setIsEditingDate(false)}
                              disabled={isUpdatingFollowUp}
                          >
                              Cancel
                          </Button>
                      </div>
                  </div>
              ) : (
                  <>
                      <p className={cn(
                        "font-bold text-sm mt-0.5",
                        isOverdue && !followUpSentAt && "text-destructive"
                      )}>
                        {followUpDueAt ? format(new Date(followUpDueAt), "MMMM d, yyyy") : "Date not set"}
                      </p>
                      {isOverdue && !followUpSentAt && (
                        <p className="text-[10px] text-destructive font-extrabold mt-1 tracking-wider uppercase">Action Overdue</p>
                      )}
                  </>
              )}
            </div>
          </div>

          <div className={cn(
            "flex flex-col gap-3 p-4 rounded-xl border-2 transition-all shadow-sm",
            followUpSentAt 
              ? "bg-emerald-500/5 border-emerald-500/20" 
              : "bg-background/50 border-border"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                  followUpSentAt ? "bg-emerald-500/20 border-emerald-500/30" : "bg-muted border-border"
                )}>
                  <FiCheckCircle className={cn(
                    "w-5 h-5",
                    followUpSentAt ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Follow-up Sent</p>
                  <p className="font-bold text-sm mt-0.5">
                    {followUpSentAt ? format(new Date(followUpSentAt), "MMM d, yyyy") : "Not sent yet"}
                  </p>
                </div>
              </div>
            </div>
            <Button 
              variant={followUpSentAt ? "outline" : "default"}
              size="sm"
              className={cn(
                 "w-full h-9 font-bold transition-all",
                 followUpSentAt ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" : ""
              )}
              onClick={onToggleFollowUp}
              disabled={isUpdatingFollowUp}
            >
              {isUpdatingFollowUp ? (
                <FiRefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : followUpSentAt ? (
                <FiX className="w-4 h-4 mr-2" />
              ) : (
                <FiCheckCircle className="w-4 h-4 mr-2" />
              )}
              {followUpSentAt ? "Mark as Unsent" : "Mark as Sent"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
