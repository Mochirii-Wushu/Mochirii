import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SOCIAL_HOST } from "./lib/public-urls.mjs";

const root = process.cwd();
const failures = [];

const paths = {
  page: "apps/web/app/games/mochi-pets/page.tsx",
  login: "apps/web/app/games/mochi-pets/tester-login/route.ts",
  logout: "apps/web/app/games/mochi-pets/tester-logout/route.ts",
  gate: "apps/web/components/mochi-pets/MochiPetsTesterPasswordGate.tsx",
  waitingRoom: "apps/web/components/mochi-pets/MochiPetsTesterWaitingRoom.tsx",
  arrival: "apps/web/components/mochi-pets/MochiPetsArrivalScene.tsx",
  session: "apps/web/lib/mochi-pets/tester-session.ts",
  sessionCore: "apps/web/lib/mochi-pets/tester-session-core.ts",
  sessionTest: "apps/web/lib/mochi-pets/tester-session-core.test.mts",
  connectionHelper: "apps/web/lib/mochi-pets/connection.ts",
  connection: "apps/web/config/mochi-pets-connection.json",
  schema: "docs/integrations/mochi-pets-website-contract.v1.schema.json",
  contract: "docs/integrations/mochi-pets-website-contract.md",
  localSmokeHarness: "scripts/run-mochi-pets-tester-doorway-local.mjs",
  checkAll: "scripts/check-all.mjs",
  css: "apps/web/app/styles/mochi-pets.css",
  artwork: "apps/web/public/assets/img/mochi-pets/gate-arrival.webp",
  webEnv: "apps/web/.env.example",
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
assertIncludes("page", page, [
  'canonical: "/games/mochi-pets"',
  "index: false",
  "follow: false",
  'dynamic = "force-dynamic"',
  'runtime = "nodejs"',
  "hasMochiPetsTesterSession()",
  "MochiPetsTesterPasswordGate",
  "MochiPetsTesterWaitingRoom",
  "getMochiPetsConnection()",
]);

const session = read(paths.session);
const sessionCore = read(paths.sessionCore);
assertIncludes("tester session wrapper", session, [
  'import "server-only"',
  "MOCHI_PETS_TESTER_PASSWORD",
  "MOCHI_PETS_TESTER_SESSION_SECRET",
  "cookies()",
]);
assertIncludes("tester session core", sessionCore, [
  "scrypt(",
  "timingSafeEqual",
  "createHmac",
  "randomBytes",
  "MOCHI_PETS_TESTER_COOKIE_MAX_AGE",
  "SESSION_VERSION",
  "issuedAt",
  "expiresAt",
  "passwordVersion",
  'candidateSignature.toString("base64url") !== rawSignature',
]);
if (/scryptSync/.test(sessionCore)) failures.push("tester session: synchronous scrypt is forbidden");

const login = read(paths.login);
assertIncludes("login route", login, [
  "isSameOriginFormPost(request)",
  'request.headers.get("x-forwarded-host")',
  'request.headers.get("x-forwarded-proto")',
  'secure: requestProtocol(request) === "https"',
  "MAX_FORM_BYTES",
  'contentType.startsWith("application/x-www-form-urlencoded")',
  "contentLengthHeader",
  "readBoundedPassword(request)",
  "request.body?.getReader()",
  "byteLength > MAX_FORM_BYTES",
  "verifyMochiPetsTesterPassword(password)",
  'httpOnly: true',
  'sameSite: "lax"',
  'path: "/games/mochi-pets"',
  '"Cache-Control": "private, no-store"',
]);

const logout = read(paths.logout);
assertIncludes("logout route", logout, [
  "isSameOriginPost(request)",
  'request.headers.get("x-forwarded-host")',
  'request.headers.get("x-forwarded-proto")',
  'secure: requestProtocol(request) === "https"',
  "MOCHI_PETS_TESTER_COOKIE",
  'httpOnly: true',
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
  'role="alert"',
  "/assets/img/brand/emblem.webp",
  "No playable build yet",
]);

const waitingRoom = read(paths.waitingRoom);
assertIncludes("waiting room", waitingRoom, [
  'action="/games/mochi-pets/tester-logout"',
  "data-mochi-pets-connection-state",
  "Not connected",
  "No previous game source",
  "/assets/img/brand/emblem.webp",
]);

assertIncludes("local smoke harness", read(paths.localSmokeHarness), [
  "randomBytes(",
  "cleanTesterEnvironment()",
  "createEphemeralLocalCertificate()",
  "startHttpsProxy({",
  "observeBrowserSessionCookie(request, upstreamResponse, browserCookieObservation)",
  '"--browser-base-url"',
  '"--allow-self-signed-localhost"',
  'readArg("--browser", "all")',
  '"--browser",',
  '"--expect-unconfigured"',
  "rmSync(certificateDirectory, { recursive: true, force: true })",
  "finally",
  "await stopChild(server)",
]);
assertIncludes("browser smoke", read("scripts/smoke-mochi-pets-tester-doorway.mjs"), [
  'waitForNavigation({ waitUntil: "networkidle" })',
  "settleDeferredShell(page)",
  "request.isNavigationRequest()",
]);
assertIncludes("root check runner", read(paths.checkAll), [
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

const activeSource = [page, gate, waitingRoom, read(paths.connectionHelper), read(paths.connection), read(paths.webEnv)].join("\n");
for (const [label, pattern] of [
  ["iframe", /<iframe\b/i],
  ["network fetch", /\bfetch\s*\(/],
  ["cross-document bridge", /postMessage/i],
  ["browser-exposed game URL", /NEXT_PUBLIC_MOCHI_PETS_URL/],
  ["retired access mode", /MOCHI_PETS_ALPHA_ACCESS_MODE/],
  ["retired runtime", /mochi-pets-game\.fly\.dev/i],
  ["Supabase game call", /supabase(?:\.co|Client|\.functions| function)/i],
]) {
  if (pattern.test(activeSource)) failures.push(`active Mochi Pets source contains ${label}`);
}
for (const [label, pattern] of [
  ["loopback dependency", /\b(?:localhost|127\.0\.0\.1|host\.docker\.internal)\b|\[?::1\]?/i],
  ["private-network IPv4 dependency", /\b(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/],
  ["workstation path", /(?:\b[A-Za-z]:\\(?:Users|Github Repo's)\\|\/mnt\/[a-z]\/(?:Users|Github Repo's)\/)/i],
  ["file URL", /\bfile:\/\//i],
]) {
  if (pattern.test(activeSource)) failures.push(`active Mochi Pets source contains ${label}`);
}

for (const source of [session, sessionCore, login, logout]) {
  if (/console\.(?:log|info|warn|error|debug)/.test(source)) {
    failures.push("tester backend must not log submitted or session values");
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

const visibleCopy = `${gate}\n${waitingRoom}`;
for (const [label, pattern] of [
  ["retired alpha claim", /\bclosed\s+alpha\b/i],
  ["retired shared-room claim", /\bshared\s+(?:3D\s+)?room\b/i],
  ["retired pet claim", /\bLirabao\b/i],
  ["provider branding", /\b(?:Supabase|Vercel|Fly\.io|DigitalOcean)\b/i],
]) {
  if (pattern.test(visibleCopy)) failures.push(`customer-facing copy contains ${label}`);
}

if (failures.length) {
  console.error("Mochi Pets tester doorway contract failed.");
  [...new Set(failures)].forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Mochi Pets tester doorway contract OK.");
console.log("- The server-only password/session boundary is present and fail-closed.");
console.log("- The Website waiting room is versioned and remains not connected.");
console.log("- Retired game runtime, iframe, bridge, and Supabase game calls remain absent.");

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

function assertExactObject(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
