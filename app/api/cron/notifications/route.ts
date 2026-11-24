import { parseReminderCursor, runReminders } from "@/lib/reminder-runner";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Scheduler authentication is not configured" }, { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let cursor;
  try { cursor = parseReminderCursor(new URL(request.url).searchParams.get("cursor")); }
  catch { return NextResponse.json({ error: "Invalid or expired continuation cursor" }, { status: 400 }); }
  try {
    const result = await runReminders(cursor);
    return NextResponse.json(result, { status: result.success ? 200 : 503, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Reminder scheduler failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Reminder processing failed" }, { status: 500 });
  }
}
