import { Resend } from "resend";

type ReminderEmail = { from: string; to: string[]; subject: string; html: string };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export function buildReminderEmail(kind: "daily" | "follow_up", to: string, name: string, pendingCount = 0): ReminderEmail {
  const base = (process.env.NEXTAUTH_URL || "https://cold-track.arinjay.dev").replace(/\/$/, "");
  const followUp = kind === "follow_up";
  const href = escapeHtml(`${base}/${followUp ? "follow-ups" : "outreach/new"}`);
  return {
    from: process.env.REMINDER_FROM || "ColdTracker <notifications@resend.dev>",
    to: [to],
    subject: followUp ? `Pending Follow-ups Reminder (${pendingCount})` : "Daily Outreach Reminder",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">
      <h2>Hi ${escapeHtml(name)},</h2>
      <p>${followUp ? `You have <strong>${pendingCount}</strong> contact follow-ups due today or overdue.` : "You haven't recorded any outreach sent today."}</p>
      <p><a href="${href}">${followUp ? "View follow-up queue" : "Log today's outreach"}</a></p>
      <p>Happy tracking,<br>The ColdTracker Team</p></div>`,
  };
}

export async function sendReminderEmail(payload: ReminderEmail, idempotencyKey?: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send(payload, idempotencyKey ? { idempotencyKey } : undefined);
}

export async function sendDailyOutreachReminder(to: string, name: string) {
  try {
    const result = await sendReminderEmail(buildReminderEmail("daily", to, name));
    return { success: !result.error && !!result.data?.id, ...result };
  } catch (error) { return { success: false, error }; }
}

export async function sendFollowUpReminder(to: string, name: string, pendingCount: number) {
  try {
    const result = await sendReminderEmail(buildReminderEmail("follow_up", to, name, pendingCount));
    return { success: !result.error && !!result.data?.id, ...result };
  } catch (error) { return { success: false, error }; }
}
