import type { NextConfig } from "next";
import { assertProductionConfig } from "./lib/env-check";

// Fail the production build early if required public config is missing (CFG-01, LEG-01).
assertProductionConfig();

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // The app doesn't use next/image. Disabling the optimizer removes the /_next/image
  // endpoint and with it the only runtime path into sharp/libvips (audit DEP-01).
  images: { unoptimized: true },
  outputFileTracingIncludes: {
    "/api/share/**": ["./assets/fonts/**"],
    "/api/admin/demo/share/**": ["./assets/fonts/**"],
    "/api/app-icon/**": ["./assets/fonts/**"],
    "/opengraph-image": ["./assets/fonts/**"],
    "/apple-icon": ["./assets/fonts/**"],
    "/api/**": ["./supabase/migrations/**"],
  },
  poweredByHeader: false,
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    // CSP (audit SEC-03). Production only: dev needs eval + websocket for hot reload.
    // 'unsafe-inline' for scripts is required by Next's inline bootstrap without nonces;
    // everything else is locked to our own origin (all Supabase calls are server-side).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "media-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "manifest-src 'self'",
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...(isProd
            ? [
                { key: "Content-Security-Policy", value: csp },
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
