import { readFileSync } from "node:fs";

const failures = [];

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function assertNotIncludes(label, text, snippet) {
  if (text.includes(snippet)) failures.push(`${label}: forbidden snippet found: ${snippet}`);
}

const packageJson = read("package.json");
const checkAll = read("scripts/check-all.mjs");
const multiProviderDoc = read("docs/multi-provider-login-and-verification.md");
const supabaseReadme = read("supabase/README.md");
const providerRegistry = read("apps/web/lib/supabase/auth-providers.ts");
const verifyMemberAccess = read("supabase/functions/verify-member-access/index.ts");
const reviewMemberVerification = read("supabase/functions/review-member-verification/index.ts");
const leaderDashboard = read("apps/web/components/member-workflow/LeaderDashboard.tsx");
const staticLeaderDashboard = read("leader-dashboard.js");
const previewSmoke = read("scripts/smoke-member-verification-preview.mjs");
const uuidPatternSnippet = "const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;";

[
  '"check:auth-provider-state-cleanup": "node scripts/check-auth-provider-state-cleanup.mjs"',
  '"smoke:member-verification-preview": "node scripts/smoke-member-verification-preview.mjs"',
].forEach((snippet) => assertIncludes("package scripts", packageJson, snippet));

assertIncludes(
  "check-all",
  checkAll,
  '["check:auth-provider-state-cleanup", ["node", "scripts/check-auth-provider-state-cleanup.mjs"]]',
);

[
  "| Active | Discord, Google, Twitch |",
  "| Visible placeholder | Apple |",
  "| Deferred | Facebook, Kakao, Spotify, Phone |",
  "NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,twitch",
  "NEXT_PUBLIC_AUTH_PROVIDER_PLACEHOLDER_IDS=apple",
  "PR #300",
  "https://github.com/Mochirii-Wushu/Mochirii/pull/300",
  "850a13df22853778d8a48ad6b5a319ae029739bc",
  "Kakao: deferred",
  "Facebook: deferred",
  "Spotify: deferred",
  "Phone: deferred",
  "ALLOW_PREVIEW_MEMBER_VERIFICATION_SMOKE=true",
  "the script refuses the production project `deyvmtncimmcinldjyqe`",
].forEach((snippet) => assertIncludes("multi-provider docs", multiProviderDoc, snippet));

[
  "The current live sign-in set is Discord, Google, and Twitch.",
  "Apple is the only documented visible placeholder lane",
  "Facebook, Kakao, Spotify, and Phone are deferred",
  "NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,twitch",
  "NEXT_PUBLIC_AUTH_PROVIDER_PLACEHOLDER_IDS=apple",
  "ALLOW_PREVIEW_MEMBER_VERIFICATION_SMOKE=true npm run smoke:member-verification-preview",
  "refuses project `deyvmtncimmcinldjyqe`",
].forEach((snippet) => assertIncludes("Supabase README", supabaseReadme, snippet));

[
  "NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,...",
  "NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,kakao",
  "NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,twitch,kakao",
  "NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,twitch,spotify",
  "NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,twitch,facebook",
  "NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,twitch,phone",
  "NEXT_PUBLIC_PHONE_AUTH_READY=true",
  "NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true",
].forEach((snippet) => {
  assertNotIncludes("multi-provider docs", multiProviderDoc, snippet);
  assertNotIncludes("Supabase README", supabaseReadme, snippet);
});

[
  '"discord"',
  '"phone"',
  '"apple"',
  '"facebook"',
  '"google"',
  '"kakao"',
  '"twitch"',
  '"spotify"',
  'process.env.NEXT_PUBLIC_PHONE_AUTH_READY === "true"',
  'process.env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED === "true"',
  "NEXT_PUBLIC_AUTH_PROVIDER_PLACEHOLDER_IDS",
  "placeholderOAuthProviders",
].forEach((snippet) => assertIncludes("provider registry conservative support", providerRegistry, snippet));

[
  "APPROVED_PROVIDER_IDS",
  "member_auth_identities",
  "member_verifications",
  "galleryEligible",
].forEach((snippet) => assertIncludes("verify-member-access", verifyMemberAccess, snippet));

[
  uuidPatternSnippet,
  "requireModeratorAccess(req)",
  "VALID_ACTIONS",
  "approve",
  "reject",
  "revoke",
  "locked_member_status",
].forEach((snippet) => assertIncludes("review-member-verification", reviewMemberVerification, snippet));

[
  "memberVerificationPanel",
  "Approve access",
  "Reject",
  "Revoke",
  "redacted note",
].forEach((snippet) => assertIncludes("Leader Dashboard review surface", leaderDashboard, snippet));

[
  "reviewMemberVerification",
  "data-member-verification-action",
  "renderMemberVerificationResult",
].forEach((snippet) => assertIncludes("static Leader Dashboard review surface", staticLeaderDashboard, snippet));

[
  uuidPatternSnippet,
  "ALLOW_PREVIEW_MEMBER_VERIFICATION_SMOKE",
  "PRODUCTION_PROJECT_REF = \"deyvmtncimmcinldjyqe\"",
  "refuseProduction(supabaseUrl)",
  "PREVIEW_MEMBER_VERIFICATION_MODERATOR_DISCORD_USER_ID",
  "review-member-verification",
  "verify-member-access",
  "galleryEligible: true",
  "galleryEligible: false",
  "locked_member_status",
  "cleanupFixtures",
].forEach((snippet) => assertIncludes("preview member verification smoke", previewSmoke, snippet));

[
  "provider_token",
  "providerToken",
  "provider_refresh_token",
  "refresh_token",
  "access_token=",
  "client_secret=",
].forEach((snippet) => {
  [
    ["multi-provider docs", multiProviderDoc],
    ["Supabase README", supabaseReadme],
    ["preview member verification smoke", previewSmoke],
  ].forEach(([label, text]) => assertNotIncludes(label, text, snippet));
});

if (failures.length) {
  console.error("Auth provider state cleanup validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Auth provider state cleanup validation OK.");
