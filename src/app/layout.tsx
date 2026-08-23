import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Bodoni_Moda, IBM_Plex_Mono, Inter } from "next/font/google";
import { site } from "@/lib/site";
import { identityGraph, jsonLd } from "@/lib/schema";
import { Telemetry } from "@/components/Telemetry";
import "./globals.css";

/* Display: a high-contrast face drawn with rule and compass, which is the same
   argument the lattice makes. Replaced Fraunces, whose warmth belonged to the
   cream palette that decision 7 retired. It appears in four places on the page
   — the name, "About", and the two heading levels inside an open project — so
   it is a signature, not a workhorse. */
const display = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

/* Body stays Inter. Every word a reader actually reads is set in it, so this
   is the one role where being unremarkable is the requirement. */
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body-face",
  display: "swap",
});

/* Data only — years, stack chips, metadata labels. Never prose: this is the
   evidence register and it stops being one the moment it decorates a sentence. */
const data = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-data-face",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.role}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  // Resolved against `metadataBase` per route, so every page declares itself
  // canonical at the apex regardless of the hostname it was reached on.
  alternates: { canonical: "./" },
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
    <html
      lang="en-GB"
      className={`${display.variable} ${body.variable} ${data.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="focus:bg-accent focus:text-bg sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        {children}
        {modal}

        {/* Who this is, for a reader that never renders the page. Not visible,
            not styled, and deliberately in the layout rather than the home page
            so a shared project link carries the identity too — that is the URL
            most likely to be the first one anybody sees.

            `application/ld+json` is not executable, so `script-src` never
            evaluates it; this stays valid if the policy is ever tightened past
            the `'unsafe-inline'` that decision 19 explains. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(identityGraph()) }}
        />

        {/* Vercel Web Analytics. Chosen over Plausible, which the roadmap had
            assumed: this is free, needs no cookie banner because it sets no
            cookies, and inlines nothing at build. It is inert outside a Vercel
            deployment, so local runs stay clean. */}
        <Analytics />
        {/* Page views cover every route this site owns. This covers leaving it
            — the CV, the email, the repositories, the deployed apps — which is
            the half a portfolio actually needs to know about. */}
        <Telemetry />
      </body>
    </html>
  );
}
