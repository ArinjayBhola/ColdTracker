import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ToastProvider from "@/components/toast-provider";
import { ThemeProvider } from "@/components/theme-provider";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ColdTrack | Professional Outreach CRM",
  description: "Track your job hunt outreach efficiently with a modern dashboard.",
};

import { Providers } from "@/components/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <Providers>
          <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <NextTopLoader color="#2563eb" showSpinner={false} />
              <ToastProvider />
              {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

