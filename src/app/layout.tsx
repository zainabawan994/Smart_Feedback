import type { Metadata } from "next";
import { Fraunces, Bricolage_Grotesque, IBM_Plex_Mono, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import ThemeToggle, { THEME_SCRIPT } from "@/components/ThemeToggle";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "opsz"] });
const grotesk = Bricolage_Grotesque({ variable: "--font-grotesk", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });
const nastaliq = Noto_Nastaliq_Urdu({ variable: "--font-nastaliq", subsets: ["arabic"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "Tavo — Real feedback. Smarter reviews.",
  description: "Customers tap three things about their visit. We help them say it in their own words.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the head script sets data-theme before React loads.
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${grotesk.variable} ${mono.variable} ${nastaliq.variable} antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
