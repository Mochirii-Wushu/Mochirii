import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SITE_ORIGIN } from "./lib/public-urls.mjs";

const root = process.cwd();
const failures = [];
const notes = [];
const retiredGameSlug = ["mochi", "social"].join("-");
const routeMatrix = JSON.parse(readFileSync(path.join(root, "apps/web/config/app-route-matrix.v1.json"), "utf8"));
const productionSmokeRoutes = new Set(
  routeMatrix.routes
    .filter((route) => route.kind === "page" && route.productionSmoke === true)
    .map((route) => route.path),
);

const publicMetadataOverrides = new Map([
  ["/", { label: "home", metadataFile: "apps/web/app/layout.tsx" }],
  ["/join", { key: "join" }],
  ["/events", { key: "events" }],
  ["/gallery", { key: "gallery" }],
  ["/ranks", { key: "ranks" }],
  ["/leaders", { key: "leaders" }],
  ["/tome", { key: "tome" }],
  ["/recruitment", { key: "recruitment" }],
  ["/announcements", { key: "announcements" }],
  ["/raffle", { key: "raffle" }],
  ["/spotify", { key: "spotify" }],
  ["/spotlight", { key: "spotlight" }],
  ["/twills", { key: "twills" }],
  ["/games/mochi-pets", { key: "mochiPets" }],
]);
const publicPageEntries = routeMatrix.routes.filter(
  (entry) => entry.kind === "page" && entry.surface === "public" && !entry.path.includes("["),
);
const publicPagePaths = new Set(publicPageEntries.map((entry) => entry.path));
for (const entry of publicPageEntries) {
  if (!publicMetadataOverrides.has(entry.path)) fail(`public metadata behavior is missing for classified route: ${entry.path}`);
}
for (const routePath of publicMetadataOverrides.keys()) {
  if (!publicPagePaths.has(routePath)) fail(`public metadata behavior references an unclassified route: ${routePath}`);
}
const publicRoutes = publicPageEntries.map((entry) => ({
  route: entry.path,
  file: `apps/web/${entry.source}`,
  ...(publicMetadataOverrides.get(entry.path) || {}),
}));

const protectedMetadataOverrides = new Map([
  ["/auth", { expectedFollow: true, expectedCanonical: "self" }],
  ["/account", { expectedFollow: true, expectedCanonical: "self" }],
  ["/gallery-submit", { expectedFollow: true, expectedCanonical: "self" }],
  ["/leader-dashboard", { expectedFollow: true, expectedCanonical: "self" }],
  ["/leader-dashboard/raffle", { expectedFollow: false, expectedCanonical: "null" }],
  ["/oauth/consent", { expectedFollow: false, expectedCanonical: "self" }],
  ["/raffle/claim", { expectedFollow: false, expectedCanonical: "null" }],
  ["/social", { expectedFollow: false, expectedCanonical: "self" }],
]);
const protectedPageEntries = routeMatrix.routes.filter(
  (entry) => entry.kind === "page"
    && ["member", "moderator"].includes(entry.surface)
    && !entry.path.includes("["),
);
const protectedPagePaths = new Set(protectedPageEntries.map((entry) => entry.path));
for (const entry of protectedPageEntries) {
  if (!protectedMetadataOverrides.has(entry.path)) fail(`protected metadata behavior is missing for classified route: ${entry.path}`);
}
for (const routePath of protectedMetadataOverrides.keys()) {
  if (!protectedPagePaths.has(routePath)) fail(`protected metadata behavior references an unclassified route: ${routePath}`);
}
const protectedRoutes = protectedPageEntries.map((entry) => ({
  route: entry.path,
  file: `apps/web/${entry.source}`,
  ...(protectedMetadataOverrides.get(entry.path) || {}),
}));

const retiredRoutes = [
  { route: "/members", file: "apps/web/app/members/page.tsx" },
  { route: "/members/twills", file: "apps/web/app/members/[slug]/page.tsx" },
  { route: `/games/${retiredGameSlug}`, file: `apps/web/app/games/${retiredGameSlug}/page.tsx` },
  { route: "/raffle/rules", file: "apps/web/app/raffle/rules/page.tsx" },
  { route: "/raffle/rules/example-cycle", file: "apps/web/app/raffle/rules/[version]/page.tsx" },
];

const noindexRoutes = [...protectedRoutes];

const allSmokeRoutes = [...productionSmokeRoutes];

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
  const routeShell = read("apps/web/components/SiteRouteShell.tsx");
  const ordinaryShell = read("apps/web/components/OrdinarySiteShell.tsx");

  assertIncludes("root layout", layout, 'import { SiteRouteShell } from "@/components/SiteRouteShell";');
  assertIncludes("root layout", layout, 'import { SITE_ORIGIN } from "@/lib/public-urls";');
  assertIncludes("root layout", layout, "<SiteRouteShell>{children}</SiteRouteShell>");
  assertIncludes("root layout", layout, "metadataBase: new URL(SITE_ORIGIN)");
  assertIncludes("root layout", layout, 'canonical: "/"');

  assertIncludes("route-aware site shell", routeShell, 'pathname === "/spinner"');
  assertIncludes("route-aware site shell", routeShell, 'pathname.startsWith("/spinner/")');
  assertIncludes("route-aware site shell", routeShell, "isIsolatedPrivateRafflePath(pathname)");
  assertIncludes("route-aware site shell", routeShell, "return children;");
  assertIncludes("route-aware site shell", routeShell, 'import("@/components/OrdinarySiteShell")');
  assertIncludes("ordinary site shell", ordinaryShell, 'import { Analytics } from "@vercel/analytics/next";');
  assertIncludes("ordinary site shell", ordinaryShell, 'import { SpeedInsights } from "@vercel/speed-insights/next";');
  assertIncludes("ordinary site shell", ordinaryShell, "<Analytics />");
  assertIncludes("ordinary site shell", ordinaryShell, "<SpeedInsights />");
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
  for (const item of noindexRoutes) {
    const source = read(item.file);
    assertIncludes(item.file, source, "robots:");
    assertIncludes(item.file, source, "index: false");
    assertIncludes(item.file, source, `follow: ${item.expectedFollow ? "true" : "false"}`);
    if (item.expectedCanonical === "null") assertIncludes(item.file, source, "canonical: null");
    else assertIncludes(item.file, source, `canonical: "${item.route}"`);
  }
}

function checkRetiredRoutes() {
  const smoke = read("scripts/smoke-vercel-production.mjs");

  for (const item of retiredRoutes) {
    assert(!existsSync(path.join(root, item.file)), `${item.file}: retired route file must stay removed.`);
    if (item.route === `/games/${retiredGameSlug}`) {
      assertIncludes("production retired route smoke", smoke, "retiredGameRoute");
    } else {
      assertRouteListed("production retired route smoke", smoke, item.route);
    }
  }
}

function checkDiscoveryFiles() {
  const sitemap = read("apps/web/public/sitemap.xml");
  const robots = read("apps/web/public/robots.txt");

  for (const item of publicRoutes) {
    const loc = item.route === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${item.route}`;
    assertIncludes("sitemap", sitemap, `<loc>${loc}</loc>`);
  }

  for (const item of noindexRoutes) {
    assert(!sitemap.includes(`${SITE_ORIGIN}${item.route}`), `sitemap: protected route must stay excluded: ${item.route}`);
  }

  for (const item of retiredRoutes) {
    assert(!sitemap.includes(`${SITE_ORIGIN}${item.route}`), `sitemap: retired route must stay excluded: ${item.route}`);
  }

  assertIncludes("robots", robots, `Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
}

function checkProductionSmokeCoverage() {
  const smoke = read("scripts/smoke-vercel-production.mjs");
  assertIncludes("production route smoke", smoke, "app-route-matrix.v1.json");
  assertIncludes("production route smoke", smoke, "route.productionSmoke === true");

  for (const route of allSmokeRoutes) {
    assert(productionSmokeRoutes.has(route), `production route matrix: expected route ${route}`);
  }

  for (const route of ["/auth", "/account", "/gallery-submit", "/leader-dashboard", "/games/mochi-pets"]) {
    assert(smoke.includes(`["${route}",`) || smoke.includes(`['${route}',`), `production body smoke: expected content check for ${route}`);
  }
}

function checkDocs() {
  const deployment = read("docs/operations/deployment.md");
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

  const baseUrl = process.env.MOCHIRII_PRODUCTION_BASE_URL || SITE_ORIGIN;
  const requiredHeaders = [
    "content-security-policy",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "cross-origin-opener-policy",
    "x-frame-options",
  ];

  for (const route of allSmokeRoutes) {
    const url = new URL(route, baseUrl);
    const response = await fetch(url, {
      headers: { "user-agent": "MochiriiObservabilityMetadataSmoke/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    const html = await response.text();

    assert(response.status === 200, `live ${route}: expected 200, got ${response.status}`);
    assert(/vercel/i.test(response.headers.get("server") || "") || response.headers.get("x-vercel-id"), `live ${route}: expected Vercel headers`);
    for (const header of requiredHeaders) {
      assert(response.headers.get(header), `live ${route}: expected ${header}`);
    }

    if (publicRoutes.some((item) => item.route === route)) {
      await checkLivePublicMetadata({ route, url, html, baseUrl });
    }

    if (noindexRoutes.some((item) => item.route === route)) {
      assert(/<meta name="robots" content="noindex,\s*no(?:follow|archive)|<meta name="robots" content="noindex,\s*follow/i.test(html), `live ${route}: expected noindex robots meta`);
    }
  }
}

async function checkLivePublicMetadata({ route, url, html, baseUrl }) {
  const canonical = extractLink(html, "canonical");
  const expectedCanonical = route === "/" ? `${baseUrl}/` : `${baseUrl}${route}`;
  assert(normalizeUrl(canonical) === normalizeUrl(expectedCanonical), `live ${route}: expected canonical ${expectedCanonical}, got ${canonical || "missing"}`);

  const requiredMeta = [
    ["og:title", "property"],
    ["og:description", "property"],
    ["og:url", "property"],
    ["og:image", "property"],
    ["twitter:card", "name"],
    ["twitter:title", "name"],
    ["twitter:description", "name"],
    ["twitter:image", "name"],
  ];

  for (const [name, attribute] of requiredMeta) {
    const value = extractMeta(html, attribute, name);
    assert(value, `live ${route}: expected ${name} metadata`);
  }

  const ogUrl = extractMeta(html, "property", "og:url");
  assert(normalizeUrl(ogUrl) === normalizeUrl(expectedCanonical), `live ${route}: expected og:url ${expectedCanonical}, got ${ogUrl || "missing"}`);
  assert(extractMeta(html, "name", "twitter:card") === "summary_large_image", `live ${route}: expected twitter summary_large_image card`);

  const imageValues = [
    extractMeta(html, "property", "og:image"),
    extractMeta(html, "name", "twitter:image"),
  ].filter(Boolean);
  for (const imageValue of [...new Set(imageValues)]) {
    await checkReachableImage(new URL(imageValue, url), route);
  }
}

async function checkReachableImage(url, route) {
  const response = await fetch(url, {
    method: "GET",
    headers: { "user-agent": "MochiriiObservabilityMetadataSmoke/1.0" },
    signal: AbortSignal.timeout(30000),
  });
  assert(response.status === 200, `live ${route}: social image ${url.href} expected 200, got ${response.status}`);
  assert(/^image\//i.test(response.headers.get("content-type") || ""), `live ${route}: social image ${url.href} should return image content`);
  await response.body?.cancel?.();
}

function extractLink(html, rel) {
  const pattern = new RegExp(`<link\\b[^>]*\\brel=["']${escapeRegExp(rel)}["'][^>]*>`, "i");
  const tag = html.match(pattern)?.[0] || "";
  return extractAttribute(tag, "href");
}

function extractMeta(html, attribute, value) {
  const pattern = new RegExp(`<meta\\b[^>]*\\b${attribute}=["']${escapeRegExp(value)}["'][^>]*>`, "i");
  const tag = html.match(pattern)?.[0] || "";
  return extractAttribute(tag, "content");
}

function extractAttribute(tag, attribute) {
  const pattern = new RegExp(`\\b${attribute}=["']([^"']+)["']`, "i");
  return tag.match(pattern)?.[1] || "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeUrl(value) {
  if (!value) return "";
  const url = new URL(value);
  if (url.pathname === "/") url.pathname = "";
  url.hash = "";
  return url.href.replace(/\/$/, "");
}

await checkLiveIfRequested();
checkLayoutObservability();
checkPublicMetadata();
checkProtectedNoindex();
checkRetiredRoutes();
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

console.log(`Observability/metadata smoke validation OK (${publicRoutes.length} public routes, ${noindexRoutes.length} noindex routes).`);
