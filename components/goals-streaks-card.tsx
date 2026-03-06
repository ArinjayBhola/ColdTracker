"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FiTarget, FiZap, FiTrendingUp, FiEdit3, FiCheck, FiX, FiRefreshCw, FiSun } from "react-icons/fi";
import { useState, useTransition } from "react";
import { updateWeeklyTarget, updateDailyTarget, syncActivityHistory } from "@/actions/goals";

type GoalsStreaksProps = {
  dailyProgress: { target: number; current: number; percentage: number };
  weeklyProgress: { target: number; current: number; percentage: number };
  streakData: { currentStreak: number; longestStreak: number; todayCount: number };
  last7Days: { date: string; day: string; count: number }[];
};

function ProgressRing({ percentage, size = 100, strokeWidth = 8, className }: { percentage: number; size?: number; strokeWidth?: number; className?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            "transition-all duration-700 ease-out",
            percentage >= 100 ? "text-green-500" :
            percentage >= 60 ? "text-primary" :
            percentage >= 30 ? "text-amber-500" : "text-red-400",
            className
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold">{percentage}%</span>
      </div>
    </div>
  );
}

function EditableTarget({ value, onSave, onCancel, isPending, max = 100 }: { value: string; onSave: (val: string) => void; onCancel: () => void; isPending: boolean; max?: number }) {
  const [localValue, setLocalValue] = useState(value);

  const handleSave = () => {
    onSave(localValue);
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number" min={1} max={max}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="w-16 h-7 text-xs text-center"
        onKeyDown={(e) => {
          if (e.key === "Enter") { handleSave(); }
          if (e.key === "Escape") { onCancel(); }
        }}
        autoFocus
      />
      <button onClick={handleSave} disabled={isPending} className="p-1 rounded hover:bg-primary/10">
        <FiCheck className="w-3.5 h-3.5 text-green-600" />
      </button>
      <button onClick={onCancel} className="p-1 rounded hover:bg-primary/10">
        <FiX className="w-3.5 h-3.5 text-red-500" />
      </button>
    </div>
  );
}

export function GoalsStreaksCard({ dailyProgress, weeklyProgress, streakData, last7Days }: GoalsStreaksProps) {
  const [editingDaily, setEditingDaily] = useState(false);
  const [editingWeekly, setEditingWeekly] = useState(false);
  const [dailyTargetValue, setDailyTargetValue] = useState(String(dailyProgress.target));
  const [weeklyTargetValue, setWeeklyTargetValue] = useState(String(weeklyProgress.target));
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setSyncing] = useState(false);

  const maxDayCount = Math.max(...last7Days.map((d) => d.count), 1);

  const handleSaveDailyTarget = (newValue: string) => {
    const num = parseInt(newValue);
    if (isNaN(num) || num < 1 || num > 50) return;
    setDailyTargetValue(newValue);
    startTransition(async () => {
      await updateDailyTarget(num);
      setEditingDaily(false);
    });
  };

  const handleSaveWeeklyTarget = (newValue: string) => {
    const num = parseInt(newValue);
    if (isNaN(num) || num < 1 || num > 100) return;
    setWeeklyTargetValue(newValue);
    startTransition(async () => {
      await updateWeeklyTarget(num);
      setEditingWeekly(false);
    });
  };

  const handleSync = () => {
    setSyncing(true);
    startTransition(async () => {
      await syncActivityHistory();
      setSyncing(false);
    });
  };

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Daily Goal Progress */}
      <Card className="border-none ring-1 ring-cyan-500/20 bg-cyan-500/5 transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <CardTitle className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FiSun className="w-4 h-4 text-cyan-500" />
            Daily Goal
          </CardTitle>
          {!editingDaily ? (
            <button
              onClick={() => setEditingDaily(true)}
              className="p-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors"
            >
              <FiEdit3 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          ) : (
            <EditableTarget
              value={dailyTargetValue}
              onSave={handleSaveDailyTarget}
              onCancel={() => { setEditingDaily(false); setDailyTargetValue(String(dailyProgress.target)); }}
              isPending={isPending}
              max={50}
            />
          )}
        </CardHeader>
        <CardContent className="p-4 pt-0 flex items-center gap-5">
          <ProgressRing percentage={dailyProgress.percentage} size={90} strokeWidth={7} className={cn(
            dailyProgress.percentage >= 100 ? "text-green-500" :
            dailyProgress.percentage >= 60 ? "text-cyan-500" :
            dailyProgress.percentage >= 30 ? "text-amber-500" : "text-red-400"
          )} />
          <div className="space-y-1">
            <p className="text-2xl font-bold">
              {dailyProgress.current}<span className="text-muted-foreground text-base font-normal">/{dailyProgress.target}</span>
            </p>
            <p className="text-xs text-muted-foreground">outreach today</p>
            {dailyProgress.percentage >= 100 ? (
              <p className="text-xs font-semibold text-green-600 dark:text-green-400">Daily goal hit!</p>
            ) : dailyProgress.current === 0 ? (
              <p className="text-xs text-muted-foreground">Get started today!</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {dailyProgress.target - dailyProgress.current} more to go
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Goal Progress */}
      <Card className="border-none ring-1 ring-primary/20 bg-primary/5 transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <CardTitle className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FiTarget className="w-4 h-4 text-primary" />
            Weekly Goal
          </CardTitle>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSync}
              className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
              title="Sync activity from outreach history"
            >
              <FiRefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isSyncing && "animate-spin")} />
            </button>
            {!editingWeekly ? (
              <button
                onClick={() => setEditingWeekly(true)}
                className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <FiEdit3 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            ) : (
              <EditableTarget
                value={weeklyTargetValue}
                onSave={handleSaveWeeklyTarget}
                onCancel={() => { setEditingWeekly(false); setWeeklyTargetValue(String(weeklyProgress.target)); }}
                isPending={isPending}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex items-center gap-5">
          <ProgressRing percentage={weeklyProgress.percentage} size={90} strokeWidth={7} />
          <div className="space-y-1">
            <p className="text-2xl font-bold">
              {weeklyProgress.current}<span className="text-muted-foreground text-base font-normal">/{weeklyProgress.target}</span>
            </p>
            <p className="text-xs text-muted-foreground">outreach this week</p>
            {weeklyProgress.percentage >= 100 ? (
              <p className="text-xs font-semibold text-green-600 dark:text-green-400">Goal completed!</p>
            ) : weeklyProgress.current > 0 ? (
              <p className="text-xs text-muted-foreground">
                {weeklyProgress.target - weeklyProgress.current} more to go
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Streak Card */}
      <Card className="border-none ring-1 ring-amber-500/20 bg-amber-500/5 transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <CardTitle className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FiZap className="w-4 h-4 text-amber-500" />
            Streak
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-amber-600 dark:text-amber-400">
              {streakData.currentStreak}
            </span>
            <span className="text-sm text-muted-foreground">
              {streakData.currentStreak === 1 ? "day" : "days"}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Longest streak</span>
              <span className="font-semibold">{streakData.longestStreak} days</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Today&apos;s outreach</span>
              <span className="font-semibold">{streakData.todayCount}</span>
            </div>
            {streakData.currentStreak === 0 && (
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                Add outreach today to start a streak!
              </p>
            )}
            {streakData.currentStreak >= 7 && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-2 pt-2 border-t border-border/50">
                You&apos;re on fire! Keep it going!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last 7 Days Activity */}
      <Card className="border-none ring-1 ring-emerald-500/20 bg-emerald-500/5 transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <CardTitle className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FiTrendingUp className="w-4 h-4 text-emerald-500" />
            Last 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-end justify-between gap-1.5 h-[80px]">
            {last7Days.map((day) => {
              const height = day.count > 0 ? Math.max((day.count / maxDayCount) * 100, 12) : 4;
              const isToday = day === last7Days[last7Days.length - 1];
              return (
                <div key={day.date} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">{day.count || ""}</span>
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-all duration-500",
                      day.count > 0
                        ? isToday
                          ? "bg-emerald-500"
                          : "bg-emerald-500/50"
                        : "bg-muted/30",
                    )}
                    style={{ height: `${height}%` }}
                  />
                  <span className={cn(
                    "text-[10px] font-medium",
                    isToday ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"
                  )}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">7-day total</span>
            <span className="font-semibold">{last7Days.reduce((sum, d) => sum + d.count, 0)} outreach</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
