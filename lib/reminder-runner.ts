import { z } from "zod";
import { userDayBounds } from "@/lib/user-calendar";
import { reminderDay } from "@/lib/reminder-schedule";
import { deliverReminder } from "@/lib/reminder-delivery";
import { expireReminderAttempts, readReminderSummaries, readReminderUsers, REMINDER_PAGE_SIZE } from "@/lib/reminder-query";

type Cursor = { after: string | null; asOf: string };
const cursorSchema = z.object({ after: z.string().min(1).max(1024).nullable(), asOf: z.iso.datetime() });
const encodeCursor = (cursor: Cursor) => Buffer.from(JSON.stringify(cursor)).toString("base64url");
export function parseReminderCursor(raw: string | null, now = Date.now()): Cursor {
  if (raw === null) return { after: null, asOf: new Date(now).toISOString() };
  if (raw.length > 8192 || !/^[\w-]+$/.test(raw)) throw new Error("Invalid cursor");
  const cursor = cursorSchema.parse(JSON.parse(Buffer.from(raw,"base64url").toString("utf8")));
  const age = now - Date.parse(cursor.asOf);
  if (age < -60_000 || age > 23 * 60 * 60 * 1000) throw new Error("Expired cursor");
  return cursor;
}

// Options allow deterministic clocks/IO pacing in tests; the route uses defaults.
export async function runReminders(cursor: Cursor, options: {
  now?: () => number; budgetMs?: number; sendIntervalMs?: number; wait?: (ms: number) => Promise<void>;
} = {}) {
  const now = options.now ?? (() => performance.now());
  const started = now(), deadline = started + (options.budgetMs ?? 45_000);
  const interval = options.sendIntervalMs ?? 250;
  const wait = options.wait ?? (ms => new Promise(resolve => setTimeout(resolve,ms)));
  const mode = process.env.REMINDER_SCHEDULE_MODE === "frequent" ? "frequent" : "daily";
  const asOf = new Date(cursor.asOf);
  let after = cursor.after, sent = 0, failed = 0, processed = 0, complete = false;
  let retryAfter: string | null | undefined;
  let lastSendAt = -Infinity;
  let gate = Promise.resolve(true);
  function sendSlot() {
    const slot = gate.then(async () => {
      let delay = Math.max(0,lastSendAt + interval - now());
      if (now() + delay >= deadline) return false;
      while (delay > 0) {
        await wait(delay);
        delay = Math.max(0,lastSendAt + interval - now());
      }
      if (now() >= deadline) return false;
      lastSendAt = now();
      return true;
    });
    gate = slot;
    return slot;
  }
  try {
    await expireReminderAttempts();
    while (now() < deadline) {
      const rows = await readReminderUsers(after);
      const page = rows.slice(0,REMINDER_PAGE_SIZE);
      if (!page.length) { complete = true; break; }
      const eligible = page.flatMap(user => {
        const day = reminderDay(user.timeZone,user.reminderTime,asOf,mode);
        if (!day || !user.timeZone) return [];
        const bounds = userDayBounds(user.timeZone,asOf);
        return [{ user, day, start: bounds.start.toISOString(), end: bounds.end.toISOString() }];
      });
      const summaries = new Map((await readReminderSummaries(eligible.map(({user,day,start,end}) => ({id:user.id,day,start,end})))).map(summary => [summary.id,summary]));
      const byId = new Map(eligible.map(entry => [entry.user.id,entry]));
      const done = page.map(() => false), errors = page.map(() => false);
      let index = 0, stopped = false;
      async function worker() {
        while (!stopped && index < page.length && now() < deadline) {
          const position = index++, user = page[position], entry = byId.get(user.id);
          try {
            if (entry) {
              const counts = summaries.get(user.id);
              if (!counts) throw new Error("Missing reminder summary");
              for (const kind of ["daily","follow_up"] as const) {
                const attempt = counts.attempts.find(attempt => attempt.kind === kind);
                if (attempt && ["sent","expired"].includes(attempt.state)) continue;
                const retry = !!attempt && ["pending","sending","failed"].includes(attempt.state);
                if (!retry && (kind === "daily" ? counts.sent : counts.due === 0)) continue;
                if (!await sendSlot()) { stopped = true; return; }
                try {
                  const result = await deliverReminder(user.id,entry.day,kind,user.notificationEmail || user.email,user.name || "there",counts.due);
                  if (result === "sent") sent++;
                } catch {
                  failed++; errors[position] = true;
                  console.error("Reminder delivery failed",user.id,kind);
                }
              }
            }
            done[position] = true; processed++;
          } catch {
            failed++; errors[position] = true; done[position] = true; processed++;
            console.error("Reminder processing failed",user.id);
          }
        }
      }
      // Cap live delivery claims/connections; no unbounded Promise.all over accounts.
      await Promise.all([worker(),worker()]);
      const pageStart = after;
      let prefix = 0;
      while (prefix < page.length && done[prefix]) { after = page[prefix].id; prefix++; }
      const firstError = errors.findIndex(Boolean);
      if (firstError >= 0 && retryAfter === undefined) {
        const retryPrefix = Math.min(firstError,prefix);
        retryAfter = retryPrefix ? page[retryPrefix-1].id : pageStart;
      }
      if (prefix !== page.length) break;
      if (rows.length <= REMINDER_PAGE_SIZE) { complete = true; break; }
    }
  } catch {
    failed++;
    if (retryAfter === undefined) retryAfter = after;
    console.error("Reminder batch read failed");
  }
  return { success: complete && failed === 0, complete, processed, sent, failed,
    nextCursor: complete ? null : encodeCursor({after,asOf:cursor.asOf}),
    retryCursor: retryAfter === undefined ? null : encodeCursor({after:retryAfter,asOf:cursor.asOf}),
    elapsedMs: Math.max(0,now()-started),
  };
}
