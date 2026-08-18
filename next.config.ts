import type { NextConfig } from "next";
import path from "node:path";

/**
 * Content Security Policy.
 *
 * Tight, because this site earned the right to be: `next/font` self-hosts both
 * faces at build time, Vercel Analytics serves and receives on this origin, and
 * there is no third-party script, iframe, tracker or font CDN anywhere. So
 * every directive below can be `'self'` rather than a list of vendors.
 *
 * **`script-src` allows `'unsafe-inline'`, deliberately.** Next's hydration
 * bootstrap is an inline script whose contents change every build, so the
 * alternatives are a per-request nonce or a per-build hash. A nonce requires
 * middleware and opts every page into dynamic rendering — this site is entirely
 * static, renders in 0.7s, and would lose that to buy protection against an
 * injection vector it does not have: no forms, no query rendering, no user
 * input, no database. The honest trade is to say so here rather than to ship a
 * policy that looks stricter than it is.
 *
 * `style-src` allows it for the same practical reason: the artefacts carry
 * computed inline styles for grid placement and the camera's transforms.
 */
/**
 * Development needs two things production does not, and saying so here is
 * better than loosening the shipped policy to match:
 *
 * - `'unsafe-eval'`, because Next's dev server and React Fast Refresh evaluate
 *   modules that way. Production bundles do not.
 * - `va.vercel-scripts.com`, because `@vercel/analytics` pulls a *debug* script
 *   from that host in development. On a real deployment the script is served
 *   from this origin instead, which is why the live site reports no violations.
 *
 * Without this split the strict policy silently breaks hot reload and fills the
 * console with violations — which is how a real error gets missed.
 */
const dev = process.env.NODE_ENV === "development";

const scriptSrc = dev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com"
  : "script-src 'self' 'unsafe-inline'";

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  dev
    ? "connect-src 'self' ws: https://va.vercel-scripts.com"
    : "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Redundant beside `frame-ancestors` for modern browsers, kept for old ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Nothing here needs a device. Denying them outright means a future
    // dependency cannot quietly start asking.
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the workspace root. Without this, Turbopack walks up and finds an
  // unrelated package-lock.json in C:\Users\Zain and warns on every build.
  turbopack: { root: path.resolve(import.meta.dirname) },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  /**
   * One canonical hostname.
   *
   * `www` and the apex both resolve to this deployment, so without this they
   * serve identical content on two hostnames — which splits any ranking signal
   * and gives anyone linking the site two different addresses for it. A 308 at
   * the edge is cheaper and more certain than relying on a canonical tag being
   * honoured.
   *
   * Done here rather than in the Vercel dashboard so the rule lives with the
   * code that depends on it, and survives the project being recreated.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.zain.org.uk" }],
        destination: "https://zain.org.uk/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
