# ❄️ ColdTrack

**ColdTrack** is a powerful, personal outreach management system designed to streamline your networking and job application process. Stop losing track of who you've messaged—organize your cold emails and LinkedIn outreach in one beautiful, centralized dashboard.

## ✨ Key Features

- **🚀 Outreach Lifecycle Tracking**: Manage every stage of your outreach from `DRAFT` to `OFFER`.
- **📅 Smart Follow-up Reminders**: Automatically track due dates for follow-ups to ensure you never miss a connection.
- **🏢 Company & Role Management**: Keep detailed records of companies, roles, and key contacts (Recruiters, HR, etc.).
- **🔐 Secure Authentication**: Support for both traditional email/password and social login.
- **📊 Data Intelligence**: (Coming Soon) Visualize your response rates and outreach efficiency.
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

## 📂 Project Structure

- `app/`: Next.js App Router pages and layouts.
- `actions/`: Server Actions for database mutations and logic.
- `components/`: Reusable UI components (shadcn-inspired).
- `db/`: Database schema definitions (Drizzle) and connection setup.
- `hooks/`: Custom React hooks.
- `lib/`: Utility functions and shared library configurations.
