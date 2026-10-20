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
single-column views and sort by creation date in either direction; pinned
templates stay at the top.
Optional character limits show live warnings for the message body; over-limit
drafts can still be saved. The library starts empty with no fixed template types.

For an existing database, run `npm run db:migrate:templates` to apply only the
additive templates migration. New schema setups can also use `npm run db:push`.
