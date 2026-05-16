import type { Metadata } from "next";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Display serif — variable axes (optical size + softness) give us bookish
// elegance for headings without a second font for hero numbers.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT"],
  display: "swap",
});

// Body sans — humanist, dignified, faintly French-government.
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

// Mono for timestamps, IDs, money. Plex Mono has the right typewriter feel.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portside Time",
  description: "Portside Logistics — time & attendance",
  // PWA scaffolding lands in a later PR (manifest + service worker);
  // these help mobile "Add to Home Screen" already.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Portside Time",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
