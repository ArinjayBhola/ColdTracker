const assert = require("node:assert/strict");
const { test } = require("node:test");
const createLoader = require("./reliability-test-loader.cjs");
const load = createLoader();
const { buildOutreachAnalytics } = load("lib/outreach-analytics.ts");
const { contactDue, earliestContactDue } = load("lib/contact-follow-ups.ts");
const { reminderDay, validReminderTime } = load("lib/reminder-schedule.ts");
const now = "2026-10-29T12:00:00Z";
const record = (status, history = []) => ({ id: "one", status, statusHistory: history.map(status => ({ status, at: now, source: "observed" })), createdAt: "2026-10-25T10:00:00Z", sentAt: "2026-10-25T10:00:00Z", channel: "Email", followUpDueAt: null });

test("a replied then rejected outreach retains its response in totals, channel and cohort", () => {
  const result = buildOutreachAnalytics([record("REJECTED", ["SENT", "REPLIED", "REJECTED"])], "30", now, "UTC");
  assert.equal(result.responded, 1);
  assert.equal(result.responseRate, 100);
  assert.equal(result.channels[0].responded, 1);
  assert.equal(result.buckets.reduce((total, bucket) => total + bucket.responded, 0), 1);
  assert.equal(result.statuses.find(row => row.status === "REJECTED").count, 1);
});
test("interview and offer history survives closure without double-counting repeated stages", () => {
  const result = buildOutreachAnalytics([record("CLOSED", ["REPLIED", "INTERVIEW", "OFFER", "OFFER", "CLOSED"])], "all", now, "UTC");
  assert.equal(result.responded, 1);
  assert.equal(result.interviews, 1);
  assert.equal(result.offers, 1);
});
test("old rejected records do not invent an unrecorded reply", () => {
  assert.equal(buildOutreachAnalytics([record("REJECTED")], "all", now, "UTC").responded, 0);
});
test("moving a sent record back to draft retains its recorded historical outcomes", () => {
  const result = buildOutreachAnalytics([record("DRAFT", ["SENT", "REPLIED"])], "all", now, "UTC");
  assert.equal(result.sent, 1);
  assert.equal(result.responded, 1);
  const { buildActivityHeatmap } = load("lib/outreach-heatmap.ts");
  assert.equal(buildActivityHeatmap([record("DRAFT", ["SENT", "REPLIED"])], 2026, now, "UTC").total, 1);
});
test("contacts have independent stages and completed contacts do not hide another person's due date", () => {
  const first = { followUpSentAt: now, followUp2DueAt: "2026-11-01T00:00:00Z", followUp2SentAt: now };
  const second = { followUpDueAt: "2026-10-30T00:00:00Z" };
  assert.equal(contactDue(first), null);
  assert.equal(earliestContactDue([first, second]), second.followUpDueAt);
  assert.equal(contactDue({ ...first, followUp2SentAt: null }), first.followUp2DueAt);
});
test("reminder time validation and user timezone boundaries", () => {
  for (const value of ["00:00", "17:00", "23:59"]) assert.equal(validReminderTime(value), true);
  for (const value of ["24:00", "12:60", "5:00", null]) assert.equal(validReminderTime(value), false);
  assert.equal(reminderDay("Asia/Kolkata", "17:30", new Date(now)), "2026-10-29");
  assert.equal(reminderDay("Asia/Kolkata", "17:31", new Date(now)), null);
  assert.equal(reminderDay("America/Los_Angeles", "17:00", new Date(now)), null);
  assert.equal(reminderDay("invalid", "17:00", new Date(now)), null);
  assert.equal(reminderDay("UTC", "00:00", new Date(now)), "2026-10-29");
});
test("reminder clocks follow daylight saving changes", () => {
  assert.equal(reminderDay("America/New_York", "09:00", new Date("2026-03-08T12:59:00Z")), null);
  assert.equal(reminderDay("America/New_York", "09:00", new Date("2026-03-08T13:00:00Z")), "2026-03-08");
});
test("Hobby-compatible daily schedule does not skip later saved reminder times", () => {
  const config = require("../vercel.json");
  assert.equal(config.crons.length, 1);
  assert.equal(config.crons[0].schedule, "0 12 * * *");
  assert.equal(reminderDay("Asia/Kolkata", "23:59", new Date(now), "daily"), "2026-10-29");
  assert.equal(reminderDay("America/Los_Angeles", "23:59", new Date(now), "daily"), "2026-10-29");
  assert.equal(reminderDay("Asia/Kolkata", "23:59", new Date(now), "frequent"), null);
  assert.equal(reminderDay("invalid", "17:00", new Date(now), "daily"), null);
});
test("daily reminder settings keep the email editable without promising a custom time", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { NotificationSettings } = createLoader({
    react: { ...React, useTransition: () => [false, () => {}] },
    "@/actions/settings": { updateNotificationSettingsAction() {}, sendTestEmailAction() {} },
    "@/hooks/use-toast": { useToast: () => ({ toast() {} }) },
  })("components/settings/notification-settings.tsx");
  const props = { initialEmail: "synthetic@example.invalid", initialReceiveNotifications: true, initialReminderTime: "23:00" };
  const daily = renderToStaticMarkup(React.createElement(NotificationSettings, props));
  assert.match(daily, /type="email"[^>]*name="notificationEmail"|name="notificationEmail"[^>]*type="email"/);
  assert.match(daily, /synthetic@example.invalid/);
  assert.match(daily, /Daily reminder schedule/);
  assert.doesNotMatch(daily, /type="time"/);
  const frequent = renderToStaticMarkup(React.createElement(NotificationSettings, { ...props, customTimeEnabled: true }));
  assert.match(frequent, /type="time"/);
});
test("scheduler refuses missing and incorrect secrets before querying or sending", async () => {
  const previous = process.env.CRON_SECRET;
  let queried = false;
  const route = createLoader({ "@/db": { db: new Proxy({}, { get() { queried = true; throw Error("Unexpected query"); } }) }, "@/lib/reminder-delivery": {} })("app/api/cron/notifications/route.ts");
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await route.GET(new Request("http://localhost"))).status, 503);
    process.env.CRON_SECRET = "test-secret";
    assert.equal((await route.GET(new Request("http://localhost"))).status, 401);
    assert.equal((await route.GET(new Request("http://localhost", { headers: { authorization: "Bearer wrong" } }))).status, 401);
    assert.equal(queried, false);
  } finally { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; }
});
test("Excel exports every record, including empty contacts, with LinkedIn URLs", async () => {
  const rows = [
    { companyName: "No contacts", roleTargeted: "Engineer", contacts: [], status: "DRAFT" },
    { companyName: "Two contacts", roleTargeted: "Engineer", status: "SENT", contacts: [
      { personName: "One", linkedinProfileUrl: "https://www.linkedin.com/in/one" },
      { personName: "Two", emailAddress: "two@example.com" },
    ] },
  ];
  let exported;
  let written = false;
  const component = createLoader({
    "react": { useState: () => [false, () => {}] },
    "@/components/ui/button": { Button: "button" },
    "@/hooks/use-toast": { useToast: () => ({ toast() {} }) },
    "@/actions/outreach": { getOutreachForExport: async () => rows },
    "xlsx": { utils: { json_to_sheet(data) { exported = data; return {}; }, book_new: () => ({}), book_append_sheet() {} }, writeFile() { written = true; } },
  })("components/export-excel.tsx");
  await component.ExportExcel({}).props.onClick();
  assert.equal(written, true);
  assert.equal(exported.length, 3);
  assert.equal(exported[0].Company, "No contacts");
  assert.equal(exported[0]["Contact Count"], 0);
  assert.equal(exported[1]["LinkedIn URL"], "https://www.linkedin.com/in/one");
});

test("version-1 backups retain contact and stage history while accepting older backups", () => {
  const { readBackup } = load("lib/backup.ts");
  const { DEFAULT_PREFERENCES } = load("lib/preferences.ts");
  const { defaultShortcutPreferences } = load("lib/keyboard-shortcuts.ts");
  const contact = { id: "11111111-1111-4111-a111-111111111111", personName: "One", personRole: "HR", contactMethod: "EMAIL",
    followUpSentAt: now, followUp2DueAt: now, followUp2SentAt: null,
    followUpHistory: [{ stage: 1, action: "sent", at: now, date: now }] };
  const history = [{ status: "REPLIED", source: "observed", at: now }];
  const backup = { format: "coldtrack-backup", version: 1, exportedAt: now,
    outreach: [{ id: "22222222-2222-4222-a222-222222222222", companyName: "Test", companyLink: null, roleTargeted: "Engineer",
      applicationSource: "DIRECT_EMAIL", applicationStatus: "SENT", applicationUrl: null, status: "REJECTED", statusHistory: history,
      notes: null, contacts: [contact], createdAt: now, updatedAt: now, followUpSentAt: null, followUp2DueAt: null, followUp2SentAt: null }],
    templates: [], extensionLeads: [], startupTracking: [],
    settings: { preferences: DEFAULT_PREFERENCES, keyboardShortcuts: defaultShortcutPreferences, notificationEmail: null, receiveNotifications: true, reminderTime: "09:15", goals: null },
  };
  const parsed = readBackup(backup);
  assert.deepEqual(parsed.outreach[0].contacts[0], contact);
  assert.deepEqual(parsed.outreach[0].statusHistory, history);
  assert.equal(parsed.settings.reminderTime, "09:15");
  delete backup.outreach[0].statusHistory;
  delete backup.settings.reminderTime;
  backup.outreach[0].contacts = [{ personName: "Old", personRole: "HR", contactMethod: "EMAIL" }];
  assert.deepEqual(readBackup(backup).outreach[0].statusHistory, []);
});

test("reminder content escapes recipient names", () => {
  const { buildReminderEmail } = createLoader({ resend: { Resend: class {} } })("lib/resend.ts");
  const email = buildReminderEmail("follow_up", "synthetic@example.com", '<img src=x onerror="bad">', 2);
  assert.doesNotMatch(email.html, /<img/);
  assert.match(email.html, /&lt;img/);
  assert.match(email.html, /2<\/strong>/);
});
