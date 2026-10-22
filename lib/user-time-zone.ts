import { cookies } from "next/headers";
import { validTimeZone } from "@/lib/user-calendar";
import { validBrowserDay, type BrowserDay } from "@/lib/user-calendar";

export async function getUserDayBounds() {
  try {
    const raw = (await cookies()).get("coldtrack-day")?.value;
    const day: BrowserDay = JSON.parse(decodeURIComponent(raw || ""));
    if (!validBrowserDay(day)) return null;
    return { key: day.key, start: new Date(day.start), end: new Date(day.end) };
  } catch { return null; }
}

export async function getUserTimeZone() {
  const raw = (await cookies()).get("coldtrack-time-zone")?.value;
  let value: string | undefined;
  try { value = raw ? decodeURIComponent(raw) : undefined; } catch { return null; }
  if (!validTimeZone(value)) return null;
  return value;
}
