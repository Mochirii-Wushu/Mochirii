import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SOCIAL_HOST } from "./lib/public-urls.mjs";

const root = process.cwd();
const failures = [];

const paths = {
  page: "apps/web/app/games/mochi-pets/page.tsx",
  metadata: "apps/web/components/public-pages/metadata.ts",
  publicConcept: "apps/web/components/mochi-pets/MochiPetsPublicConcept.tsx",
  configuredDoorway: "apps/web/components/mochi-pets/MochiPetsConfiguredDoorway.tsx",
  privateDoorway: "apps/web/components/mochi-pets/MochiPetsPrivateDoorway.tsx",
  memberAccess: "apps/web/app/games/mochi-pets/member-access/route.ts",
  login: "apps/web/app/games/mochi-pets/tester-login/route.ts",
  logout: "apps/web/app/games/mochi-pets/tester-logout/route.ts",
  gate: "apps/web/components/mochi-pets/MochiPetsTesterPasswordGate.tsx",
  waitingRoom: "apps/web/components/mochi-pets/MochiPetsTesterWaitingRoom.tsx",
  arrival: "apps/web/components/mochi-pets/MochiPetsArrivalScene.tsx",
  session: "apps/web/lib/mochi-pets/tester-session.ts",
  sessionCore: "apps/web/lib/mochi-pets/tester-session-core.ts",
  sessionTest: "apps/web/lib/mochi-pets/tester-session-core.test.mts",
  memberVerification: "apps/web/lib/mochi-pets/member-verification.ts",
  memberVerificationCore: "apps/web/lib/mochi-pets/member-verification-core.ts",
  memberVerificationTest: "apps/web/lib/mochi-pets/member-verification-core.test.mts",
  testerAccessPolicy: "apps/web/lib/mochi-pets/tester-access-policy-core.ts",
  testerAccessPolicyTest: "apps/web/lib/mochi-pets/tester-access-policy-core.test.mts",
  testerRateLimit: "apps/web/lib/mochi-pets/tester-rate-limit.ts",
  testerRateLimitCore: "apps/web/lib/mochi-pets/tester-rate-limit-core.ts",
  testerRateLimitTest: "apps/web/lib/mochi-pets/tester-rate-limit.test.mts",
  connectionHelper: "apps/web/lib/mochi-pets/connection.ts",
  connection: "apps/web/config/mochi-pets-connection.json",
  schema: "docs/integrations/mochi-pets-website-contract.v1.schema.json",
  contract: "docs/integrations/mochi-pets-website-contract.md",
  navigation: "apps/web/lib/site-navigation.ts",
  footer: "apps/web/components/SiteFooter.tsx",
  sitemap: "apps/web/public/sitemap.xml",
  localSmokeHarness: "scripts/run-mochi-pets-tester-doorway-local.mjs",
  browserSmoke: "scripts/smoke-mochi-pets-tester-doorway.mjs",
  checkAll: "scripts/check-all.mjs",
  css: "apps/web/app/styles/mochi-pets.css",
  artwork: "apps/web/public/assets/img/mochi-pets/gate-arrival.webp",
  webEnv: "apps/web/.env.example",
  webReadme: "apps/web/README.md",
  architecture: "docs/architecture.md",
  currentLiveState: "docs/current-live-state.md",
  futureProject: "docs/mochi-pets-future-project.md",
  currentState: "docs/operations/CURRENT-STATE.md",
  websiteContract: "docs/integrations/mochi-pets-website-contract.md",
  repositoryOwnership: "docs/operations/repository-ownership.md",
};

const retiredFiles = [
  "apps/web/components/mochi-pets/MochiPetsAlphaClient.tsx",
  "apps/web/lib/mochi-pets/alpha.ts",
  "apps/web/lib/mochi-pets/bridge.ts",
];

for (const [label, file] of Object.entries(paths)) {
  if (!existsSync(resolve(root, file))) failures.push(`${label}: required file is missing: ${file}`);
}
for (const file of retiredFiles) {
  if (existsSync(resolve(root, file))) failures.push(`${file}: retired game integration file must stay absent`);
}

const page = read(paths.page);
const metadata = read(paths.metadata);
assertIncludes("public page", page, [
  'metadataFor("mochiPets")',
  '<BodyPageMarker page="games-mochi-pets" />',
  "isMochiPetsTesterAccessConfigured()",
  "testerAccessConfigured ? <MochiPetsConfiguredDoorway /> : <MochiPetsPublicConcept />",
]);
assertNotIncludes("public page", page, [
  "getMochiPetsConnection",
  "MochiPetsConnection",
  "index: false",
  "follow: false",
  'dynamic = "force-dynamic"',
  'import { MochiPetsPrivateDoorway }',
]);
assertIncludes("public metadata", metadata, [
  "mochiPets:",
  'path: "/games/mochi-pets"',
  "A future shared 3D Mōchirīī guild home beyond the Jianghu",
  "planned to bring members together",
  "iOS and desktop",
]);

const privateDoorway = read(paths.privateDoorway);
const publicConcept = read(paths.publicConcept);
const configuredDoorway = read(paths.configuredDoorway);
assertIncludes("configured doorway loader", configuredDoorway, [
  'dynamic(',
  'import("./MochiPetsPrivateDoorway")',
  "loading: () => <MochiPetsPublicConcept />",
]);
assertIncludes("public concept", publicConcept, [
  "MochiPetsArrivalScene publicOnly",
  "mochi-game-shell--concept",
  "A future shared 3D guild home beyond the Jianghu",
  "planned to bring Mōchirīī members together",
  "iOS and desktop",
]);
assertNotIncludes("public concept", publicConcept, [
  "tester",
  "access",
  "Sign in",
  "Try again",
]);
assertIncludes("private doorway client", privateDoorway, [
  '"use client"',
  "getCurrentSession()",
  "onAuthStateChange",
  'Authorization: `Bearer ${token}`',
  'fetch("/games/mochi-pets/member-access"',
  'fetch("/games/mochi-pets/tester-login"',
  'body: "{}"',
  "body: new URLSearchParams({ testerPassword })",
  "AbortController",
  "generation",
  'event === "SIGNED_OUT"',
  'event === "SIGNED_IN"',
  'event === "TOKEN_REFRESHED"',
  'event === "USER_UPDATED"',
]);
assertNotIncludes("private doorway client", privateDoorway, [
  "MochiPetsConnection",
  "getMochiPetsConnection",
  "searchParams",
  "localStorage.setItem",
  "sessionStorage.setItem",
]);
if (/useState[^\n]*(?:access_token|bearer|token)/i.test(privateDoorway)) {
  failures.push("private doorway client: bearer tokens must never enter React state");
}

const memberAccess = read(paths.memberAccess);
assertIncludes("member-access route", memberAccess, [
  "isSameOrigin(request)",
  'request.headers.get("x-forwarded-host")',
  'request.headers.get("x-forwarded-proto")',
  "request.body?.getReader()",
  "byteLength > MAX_BODY_BYTES",
  "bearerToken(request)",
  "verifyCurrentMochiPetsMember(token)",
  "evaluateMochiPetsTesterAccess({",
  "createMemberBinding: createMochiPetsTesterMemberBinding",
  "verifyTesterSession: verifyMochiPetsTesterCookieValue",
  "memberAccess: true, testerAccess: access.testerAccess",
  'httpOnly: true',
  'secure: true',
  'sameSite: "lax"',
  'path: COOKIE_PATH',
  '"Cache-Control": "private, no-store"',
  'Vary: "Cookie, Authorization"',
]);

const session = read(paths.session);
const sessionCore = read(paths.sessionCore);
assertIncludes("tester session wrapper", session, [
  'import "server-only"',
  "MOCHI_PETS_TESTER_PASSWORD",
  "MOCHI_PETS_TESTER_SESSION_SECRET",
  "createMochiPetsTesterMemberBinding",
  "verifyMochiPetsTesterCookieValue",
]);
assertIncludes("tester session core", sessionCore, [
  "scrypt(",
  "timingSafeEqual",
  "createHmac",
  "randomBytes",
  'SESSION_VERSION = "v3"',
  "MEMBER_BINDING_PURPOSE",
  "tokenMemberBinding",
  "MOCHI_PETS_TESTER_COOKIE_MAX_AGE",
  "issuedAt",
  "expiresAt",
  "passwordVersion",
  'candidateSignature.toString("base64url") !== rawSignature',
]);
if (/scryptSync/.test(sessionCore)) failures.push("tester session: synchronous scrypt is forbidden");

const memberVerification = read(paths.memberVerification);
const memberVerificationCore = read(paths.memberVerificationCore);
const testerAccessPolicy = read(paths.testerAccessPolicy);
const testerRateLimit = read(paths.testerRateLimit);
const testerRateLimitCore = read(paths.testerRateLimitCore);
assertIncludes("member verification wrapper", memberVerification, [
  'import "server-only"',
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "verifyMochiPetsMemberBearer",
]);
assertIncludes("member verification core", memberVerificationCore, [
  "/functions/v1/verify-member-access",
  'Authorization: `Bearer ${token}`',
  'body: \'{"refreshDiscord":false}\'',
  'cache: "no-store"',
  "redirect: \"error\"",
  "AbortSignal.timeout(10_000)",
  "response.body?.getReader()",
  "byteLength > MAX_RESPONSE_BYTES",
  'payload.memberStatus === "active"',
  'payload.profile.member_status === "active"',
  "payload.galleryEligible !== true",
  "envelope.ok === true",
  "MEMBER_ID_PATTERN.test(memberId)",
]);
assertIncludes("tester access policy", testerAccessPolicy, [
  "evaluateMochiPetsTesterAccess",
  "createMemberBinding(verification.memberId)",
  "verifyTesterSession(testerToken, memberBinding)",
  "authorizeMochiPetsTesterEntry",
  "verifyPassword(password)",
  "createTesterSession(memberBinding)",
]);
assertIncludes("tester rate-limit wrapper", testerRateLimit, [
  'import "server-only"',
  "createMochiPetsTesterRateLimiter",
]);
assertIncludes("tester rate-limit core", testerRateLimitCore, [
  "MAX_FAILURES = 5",
  "WINDOW_MS = 15 * 60 * 1_000",
  "MAX_TRACKED_MEMBERS = 10_000",
  "retryAfterSeconds",
]);

const login = read(paths.login);
assertIncludes("login route", login, [
  "isSameOriginFormPost(request)",
  'request.headers.get("x-forwarded-host")',
  'request.headers.get("x-forwarded-proto")',
  "MAX_FORM_BYTES",
  'contentType.startsWith("application/x-www-form-urlencoded")',
  "readBoundedPassword(request)",
  "request.body?.getReader()",
  "byteLength > MAX_FORM_BYTES",
  "bearerToken(request)",
  "verifyCurrentMochiPetsMember(token)",
  "checkMochiPetsTesterRateLimit(memberBinding)",
  'result.headers.set("Retry-After"',
  "recordMochiPetsTesterFailure(memberBinding)",
  "clearMochiPetsTesterFailures(memberBinding)",
  "authorizeMochiPetsTesterEntry({",
  "createMemberBinding: () => memberBinding",
  "verifyPassword: verifyMochiPetsTesterPassword",
  "createTesterSession: createMochiPetsTesterSessionValue",
  'httpOnly: true',
  'secure: true',
  'sameSite: "lax"',
  'path: COOKIE_PATH',
  '"Cache-Control": "private, no-store"',
]);

const logout = read(paths.logout);
assertIncludes("logout route", logout, [
  "isSameOriginPost(request)",
  'request.headers.get("x-forwarded-host")',
  'request.headers.get("x-forwarded-proto")',
  "MOCHI_PETS_TESTER_COOKIE",
  'httpOnly: true',
  'secure: true',
  'sameSite: "lax"',
  'path: "/games/mochi-pets"',
  "maxAge: 0",
  '"Cache-Control": "private, no-store"',
]);

const gate = read(paths.gate);
assertIncludes("tester gate", gate, [
  'action="/games/mochi-pets/tester-login"',
  'type="password"',
  'name="testerPassword"',
  "minLength={15}",
  "maxLength={128}",
  'autoComplete="off"',
  'role={memberState === "unavailable" ? "alert" : undefined}',
  'role="alert"',
  "/assets/img/brand/emblem.webp",
  "A future shared 3D guild home beyond the Jianghu",
  "planned to bring Mōchirīī members together",
  "iOS and desktop",
  "Verified Mōchirīī website membership.",
  "The current Mochi Pets tester passcode.",
]);

const waitingRoom = read(paths.waitingRoom);
assertIncludes("waiting room", waitingRoom, [
  'action="/games/mochi-pets/tester-logout"',
  "Your member access and tester passcode are confirmed.",
  "Verified",
  "Accepted",
  "/assets/img/brand/emblem.webp",
]);
assertNotIncludes("waiting room", waitingRoom, [
  "MochiPetsConnection",
  "data-mochi-pets-connection-state",
  "connection.status",
]);

assertIncludes("local smoke harness", read(paths.localSmokeHarness), [
  "startHttpsProxy({",
  "startMockMemberVerifier({",
  "NODE_EXTRA_CA_CERTS",
  '"--supabase-auth-cookie-name"',
  '"sb-localhost-auth-token"',
  '"--allow-self-signed-localhost"',
  'readArg("--browser", "all")',
  "finally",
  "await stopChild(server)",
]);
assertIncludes("browser smoke", read(paths.browserSmoke), [
  'page.goto(`${baseUrl}/games/mochi-pets`',
  "assertResponsiveLayout",
  "assertSessionCookie",
  "page.context().addCookies",
  "base64-",
  "verifyMalformedSuccessFailsClosed",
]);
assertIncludes("root check runner", read(paths.checkAll), [
  '["test:mochi-pets-member-verification", ["node", "--experimental-default-type=module", "--experimental-strip-types"',
  '["test:mochi-pets-tester-access-policy", ["node", "--experimental-default-type=module", "--experimental-strip-types"',
  '["test:mochi-pets-tester-rate-limit", ["node", "--experimental-default-type=module", "--experimental-strip-types"',
  '["test:mochi-pets-tester-session", ["node", "--experimental-default-type=module", "--experimental-strip-types"',
]);

const connection = readJson(paths.connection);
assertExactObject("connection", connection, {
  protocolVersion: 1,
  status: "not-connected",
  websiteRoute: "/games/mochi-pets",
  repository: {
    slug: "Mochirii-Wushu/Mochirii-Pets",
    visibility: "private",
    sourceState: "scaffolded",
  },
  platforms: {
    web: { artifact: null },
    ios: { artifact: null },
  },
  social: {
    originKey: "socialHost",
    identityState: "not-connected",
    chatState: "not-ready",
  },
});
assertExactObject("schema properties", readJson(paths.schema)?.properties?.status, { const: "not-connected" });
assertExactObject(
  "schema Social origin key",
  readJson(paths.schema)?.properties?.social?.properties?.originKey,
  { const: "socialHost" },
);
assertIncludes("connection helper", read(paths.connectionHelper), [
  'import { SOCIAL_HOST } from "@/lib/public-urls"',
  "origin: SOCIAL_HOST",
]);
if (!SOCIAL_HOST.startsWith("https://")) failures.push("canonical Social host must use HTTPS");

const navigation = read(paths.navigation);
const footer = read(paths.footer);
const sitemap = read(paths.sitemap);
assertIncludes("public navigation", navigation, ['href: "/games/mochi-pets", label: "Mochi Pets", nav: "games/mochi-pets"']);
if (/href: "\/games\/mochi-pets"[^\n]*(?:auth|signedIn|moderator)/.test(navigation)) {
  failures.push("public navigation: Mochi Pets must not be hidden behind an auth state");
}
assertIncludes("public footer", footer, ['href: "/games/mochi-pets", label: "Mochi Pets"']);
assertIncludes("public sitemap", sitemap, ["<loc>https://mochirii.com/games/mochi-pets</loc>"]);

const activePublicSource = [page, gate, waitingRoom, privateDoorway].join("\n");
for (const [label, pattern] of [
  ["iframe", /<iframe\b/i],
  ["cross-document bridge", /postMessage/i],
  ["browser-exposed game URL", /NEXT_PUBLIC_MOCHI_PETS_URL/],
  ["retired access mode", /MOCHI_PETS_ALPHA_ACCESS_MODE/],
  ["retired runtime", /mochi-pets-game\.fly\.dev/i],
]) {
  if (pattern.test(activePublicSource)) failures.push(`active Mochi Pets source contains ${label}`);
}
for (const [label, pattern] of [
  ["loopback dependency", /\b(?:localhost|127\.0\.0\.1|host\.docker\.internal)\b|\[?::1\]?/i],
  ["private-network IPv4 dependency", /\b(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/],
  ["workstation path", /(?:\b[A-Za-z]:\\(?:Users|Github Repo's)\\|\/mnt\/[a-z]\/(?:Users|Github Repo's)\/)/i],
  ["file URL", /\bfile:\/\//i],
]) {
  if (pattern.test(activePublicSource)) failures.push(`active Mochi Pets source contains ${label}`);
}

for (const source of [session, sessionCore, memberVerification, memberVerificationCore, testerAccessPolicy, testerRateLimit, testerRateLimitCore, memberAccess, login, logout, privateDoorway]) {
  if (/console\.(?:log|info|warn|error|debug)/.test(source)) {
    failures.push("tester access code must not log bearer, password, member, or session values");
  }
}

const env = read(paths.webEnv);
assertIncludes("web env example", env, [
  "MOCHI_PETS_TESTER_PASSWORD=",
  "MOCHI_PETS_TESTER_SESSION_SECRET=",
]);
if (/NEXT_PUBLIC_MOCHI_PETS_(?:TESTER_)?(?:PASSWORD|SESSION_SECRET)/i.test(env)) {
  failures.push("tester credentials must never use NEXT_PUBLIC_ names");
}

const metadataStart = metadata.indexOf("  mochiPets:");
const metadataEnd = metadata.indexOf("\n  },", metadataStart);
const mochiPetsMetadata = metadataStart >= 0 && metadataEnd > metadataStart
  ? metadata.slice(metadataStart, metadataEnd + 5)
  : "";
const visibleCopy = customerCopy(`${publicConcept}\n${gate}\n${waitingRoom}\n${mochiPetsMetadata}`);
const approvedFuturePlatformCopy =
  "A future shared 3D guild home beyond the Jianghu, planned to bring Mōchirīī members together with a Mochi companion of their own on iOS and desktop.";
const approvedFuturePlatformMetadata =
  "A future shared 3D Mōchirīī guild home beyond the Jianghu, planned to bring members together with a Mochi companion of their own on iOS and desktop.";
const policyVisibleCopy = visibleCopy
  .replaceAll(approvedFuturePlatformCopy, "")
  .replaceAll(approvedFuturePlatformMetadata, "");
for (const [label, pattern] of [
  ["retired alpha claim", /\bclosed\s+alpha\b/i],
  ["retired shared-room claim", /\bshared\s+(?:3D\s+)?room\b/i],
  ["retired pet claim", /\bLirabao\b/i],
  ["provider branding", /\b(?:GitHub|Supabase|Vercel|Fly\.io|DigitalOcean|Unity|Pixelfed)\b/i],
  ["platform jargon", /\biOS\b/],
  ["implementation language", /\b(?:backend|repository|artifact|runtime|protocol|contract|integration|development)\b/i],
  ["implementation status", /\b(?:planned|not playable|not available|not connected|launch status|project status)\b/i],
]) {
  if (pattern.test(policyVisibleCopy)) failures.push(`customer-facing copy contains ${label}`);
}

const durableDocs = [
  read(paths.architecture),
  read(paths.currentLiveState),
  read(paths.futureProject),
  read(paths.currentState),
  read(paths.websiteContract),
  read(paths.repositoryOwnership),
  read(paths.webReadme),
].join("\n");
for (const stale of [
  "is a noindex Website",
  "server-rendered tester password doorway",
  "Website-only password session",
  "server-only shared tester gate",
  "dynamic, noindex tester-password doorway",
]) {
  if (durableDocs.includes(stale)) failures.push(`durable Mochi Pets docs retain stale boundary: ${stale}`);
}
assertIncludes("Mochi Pets architecture", read(paths.architecture), ["public, indexable Website concept page", "member-bound"]);
assertIncludes("Mochi Pets Website contract", read(paths.websiteContract), [
  "POST /games/mochi-pets/member-access",
  "15 to 128 Unicode code points",
  "per-instance",
  "is not a substitute",
]);

if (failures.length) {
  console.error("Mochi Pets tester doorway contract failed.");
  [...new Set(failures)].forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Mochi Pets tester doorway contract OK.");
console.log("- The concept page is public and discoverable without exposing the internal connection contract.");
console.log("- Private access requires a freshly verified member and a member-bound signed tester session.");
console.log("- Retired game runtime, iframe, bridge, and browser-side game data calls remain absent.");

function read(file) {
  const absolute = resolve(root, file);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
}

function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    failures.push(`${file}: invalid JSON: ${error.message}`);
    return null;
  }
}

function assertIncludes(label, source, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`${label}: expected snippet is missing: ${snippet}`);
  }
}

function assertNotIncludes(label, source, snippets) {
  for (const snippet of snippets) {
    if (source.includes(snippet)) failures.push(`${label}: forbidden snippet is present: ${snippet}`);
  }
}

function assertExactObject(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function customerCopy(source) {
  const values = [];
  for (const match of source.matchAll(/>([^<{}]*)</gs)) values.push(match[1]);
  for (const match of source.matchAll(/(?:aria-label|alt|title|placeholder)="([^"]*)"/g)) values.push(match[1]);
  for (const match of source.matchAll(/\b(?:title|description|body):\s*"([^"]*)"/g)) values.push(match[1]);
  return values.join(" ");
}
