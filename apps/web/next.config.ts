import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import publicUrls from "./config/public-urls.json";

const appRoot = dirname(fileURLToPath(import.meta.url));
const mochiPetsOrigin = (process.env.NEXT_PUBLIC_MOCHI_PETS_URL || publicUrls.mochiPetsDefaultOrigin).replace(/\/+$/, "");

const legacyHtmlRedirects = [
  ["/index.html", "/"],
  ["/join.html", "/join"],
  ["/gallery.html", "/gallery"],
  ["/leaders.html", "/leaders"],
  ["/ranks.html", "/ranks"],
  ["/events.html", "/events"],
  ["/announcements.html", "/announcements"],
  ["/raffles.html", "/raffles"],
  ["/recruitment.html", "/recruitment"],
  ["/auth.html", "/auth"],
  ["/account.html", "/account"],
  ["/social.html", "/social"],
  ["/gallery-submit.html", "/gallery-submit"],
  ["/spotify.html", "/spotify"],
  ["/spotlight.html", "/spotlight"],
  ["/twills.html", "/twills"],
  ["/leader-dashboard.html", "/leader-dashboard"],
] as const;

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://cdn.discordapp.com https://media.discordapp.net https://i.scdn.co https://*.scdn.co",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  `frame-src 'self' https://discord.com https://open.spotify.com ${mochiPetsOrigin}`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://discord.com https://cdn.discordapp.com https://vitals.vercel-insights.com ${mochiPetsOrigin}`,
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Access-Control-Allow-Origin",
    value: publicUrls.siteOrigin,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
] as const;

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [...securityHeaders],
      },
    ];
  },
  async redirects() {
    return legacyHtmlRedirects.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
