import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const checkedAt = new Date().toISOString();
const args = new Set(process.argv.slice(2));
const writeReports = args.has("--write") || process.env.ROUTE_INFORMATION_ARCHITECTURE_WRITE === "true";
const reportJsonPath = resolve(root, "reports/route-information-architecture.json");
const reportMdPath = resolve(root, "reports/route-information-architecture.md");

const failures = [];
const warnings = [];

const routeGroups = [
  {
    id: "guild",
    label: "Guild",
    purpose: "Repeated guild destinations members naturally revisit.",
    routes: ["/", "/spotlight", "/gallery", "/members", "/games/mochi-social"],
  },
  {
    id: "culture",
    label: "Culture",
    purpose: "Stable identity and conduct reference material.",
    routes: ["/join", "/ranks", "/leaders", "/codex", "/spotify"],
  },
  {
    id: "updates",
    label: "Updates",
    purpose: "Time-sensitive community activity and notices.",
    routes: ["/announcements", "/events", "/raffles"],
  },
  {
    id: "account-tools",
    label: "Account and Tools",
    purpose: "Auth-gated or utility workflows that should not dominate public browsing.",
    routes: ["/auth", "/account", "/gallery-submit", "/leader-dashboard", "/recruitment"],
  },
  {
    id: "contextual",
    label: "Contextual",
    purpose: "Routes reached from cards, profile links, or direct workflow context.",
    routes: ["/twills", "/members/[slug]"],
  },
];

const expectedRoutes = [
  { route: "/", file: "apps/web/app/page.tsx", title: "Home", surface: "public", nav: "guild", footer: true },
  { route: "/spotlight", file: "apps/web/app/spotlight/page.tsx", title: "Spotlight", surface: "public", nav: "guild", footer: true },
  { route: "/gallery", file: "apps/web/app/gallery/page.tsx", title: "Gallery", surface: "public", nav: "guild", footer: true },
  { route: "/members", file: "apps/web/app/members/page.tsx", title: "Members", surface: "member", nav: "guild", utility: true, footer: true, auth: "verified", noindex: true },
  { route: "/games/mochi-social", file: "apps/web/app/games/mochi-social/page.tsx", title: "Mochi Social", surface: "alpha", nav: "guild", utility: true, auth: "signed-in", noindex: true },
  { route: "/join", file: "apps/web/app/join/page.tsx", title: "Join", surface: "public", nav: "culture", footer: true },
  { route: "/ranks", file: "apps/web/app/ranks/page.tsx", title: "Ranks", surface: "public", nav: "culture", footer: true },
  { route: "/leaders", file: "apps/web/app/leaders/page.tsx", title: "Leaders", surface: "public", nav: "culture", footer: true },
  { route: "/codex", file: "apps/web/app/codex/page.tsx", title: "Codex", surface: "public", nav: "culture", footer: true },
  { route: "/spotify", file: "apps/web/app/spotify/page.tsx", title: "Playlists", surface: "public", nav: "culture", footer: true },
  { route: "/announcements", file: "apps/web/app/announcements/page.tsx", title: "Announcements", surface: "public", nav: "updates", footer: true },
  { route: "/events", file: "apps/web/app/events/page.tsx", title: "Events", surface: "public", nav: "updates", footer: true },
  { route: "/raffles", file: "apps/web/app/raffles/page.tsx", title: "Raffles", surface: "public", nav: "updates", footer: true },
  { route: "/recruitment", file: "apps/web/app/recruitment/page.tsx", title: "Recruitment", surface: "utility", utility: true, footerAction: true },
  { route: "/auth", file: "apps/web/app/auth/page.tsx", title: "Login", surface: "account", utility: true, footer: true, auth: "signed-out", noindex: true },
  { route: "/account", file: "apps/web/app/account/page.tsx", title: "Account", surface: "account", utility: true, footer: true, auth: "signed-in", noindex: true },
  { route: "/gallery-submit", file: "apps/web/app/gallery-submit/page.tsx", title: "Submit Image", surface: "member-tool", utility: true, footer: true, auth: "verified", noindex: true },
  { route: "/leader-dashboard", file: "apps/web/app/leader-dashboard/page.tsx", title: "Leader Dashboard", surface: "moderator-tool", utility: true, auth: "signed-in", noindex: true },
  { route: "/twills", file: "apps/web/app/twills/page.tsx", title: "Twills", surface: "contextual" },
  { route: "/members/[slug]", file: "apps/web/app/members/[slug]/page.tsx", title: "Member Profile", surface: "contextual-member", noindex: true, componentFiles: ["apps/web/components/member-workflow/MemberDirectory.tsx"] },
];

const report = {
  ok: false,
  checkedAt,
  scope:
    "Mochirii route information architecture guard. This is a no-secret static check for route inventory, navigation grouping, auth-gated utility links, footer coverage, protected noindex, and Mochi Social repo-boundary clarity.",
  git: readGitState(root),
  routeGroups,
  discoveredRoutes: discoverPageRoutes(),
  header: inspectHeader(),
  footer: inspectFooter(),
  routes: [],
  sourceBasis: [
    "https://www.w3.org/TR/WCAG22/",
    "https://www.w3.org/WAI/WCAG21/Understanding/consistent-navigation.html",
    "https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks",
    "https://web.dev/learn/html/navigation",
    "https://web.dev/articles/headings-and-landmarks",
    "https://designsystem.digital.gov/components/header/",
    "https://designsystem.digital.gov/components/in-page-navigation/",
  ],
  providerMutationsAuthorized: false,
  liveProviderReads: false,
  warnings,
  failures,
};

checkRouteInventory();
checkGroupCoverage();
checkDocs();
report.routes = expectedRoutes.map(inspectRoute);

const markdown = renderMarkdown(report);
const json = `${JSON.stringify(report, null, 2)}\n`;
scanRenderedArtifact("json", json);
scanRenderedArtifact("markdown", markdown);
report.ok = failures.length === 0;

if (writeReports) {
  mkdirSync(dirname(reportJsonPath), { recursive: true });
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(reportMdPath, renderMarkdown(report), "utf8");
}

if (!report.ok) {
  console.error("Route information architecture failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  if (writeReports) console.error(`Report: ${pathForReport(reportJsonPath)}`);
  process.exit(1);
}

console.log("Route information architecture OK.");
console.log(`- Routes: ${report.routes.length}`);
console.log(`- Header routes: ${report.header.allRoutes.length}`);
console.log(`- Footer routes: ${report.footer.allRoutes.length}`);
console.log(`- Protected noindex routes: ${report.routes.filter((route) => route.noindexExpected).length}`);
console.log("- Provider mutations authorized: no");
if (writeReports) {
  console.log(`- JSON report: ${pathForReport(reportJsonPath)}`);
  console.log(`- Markdown report: ${pathForReport(reportMdPath)}`);
} else {
  console.log("- Report writing disabled. Re-run with -- --write to persist redacted reports.");
}

function inspectHeader() {
  const text = readRequired("apps/web/components/SiteHeader.tsx");
  const groups = {};
  for (const group of ["guild", "culture", "updates"]) {
    groups[group] = extractRoutesFromBlock(text, `id: "${group}"`);
  }
  const utility = extractRoutesFromBlock(text, "const notesLinks");
  return {
    groups,
    utility,
    allRoutes: uniqueStrings([...Object.values(groups).flat(), ...utility]),
    primaryNavLabel: /<nav\s+className=["']nav["']\s+aria-label=["']Primary["']/.test(text),
    mobileNavLabel: /<nav\s+className=["']mobile-nav["']\s+aria-label=["']Primary mobile["']/.test(text),
    skipLink: /className=["']skip-link["'][\s\S]*href=["']#main["']/.test(text),
    authMarkers: {
      signedOut: text.includes("data-auth-signed-out"),
      signedIn: text.includes("data-auth-signed-in"),
      verified: text.includes("data-auth-verified"),
    },
  };
}

function inspectFooter() {
  const text = readRequired("apps/web/components/SiteFooter.tsx");
  return {
    guild: extractRoutesFromBlock(text, "const guildLinks"),
    culture: extractRoutesFromBlock(text, "const cultureLinks"),
    updates: extractRoutesFromBlock(text, "const updateLinks"),
    actions: uniqueStrings([...text.matchAll(/href=["'](\/[^"']*)["']/g)].map((match) => match[1])),
    allRoutes: uniqueStrings([...text.matchAll(/href:\s*["'](\/[^"']*)["']/g)].map((match) => match[1])),
    footerNavigationLabel: text.includes('aria-label="Footer navigation"'),
  };
}

function inspectRoute(route) {
  const source = readRequired(route.file);
  const combinedSource = [source, ...(route.componentFiles || []).map((file) => readRequired(file))].join("\n");
  const headerGroupRoutes = report.header.groups[route.nav] || [];
  const inPrimaryGroup = route.nav ? headerGroupRoutes.includes(route.route) : false;
  const inUtility = report.header.utility.includes(route.route);
  const inFooter = report.footer.allRoutes.includes(route.route) || report.footer.actions.includes(route.route);
  const bodyPage = bodyPageMarker(source);
  const noindex = /robots:\s*\{[\s\S]*index:\s*false/.test(source);
  const mainTarget = combinedSource.includes('id="main"') || usesPublicPageComponent(source);
  const metadataCanonical = canonicalFor(route.route, source);
  const authAttr = route.auth ? authAttributeFor(route.auth) : "";
  const headerAuth = route.auth ? headerAuthForRoute(route.route, authAttr) : true;
  const footerAuth = route.auth && inFooter ? footerAuthForRoute(route.route, authAttr) : true;

  if (route.nav && !inPrimaryGroup) failures.push(`${route.route}: expected in header ${route.nav} group.`);
  if (route.utility && !inUtility) failures.push(`${route.route}: expected in header utility/notes links.`);
  if (route.footer && !inFooter) failures.push(`${route.route}: expected in footer navigation.`);
  if (route.footerAction && !report.footer.actions.includes(route.route)) failures.push(`${route.route}: expected as a footer action link.`);
  if (route.noindex && !noindex) failures.push(`${route.route}: expected robots index false.`);
  if (!mainTarget) failures.push(`${route.route}: expected main landmark or shared public-page main target.`);
  if (route.auth && !headerAuth) failures.push(`${route.route}: expected header auth marker ${authAttr}.`);
  if (route.auth && inFooter && !footerAuth) failures.push(`${route.route}: expected footer auth marker ${authAttr}.`);
  if (route.route !== "/" && !metadataCanonical && !route.route.includes("[slug]")) {
    warnings.push(`${route.route}: canonical path not statically found in route file.`);
  }

  return {
    route: route.route,
    title: route.title,
    surface: route.surface,
    file: route.file,
    group: route.nav || (route.utility ? "account-tools" : "contextual"),
    primaryHeader: inPrimaryGroup,
    utilityHeader: inUtility,
    footer: inFooter,
    auth: route.auth || "public/contextual",
    headerAuth,
    footerAuth,
    noindexExpected: Boolean(route.noindex),
    noindex,
    mainTarget,
    bodyPage,
    metadataCanonical,
  };
}

function checkRouteInventory() {
  const expected = expectedRoutes.map((route) => route.route).sort();
  const discovered = report.discoveredRoutes.map((route) => route.route).sort();
  const missing = expected.filter((route) => !discovered.includes(route));
  const extra = discovered.filter((route) => !expected.includes(route));
  if (missing.length) failures.push(`route inventory missing expected route(s): ${missing.join(", ")}`);
  if (extra.length) failures.push(`route inventory has unclassified page route(s): ${extra.join(", ")}`);

  for (const route of expectedRoutes) {
    if (!existsSync(resolve(root, route.file))) failures.push(`${route.route}: missing file ${route.file}`);
  }
}

function checkGroupCoverage() {
  if (!report.header.primaryNavLabel) failures.push("header primary nav must keep aria-label=\"Primary\".");
  if (!report.header.mobileNavLabel) failures.push("mobile nav must keep aria-label=\"Primary mobile\".");
  if (!report.header.skipLink) failures.push("header skip link must target #main.");
  for (const [name, present] of Object.entries(report.header.authMarkers)) {
    if (!present) failures.push(`header auth marker missing: ${name}`);
  }
  if (!report.footer.footerNavigationLabel) failures.push("footer navigation group must keep an accessible label.");

  for (const group of routeGroups.filter((entry) => ["guild", "culture", "updates"].includes(entry.id))) {
    const actual = report.header.groups[group.id] || [];
    const missing = group.routes.filter((route) => !actual.includes(route));
    const extra = actual.filter((route) => !group.routes.includes(route));
    if (missing.length) failures.push(`header ${group.id} group missing route(s): ${missing.join(", ")}`);
    if (extra.length) failures.push(`header ${group.id} group has unexpected route(s): ${extra.join(", ")}`);
  }
}

function checkDocs() {
  const docs = [
    {
      file: "docs/route-information-architecture.md",
      snippets: [
        "Route Groups",
        "Navigation Rules",
        "Mochirii owns the website tester doorway",
        "RPGJS runtime, game art, HUD, maps, manifests, Fly runtime, and Enjin finality remain in the separate Mochi Social game repo.",
        "provider-read-free",
      ],
    },
    {
      file: "docs/mochi-social-alpha-codex-ops.md",
      snippets: ["Use Mochirii for website, Supabase, allowlist, terms, feedback, and admin changes; use Mochi Social for runtime/game changes."],
    },
    {
      file: "AGENTS.md",
      snippets: ["Use one scoped branch per task", "the game repo owns RPGJS art, HUD, maps, and runtime manifests"],
    },
    {
      file: "package.json",
      snippets: ["check:route-information-architecture"],
    },
    {
      file: "scripts/check-all.mjs",
      snippets: ["check:route-information-architecture"],
    },
  ];

  for (const doc of docs) {
    const text = readRequired(doc.file);
    const missing = doc.snippets.filter((snippet) => !text.includes(snippet));
    if (missing.length) failures.push(`${doc.file} missing route-IA snippet(s): ${missing.join(", ")}`);
    for (const hit of scanText(text)) failures.push(`${doc.file} contains forbidden secret-like material: ${hit}`);
  }
}

function discoverPageRoutes() {
  const pages = [];
  walk(resolve(root, "apps/web/app"));
  return pages.sort((a, b) => a.route.localeCompare(b.route));

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name !== "page.tsx") continue;
      const relativeFile = pathForReport(full);
      const route = routeFromPageFile(relativeFile);
      pages.push({ route, file: relativeFile });
    }
  }
}

function routeFromPageFile(file) {
  const route = file
    .replace(/^apps\/web\/app/, "")
    .replace(/\/page\.tsx$/, "")
    .replace(/\\/g, "/");
  return route || "/";
}

function extractRoutesFromBlock(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0) return [];
  const block = marker.startsWith("id: ")
    ? extractBalancedBlock(text, text.lastIndexOf("{", start), "{", "}")
    : extractBalancedBlock(text, text.indexOf("[", text.indexOf("=", start)), "[", "]");
  return uniqueStrings([...block.matchAll(/href:\s*["'](\/[^"']*)["']/g)].map((match) => match[1]));
}

function extractBalancedBlock(text, start, open, close) {
  if (start < 0) return "";
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return text.slice(start);
}

function bodyPageMarker(source) {
  const match = source.match(/<BodyPageMarker\s+page=["']([^"']+)["']/);
  return match?.[1] || "";
}

function usesPublicPageComponent(source) {
  return /from\s+["']@\/components\/public-pages\/pages["']/.test(source);
}

function canonicalFor(route, source) {
  if (route === "/") return true;
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`canonical:\\s*["']${escaped}["']`).test(source)) return true;
  if (new RegExp(`path:\\s*["']${escaped}["']`).test(source)) return true;
  if (/metadataFor\(["'][^"']+["']\)/.test(source)) {
    return new RegExp(`path:\\s*["']${escaped}["']`).test(readRequired("apps/web/components/public-pages/metadata.ts"));
  }
  return false;
}

function authAttributeFor(auth) {
  if (auth === "signed-out") return "data-auth-signed-out";
  if (auth === "signed-in") return "data-auth-signed-in";
  if (auth === "verified") return "data-auth-verified";
  return "";
}

function headerAuthForRoute(route, attr) {
  return routeObjectHasAuth(readRequired("apps/web/components/SiteHeader.tsx"), route, attr);
}

function footerAuthForRoute(route, attr) {
  return routeObjectHasAuth(readRequired("apps/web/components/SiteFooter.tsx"), route, attr);
}

function routeObjectHasAuth(text, route, attr) {
  const auth = attr.replace("data-auth-", "").replace("signed-in", "signed-in").replace("signed-out", "signed-out");
  const expected =
    attr === "data-auth-signed-out" ? 'auth: "signed-out"' : attr === "data-auth-signed-in" ? 'auth: "signed-in"' : 'auth: "verified"';
  const routePattern = new RegExp(`\\{[^}]*href:\\s*["']${escapeRegex(route)}["'][^}]*${escapeRegex(expected)}[^}]*\\}`);
  return routePattern.test(text);
}

function readGitState(repoPath) {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);
  const head = git(["rev-parse", "HEAD"], repoPath);
  const dirty = git(["status", "--porcelain"], repoPath);
  return {
    branch: firstLine(branch.stdout),
    head: firstLine(head.stdout).slice(0, 12),
    dirty: dirty.ok ? dirty.stdout.split(/\r?\n/).filter(Boolean) : ["git status unavailable"],
  };
}

function git(argsForGit, cwd) {
  const result = spawnSync("git", argsForGit, { cwd, encoding: "utf8", shell: false });
  return {
    ok: result.status === 0,
    stdout: sanitizeText(result.stdout || ""),
    stderr: sanitizeText(result.stderr || ""),
    error: result.error?.message || "",
  };
}

function renderMarkdown(data) {
  const groupRows = data.routeGroups
    .map((group) => `| ${group.label} | ${group.purpose} | ${group.routes.join(", ")} |`)
    .join("\n");
  const routeRows = data.routes
    .map(
      (route) =>
        `| ${route.route} | ${route.surface} | ${route.group} | ${route.primaryHeader ? "yes" : "no"} | ${route.utilityHeader ? "yes" : "no"} | ${route.footer ? "yes" : "no"} | ${route.auth} | ${route.noindexExpected ? (route.noindex ? "yes" : "missing") : "n/a"} |`,
    )
    .join("\n");
  const warningLines = data.warnings.length ? data.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const failureLines = data.failures.length ? data.failures.map((failure) => `- ${failure}`).join("\n") : "- None";

  return `# Route Information Architecture

Generated: ${data.checkedAt}

This file is intentionally no-secret. It records route inventory, navigation grouping, auth-gated utility exposure, footer coverage, protected noindex status, and website/game ownership boundaries. It does not read provider dashboards or authorize live mutations.

## Result

- OK: ${data.ok ? "yes" : "no"}
- Git branch: ${data.git.branch}
- Git head: ${data.git.head}
- Discovered page routes: ${data.discoveredRoutes.length}
- Expected page routes: ${expectedRoutes.length}
- Provider mutations authorized: ${data.providerMutationsAuthorized ? "yes" : "no"}
- Live provider reads: ${data.liveProviderReads ? "yes" : "no"}

## Route Groups

| Group | Purpose | Routes |
| --- | --- | --- |
${groupRows}

## Header And Footer

- Header primary routes: ${data.header.allRoutes.join(", ")}
- Header utility routes: ${data.header.utility.join(", ")}
- Footer routes: ${data.footer.allRoutes.join(", ")}
- Footer action routes: ${data.footer.actions.join(", ") || "none"}

## Route Matrix

| Route | Surface | Group | Primary header | Utility header | Footer | Auth | Noindex |
| --- | --- | --- | --- | --- | --- | --- | --- |
${routeRows}

## Source Basis

${data.sourceBasis.map((source) => `- ${source}`).join("\n")}

## Warnings

${warningLines}

## Failures

${failureLines}
`;
}

function readRequired(file) {
  const full = resolve(root, file);
  if (!existsSync(full)) {
    failures.push(`${file}: missing required route IA source file.`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function scanRenderedArtifact(label, text) {
  for (const hit of scanText(text)) failures.push(`rendered ${label} report contains forbidden secret-like material: ${hit}`);
}

function scanText(text) {
  const forbiddenPatterns = [
    { label: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
    { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
    { label: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
    { label: "Discord bot token", pattern: /\b[A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/ },
    {
      label: "Discord webhook URL",
      pattern: /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/,
    },
    { label: "Private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/ },
    { label: "raw cookie header", pattern: /\bCookie:\s*[^;\s]+=/i },
  ];
  const hits = [];
  String(text || "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const { label, pattern } of forbiddenPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) hits.push(`line ${index + 1}: ${label}`);
      }
    });
  return hits;
}

function sanitizeText(text) {
  let value = String(text || "");
  value = value.replace(/\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/g, "[redacted-github-token]");
  value = value.replace(/\bsb_secret_[A-Za-z0-9_-]{12,}\b/g, "[redacted-supabase-secret]");
  value = value.replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, "[redacted-jwt]");
  value = value.replace(/\b[A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/g, "[redacted-discord-token]");
  return value;
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function firstLine(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pathForReport(file) {
  return relative(root, resolve(file)).replace(/\\/g, "/");
}
