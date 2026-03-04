import type { Metadata, Viewport } from "next";
import { Recursive } from "next/font/google";
import ToastProvider from "@/components/toast-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { AppearanceProvider } from "@/components/appearance-provider";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const recursive = Recursive({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ColdTrack | Professional Outreach CRM",
  description: "Track your job hunt outreach efficiently with a modern dashboard.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ColdTrack",
  },
};

export const viewport: Viewport = {
  themeColor: "#6d4c41",
};

import { Providers } from "@/components/providers";

// Anti-FOUC script to apply theme/density from localStorage before hydration
const appearanceScript = `
(function() {
  try {
    var t = localStorage.getItem('color-theme');
    var d = localStorage.getItem('density');
    if (t && t !== 'default') document.documentElement.setAttribute('data-theme', t);
    if (d && d !== 'comfortable') document.documentElement.setAttribute('data-density', d);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
        <link
          rel="apple-touch-icon"
          href="/icons/icon-192.png"
        />
      </head>
      <body className={`${recursive.className} min-h-screen bg-background text-foreground antialiased`}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange>
            <AppearanceProvider>
              <NextTopLoader
                color="#2563eb"
                showSpinner={false}
              />
              <ToastProvider />
              {children}
            </AppearanceProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
