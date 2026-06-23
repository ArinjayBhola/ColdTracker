import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import ToastProvider from "@/components/toast-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { AppearanceProvider } from "@/components/appearance-provider";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

// Self-host all three fonts via next/font: preloaded, non-render-blocking, and
// no layout shift. Replaces the remote @import in globals.css that blocked first
// paint and duplicated Inter. Exposed as CSS variables consumed by globals.css.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

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
  themeColor: "#f7f8fb",
};

import { Providers } from "@/components/providers";

// Anti-FOUC script to apply density from localStorage before hydration
const appearanceScript = `
(function() {
  try {
    var d = localStorage.getItem('density');
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
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
        <link
          rel="apple-touch-icon"
          href="/icons/icon-192.png"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange>
            <AppearanceProvider>
              <NextTopLoader
                color="#1f6f9f"
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
