import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReports = args.has("--write");
const checkedAt = new Date().toISOString();
const reportJsonPath = resolve(root, "reports/social-preview-qa.json");
const reportMarkdownPath = resolve(root, "reports/social-preview-qa.md");

const failures = [];
const warnings = [];

const publicRoutes = [
  {
    route: "/",
    label: "Home",
    file: "apps/web/app/page.tsx",
    metadataFile: "apps/web/app/layout.tsx",
    image: "/assets/img/hero/hero.webp",
  },
  { route: "/join", key: "join", label: "Join", file: "apps/web/app/join/page.tsx", image: "/assets/img/join/hero.webp" },
  { route: "/events", key: "events", label: "Events", file: "apps/web/app/events/page.tsx", image: "/assets/img/events/hero.webp" },
  { route: "/gallery", key: "gallery", label: "Gallery", file: "apps/web/app/gallery/page.tsx", image: "/assets/img/gallery/hero.webp" },
  { route: "/ranks", key: "ranks", label: "Ranks", file: "apps/web/app/ranks/page.tsx", image: "/assets/img/ranks/hero.webp" },
  { route: "/leaders", key: "leaders", label: "Leaders", file: "apps/web/app/leaders/page.tsx", image: "/assets/img/leaders/hero.webp" },
  { route: "/codex", key: "codex", label: "Codex", file: "apps/web/app/codex/page.tsx", image: "/assets/img/codex/hero.webp" },
  {
    route: "/recruitment",
    key: "recruitment",
    label: "Recruitment",
    file: "apps/web/app/recruitment/page.tsx",
    image: "/assets/img/recruitment/hero.webp",
  },
  {
    route: "/announcements",
    key: "announcements",
    label: "Announcements",
    file: "apps/web/app/announcements/page.tsx",
    image: "/assets/img/announcements/hero.webp",
  },
  { route: "/raffles", key: "raffles", label: "Raffles", file: "apps/web/app/raffles/page.tsx", image: "/assets/img/raffles/hero.webp" },
  { route: "/spotify", key: "spotify", label: "Spotify", file: "apps/web/app/spotify/page.tsx", image: "/assets/img/spotify/hero.webp" },
  {
    route: "/spotlight",
    key: "spotlight",
    label: "Spotlight",
    file: "apps/web/app/spotlight/page.tsx",
    image: "/assets/img/spotlight/hero.webp",
  },
  {
    route: "/twills",
    key: "twills",
    label: "Twills",
    file: "apps/web/app/twills/page.tsx",
    image: "/assets/img/profiles/twills/hero.webp",
  },
];

const protectedRoutes = [
  { route: "/auth", label: "Auth", file: "apps/web/app/auth/page.tsx", expectedFollow: true },
  { route: "/account", label: "Account", file: "apps/web/app/account/page.tsx", expectedFollow: true },
  { route: "/gallery-submit", label: "Gallery Submit", file: "apps/web/app/gallery-submit/page.tsx", expectedFollow: true },
  { route: "/leader-dashboard", label: "Leader Dashboard", file: "apps/web/app/leader-dashboard/page.tsx", expectedFollow: true },
  { route: "/members", label: "Members", file: "apps/web/app/members/page.tsx", expectedFollow: false },
  { route: "/members/[slug]", label: "Member Profile", file: "apps/web/app/members/[slug]/page.tsx", expectedFollow: false },
  { route: "/games/mochi-social", label: "Mochi Social Alpha", file: "apps/web/app/games/mochi-social/page.tsx", expectedFollow: false },
];

const sourceLinks = [
  "https://nextjs.org/docs/app/getting-started/metadata-and-og-images",
  "https://nextjs.org/docs/app/api-reference/functions/generate-metadata",
  "https://ogp.me/",
  "https://vercel.com/docs/og-image-generation",
  "https://support.discord.com/hc/en-us/community/posts/360055886251-Extended-metadata-tags-for-embeds",
];

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertIncludes(label, text, snippet) {
  assert(text.includes(snippet), `${label}: expected snippet not found: ${snippet}`);
}

function pathForReport(absolutePath) {
  return relative(root, absolutePath).replace(/\\/g, "/");
}

function imageExists(imagePath) {
  if (!imagePath.startsWith("/assets/img/")) return false;
  return existsSync(resolve(root, "apps/web/public", imagePath.slice(1)));
}

function escaped(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function routeUrl(route) {
  return route === "/" ? "https://mochirii.com/" : `https://mochirii.com${route}`;
}

function checkRootMetadata() {
  const layout = read("apps/web/app/layout.tsx");

  assertIncludes("root layout metadata", layout, "metadataBase: new URL(siteUrl)");
  assertIncludes("root layout metadata", layout, 'canonical: "/"');
  assertIncludes("root layout metadata", layout, "openGraph:");
  assertIncludes("root layout metadata", layout, 'type: "website"');
  assertIncludes("root layout metadata", layout, "siteName:");
  assertIncludes("root layout metadata", layout, "title");
  assertIncludes("root layout metadata", layout, "description");
  assertIncludes("root layout metadata", layout, 'url: siteUrl');
  assertIncludes("root layout metadata", layout, 'url: "/assets/img/hero/hero.webp"');
  assertIncludes("root layout metadata", layout, "width: 1536");
  assertIncludes("root layout metadata", layout, "height: 1024");
  assertIncludes("root layout metadata", layout, "alt:");
  assertIncludes("root layout metadata", layout, "twitter:");
  assertIncludes("root layout metadata", layout, 'card: "summary_large_image"');

  assert(imageExists("/assets/img/hero/hero.webp"), "root layout metadata image is missing from apps/web/public.");
}

function checkPublicMetadataHelper() {
  const metadata = read("apps/web/components/public-pages/metadata.ts");

  assertIncludes("public metadata helper", metadata, "metadataFor(page: PageKey)");
  assertIncludes("public metadata helper", metadata, "openGraph:");
  assertIncludes("public metadata helper", metadata, "twitter:");
  assertIncludes("public metadata helper", metadata, "canonical: meta.path");
  assertIncludes("public metadata helper", metadata, "url: meta.image");
  assertIncludes("public metadata helper", metadata, "alt: meta.imageAlt");
  assertIncludes("public metadata helper", metadata, 'card: "summary_large_image"');

  for (const route of publicRoutes.filter((item) => item.key)) {
    const source = read(route.file);
    assertIncludes(route.file, source, `metadataFor("${route.key}")`);

    const entryPattern = new RegExp(
      `${escaped(route.key)}:\\s*{[\\s\\S]*?path:\\s*"${escaped(route.route)}"[\\s\\S]*?image:\\s*"${escaped(route.image)}"[\\s\\S]*?imageAlt:\\s*"[^"]{12,}"[\\s\\S]*?}`,
      "m",
    );
    assert(entryPattern.test(metadata), `public metadata helper: ${route.key} must define path, image, and imageAlt.`);
    assert(imageExists(route.image), `${route.route}: metadata image is missing from apps/web/public: ${route.image}`);
  }
}

function checkSitemapAndRobots() {
  const sitemap = read("apps/web/public/sitemap.xml");
  const robots = read("apps/web/public/robots.txt");

  for (const route of publicRoutes) {
    assertIncludes("sitemap", sitemap, `<loc>${routeUrl(route.route)}</loc>`);
  }

  for (const route of protectedRoutes) {
    const concreteRoute = route.route.replace("/[slug]", "/twills");
    assert(!sitemap.includes(routeUrl(concreteRoute)), `sitemap: protected route must stay excluded: ${concreteRoute}`);
  }

  assertIncludes("robots", robots, "Sitemap: https://mochirii.com/sitemap.xml");
}

function checkProtectedRoutes() {
  const privatePreviewPatterns = [
    /\bsignedUrl\b/i,
    /\bsigned_url\b/i,
    /\bstorage_path\b/i,
    /\bstorage_bucket\b/i,
    /\bmember-gallery\b/i,
    /\bmember-profile-media\b/i,
    /\bdiscord_user_id\b/i,
    /\bdiscord_id\b/i,
    /\bemail\s*:/i,
  ];

  for (const route of protectedRoutes) {
    const source = read(route.file);
    assertIncludes(route.file, source, "robots:");
    assertIncludes(route.file, source, "index: false");
    assertIncludes(route.file, source, `follow: ${route.expectedFollow ? "true" : "false"}`);

    for (const pattern of privatePreviewPatterns) {
      assert(!pattern.test(source), `${route.file}: route metadata/page source contains private preview material matching ${pattern}.`);
    }

    const imageMatches = [...source.matchAll(/images:\s*\[\s*"([^"]+)"/g)].map((match) => match[1]);
    for (const image of imageMatches) {
      assert(image.startsWith("/assets/img/"), `${route.file}: metadata image must use public /assets/img/ path, found ${image}`);
      assert(imageExists(image), `${route.file}: metadata image missing from apps/web/public: ${image}`);
    }
  }
}

function checkMochiSocialAlphaPosture() {
  const page = read("apps/web/app/games/mochi-social/page.tsx");
  const alphaCheck = read("scripts/check-mochi-social-alpha.mjs");
  const visualGuide = read("docs/mochi-social-visual-polish.md");
  const previewReady = existsSync(resolve(root, "reports/mochi-social-preview-ready.json"))
    ? read("reports/mochi-social-preview-ready.json")
    : "";
  const combined = `${page}\n${alphaCheck}\n${visualGuide}\n${previewReady}`;

  assertIncludes("Mochi Social alpha page", page, "Closed, no-real-value Mochi Social alpha preview");
  assertIncludes("Mochi Social alpha page", page, "index: false");
  assertIncludes("Mochi Social alpha page", page, "follow: false");
  assert(/configured-preview-stub/i.test(combined), "Mochi Social alpha posture must keep configured-preview-stub evidence.");
  assert(/no-real-value|no real value/i.test(combined), "Mochi Social alpha posture must keep no-real-value evidence.");
}

function checkDocsAndReports() {
  const doc = read("docs/social-preview-qa.md");
  for (const link of sourceLinks) {
    assertIncludes("social preview QA doc", doc, link);
  }
  assertIncludes("social preview QA doc", doc, "Protected or member routes should:");
  assertIncludes("social preview QA doc", doc, "Stop Lines");
  assertIncludes("social preview QA doc", doc, "This runbook is about preview quality and safety, not provider activation.");

  if (!writeReports) {
    if (!existsSync(reportJsonPath)) warn(`${pathForReport(reportJsonPath)} is missing; run with --write to generate it.`);
    if (!existsSync(reportMarkdownPath)) warn(`${pathForReport(reportMarkdownPath)} is missing; run with --write to generate it.`);
  }

  for (const file of [resolve(root, "docs/social-preview-qa.md"), reportJsonPath, reportMarkdownPath]) {
    if (existsSync(file)) scanNoSecretArtifact(pathForReport(file), readFileSync(file, "utf8"));
  }
}

function scanNoSecretArtifact(label, text) {
  const forbiddenPatterns = [
    { label: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
    { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
    { label: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
    { label: "Discord bot token", pattern: /\b[A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/ },
    {
      label: "Discord webhook URL",
      pattern: /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/,
    },
    { label: "private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/ },
    {
      label: "service-role assignment",
      pattern: /\b(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\s*[:=]\s*["']?(?!<|REDACTED|redacted|not read|placeholder)[^\s"',]+/i,
    },
    {
      label: "Discord bot token assignment",
      pattern: /\bDISCORD_BOT_TOKEN\s*[:=]\s*["']?(?!<|REDACTED|redacted|not read|placeholder)[^\s"',]+/i,
    },
    { label: "raw cookie header", pattern: /\bCookie:\s*[^;\s]+=/i },
    { label: "signed URL query", pattern: /\b(?:X-Amz-Signature|token|signature|expires|Key-Pair-Id)=/i },
  ];

  String(text || "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const { label: patternLabel, pattern } of forbiddenPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) fail(`${label}: line ${index + 1} contains forbidden ${patternLabel}.`);
      }
    });
}

function buildReport() {
  return {
    ok: failures.length === 0,
    checkedAt,
    scope:
      "Mochirii Next social preview QA. This report is local-only and redacted; it records metadata structure, sitemap policy, noindex coverage, and manual platform checks without provider mutations.",
    sources: sourceLinks,
    publicRoutes: publicRoutes.map((route) => ({
      route: route.route,
      label: route.label,
      metadataOwner: route.route === "/" ? "apps/web/app/layout.tsx" : "apps/web/components/public-pages/metadata.ts",
      image: route.image,
      imagePresent: imageExists(route.image),
      sitemapExpected: true,
    })),
    protectedRoutes: protectedRoutes.map((route) => ({
      route: route.route,
      label: route.label,
      source: route.file,
      noindexExpected: true,
      sitemapExpected: false,
      publicSafePreviewOnly: true,
    })),
    manualPlatformChecks: [
      "https://mochirii.com/",
      "https://mochirii.com/join",
      "https://mochirii.com/events",
      "https://mochirii.com/gallery",
      "https://mochirii.com/recruitment",
      "https://mochirii.com/games/mochi-social",
    ],
    stopLines: [
      "no tokens, cookies, service-role keys, bot tokens, OAuth secrets, webhook URLs, or raw request headers",
      "no signed URLs or private Supabase Storage object paths",
      "no Discord IDs, email addresses, account names, or private member profile data",
      "no screenshots from logged-in private member or moderator pages",
      "no real Discord channel posts, automated preview spam, or provider mutations without an approved release packet",
    ],
    warnings,
    failures,
  };
}

function renderMarkdown(report) {
  const publicRows = report.publicRoutes
    .map((route) => `| \`${route.route}\` | ${route.metadataOwner} | \`${route.image}\` | ${route.imagePresent ? "yes" : "no"} | yes |`)
    .join("\n");
  const protectedRows = report.protectedRoutes
    .map((route) => `| \`${route.route}\` | ${route.source} | yes | no |`)
    .join("\n");
  const manualRows = report.manualPlatformChecks.map((url) => `- ${url}`).join("\n");
  const stopRows = report.stopLines.map((line) => `- ${line}`).join("\n");
  const warningRows = report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const failureRows = report.failures.length ? report.failures.map((failure) => `- ${failure}`).join("\n") : "- None";
  const sourceRows = report.sources.map((source) => `- ${source}`).join("\n");

  return `# Social Preview QA Report

Generated: ${report.checkedAt}

This report is intentionally no-secret. It records local metadata and discovery checks only; it does not call Discord, Vercel, Supabase, Fly, Enjin, or any external card renderer.

## Result

- OK: ${report.ok ? "yes" : "no"}
- Public routes checked: ${report.publicRoutes.length}
- Protected routes checked: ${report.protectedRoutes.length}

## Source Basis

${sourceRows}

## Public Route Matrix

| Route | Metadata owner | Image | Image present | Sitemap expected |
| --- | --- | --- | --- | --- |
${publicRows}

## Protected Route Matrix

| Route | Source | Noindex expected | Sitemap expected |
| --- | --- | --- | --- |
${protectedRows}

## Manual Platform Checks

${manualRows}

Record only pass/fail, route, observed title, observed image presence, observed domain, and stale-cache notes.

## Stop Lines

${stopRows}

## Warnings

${warningRows}

## Failures

${failureRows}
`;
}

checkRootMetadata();
checkPublicMetadataHelper();
checkSitemapAndRobots();
checkProtectedRoutes();
checkMochiSocialAlphaPosture();

const report = buildReport();
const reportJson = `${JSON.stringify(report, null, 2)}\n`;
const reportMarkdown = renderMarkdown(report);
scanNoSecretArtifact("rendered social preview QA JSON", reportJson);
scanNoSecretArtifact("rendered social preview QA markdown", reportMarkdown);
report.ok = failures.length === 0;

if (writeReports) {
  mkdirSync(dirname(reportJsonPath), { recursive: true });
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(reportMarkdownPath, renderMarkdown(report), "utf8");
}

checkDocsAndReports();

if (failures.length) {
  console.error("Social preview QA validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

for (const warning of warnings) console.log(`NOTE ${warning}`);
console.log(`Social preview QA validation OK (${publicRoutes.length} public routes, ${protectedRoutes.length} protected routes).`);
if (writeReports) {
  console.log(`- JSON report: ${pathForReport(reportJsonPath)}`);
  console.log(`- Markdown report: ${pathForReport(reportMarkdownPath)}`);
}
