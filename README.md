# ❄️ ColdTrack

**ColdTrack** is a powerful, personal outreach management system designed to streamline your networking and job application process. Stop losing track of who you've messaged—organize your cold emails and LinkedIn outreach in one beautiful, centralized dashboard.

## ✨ Key Features

- **🚀 Browser Extension (Lead Capture)**: Instantly capture LinkedIn profiles and company data directly into your dashboard.
- **📋 Extension Leads Management**: Review and refine captured leads before promoting them to active outreach.
- **🚀 Outreach Lifecycle Tracking**: Manage every stage of your outreach from `DRAFT` to `OFFER`.
- **📅 Smart Follow-up Reminders**: Automatically track due dates for follow-ups to ensure you never miss a connection.
- **🏢 Company & Role Management**: Keep detailed records of companies, roles, and key contacts (Recruiters, HR, etc.).
- **🔐 Secure Authentication**: Support for both traditional email/password and social login.
- **📊 Data Intelligence**: Visualize your response rates and outreach efficiency.
- **📥 Import/Export**: Seamlessly handle your data with Excel/XLSX support.
- **🎨 Premium UI/UX**: Built with Tailwind CSS 4 and Radix UI primitives for a sleek, responsive, and accessible experience.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Drizzle ORM](https://orm.drizzle.team/))
- **Authentication**: [NextAuth.js v5](https://authjs.dev/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide Icons](https://lucide.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database instance

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ArinjayBhola/ColdTracker.git
   cd ColdTracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add the following:
   ```env
   # Database
   DATABASE_URL=your_postgresql_connection_string

   # Authentication
   AUTH_SECRET=your_auth_secret_any_random_string
   NEXTAUTH_URL=http://localhost:3000

   # Social Providers (Optional)
   GOOGLE_ID=...
   GOOGLE_SECRET=...
   ```

4. **Initialize the database:**
   ```bash
   npm run db:push
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧩 Browser Extension

The ColdTrack Lead Capture extension allows you to save LinkedIn profiles directly from your browser.

1. **Installation**:
   - Open Chrome and go to `chrome://extensions/`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the `/extension` folder in this repository.
2. **Usage**:
   - Navigate to a LinkedIn profile.
   - Click the extension icon to capture the profile.
   - The lead will appear in your **Extension Leads** dashboard for further review.


## 📂 Project Structure

- `app/`: Next.js App Router pages and layouts.
- `actions/`: Server Actions for database mutations and logic.
- `components/`: Reusable UI components (shadcn-inspired).
- `db/`: Database schema definitions (Drizzle) and connection setup.
- `hooks/`: Custom React hooks.
- `lib/`: Utility functions and shared library configurations.

## Outreach history, contact follow-ups, and reliable reminders

Before deploying these changes to an existing database, run
`npm run db:migrate:reliability`. This transactional, rerunnable migration installs
the status-history trigger, contact IDs, reminder time, and delivery log.
`db:push` alone does not install the trigger or migrate legacy follow-up data.

Status changes are recorded in the same transaction as the outreach update,
including writes from external automation. Response, interview, and offer metrics
retain previously recorded stages after rejection or closure. Charts remain grouped
by initial sent date. The migration records the current status as a baseline;
earlier unrecorded replies cannot be reconstructed. Status history is visible on
the outreach page and included in JSON backups.

Follow-up completion, second due dates, and history now belong to each contact.
The queue shows one row per contact, and opening it selects that person. Existing
company-level follow-up dates are preserved on the first contact only because
the old data does not identify the recipient; review these assignments if needed.
Legacy company-level columns remain for backup compatibility but no longer control
follow-ups. Integrations updating follow-ups should use the contact's JSON fields
and retain its stable ID. Drafts, replies, interviews, rejections, offers, and
closed outreach do not receive follow-up reminders.

The default reminder schedule is compatible with Vercel Hobby: one check daily
at `0 12 * * *` (12:00 UTC / 17:30 India time). Vercel Hobby may invoke it up to
an hour later. No paid plan or additional scheduler is required. Settings shows
this daily schedule instead of offering a custom delivery time the daily job
cannot honor. Daily mode evaluates the current day in each user's saved device
timezone, regardless of their previously saved preferred time, so reminders are
not skipped indefinitely.

Configure `CRON_SECRET` on the server; Vercel sends
`Authorization: Bearer <CRON_SECRET>`. Missing configuration refuses requests
with 503, and invalid credentials return 401. If a separate, more frequent
authenticated scheduler is configured later, set `REMINDER_SCHEDULE_MODE=frequent`
to enable per-user local reminder times (default 17:00). Otherwise leave that
variable unset. Frequent mode sends on the first check after the chosen time,
with catch-up until local midnight. Do not increase the Vercel cron frequency
on the Hobby plan.

The database stores one delivery per account, local date, and reminder kind.
Atomic claims prevent concurrent sends; failed or interrupted attempts can retry
on another invocation after five minutes with the same frozen content, recipient, and provider
idempotency key. Sent entries are retained to prevent repeat delivery. Uncertain
attempts expire after 23 hours, before Resend's 24-hour key window ends, to avoid
duplicate sends. The log records provider acceptance rather than inbox delivery.
The built-in daily schedule does not provide five-minute retries. A failed daily
attempt may expire before the next scheduled run; the next day evaluates whether
a new reminder is needed.
Set `RESEND_API_KEY`, optionally `REMINDER_FROM` for your verified sender, and
`NEXTAUTH_URL` for links. The manual test-email button intentionally sends a new
test message on each click.

Excel exports include outreach with zero contacts, LinkedIn URLs, and each
contact's follow-up dates. JSON backups preserve stage and contact history and the
chosen reminder time; older version-1 backups are still accepted. Delivery logs
are operational records and are not restored from backups.

Checks: `npm run test:reliability` runs offline regression checks.
`npm run test:reliability:db` creates synthetic objects inside a private PostgreSQL
schema and always rolls back the transaction, including the schema. It never
updates application tables or sends emails. A database role with schema creation
permission is required for this integration check.

## Message templates

Open `/templates` from the sidebar to create a private message library. Templates
support an optional email subject, custom categories and tags with searchable
create-or-select dropdowns, separate favorites and pins, search and filters,
duplication, and copying the message or subject. Switch between grid and
single-column views. Templates show newest first, with pinned templates at the top.
Optional character limits show live warnings for the message body; over-limit
drafts can still be saved. The library starts empty with no fixed template types.

For an existing database, run `npm run db:migrate:templates` to apply only the
additive templates migration. New schema setups can also use `npm run db:push`.

## Keyboard shortcuts

Settings lets each user change, unassign, reset, or disable keyboard shortcuts.
Bindings support individual keys, two-key sequences, and modifier combinations
such as `Ctrl+Shift+K`. Conflicting shortcuts are rejected. Saved bindings are
stored per account and drive both navigation and the top-right help button.
Shortcuts pause while typing and while dialogs are open.

Run `npm run db:migrate:shortcuts` on existing databases before deploying this
feature, or use `npm run db:push` for schema-managed setups.

## Appearance controls

Settings offers sixteen app-wide font families, including six handwriting fonts,
and available weights from Extra Light
to Extra Bold, a text size slider and custom 12–24 px values, light/dark/system modes,
reduced motion, and a live typography preview. Appearance changes apply
immediately, sync to the signed-in account, and can be reset to defaults.
Text sizing is independent of layout widths. Controls wrap or grow vertically
and the settings grid stacks when needed to accommodate larger text.
The expanded sidebar fits its content and follows the selected font and text size.

## Account settings and backups

Settings is divided into Account, Appearance, Navigation, Shortcuts, Notifications,
Follow-up rules, Tables, Statistics, and Data tabs. Run
`npm run db:migrate:preferences` on existing databases before deployment.

Account preferences sync on focus, through same-origin tab notifications, and
within a minute on other open devices. Each user can choose a sign-in landing
page, reorder or hide sidebar links, select dashboard columns and page size,
and choose Stats widgets, the default date range, and the heatmap week start.
Follow-up rules control future automatic scheduling; existing and manually
selected due dates are preserved. Weekend skipping rolls Saturday/Sunday to Monday.

Data offers versioned JSON backups and a preview before restoring. Restore merges
into the signed-in account in one transaction without deleting unrelated records.
Passwords and OAuth tokens are excluded. Backups are limited to 5 MB and 5,000
records per data type. Startup tracking requires its catalog startup to exist.

## Follow-up query performance

Before deploying the indexed follow-up queries, run
`npm run db:migrate:follow-up-lookup`. This additive migration installs a derived
contact/date lookup and database triggers, then backfills existing contacts in
250-outreach batches. Each batch briefly locks its source rows to avoid races
with automation; it never updates the source outreach or contacts. The command
is rerunnable and validates the completed lookup. Run it separately from
`db:migrate`; `db:push` alone does not install triggers or backfill this lookup.
If interrupted, rerun it before deploying the query changes.

The contacts JSON remains authoritative. App, import, and external automation
writes update the lookup in the same transaction. Removed contacts and deleted
outreach/accounts remove their derived rows; unrelated edits avoid rewriting
unchanged lookup fields. Fixed-path definer triggers require no additional
table grants for existing source writers. PostgreSQL 16+ is required for safe
date parsing; invalid legacy date strings are excluded from due-date lookups.

Follow-up pages now select indexed contact positions before fetching their JSON.
Dashboard focus uses the same lookup for due counts and indexed date ranges for
daily/weekly activity. `node scripts/check-follow-up-lookup.mjs` compares the
new queries with the previous JSONB queries across categories, stages, dates,
contact/status mutations, and 10,000 synthetic outreach rows, in a private schema
that is always rolled back. `npm run test:reliability:db` additionally exercises
the real follow-up mutation actions and reminder logic without sending emails.
`node scripts/check-follow-ups-api.mjs` checks a local production/dev server,
including a populated migration rerun; set `FOLLOW_UP_TEST_URL` for a different
port. Its disposable source and lookup records are removed afterward.

Follow-up search, contact method, and status filters apply on the server before
pagination, so they cover the complete queue. Search matches company/contact
names and treats `%`, `_`, and backslashes as literal text. Results use 15-row
Previous/Next pages instead of an accumulating infinite list. Changing any
filter starts at page one; inactive page caches expire after a minute. No
additional migration is needed for these filters.
`node scripts/check-follow-ups-browser.mjs` checks unloaded search matches,
combined filters, bounded page navigation, debounce, and mobile layout in Chrome
using a disposable account (and the same `FOLLOW_UP_TEST_URL` setting).

## Statistics performance

Stats reads one database snapshot containing daily cohort counts, heatmap day
counts, saved display preferences, and creation-date goal activity. Individual
outreach records, contacts, and stage histories stay on the server. All four
date ranges are precomputed so changing the range requires no network request.
The initial charts render with the saved device timezone and preferences, and
refresh on stale window focus, timezone changes, local midnight, or the next
future send becoming current; there is no repeating chart-processing interval.
This query uses PostgreSQL 16+ safe timestamp validation (verified on PostgreSQL
17) and requires no schema migration.

Run `node scripts/check-stats-summary.mjs` for rollback-only database parity and
scale checks. Run `node scripts/check-stats-api.mjs` and
`node scripts/check-stats-browser.mjs` against a local production/dev server;
set `STATS_TEST_URL` for a port other than 3000. HTTP/browser fixtures are
disposable and removed after the checks; no emails are sent.

## Client cache freshness

Follow-up pages and outreach details hydrate timestamped server snapshots into
TanStack Query, including existing browser cache entries after a router refresh.
Follow-up query keys include the signed-in owner. Fresh mounts reuse cached data;
stale mounts revalidate, and follow-ups/details also revalidate on stale focus.
Successful outreach changes invalidate follow-up variants and Stats without
fetching inactive views. Deletions clear the matching detail cache. Template
server refreshes replace the displayed list while preserving an open draft;
template save/delete broadcasts from another tab trigger a server refresh without polling.

Run `node scripts/check-cache-freshness.mjs` for cache ordering, invalidation, and
request-count checks. Run `node scripts/check-cache-browser.mjs` against a local
production server (`CACHE_TEST_URL` changes the default port 3000). It verifies
server refreshes, a status edit, and template broadcasts with a disposable account
that is removed afterward. No emails are sent.

## Startup browsing performance

Startup browsing reads the page, search-scoped team-size counts, and personal
outreach summary in one SQL statement. The grid receives only displayed company
fields and outreach status; employee records are not included. Opening Details
loads one authenticated batch of two team members per company plus full counts.
Previews are cached for 60 seconds and keyed by company IDs and update timestamps.
The editor and startup detail page still load the entire team on demand. This
change requires no database migration.

Run `node scripts/check-startup-query.mjs` for rollback-only SQL parity and
performance checks. Run `node scripts/check-startups-browser.mjs` against a local
production server, using `STARTUP_TEST_URL` for a port other than 3000. The browser
check creates disposable catalog rows and a user, then removes them in `finally`;
it verifies lazy previews, API validation, and full-team editing without saving.

## Automation lookup performance

Run `npm run db:migrate:automation-index` on an existing database to add the
`(user_id, outreach_id)` automation-ledger index used by dashboard origin filters
and outreach detail lookups. This additive migration creates the index concurrently
so automation writes remain available. Run it separately from `db:migrate` because
PostgreSQL forbids concurrent index creation inside a transaction. The command is
rerunnable and verifies that the index is valid and ready before reporting success.
If a prior interrupted build left an invalid index, the command fails for manual
inspection rather than removing it automatically.

`npm run test:performance:automation` checks the actual dashboard query against
10,000 synthetic outreach rows in temporary tables, compares plans before and
after indexing, and verifies origin filters, duplicate ledger entries, account
isolation, and pagination. All temporary objects are rolled back. It never edits
application records or sends email.

## Optional email-open activity

Per-message activity can appear directly on `/outreach/[id]`. It is disabled pending
migration approval and deployment verification. See [configuration, limitations
and isolated tests](docs/email-open-tracking.md). No email or migration is run by
opening the page, and existing emails are not retrospectively tracked.

Email activity uses at most three database queries for up to 50 messages, with
the newest 20 events per accepted message fetched in one indexed batch. Run
`node --test scripts/check-email-tracking.cjs` for isolated checks and
`node scripts/check-email-activity-api.mjs` against a local production or dev
server for HTTP regression checks. Set `EMAIL_ACTIVITY_TEST_URL` if the server
uses a port other than 3000. The HTTP checks create disposable accounts and
message records, clean them up, and never send emails.

## In-app notifications

A notification bell appears beside the help button on every signed-in app route.
Each recorded email-open detection creates a persistent inbox item saying
"Open detected for [contact]", using the recipient email when a name is unavailable.
Clicking it marks it read, closes the inbox, and opens the outreach's Email activity
section. The envelope button toggles read/unread with a fading background without
navigating. The inbox supports unread counts, mark all read, and loading older
notifications. Read status syncs across tabs and devices. Dates, times, subjects,
and other email details stay in the outreach's Email activity section.

New detections also show a clickable toast at the bottom right. Opening that toast
marks its notification read and opens the same outreach. Old inbox items do not
produce toasts when signing in or refreshing. Clear individual items with the X
button or use Clear all. Clearing is saved across devices, preserves email activity,
and keeps a deduplication record so delayed tracking updates cannot restore old items.

Run `npm run db:migrate:notifications` against the app database before deploying.
The email tracking tables must already exist. This additive, rerunnable migration
installs database triggers so collector and ERP writes both produce notifications,
including detections recorded before provider acceptance or outreach linkage.
It uses fixed-path definer functions so the collector needs no new table grants.
Existing detections are imported as read history. New detections are unread.
Notifications survive raw-event retention but are removed when their outreach or
account is deleted. Use this migration even when managing tables with Drizzle:
`db:push` alone does not install the triggers.

The open app checks for updates every five seconds and on window focus; background
polling pauses in hidden tabs. Each check uses one compact revision query for the
loaded inbox range and unread count. Loaded history pages are fetched again only
when notifications, read/clear status, or their outreach details change. Loading
older pages does not multiply unchanged polling requests. This needs no migration.
This is an in-app inbox, not browser push when the
app is closed. Detections are image loads, not confirmation of who read an email.
The bell stays available during request failures and offers a retry.

## Follow-up templates

Each account has one editable Follow-up 1 template and one editable Follow-up 2
template. The outreach page and Templates library use the same saved messages;
clicking Edit this template on an outreach opens the matching editor. Insert
`{{companyName}}`, `{{personName}}`, and `{{role}}` from the template editor.
On an outreach, they fill from the company, selected contact, and target role.

Run `npm run db:migrate:follow-ups` to remove old Seen and Not seen variants from
saved follow-up templates. Existing Unknown wording and settings stay attached to
the two linked slots. If one is missing, the migration preserves the most recently
edited older variant for that stage. It removes only variant slots whose IDs
ColdTrack generated; unrelated Templates library messages remain untouched.

Run `node scripts/check-notifications.mjs` for database integration checks. It
creates synthetic records in a transaction and rolls everything back.
