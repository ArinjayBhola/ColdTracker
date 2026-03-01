"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiCalendar, FiClock, FiEdit2, FiCheckCircle, FiRefreshCw, FiX } from "react-icons/fi";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

interface OutreachTimelineCardProps {
  messageSentAt: Date | string;
  followUpDueAt: Date | string; // 1st
  followUpSentAt?: Date | string | null; // 1st
  followUp2DueAt?: Date | string | null;
  followUp2SentAt?: Date | string | null;
  isOverdue: boolean;
  isEditingDate: boolean;
  setIsEditingDate: (val: boolean) => void;
  newDueDate?: Date;
  setNewDueDate: (val?: Date) => void;
  isUpdatingFollowUp: boolean;
  onUpdateDate: () => Promise<void>;
  onToggleFollowUp: (isSent: boolean, date?: Date) => Promise<void>;
  isEditingSentDate: number | null;
  setIsEditingSentDate: (val: number | null) => void;
  newSentDate?: Date;
  setNewSentDate: (val?: Date) => void;
}

export function OutreachTimelineCard({
  messageSentAt,
  followUpDueAt,
  followUpSentAt,
  followUp2DueAt,
  followUp2SentAt,
  isOverdue,
  isEditingDate,
  setIsEditingDate,
  newDueDate,
  setNewDueDate,
  isUpdatingFollowUp,
  onUpdateDate,
  onToggleFollowUp,
  isEditingSentDate,
  setIsEditingSentDate,
  newSentDate,
  setNewSentDate,
}: OutreachTimelineCardProps) {
  const activeFollowUpDue = followUpSentAt ? followUp2DueAt : followUpDueAt;
  const currentStage = !followUpSentAt ? 1 : 2;
  const isAllSent = !!followUp2SentAt;

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
          {/* Outreach Sent */}
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

          {/* current Follow-up Due */}
          {!isAllSent && (
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Follow-up {currentStage} Due
                    </p>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                        onClick={() => {
                            setIsEditingDate(!isEditingDate);
                            setNewDueDate(new Date(activeFollowUpDue!));
                        }}
                    >
                        <FiEdit2 className="h-3 w-3" />
                    </Button>
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
                          isOverdue && "text-destructive"
                        )}>
                          {activeFollowUpDue ? format(new Date(activeFollowUpDue), "MMMM d, yyyy") : "Date not set"}
                        </p>
                        {isOverdue && (
                          <p className="text-[10px] text-destructive font-extrabold mt-1 tracking-wider uppercase">Action Overdue</p>
                        )}
                    </>
                )}
              </div>
            </div>
          )}

          {/* Follow-up Status 1 */}
          <div className={cn(
            "flex flex-col gap-3 p-4 rounded-xl border shadow-sm",
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
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Follow-up 1</p>
                    {followUpSentAt && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-4 w-4 text-muted-foreground hover:text-primary"
                            onClick={() => {
                                setIsEditingSentDate(1);
                                setNewSentDate(new Date(followUpSentAt));
                            }}
                        >
                            <FiEdit2 className="h-3 w-3" />
                        </Button>
                    )}
                  </div>
                  {isEditingSentDate === 1 ? (
                      <div className="mt-2 space-y-2">
                          <DatePicker 
                              value={newSentDate}
                              onChange={setNewSentDate}
                              className="h-8"
                          />
                          <div className="flex gap-1">
                              <Button size="sm" className="h-7 px-2 text-[10px]" onClick={() => onToggleFollowUp(true, newSentDate)}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setIsEditingSentDate(null)}>Cancel</Button>
                          </div>
                      </div>
                  ) : (
                      <p className="font-bold text-sm mt-0.5">
                        {followUpSentAt ? format(new Date(followUpSentAt), "MMM d, yyyy") : "Not sent yet"}
                      </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Follow-up Status 2 */}
          {(followUpSentAt || followUp2SentAt) && (
            <div className={cn(
                "flex flex-col gap-3 p-4 rounded-xl border shadow-sm",
                followUp2SentAt 
                  ? "bg-emerald-500/5 border-emerald-500/20" 
                  : "bg-background/50 border-border"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border",
                      followUp2SentAt ? "bg-emerald-500/20 border-emerald-500/30" : "bg-muted border-border"
                    )}>
                      <FiCheckCircle className={cn(
                        "w-5 h-5",
                        followUp2SentAt ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Follow-up 2</p>
                        {followUp2SentAt && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                    setIsEditingSentDate(2);
                                    setNewSentDate(new Date(followUp2SentAt));
                                }}
                            >
                                <FiEdit2 className="h-3 w-3" />
                            </Button>
                        )}
                      </div>
                      {isEditingSentDate === 2 ? (
                          <div className="mt-2 space-y-2">
                              <DatePicker 
                                  value={newSentDate}
                                  onChange={setNewSentDate}
                                  className="h-8"
                              />
                              <div className="flex gap-1">
                                  <Button size="sm" className="h-7 px-2 text-[10px]" onClick={() => onToggleFollowUp(true, newSentDate)}>Save</Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setIsEditingSentDate(null)}>Cancel</Button>
                              </div>
                          </div>
                      ) : (
                          <p className="font-bold text-sm mt-0.5">
                            {followUp2SentAt ? format(new Date(followUp2SentAt), "MMM d, yyyy") : "Not sent yet"}
                          </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* Global Toggle Button */}
          <Button 
            variant={isAllSent ? "outline" : "default"}
            size="sm"
            className={cn(
               "w-full h-11 font-bold mt-2 shadow-md transition-all",
               isAllSent && "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            )}
            onClick={() => onToggleFollowUp(!isAllSent)}
            disabled={isUpdatingFollowUp}
          >
            {isUpdatingFollowUp ? (
              <FiRefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : isAllSent ? (
              <FiX className="w-4 h-4 mr-2" />
            ) : (
                <FiCheckCircle className="w-4 h-4 mr-2" />
            )}
            {!isUpdatingFollowUp && (
              isAllSent ? "Mark as Unsent" : (followUpSentAt ? "Mark Sent (Stage 2)" : "Mark as Sent")
            )}
          </Button>

          {followUpSentAt && !isAllSent && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-[10px] uppercase tracking-wider font-bold text-muted-foreground hover:text-destructive"
                onClick={() => onToggleFollowUp(false)}
                disabled={isUpdatingFollowUp}
              >
                  Revert Stage 1 status
              </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
