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


## Fast outreach logging and navigation

Use **Log outreach** in the sidebar or Outreach header to open a drawer without
leaving the current page. Save closes the drawer; **Save & add another** clears
contact details and keeps logging open. Enable **Keep company and position** when
logging multiple people at the same company. The full `/outreach/new` page uses
the same form. Additional metadata stays under More details.

Outreach search covers company names, positions, and every contact name across
all pages. Press Enter or Search to apply it. Channel and inclusive Sent date
filters run before pagination; their values persist in the URL. Date presets use
the device calendar and server filtering uses the account's detected timezone.

The Outreach page shows a compact daily/weekly goal and due follow-up summary.
Full goal editing, streaks, and seven-day activity cards are on Stats. Startups
is under More in the sidebar. Existing navigation visibility/order preferences
continue to apply.
