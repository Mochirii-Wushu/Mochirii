import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const notes = [];

const publicRoutes = [
  { route: "/", label: "home", file: "apps/web/app/page.tsx", metadataFile: "apps/web/app/layout.tsx" },
  { route: "/join", key: "join", file: "apps/web/app/join/page.tsx" },
  { route: "/events", key: "events", file: "apps/web/app/events/page.tsx" },
  { route: "/gallery", key: "gallery", file: "apps/web/app/gallery/page.tsx" },
  { route: "/ranks", key: "ranks", file: "apps/web/app/ranks/page.tsx" },
  { route: "/leaders", key: "leaders", file: "apps/web/app/leaders/page.tsx" },
  { route: "/codex", key: "codex", file: "apps/web/app/codex/page.tsx" },
  { route: "/recruitment", key: "recruitment", file: "apps/web/app/recruitment/page.tsx" },
  { route: "/announcements", key: "announcements", file: "apps/web/app/announcements/page.tsx" },
  { route: "/raffles", key: "raffles", file: "apps/web/app/raffles/page.tsx" },
  { route: "/spotify", key: "spotify", file: "apps/web/app/spotify/page.tsx" },
  { route: "/spotlight", key: "spotlight", file: "apps/web/app/spotlight/page.tsx" },
  { route: "/twills", key: "twills", file: "apps/web/app/twills/page.tsx" },
];

const protectedRoutes = [
  { route: "/auth", file: "apps/web/app/auth/page.tsx", expectedFollow: true },
  { route: "/account", file: "apps/web/app/account/page.tsx", expectedFollow: true },
  { route: "/gallery-submit", file: "apps/web/app/gallery-submit/page.tsx", expectedFollow: true },
  { route: "/leader-dashboard", file: "apps/web/app/leader-dashboard/page.tsx", expectedFollow: true },
  { route: "/members", file: "apps/web/app/members/page.tsx", expectedFollow: false },
  { route: "/members/twills", file: "apps/web/app/members/[slug]/page.tsx", expectedFollow: false },
];

const allSmokeRoutes = [...publicRoutes.map((item) => item.route), ...protectedRoutes.map((item) => item.route)];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

function note(message) {
  notes.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertIncludes(label, text, snippet) {
  assert(text.includes(snippet), `${label}: expected snippet not found: ${snippet}`);
}

function assertRouteListed(label, text, route) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert(new RegExp(`["']${escaped}["']`).test(text), `${label}: expected route ${route}`);
}

function checkLayoutObservability() {
  const layout = read("apps/web/app/layout.tsx");

  assertIncludes("root layout", layout, 'import { Analytics } from "@vercel/analytics/next";');
  assertIncludes("root layout", layout, 'import { SpeedInsights } from "@vercel/speed-insights/next";');
  assertIncludes("root layout", layout, "<Analytics />");
  assertIncludes("root layout", layout, "<SpeedInsights />");
  assertIncludes("root layout", layout, "metadataBase: new URL(siteUrl)");
  assertIncludes("root layout", layout, 'canonical: "/"');
}

function checkPublicMetadata() {
  const metadata = read("apps/web/components/public-pages/metadata.ts");

  assertIncludes("public metadata helper", metadata, "openGraph");
  assertIncludes("public metadata helper", metadata, "twitter");
  assertIncludes("public metadata helper", metadata, "canonical: meta.path");
  assertIncludes("public metadata helper", metadata, "metadataFor(page: PageKey)");

  for (const item of publicRoutes) {
    if (item.route === "/") continue;
    const source = read(item.file);
    assertIncludes(item.file, source, `metadataFor("${item.key}")`);
    assertIncludes("public metadata helper", metadata, `${item.key}:`);
    assertIncludes("public metadata helper", metadata, `path: "${item.route}"`);
    assertIncludes("public metadata helper", metadata, "image:");
  }
}

function checkProtectedNoindex() {
  for (const item of protectedRoutes) {
    const source = read(item.file);
    assertIncludes(item.file, source, "robots:");
    assertIncludes(item.file, source, "index: false");
    assertIncludes(item.file, source, `follow: ${item.expectedFollow ? "true" : "false"}`);

    if (item.route !== "/members/twills") {
      assertIncludes(item.file, source, `canonical: "${item.route}"`);
    }
  }
}

function checkDiscoveryFiles() {
  const sitemap = read("apps/web/public/sitemap.xml");
  const robots = read("apps/web/public/robots.txt");

  for (const item of publicRoutes) {
    const loc = item.route === "/" ? "https://mochirii.com/" : `https://mochirii.com${item.route}`;
    assertIncludes("sitemap", sitemap, `<loc>${loc}</loc>`);
  }

  for (const item of protectedRoutes) {
    assert(!sitemap.includes(`https://mochirii.com${item.route}`), `sitemap: protected route must stay excluded: ${item.route}`);
  }

  assertIncludes("robots", robots, "Sitemap: https://mochirii.com/sitemap.xml");
}

function checkProductionSmokeCoverage() {
  const smoke = read("scripts/smoke-vercel-production.mjs");

  for (const route of allSmokeRoutes) {
    assertRouteListed("production route smoke", smoke, route);
  }

  for (const route of ["/auth", "/account", "/gallery-submit", "/leader-dashboard", "/members", "/members/twills"]) {
    assert(smoke.includes(`["${route}",`) || smoke.includes(`['${route}',`), `production body smoke: expected content check for ${route}`);
  }
}

function checkDocs() {
  const deployment = read("docs/deployment.md");
  const currentState = read("docs/current-live-state.md");
  const readme = read("apps/web/README.md");

  assertIncludes("deployment docs", deployment, "Post-deploy observability smoke");
  assertIncludes("deployment docs", deployment, "Cloudflare remains DNS-only");
  assertIncludes("current live state", currentState, "Vercel Web Analytics and Speed Insights");
  assertIncludes("app README", readme, "## Vercel Observability");
}

async function checkLiveIfRequested() {
  if (process.env.MOCHIRII_OBSERVABILITY_LIVE !== "1") {
    note("Live metadata/header read skipped; set MOCHIRII_OBSERVABILITY_LIVE=1 for read-only production route/header verification.");
    return;
  }

  const baseUrl = process.env.MOCHIRII_PRODUCTION_BASE_URL || "https://mochirii.com";
  const requiredHeaders = [
    "content-security-policy",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "cross-origin-opener-policy",
    "x-frame-options",
  ];

  for (const route of allSmokeRoutes) {
    const response = await fetch(new URL(route, baseUrl), {
      headers: { "user-agent": "MochiriiObservabilityMetadataSmoke/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    const html = await response.text();

    assert(response.status === 200, `live ${route}: expected 200, got ${response.status}`);
    assert(/vercel/i.test(response.headers.get("server") || "") || response.headers.get("x-vercel-id"), `live ${route}: expected Vercel headers`);
    for (const header of requiredHeaders) {
      assert(response.headers.get(header), `live ${route}: expected ${header}`);
    }

    if (protectedRoutes.some((item) => item.route === route)) {
      assert(/<meta name="robots" content="noindex,\s*no(?:follow|archive)|<meta name="robots" content="noindex,\s*follow/i.test(html), `live ${route}: expected noindex robots meta`);
    }
  }
}

await checkLiveIfRequested();
checkLayoutObservability();
checkPublicMetadata();
checkProtectedNoindex();
checkDiscoveryFiles();
checkProductionSmokeCoverage();
checkDocs();

for (const message of notes) {
  console.log(`NOTE ${message}`);
}

if (failures.length) {
  console.error("Observability/metadata smoke validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Observability/metadata smoke validation OK (${publicRoutes.length} public routes, ${protectedRoutes.length} protected routes).`);
