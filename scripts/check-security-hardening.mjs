import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  nextConfig: "apps/web/next.config.ts",
  supabaseConfig: "supabase/config.toml",
  reaper: "supabase/functions/reaper-discord-interactions/index.ts",
  approvedFeed: "supabase/functions/list-approved-gallery-submissions/index.ts",
  visibleProfileCards: "supabase/functions/list-visible-profile-cards/index.ts",
  discordIngest: "supabase/functions/submit-discord-gallery-image/index.ts",
  report: "reports/free-security-hardening-2026-06-08.md",
  cspReport: "reports/csp-enforcement-verification-2026-06-08.md",
  deployment: "docs/deployment.md",
};

function read(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    failures.push(`${file}: missing required security hardening file.`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function assertMatches(label, text, pattern, message) {
  if (!pattern.test(text)) failures.push(`${label}: ${message}`);
}

function extractVerifyJwtFalseFunctions(config) {
  const blocks = [...config.matchAll(/\[functions\.([^\]]+)\]([\s\S]*?)(?=\n\[functions\.|\s*$)/g)];
  return blocks
    .filter(([, , body]) => /verify_jwt\s*=\s*false/.test(body))
    .map(([_, name]) => name);
}

const packageJson = read(files.packageJson);
const checkAll = read(files.checkAll);
const nextConfig = read(files.nextConfig);
const supabaseConfig = read(files.supabaseConfig);
const reaper = read(files.reaper);
const approvedFeed = read(files.approvedFeed);
const visibleProfileCards = read(files.visibleProfileCards);
const discordIngest = read(files.discordIngest);
const report = read(files.report);
const cspReport = read(files.cspReport);
const deployment = read(files.deployment);

assertIncludes("package.json", packageJson, '"check:security-hardening"');
assertIncludes("check-all", checkAll, "check:security-hardening");

[
  "Content-Security-Policy",
  "X-Content-Type-Options",
  "nosniff",
  "Referrer-Policy",
  "strict-origin-when-cross-origin",
  "Permissions-Policy",
  "Cross-Origin-Opener-Policy",
  "same-origin-allow-popups",
  "X-Frame-Options",
  "DENY",
].forEach((snippet) => assertIncludes("Next security headers", nextConfig, snippet));

if (nextConfig.includes("Content-Security-Policy-Report-Only")) {
  failures.push("Next security headers: CSP should be enforced, not report-only.");
}

[
  "default-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "frame-src 'self' https://discord.com https://open.spotify.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://discord.com https://cdn.discordapp.com https://vitals.vercel-insights.com",
].forEach((snippet) => assertIncludes("CSP policy", nextConfig, snippet));

const verifyJwtFalseFunctions = extractVerifyJwtFalseFunctions(supabaseConfig);
const expectedUnauthenticatedFunctions = [
  "list-approved-gallery-submissions",
  "list-visible-profile-cards",
  "submit-discord-gallery-image",
  "reaper-discord-interactions",
];

if (verifyJwtFalseFunctions.length !== expectedUnauthenticatedFunctions.length) {
  failures.push(
    `supabase/config.toml: expected ${expectedUnauthenticatedFunctions.length} verify_jwt=false functions, found ${verifyJwtFalseFunctions.length}: ${verifyJwtFalseFunctions.join(", ")}`,
  );
}

for (const name of verifyJwtFalseFunctions) {
  if (!expectedUnauthenticatedFunctions.includes(name)) {
    failures.push(`supabase/config.toml: unauthenticated function ${name} needs an explicit security review.`);
  }
}

[
  "x-signature-ed25519",
  "x-signature-timestamp",
  "DISCORD_PUBLIC_KEY",
  "verifyDiscordSignature(req, rawBody, publicKey)",
  "SIGNATURE_WINDOW_MS",
  "Retry-After",
  "retry_after",
].forEach((snippet) => assertIncludes("reaper-discord-interactions", reaper, snippet));

assertMatches(
  "reaper-discord-interactions",
  reaper,
  /const rawBody = await req\.text\(\);[\s\S]*verifyDiscordSignature\(req, rawBody, publicKey\)[\s\S]*JSON\.parse\(rawBody\)/,
  "Discord signatures must be validated against the raw body before parsing JSON.",
);

[
  "DISCORD_GALLERY_INGEST_SECRET",
  "x-mochirii-reaper-secret",
  "bearerOrHeaderSecret(req) !== ingestSecret",
  "invalid_ingest_secret",
].forEach((snippet) => assertIncludes("submit-discord-gallery-image", discordIngest, snippet));

[
  ".eq(\"status\", \"approved\")",
  "createSignedUrl",
  "SIGNED_URL_SECONDS",
  "signed_url",
  "signedUrlSeconds",
].forEach((snippet) => assertIncludes("list-approved-gallery-submissions", approvedFeed, snippet));

[
  "asArray(body.slugs)",
  ".in(\"profile_slug\", requestedSlugs)",
  ".eq(\"profile_public_enabled\", true)",
  ".eq(\"member_status\", \"active\")",
  ".eq(\"has_required_discord_roles\", true)",
  "recentVerification(profile.discord_verified_at)",
  "signedMediaUrl",
  "hasApprovedAvatar",
].forEach((snippet) => assertIncludes("list-visible-profile-cards", visibleProfileCards, snippet));

assertMatches(
  "list-visible-profile-cards",
  visibleProfileCards,
  /return\s+\{[\s\S]*slug:[\s\S]*displayName:[\s\S]*guildTitle:[\s\S]*avatarUrl:[\s\S]*profileHref:[\s\S]*hasApprovedAvatar/s,
  "public visible profile card must return only safe card fields.",
);

[
  "discordHandle:",
  "gameUid:",
  "region:",
  "timezone:",
  "storagePath:",
  "storageBucket:",
  "discordUserId:",
].forEach((snippet) => {
  if (visibleProfileCards.includes(snippet)) {
    failures.push(`list-visible-profile-cards: public card function must not return ${snippet}`);
  }
});

assertMatches(
  "list-approved-gallery-submissions",
  approvedFeed,
  /const item:\s*JsonRecord\s*=\s*\{(?:(?!storage_path|storage_bucket|user_id)[\s\S])*signed_url/s,
  "public approved feed item must not expose raw storage path, bucket, or user_id fields.",
);

[
  "Cloudflare remains DNS-only",
  "Vercel platform-wide DDoS mitigation",
  "CodeQL",
  "Dependabot",
  "verify_jwt=false",
  "Discord 429",
].forEach((snippet) => assertIncludes("security report", report, snippet));

[
  "Content-Security-Policy",
  "no CSP report-only console violations",
  "@vercel/analytics/next",
  "@vercel/speed-insights/next",
].forEach((snippet) => assertIncludes("CSP enforcement report", cspReport, snippet));

[
  "Security Hardening",
  "Content-Security-Policy",
  "Cloudflare remains DNS-only",
].forEach((snippet) => assertIncludes("deployment docs", deployment, snippet));

if (failures.length) {
  console.error("Security hardening validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Security hardening validation OK.");
