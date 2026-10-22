import { PreferencesProvider } from "@/components/preferences-provider";
import { UserClock } from "@/components/user-clock";
import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, JetBrains_Mono, Roboto, Open_Sans, Lato, Montserrat, Poppins, Nunito, Source_Sans_3, Caveat, Kalam, Patrick_Hand, Handlee, Indie_Flower, Architects_Daughter } from "next/font/google";
import { APPEARANCE_KEY, FONT_OPTIONS } from "@/lib/appearance";
import ToastProvider from "@/components/toast-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { AppearanceProvider } from "@/components/appearance-provider";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

// Self-host fonts through next/font. Only the three default families preload;
// optional appearance fonts load when used. CSS variables drive user choices.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto", display: "swap", preload: false });
const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans", display: "swap", preload: false });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700"], variable: "--font-lato", display: "swap", preload: false });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap", preload: false });
const poppins = Poppins({ subsets: ["latin"], weight: ["200", "300", "400", "500", "600", "700", "800"], variable: "--font-poppins", display: "swap", preload: false });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap", preload: false });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans", display: "swap", preload: false });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap", preload: false });
const kalam = Kalam({ subsets: ["latin"], weight: ["300", "400", "700"], variable: "--font-kalam", display: "swap", preload: false });
const patrickHand = Patrick_Hand({ subsets: ["latin"], weight: "400", variable: "--font-patrick-hand", display: "swap", preload: false });
const handlee = Handlee({ subsets: ["latin"], weight: "400", variable: "--font-handlee", display: "swap", preload: false });
const indieFlower = Indie_Flower({ subsets: ["latin"], weight: "400", variable: "--font-indie-flower", display: "swap", preload: false });
const architectsDaughter = Architects_Daughter({ subsets: ["latin"], weight: "400", variable: "--font-architects-daughter", display: "swap", preload: false });

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

// Apply saved typography before hydration.
const appearanceScript = `
(function() {
  try {
    var p = JSON.parse(localStorage.getItem('${APPEARANCE_KEY}') || '{}');
    var fonts = ${JSON.stringify(FONT_OPTIONS)};
    var font = fonts.find(function(f) { return f.id === (p.font || p.bodyFont); });
    var html = document.documentElement;
    if (font) html.style.setProperty('--app-font', font.family);
    if ([200,300,400,500,600,700,800].includes(p.fontWeight)) html.style.setProperty('--app-font-weight', p.fontWeight);
    html.style.removeProperty('font-size');
    if (typeof p.fontSize === 'number' && p.fontSize >= 12 && p.fontSize <= 24) html.style.setProperty('--app-text-size', p.fontSize + 'px');
    if (p.reducedMotion === true) html.dataset.reducedMotion = 'true';
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
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} ${roboto.variable} ${openSans.variable} ${lato.variable} ${montserrat.variable} ${poppins.variable} ${nunito.variable} ${sourceSans.variable} ${caveat.variable} ${kalam.variable} ${patrickHand.variable} ${handlee.variable} ${indieFlower.variable} ${architectsDaughter.variable}`}
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
            <PreferencesProvider>
              <NextTopLoader
                color="#1f6f9f"
                showSpinner={false}
              />
              <ToastProvider />
              <KeyboardShortcuts />
              <UserClock />
              {children}
            </PreferencesProvider>
            </AppearanceProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
