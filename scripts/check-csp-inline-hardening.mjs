import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { SITE_ORIGIN } from "./lib/public-urls.mjs";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write") || process.env.CSP_INLINE_HARDENING_WRITE === "true";
const liveHeaders = args.has("--live") || process.env.CSP_INLINE_HARDENING_LIVE === "true";
const baseUrl = (process.env.CSP_INLINE_HARDENING_BASE_URL || SITE_ORIGIN).replace(/\/+$/, "");
const reportJsonPath = resolve(root, "reports/csp-inline-hardening-inventory.json");
const reportMdPath = resolve(root, "reports/csp-inline-hardening-inventory.md");
const checkedAt = new Date().toISOString();

const failures = [];
const warnings = [];

const reviewedInlineUsageContracts = [
  {
    patternId: "scriptElement",
    file: "apps/web/app/page.tsx",
    count: 1,
    evidence: ['type="application/ld+json"', "function serializeJsonLd", "JSON.stringify(value).replace(/</g"],
  },
  {
    patternId: "dangerouslySetInnerHTML",
    file: "apps/web/app/page.tsx",
    count: 1,
    evidence: ['type="application/ld+json"', "function serializeJsonLd", "\\\\u003c"],
  },
  {
    patternId: "dynamicScriptElement",
    file: "apps/web/components/member-workflow/AuthCaptcha.tsx",
    count: 1,
    evidence: ["TURNSTILE_SCRIPT_URL", 'script.src = TURNSTILE_SCRIPT_URL', "script.async = true", "script.defer = true"],
  },
  {
    patternId: "iframeElement",
    file: "apps/web/components/public-pages/DiscordServerPreview.tsx",
    count: 1,
    evidence: ['src="https://discord.com/widget', 'loading="lazy"', 'sandbox="allow-popups'],
  },
  {
    patternId: "iframeElement",
    file: "apps/web/components/public-pages/SpotifyBrowser.tsx",
    count: 1,
    evidence: ["toSpotifyEmbedSrc", "src={src}", 'loading="lazy"'],
  },
  {
    patternId: "inlineStyleProp",
    file: "apps/web/app/spinner/not-found.tsx",
    count: 1,
    evidence: ["style={{", 'minHeight: "100dvh"', 'background: "#070812"'],
  },
  {
    patternId: "inlineStyleProp",
    file: "apps/web/components/ResponsiveGalleryMedia.tsx",
    count: 1,
    evidence: ["const style: CSSProperties | undefined", "objectPosition: focalPosition", "style={style}"],
  },
  {
    patternId: "styleElement",
    file: "apps/web/components/public-pages/GalleryBrowser.tsx",
    count: 1,
    evidence: ["<noscript>", "<style>", ".gallery-grid[data-order-pending='true']"],
  },
  {
    patternId: "inlineStyleProp",
    file: "apps/web/components/public-pages/common.tsx",
    count: 1,
    evidence: ["style?: CSSProperties", "style={style}"],
  },
  {
    patternId: "inlineStyleProp",
    file: "apps/web/components/public-pages/RecruitmentAudioPlayer.tsx",
    count: 1,
    evidence: ['"--audio-progress"', '"--audio-volume"', "as React.CSSProperties"],
  },
  {
    patternId: "inlineStyleProp",
    file: "apps/web/components/spinner/RaffleSpinner.tsx",
    count: 2,
    evidence: ['"--spinner-celebration-delay"', "style={wheelStyle}", '"--spinner-wheel-finish"'],
  },
  {
    patternId: "inlineStyleProp",
    file: "apps/web/components/spinner/ViewerRaffleSpinner.tsx",
    count: 2,
    evidence: ['"--spinner-celebration-delay"', "style={wheelStyle}", '"--spinner-wheel-finish"'],
  },
];

const runtimeResourceContracts = [
  {
    origin: "https://challenges.cloudflare.com",
    policyContext: "auth",
    routes: ["/auth"],
    requiredDirectives: ["script-src", "frame-src"],
    files: ["apps/web/components/member-workflow/AuthCaptcha.tsx"],
    use: "Turnstile API script and its provider-injected challenge frame",
    evidence: ["TURNSTILE_SCRIPT_URL", "document.createElement(\"script\")", "turnstile.render"],
  },
  {
    origin: "https://discord.com",
    policyContext: "default",
    routes: ["/join"],
    requiredDirectives: ["frame-src"],
    files: ["apps/web/components/public-pages/DiscordServerPreview.tsx"],
    use: "user-activated server-preview iframe",
    evidence: ['src="https://discord.com/widget', 'loading="lazy"'],
  },
  {
    origin: "https://open.spotify.com",
    policyContext: "default",
    routes: ["/spotify"],
    requiredDirectives: ["frame-src"],
    files: ["apps/web/components/public-pages/SpotifyBrowser.tsx"],
    use: "deferred playlist and media iframe",
    evidence: ["https://open.spotify.com/embed/", "<iframe", 'loading="lazy"'],
  },
];

const reviewedNavigationAndDataContracts = [
  { origin: "https://auth.mochirii.invalid", files: ["apps/web/lib/supabase/auth-redirect.ts"] },
  { origin: "https://bsky.app", files: ["apps/web/lib/member-social-links/profile-links-core.ts"] },
  { origin: "https://example.com", files: ["apps/web/lib/member-social-links/profile-links-core.ts"] },
  { origin: "https://example.social", files: ["apps/web/lib/member-social-links/profile-links-core.ts"] },
  { origin: "https://facebook.com", files: ["apps/web/lib/member-social-links/profile-links-core.ts"] },
  { origin: "https://instagram.com", files: ["apps/web/lib/member-social-links/profile-links-core.ts"] },
  { origin: "https://linkedin.com", files: ["apps/web/lib/member-social-links/profile-links-core.ts"] },
  { origin: "https://mochirii.invalid", files: ["apps/web/lib/auth-redirect.ts"] },
  { origin: "https://open.spotify.com", files: ["apps/web/lib/member-social-links/profile-links-core.ts"] },
  { origin: "https://schema.org", files: ["apps/web/app/page.tsx"] },
  { origin: "https://social.mochirii.com", files: ["apps/web/lib/oauth/approved-social-redirect.ts"] },
  { origin: "https://tiktok.com", files: ["apps/web/lib/member-social-links/profile-links-core.ts"] },
  { origin: "https://twitch.tv", files: ["apps/web/lib/member-social-links/profile-links-core.ts"] },
  {
    origin: "https://www.facebook.com",
    files: [
      "apps/web/components/member-workflow/FacebookPagePublishQueue.tsx",
      "apps/web/lib/gallery/facebook-permalink.ts",
    ],
  },
  { origin: "https://www.instagram.com", files: ["apps/web/components/member-workflow/LeaderDashboardParts.tsx"] },
  { origin: "https://x.com", files: ["apps/web/lib/member-social-links/profile-links-core.ts"] },
  { origin: "https://youtube.com", files: ["apps/web/lib/member-social-links/profile-links-core.ts"] },
];

const reviewedPolicyDeclarationContracts = [
  { origin: "https://*.supabase.co", files: ["apps/web/lib/security/protected-csp.ts"] },
  { origin: "https://cdn.discordapp.com", files: ["apps/web/lib/security/protected-csp.ts"] },
  { origin: "https://discord.com", files: ["apps/web/lib/security/protected-csp.ts"] },
  { origin: "https://media.discordapp.net", files: ["apps/web/lib/security/protected-csp.ts"] },
  { origin: "https://vitals.vercel-insights.com", files: ["apps/web/lib/security/protected-csp.ts"] },
];

const nonLiteralRuntimeLoadPatterns = {
  fetchCall: /\bfetch\s*\(\s*([^"'`\s])/gu,
  requestConstructor: /\bnew\s+Request\s*\(\s*([^"'`\s])/gu,
  webSocketConstructor: /\bnew\s+WebSocket\s*\(\s*([^"'`\s])/gu,
  eventSourceConstructor: /\bnew\s+EventSource\s*\(\s*([^"'`\s])/gu,
  workerConstructor: /\bnew\s+(?:SharedWorker|Worker)\s*\(\s*([^"'`\s])/gu,
  sendBeaconCall: /\bsendBeacon\s*\(\s*([^"'`\s])/gu,
  srcAssignment: /\.src\s*=(?!=)\s*([^"'`\s])/gu,
  setAttributeSrc: /\.setAttribute\(\s*["']src["']\s*,\s*([^"'`\s])/gu,
};

const reviewedNonLiteralRuntimeLoadContracts = [
  {
    patternId: "srcAssignment",
    file: "apps/web/components/member-workflow/AuthCaptcha.tsx",
    count: 1,
    evidence: ["const TURNSTILE_SCRIPT_URL", "script.src = TURNSTILE_SCRIPT_URL", "document.head.append(script)"],
  },
  {
    patternId: "fetchCall",
    file: "apps/web/lib/gallery/approved-feed.ts",
    count: 1,
    evidence: ["async function fetchWithBoundedTimeout", "fetch(input, { ...init, signal: controller.signal })"],
  },
  {
    patternId: "fetchCall",
    file: "apps/web/lib/member-profiles/visible-profile-cards.ts",
    count: 1,
    evidence: ["function publicProfileCardsUrl", "fetch(publicProfileCardsUrl(), {", 'method: "POST"'],
  },
  {
    patternId: "srcAssignment",
    file: "apps/web/lib/gallery-thumbnail.ts",
    count: 1,
    evidence: ["const objectUrl = URL.createObjectURL(blob)", "image.src = objectUrl", "URL.revokeObjectURL(objectUrl)"],
  },
];

const routeMatrix = [
  { route: "/", surface: "home shell", policyContext: "default", features: ["Vercel analytics", "Speed Insights", "gallery media"] },
  { route: "/join", surface: "Discord funnel", policyContext: "default", features: ["Discord link", "optional Discord iframe"] },
  { route: "/events", surface: "events", policyContext: "default", features: ["event cover images", "filter state"] },
  { route: "/gallery", surface: "gallery", policyContext: "default", features: ["Supabase signed media", "lightbox", "share status"] },
  { route: "/auth", surface: "auth", policyContext: "auth", features: ["Supabase auth client", "Cloudflare Turnstile script and frame"] },
  { route: "/account", surface: "member account", policyContext: "default", features: ["Supabase auth", "gallery submissions", "social handoff", "status messages"] },
  { route: "/gallery-submit", surface: "gallery submit", policyContext: "default", features: ["Supabase storage upload", "status message"] },
  { route: "/leader-dashboard", surface: "moderation", policyContext: "protected", features: ["Supabase moderation queues", "status messages"] },
  { route: "/oauth/consent", surface: "OAuth consent", policyContext: "protected", features: ["server-verified authorization", "status messages"] },
  { route: "/raffle/claim", surface: "raffle claim", policyContext: "protected", features: ["server-verified winner claim"] },
  { route: "/leader-dashboard/raffle", surface: "raffle administration", policyContext: "protected", features: ["server-verified moderator controls"] },
  { route: "/spinner", surface: "private spinner", policyContext: "spinner", features: ["same-origin live spinner resources"] },
  { route: "/spotify", surface: "Spotify", policyContext: "default", features: ["Spotify iframe embeds"] },
  { route: "/spotlight", surface: "spotlight", policyContext: "default", features: ["Supabase public spotlight endpoint"] },
  { route: "/games/mochi-pets", surface: "Mochi Pets", policyContext: "default", features: ["same-origin tester form", "disconnected waiting room"] },
  { route: "/tome", surface: "Tome", policyContext: "default", features: ["static conduct content"] },
];

const nextConfigPath = resolve(root, "apps/web/next.config.ts");
const nextConfig = readRequired(nextConfigPath);
const protectedCspSource = readRequired(resolve(root, "apps/web/lib/security/protected-csp.ts"));
const proxySource = readRequired(resolve(root, "apps/web/proxy.ts"));
const sessionProxySource = readRequired(resolve(root, "apps/web/lib/supabase/proxy.ts"));
const authCookiePolicySource = readRequired(resolve(root, "apps/web/lib/supabase/auth-cookie-policy.ts"));
const privateResponsePolicySource = readRequired(resolve(root, "apps/web/lib/supabase/raffle-response-policy.ts"));
const expectedProtectedMatchers = [
  "/spinner",
  "/leader-dashboard",
  "/oauth/consent",
  "/raffle/claim/:path*",
  "/leader-dashboard/raffle/:path*",
];
const configuredProtectedMatchers = extractQuotedArray(proxySource, /matcher:\s*\[([\s\S]*?)\]/u);
const configuredSessionPaths = extractQuotedArray(
  proxySource,
  /SUPABASE_SESSION_PATHS\s*=\s*new Set\(\[([\s\S]*?)\]\)/u,
);
const claimsFailureBoundary = sessionProxySource.match(
  /try\s*\{[\s\S]*?await supabase\.auth\.getClaims\(\);[\s\S]*?\}\s*catch\s*\{([\s\S]*?)\}/u,
);
const protectedRouteHardening = {
  routes: ["/leader-dashboard", "/oauth/consent", "/raffle/claim", "/leader-dashboard/raffle"],
  nonceBound: protectedCspSource.includes("'nonce-${nonce}'"),
  strictDynamic: protectedCspSource.includes("'strict-dynamic'"),
  scriptUnsafeInline: /script-src[^\n]*unsafe-inline/.test(protectedCspSource),
  rootProxyDelegates:
    proxySource.includes('import { refreshSupabaseSession } from "./lib/supabase/proxy.ts";') &&
    sameStrings(configuredProtectedMatchers, expectedProtectedMatchers) &&
    sameStrings(configuredSessionPaths, ["/leader-dashboard", "/oauth/consent"]) &&
    (proxySource.match(/return refreshSupabaseSession\(request\);/gu) || []).length >= 2 &&
    !configuredProtectedMatchers.includes("/raffle"),
  helperAppliesNonceCsp:
    sessionProxySource.includes('import { protectedPageContentSecurityPolicy } from "../security/protected-csp.ts";') &&
    sessionProxySource.includes("const nonce = crypto.randomUUID().replaceAll(\"-\", \"\");") &&
    sessionProxySource.includes("protectedPageContentSecurityPolicy(nonce)") &&
    sessionProxySource.includes('requestHeaders.set("Content-Security-Policy", contentSecurityPolicy)') &&
    sessionProxySource.includes('requestHeaders.set("x-nonce", nonce)') &&
    sessionProxySource.includes("NextResponse.next({ request: { headers: requestHeaders } })") &&
    sessionProxySource.includes('response.headers.set("Content-Security-Policy", contentSecurityPolicy)'),
  helperAppliesFullPrivateHeaders:
    sessionProxySource.includes('import { PRIVATE_RAFFLE_HEADERS } from "./raffle-response-policy.ts";') &&
    sessionProxySource.includes("Object.entries(PRIVATE_RAFFLE_HEADERS).forEach") &&
    (sessionProxySource.match(/applyPrivateHeaders\(/gu) || []).length >= 3 &&
    privateResponsePolicySource.includes('"Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0"') &&
    privateResponsePolicySource.includes('Expires: "0"') &&
    privateResponsePolicySource.includes('Pragma: "no-cache"') &&
    privateResponsePolicySource.includes('"Referrer-Policy": "no-referrer"') &&
    privateResponsePolicySource.includes('"X-Content-Type-Options": "nosniff"') &&
    privateResponsePolicySource.includes('"X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex"'),
  secureCookiePolicy:
    sessionProxySource.includes('import { SUPABASE_AUTH_COOKIE_OPTIONS } from "./auth-cookie-policy.ts";') &&
    sessionProxySource.includes("cookieOptions: SUPABASE_AUTH_COOKIE_OPTIONS") &&
    authCookiePolicySource.includes('path: "/"') &&
    authCookiePolicySource.includes('sameSite: "lax"') &&
    authCookiePolicySource.includes('secure: process.env.NODE_ENV === "production"'),
  claimsFailureContained:
    Boolean(claimsFailureBoundary) && !/\bthrow\b/u.test(claimsFailureBoundary?.[1] || ""),
};
const policyContexts = inspectPolicyContexts(nextConfig, protectedCspSource);
const policy = policyContexts.default;
validateNonLiteralRuntimeLoadPatternCoverage();
const sourceInventory = inspectSource(policyContexts);
validateReviewedInlineUsageContracts(sourceInventory);
validateReviewedExternalReferenceContracts(sourceInventory);
validateReviewedNonLiteralRuntimeLoadContracts(sourceInventory);
const live = liveHeaders ? await inspectLiveHeaders() : { status: "skipped", reason: "run with --live to check production headers" };

for (const [context, contextPolicy] of Object.entries(policyContexts)) {
  if (!contextPolicy.headerEnforced) {
    failures.push(`${context} CSP is defined but not applied by its reviewed route boundary.`);
  }
  if (contextPolicy.reportOnlyMentioned) {
    failures.push(`${context} CSP must remain enforced rather than report-only.`);
  }
  if (contextPolicy.unsafeEvalDirectives.length) {
    failures.push(`${context} CSP must not allow unsafe-eval: ${contextPolicy.unsafeEvalDirectives.join(", ")}`);
  }
  if (
    contextPolicy.unsafeInlineDirectives.some((directive) =>
      !["script-src", "style-src", "style-src-attr"].includes(directive))
  ) {
    failures.push(`${context} CSP has unsafe-inline outside the reviewed script/style directives.`);
  }
}
for (const route of routeMatrix) {
  if (!policyContexts[route.policyContext]) {
    failures.push(`${route.route}: unknown CSP policy context ${route.policyContext}.`);
  }
}
if (!protectedRouteHardening.nonceBound || !protectedRouteHardening.strictDynamic || protectedRouteHardening.scriptUnsafeInline) {
  failures.push("Protected auth routes must use the reviewed nonce-bound strict script policy.");
}
if (!protectedRouteHardening.rootProxyDelegates) {
  failures.push("The root proxy must delegate the exact protected-route matcher contract to the Supabase session helper.");
}
if (!protectedRouteHardening.helperAppliesNonceCsp) {
  failures.push("The Supabase session helper must propagate the nonce-bound CSP through request and response headers.");
}
if (!protectedRouteHardening.helperAppliesFullPrivateHeaders) {
  failures.push("The Supabase session helper must preserve the complete private response-header policy.");
}
if (!protectedRouteHardening.secureCookiePolicy) {
  failures.push("The Supabase session helper must preserve the reviewed secure authentication-cookie policy.");
}
if (!protectedRouteHardening.claimsFailureContained) {
  failures.push("The Supabase session helper must contain claim-refresh failures without bypassing the authoritative DAL.");
}
if (sourceInventory.blockingHits.length) {
  for (const hit of sourceInventory.blockingHits) {
    failures.push(`${hit.file}:${hit.line}: ${hit.label} requires a CSP review before inline hardening.`);
  }
}
for (const resource of sourceInventory.externalReferences.runtimeResources) {
  if (resource.missingDirectives.length) {
    failures.push(
      `${resource.origin} is runtime-loaded on ${resource.routes.join(", ")} but ${resource.policyContext} CSP is missing ${resource.missingDirectives.join(", ")}.`,
    );
  }
}
for (const reference of sourceInventory.externalReferences.unreviewedReferences) {
  failures.push(
    `${reference.file}:${reference.line}: ${reference.origin} has no reviewed external-reference contract.`,
  );
}
for (const load of sourceInventory.nonLiteralRuntimeLoads.unreviewed) {
  failures.push(`${load.file}:${load.line}: ${load.patternId} has no exact reviewed non-literal runtime-load contract.`);
}
if (!directiveHasSource(policy.directiveMap, "frame-src", "https://open.spotify.com")) {
  failures.push("CSP frame-src must explicitly allow Spotify embeds.");
}
if (
  !directiveHasSource(policy.directiveMap, "connect-src", "https://*.supabase.co") ||
  !directiveHasSource(policy.directiveMap, "connect-src", "wss://*.supabase.co")
) {
  failures.push("CSP connect-src must allow Supabase API and realtime origins.");
}

const report = {
  ok: failures.length === 0,
  checkedAt,
  scope:
    "CSP inline hardening inventory for the Vercel/Next production app. This is a no-secret, read-only pass that prepares the later browser-verified unsafe-inline reduction.",
  baseUrl,
  policy,
  policyContexts,
  protectedRouteHardening,
  sourceInventory,
  routeMatrix,
  live,
  nextSteps: [
    "Keep the reviewed inline-style allowlist exact; remove or redesign each controlled runtime style before tightening style-src or style-src-attr.",
    "Run a Vercel Preview browser pass before removing style-src unsafe-inline because framework-managed image/route helpers can still emit runtime style attributes.",
    "Keep auth Turnstile, Discord preview, and Spotify iframe routes in the browser route sweep.",
    "Verify Supabase auth/storage, Vercel Analytics, and Speed Insights before tightening CSP.",
    "Keep nonce-based strict script CSP on the already-dynamic auth routes and include them in every browser release sweep.",
    "Keep public routes static while Turbopack lacks stable hash-based SRI; reconsider global script-src unsafe-inline only when a cache-compatible stable path exists.",
  ],
  warnings,
  failures,
};

const markdown = renderMarkdown(report);
scanRenderedReport("json", JSON.stringify(report));
scanRenderedReport("markdown", markdown);
report.ok = failures.length === 0;

if (writeReport) {
  mkdirSync(dirname(reportJsonPath), { recursive: true });
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(reportMdPath, renderMarkdown(report), "utf8");
}

if (!report.ok) {
  console.error("CSP inline hardening inventory failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CSP inline hardening inventory OK.");
console.log(`- unsafe-inline directives: ${policy.unsafeInlineDirectives.join(", ") || "none"}`);
console.log(`- strict protected routes: ${protectedRouteHardening.routes.join(", ")}`);
console.log(`- reviewed React inline style props: ${sourceInventory.patterns.inlineStyleProp.reviewedCount}/${sourceInventory.patterns.inlineStyleProp.count}`);
console.log(`- iframe elements: ${sourceInventory.patterns.iframeElement.count}`);
console.log(`- runtime external resource origins: ${sourceInventory.externalReferences.runtimeResources.length}`);
console.log(`- reviewed non-literal runtime loads: ${sourceInventory.nonLiteralRuntimeLoads.reviewed.length}`);
console.log(`- live header check: ${live.status}`);
if (writeReport) {
  console.log(`- JSON report: ${pathForReport(reportJsonPath)}`);
  console.log(`- Markdown report: ${pathForReport(reportMdPath)}`);
}

function extractQuotedArray(text, pattern) {
  const body = text.match(pattern)?.[1] || "";
  return [...body.matchAll(/["']([^"']+)["']/gu)].map((match) => match[1]);
}

function sameStrings(actual, expected) {
  if (actual.length !== expected.length) return false;
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  return sortedActual.every((value, index) => value === sortedExpected[index]);
}

function inspectPolicyContexts(nextConfigText, protectedPolicyText) {
  const defaultEntries = extractNamedCspEntries(nextConfigText, "contentSecurityPolicy");
  const authEntries = extractDerivedPolicyEntries(nextConfigText, "authContentSecurityPolicy", defaultEntries);
  const spinnerEntries = extractNamedCspEntries(nextConfigText, "spinnerContentSecurityPolicy");
  const protectedEntries = extractReturnedCspEntries(protectedPolicyText, "protectedPageContentSecurityPolicy");

  return {
    default: inspectPolicy(defaultEntries, {
      source: "apps/web/next.config.ts#contentSecurityPolicy",
      headerEnforced: /key:\s*["']Content-Security-Policy["']/.test(nextConfigText),
      reportOnlyMentioned: /Content-Security-Policy-Report-Only/.test(nextConfigText),
    }),
    auth: inspectPolicy(authEntries, {
      source: "apps/web/next.config.ts#authContentSecurityPolicy",
      headerEnforced: nextConfigText.includes('source: "/auth"') && nextConfigText.includes("value: authContentSecurityPolicy"),
      reportOnlyMentioned: false,
    }),
    spinner: inspectPolicy(spinnerEntries, {
      source: "apps/web/next.config.ts#spinnerContentSecurityPolicy",
      headerEnforced: nextConfigText.includes('source: "/spinner/:path*"') && nextConfigText.includes("value: spinnerContentSecurityPolicy"),
      reportOnlyMentioned: false,
    }),
    protected: inspectPolicy(protectedEntries, {
      source: "apps/web/lib/security/protected-csp.ts#protectedPageContentSecurityPolicy",
      headerEnforced: protectedRouteHardening.helperAppliesNonceCsp,
      reportOnlyMentioned: false,
    }),
  };
}

function inspectPolicy(entries, metadata) {
  const directiveMap = {};
  for (const entry of entries) {
    const [directive, ...sources] = entry.split(/\s+/).filter(Boolean);
    if (!directive) continue;
    directiveMap[directive] = sources;
  }
  const unsafeInlineDirectives = Object.entries(directiveMap)
    .filter(([, sources]) => sources.includes("'unsafe-inline'"))
    .map(([directive]) => directive);
  const unsafeEvalDirectives = Object.entries(directiveMap)
    .filter(([, sources]) => sources.includes("'unsafe-eval'"))
    .map(([directive]) => directive);

  return {
    ...metadata,
    entries,
    directiveMap,
    unsafeInlineDirectives,
    unsafeEvalDirectives,
    inlineReductionReady: unsafeInlineDirectives.length === 0,
  };
}

function extractNamedCspEntries(text, variableName) {
  const escapedName = variableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`const\\s+${escapedName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\.join\\(\"; \"\\);`, "u"));
  if (!match) {
    failures.push(`apps/web/next.config.ts: unable to locate ${variableName} array.`);
    return [];
  }
  return extractCspArrayBody(match[1]);
}

function extractReturnedCspEntries(text, functionName) {
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const functionBody = text.match(new RegExp(`function\\s+${escapedName}\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`, "u"))?.[1] || "";
  const match = functionBody.match(/return\s*\[([\s\S]*?)\]\.join\("; "\);/u);
  if (!match) {
    failures.push(`apps/web/lib/security/protected-csp.ts: unable to locate ${functionName} policy array.`);
    return [];
  }
  return extractCspArrayBody(match[1]);
}

function extractDerivedPolicyEntries(text, variableName, baseEntries) {
  const escapedName = variableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = text.match(
    new RegExp(`const\\s+${escapedName}\\s*=\\s*contentSecurityPolicy([\\s\\S]*?);\\s*\\n\\s*const\\s+`, "u"),
  )?.[1] || "";
  const replacements = [...expression.matchAll(/\.replace\(\s*(["'])([\s\S]*?)\1\s*,\s*(["'])([\s\S]*?)\3\s*,?\s*\)/gu)]
    .map((match) => ({ from: match[2], to: match[4] }));
  if (!replacements.length) {
    failures.push(`apps/web/next.config.ts: unable to resolve ${variableName} route override.`);
    return [];
  }
  let derived = baseEntries.join("; ");
  for (const replacement of replacements) {
    if (!derived.includes(replacement.from)) {
      failures.push(`apps/web/next.config.ts: ${variableName} replacement source is absent from the base policy.`);
      continue;
    }
    derived = derived.replace(replacement.from, replacement.to);
  }
  return Object.entries(parseCspHeader(derived)).map(([directive, sources]) =>
    [directive, ...sources].join(" "));
}

function extractCspArrayBody(body) {
  const entries = [];
  for (const rawLine of body.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;
    line = line.replace(/,\s*$/, "").trim();
    const quote = line[0];
    if (!["'", '"', "`"].includes(quote) || line[line.length - 1] !== quote) continue;
    const entry = line.slice(1, -1).trim();
    if (entry) entries.push(entry);
  }
  return entries;
}

function inspectSource(policyContexts) {
  const dirs = ["apps/web/app", "apps/web/components", "apps/web/lib"];
  const files = dirs.flatMap((dir) => collectFiles(resolve(root, dir))).filter((file) =>
    [".ts", ".tsx", ".mts", ".js", ".jsx", ".css"].includes(extname(file)),
  );
  const patterns = {
    inlineStyleProp: { label: "React inline style prop", severity: "block-unless-reviewed", regex: /\bstyle\s*=\s*\{/g, hits: [] },
    iframeElement: { label: "iframe element", severity: "block-unless-reviewed", regex: /<iframe\b/g, hits: [] },
    scriptElement: { label: "script element", severity: "block-unless-reviewed", regex: /<script\b/g, hits: [] },
    dynamicScriptElement: {
      label: "dynamic script element",
      severity: "block-unless-reviewed",
      regex: /document\.createElement\(\s*["']script["']\s*\)/g,
      hits: [],
    },
    styleElement: { label: "style element", severity: "block-unless-reviewed", regex: /<style\b/g, hits: [] },
    dynamicStyleElement: {
      label: "dynamic style element",
      severity: "block-unless-reviewed",
      regex: /document\.createElement\(\s*["']style["']\s*\)/g,
      hits: [],
    },
    nextScriptImport: { label: "next/script import", severity: "block-unless-reviewed", regex: /from\s+["']next\/script["']/g, hits: [] },
    dangerouslySetInnerHTML: {
      label: "dangerouslySetInnerHTML",
      severity: "block-unless-reviewed",
      regex: /\bdangerouslySetInnerHTML\b/g,
      hits: [],
    },
    srcDoc: { label: "iframe srcDoc", severity: "block", regex: /\bsrcDoc\b/g, hits: [] },
    evalCall: { label: "eval call", severity: "block", regex: /\beval\s*\(/g, hits: [] },
    newFunction: { label: "new Function", severity: "block", regex: /\bnew\s+Function\b/g, hits: [] },
  };
  const externalReferenceBuckets = {
    runtimeResources: new Map(),
    navigationAndData: new Map(),
    testFixtures: new Map(),
    policyDeclarations: new Map(),
    unreviewedReferences: [],
  };
  const nonLiteralRuntimeLoadHits = [];

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const rel = pathForReport(file);
    const testFixture = isTestFixtureFile(rel);
    const lines = text.split(/\r?\n/);
    if (!testFixture) {
      lines.forEach((line, index) => {
        for (const pattern of Object.values(patterns)) {
          pattern.regex.lastIndex = 0;
          const matches = line.match(pattern.regex);
          if (!matches) continue;
          pattern.hits.push({ file: rel, line: index + 1, count: matches.length });
        }
      });
      for (const [patternId, pattern] of Object.entries(nonLiteralRuntimeLoadPatterns)) {
        pattern.lastIndex = 0;
        for (const match of text.matchAll(pattern)) {
          nonLiteralRuntimeLoadHits.push({
            patternId,
            file: rel,
            line: lineNumberAt(text, match.index || 0),
          });
        }
      }
    }
    for (const reference of findUrlReferences(text)) {
      const classification = classifyExternalReference(rel, reference.url, testFixture);
      if (classification.category === "unreviewedReferences") {
        externalReferenceBuckets.unreviewedReferences.push({
          origin: reference.url.origin,
          file: rel,
          line: reference.line,
        });
        continue;
      }
      addReference(externalReferenceBuckets[classification.category], reference.url.origin, rel);
    }
  }

  const summarizedPatterns = Object.fromEntries(
    Object.entries(patterns).map(([id, pattern]) => [
      id,
      {
        label: pattern.label,
        severity: pattern.severity,
        count: pattern.hits.reduce((total, hit) => total + hit.count, 0),
        reviewedCount: pattern.hits
          .filter((hit) => isReviewedInlineUsage({ ...hit, patternId: id }))
          .reduce((total, hit) => total + hit.count, 0),
        files: summarizeHitFiles(pattern.hits),
        hits: pattern.hits,
      },
    ]),
  );
  const allBlockingHits = Object.entries(summarizedPatterns)
    .filter(([, pattern]) => ["block", "block-unless-reviewed"].includes(pattern.severity))
    .flatMap(([patternId, pattern]) => pattern.hits.map((hit) => ({ ...hit, patternId, label: pattern.label })));
  const reviewedBlockingHits = allBlockingHits.filter(isReviewedInlineUsage);
  const blockingHits = allBlockingHits.filter((hit) => !isReviewedInlineUsage(hit));
  const reviewedNonLiteralRuntimeLoads = nonLiteralRuntimeLoadHits.filter(isReviewedNonLiteralRuntimeLoad);
  const unreviewedNonLiteralRuntimeLoads = nonLiteralRuntimeLoadHits.filter(
    (hit) => !isReviewedNonLiteralRuntimeLoad(hit),
  );

  return {
    scannedFiles: files.length,
    scannedRoots: dirs,
    patterns: summarizedPatterns,
    blockingHits,
    reviewedBlockingHits,
    externalReferences: summarizeExternalReferences(externalReferenceBuckets, policyContexts),
    nonLiteralRuntimeLoads: {
      reviewed: reviewedNonLiteralRuntimeLoads,
      unreviewed: unreviewedNonLiteralRuntimeLoads,
    },
  };
}

function isReviewedInlineUsage(hit) {
  const contract = reviewedInlineUsageContracts.find(
    (entry) => entry.patternId === hit.patternId && entry.file === hit.file,
  );
  if (!contract) return false;
  const source = readFileSync(resolve(root, hit.file), "utf8");
  const pattern = inlinePatternRegex(hit.patternId);
  const occurrences = pattern ? source.match(pattern) || [] : [];
  return occurrences.length === contract.count && contract.evidence.every((needle) => source.includes(needle));
}

function validateReviewedInlineUsageContracts(sourceInventory) {
  for (const contract of reviewedInlineUsageContracts) {
    const pattern = sourceInventory.patterns[contract.patternId];
    const actualCount = pattern?.hits
      .filter((hit) => hit.file === contract.file)
      .reduce((total, hit) => total + hit.count, 0) || 0;
    const source = readRequired(resolve(root, contract.file));
    const evidencePresent = contract.evidence.every((needle) => source.includes(needle));
    if (actualCount !== contract.count || !evidencePresent) {
      failures.push(
        `${contract.file}: reviewed ${contract.patternId} contract drifted (expected ${contract.count}, found ${actualCount}).`,
      );
    }
  }
}

function validateReviewedExternalReferenceContracts(sourceInventory) {
  validateReferenceContractGroup(
    "navigation/data",
    sourceInventory.externalReferences.navigationAndData,
    reviewedNavigationAndDataContracts,
  );
  validateReferenceContractGroup(
    "policy declaration",
    sourceInventory.externalReferences.policyDeclarations,
    reviewedPolicyDeclarationContracts,
  );
}

function validateNonLiteralRuntimeLoadPatternCoverage() {
  const probes = [
    { patternId: "fetchCall", source: "const endpoint = resolveEndpoint();\nfetch(\n  endpoint,\n);", expected: 1 },
    { patternId: "fetchCall", source: 'fetch("/same-origin")', expected: 0 },
    { patternId: "srcAssignment", source: "const endpoint = resolveEndpoint();\nscript.src =\n  endpoint;", expected: 1 },
    { patternId: "srcAssignment", source: "item.src === currentSrc", expected: 0 },
    { patternId: "webSocketConstructor", source: "new WebSocket(\n  endpoint,\n)", expected: 1 },
  ];
  for (const probe of probes) {
    const pattern = nonLiteralRuntimeLoadPatterns[probe.patternId];
    pattern.lastIndex = 0;
    const actual = [...probe.source.matchAll(pattern)].length;
    if (actual !== probe.expected) {
      failures.push(
        `Internal ${probe.patternId} regression probe failed (expected ${probe.expected}, found ${actual}).`,
      );
    }
  }
}

function validateReferenceContractGroup(label, actual, expected) {
  const normalize = (entries) => entries
    .map((entry) => ({ origin: entry.origin, files: [...entry.files].sort() }))
    .sort((left, right) => left.origin.localeCompare(right.origin));
  if (JSON.stringify(normalize(actual)) !== JSON.stringify(normalize(expected))) {
    failures.push(`Reviewed ${label} origin/file contracts drifted; inspect the JSON inventory before changing CSP.`);
  }
}

function validateReviewedNonLiteralRuntimeLoadContracts(sourceInventory) {
  const allHits = [
    ...sourceInventory.nonLiteralRuntimeLoads.reviewed,
    ...sourceInventory.nonLiteralRuntimeLoads.unreviewed,
  ];
  for (const contract of reviewedNonLiteralRuntimeLoadContracts) {
    const actualCount = allHits.filter(
      (hit) => hit.patternId === contract.patternId && hit.file === contract.file,
    ).length;
    const source = readRequired(resolve(root, contract.file));
    const evidencePresent = contract.evidence.every((needle) => source.includes(needle));
    if (actualCount !== contract.count || !evidencePresent) {
      failures.push(
        `${contract.file}: reviewed ${contract.patternId} runtime-load contract drifted (expected ${contract.count}, found ${actualCount}).`,
      );
    }
  }
}

function isReviewedNonLiteralRuntimeLoad(hit) {
  return reviewedNonLiteralRuntimeLoadContracts.some(
    (contract) => contract.patternId === hit.patternId && contract.file === hit.file,
  );
}

function inlinePatternRegex(patternId) {
  const patterns = {
    inlineStyleProp: /\bstyle\s*=\s*\{/gu,
    iframeElement: /<iframe\b/gu,
    scriptElement: /<script\b/gu,
    dynamicScriptElement: /document\.createElement\(\s*["']script["']\s*\)/gu,
    styleElement: /<style\b/gu,
    dynamicStyleElement: /document\.createElement\(\s*["']style["']\s*\)/gu,
    nextScriptImport: /from\s+["']next\/script["']/gu,
    dangerouslySetInnerHTML: /\bdangerouslySetInnerHTML\b/gu,
    srcDoc: /\bsrcDoc\b/gu,
    evalCall: /\beval\s*\(/gu,
    newFunction: /\bnew\s+Function\b/gu,
  };
  return patterns[patternId] || null;
}

function isTestFixtureFile(file) {
  return /(?:_test|\.test)\.[^/]+$/u.test(file);
}

function classifyExternalReference(file, url, testFixture) {
  if (testFixture) return { category: "testFixtures" };
  if (hasReviewedOriginFile(runtimeResourceContracts, url.origin, file)) {
    return { category: "runtimeResources" };
  }
  if (hasReviewedOriginFile(reviewedNavigationAndDataContracts, url.origin, file)) {
    return { category: "navigationAndData" };
  }
  if (hasReviewedOriginFile(reviewedPolicyDeclarationContracts, url.origin, file)) {
    return { category: "policyDeclarations" };
  }
  return { category: "unreviewedReferences" };
}

function hasReviewedOriginFile(contracts, origin, file) {
  return contracts.some((contract) => contract.origin === origin && contract.files.includes(file));
}

function addReference(bucket, origin, file) {
  if (!bucket.has(origin)) bucket.set(origin, new Set());
  bucket.get(origin).add(file);
}

function summarizeReferenceMap(bucket) {
  return [...bucket.entries()]
    .map(([origin, files]) => ({ origin, files: [...files].sort() }))
    .sort((a, b) => a.origin.localeCompare(b.origin));
}

function summarizeExternalReferences(buckets, policyContexts) {
  const runtimeResources = runtimeResourceContracts.map((contract) => {
    const policy = policyContexts[contract.policyContext];
    const allowedDirectives = contract.requiredDirectives.filter((directive) =>
      directiveHasOrigin(policy?.directiveMap || {}, directive, contract.origin));
    const sourceEvidencePresent = contract.files.every((file) => {
      const source = readRequired(resolve(root, file));
      return contract.evidence.every((needle) => source.includes(needle));
    });
    if (!sourceEvidencePresent) {
      failures.push(`${contract.origin}: reviewed runtime-resource evidence drifted in ${contract.files.join(", ")}.`);
    }
    return {
      ...contract,
      sourceEvidencePresent,
      allowedDirectives,
      missingDirectives: contract.requiredDirectives.filter((directive) => !allowedDirectives.includes(directive)),
    };
  });

  return {
    runtimeResources,
    navigationAndData: summarizeReferenceMap(buckets.navigationAndData),
    testFixtures: summarizeReferenceMap(buckets.testFixtures),
    policyDeclarations: summarizeReferenceMap(buckets.policyDeclarations),
    unreviewedReferences: buckets.unreviewedReferences,
  };
}

async function inspectLiveHeaders() {
  const results = [];
  for (const route of routeMatrix) {
    const url = `${baseUrl}${route.route}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
        headers: {
          "User-Agent": "Mochirii CSP inline hardening inventory",
        },
      });
      const csp = response.headers.get("content-security-policy") || "";
      const reportOnly = response.headers.get("content-security-policy-report-only") || "";
      const parsed = parseCspHeader(csp);
      const result = {
        route: route.route,
        status: response.status,
        cspPresent: Boolean(csp),
        reportOnlyPresent: Boolean(reportOnly),
        unsafeInlineDirectives: Object.entries(parsed)
          .filter(([, sources]) => sources.includes("'unsafe-inline'"))
          .map(([directive]) => directive),
        unsafeEvalDirectives: Object.entries(parsed)
          .filter(([, sources]) => sources.includes("'unsafe-eval'"))
          .map(([directive]) => directive),
      };
      if (!result.cspPresent) failures.push(`${route.route}: live response missing Content-Security-Policy.`);
      if (result.reportOnlyPresent) failures.push(`${route.route}: live response should not include report-only CSP.`);
      if (result.unsafeEvalDirectives.length) {
        failures.push(`${route.route}: live CSP allows unsafe-eval in ${result.unsafeEvalDirectives.join(", ")}.`);
      }
      results.push(result);
    } catch (error) {
      failures.push(`${route.route}: live header check failed: ${error?.message || error}`);
      results.push({ route: route.route, status: "error", error: error?.message || String(error) });
    }
  }
  return {
    status: "checked",
    baseUrl,
    routes: results,
  };
}

function parseCspHeader(header) {
  const parsed = {};
  for (const directiveText of String(header || "").split(";")) {
    const [directive, ...sources] = directiveText.trim().split(/\s+/).filter(Boolean);
    if (directive) parsed[directive] = sources;
  }
  return parsed;
}

function directiveHasSource(directiveMap, directive, expectedSource) {
  return Array.isArray(directiveMap[directive]) && directiveMap[directive].includes(expectedSource);
}

function directiveHasOrigin(directiveMap, directive, origin) {
  return Array.isArray(directiveMap[directive]) &&
    directiveMap[directive].some((source) => sourceAllowsOrigin(source, origin));
}

function renderMarkdown(report) {
  const policyRows = Object.entries(report.policyContexts)
    .map(
      ([context, contextPolicy]) =>
        `| ${context} | ${contextPolicy.source} | ${contextPolicy.unsafeInlineDirectives.join(", ") || "none"} | ${contextPolicy.unsafeEvalDirectives.join(", ") || "none"} |`,
    )
    .join("\n");
  const directiveRows = Object.entries(report.policyContexts)
    .flatMap(([context, contextPolicy]) =>
      Object.entries(contextPolicy.directiveMap)
        .map(([directive, sources]) => `| ${context} | ${directive} | ${sources.join(" ")} |`))
    .join("\n");
  const patternRows = Object.entries(report.sourceInventory.patterns)
    .map(
      ([id, pattern]) =>
        `| ${id} | ${pattern.severity} | ${pattern.count} | ${pattern.reviewedCount} | ${pattern.count - pattern.reviewedCount} | ${pattern.files.map((entry) => `${entry.file} (${entry.count})`).join("<br>") || "none"} |`,
    )
    .join("\n");
  const routeRows = report.routeMatrix
    .map((entry) => `| ${entry.route} | ${entry.surface} | ${entry.policyContext} | ${entry.features.join(", ")} |`)
    .join("\n");
  const liveRows =
    report.live.status === "checked"
      ? report.live.routes
          .map(
            (entry) =>
              `| ${entry.route} | ${entry.status} | ${entry.cspPresent ? "yes" : "no"} | ${entry.reportOnlyPresent ? "yes" : "no"} | ${entry.unsafeInlineDirectives?.join(", ") || "none"} |`,
          )
          .join("\n")
      : `| skipped | ${report.live.reason} | n/a | n/a | n/a |`;
  const runtimeResourceRows = report.sourceInventory.externalReferences.runtimeResources
    .map(
      (entry) =>
        `| ${entry.origin} | ${entry.routes.join(", ")} | ${entry.policyContext} | ${entry.requiredDirectives.join(", ")} | ${entry.allowedDirectives.join(", ") || "none"} | ${entry.use} |`,
    )
    .join("\n");
  const referenceSummaryRows = [
    ["runtime resources", report.sourceInventory.externalReferences.runtimeResources.length, "Validated against the effective route policy"],
    ["navigation and data", report.sourceInventory.externalReferences.navigationAndData.length, "Exact reviewed origin/file contracts for ordinary hyperlinks, redirect targets, placeholders, metadata identifiers, or validated stored values"],
    ["test fixtures", report.sourceInventory.externalReferences.testFixtures.length, "Test-only origins excluded from runtime CSP analysis"],
    ["policy declarations", report.sourceInventory.externalReferences.policyDeclarations.length, "Exact reviewed origins declared by a CSP helper, not source-triggered requests"],
    ["unreviewed external references", report.sourceInventory.externalReferences.unreviewedReferences.length, "Fail-closed until assigned an exact origin/file contract"],
  ].map(([category, count, meaning]) => `| ${category} | ${count} | ${meaning} |`).join("\n");
  const nextSteps = report.nextSteps.map((step) => `- ${step}`).join("\n");
  const warningsText = report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const failuresText = report.failures.length ? report.failures.map((failure) => `- ${failure}`).join("\n") : "- None";

  return `# CSP Inline Hardening Inventory

Generated: ${report.checkedAt}

This file is intentionally no-secret. It inventories the current CSP and inline-sensitive production app source before any future removal of \`unsafe-inline\`.
Every non-test external origin/file pair and every non-literal runtime load must match an exact reviewed contract. This avoids relying on URL declarations and browser sinks appearing on the same source line.

## Result

- OK: ${report.ok ? "yes" : "no"}
- Base URL: ${report.baseUrl}
- CSP enforced in Next config: ${report.policy.headerEnforced ? "yes" : "no"}
- Report-only CSP in Next config: ${report.policy.reportOnlyMentioned ? "yes" : "no"}
- Unsafe-inline directives: ${report.policy.unsafeInlineDirectives.join(", ") || "none"}
- Unsafe-eval directives: ${report.policy.unsafeEvalDirectives.join(", ") || "none"}
- Scanned source files: ${report.sourceInventory.scannedFiles}
- Reviewed inline-style props: ${report.sourceInventory.patterns.inlineStyleProp.reviewedCount}
- Unreviewed inline-style props: ${report.sourceInventory.patterns.inlineStyleProp.count - report.sourceInventory.patterns.inlineStyleProp.reviewedCount}
- Reviewed non-literal runtime loads: ${report.sourceInventory.nonLiteralRuntimeLoads.reviewed.length}
- Unreviewed non-literal runtime loads: ${report.sourceInventory.nonLiteralRuntimeLoads.unreviewed.length}

The reviewed inline-style count is intentionally nonzero. These controlled component styles remain documented until a separately browser-verified CSP reduction removes or replaces them; any new unreviewed inline script or style fails this check.

## Policy Contexts

| Context | Source | Unsafe-inline | Unsafe-eval |
| --- | --- | --- | --- |
${policyRows}

## Directives

| Context | Directive | Sources |
| --- | --- | --- |
${directiveRows}

## Inline-Sensitive Source Inventory

| Pattern | Severity | Count | Reviewed | Unreviewed | Files |
| --- | --- | ---: | ---: | ---: | --- |
${patternRows}

## External Reference Classification

| Category | Unique origins or contracts | Meaning |
| --- | ---: | --- |
${referenceSummaryRows}

Full navigation/data, test-fixture, and policy-declaration origin/file lists remain in the JSON inventory. New non-test origin/file pairs fail until reviewed; test-only URLs remain separately classified.

## Runtime Resource Contracts

| Origin | Routes | Policy context | Required directives | Allowed directives | Runtime use |
| --- | --- | --- | --- | --- | --- |
${runtimeResourceRows}

## Browser Route Matrix

| Route | Surface | Policy context | CSP-sensitive features |
| --- | --- | --- | --- |
${routeRows}

## Live Header Sweep

| Route | Status | CSP | Report-only | Unsafe-inline |
| --- | ---: | --- | --- | --- |
${liveRows}

## Next Steps

${nextSteps}

## Warnings

${warningsText}

## Failures

${failuresText}
`;
}

function collectFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      files.push(...collectFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function summarizeHitFiles(hits) {
  const counts = new Map();
  for (const hit of hits) counts.set(hit.file, (counts.get(hit.file) || 0) + hit.count);
  return [...counts.entries()]
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
}

function lineNumberAt(text, index) {
  return String(text || "").slice(0, index).split(/\r?\n/u).length;
}

function findUrlReferences(text) {
  const references = [];
  const pattern = /https?:\/\/[^\s"'`<>)}]+/g;
  for (const match of String(text || "").matchAll(pattern)) {
    if (match[0].includes("${") || match[0].includes("}")) continue;
    try {
      references.push({
        url: new URL(match[0].replace(/[.,;]+$/, "")),
        line: lineNumberAt(text, match.index || 0),
      });
    } catch {
      // Ignore non-URL source fragments.
    }
  }
  return references;
}

function sourceAllowsOrigin(source, origin) {
  if (!source || source === "data:" || source === "blob:") return false;
  if (source === "'self'") return origin === new URL(baseUrl).origin;
  if (source === origin) return true;
  if (source.startsWith("https://*.")) {
    const suffix = source.replace("https://*.", "");
    try {
      const candidate = new URL(origin);
      return candidate.protocol === "https:" &&
        (candidate.hostname === suffix || candidate.hostname.endsWith(`.${suffix}`));
    } catch {
      return false;
    }
  }
  return false;
}

function scanRenderedReport(label, text) {
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
  String(text || "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const { label: patternLabel, pattern } of forbiddenPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) failures.push(`rendered ${label} report line ${index + 1}: ${patternLabel}`);
      }
    });
}

function readRequired(file) {
  if (!existsSync(file)) {
    failures.push(`${pathForReport(file)}: missing required file.`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function pathForReport(file) {
  return relative(root, file).replace(/\\/g, "/");
}
