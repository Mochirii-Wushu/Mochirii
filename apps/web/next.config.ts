import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const legacyHtmlRedirects = [
  ["/index.html", "/"],
  ["/join.html", "/join"],
  ["/gallery.html", "/gallery"],
  ["/leaders.html", "/leaders"],
  ["/ranks.html", "/ranks"],
  ["/codex.html", "/codex"],
  ["/events.html", "/events"],
  ["/announcements.html", "/announcements"],
  ["/raffles.html", "/raffles"],
  ["/recruitment.html", "/recruitment"],
  ["/auth.html", "/auth"],
  ["/account.html", "/account"],
  ["/gallery-submit.html", "/gallery-submit"],
  ["/spotify.html", "/spotify"],
  ["/spotlight.html", "/spotlight"],
  ["/twills.html", "/twills"],
  ["/leader-dashboard.html", "/leader-dashboard"],
] as const;

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
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
