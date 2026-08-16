import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

/* Warm editorial: an old-style serif for display against a neutral grotesk
   body. See docs/BRIEF.md §5. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.role}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.role}`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  /** Parallel route slot. Holds the intercepted, focused project view. */
  modal: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="focus:bg-accent focus:text-bg sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        {children}
        {modal}
      </body>
    </html>
  );
}
