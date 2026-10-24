"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { saveUserTimeZone } from "@/actions/time-zone";
import { userDayBounds } from "@/lib/user-calendar";

export function UserClock() {
  const router = useRouter();
  const pathname = usePathname();
  const inApp = !["/", "/signin", "/signup"].includes(pathname);
  const queryClient = useQueryClient();
  useEffect(() => {
    let lastDay = "";
    let savedZone = "";
    let savingZone = "";
    const sync = () => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const day = new Date().toDateString();
      const bounds = userDayBounds(timeZone);
      const previousDay = document.cookie.split("; ").find(value => value.startsWith("coldtrack-day="))?.split("=")[1];
      let previousKey = "";
      try { previousKey = JSON.parse(decodeURIComponent(previousDay || "")).key; } catch {}
      document.cookie = `coldtrack-day=${encodeURIComponent(JSON.stringify({ key: bounds.key, start: bounds.start.toISOString(), end: bounds.end.toISOString() }))}; Path=/; Max-Age=172800; SameSite=Lax`;
      const cookie = document.cookie.split("; ").find(value => value.startsWith("coldtrack-time-zone="))?.split("=")[1];
      const changed = decodeURIComponent(cookie || "") !== timeZone;
      if (changed) document.cookie = `coldtrack-time-zone=${encodeURIComponent(timeZone)}; Path=/; Max-Age=31536000; SameSite=Lax`;
      if (inApp && savedZone !== timeZone && savingZone !== timeZone) {
        savingZone = timeZone;
        void saveUserTimeZone(timeZone).then(result => { if (result?.success) savedZone = timeZone; }).catch(() => {}).finally(() => { savingZone = ""; });
      }
      if (inApp && (changed || previousKey !== bounds.key || (lastDay && day !== lastDay))) {
        void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
        window.dispatchEvent(new Event("coldtrack-calendar-change"));
        router.refresh();
      }
      lastDay = day;
    };
    sync();
    const timer = setInterval(sync, 30_000);
    window.addEventListener("focus", sync);
    return () => { clearInterval(timer); window.removeEventListener("focus", sync); };
  }, [router, queryClient, inApp]);
  return null;
}
